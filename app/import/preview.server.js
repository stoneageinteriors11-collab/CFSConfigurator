// Reads an uploaded option sheet, checks every row against the real Shopify products and shows
// what each product would look like. Read only: nothing in Shopify is changed.
import { checkProduct } from "../pricing/product-check.server.js";
import { resolveAssignment } from "../pricing/quote.server.js";
import { buildProduct } from "./build-product.js";
import { checkRows } from "./check-rows.js";
import { findProducts } from "./find-products.server.js";
import { readWorkbook } from "./spreadsheet.server.js";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;

const refused = (message) => ({ importable: false, errors: [{ sheet: null, row: null, message }], products: [] });

/** Each choice's price on every size it is offered on, grouped as on the page. */
function groupsPreview(product, sheetGroups) {
  const sizes = product.variants
    .map((v) => ({ sizeId: product.modelCards[v.sku]?.source_id, sizeTitle: v.title }))
    .filter((s) => s.sizeId);
  return [...sheetGroups]
    .sort((a, b) => a.order - b.order)
    .map((group) => ({
      name: group.name,
      required: group.required,
      after: group.after,
      kind: group.kind,
      maxQuantity: group.maxQuantity,
      choices: product.options
        .filter((o) => o.groupName === group.name)
        .map((option) => ({
          label: option.label,
          cfsId: option.cfsId,
          prices: sizes.flatMap(({ sizeId, sizeTitle }) => {
            const assignment = resolveAssignment(option, sizeId);
            return typeof assignment === "object" ? [{ sizeId, sizeTitle, cents: assignment.cents }] : [];
          }),
        })),
    }));
}

/**
 * Returns { importable, errors, products }. importable is true only when there are no errors
 * and every product would be ready to sell.
 */
export async function previewImport(graphql, bytes) {
  if (bytes.length > MAX_FILE_BYTES) return refused("The file is larger than 5 MB");

  const sheet = await readWorkbook(bytes);
  if (sheet.errors.length) return { importable: false, errors: sheet.errors, products: [] };
  if (!sheet.groups.length && !sheet.choices.length) return refused("The file has no rows to import");

  const { products: rows, errors } = checkRows(sheet);
  // Products in the order of their first row, Groups sheet first.
  const ids = [...new Set([...sheet.groups, ...sheet.choices].map((r) => r.values["CFS product ID"]))].filter((id) =>
    rows.has(id),
  );
  const found = await findProducts(graphql, ids);

  const products = [];
  for (const id of ids) {
    const lookup = found.get(id);
    if (lookup.error) {
      errors.push({ sheet: null, row: null, product: id, message: lookup.error });
      continue;
    }
    const current = lookup.product;
    const { groups, choices } = rows.get(id);
    const built = buildProduct({ cfsProductId: id, groups, choices }, current);
    errors.push(...built.errors.map((e) => ({ ...e, product: id })));
    if (!built.product) continue;

    const keptIds = new Set(built.product.options.map((o) => o.cfsId));
    const { ready, problems, fromCents } = checkProduct(built.product);
    for (const problem of problems) {
      errors.push({ sheet: null, row: null, product: id, message: `Not ready to sell: ${problem}` });
    }
    products.push({
      cfsProductId: id,
      title: current.title,
      productId: current.productId,
      check: { ready, problems, fromCents },
      groups: groupsPreview(built.product, groups),
      removed: (current.options ?? []).filter((o) => !keptIds.has(o.cfsId)).map((o) => o.label),
    });
  }

  return {
    importable: errors.length === 0 && products.length > 0 && products.every((p) => p.check.ready),
    errors,
    products,
  };
}

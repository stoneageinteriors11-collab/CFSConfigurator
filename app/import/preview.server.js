// Reads an uploaded option sheet, checks every row against the real Shopify products and shows
// what each product would look like. Read only: nothing in Shopify is changed.
import { checkProduct } from "../pricing/product-check.server.js";
import { resolveAssignment } from "../pricing/quote.server.js";
import { buildProduct } from "./build-product.js";
import { checkRows } from "./check-rows.js";
import { findProducts } from "./find-products.server.js";
import { checkSharedOptions } from "./shared-options.server.js";
import { sameProduct } from "./same-product.js";
import { readWorkbook } from "./spreadsheet.server.js";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
// Each product costs a few Shopify reads, made one at a time.
const MAX_PRODUCTS = 100;

const refused = (message) => ({
  importable: false,
  errors: [{ sheet: null, row: null, message }],
  products: [],
});

/** Each choice's price on every size it is offered on, grouped as on the page. */
function groupsPreview(product, sheetGroups) {
  const sizes = product.variants
    .map((v) => ({
      sizeId: product.modelCards[v.sku]?.source_id,
      sizeTitle: v.title,
    }))
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
            return typeof assignment === "object"
              ? [{ sizeId, sizeTitle, cents: assignment.cents }]
              : [];
          }),
        })),
    }));
}

/**
 * Returns { preview, plans }. preview is { importable, errors, products } for the page:
 * importable is true only when there are no errors and every product would be ready to sell,
 * and each product says whether the sheet leaves it unchanged. plans lists every ready product
 * the sheet would change: { cfsProductId, productId, title, current, product }, with the
 * product as loaded from Shopify and as built from the sheet.
 */
export async function prepareImport(graphql, bytes) {
  const nothing = (preview) => ({ preview, plans: [] });
  if (bytes.length > MAX_FILE_BYTES)
    return nothing(refused("The file is larger than 5 MB"));

  const sheet = await readWorkbook(bytes);
  if (sheet.errors.length)
    return nothing({ importable: false, errors: sheet.errors, products: [] });
  if (!sheet.groups.length && !sheet.choices.length)
    return nothing(refused("The file has no rows to import"));

  const { products: rows, errors: rowErrors } = checkRows(sheet);
  // Every row problem is tagged with its product, so each product's tab can list its own problems.
  const productOfRow = new Map();
  for (const [name, list] of [
    ["Groups", sheet.groups],
    ["Choices", sheet.choices],
  ]) {
    for (const raw of list)
      productOfRow.set(`${name}:${raw.row}`, raw.values["CFS product ID"]);
  }
  const errors = rowErrors.map((e) => {
    const product = productOfRow.get(`${e.sheet}:${e.row}`);
    return product ? { ...e, product } : e;
  });

  // Every product in the sheet, in the order of its first row, Groups sheet first.
  const ids = [
    ...new Set(
      [...sheet.groups, ...sheet.choices].map(
        (r) => r.values["CFS product ID"],
      ),
    ),
  ].filter(Boolean);
  if (ids.length > MAX_PRODUCTS) {
    return nothing(
      refused(
        `The sheet has ${ids.length} products; preview at most ${MAX_PRODUCTS} at a time`,
      ),
    );
  }
  const found = await findProducts(
    graphql,
    ids.filter((id) => rows.has(id)),
  );

  // Entries of the products in this sheet are about to be replaced, so they never count as "other".
  const sheetProductIds = [...found.values()]
    .filter((r) => r.product)
    .map((r) => r.product.productId);
  const sharedCache = new Map();
  const products = [];
  const builtOf = new Map();
  for (const id of ids) {
    const entry = {
      cfsProductId: id,
      title: null,
      productId: null,
      check: null,
      groups: [],
      removed: [],
      warnings: [],
      unchanged: false,
    };
    products.push(entry);
    const lookup = found.get(id);
    if (!lookup) continue; // every row of this product has a problem
    if (lookup.error) {
      errors.push({
        sheet: null,
        row: null,
        product: id,
        message: lookup.error,
      });
      continue;
    }
    const current = lookup.product;
    entry.title = current.title;
    entry.productId = current.productId;
    const { groups, choices } = rows.get(id);
    const built = buildProduct({ cfsProductId: id, groups, choices }, current);
    errors.push(...built.errors.map((e) => ({ ...e, product: id })));
    if (!built.product) continue;
    builtOf.set(id, { current, product: built.product });

    const shared = await checkSharedOptions(graphql, built.product.options, {
      exceptProductIds: sheetProductIds,
      cache: sharedCache,
    });
    entry.warnings = shared.warnings;
    errors.push(
      ...shared.errors.map((message) => ({
        sheet: null,
        row: null,
        product: id,
        message,
      })),
    );

    const keptIds = new Set(built.product.options.map((o) => o.cfsId));
    const { ready, problems, fromCents } = checkProduct(built.product);
    for (const problem of problems) {
      errors.push({
        sheet: null,
        row: null,
        product: id,
        message: `Not ready to sell: ${problem}`,
      });
    }
    entry.check = { ready, problems, fromCents };
    entry.groups = groupsPreview(built.product, groups);
    entry.removed = (current.options ?? [])
      .filter((o) => !keptIds.has(o.cfsId))
      .map((o) => o.label);
  }
  const plans = [];
  for (const entry of products) {
    entry.problems = errors.filter((e) => e.product === entry.cfsProductId);
    const built = builtOf.get(entry.cfsProductId);
    if (!built || entry.problems.length || !entry.check?.ready) continue;
    entry.unchanged = sameProduct(built.current, built.product);
    if (!entry.unchanged) {
      plans.push({
        cfsProductId: entry.cfsProductId,
        productId: entry.productId,
        title: entry.title,
        ...built,
      });
    }
  }

  const importable =
    errors.length === 0 &&
    products.length > 0 &&
    products.every((p) => p.check?.ready);
  return {
    preview: { importable, errors, products },
    plans: importable ? plans : [],
  };
}

/** What the page shows: prepareImport's preview, without the built data. */
export async function previewImport(graphql, bytes) {
  return (await prepareImport(graphql, bytes)).preview;
}

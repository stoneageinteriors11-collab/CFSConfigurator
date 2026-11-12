// Builds a sheet of chosen products' current options, in the upload layout, for the team to
// edit and upload again. Read only.
import { exportRows, sheetValues } from "./export-rows.js";
import { findProducts } from "./find-products.server.js";
import { writeWorkbook } from "./spreadsheet.server.js";

const MAX_PRODUCTS = 100;

/** CFS product IDs typed with commas, semicolons, spaces or new lines; repeats dropped, order kept. */
export function parseProductIds(text) {
  const words = [...new Set(String(text ?? "").split(/[\s,;]+/).filter(Boolean))];
  const errors = words
    .filter((word) => !/^\d+$/.test(word))
    .map((word) => `"${word}" is not a CFS product ID (a number, like 146477)`);
  if (!words.length) errors.push("Enter at least one CFS product ID");
  else if (words.length > MAX_PRODUCTS) errors.push(`Enter at most ${MAX_PRODUCTS} products at a time`);
  return { ids: errors.length ? [] : words, errors };
}

const londonDate = (now) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);

/**
 * Returns { bytes, filename }, or { errors } and no file when any product cannot be exported,
 * because a file missing a product would look complete to the team.
 */
export async function currentOptionsWorkbook(graphql, text, now = new Date()) {
  const { ids, errors: idErrors } = parseProductIds(text);
  if (idErrors.length) return { errors: idErrors };

  const found = await findProducts(graphql, ids);
  const errors = [];
  const groups = [];
  const choices = [];
  for (const id of ids) {
    const { product, error } = found.get(id);
    if (error) errors.push(`Product ${id}: ${error}`);
    else if (product.ordinary) errors.push(`Product ${id}: has no options yet; start from the sample sheet`);
    else if (!Array.isArray(product.workflow?.groups) || !Array.isArray(product.options)) {
      errors.push(`Product ${id}: its current options cannot be read`);
    } else {
      const rows = sheetValues(id, exportRows(id, product));
      groups.push(...rows.groups);
      choices.push(...rows.choices);
    }
  }
  if (errors.length) return { errors };

  const name = ids.length === 1 ? ids[0] : `${ids.length}-products`;
  return { bytes: await writeWorkbook(groups, choices), filename: `cfs-options-${name}-${londonDate(now)}.xlsx` };
}

// Warns when a choice's cost is more than what it sells for, which is usually a typo.
// Costs are staff-only data; this only ever reaches the import preview.
import { resolveAssignment } from "../pricing/quote.server.js";

const PARTS = [
  ["cost", "cost price"],
  ["supplier", "supplier cost price"],
];
const cents = (text) => Math.round(Number(text) * 100);
const pounds = (value) => `£${(value / 100).toFixed(2)}`;

/** Every size ID of the product, from its model cards. */
const sizesOf = (product) =>
  Object.values(product.modelCards ?? {})
    .map((card) => card.source_id)
    .filter(Boolean);

/** product: a built product ({ options, optionCosts, modelCards }). Returns warning texts. */
export function costWarnings(product) {
  const warnings = [];
  const allSizes = sizesOf(product);
  for (const option of product.options ?? []) {
    const costs = product.optionCosts?.[option.cfsId];
    if (!costs) continue;
    const parents = (option.mappings?.assignments ?? []).map((a) => a.parent);
    const offered = parents.includes("0") ? allSizes : parents;
    for (const [part, name] of PARTS) {
      const given = costs[part];
      if (!given) continue;
      const over = [];
      for (const size of new Set([...offered, ...Object.keys(given.sizes ?? {})])) {
        const cost = given.sizes?.[size] ?? given.default;
        const price = resolveAssignment(option, size);
        if (cost === undefined || typeof price !== "object") continue;
        if (cents(cost) > price.cents) over.push({ cost: cents(cost), price: price.cents });
      }
      if (over.length) {
        warnings.push(
          `"${option.label}": ${name} ${pounds(over[0].cost)} is more than its price ${pounds(over[0].price)}` +
            (over.length > 1 ? ` (and on ${over.length - 1} more size${over.length > 2 ? "s" : ""})` : ""),
        );
      }
    }
  }
  return warnings;
}

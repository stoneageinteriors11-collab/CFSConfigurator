import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildProduct } from "../../app/import/build-product.js";
import { checkRows } from "../../app/import/check-rows.js";
import { costWarnings } from "../../app/import/cost-checks.js";
import { exportRows, sheetValues } from "../../app/import/export-rows.js";
import { sameProduct } from "../../app/import/same-product.js";

const load = (name) => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), "utf8"));
const NG = "146477";
const naturalGold = load("natural-gold");
const noCost = { default: "", sizes: {} };

// Natural Gold's own sheet rows, with change(choices) free to edit them.
function rebuild(product, change = () => {}) {
  const rows = exportRows(NG, product);
  change(rows.choices);
  return buildProduct({ cfsProductId: NG, ...rows }, product);
}
const drawer = (choices) => choices.find((c) => c.label === "with 2 Drawer");
const costsOf = (result, label = "with 2 Drawer") =>
  result.product.optionCosts[result.product.options.find((o) => o.label === label).cfsId];

test("a product with no costs exports empty cost columns and rebuilds with none", () => {
  const rows = sheetValues(NG, exportRows(NG, naturalGold));
  assert.equal(rows.choices[0]["Cost price"], "");
  assert.equal(rows.choices[0]["Supplier cost price"], "");
  const result = rebuild(naturalGold);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.product.optionCosts, {});
  assert.equal(sameProduct(naturalGold, result.product), true);
});

test("costs from the sheet are stored, with size exceptions, and export back unchanged", () => {
  const result = rebuild(naturalGold, (choices) => {
    drawer(choices).costs = {
      cost: { default: "40.00", sizes: { 17019161: "45.00" } },
      supplier: { default: "30", sizes: {} },
    };
  });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(costsOf(result), {
    cost: { default: "40.00", sizes: { 17019161: "45.00" } },
    supplier: { default: "30" },
  });
  assert.equal(sameProduct(naturalGold, result.product), false);

  // saved on the product, then downloaded again: the same cells
  const stored = { ...naturalGold, optionCosts: result.product.optionCosts };
  const row = sheetValues(NG, exportRows(NG, stored)).choices.find((c) => c.Choice === "with 2 Drawer");
  assert.equal(row["Cost price"], "40.00");
  assert.equal(row["Size cost prices"], "17019161=45.00");
  assert.equal(row["Supplier cost price"], "30");
  assert.equal(row["Size supplier cost prices"], "");
  assert.equal(sameProduct(stored, rebuild(stored).product), true);
});

test("a blank cost keeps the current one, a filled one replaces it, and only that kind of cost", () => {
  const first = rebuild(naturalGold, (choices) => {
    drawer(choices).costs = { cost: { default: "40.00", sizes: {} }, supplier: { default: "30.00", sizes: {} } };
  });
  const stored = { ...naturalGold, optionCosts: first.product.optionCosts };

  // a sheet that leaves both blank (an older sheet) keeps both
  const blank = rebuild(stored, (choices) => {
    drawer(choices).costs = { cost: noCost, supplier: noCost };
  });
  assert.deepEqual(costsOf(blank), { cost: { default: "40.00" }, supplier: { default: "30.00" } });
  assert.equal(sameProduct(stored, blank.product), true);

  // only the supplier cost changes
  const changed = rebuild(stored, (choices) => {
    drawer(choices).costs = { cost: noCost, supplier: { default: "35.00", sizes: {} } };
  });
  assert.deepEqual(costsOf(changed), { cost: { default: "40.00" }, supplier: { default: "35.00" } });
});

test("a choice left out of the sheet loses its costs", () => {
  const first = rebuild(naturalGold, (choices) => {
    drawer(choices).costs = { cost: { default: "40.00", sizes: {} }, supplier: noCost };
  });
  const stored = { ...naturalGold, optionCosts: first.product.optionCosts };
  const without = rebuild(stored, (choices) => {
    choices.splice(choices.indexOf(drawer(choices)), 1);
  });
  assert.deepEqual(without.errors, []);
  assert.deepEqual(without.product.optionCosts, {});
});

test("a cost for a size the product does not have is refused", () => {
  const result = rebuild(naturalGold, (choices) => {
    drawer(choices).costs = { cost: { default: "", sizes: { 99999999: "10.00" } }, supplier: noCost };
  });
  assert.equal(result.product, null);
  assert.match(result.errors[0].message, /Size 99999999 is not a size of this product/);
});

test("the row check reads, and refuses badly formed, costs", () => {
  const group = { row: 2, values: { "CFS product ID": "1", Group: "G", "Display order": "1", Required: "Yes", "Choose after": "", Type: "Choose one", "Max quantity": "" } };
  const choice = (extra) => ({
    row: 2,
    values: { "CFS product ID": "1", Group: "G", Choice: "C", "Price (£)": "10", Sizes: "17019159; 17019160", "Size prices": "", "CFS choice ID": "", "Option code": "", "Image URL": "", Details: "", ...extra },
  });
  const ok = checkRows({ groups: [group], choices: [choice({ "Cost price": "40.5", "Size supplier cost prices": "17019160=30" })] });
  assert.deepEqual(ok.errors, []);
  assert.deepEqual(ok.products.get("1").choices[0].costs, {
    cost: { default: "40.5", sizes: {} },
    supplier: { default: "", sizes: { 17019160: "30" } },
  });
  const messages = (extra) => checkRows({ groups: [group], choices: [choice(extra)] }).errors.map((e) => e.message);
  assert.deepEqual(messages({ "Cost price": "-5" }), ['"Cost price" must be pounds with up to two decimals, like 40.00']);
  assert.deepEqual(messages({ "Supplier cost price": "1.234" }), ['"Supplier cost price" must be pounds with up to two decimals, like 40.00']);
  assert.deepEqual(messages({ "Size cost prices": "oops" }), ['"Size cost prices" must look like 17019161=99.99']);
  assert.deepEqual(messages({ "Size cost prices": "17019161=5" }), ['Size 17019161 has a cost but is not in "Sizes"']);
});

test("warns when a cost is more than the price, and not otherwise", () => {
  const priced = rebuild(naturalGold, (choices) => {
    drawer(choices).costs = { cost: { default: "95.00", sizes: {} }, supplier: { default: "10", sizes: {} } };
  }).product;
  const warnings = costWarnings(priced);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /"with 2 Drawer": cost price £95\.00 is more than its price £89\.99/);
  assert.deepEqual(costWarnings({ ...priced, optionCosts: {} }), []);
});

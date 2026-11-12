import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { exportRows, sheetValues } from "../../app/import/export-rows.js";
import { prepareImport, previewImport } from "../../app/import/preview.server.js";
import { writeWorkbook } from "../../app/import/spreadsheet.server.js";
import { fakeShop } from "./fake-shop.js";

const load = (name) => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), "utf8"));
const naturalGold = { ...load("natural-gold"), title: "Natural Gold" };
const loft = load("loft");
const NG = "146477";
const LOFT = "69733";

const graphql = fakeShop([naturalGold, loft]);

// Both products' current options as sheet rows; change(rows) can edit them first.
async function sheet(change = () => {}) {
  const ng = sheetValues(NG, exportRows(NG, naturalGold));
  const lo = sheetValues(LOFT, exportRows(LOFT, loft));
  const rows = { groups: [...ng.groups, ...lo.groups], choices: [...ng.choices, ...lo.choices] };
  change(rows);
  return writeWorkbook(rows.groups, rows.choices);
}

test("previews a good two-product sheet", async () => {
  const result = await previewImport(graphql, await sheet());
  assert.deepEqual(result.errors, []);
  assert.equal(result.importable, true);
  assert.deepEqual(result.products.map((p) => [p.cfsProductId, p.title, p.productId]), [
    [NG, "Natural Gold", naturalGold.productId],
    [LOFT, loft.title, loft.productId],
  ]);

  const ng = result.products[0];
  assert.equal(ng.check.ready, true);
  assert.deepEqual(ng.removed, []);
  assert.deepEqual(ng.groups.map((g) => [g.name, g.required, g.after, g.kind]), [
    ["Select Drawer", true, "", "option"],
    ["Select Fabric", true, "Select Drawer", "option"],
  ]);
  const twoDrawers = ng.groups[0].choices.find((c) => c.label === "with 2 Drawer");
  assert.equal(twoDrawers.cfsId, "17020886");
  assert.equal(twoDrawers.prices.length, 6);
  assert.ok(twoDrawers.prices.every((p) => p.cents === 8999));
  assert.deepEqual(twoDrawers.prices[0], { sizeId: "17019157", sizeTitle: naturalGold.variants[0].title, cents: 8999 });

  const lights = result.products[1].groups.find((g) => g.kind === "accessory");
  assert.equal(lights.maxQuantity, loft.workflow.pricing.accessory_max_quantity);
});

test("one bad product still shows the others but blocks the import", async () => {
  let badRow;
  const result = await previewImport(
    graphql,
    await sheet((rows) => {
      const index = rows.choices.findIndex((c) => c["CFS product ID"] === LOFT);
      rows.choices[index].Sizes = "99999999";
      badRow = index + 2;
    }),
  );
  assert.equal(result.importable, false);
  assert.deepEqual(result.errors, [
    { sheet: "Choices", row: badRow, product: LOFT, message: "Size 99999999 is not a size of this product in Shopify" },
  ]);
  // Both products keep their place; only Loft is marked as having problems.
  assert.deepEqual(result.products.map((p) => [p.cfsProductId, p.problems.length]), [[NG, 0], [LOFT, 1]]);
  const bad = result.products[1];
  assert.equal(bad.title, loft.title);
  assert.equal(bad.check, null);
  assert.deepEqual(bad.groups, []);
  assert.equal(bad.problems[0].row, badRow);
});

test("a product not in Shopify is an error naming it", async () => {
  const result = await previewImport(
    graphql,
    await sheet((rows) => {
      rows.groups.push({ "CFS product ID": "999999", Group: "G", "Display order": "1", Required: "No", Type: "Choose one" });
      rows.choices.push({ "CFS product ID": "999999", Group: "G", Choice: "C", "Price (£)": "1" });
    }),
  );
  assert.equal(result.importable, false);
  assert.deepEqual(result.errors, [
    { sheet: null, row: null, product: "999999", message: "No Shopify product has sizes with SKUs like CFS-999999-<size ID>" },
  ]);
  const missing = result.products.at(-1);
  assert.deepEqual(
    [missing.cfsProductId, missing.title, missing.productId, missing.problems.length],
    ["999999", null, null, 1],
  );
});

test("row errors block the import and name the row", async () => {
  const result = await previewImport(
    graphql,
    await sheet((rows) => {
      rows.choices[0]["Price (£)"] = "abc";
    }),
  );
  assert.equal(result.importable, false);
  assert.deepEqual(result.errors[0], {
    sheet: "Choices",
    row: 2,
    product: NG,
    message: '"Price (£)" must be pounds with up to two decimals, like 89.99',
  });
  // The product still gets a tab, showing its problem, even though the rest of its rows are fine.
  assert.equal(result.products[0].cfsProductId, NG);
  assert.equal(result.products[0].problems.length, 1);
});

test("a product whose every row is wrong still gets a tab", async () => {
  const result = await previewImport(
    graphql,
    await sheet((rows) => {
      rows.groups.push({ "CFS product ID": "555", Group: "", "Display order": "1", Required: "No", Type: "Choose one" });
    }),
  );
  const bad = result.products.find((p) => p.cfsProductId === "555");
  assert.deepEqual(bad.problems.map((e) => e.message), ['"Group" is empty']);
  assert.equal(bad.title, null);
});

test("warns about choices the sheet removes", async () => {
  const result = await previewImport(
    graphql,
    await sheet((rows) => {
      rows.choices = rows.choices.filter((c) => c.Choice !== "Carlton Mink");
    }),
  );
  assert.deepEqual(result.errors, []);
  assert.equal(result.importable, true);
  assert.deepEqual(result.products[0].removed, ["Carlton Mink"]);
});

test("refuses an oversized file before reading it", async () => {
  const neverCalled = async () => assert.fail("Shopify should not be called");
  const result = await previewImport(neverCalled, Buffer.alloc(5 * 1024 * 1024 + 1));
  assert.deepEqual(result, {
    importable: false,
    errors: [{ sheet: null, row: null, message: "The file is larger than 5 MB" }],
    products: [],
  });
});

test("an empty sheet is not importable", async () => {
  const result = await previewImport(graphql, await writeWorkbook([], []));
  assert.equal(result.importable, false);
  assert.deepEqual(result.errors, [{ sheet: null, row: null, message: "The file has no rows to import" }]);
});

test("a product the shop would not sell is an error", async () => {
  const saved = loft.variants;
  loft.variants = loft.variants.map((v) => ({ ...v, inventoryQuantity: 0 }));
  try {
    const result = await previewImport(graphql, await sheet());
    assert.equal(result.importable, false);
    assert.deepEqual(result.errors, [
      { sheet: null, row: null, product: LOFT, message: "Not ready to sell: No size is in stock, so it cannot be bought" },
    ]);
    assert.equal(result.products[1].check.ready, false);
  } finally {
    loft.variants = saved;
  }
});

test("refuses more than 100 products in one sheet", async () => {
  const groups = Array.from({ length: 101 }, (_, i) => ({
    "CFS product ID": String(i + 1), Group: "G", "Display order": "1", Required: "No", Type: "Choose one",
  }));
  const neverCalled = async () => assert.fail("Shopify should not be called");
  const result = await previewImport(neverCalled, await writeWorkbook(groups, []));
  assert.deepEqual(result, {
    importable: false,
    errors: [{ sheet: null, row: null, message: "The sheet has 101 products; preview at most 100 at a time" }],
    products: [],
  });
});

test("marks a re-uploaded product unchanged and plans nothing for it", async () => {
  const { preview, plans } = await prepareImport(graphql, await sheet());
  assert.equal(preview.importable, true);
  assert.deepEqual(preview.products.map((p) => p.unchanged), [true, true]);
  assert.deepEqual(plans, []);
});

test("plans a changed product with its built data", async () => {
  const bytes = await sheet((rows) => {
    rows.choices.find((c) => c["CFS product ID"] === NG && c.Choice === "with 2 Drawer")["Price (£)"] = "99.99";
  });
  const { preview, plans } = await prepareImport(graphql, bytes);
  assert.equal(preview.importable, true);
  assert.deepEqual(preview.products.map((p) => p.unchanged), [false, true]);
  assert.deepEqual(plans.map((p) => [p.cfsProductId, p.productId, p.title]), [[NG, naturalGold.productId, "Natural Gold"]]);
  assert.equal(plans[0].current.productId, naturalGold.productId);
  const drawer = plans[0].product.options.find((o) => o.label === "with 2 Drawer");
  assert.equal(drawer.mappings.assignments[0].raw_price, "99.99");
  assert.equal(JSON.stringify(preview).includes("raw_price"), false, "the page is not sent the built data");
});

test("a product with problems is not unchanged and is not planned", async () => {
  const bytes = await sheet((rows) => {
    rows.choices.find((c) => c["CFS product ID"] === NG)["Price (£)"] = "abc";
  });
  const { preview, plans } = await prepareImport(graphql, bytes);
  assert.equal(preview.products[0].unchanged, false);
  assert.deepEqual(plans, []);
});

const OTHER_BED = { id: "gid://shopify/Product/999", title: "Other Bed" };
const withCode = (code) => (rows) => {
  rows.choices.find((c) => c["CFS product ID"] === NG && c.Choice === "with 2 Drawer")["Option code"] = code;
};

test("a shared-option error blocks import and a warning does not", async () => {
  const clash = fakeShop([naturalGold, loft], [
    { id: "gid://shopify/Metaobject/1", label: "Two drawers", code: "DRAWER-2", products: [OTHER_BED] },
  ]);
  const blocked = await prepareImport(clash, await sheet(withCode("DRAWER-2")));
  assert.equal(blocked.preview.importable, false);
  assert.equal(blocked.preview.products[0].problems.length, 1);
  assert.match(blocked.preview.products[0].problems[0].message, /Option code DRAWER-2 is "Two drawers" on Other Bed \(999\)/);
  assert.equal(blocked.preview.products[0].problems[0].product, NG);
  assert.deepEqual(blocked.plans, []);

  const similar = fakeShop([naturalGold, loft], [
    { id: "gid://shopify/Metaobject/2", label: "Carlton Black", code: "CB01", products: [OTHER_BED] },
  ]);
  const warned = await prepareImport(similar, await sheet());
  assert.equal(warned.preview.importable, true);
  assert.deepEqual(warned.preview.errors, []);
  assert.deepEqual(warned.preview.products[0].warnings, [
    '"Carlton Black" has the same name as option code CB01 on Other Bed; add the code if it is the same option',
  ]);
  assert.deepEqual(warned.preview.products[1].warnings, []);
});

test("a code that matches live products is allowed and plans the change", async () => {
  const agree = fakeShop([naturalGold, loft], [
    { id: "gid://shopify/Metaobject/3", label: "with 2 Drawer", code: "DRAWER-2", products: [OTHER_BED] },
  ]);
  const { preview, plans } = await prepareImport(agree, await sheet(withCode("DRAWER-2")));
  assert.deepEqual(preview.errors, []);
  assert.equal(preview.importable, true);
  assert.deepEqual(plans.map((p) => p.cfsProductId), [NG]);
});

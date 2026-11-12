import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { exportRows, sheetValues } from "../../app/import/export-rows.js";
import { previewImport } from "../../app/import/preview.server.js";
import { writeWorkbook } from "../../app/import/spreadsheet.server.js";

const load = (name) => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), "utf8"));
const naturalGold = { ...load("natural-gold"), title: "Natural Gold" };
const loft = load("loft");
const NG = "146477";
const LOFT = "69733";

// The fixture as Shopify's API returns it, for loadConfigurableProduct.
const asShopify = (p) => ({
  id: p.productId,
  title: p.title,
  handle: p.handle ?? "",
  featuredMedia: null,
  variants: { pageInfo: { hasNextPage: false }, nodes: p.variants },
  modelCards: { value: JSON.stringify(p.modelCards) },
  workflow: { value: JSON.stringify(p.workflow) },
  options: {
    references: {
      pageInfo: { hasNextPage: false },
      nodes: p.options.map((o) => ({
        cfsId: { value: o.cfsId },
        label: { value: o.label },
        groupName: { value: o.groupName },
        mappings: { value: JSON.stringify(o.mappings) },
        imageUrl: o.imageUrl ? { value: o.imageUrl } : null,
      })),
    },
  },
});

const shop = [naturalGold, loft];
async function graphql(query, { variables }) {
  let data;
  if (query.includes("productVariants")) {
    const nodes = shop.flatMap((p) => p.variants.map((v) => ({ sku: v.sku, product: { id: p.productId } })));
    data = { productVariants: { pageInfo: { hasNextPage: false }, nodes } };
  } else {
    const product = shop.find((p) => p.productId === variables.id);
    data = { product: product ? asShopify(product) : null };
  }
  return { json: async () => ({ data }) };
}

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
  assert.deepEqual(result.products.map((p) => p.cfsProductId), [NG]);
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
    message: '"Price (£)" must be pounds with up to two decimals, like 89.99',
  });
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

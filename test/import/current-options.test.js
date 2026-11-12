import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { currentOptionsWorkbook, parseProductIds } from "../../app/import/current-options.server.js";
import { previewImport } from "../../app/import/preview.server.js";
import { readWorkbook } from "../../app/import/spreadsheet.server.js";
import { fakeShop } from "./fake-shop.js";

const load = (name) => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), "utf8"));
const naturalGold = { ...load("natural-gold"), title: "Natural Gold" };
const loft = load("loft");
const graphql = fakeShop([naturalGold, loft]);
// 23:30 on 12 November in London is still 12 November, though 13 November is near in other zones.
const NOW = new Date("2026-11-12T23:30:00Z");

test("reads IDs however they are typed", () => {
  assert.deepEqual(parseProductIds(" 146477, 69733\n146477;  "), { ids: ["146477", "69733"], errors: [] });
  assert.deepEqual(parseProductIds("UD-146477 abc").errors, [
    '"UD-146477" is not a CFS product ID (a number, like 146477)',
    '"abc" is not a CFS product ID (a number, like 146477)',
  ]);
  assert.deepEqual(parseProductIds("  ").errors, ["Enter at least one CFS product ID"]);
  const many = Array.from({ length: 101 }, (_, i) => String(i + 1)).join(" ");
  assert.deepEqual(parseProductIds(many).errors, ["Enter at most 100 products at a time"]);
});

test("downloads both products and they preview unchanged", async () => {
  const result = await currentOptionsWorkbook(graphql, "146477, 69733", NOW);
  assert.equal(result.errors, undefined);
  const sheet = await readWorkbook(result.bytes);
  assert.deepEqual(sheet.errors, []);
  assert.deepEqual([...new Set(sheet.groups.map((g) => g.values["CFS product ID"]))], ["146477", "69733"]);

  const preview = await previewImport(graphql, result.bytes);
  assert.deepEqual(preview.errors, []);
  assert.equal(preview.importable, true);
  assert.ok(preview.products.every((p) => p.removed.length === 0));
});

test("keeps prices exactly", async () => {
  const { bytes } = await currentOptionsWorkbook(graphql, "146477", NOW);
  const { choices } = await readWorkbook(bytes);
  assert.equal(choices.find((c) => c.values.Choice === "with 2 Drawer").values["Price (£)"], "89.99");
  assert.equal(choices.find((c) => c.values.Choice === "Carlton Black").values["Price (£)"], "0.00");
});

test("names the file", async () => {
  assert.equal((await currentOptionsWorkbook(graphql, "146477", NOW)).filename, "cfs-options-146477-2026-11-12.xlsx");
  assert.equal(
    (await currentOptionsWorkbook(graphql, "146477 69733", NOW)).filename,
    "cfs-options-2-products-2026-11-12.xlsx",
  );
});

test("refuses unknown products and products with no options, with no file", async () => {
  const unknown = await currentOptionsWorkbook(graphql, "146477 999999", NOW);
  assert.deepEqual(unknown, {
    errors: ["Product 999999: No Shopify product has sizes with SKUs like CFS-999999-<size ID>"],
  });

  const plain = fakeShop([{ ...naturalGold, ordinary: true }]);
  assert.deepEqual(await currentOptionsWorkbook(plain, "146477", NOW), {
    errors: ["Product 146477: has no options yet; start from the sample sheet"],
  });

  const broken = fakeShop([{ ...naturalGold, workflow: { mode: "x" } }]);
  assert.deepEqual(await currentOptionsWorkbook(broken, "146477", NOW), {
    errors: ["Product 146477: its current options cannot be read"],
  });

  assert.deepEqual(await currentOptionsWorkbook(graphql, "abc", NOW), {
    errors: ['"abc" is not a CFS product ID (a number, like 146477)'],
  });
});

test("downloads each choice's option code", async () => {
  const coded = structuredClone(naturalGold);
  const option = coded.options.find((o) => o.label === "Carlton Black");
  option.optionCode = "FAB-CARLTON-BLACK";
  const { bytes } = await currentOptionsWorkbook(fakeShop([coded]), "146477", NOW);
  const { choices } = await readWorkbook(bytes);
  assert.equal(choices.find((c) => c.values.Choice === "Carlton Black").values["Option code"], "FAB-CARLTON-BLACK");
  assert.equal(choices.find((c) => c.values.Choice === "with 2 Drawer").values["Option code"], "");
});

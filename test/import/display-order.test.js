import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildProduct, inDisplayOrder } from "../../app/import/build-product.js";
import { exportRows, sheetValues } from "../../app/import/export-rows.js";
import { sameProduct } from "../../app/import/same-product.js";

const load = (name) => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), "utf8"));
const NG = "146477";
const naturalGold = load("natural-gold");
const c = (group, label, displayOrder = null) => ({ group, label, displayOrder });
const labels = (choices) => choices.map((x) => x.label);

test("choices are put in display order within their group, numbered first, blanks after in sheet order", () => {
  const sorted = inDisplayOrder([c("G", "A", 3), c("G", "B"), c("G", "C", 1), c("G", "D"), c("G", "E", 2)]);
  assert.deepEqual(labels(sorted), ["C", "E", "A", "B", "D"]);
});

test("each group keeps the places it holds in the list, so interleaved groups stay interleaved", () => {
  const sorted = inDisplayOrder([c("X", "x2", 2), c("Y", "y1", 1), c("X", "x1", 1), c("Y", "y2", 2)]);
  assert.deepEqual(labels(sorted), ["x1", "y1", "x2", "y2"]);
});

test("a sheet with no numbers keeps its row order", () => {
  const rows = [c("G", "B"), c("G", "A"), c("H", "Z")];
  assert.deepEqual(labels(inDisplayOrder(rows)), ["B", "A", "Z"]);
});

test("a product's own export numbers each group 1, 2, 3 and rebuilds to the same product", () => {
  const rows = exportRows(NG, naturalGold);
  const drawers = rows.choices.filter((x) => x.group === "Select Drawer").map((x) => x.displayOrder);
  assert.deepEqual(drawers, drawers.map((_, i) => i + 1));
  assert.equal(sheetValues(NG, rows).choices[0]["Display order"], "1");
  const { product, errors } = buildProduct({ cfsProductId: NG, ...rows }, naturalGold);
  assert.deepEqual(errors, []);
  assert.equal(sameProduct(naturalGold, product), true);
});

test("changing a display order changes the order of the product's options, and counts as a change", () => {
  const rows = exportRows(NG, naturalGold);
  const drawers = rows.choices.filter((x) => x.group === "Select Drawer");
  assert.ok(drawers.length >= 2);
  drawers[0].displayOrder = drawers.length + 1; // move the first drawer choice to the end
  const { product, errors } = buildProduct({ cfsProductId: NG, ...rows }, naturalGold);
  assert.deepEqual(errors, []);
  const inGroup = product.options.filter((o) => o.groupName === "Select Drawer").map((o) => o.label);
  assert.equal(inGroup.at(-1), drawers[0].label);
  assert.equal(sameProduct(naturalGold, product), false);
});

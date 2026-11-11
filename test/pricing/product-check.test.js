import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { checkProduct, checkProducts } from "../../app/pricing/product-check.server.js";

const naturalGold = JSON.parse(readFileSync(new URL("../fixtures/natural-gold.json", import.meta.url), "utf8"));
const copy = () => structuredClone(naturalGold);
const hasProblem = (result, pattern) => result.problems.some((p) => pattern.test(p));

test("Natural Gold is ready, from its cheapest complete price", () => {
  const result = checkProduct(naturalGold);
  assert.deepEqual(result.problems, []);
  assert.equal(result.ready, true);
  assert.equal(result.fromCents, 99999);
  assert.equal(result.groups, naturalGold.workflow.groups.length);
  assert.equal(result.choices, naturalGold.options.length);
});

test("a size in stock without a model card is reported", () => {
  const product = copy();
  const [first] = product.variants.filter((v) => v.inventoryQuantity > 0);
  delete product.modelCards[first.sku];
  const result = checkProduct(product);
  assert.equal(result.ready, false);
  assert.ok(hasProblem(result, new RegExp(`${first.sku}\\) has no model card`)));
});

test("a choice with damaged price data is reported", () => {
  const product = copy();
  product.options[0].mappings = undefined;
  const result = checkProduct(product);
  assert.equal(result.ready, false);
  assert.ok(hasProblem(result, /unreadable price data/));
});

test("a size whose price cannot be read is reported", () => {
  const product = copy();
  const variant = product.variants.find((v) => v.inventoryQuantity > 0);
  variant.price = "not a price";
  const result = checkProduct(product);
  assert.equal(result.ready, false);
  assert.ok(hasProblem(result, /cannot be priced: price or model data unreadable/));
});

test("a product with nothing in stock is not ready", () => {
  const product = copy();
  for (const variant of product.variants) variant.inventoryQuantity = 0;
  const result = checkProduct(product);
  assert.equal(result.ready, false);
  assert.equal(result.sizesOnSale, 0);
  assert.ok(hasProblem(result, /No size is in stock/));
});

test("a product type the app does not price yet is named", () => {
  const product = copy();
  product.workflow.mode = "rauchPopup";
  const result = checkProduct(product);
  assert.equal(result.ready, false);
  assert.deepEqual(result.problems, ['Product type "rauchPopup" is not supported yet']);
});

test("missing, partial or plain products are not ready", () => {
  assert.equal(checkProduct(null).ready, false);
  assert.equal(checkProduct({ ordinary: true }).ready, false);
  const broken = copy();
  broken.workflow = undefined;
  assert.ok(hasProblem(checkProduct(broken), /workflow/));
});

test("every listed product is read and checked", async () => {
  const listed = { id: "gid://shopify/Product/1", title: "Natural Gold", handle: "ng", status: "ACTIVE" };
  const reads = [];
  const graphql = async (query, { variables }) => {
    if (query.includes("CfsCheckedProducts")) return { json: async () => ({ data: { products: { nodes: [listed] } } }) };
    reads.push(variables.id);
    return { json: async () => ({ data: { product: null } }) };
  };
  const [result] = await checkProducts(graphql);
  assert.deepEqual(reads, [listed.id]);
  assert.equal(result.title, "Natural Gold");
  assert.equal(result.ready, false);
});

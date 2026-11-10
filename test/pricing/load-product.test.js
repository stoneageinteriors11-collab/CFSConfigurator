import assert from "node:assert/strict";
import { test } from "node:test";
import { loadConfigurableProduct } from "../../app/pricing/load-product.server.js";

const shopifyProduct = () => ({
  id: "gid://shopify/Product/1",
  variants: {
    pageInfo: { hasNextPage: false },
    nodes: [{ id: "v1", sku: "A", price: "10.00", inventoryQuantity: 1 }],
  },
  modelCards: { value: '{"A":{"source_id":"1"}}' },
  workflow: { value: '{"mode":"m"}' },
  options: {
    references: {
      pageInfo: { hasNextPage: false },
      nodes: [
        {
          cfsId: { value: "c1" },
          label: { value: "Label" },
          groupName: { value: "Group" },
          mappings: { value: '{"kind":"option","assignments":[]}' },
        },
      ],
    },
  },
});

const load = (product) =>
  loadConfigurableProduct(async () => ({ json: async () => ({ data: { product } }) }), "id");

test("converts Shopify's response for the pricing engine", async () => {
  assert.deepEqual(await load(shopifyProduct()), {
    productId: "gid://shopify/Product/1",
    variants: [{ id: "v1", sku: "A", price: "10.00", inventoryQuantity: 1 }],
    modelCards: { A: { source_id: "1" } },
    workflow: { mode: "m" },
    options: [{ cfsId: "c1", label: "Label", groupName: "Group", mappings: { kind: "option", assignments: [] } }],
  });
});

test("refuses a missing product or missing options", async () => {
  assert.equal(await load(null), null);
  const product = shopifyProduct();
  product.options = null;
  assert.equal(await load(product), null);
});

const plainProduct = () => ({
  ...shopifyProduct(),
  status: "ACTIVE",
  publishedAt: "2026-01-01T00:00:00Z",
  modelCards: null,
  workflow: null,
  options: null,
});

test("marks a product with none of the CFS data as ordinary", async () => {
  const loaded = await load(plainProduct());
  assert.equal(loaded.ordinary, true);
  assert.equal(loaded.status, "ACTIVE");
  assert.equal(loaded.variants.length, 1);
});

test("never treats a product with any CFS data as ordinary", async () => {
  for (const key of ["modelCards", "workflow"]) {
    assert.equal(await load({ ...plainProduct(), [key]: { value: "{}" } }), null, key);
  }
  assert.equal(await load({ ...plainProduct(), options: { references: null } }), null);
});

test("refuses a partial variant list on an ordinary product", async () => {
  const product = plainProduct();
  product.variants = { ...product.variants, pageInfo: { hasNextPage: true } };
  assert.equal(await load(product), null);
});

test("refuses a partial list, which could hide required choices", async () => {
  const moreVariants = shopifyProduct();
  moreVariants.variants.pageInfo.hasNextPage = true;
  assert.equal(await load(moreVariants), null);

  const moreOptions = shopifyProduct();
  moreOptions.options.references.pageInfo.hasNextPage = true;
  assert.equal(await load(moreOptions), null);
});

test("leaves bad JSON undefined so the engine refuses it", async () => {
  const product = shopifyProduct();
  product.workflow.value = "{bad";
  product.options.references.nodes[0].mappings.value = "{bad";
  const loaded = await load(product);
  assert.equal(loaded.workflow, undefined);
  assert.equal(loaded.options[0].mappings, undefined);
});

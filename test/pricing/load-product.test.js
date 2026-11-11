import assert from "node:assert/strict";
import { test } from "node:test";
import { loadConfigurableProduct } from "../../app/pricing/load-product.server.js";

const shopifyProduct = () => ({
  id: "gid://shopify/Product/1",
  title: "Bed",
  handle: "bed",
  featuredMedia: { preview: { image: { url: "https://cdn.example/bed.jpg" } } },
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
    title: "Bed",
    handle: "bed",
    imageUrl: "https://cdn.example/bed.jpg",
    variants: [{ id: "v1", sku: "A", price: "10.00", inventoryQuantity: 1 }],
    modelCards: { A: { source_id: "1" } },
    workflow: { mode: "m" },
    options: [{ cfsId: "c1", label: "Label", groupName: "Group", mappings: { kind: "option", assignments: [] }, imageUrl: null }],
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

const choiceNode = (n) => ({
  cfsId: { value: `c${n}` },
  label: { value: `Choice ${n}` },
  groupName: { value: "Group" },
  mappings: { value: '{"kind":"option","assignments":[]}' },
});
const choicePage = (from, count, endCursor) => ({
  pageInfo: { hasNextPage: Boolean(endCursor), endCursor },
  nodes: Array.from({ length: count }, (_, i) => choiceNode(from + i)),
});

/** Shopify answering the product request, then each further page of choices by its cursor. */
function pagedShop(firstPage, laterPages) {
  const requests = [];
  const graphql = async (query, { variables }) => {
    requests.push(variables);
    if (!variables.after) {
      return { json: async () => ({ data: { product: { ...shopifyProduct(), options: { references: firstPage } } } }) };
    }
    const references = laterPages[variables.after];
    return { json: async () => ({ data: { product: references === undefined ? null : { options: { references } } } }) };
  };
  return { graphql, requests };
}

test("reads every choice of a product with more than 250, page by page", async () => {
  const { graphql, requests } = pagedShop(choicePage(1, 250, "p2"), { p2: choicePage(251, 50, null) });
  const loaded = await loadConfigurableProduct(graphql, "gid://shopify/Product/1");
  assert.equal(loaded.options.length, 300);
  assert.equal(new Set(loaded.options.map((o) => o.cfsId)).size, 300);
  assert.equal(loaded.options[299].cfsId, "c300");
  assert.deepEqual(requests, [{ id: "gid://shopify/Product/1" }, { id: "gid://shopify/Product/1", after: "p2" }]);
});

test("reads Shopify's largest list of 1,024 choices", async () => {
  const later = { p2: choicePage(251, 250, "p3"), p3: choicePage(501, 250, "p4"), p4: choicePage(751, 250, "p5"), p5: choicePage(1001, 24, null) };
  const { graphql } = pagedShop(choicePage(1, 250, "p2"), later);
  assert.equal((await loadConfigurableProduct(graphql, "id")).options.length, 1024);
});

test("refuses the product if a later page of choices cannot be read", async () => {
  const { graphql } = pagedShop(choicePage(1, 250, "p2"), {});
  assert.equal(await loadConfigurableProduct(graphql, "id"), null);
});

test("refuses a list that never ends rather than reading forever", async () => {
  const endless = new Proxy({}, { get: (_, cursor) => choicePage(1, 250, `${cursor}+`) });
  const { graphql, requests } = pagedShop(choicePage(1, 250, "p2"), endless);
  assert.equal(await loadConfigurableProduct(graphql, "id"), null);
  assert.equal(requests.length, 5);
});

test("leaves bad JSON undefined so the engine refuses it", async () => {
  const product = shopifyProduct();
  product.workflow.value = "{bad";
  product.options.references.nodes[0].mappings.value = "{bad";
  const loaded = await load(product);
  assert.equal(loaded.workflow, undefined);
  assert.equal(loaded.options[0].mappings, undefined);
});

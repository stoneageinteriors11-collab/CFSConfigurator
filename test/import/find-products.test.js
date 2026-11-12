import assert from "node:assert/strict";
import { test } from "node:test";
import { findProducts } from "../../app/import/find-products.server.js";

const P1 = "gid://shopify/Product/1";
const P2 = "gid://shopify/Product/2";

const productData = (id) => ({
  id,
  title: "Natural Gold",
  handle: "natural-gold",
  featuredMedia: null,
  variants: { pageInfo: { hasNextPage: false }, nodes: [{ id: "v1", sku: "CFS-146477-17019157", price: "999.99" }] },
  modelCards: null,
  workflow: null,
  options: null,
});

// Fake Shopify: skus maps a CFS product ID to [sku, productId] pairs; products maps a product ID to its data.
function fakeShopify({ skus = {}, products = {}, morePages = false }) {
  const calls = [];
  const graphql = async (query, { variables }) => {
    calls.push(variables);
    let data;
    if (query.includes("productVariants")) {
      const id = /sku:CFS-(\d+)-\*/.exec(variables.query)[1];
      const nodes = (skus[id] ?? []).map(([sku, productId]) => ({ sku, product: { id: productId } }));
      data = { productVariants: { pageInfo: { hasNextPage: morePages }, nodes } };
    } else {
      data = { product: products[variables.id] ?? null };
    }
    return { json: async () => ({ data }) };
  };
  return { graphql, calls };
}

test("finds the product whose sizes carry the CFS product ID", async () => {
  const { graphql, calls } = fakeShopify({
    skus: { 146477: [["CFS-TYPE-146477-17019157", P1], ["UD-146477-17019158", P1]] },
    products: { [P1]: productData(P1) },
  });
  const found = await findProducts(graphql, ["146477"]);
  assert.equal(found.get("146477").product.productId, P1);
  assert.equal(found.get("146477").product.ordinary, true);
  assert.equal(calls[0].query, "sku:CFS-146477-* OR sku:UD-146477-* OR sku:CFS-TYPE-146477-*");
});

test("ignores SKUs that only start with the same digits", async () => {
  const { graphql } = fakeShopify({
    skus: { 146477: [["CFS-1464770-1", P2], ["CFS-146477-17019157", P1], ["CFS-146477-abc", P2]] },
    products: { [P1]: productData(P1) },
  });
  const found = await findProducts(graphql, ["146477"]);
  assert.equal(found.get("146477").product.productId, P1);
});

test("explains a product that is not found", async () => {
  const { graphql } = fakeShopify({ skus: { 146477: [["CFS-1464770-1", P1]] } });
  const found = await findProducts(graphql, ["146477"]);
  assert.deepEqual(found.get("146477"), { error: "No Shopify product has sizes with SKUs like CFS-146477-<size ID>" });
});

test("refuses sizes spread over two Shopify products", async () => {
  const { graphql } = fakeShopify({ skus: { 146477: [["CFS-146477-1", P1], ["UD-146477-2", P2]] } });
  const found = await findProducts(graphql, ["146477"]);
  assert.deepEqual(found.get("146477"), { error: "Sizes with this product ID are on more than one Shopify product" });
});

test("refuses a product Shopify returned only part of", async () => {
  const partial = { ...productData(P1), variants: { pageInfo: { hasNextPage: true }, nodes: [] } };
  const { graphql } = fakeShopify({ skus: { 146477: [["CFS-146477-1", P1]] }, products: { [P1]: partial } });
  const found = await findProducts(graphql, ["146477"]);
  assert.deepEqual(found.get("146477"), {
    error: "Shopify returned only part of this product (over 250 sizes, or its choices could not all be read)",
  });

  const many = fakeShopify({ skus: { 146477: [["CFS-146477-1", P1]] }, morePages: true });
  assert.deepEqual((await findProducts(many.graphql, ["146477"])).get("146477"), {
    error: "Shopify returned only part of this product (over 250 sizes, or its choices could not all be read)",
  });
});

test("looks up each product once, in order", async () => {
  const { graphql, calls } = fakeShopify({
    skus: { 1: [["CFS-1-9", P1]], 2: [["CFS-2-9", P2]] },
    products: { [P1]: productData(P1), [P2]: productData(P2) },
  });
  const found = await findProducts(graphql, ["1", "2", "1"]);
  assert.deepEqual([...found.keys()], ["1", "2"]);
  assert.equal(calls.length, 4);
});

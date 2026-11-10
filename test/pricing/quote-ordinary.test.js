import assert from "node:assert/strict";
import { test } from "node:test";
import { quoteOrdinaryProduct } from "../../app/pricing/quote.server.js";

const variant = { id: "v1", sku: "TEST-EOC-S", price: "149.00", availableForSale: true };
const product = (changes = {}) => ({
  ordinary: true,
  status: "ACTIVE",
  publishedAt: "2026-01-01T00:00:00Z",
  variants: [variant],
  ...changes,
});
const quote = (p, request = {}) => quoteOrdinaryProduct(p, { variantId: "v1", choiceIds: [], ...request });
const codeOf = (result) => result.errors[0].code;

test("prices an ordinary product at its Shopify variant price", () => {
  assert.deepEqual(quote(product()), {
    ok: true,
    variantId: "v1",
    sku: "TEST-EOC-S",
    baseCents: 14900,
    lines: [],
    totalCents: 14900,
  });
});

test("accepts a variant with no SKU", () => {
  assert.equal(quote(product({ variants: [{ ...variant, sku: null }] })).sku, "");
});

test("refuses choices on an ordinary product", () => {
  assert.equal(codeOf(quote(product(), { choiceIds: ["17020886"] })), "choices_not_allowed");
});

test("refuses a product shoppers cannot buy", () => {
  assert.equal(codeOf(quote(product({ status: "DRAFT" }))), "product_unavailable");
  assert.equal(codeOf(quote(product({ status: "ARCHIVED" }))), "product_unavailable");
  assert.equal(codeOf(quote(product({ publishedAt: null }))), "product_unavailable");
});

test("refuses a variant from elsewhere or one that is sold out", () => {
  assert.equal(codeOf(quote(product(), { variantId: "other" })), "unknown_variant");
  assert.equal(codeOf(quote(product({ variants: [{ ...variant, availableForSale: false }] }))), "variant_unavailable");
});

test("refuses a price it cannot read rather than treating it as free", () => {
  for (const price of [null, "", "abc", "-1.00"]) {
    assert.equal(codeOf(quote(product({ variants: [{ ...variant, price }] }))), "invalid_product_data");
  }
});

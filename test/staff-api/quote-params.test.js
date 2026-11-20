// Turns the Orders app's JSON quote request into the parameters the existing price check reads.
import assert from "node:assert/strict";
import { test } from "node:test";
import { quoteParams } from "../../app/staff-api/quote-params.server.js";

test("accepts numeric ids or Shopify gids and lists each choice and accessory quantity", () => {
  const params = quoteParams({
    productId: "gid://shopify/Product/11067852980563",
    variantId: "55773143433555",
    choiceIds: ["17020886", "217067"],
    quantities: { 217067: 2 },
  });
  assert.equal(params.get("product"), "11067852980563");
  assert.equal(params.get("variant"), "55773143433555");
  assert.deepEqual(params.getAll("choice"), ["17020886", "217067"]);
  assert.deepEqual(params.getAll("quantity"), ["217067:2"]);
});

test("no quantities gives no quantity entries", () => {
  const params = quoteParams({ productId: "1", variantId: "2", choiceIds: [] });
  assert.deepEqual(params.getAll("quantity"), []);
});

test("returns null for anything that is not an object with a choice list", () => {
  for (const body of [null, undefined, "x", 5, [], { productId: "1", variantId: "2" }, { productId: "1", variantId: "2", choiceIds: "7" }]) {
    assert.equal(quoteParams(body), null);
  }
});

test("passes odd values through so the price check, not this code, refuses them", () => {
  const params = quoteParams({ productId: "abc", variantId: "2", choiceIds: ["x y"], quantities: { "x y": "many" } });
  assert.equal(params.get("product"), "abc");
  assert.deepEqual(params.getAll("choice"), ["x y"]);
  assert.deepEqual(params.getAll("quantity"), ["x y:many"]);
});

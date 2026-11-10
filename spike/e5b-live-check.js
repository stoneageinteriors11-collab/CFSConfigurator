// E5b: runs the pre-checkout check against real dev store products. Reads only.
// Usage: node spike/e5b-live-check.js
import assert from "node:assert/strict";
import { read, STORE } from "./lib.js";
import { checkBasket } from "../app/checkout/check-basket.server.js";

const { shop } = read("query { shop { myshopifyDomain } }");
assert.equal(shop.myshopifyDomain, STORE);

const graphql = async (query, { variables }) => {
  const data = read(query, variables);
  return { json: async () => ({ data }) };
};

const bed = (changes = {}) => ({
  id: "bed",
  productId: "11067852980563",
  variantId: "gid://shopify/ProductVariant/55773143433555",
  quantity: 1,
  baseCents: 99999,
  unitCents: 108998,
  selection: [{ choiceId: "17020886" }, { choiceId: "17020903" }],
  ...changes,
});
const mattress = (changes = {}) => ({
  id: "mattress",
  productId: "11057927913811",
  variantId: "gid://shopify/ProductVariant/55724611273043",
  quantity: 1,
  baseCents: 14900,
  unitCents: 14900,
  selection: [],
  ...changes,
});

const good = await checkBasket(graphql, { lines: [bed(), mattress()] });
assert.equal(good.ok, true, JSON.stringify(good));
assert.equal(good.totalCents, 108998 + 14900);
console.log(`pass: bed plus mattress totals ${good.totalCents} pennies`);

const tooMany = await checkBasket(graphql, { lines: [mattress({ quantity: 99 })] });
assert.equal(tooMany.problems?.[0].code, "insufficient_stock", JSON.stringify(tooMany));
console.log(`pass: 99 mattresses refused, real stock ${tooMany.problems[0].available}`);

const stale = await checkBasket(graphql, { lines: [bed({ unitCents: 100000, baseCents: 91001 })] });
assert.equal(stale.problems?.[0].code, "price_changed", JSON.stringify(stale.problems?.[0].code));
assert.equal(stale.problems[0].unitCents, 108998);
console.log("pass: an out of date saved price is refused and the live price returned");

const bedTooMany = await checkBasket(graphql, { lines: [bed({ quantity: 99 })] });
console.log(`bed at quantity 99: ${bedTooMany.ok ? "allowed" : bedTooMany.problems[0].code + " stock " + bedTooMany.problems[0].available}`);

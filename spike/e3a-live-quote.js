// E3a: read Natural Gold live from the dev store and compare it with the saved test data. Read-only.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { read } from "./lib.js";
import { loadConfigurableProduct } from "../app/pricing/load-product.server.js";
import { quoteConfiguration } from "../app/pricing/quote.server.js";

const fixture = (name) => JSON.parse(readFileSync(new URL(`../test/fixtures/${name}`, import.meta.url), "utf8"));
const saved = fixture("natural-gold.json");
const checks = fixture("natural-gold-price-checks.json");

const graphql = async (query, { variables }) => ({ json: async () => ({ data: read(query, variables) }) });
const live = await loadConfigurableProduct(graphql, saved.productId);
assert.ok(live, "product could not be fully loaded");

const stockless = (variants) => variants.map(({ id, sku, price }) => ({ id, sku, price }));
const byId = (options) => [...options].sort((a, b) => a.cfsId.localeCompare(b.cfsId));

assert.deepEqual(stockless(live.variants), stockless(saved.variants), "sizes, SKUs or prices differ");
assert.deepEqual(live.modelCards, saved.modelCards, "model cards differ");
assert.deepEqual(live.workflow, saved.workflow, "workflow differs");
assert.deepEqual(byId(live.options), byId(saved.options), "options differ");

const quote = quoteConfiguration(live, { variantId: live.variants[0].id, choiceIds: ["17020886", "17020903"] });
assert.equal(quote.ok, true);
assert.equal(quote.totalCents, 108998);

const variantFor = (modelId) => {
  const sku = Object.keys(live.modelCards).find((s) => live.modelCards[s].source_id === modelId);
  return live.variants.find((v) => v.sku === sku).id;
};
const choiceFor = (id) => live.options.find((o) => o.mappings.assignments.some((a) => a.id === id)).cfsId;

let passed = 0;
for (const check of checks) {
  const result = quoteConfiguration(live, {
    variantId: variantFor(check.model_id),
    choiceIds: check.option_ids.map(choiceFor),
  });
  assert.equal(result.totalCents, check.raw_cents, check.name);
  passed += 1;
}

console.log(JSON.stringify({
  sizes: live.variants.length,
  options: live.options.length,
  stock: live.variants.map((v) => v.inventoryQuantity),
  matchesSavedData: true,
  twoDrawersPence: quote.totalCents,
  livePriceChecksPassed: passed,
}));

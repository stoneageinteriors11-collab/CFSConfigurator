// Moreno, Paris and Mayfair priced from their saved Shopify data, compared with the live CFS
// calculator on 7 November 2026 (pdp-live-cfs-price-checks.json), before CFS's own sale.
// Each case is the cheapest ("standard") or dearest ("premium") choice in every group for that size.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { quoteConfiguration, resolveAssignment } from "../../app/pricing/quote.server.js";
import { checkProduct } from "../../app/pricing/product-check.server.js";

const load = (name) => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), "utf8"));

const LIVE_CFS = {
  moreno: {
    standard: { 12883042: 306999, 12883043: 317999, 12883044: 334999 },
    premium: { 12883042: 306999, 12883044: 334999 },
  },
  paris: {
    standard: { 12580402: 246999, 12580403: 278999, 12580404: 295999, 12580405: 323999, 12580406: 362999 },
    premium: { 12580402: 708998, 12580406: 1020998 },
  },
  mayfair: {
    standard: { 12947529: 230999, 12947530: 291999, 12947531: 307999, 15280390: 316999 },
    premium: { 12947529: 496998, 15280390: 677998 },
  },
};

function priceFor(product, modelId, dearest) {
  const choiceIds = product.workflow.groups.map((group) => {
    const priced = product.options
      .filter((o) => o.groupName === group.name)
      .map((o) => ({ id: o.cfsId, assignment: resolveAssignment(o, modelId) }))
      .filter(({ assignment }) => typeof assignment === "object");
    return priced.reduce((best, c) =>
      (dearest ? c.assignment.cents > best.assignment.cents : c.assignment.cents < best.assignment.cents) ? c : best,
    ).id;
  });
  const variant = product.variants.find((v) => product.modelCards[v.sku].source_id === modelId);
  return quoteConfiguration(product, { variantId: variant.id, choiceIds });
}

for (const [name, cases] of Object.entries(LIVE_CFS)) {
  test(`${name} matches every live CFS price`, () => {
    const product = load(name);
    for (const [kind, expected] of Object.entries(cases)) {
      for (const [modelId, cents] of Object.entries(expected)) {
        const result = priceFor(product, modelId, kind === "premium");
        assert.equal(result.ok, true, `${kind} ${modelId}`);
        assert.equal(result.totalCents, cents, `${kind} ${modelId}`);
      }
    }
  });

  test(`${name} is ready in the product check`, () => {
    assert.deepEqual(checkProduct(load(name)).problems, []);
  });
}

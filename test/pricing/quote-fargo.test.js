// Fargo Oak Type A table (CFS 1253441, type normalDropDown): five required groups, chosen in
// any order, whose choices cost the same on every size.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { quoteConfiguration } from "../../app/pricing/quote.server.js";
import { checkProduct } from "../../app/pricing/product-check.server.js";

const fargo = JSON.parse(readFileSync(new URL("../fixtures/fargo.json", import.meta.url), "utf8"));
const cents = (amount) => Math.round(Number(amount) * 100);
const priceOf = (option) => cents(option.mappings.assignments[0].raw_price);
const groups = fargo.workflow.groups.map((g) => g.name);
const inGroup = (name) => fargo.options.filter((o) => o.groupName === name);
const variantOf = (modelId) => fargo.variants.find((v) => fargo.modelCards[v.sku].source_id === modelId);
const choice = (label) => fargo.options.find((o) => o.label === label).cfsId;
const quote = (modelId, choiceIds) => quoteConfiguration(fargo, { variantId: variantOf(modelId).id, choiceIds });

// Live CFS calculator, 7 November 2026 (pdp-live-cfs-price-checks.json): the "was" price before
// CFS's 15% sale, for the cheapest and the dearest choice in every group.
const LIVE_CFS = {
  standard: {
    17229814: 187998, 17229815: 206998, 17229816: 224998, 17229817: 242998, 17229818: 269998,
    17229819: 293998, 17229820: 323998, 17229821: 315998, 17229822: 348998, 17229823: 382998,
    17229824: 447998, 17229825: 355998, 17229826: 390998, 17229827: 428998, 17229828: 477998,
  },
  premium: { 17229814: 361996, 17229828: 651996 },
};

const pick = (dearest) =>
  groups.map((name) =>
    inGroup(name).reduce((best, o) => ((dearest ? priceOf(o) > priceOf(best) : priceOf(o) < priceOf(best)) ? o : best)).cfsId,
  );

test("every size matches the live CFS price with the cheapest choices", () => {
  for (const [modelId, expected] of Object.entries(LIVE_CFS.standard)) {
    const result = quote(modelId, pick(false));
    assert.equal(result.ok, true, `size ${modelId}`);
    assert.equal(result.totalCents, expected, `size ${modelId}`);
  }
});

test("the smallest and largest sizes match the live CFS price with the dearest choices", () => {
  for (const [modelId, expected] of Object.entries(LIVE_CFS.premium)) {
    assert.equal(quote(modelId, pick(true)).totalCents, expected, `size ${modelId}`);
  }
});

test("several paid choices together: £2,579.96 before discounts", () => {
  const result = quote("17229814", [
    choice("Industrial Steel Lacquered"),
    choice("Crystal"),
    choice("Lacquered Oak"),
    choice("F01 Natural Edge"),
    choice("Standard"),
  ]);
  assert.equal(result.ok, true);
  assert.equal(result.baseCents, 145999);
  assert.equal(result.totalCents, 257996);
  assert.deepEqual(result.lines.map((l) => l.group), groups, "lines follow the product's group order");
});

test("choices can be given in any order", () => {
  const ids = pick(true);
  assert.equal(quote("17229820", [...ids].reverse()).totalCents, quote("17229820", ids).totalCents);
});

test("every one of the 32 choices prices on every size", () => {
  let checked = 0;
  for (const variant of fargo.variants) {
    const modelId = fargo.modelCards[variant.sku].source_id;
    const cheapest = pick(false);
    const cheapestTotal = quote(modelId, cheapest).totalCents;
    for (const option of fargo.options) {
      const index = groups.indexOf(option.groupName);
      const ids = cheapest.map((id, i) => (i === index ? option.cfsId : id));
      const replaced = fargo.options.find((o) => o.cfsId === cheapest[index]);
      assert.equal(quote(modelId, ids).totalCents, cheapestTotal - priceOf(replaced) + priceOf(option), option.label);
      checked += 1;
    }
  }
  assert.equal(checked, 15 * 32);
});

test("all five groups are required, and one choice per group", () => {
  const [edge, ...rest] = pick(false);
  const missing = quote("17229814", rest);
  assert.deepEqual(missing.errors, [{ code: "missing_required", group: "Select Edge" }]);

  const twoEdges = quote("17229814", [edge, choice("F02 Straight Edge"), ...rest]);
  assert.deepEqual(twoEdges.errors, [{ code: "too_many_in_group", group: "Select Edge" }]);
});

test("the product check reports Fargo as ready from £1,879.98", () => {
  const result = checkProduct(fargo);
  assert.deepEqual(result.problems, []);
  assert.equal(result.ready, true);
  assert.equal(result.fromCents, 187998);
});

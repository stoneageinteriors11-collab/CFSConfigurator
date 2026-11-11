// Zenaya and Loft priced from their saved Shopify data, compared with the live CFS calculator on
// 7 November 2026 (pdp-live-cfs-price-checks.json), before CFS's own sale. Both have accessories
// that a shopper can add several of, each priced per item for the chosen size.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { quoteConfiguration, unsupportedReason } from "../../app/pricing/quote.server.js";
import { checkProduct } from "../../app/pricing/product-check.server.js";

const load = (name) => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), "utf8"));
const codes = (result) => result.errors.map((e) => e.code);

const ZENAYA_WHITE = "15514565"; // A150B : Alpine White Carcase with High Polish White Front
const ZENAYA_LIGHTING = "274585"; // 9L43 : Lucido Chrome Colour Lighting - LED (Set of 3), £609.99
const LOFT_WHITE = "17244961"; // White with Chrome Angled Feet and Trims 310
const LOFT_FOOTBOARD = "217067"; // 102 : Lighting for Footboard, £209.99
const LOFT_CURVED = "217093"; // 100 : LED Curved Light in Chrome Effect (Pair), £139.99

const variantFor = (product, modelId) =>
  product.variants.find((v) => product.modelCards[v.sku].source_id === modelId).id;
const quote = (name, modelId, choiceIds, quantities) => {
  const product = load(name);
  return quoteConfiguration(product, { variantId: variantFor(product, modelId), choiceIds, quantities });
};

// Size plus the one colour CFS checked, with no accessories.
const LIVE_CFS_PLAIN = {
  zenaya: {
    colour: ZENAYA_WHITE,
    totals: {
      4748476: 55999, 4748478: 55999, 4748481: 96999, 4748482: 96999, 4748485: 132999,
      4748486: 132999, 4748489: 168999, 4748490: 168999, 15514214: 123999,
    },
  },
  loft: {
    colour: LOFT_WHITE,
    totals: { 1840531: 96999, 1840532: 96999, 1840533: 96999, 1840534: 104999, 1840535: 104999, 1840536: 104999 },
  },
};

// The same with 2 of one lighting accessory.
const LIVE_CFS_ACCESSORIES = [
  ["zenaya", "4748476", ZENAYA_WHITE, ZENAYA_LIGHTING, 177997],
  ["zenaya", "15514214", ZENAYA_WHITE, ZENAYA_LIGHTING, 245997],
  ["loft", "1840531", LOFT_WHITE, LOFT_FOOTBOARD, 138997],
  ["loft", "1840536", LOFT_WHITE, LOFT_FOOTBOARD, 146997],
];

test("Zenaya and Loft match every live CFS price without accessories", () => {
  for (const [name, { colour, totals }] of Object.entries(LIVE_CFS_PLAIN)) {
    for (const [modelId, cents] of Object.entries(totals)) {
      assert.equal(quote(name, modelId, [colour]).totalCents, cents, `${name} ${modelId}`);
    }
  }
});

test("Zenaya and Loft match every live CFS price with 2 of a lighting accessory", () => {
  for (const [name, modelId, colour, accessory, cents] of LIVE_CFS_ACCESSORIES) {
    const result = quote(name, modelId, [colour, accessory], { [accessory]: 2 });
    assert.equal(result.ok, true, `${name} ${modelId}`);
    assert.equal(result.totalCents, cents, `${name} ${modelId}`);
  }
});

test("each accessory line shows its quantity, price each and line price", () => {
  const result = quote("loft", "1840531", [LOFT_CURVED, LOFT_WHITE, LOFT_FOOTBOARD], { [LOFT_FOOTBOARD]: 2 });
  assert.deepEqual(
    result.lines.map(({ choiceId, quantity, unitCents, cents }) => [choiceId, quantity, unitCents, cents]),
    [
      [LOFT_WHITE, 1, 0, 0],
      [LOFT_FOOTBOARD, 2, 20999, 41998],
      [LOFT_CURVED, 1, 13999, 13999],
    ],
  );
  assert.equal(result.totalCents, 96999 + 41998 + 13999);
});

test("accessory quantities must be whole numbers from 1 to the product's limit", () => {
  for (const bad of [0, 6, 1.5, -1, "2", null]) {
    const result = quote("loft", "1840531", [LOFT_WHITE, LOFT_FOOTBOARD], { [LOFT_FOOTBOARD]: bad });
    assert.deepEqual(codes(result), ["invalid_quantity"], String(bad));
  }
  assert.equal(quote("loft", "1840531", [LOFT_WHITE, LOFT_FOOTBOARD], { [LOFT_FOOTBOARD]: 5 }).totalCents, 96999 + 5 * 20999);
});

test("an option cannot be bought more than once, and a quantity must belong to a picked choice", () => {
  assert.deepEqual(codes(quote("loft", "1840531", [LOFT_WHITE], { [LOFT_WHITE]: 2 })), ["invalid_quantity", "missing_required"]);
  assert.deepEqual(codes(quote("loft", "1840531", [LOFT_WHITE], { [LOFT_FOOTBOARD]: 2 })), ["invalid_quantity"]);
  assert.deepEqual(codes(quote("loft", "1840531", [LOFT_WHITE, "17244967"])), ["too_many_in_group"]);
});

test("accessories still need the colour first", () => {
  assert.deepEqual(quote("loft", "1840531", [LOFT_FOOTBOARD]).errors, [
    { code: "missing_required", group: "Select Color" },
    { code: "prerequisite_missing", group: "Select Lightings", requires: "Select Color" },
  ]);
});

test("a product with accessories needs a clear most-per-item quantity, and groups cannot mix kinds", () => {
  for (const limit of [undefined, 0, 100, 2.5, "5"]) {
    const product = load("loft");
    product.workflow.pricing.accessory_max_quantity = limit;
    assert.match(unsupportedReason(product), /accessory_max_quantity/, String(limit));
  }
  const mixed = load("loft");
  mixed.options.find((o) => o.cfsId === LOFT_FOOTBOARD).groupName = "Select Color";
  assert.match(unsupportedReason(mixed), /"Select Color" mixes options and accessories/);
});

test("Zenaya and Loft are ready in the product check", () => {
  for (const name of ["zenaya", "loft"]) assert.deepEqual(checkProduct(load(name)).problems, [], name);
});

// Accessory quantities carried from the price request through the basket, the checkout re-check,
// the Shopify checkout notes and the order record, using the saved Loft data.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { configurationKey } from "../../app/basket/basket.server.js";
import { publicBasket } from "../../app/basket/basket-request.server.js";
import { checkBasket } from "../../app/checkout/check-basket.server.js";
import { lineAttributes } from "../../app/checkout/start-checkout.server.js";
import { handleQuoteRequest } from "../../app/pricing/quote-request.server.js";
import { selectionRequest } from "../../app/pricing/quote.server.js";

const loft = JSON.parse(readFileSync(new URL("../fixtures/loft.json", import.meta.url), "utf8"));
const page = (nodes) => ({ pageInfo: { hasNextPage: false }, nodes });

const PRODUCT = loft.productId.split("/").pop();
const VARIANT = loft.variants.find((v) => loft.modelCards[v.sku].source_id === "1840531").id;
const WHITE = "17244961";
const FOOTBOARD = "217067"; // £209.99 each
const CURVED = "217093"; // £139.99 each

const shopifyLoft = {
  id: loft.productId,
  title: loft.title,
  handle: loft.handle,
  featuredMedia: null,
  variants: page(loft.variants),
  modelCards: { value: JSON.stringify(loft.modelCards) },
  workflow: { value: JSON.stringify(loft.workflow) },
  options: {
    references: page(
      loft.options.map((o) => ({
        cfsId: { value: o.cfsId },
        label: { value: o.label },
        groupName: { value: o.groupName },
        mappings: { value: JSON.stringify(o.mappings) },
      })),
    ),
  },
};
const graphql = async () => ({ json: async () => ({ data: { product: shopifyLoft } }) });
const neverCalled = async () => assert.fail("Shopify should not be called");

const ask = (query, client = graphql) =>
  handleQuoteRequest(client, new URLSearchParams(`product=${PRODUCT}&variant=${VARIANT.split("/").pop()}&${query}`));

test("the price request takes accessory quantities and matches the live CFS price", async () => {
  const { status, body } = await ask(`choice=${WHITE}&choice=${FOOTBOARD}&quantity=${FOOTBOARD}:2`);
  assert.equal(status, 200);
  assert.equal(body.totalCents, 138997);
  assert.deepEqual(body.lines[1], {
    choiceId: FOOTBOARD,
    group: "Select Lightings",
    label: "102 : Lighting for Footboard",
    quantity: 2,
    unitCents: 20999,
    cents: 41998,
  });
});

test("malformed or stray quantities are refused without asking Shopify", async () => {
  for (const query of [
    `choice=${WHITE}&choice=${FOOTBOARD}&quantity=${FOOTBOARD}:x`,
    `choice=${WHITE}&choice=${FOOTBOARD}&quantity=${FOOTBOARD}`,
    `choice=${WHITE}&choice=${FOOTBOARD}&quantity=${FOOTBOARD}:2&quantity=${FOOTBOARD}:3`,
    `choice=${WHITE}&quantity=${FOOTBOARD}:2`,
    `choice=${WHITE}&choice=${FOOTBOARD}&quantity=${FOOTBOARD}:1000`,
  ]) {
    const { status } = await ask(query, neverCalled);
    assert.equal(status, 400, query);
  }
});

test("a quantity over the product's limit is refused by the pricing rules", async () => {
  const { status, body } = await ask(`choice=${WHITE}&choice=${FOOTBOARD}&quantity=${FOOTBOARD}:6`);
  assert.equal(status, 422);
  assert.deepEqual(body.errors, [{ code: "invalid_quantity", choiceId: FOOTBOARD }]);
});

test("the basket keeps different accessory quantities apart and old keys unchanged", () => {
  const quote = (lines) => ({ variantId: "v1", lines });
  const once = configurationKey(quote([{ choiceId: "a" }, { choiceId: "b", quantity: 1 }]));
  assert.equal(once, "v1:a,b");
  assert.notEqual(once, configurationKey(quote([{ choiceId: "a" }, { choiceId: "b", quantity: 2 }])));
});

test("a saved line is priced again with its quantities, including lines saved before quantities", () => {
  assert.deepEqual(selectionRequest([{ choiceId: WHITE, quantity: 1 }, { choiceId: FOOTBOARD, quantity: 2 }]), {
    choiceIds: [WHITE, FOOTBOARD],
    quantities: { [WHITE]: 1, [FOOTBOARD]: 2 },
  });
  assert.deepEqual(selectionRequest([{ choiceId: WHITE }]), { choiceIds: [WHITE], quantities: {} });
});

test("the checkout re-check passes a saved line with 2 accessories at the price the shopper saw", async () => {
  const { body } = await ask(`choice=${WHITE}&choice=${FOOTBOARD}&choice=${CURVED}&quantity=${FOOTBOARD}:2`);
  const line = {
    id: "line-1",
    productId: PRODUCT,
    variantId: VARIANT,
    quantity: 1,
    baseCents: body.baseCents,
    unitCents: body.totalCents,
    selection: body.lines,
  };
  const checked = await checkBasket(graphql, { lines: [line] });
  assert.equal(checked.ok, true);
  assert.equal(checked.totalCents, 96999 + 41998 + 13999);

  const changed = await checkBasket(graphql, { lines: [{ ...line, selection: body.lines.map((l) => ({ ...l, quantity: 1 })) }] });
  assert.equal(changed.problems[0].code, "price_changed");
});

test("accessories from one group share one checkout note, showing their quantities", () => {
  assert.deepEqual(
    lineAttributes([
      { group: "Select Color", label: "White" },
      { group: "Select Lightings", label: "102 : Lighting for Footboard", quantity: 2 },
      { group: "Select Lightings", label: "100 : LED Curved Light", quantity: 1 },
    ]),
    [
      { key: "Color", value: "White" },
      { key: "Lightings", value: "2 × 102 : Lighting for Footboard; 100 : LED Curved Light" },
    ],
  );
});

test("the shopper's basket shows each choice's quantity, 1 for lines saved before quantities", () => {
  const basket = publicBasket({
    version: 1,
    lines: [{
      id: "l1", productId: "1", variantId: "gid://shopify/ProductVariant/2", quantity: 1, baseCents: 1, unitCents: 3,
      selection: [{ choiceId: "a", group: "G", label: "A", cents: 0 }, { choiceId: "b", group: "H", label: "B", quantity: 2, cents: 2 }],
    }],
  });
  assert.deepEqual(basket.lines[0].selection.map((s) => s.quantity), [1, 2]);
});

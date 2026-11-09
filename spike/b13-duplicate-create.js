// B13: send the same draft twice with one idempotency key. Creates two drafts at most, no payment.
import { randomUUID } from "node:crypto";
import { NATURAL_GOLD_VARIANT, SPIKE_TAG, loadResults, read, saveResult, write } from "./lib.js";

if (loadResults().B13?.ids) throw new Error("B13 already ran. Refusing to create more drafts.");

const key = randomUUID();
const input = {
  tags: [SPIKE_TAG, "spike-B13"],
  note: "CFS spike B13: duplicate create test. Not a real order.",
  acceptAutomaticDiscounts: false,
  allowDiscountCodesInCheckout: false,
  lineItems: [
    {
      variantId: NATURAL_GOLD_VARIANT,
      quantity: 1,
      priceOverride: { amount: "1089.98", currencyCode: "GBP" },
      customAttributes: [{ key: "CFS test attempt", value: key }],
    },
  ],
};

const selection = "{ draftOrder { id name status invoiceUrl } userErrors { field message } }";
const withKey = `mutation($input: DraftOrderInput!, $key: String!) {
  draftOrderCreate(input: $input) @idempotent(key: $key) ${selection} }`;
const withoutKey = `mutation($input: DraftOrderInput!) { draftOrderCreate(input: $input) ${selection} }`;

function attempt(query, variables) {
  try {
    const r = write(query, variables).draftOrderCreate;
    return { draft: r.draftOrder, userErrors: r.userErrors };
  } catch (e) {
    return { error: `${e.stderr ?? ""}${e.stdout ?? ""}`.trim() || e.message };
  }
}

const keyed = [attempt(withKey, { input, key })];
if (!keyed[0].error) keyed.push(attempt(withKey, { input, key }));

const plain = keyed[0].error ? [attempt(withoutKey, { input }), attempt(withoutKey, { input })] : [];
const drafts = [...keyed, ...plain].filter((a) => a.draft).map((a) => a.draft);

const { draftOrders } = read(
  `query { draftOrders(first: 10, reverse: true, sortKey: ID, query: "tag:spike-B13") { nodes { id name status } } }`,
);

const result = { key, keyed, plain, onStore: draftOrders.nodes };
saveResult("B13", {
  status: "Duplicate create measured",
  inputs: input,
  actual: result,
  ids: { drafts: [...new Set(drafts.map((d) => d.id))] },
});
console.log(JSON.stringify(result, null, 2));

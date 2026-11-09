// B1: one draft order with a price override and no discounts.
import { DRAFT_FIELDS, NATURAL_GOLD_VARIANT, SPIKE_TAG, loadResults, saveResult, variantPrice, write } from "./lib.js";

if (loadResults().B1?.ids?.draftOrder) {
  throw new Error("B1 already created a draft. Refusing to create another.");
}

const before = variantPrice(NATURAL_GOLD_VARIANT);

const input = {
  tags: [SPIKE_TAG, "spike-B1"],
  note: "CFS spike B1: price override test. Not a real order.",
  acceptAutomaticDiscounts: false,
  allowDiscountCodesInCheckout: false,
  lineItems: [
    {
      variantId: NATURAL_GOLD_VARIANT,
      quantity: 1,
      priceOverride: { amount: "1089.98", currencyCode: "GBP" },
      customAttributes: [
        { key: "CFS drawer assignment", value: "17020886" },
        { key: "CFS drawer charge", value: "89.99" },
      ],
    },
  ],
};

const { draftOrderCreate } = write(
  `mutation($input: DraftOrderInput!) { draftOrderCreate(input: $input) {
    draftOrder { ${DRAFT_FIELDS} } userErrors { field message } } }`,
  { input },
);

if (draftOrderCreate.userErrors.length) {
  console.log(JSON.stringify(draftOrderCreate.userErrors, null, 2));
  process.exit(1);
}

const draft = draftOrderCreate.draftOrder;
const after = variantPrice(NATURAL_GOLD_VARIANT);

saveResult("B1", {
  status: "Pending checkout check",
  inputs: input,
  expected: { checkoutMerchandise: "1089.98", catalogueAfter: before.price },
  actual: { draft, catalogueBefore: before, catalogueAfter: after },
  ids: { draftOrder: draft.id, name: draft.name, invoiceUrl: draft.invoiceUrl },
});

console.log(JSON.stringify({ draft, before, after }, null, 2));

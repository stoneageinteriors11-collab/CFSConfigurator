// B4a: one draft where a non-combinable automatic discount and a non-combinable code are both available.
// Reuses the discounts created by B2 and B3.
import { DRAFT_FIELDS, NATURAL_GOLD_VARIANT, SPIKE_TAG, loadResults, saveResult, variantPrice, write } from "./lib.js";

if (loadResults().B4a?.ids?.draftOrder) {
  throw new Error("B4a already created a draft. Refusing to create another.");
}

const before = variantPrice(NATURAL_GOLD_VARIANT);

const input = {
  tags: [SPIKE_TAG, "spike-B4a"],
  note: "CFS spike B4a: non-combinable automatic discount and code. Not a real order.",
  acceptAutomaticDiscounts: true,
  allowDiscountCodesInCheckout: true,
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
    draftOrder { ${DRAFT_FIELDS} acceptAutomaticDiscounts allowDiscountCodesInCheckout
      platformDiscounts { title automaticDiscount code totalAmount { amount currencyCode } } }
    userErrors { field message } } }`,
  { input },
);

if (draftOrderCreate.userErrors.length) {
  console.log(JSON.stringify(draftOrderCreate.userErrors, null, 2));
  process.exit(1);
}

const draft = draftOrderCreate.draftOrder;
const after = variantPrice(NATURAL_GOLD_VARIANT);

saveResult("B4a", {
  status: "Pending checkout check",
  inputs: input,
  expected: { total: "980.99", stacked: false, failureIf: "total near 882" },
  actual: { draft, catalogueBefore: before, catalogueAfter: after },
  ids: { draftOrder: draft.id, name: draft.name, invoiceUrl: draft.invoiceUrl },
});

console.log(JSON.stringify({
  name: draft.name,
  invoiceUrl: draft.invoiceUrl,
  acceptAutomaticDiscounts: draft.acceptAutomaticDiscounts,
  allowDiscountCodesInCheckout: draft.allowDiscountCodesInCheckout,
  subtotal: draft.subtotalPriceSet.shopMoney.amount,
  discounts: draft.totalDiscountsSet.shopMoney.amount,
  total: draft.totalPriceSet.shopMoney.amount,
  platformDiscounts: draft.platformDiscounts,
  before,
  after,
}, null, 2));

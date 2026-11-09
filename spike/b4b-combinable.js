// B4b: allow the B2 automatic discount and B3 code to combine, then one draft with both available.
import { DRAFT_FIELDS, NATURAL_GOLD_VARIANT, SPIKE_TAG, loadResults, saveResult, variantPrice, write } from "./lib.js";

const results = loadResults();
if (results.B4b?.ids?.draftOrder) {
  throw new Error("B4b already created a draft. Refusing to create another.");
}

const combinesWith = { orderDiscounts: false, productDiscounts: true, shippingDiscounts: false };

const automaticId = results.B2.ids.discount;
const { discountAutomaticBasicUpdate: automatic } = write(
  `mutation($id: ID!, $input: DiscountAutomaticBasicInput!) {
    discountAutomaticBasicUpdate(id: $id, automaticBasicDiscount: $input) {
      automaticDiscountNode { id automaticDiscount { ... on DiscountAutomaticBasic {
        title status combinesWith { orderDiscounts productDiscounts shippingDiscounts } } } }
      userErrors { field message code } } }`,
  { id: automaticId, input: { combinesWith } },
);
if (automatic.userErrors.length) {
  console.log(JSON.stringify(automatic.userErrors, null, 2));
  process.exit(1);
}

const codeId = results.B3.ids.discount;
const { discountCodeBasicUpdate: code } = write(
  `mutation($id: ID!, $input: DiscountCodeBasicInput!) {
    discountCodeBasicUpdate(id: $id, basicCodeDiscount: $input) {
      codeDiscountNode { id codeDiscount { ... on DiscountCodeBasic {
        title status combinesWith { orderDiscounts productDiscounts shippingDiscounts } } } }
      userErrors { field message code } } }`,
  { id: codeId, input: { combinesWith } },
);
if (code.userErrors.length) {
  console.log(JSON.stringify(code.userErrors, null, 2));
  process.exit(1);
}

saveResult("B4b", {
  status: "Discounts updated",
  discounts: { automatic: automatic.automaticDiscountNode, code: code.codeDiscountNode },
});

const before = variantPrice(NATURAL_GOLD_VARIANT);

const input = {
  tags: [SPIKE_TAG, "spike-B4b"],
  note: "CFS spike B4b: combinable automatic discount and code. Not a real order.",
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

saveResult("B4b", {
  status: "Pending checkout check",
  inputs: input,
  expected: { note: "Follows Shopify combination settings; each applied discount shown. Total recorded, not assumed." },
  actual: { draft, catalogueBefore: before, catalogueAfter: after },
  ids: { automaticDiscount: automaticId, codeDiscount: codeId, draftOrder: draft.id, name: draft.name, invoiceUrl: draft.invoiceUrl },
});

console.log(JSON.stringify({
  automatic: automatic.automaticDiscountNode.automaticDiscount,
  code: code.codeDiscountNode.codeDiscount,
  name: draft.name,
  invoiceUrl: draft.invoiceUrl,
  subtotal: draft.subtotalPriceSet.shopMoney.amount,
  discounts: draft.totalDiscountsSet.shopMoney.amount,
  total: draft.totalPriceSet.shopMoney.amount,
  platformDiscounts: draft.platformDiscounts,
  before,
  after,
}, null, 2));

// B6: one draft with a configured line and an ordinary product at its normal price.
import { DRAFT_FIELDS, NATURAL_GOLD_VARIANT, SPIKE_TAG, loadResults, saveResult, variantPrice, write } from "./lib.js";

const ORDINARY_VARIANT = "gid://shopify/ProductVariant/55724611273043"; // Essential Open Coil Mattress, Single

if (loadResults().B6?.ids?.draftOrder) {
  throw new Error("B6 already created a draft. Refusing to create another.");
}

const before = { configured: variantPrice(NATURAL_GOLD_VARIANT), ordinary: variantPrice(ORDINARY_VARIANT) };

const input = {
  tags: [SPIKE_TAG, "spike-B6"],
  note: "CFS spike B6: mixed basket. Not a real order.",
  acceptAutomaticDiscounts: true,
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
    { variantId: ORDINARY_VARIANT, quantity: 1 },
  ],
};

const { draftOrderCreate } = write(
  `mutation($input: DraftOrderInput!) { draftOrderCreate(input: $input) {
    draftOrder { ${DRAFT_FIELDS} acceptAutomaticDiscounts
      platformDiscounts { title automaticDiscount code totalAmount { amount currencyCode } } }
    userErrors { field message } } }`,
  { input },
);

if (draftOrderCreate.userErrors.length) {
  console.log(JSON.stringify(draftOrderCreate.userErrors, null, 2));
  process.exit(1);
}

const draft = draftOrderCreate.draftOrder;
const after = { configured: variantPrice(NATURAL_GOLD_VARIANT), ordinary: variantPrice(ORDINARY_VARIANT) };

saveResult("B6", {
  status: "Pending checkout check",
  inputs: input,
  expected: { configuredLine: "980.99", ordinaryLine: "149.00", total: "1129.99" },
  actual: { draft, cataloguesBefore: before, cataloguesAfter: after },
  ids: { draftOrder: draft.id, name: draft.name, invoiceUrl: draft.invoiceUrl },
});

console.log(JSON.stringify({
  name: draft.name,
  invoiceUrl: draft.invoiceUrl,
  subtotal: draft.subtotalPriceSet.shopMoney.amount,
  discounts: draft.totalDiscountsSet.shopMoney.amount,
  total: draft.totalPriceSet.shopMoney.amount,
  platformDiscounts: draft.platformDiscounts,
  lines: draft.lineItems.nodes.map((l) => ({
    sku: l.sku,
    original: l.originalUnitPriceSet.shopMoney.amount,
    discounted: l.discountedTotalSet.shopMoney.amount,
  })),
  before,
  after,
}, null, 2));

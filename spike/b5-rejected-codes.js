// B5: one already-expired code, then one draft for testing that bad codes are refused.
import { DRAFT_FIELDS, NATURAL_GOLD_VARIANT, SPIKE_TAG, loadResults, saveResult, variantPrice, write } from "./lib.js";

const NATURAL_GOLD_PRODUCT = "gid://shopify/Product/11067852980563";
const EXPIRED_CODE = "CFSSPIKEOLD";

const previous = loadResults().B5;
if (previous?.ids?.draftOrder) {
  throw new Error("B5 already created a draft. Refusing to create another.");
}

let discountId = previous?.ids?.discount;
let discountStatus = previous?.discountStatus;

if (!discountId) {
  const now = Date.now();
  const basicCodeDiscount = {
    title: "CFS SPIKE B5 - expired code",
    code: EXPIRED_CODE,
    tags: [SPIKE_TAG, "spike-B5"],
    startsAt: new Date(now - 48 * 60 * 60 * 1000).toISOString(),
    endsAt: new Date(now - 60 * 60 * 1000).toISOString(),
    context: { all: "ALL" },
    combinesWith: { orderDiscounts: false, productDiscounts: false, shippingDiscounts: false },
    customerGets: {
      value: { percentage: 0.1 },
      items: { products: { productsToAdd: [NATURAL_GOLD_PRODUCT] } },
    },
  };

  const { discountCodeBasicCreate: created } = write(
    `mutation($basicCodeDiscount: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
        codeDiscountNode { id codeDiscount { ... on DiscountCodeBasic { title status startsAt endsAt } } }
        userErrors { field message code } } }`,
    { basicCodeDiscount },
  );

  if (created.userErrors.length) {
    console.log(JSON.stringify(created.userErrors, null, 2));
    process.exit(1);
  }

  discountId = created.codeDiscountNode.id;
  discountStatus = created.codeDiscountNode.codeDiscount.status;
  saveResult("B5", {
    status: "Expired code created",
    discountStatus,
    discount: created.codeDiscountNode,
    ids: { discount: discountId, code: EXPIRED_CODE },
  });
}

const before = variantPrice(NATURAL_GOLD_VARIANT);

const input = {
  tags: [SPIKE_TAG, "spike-B5"],
  note: "CFS spike B5: invalid and expired codes. Not a real order.",
  acceptAutomaticDiscounts: false,
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
    draftOrder { ${DRAFT_FIELDS} acceptAutomaticDiscounts allowDiscountCodesInCheckout }
    userErrors { field message } } }`,
  { input },
);

if (draftOrderCreate.userErrors.length) {
  console.log(JSON.stringify(draftOrderCreate.userErrors, null, 2));
  process.exit(1);
}

const draft = draftOrderCreate.draftOrder;
const after = variantPrice(NATURAL_GOLD_VARIANT);

saveResult("B5", {
  status: "Pending checkout check",
  inputs: input,
  expected: { invalidCodeRefused: true, expiredCodeRefused: true, total: "1089.98" },
  actual: { draft, catalogueBefore: before, catalogueAfter: after },
  ids: { discount: discountId, code: EXPIRED_CODE, draftOrder: draft.id, name: draft.name, invoiceUrl: draft.invoiceUrl },
});

console.log(JSON.stringify({
  expiredCodeStatus: discountStatus,
  name: draft.name,
  invoiceUrl: draft.invoiceUrl,
  acceptAutomaticDiscounts: draft.acceptAutomaticDiscounts,
  allowDiscountCodesInCheckout: draft.allowDiscountCodesInCheckout,
  subtotal: draft.subtotalPriceSet.shopMoney.amount,
  discounts: draft.totalDiscountsSet.shopMoney.amount,
  total: draft.totalPriceSet.shopMoney.amount,
  before,
  after,
}, null, 2));

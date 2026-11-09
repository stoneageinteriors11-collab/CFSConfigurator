// B10b: one 10% code on the unpublished Alice pilot, then one draft where the shopper can enter it.
import { DRAFT_FIELDS, SPIKE_TAG, loadResults, saveResult, variantPrice, write } from "./lib.js";

const ALICE_PRODUCT = "gid://shopify/Product/11063523639635";
const ALICE_VARIANT = "gid://shopify/ProductVariant/55752708358483";
const CODE = "CFSSPIKEALICE";

const previous = loadResults().B10b;
if (previous?.ids?.draftOrder) {
  throw new Error("B10b already created a draft. Refusing to create another.");
}

let discountId = previous?.ids?.discount;

if (!discountId) {
  const now = Date.now();
  const basicCodeDiscount = {
    title: "CFS SPIKE B10 - 10% code unpublished",
    code: CODE,
    tags: [SPIKE_TAG, "spike-B10b"],
    startsAt: new Date(now).toISOString(),
    endsAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
    context: { all: "ALL" },
    combinesWith: { orderDiscounts: false, productDiscounts: false, shippingDiscounts: false },
    customerGets: {
      value: { percentage: 0.1 },
      items: { products: { productsToAdd: [ALICE_PRODUCT] } },
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
  saveResult("B10b", {
    status: "Discount created",
    discount: created.codeDiscountNode,
    ids: { discount: discountId, code: CODE },
  });
}

const before = variantPrice(ALICE_VARIANT);

const input = {
  tags: [SPIKE_TAG, "spike-B10b"],
  note: "CFS spike B10b: shopper-entered code on an unpublished product. Not a real order.",
  acceptAutomaticDiscounts: false,
  allowDiscountCodesInCheckout: true,
  lineItems: [
    {
      variantId: ALICE_VARIANT,
      quantity: 1,
      priceOverride: { amount: "672.28", currencyCode: "GBP" },
      customAttributes: [{ key: "CFS test option", value: "Band C : Kenzo Chocolate, 32.39" }],
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
const after = variantPrice(ALICE_VARIANT);

saveResult("B10b", {
  status: "Pending checkout check",
  inputs: input,
  expected: { beforeCode: "672.28", afterCode: "605.06", catalogueAfter: before.price },
  actual: { draft, catalogueBefore: before, catalogueAfter: after },
  ids: { discount: discountId, code: CODE, draftOrder: draft.id, name: draft.name, invoiceUrl: draft.invoiceUrl },
});

console.log(JSON.stringify({
  discountId,
  code: CODE,
  name: draft.name,
  invoiceUrl: draft.invoiceUrl,
  subtotal: draft.subtotalPriceSet.shopMoney.amount,
  discounts: draft.totalDiscountsSet.shopMoney.amount,
  total: draft.totalPriceSet.shopMoney.amount,
  before,
  after,
}, null, 2));

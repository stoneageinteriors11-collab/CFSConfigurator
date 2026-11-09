// B10a: one 10% automatic discount on the unpublished Alice pilot, then one draft that accepts it.
import { DRAFT_FIELDS, SPIKE_TAG, loadResults, saveResult, variantPrice, write } from "./lib.js";

const ALICE_PRODUCT = "gid://shopify/Product/11063523639635";
const ALICE_VARIANT = "gid://shopify/ProductVariant/55752708358483";

const previous = loadResults().B10a;
if (previous?.ids?.draftOrder) {
  throw new Error("B10a already created a draft. Refusing to create another.");
}

let discountId = previous?.ids?.discount;

if (!discountId) {
  const now = Date.now();
  const automaticBasicDiscount = {
    title: "CFS SPIKE B10 - 10% automatic unpublished",
    tags: [SPIKE_TAG, "spike-B10a"],
    startsAt: new Date(now).toISOString(),
    endsAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
    context: { all: "ALL" },
    combinesWith: { orderDiscounts: false, productDiscounts: false, shippingDiscounts: false },
    customerGets: {
      value: { percentage: 0.1 },
      items: { products: { productsToAdd: [ALICE_PRODUCT] } },
    },
  };

  const { discountAutomaticBasicCreate: created } = write(
    `mutation($automaticBasicDiscount: DiscountAutomaticBasicInput!) {
      discountAutomaticBasicCreate(automaticBasicDiscount: $automaticBasicDiscount) {
        automaticDiscountNode { id automaticDiscount { ... on DiscountAutomaticBasic { title status startsAt endsAt } } }
        userErrors { field message code } } }`,
    { automaticBasicDiscount },
  );

  if (created.userErrors.length) {
    console.log(JSON.stringify(created.userErrors, null, 2));
    process.exit(1);
  }

  discountId = created.automaticDiscountNode.id;
  saveResult("B10a", {
    status: "Discount created",
    discount: created.automaticDiscountNode,
    ids: { discount: discountId },
  });
}

const before = variantPrice(ALICE_VARIANT);

const input = {
  tags: [SPIKE_TAG, "spike-B10a"],
  note: "CFS spike B10a: automatic discount on an unpublished product. Not a real order.",
  acceptAutomaticDiscounts: true,
  allowDiscountCodesInCheckout: false,
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
const after = variantPrice(ALICE_VARIANT);

saveResult("B10a", {
  status: "Pending checkout check",
  inputs: input,
  expected: { checkoutTotal: "about 605.06", discountedOnce: true, catalogueAfter: before.price },
  actual: { draft, catalogueBefore: before, catalogueAfter: after },
  ids: { discount: discountId, draftOrder: draft.id, name: draft.name, invoiceUrl: draft.invoiceUrl },
});

console.log(JSON.stringify({
  discountId,
  name: draft.name,
  invoiceUrl: draft.invoiceUrl,
  subtotal: draft.subtotalPriceSet.shopMoney.amount,
  discounts: draft.totalDiscountsSet.shopMoney.amount,
  total: draft.totalPriceSet.shopMoney.amount,
  platformDiscounts: draft.platformDiscounts,
  before,
  after,
}, null, 2));

// B2: one 10% automatic discount on Natural Gold only, then one draft that accepts it.
import { DRAFT_FIELDS, NATURAL_GOLD_VARIANT, SPIKE_TAG, loadResults, saveResult, variantPrice, write } from "./lib.js";

const NATURAL_GOLD_PRODUCT = "gid://shopify/Product/11067852980563";

const previous = loadResults().B2;
if (previous?.ids?.draftOrder) {
  throw new Error("B2 already created a draft. Refusing to create another.");
}

let discountId = previous?.ids?.discount;

if (!discountId) {
  const now = Date.now();
  const automaticBasicDiscount = {
    title: "CFS SPIKE B2 - 10% automatic",
    tags: [SPIKE_TAG, "spike-B2"],
    startsAt: new Date(now).toISOString(),
    endsAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
    context: { all: "ALL" },
    combinesWith: { orderDiscounts: false, productDiscounts: false, shippingDiscounts: false },
    customerGets: {
      value: { percentage: 0.1 },
      items: { products: { productsToAdd: [NATURAL_GOLD_PRODUCT] } },
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
  saveResult("B2", {
    status: "Discount created",
    discount: created.automaticDiscountNode,
    ids: { discount: discountId },
  });
}

const before = variantPrice(NATURAL_GOLD_VARIANT);

const input = {
  tags: [SPIKE_TAG, "spike-B2"],
  note: "CFS spike B2: automatic discount on an overridden price. Not a real order.",
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
const after = variantPrice(NATURAL_GOLD_VARIANT);

saveResult("B2", {
  status: "Pending checkout check",
  inputs: input,
  expected: { checkoutTotal: "about 980.98", discountedOnce: true, catalogueAfter: before.price },
  actual: { draft, catalogueBefore: before, catalogueAfter: after },
  ids: { discount: discountId, draftOrder: draft.id, name: draft.name, invoiceUrl: draft.invoiceUrl },
});

console.log(JSON.stringify({
  discountId,
  name: draft.name,
  invoiceUrl: draft.invoiceUrl,
  acceptAutomaticDiscounts: draft.acceptAutomaticDiscounts,
  subtotal: draft.subtotalPriceSet.shopMoney.amount,
  discounts: draft.totalDiscountsSet.shopMoney.amount,
  tax: draft.totalTaxSet.shopMoney.amount,
  total: draft.totalPriceSet.shopMoney.amount,
  platformDiscounts: draft.platformDiscounts,
  line: draft.lineItems.nodes[0],
  before,
  after,
}, null, 2));

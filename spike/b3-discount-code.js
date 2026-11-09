// B3: one 10% code on Natural Gold only, then one draft that lets the shopper enter it at checkout.
import { DRAFT_FIELDS, NATURAL_GOLD_VARIANT, SPIKE_TAG, loadResults, saveResult, variantPrice, write } from "./lib.js";

const NATURAL_GOLD_PRODUCT = "gid://shopify/Product/11067852980563";
const CODE = "CFSSPIKE10";

const previous = loadResults().B3;
if (previous?.ids?.draftOrder) {
  throw new Error("B3 already created a draft. Refusing to create another.");
}

let discountId = previous?.ids?.discount;

if (!discountId) {
  const now = Date.now();
  const basicCodeDiscount = {
    title: "CFS SPIKE B3 - 10% code",
    code: CODE,
    tags: [SPIKE_TAG, "spike-B3"],
    startsAt: new Date(now).toISOString(),
    endsAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
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
  saveResult("B3", {
    status: "Discount created",
    discount: created.codeDiscountNode,
    ids: { discount: discountId, code: CODE },
  });
}

const before = variantPrice(NATURAL_GOLD_VARIANT);

const input = {
  tags: [SPIKE_TAG, "spike-B3"],
  note: "CFS spike B3: shopper-entered code on an overridden price. Not a real order.",
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

saveResult("B3", {
  status: "Pending checkout check",
  inputs: input,
  expected: { beforeCode: "1089.98", afterCode: "980.99", codeBoxShown: true, catalogueAfter: before.price },
  actual: { draft, catalogueBefore: before, catalogueAfter: after },
  ids: { discount: discountId, code: CODE, draftOrder: draft.id, name: draft.name, invoiceUrl: draft.invoiceUrl },
});

console.log(JSON.stringify({
  discountId,
  code: CODE,
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

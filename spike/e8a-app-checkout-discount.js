// E8a: one 10% automatic discount on Natural Gold only, for a paid order through the app's own checkout.
// Ends by itself after 24 hours. Pass "off" to end it now: node spike/e8a-app-checkout-discount.js off
import { SPIKE_TAG, loadResults, saveResult, write } from "./lib.js";

const NATURAL_GOLD_PRODUCT = "gid://shopify/Product/11067852980563";
const previous = loadResults().E8a?.ids?.discount;

if (process.argv[2] === "off") {
  if (!previous) throw new Error("E8a has no discount.");
  const { discountAutomaticDeactivate: off } = write(
    `mutation($id: ID!) { discountAutomaticDeactivate(id: $id) {
      automaticDiscountNode { id automaticDiscount { ... on DiscountAutomaticBasic { title status endsAt } } }
      userErrors { field message code } } }`,
    { id: previous },
  );
  if (off.userErrors.length) throw new Error(JSON.stringify(off.userErrors));
  saveResult("E8a", { status: "Discount ended", discountAfter: off.automaticDiscountNode.automaticDiscount });
  console.log(JSON.stringify(off.automaticDiscountNode.automaticDiscount));
  process.exit(0);
}

if (previous) throw new Error("E8a already created a discount.");

const now = Date.now();
const automaticBasicDiscount = {
  title: "CFS SPIKE E8a - 10% automatic",
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
if (created.userErrors.length) throw new Error(JSON.stringify(created.userErrors));

saveResult("E8a", {
  status: "Discount created, paid order pending",
  tag: SPIKE_TAG,
  discount: created.automaticDiscountNode.automaticDiscount,
  ids: { discount: created.automaticDiscountNode.id },
});
console.log(JSON.stringify(created.automaticDiscountNode));

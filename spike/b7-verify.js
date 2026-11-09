// B7 evidence: read the paid order created from the B6 mixed-basket draft. Read-only.
import { NATURAL_GOLD_VARIANT, loadResults, read, variantPrice } from "./lib.js";

const ORDINARY_VARIANT = "gid://shopify/ProductVariant/55724611273043";
const { ids } = loadResults().B6;
const money = "shopMoney { amount currencyCode }";

const { draftOrder } = read(
  `query($id: ID!) { draftOrder(id: $id) { id name status order {
    id name test confirmationNumber displayFinancialStatus cancelledAt taxesIncluded sourceName tags
    subtotalPriceSet { ${money} } totalDiscountsSet { ${money} } totalShippingPriceSet { ${money} }
    totalTaxSet { ${money} } totalPriceSet { ${money} }
    discountApplications(first: 5) { nodes { __typename allocationMethod targetSelection targetType
      ... on AutomaticDiscountApplication { title }
      ... on DiscountCodeApplication { code }
      ... on ManualDiscountApplication { title } } }
    lineItems(first: 5) { nodes { title sku quantity variant { id }
      originalUnitPriceSet { ${money} } discountedTotalSet { ${money} } customAttributes { key value }
      discountAllocations { allocatedAmountSet { ${money} } } } }
    transactions(first: 5) { kind status gateway test amountSet { ${money} } }
  } } }`,
  { id: ids.draftOrder },
);

console.log(JSON.stringify({
  draftOrder,
  configured: variantPrice(NATURAL_GOLD_VARIANT),
  ordinary: variantPrice(ORDINARY_VARIANT),
}, null, 2));

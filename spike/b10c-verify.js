// B10c evidence: read the order from the B10b unpublished-product draft. Read-only.
import { loadResults, read, variantPrice } from "./lib.js";

const ALICE_VARIANT = "gid://shopify/ProductVariant/55752708358483";
const { ids } = loadResults().B10b;
const money = "shopMoney { amount currencyCode }";

const { draftOrder } = read(
  `query($id: ID!) { draftOrder(id: $id) { id name status order {
    id name test confirmationNumber displayFinancialStatus cancelledAt taxesIncluded sourceName tags
    subtotalPriceSet { ${money} } totalDiscountsSet { ${money} } totalShippingPriceSet { ${money} }
    totalTaxSet { ${money} } totalPriceSet { ${money} }
    discountApplications(first: 5) { nodes { __typename allocationMethod targetType
      ... on DiscountCodeApplication { code }
      ... on AutomaticDiscountApplication { title } } }
    lineItems(first: 5) { nodes { title quantity variant { id product { status publishedAt } }
      originalUnitPriceSet { ${money} } discountedTotalSet { ${money} } customAttributes { key value }
      discountAllocations { allocatedAmountSet { ${money} } } } }
    transactions(first: 5) { kind status gateway test amountSet { ${money} } }
  } } }`,
  { id: ids.draftOrder },
);

console.log(JSON.stringify({ draftOrder, variant: variantPrice(ALICE_VARIANT) }, null, 1));

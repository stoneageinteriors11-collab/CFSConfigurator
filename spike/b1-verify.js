// B1 evidence: read the draft and the order it became. Read-only.
import { NATURAL_GOLD_VARIANT, loadResults, read, variantPrice } from "./lib.js";

const { ids } = loadResults().B1;
const money = "shopMoney { amount currencyCode }";

const { draftOrder } = read(
  `query($id: ID!) { draftOrder(id: $id) { id name status tags order {
    id name test confirmationNumber displayFinancialStatus cancelledAt taxesIncluded tags sourceName
    subtotalPriceSet { ${money} } totalDiscountsSet { ${money} } totalShippingPriceSet { ${money} }
    totalTaxSet { ${money} } totalPriceSet { ${money} }
    lineItems(first: 5) { nodes { title sku quantity variant { id }
      originalUnitPriceSet { ${money} } discountedTotalSet { ${money} } customAttributes { key value } } }
    transactions(first: 5) { kind status gateway test amountSet { ${money} } }
  } } }`,
  { id: ids.draftOrder },
);

console.log(JSON.stringify({ draftOrder, variant: variantPrice(NATURAL_GOLD_VARIANT) }, null, 2));

// Builds the permanent record of a paid Shopify order: what Shopify charged, line by line, and
// for lines from an app checkout, the configuration the app priced. Saved once and never changed,
// so later edits to products or options cannot alter an old order.
// No customer details are kept here; they stay in Shopify.
import { lineAttributes } from "../checkout/start-checkout.server.js";

export const SPECIFICATION_VERSION = 1;
const ATTEMPT_KEY = "_cfs_attempt";

const MONEY = "shopMoney { amount currencyCode }";

export const ORDER_QUERY = `#graphql
  query CfsPaidOrder($id: ID!) {
    order(id: $id) {
      id
      name
      createdAt
      test
      sourceName
      displayFinancialStatus
      cancelledAt
      currencyCode
      taxesIncluded
      customAttributes { key value }
      discountApplications(first: 20) {
        pageInfo { hasNextPage }
        nodes {
          __typename
          index
          allocationMethod
          targetSelection
          targetType
          value {
            ... on MoneyV2 { amount currencyCode }
            ... on PricingPercentageValue { percentage }
          }
          ... on AutomaticDiscountApplication { title }
          ... on DiscountCodeApplication { code }
          ... on ManualDiscountApplication { title }
          ... on ScriptDiscountApplication { title }
        }
      }
      lineItems(first: 100) {
        pageInfo { hasNextPage }
        nodes {
          id
          title
          variantTitle
          sku
          quantity
          variant { id }
          product { id }
          originalUnitPriceSet { ${MONEY} }
          customAttributes { key value }
          discountAllocations {
            allocatedAmountSet { ${MONEY} }
            discountApplication { index }
          }
        }
      }
      subtotalPriceSet { ${MONEY} }
      totalDiscountsSet { ${MONEY} }
      totalShippingPriceSet { ${MONEY} }
      totalTaxSet { ${MONEY} }
      totalPriceSet { ${MONEY} }
    }
  }`;

/** Reads an order. Returns null if Shopify has no such order; throws if it sent only part of it. */
export async function readOrder(graphql, orderId) {
  const response = await graphql(ORDER_QUERY, { variables: { id: orderId } });
  const { data } = await response.json();
  const order = data?.order;
  if (!order) return null;
  if (order.lineItems.pageInfo.hasNextPage || order.discountApplications.pageInfo.hasNextPage) {
    throw new Error(`Order ${order.name} is too large to read in one request`);
  }
  return order;
}

/** The app checkout an order says it came from, or null. */
export function attemptIdOf(order) {
  const value = order.customAttributes?.find((attribute) => attribute.key === ATTEMPT_KEY)?.value;
  return value || null;
}

/** Shopify money as whole pennies, refusing anything that is not the order's currency. */
function pennies(set, currency) {
  const { amount, currencyCode } = set.shopMoney;
  if (currencyCode !== currency) throw new Error(`Unexpected currency ${currencyCode}`);
  if (typeof amount !== "string" || !/^-?\d+(\.\d{1,2})?$/.test(amount)) throw new Error(`Unreadable amount ${amount}`);
  const negative = amount.startsWith("-");
  const [pounds, pence = ""] = amount.replace("-", "").split(".");
  const cents = Number(pounds) * 100 + Number(pence.padEnd(2, "0"));
  return negative ? -cents : cents;
}

const sameAttributes = (a, b) =>
  a.length === b.length && a.every((attribute, i) => attribute.key === b[i].key && attribute.value === b[i].value);

/** Pairs each order line with the checkout line it came from, using each checkout line once. */
function pairLines(orderLines, checkoutLines) {
  const unused = [...checkoutLines];
  const pairs = orderLines.map((line) => {
    const index = unused.findIndex(
      (candidate) =>
        candidate.variantId === line.variantId &&
        candidate.quantity === line.quantity &&
        candidate.unitCents === line.unitCents &&
        sameAttributes(lineAttributes(candidate.selection), line.attributes),
    );
    return index === -1 ? null : unused.splice(index, 1)[0];
  });
  return { pairs, unused };
}

function readDiscount(application, currency) {
  const { value } = application;
  return {
    index: application.index,
    type: application.__typename,
    title: application.title ?? null,
    code: application.code ?? null,
    allocationMethod: application.allocationMethod,
    targetSelection: application.targetSelection,
    targetType: application.targetType,
    value:
      value?.percentage !== undefined
        ? { percentage: value.percentage }
        : { cents: pennies({ shopMoney: value }, currency) },
  };
}

function readLine(node, currency) {
  const discounts = node.discountAllocations.map((allocation) => ({
    discount: allocation.discountApplication.index,
    cents: pennies(allocation.allocatedAmountSet, currency),
  }));
  const unitCents = pennies(node.originalUnitPriceSet, currency);
  const discountCents = discounts.reduce((sum, d) => sum + d.cents, 0);
  return {
    lineItemId: node.id,
    productId: node.product?.id ?? null,
    variantId: node.variant?.id ?? null,
    sku: node.sku ?? "",
    title: node.title,
    variantTitle: node.variantTitle ?? "",
    quantity: node.quantity,
    attributes: node.customAttributes.map(({ key, value }) => ({ key, value })),
    unitCents,
    discounts,
    discountCents,
    totalCents: unitCents * node.quantity - discountCents,
  };
}

/** What the app priced for one checkout line. Options carry the CFS attribute and assignment IDs. */
const configurationOf = (line) => ({
  baseCents: line.baseCents,
  unitCents: line.unitCents,
  options: line.selection.map((choice) => ({
    group: choice.group,
    label: choice.label,
    cfsId: choice.choiceId,
    assignmentId: choice.assignmentId,
    cents: choice.cents,
  })),
});

/**
 * order comes from readOrder. attempt is the CheckoutAttempt named by attemptIdOf(order) for this
 * shop, or null if there is none. Returns the fields for an OrderSnapshot row:
 *   matchStatus: "matched" when every order line equals a checkout line and nothing is left over,
 *     "price_mismatch" when the order differs from its checkout in any way,
 *     "no_attempt" when the order did not come from an app checkout that still exists.
 */
export function buildSnapshot(order, attempt) {
  const currency = order.currencyCode;
  const claimedAttemptId = attemptIdOf(order);
  const checkout = attempt && attempt.id === claimedAttemptId ? attempt : null;

  const lines = order.lineItems.nodes.map((node) => readLine(node, currency));
  const { pairs, unused } = pairLines(lines, checkout?.lines ?? []);

  let matchStatus = "no_attempt";
  if (checkout) matchStatus = pairs.every(Boolean) && unused.length === 0 ? "matched" : "price_mismatch";

  const specification = {
    version: SPECIFICATION_VERSION,
    order: {
      id: order.id,
      name: order.name,
      createdAt: order.createdAt,
      test: order.test,
      sourceName: order.sourceName ?? null,
      currency,
      taxesIncluded: order.taxesIncluded,
    },
    checkout: checkout
      ? {
          attemptId: checkout.id,
          basketVersion: checkout.basketVersion,
          createdAt: new Date(checkout.createdAt).toISOString(),
          totalCents: checkout.totalCents,
        }
      : null,
    claimedAttemptId: checkout ? null : claimedAttemptId,
    lines: lines.map((line, i) => ({ ...line, configuration: pairs[i] ? configurationOf(pairs[i]) : null })),
    missingCheckoutLines: unused.map((line) => ({
      sku: line.sku,
      variantId: line.variantId,
      title: line.title,
      variantTitle: line.variantTitle,
      quantity: line.quantity,
      ...configurationOf(line),
    })),
    discounts: order.discountApplications.nodes.map((application) => readDiscount(application, currency)),
    totals: {
      beforeDiscountsCents: lines.reduce((sum, line) => sum + line.unitCents * line.quantity, 0),
      discountCents: pennies(order.totalDiscountsSet, currency),
      subtotalCents: pennies(order.subtotalPriceSet, currency),
      shippingCents: pennies(order.totalShippingPriceSet, currency),
      taxCents: pennies(order.totalTaxSet, currency),
      totalCents: pennies(order.totalPriceSet, currency),
    },
  };

  return {
    orderId: order.id,
    orderName: order.name,
    attemptId: checkout?.id ?? null,
    matchStatus,
    financialStatus: order.displayFinancialStatus,
    cancelledAt: order.cancelledAt ? new Date(order.cancelledAt) : null,
    specification,
  };
}

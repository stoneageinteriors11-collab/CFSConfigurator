// Catches up on order notifications the app missed, for example while it was asleep or down.
// Shopify retries a failed notification 8 times over 4 hours and then stops, so this reads
// every order changed since the last check and handles it as the notifications would have:
// a paid order with no record is saved, and a saved record takes Shopify's current status.
// Each step is safe to repeat, so running alongside a live notification does no harm.
import { copyStatus } from "./order-status.server.js";
import { saveOrderSnapshot } from "./save-snapshot.server.js";

export const CHANGED_ORDERS_QUERY = `#graphql
  query CfsChangedOrders($query: String!, $after: String) {
    orders(first: 50, after: $after, sortKey: UPDATED_AT, query: $query) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        updatedAt
        displayFinancialStatus
        cancelledAt
      }
    }
  }`;

const DAY_MS = 24 * 60 * 60 * 1000;
// The first check for a shop looks back a week.
const FIRST_LOOK_BACK_MS = 7 * DAY_MS;
// Shopify's search can take a moment to include a change, so each check overlaps the last.
const OVERLAP_MS = 10 * 60 * 1000;
// A very busy spell is finished on the next check rather than all at once.
const MAX_PAGES = 20;
// Statuses of an order that has been paid in full, which is when orders/paid is sent.
const PAID_STATUSES = new Set(["PAID", "PARTIALLY_REFUNDED", "REFUNDED"]);

async function handleOrder({ db, graphql, shop, order }) {
  const record = await db.orderSnapshot.findUnique({
    where: { shop_orderId: { shop, orderId: order.id } },
    select: { id: true, financialStatus: true, cancelledAt: true },
  });
  if (record) return (await copyStatus(db, record, order)).outcome;
  if (!PAID_STATUSES.has(order.displayFinancialStatus)) return "not_paid";

  // Reads the order in full and saves it with its current status, as the paid notification does.
  const result = await saveOrderSnapshot({ db, graphql, shop, orderId: order.id });
  if (result.outcome === "saved" && result.matchStatus !== "matched") {
    console.warn(`Order needs attention: ${order.id} ${result.matchStatus}`);
  }
  return result.outcome;
}

/**
 * Returns { checked, saved, updated, failed, complete }.
 * Progress is kept only up to the first order that failed, so that order is tried again next time.
 * Throws if Shopify cannot list orders, and then nothing is marked as checked.
 */
export async function recoverOrders({ db, graphql, shop, now = new Date() }) {
  const progress = await db.orderRecovery.findUnique({ where: { shop } });
  const since = progress
    ? new Date(progress.checkedUntil.getTime() - OVERLAP_MS)
    : new Date(now.getTime() - FIRST_LOOK_BACK_MS);

  const summary = { checked: 0, saved: 0, updated: 0, failed: 0, complete: false };
  let checkedUntil = null;
  let after = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const response = await graphql(CHANGED_ORDERS_QUERY, {
      variables: { query: `updated_at:>='${since.toISOString()}'`, after },
    });
    const { data } = await response.json();
    const orders = data?.orders;
    if (!orders) throw new Error("Shopify did not list orders");

    for (const order of orders.nodes) {
      summary.checked += 1;
      try {
        const outcome = await handleOrder({ db, graphql, shop, order });
        if (outcome === "saved") summary.saved += 1;
        if (outcome === "updated") summary.updated += 1;
        if (!summary.failed) checkedUntil = new Date(order.updatedAt);
      } catch (error) {
        summary.failed += 1;
        console.error(`Order recovery for ${shop}: ${order.id} not handled`, error?.message);
      }
    }
    if (!orders.pageInfo.hasNextPage) {
      summary.complete = true;
      break;
    }
    after = orders.pageInfo.endCursor;
  }

  // Everything changed before this check began has been handled.
  if (summary.complete && !summary.failed) checkedUntil = now;
  if (checkedUntil) {
    await db.orderRecovery.upsert({
      where: { shop },
      create: { shop, checkedUntil },
      update: { checkedUntil },
    });
  }
  return summary;
}

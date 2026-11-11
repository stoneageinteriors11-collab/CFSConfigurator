// Keeps a saved order record's payment status and cancellation in step with Shopify.
// Always copies Shopify's current state, so repeated or out-of-order notifications end up right.
// Only these two fields change; the database refuses any change to the specification.

const STATUS_QUERY = `#graphql
  query CfsOrderStatus($id: ID!) {
    order(id: $id) {
      id
      displayFinancialStatus
      cancelledAt
    }
  }`;

/** The order a notification is about. A refund names its order by number, not by ID. */
export function orderIdOf(topic, payload) {
  if (topic === "REFUNDS_CREATE") {
    const number = payload?.order_id;
    return Number.isSafeInteger(number) && number > 0 ? `gid://shopify/Order/${number}` : null;
  }
  const id = payload?.admin_graphql_api_id;
  return typeof id === "string" && id.startsWith("gid://shopify/Order/") ? id : null;
}

/**
 * Returns { outcome: "updated" | "unchanged" | "no_record" | "order_not_found", financialStatus? }.
 * Orders without a saved record are left alone: they are ordinary orders, or their paid
 * notification has not been handled yet, which reads the current status anyway.
 */
export async function updateOrderStatus({ db, graphql, shop, orderId }) {
  const record = await db.orderSnapshot.findUnique({
    where: { shop_orderId: { shop, orderId } },
    select: { id: true, financialStatus: true, cancelledAt: true },
  });
  if (!record) return { outcome: "no_record" };

  const response = await graphql(STATUS_QUERY, { variables: { id: orderId } });
  const { data } = await response.json();
  const order = data?.order;
  if (!order) return { outcome: "order_not_found" };
  return copyStatus(db, record, order);
}

/** Writes Shopify's status onto a record only when it differs. order has displayFinancialStatus and cancelledAt. */
export async function copyStatus(db, record, order) {
  const financialStatus = order.displayFinancialStatus;
  const cancelledAt = order.cancelledAt ? new Date(order.cancelledAt) : null;
  if (financialStatus === record.financialStatus && cancelledAt?.getTime() === record.cancelledAt?.getTime()) {
    return { outcome: "unchanged", financialStatus };
  }

  await db.orderSnapshot.update({ where: { id: record.id }, data: { financialStatus, cancelledAt } });
  return { outcome: "updated", financialStatus };
}

import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { countNeedingAttention, listOrders, pageOf, viewOf } from "../orders/order-list.server.js";
import { dateTime, matchBadge, money, paymentLabel } from "../orders/format.js";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const view = viewOf(request.url);
  const [list, attentionCount] = await Promise.all([
    listOrders(db, session.shop, pageOf(request.url), { attentionOnly: view === "attention" }),
    countNeedingAttention(db, session.shop),
  ]);
  return { ...list, view, attentionCount };
};

const pageUrl = (view, page) => {
  const params = new URLSearchParams();
  if (view === "attention") params.set("view", "attention");
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/app/orders?${query}` : "/app/orders";
};

export default function Orders() {
  const { orders, page, hasNextPage, hasPreviousPage, view, attentionCount } = useLoaderData();
  const attention = view === "attention";

  return (
    <s-page heading={attention ? "Orders needing attention" : "Orders"}>
      <s-stack direction="inline" gap="small-200" paddingBlockEnd="base">
        <s-button href={pageUrl("all", 1)} variant={attention ? "secondary" : "primary"}>
          All orders
        </s-button>
        <s-button href={pageUrl("attention", 1)} variant={attention ? "primary" : "secondary"}>
          Needs attention ({attentionCount})
        </s-button>
      </s-stack>

      {attention && orders.length > 0 && (
        <s-banner tone="critical">
          These orders have a configurable product that the app did not price, or that differs from what it priced.
          Open each one and check it before fulfilling. Cancelled orders are left out.
        </s-banner>
      )}

      <s-section padding="none" accessibilityLabel={attention ? "Orders needing attention" : "Saved orders"}>
        {orders.length === 0 ? (
          <s-box padding="base">
            <s-paragraph>
              {attention
                ? "Nothing needs attention. Every open order matches the checkout the app priced."
                : "No orders yet. Paid orders appear here a few seconds after payment."}
            </s-paragraph>
          </s-box>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header listSlot="primary">Order</s-table-header>
              <s-table-header listSlot="inline">Check</s-table-header>
              <s-table-header listSlot="labeled">Date</s-table-header>
              <s-table-header listSlot="labeled">Payment</s-table-header>
              <s-table-header listSlot="labeled" format="numeric">Items</s-table-header>
              <s-table-header listSlot="labeled" format="currency">Total</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {orders.map((order) => {
                const match = matchBadge(order.matchStatus);
                return (
                  <s-table-row key={order.id}>
                    <s-table-cell>
                      <s-link href={`/app/orders/${order.id}`}>{order.orderName}</s-link>
                    </s-table-cell>
                    <s-table-cell>
                      <s-badge tone={match.tone}>{match.label}</s-badge>
                    </s-table-cell>
                    <s-table-cell>{dateTime(order.orderedAt)}</s-table-cell>
                    <s-table-cell>
                      {paymentLabel(order.financialStatus)}
                      {order.cancelledAt ? ", cancelled" : ""}
                      {order.test ? " (test)" : ""}
                    </s-table-cell>
                    <s-table-cell>{order.itemCount}</s-table-cell>
                    <s-table-cell>{money(order.totalCents, order.currency)}</s-table-cell>
                  </s-table-row>
                );
              })}
            </s-table-body>
          </s-table>
        )}
      </s-section>
      {(hasPreviousPage || hasNextPage) && (
        <s-stack direction="inline" gap="base" justifyContent="center" padding="base">
          {hasPreviousPage && <s-button href={pageUrl(view, page - 1)}>Newer orders</s-button>}
          {hasNextPage && <s-button href={pageUrl(view, page + 1)}>Older orders</s-button>}
        </s-stack>
      )}
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);

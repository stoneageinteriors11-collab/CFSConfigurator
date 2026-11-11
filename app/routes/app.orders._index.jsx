import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { listOrders, pageOf } from "../orders/order-list.server.js";
import { dateTime, matchBadge, money, paymentLabel } from "../orders/format.js";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  return listOrders(db, session.shop, pageOf(request.url));
};

export default function Orders() {
  const { orders, page, hasNextPage, hasPreviousPage } = useLoaderData();

  return (
    <s-page heading="Orders">
      <s-section padding="none" accessibilityLabel="Saved orders">
        {orders.length === 0 ? (
          <s-box padding="base">
            <s-paragraph>No orders yet. Paid orders appear here a few seconds after payment.</s-paragraph>
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
          {hasPreviousPage && <s-button href={`/app/orders?page=${page - 1}`}>Newer orders</s-button>}
          {hasNextPage && <s-button href={`/app/orders?page=${page + 1}`}>Older orders</s-button>}
        </s-stack>
      )}
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);

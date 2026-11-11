import assert from "node:assert/strict";
import { test } from "node:test";
import { orderIdOf, updateOrderStatus } from "../../app/orders/order-status.server.js";

const SHOP = "test.myshopify.com";
const ORDER_ID = "gid://shopify/Order/99";

function shopify(order) {
  const calls = [];
  const graphql = async (query, { variables }) => {
    calls.push(variables.id);
    return { json: async () => ({ data: { order } }) };
  };
  return { graphql, calls };
}

function fakeDatabase(record) {
  const updates = [];
  return {
    updates,
    orderSnapshot: {
      findUnique: async ({ where: { shop_orderId: key } }) =>
        record && key.shop === SHOP && key.orderId === ORDER_ID ? record : null,
      update: async (args) => {
        updates.push(args);
        return {};
      },
    },
  };
}

const paidRecord = { id: "row-1", financialStatus: "PAID", cancelledAt: null };
const update = (db, graphql) => updateOrderStatus({ db, graphql, shop: SHOP, orderId: ORDER_ID });

test("a refund or cancellation copies Shopify's current status onto the record", async () => {
  const db = fakeDatabase(paidRecord);
  const { graphql, calls } = shopify({ id: ORDER_ID, displayFinancialStatus: "REFUNDED", cancelledAt: "2026-11-11T09:00:00Z" });

  assert.deepEqual(await update(db, graphql), { outcome: "updated", financialStatus: "REFUNDED" });
  assert.deepEqual(calls, [ORDER_ID]);
  assert.deepEqual(db.updates, [{
    where: { id: "row-1" },
    data: { financialStatus: "REFUNDED", cancelledAt: new Date("2026-11-11T09:00:00Z") },
  }]);
});

test("a partial refund keeps the order open", async () => {
  const db = fakeDatabase(paidRecord);
  const { graphql } = shopify({ id: ORDER_ID, displayFinancialStatus: "PARTIALLY_REFUNDED", cancelledAt: null });

  assert.deepEqual(await update(db, graphql), { outcome: "updated", financialStatus: "PARTIALLY_REFUNDED" });
  assert.equal(db.updates[0].data.cancelledAt, null);
});

test("a repeated notification with nothing new writes nothing", async () => {
  const record = { id: "row-1", financialStatus: "REFUNDED", cancelledAt: new Date("2026-11-11T09:00:00Z") };
  const db = fakeDatabase(record);
  const { graphql } = shopify({ id: ORDER_ID, displayFinancialStatus: "REFUNDED", cancelledAt: "2026-11-11T09:00:00Z" });

  assert.deepEqual(await update(db, graphql), { outcome: "unchanged", financialStatus: "REFUNDED" });
  assert.deepEqual(db.updates, []);
});

test("an order the app has no record of is left alone without asking Shopify", async () => {
  const db = fakeDatabase(null);
  const { graphql, calls } = shopify({ id: ORDER_ID, displayFinancialStatus: "REFUNDED", cancelledAt: null });

  assert.deepEqual(await update(db, graphql), { outcome: "no_record" });
  assert.deepEqual(calls, []);
});

test("an order Shopify no longer has is reported, not changed", async () => {
  const db = fakeDatabase(paidRecord);
  assert.deepEqual(await update(db, shopify(null).graphql), { outcome: "order_not_found" });
  assert.deepEqual(db.updates, []);
});

test("orderIdOf finds the order for each kind of notification", () => {
  assert.equal(orderIdOf("ORDERS_CANCELLED", { admin_graphql_api_id: ORDER_ID, id: 99 }), ORDER_ID);
  // A refund's own ID is not the order's.
  assert.equal(orderIdOf("REFUNDS_CREATE", { order_id: 99, admin_graphql_api_id: "gid://shopify/Refund/5" }), ORDER_ID);
  assert.equal(orderIdOf("REFUNDS_CREATE", { order_id: "99" }), null);
  assert.equal(orderIdOf("REFUNDS_CREATE", {}), null);
  assert.equal(orderIdOf("ORDERS_CANCELLED", { admin_graphql_api_id: "gid://shopify/Refund/5" }), null);
  assert.equal(orderIdOf("ORDERS_CANCELLED", null), null);
});

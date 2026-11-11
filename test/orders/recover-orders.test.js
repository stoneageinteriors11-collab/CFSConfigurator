import assert from "node:assert/strict";
import { test } from "node:test";
import { recoverOrders } from "../../app/orders/recover-orders.server.js";

const SHOP = "test.myshopify.com";
const NOW = new Date("2026-11-11T12:00:00Z");
const money = (amount) => ({ shopMoney: { amount, currencyCode: "GBP" } });

const listed = (n, status = "PAID", updatedAt = `2026-11-11T10:0${n}:00Z`) => ({
  id: `gid://shopify/Order/${n}`,
  updatedAt,
  displayFinancialStatus: status,
  cancelledAt: null,
});

// A paid order with a configurable product, bought without an app checkout: always kept for staff.
const fullOrder = (id, configurable = true) => ({
  id,
  name: `#${id.split("/").pop()}`,
  createdAt: "2026-11-11T10:00:00Z",
  test: true,
  sourceName: "web",
  displayFinancialStatus: "PAID",
  cancelledAt: null,
  currencyCode: "GBP",
  taxesIncluded: true,
  customAttributes: [],
  discountApplications: { pageInfo: { hasNextPage: false }, nodes: [] },
  lineItems: {
    pageInfo: { hasNextPage: false },
    nodes: [{
      id: "gid://shopify/LineItem/1",
      title: "Bed",
      variantTitle: "Double",
      sku: "B",
      quantity: 1,
      variant: { id: "gid://shopify/ProductVariant/1" },
      product: configurable ? { id: "gid://shopify/Product/1", cfsWorkflow: { id: "m1" } } : { id: "gid://shopify/Product/2" },
      originalUnitPriceSet: money("999.0"),
      customAttributes: [],
      discountAllocations: [],
    }],
  },
  subtotalPriceSet: money("999.0"),
  totalDiscountsSet: money("0.0"),
  totalShippingPriceSet: money("0.0"),
  totalTaxSet: money("0.0"),
  totalPriceSet: money("999.0"),
});

/** pages: lists of listed orders, one per page. orders: full orders by ID; a missing one fails to read. */
function shopify(pages, orders = {}) {
  const searches = [];
  const reads = [];
  const graphql = async (query, { variables }) => {
    if (query.includes("CfsChangedOrders")) {
      searches.push(variables);
      const index = variables.after ? Number(variables.after) : 0;
      const page = pages[index];
      const data = page
        ? { orders: { nodes: page, pageInfo: { hasNextPage: index + 1 < pages.length, endCursor: String(index + 1) } } }
        : null;
      return { json: async () => ({ data }) };
    }
    reads.push(variables.id);
    if (!(variables.id in orders)) throw new Error("Shopify unavailable");
    return { json: async () => ({ data: { order: orders[variables.id] } }) };
  };
  return { graphql, searches, reads };
}

function fakeDatabase({ records = [], progress = null } = {}) {
  const db = {
    records,
    progress,
    statusUpdates: [],
    orderRecovery: {
      findUnique: async () => db.progress,
      upsert: async ({ create, update }) => {
        db.progress = db.progress ? { ...db.progress, ...update } : create;
      },
    },
    orderSnapshot: {
      findUnique: async ({ where: { shop_orderId: key } }) =>
        db.records.find((r) => r.shop === key.shop && r.orderId === key.orderId) ?? null,
      update: async (args) => db.statusUpdates.push(args),
      create: async ({ data }) => {
        db.records.push(data);
        return { id: `row-${db.records.length}` };
      },
    },
    checkoutAttempt: { findFirst: async () => null },
    $transaction: async (work) => work(db),
  };
  return db;
}

const run = (db, graphql) => recoverOrders({ db, graphql, shop: SHOP, now: NOW });

test("a missed paid order is saved, and the check is remembered", async () => {
  const missed = listed(1);
  const db = fakeDatabase();
  const { graphql, searches } = shopify([[missed]], { [missed.id]: fullOrder(missed.id) });

  assert.deepEqual(await run(db, graphql), { checked: 1, saved: 1, updated: 0, failed: 0, complete: true });
  assert.equal(db.records[0].orderId, missed.id);
  assert.equal(db.records[0].matchStatus, "no_attempt");
  // The first check looks back a week.
  assert.equal(searches[0].query, "updated_at:>='2026-11-04T12:00:00.000Z'");
  assert.deepEqual(db.progress.checkedUntil, NOW);
});

test("the next check starts shortly before the last one finished", async () => {
  const db = fakeDatabase({ progress: { shop: SHOP, checkedUntil: new Date("2026-11-11T11:45:00Z") } });
  const { graphql, searches } = shopify([[]]);

  await run(db, graphql);
  assert.equal(searches[0].query, "updated_at:>='2026-11-11T11:35:00.000Z'");
});

test("a missed refund or cancellation is copied onto the saved record", async () => {
  const refunded = { ...listed(1, "REFUNDED"), cancelledAt: "2026-11-11T10:30:00Z" };
  const record = { id: "row-1", shop: SHOP, orderId: refunded.id, financialStatus: "PAID", cancelledAt: null };
  const db = fakeDatabase({ records: [record] });
  const { graphql, reads } = shopify([[refunded]]);

  assert.equal((await run(db, graphql)).updated, 1);
  assert.deepEqual(db.statusUpdates[0].data, { financialStatus: "REFUNDED", cancelledAt: new Date("2026-11-11T10:30:00Z") });
  assert.deepEqual(reads, [], "the record already holds the order, so it is not read again");
});

test("orders already up to date, unpaid orders and ordinary orders are left alone", async () => {
  const current = listed(1);
  const unpaid = listed(2, "PENDING");
  const ordinary = listed(3);
  const record = { id: "row-1", shop: SHOP, orderId: current.id, financialStatus: "PAID", cancelledAt: null };
  const db = fakeDatabase({ records: [record] });
  const { graphql, reads } = shopify([[current, unpaid, ordinary]], { [ordinary.id]: fullOrder(ordinary.id, false) });

  assert.deepEqual(await run(db, graphql), { checked: 3, saved: 0, updated: 0, failed: 0, complete: true });
  assert.deepEqual(db.statusUpdates, []);
  assert.equal(db.records.length, 1);
  assert.deepEqual(reads, [ordinary.id]);
});

test("an order that fails is tried again next time, and the others are still handled", async () => {
  const good = listed(1);
  const broken = listed(2);
  const later = listed(3);
  const db = fakeDatabase();
  const { graphql } = shopify([[good, broken, later]], { [good.id]: fullOrder(good.id), [later.id]: fullOrder(later.id) });

  assert.deepEqual(await run(db, graphql), { checked: 3, saved: 2, updated: 0, failed: 1, complete: true });
  assert.deepEqual(db.progress.checkedUntil, new Date(good.updatedAt));
});

test("every page is read", async () => {
  const first = listed(1);
  const second = listed(2);
  const db = fakeDatabase();
  const { graphql, searches } = shopify([[first], [second]], { [first.id]: fullOrder(first.id), [second.id]: fullOrder(second.id) });

  assert.equal((await run(db, graphql)).saved, 2);
  assert.deepEqual(searches.map((s) => s.after), [null, "1"]);
  assert.deepEqual(db.progress.checkedUntil, NOW);
});

test("a very busy spell is finished next time, from the last order handled", async () => {
  const pages = Array.from({ length: 21 }, (_, i) => [listed(i, "PENDING", new Date(Date.UTC(2026, 10, 11, 10, i)).toISOString())]);
  const db = fakeDatabase();
  const { graphql, searches } = shopify(pages);

  const result = await run(db, graphql);
  assert.equal(result.complete, false);
  assert.equal(searches.length, 20);
  assert.deepEqual(db.progress.checkedUntil, new Date(Date.UTC(2026, 10, 11, 10, 19)));
});

test("if Shopify cannot list orders, nothing is marked as checked", async () => {
  const db = fakeDatabase();
  const { graphql } = shopify([]);

  await assert.rejects(run(db, graphql), /did not list orders/);
  assert.equal(db.progress, null);
});

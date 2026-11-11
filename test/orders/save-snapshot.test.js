import assert from "node:assert/strict";
import { test } from "node:test";
import { saveOrderSnapshot } from "../../app/orders/save-snapshot.server.js";

const SHOP = "test.myshopify.com";
const ORDER_ID = "gid://shopify/Order/99";
const MATTRESS = "gid://shopify/ProductVariant/3";
const money = (amount) => ({ shopMoney: { amount, currencyCode: "GBP" } });

const order = (id = ORDER_ID) => ({
  id,
  name: "#1099",
  createdAt: "2026-11-10T10:05:00Z",
  test: true,
  sourceName: "shopify_draft_order",
  displayFinancialStatus: "PAID",
  cancelledAt: null,
  currencyCode: "GBP",
  taxesIncluded: true,
  customAttributes: [{ key: "_cfs_attempt", value: "attempt-1" }],
  discountApplications: { pageInfo: { hasNextPage: false }, nodes: [] },
  lineItems: {
    pageInfo: { hasNextPage: false },
    nodes: [{
      id: "gid://shopify/LineItem/1",
      title: "Mattress",
      variantTitle: "Single",
      sku: "M",
      quantity: 1,
      variant: { id: MATTRESS },
      product: { id: "gid://shopify/Product/2" },
      originalUnitPriceSet: money("149.0"),
      customAttributes: [],
      discountAllocations: [],
    }],
  },
  subtotalPriceSet: money("149.0"),
  totalDiscountsSet: money("0.0"),
  totalShippingPriceSet: money("0.0"),
  totalTaxSet: money("0.0"),
  totalPriceSet: money("149.0"),
});

const attempt = (snapshot = null) => ({
  id: "attempt-1",
  shop: SHOP,
  basketId: "basket-1",
  basketVersion: 1,
  createdAt: new Date("2026-11-10T10:00:00Z"),
  totalCents: 14900,
  lines: [{ lineId: "line-1", variantId: MATTRESS, sku: "M", title: "Mattress", variantTitle: "Single", quantity: 1, baseCents: 14900, unitCents: 14900, selection: [] }],
  snapshot,
});

function shopify(found = order()) {
  const calls = [];
  const graphql = async (query, { variables }) => {
    calls.push(variables.id);
    return { json: async () => ({ data: { order: found } }) };
  };
  return { graphql, calls };
}

const clash = () => Object.assign(new Error("Unique constraint failed"), { code: "P2002" });

function fakeDatabase({ saved = [], checkout = attempt(), failFirstCreate = null } = {}) {
  const rows = [...saved];
  const lookups = [];
  const basketChanges = [];
  let creates = 0;
  const db = {
    rows,
    lookups,
    basketChanges,
    // Undoes only what the transaction wrote; rows standing in for other requests stay.
    $transaction: async (work) => {
      const created = [];
      const before = basketChanges.length;
      db.created = created;
      try {
        return await work(db);
      } catch (error) {
        for (const row of created) rows.splice(rows.indexOf(row), 1);
        basketChanges.length = before;
        throw error;
      }
    },
    basket: {
      updateMany: async ({ where }) => {
        basketChanges.push(["version", where.id]);
        return { count: 1 };
      },
    },
    basketLine: {
      deleteMany: async ({ where }) => {
        basketChanges.push(["remove", where.id]);
        return { count: 1 };
      },
      updateMany: async () => assert.fail("a fully paid line is removed, not reduced"),
    },
    checkoutAttempt: {
      findFirst: async ({ where }) => {
        lookups.push(where);
        return checkout && where.id === checkout.id && where.shop === checkout.shop ? checkout : null;
      },
    },
    orderSnapshot: {
      findUnique: async ({ where: { shop_orderId: key } }) =>
        rows.find((row) => row.shop === key.shop && row.orderId === key.orderId) ?? null,
      create: async ({ data }) => {
        creates += 1;
        if (creates === 1 && failFirstCreate) failFirstCreate(rows);
        if (rows.some((row) => row.shop === data.shop && row.orderId === data.orderId)) throw clash();
        if (data.attemptId && rows.some((row) => row.attemptId === data.attemptId)) throw clash();
        rows.push(data);
        db.created?.push(data);
        return { id: `row-${rows.length}` };
      },
    },
  };
  return db;
}

const save = (db, graphql) => saveOrderSnapshot({ db, graphql, shop: SHOP, orderId: ORDER_ID });

test("a paid order is saved once, linked to its checkout", async () => {
  const db = fakeDatabase();
  const { graphql, calls } = shopify();

  assert.deepEqual(await save(db, graphql), { outcome: "saved", matchStatus: "matched" });
  assert.deepEqual(calls, [ORDER_ID]);
  assert.deepEqual(db.lookups, [{ id: "attempt-1", shop: SHOP }]);
  assert.equal(db.rows.length, 1);
  assert.equal(db.rows[0].shop, SHOP);
  assert.equal(db.rows[0].attemptId, "attempt-1");
  assert.equal(db.rows[0].orderName, "#1099");
  assert.equal(db.rows[0].specification.totals.totalCents, 14900);
  assert.deepEqual(db.basketChanges, [["version", "basket-1"], ["remove", "line-1"]]);
});

test("the paid items leave the basket only once, however often Shopify repeats", async () => {
  const db = fakeDatabase();
  await save(db, shopify().graphql);
  await save(db, shopify().graphql);
  assert.equal(db.basketChanges.filter(([kind]) => kind === "remove").length, 1);
});

test("an order not linked to its checkout leaves every basket alone", async () => {
  const db = fakeDatabase({ checkout: attempt({ orderId: "gid://shopify/Order/1" }) });
  await save(db, shopify().graphql);
  assert.deepEqual(db.basketChanges, []);
});

test("if the record cannot be saved, the basket is not changed either", async () => {
  const db = fakeDatabase();
  db.basketLine.deleteMany = async () => {
    throw new Error("connection lost");
  };
  await assert.rejects(save(db, shopify().graphql), /connection lost/);
  assert.equal(db.rows.length, 0);
});

test("a repeated notification changes nothing and does not ask Shopify again", async () => {
  const db = fakeDatabase({ saved: [{ shop: SHOP, orderId: ORDER_ID, attemptId: "attempt-1" }] });
  const { graphql, calls } = shopify();

  assert.deepEqual(await save(db, graphql), { outcome: "already_saved" });
  assert.deepEqual(calls, []);
  assert.equal(db.rows.length, 1);
});

test("two notifications arriving together save one record", async () => {
  const db = fakeDatabase({
    failFirstCreate: (rows) => rows.push({ shop: SHOP, orderId: ORDER_ID, attemptId: "attempt-1" }),
  });

  assert.deepEqual(await save(db, shopify().graphql), { outcome: "already_saved" });
  assert.equal(db.rows.length, 1);
});

test("an order Shopify cannot find is not saved", async () => {
  const db = fakeDatabase();
  assert.deepEqual(await save(db, shopify(null).graphql), { outcome: "order_not_found" });
  assert.equal(db.rows.length, 0);
});

test("a second order naming an already paid checkout is saved without the link", async () => {
  const db = fakeDatabase({ checkout: attempt({ orderId: "gid://shopify/Order/1" }) });

  assert.deepEqual(await save(db, shopify().graphql), { outcome: "saved", matchStatus: "no_attempt" });
  assert.equal(db.rows[0].attemptId, null);
  assert.equal(db.rows[0].specification.claimedAttemptId, "attempt-1");
});

test("if another order takes the checkout at the same moment, this one is saved without the link", async () => {
  const db = fakeDatabase({
    failFirstCreate: (rows) => rows.push({ shop: SHOP, orderId: "gid://shopify/Order/1", attemptId: "attempt-1" }),
  });

  assert.deepEqual(await save(db, shopify().graphql), { outcome: "saved", matchStatus: "no_attempt" });
  assert.equal(db.rows.length, 2);
  assert.equal(db.rows[1].attemptId, null);
});

test("a checkout from another shop is never looked up", async () => {
  const db = fakeDatabase({ checkout: { ...attempt(), shop: "other.myshopify.com" } });

  assert.deepEqual(await save(db, shopify().graphql), { outcome: "saved", matchStatus: "no_attempt" });
});

test("an ordinary order from Shopify's own checkout is not saved", async () => {
  const ordinary = { ...order(), customAttributes: [] };
  const db = fakeDatabase();

  assert.deepEqual(await save(db, shopify(ordinary).graphql), { outcome: "not_app_order" });
  assert.equal(db.rows.length, 0);
  assert.deepEqual(db.lookups, []);
});

test("a configurable product bought without an app checkout is saved for staff", async () => {
  const bypass = { ...order(), customAttributes: [] };
  bypass.lineItems.nodes[0].product = { id: "gid://shopify/Product/2", cfsWorkflow: { id: "m1" } };
  const db = fakeDatabase();

  assert.deepEqual(await save(db, shopify(bypass).graphql), { outcome: "saved", matchStatus: "no_attempt" });
  assert.equal(db.rows[0].attemptId, null);
  assert.equal(db.rows[0].specification.lines[0].configurable, true);
});

test("database failures are passed on, so Shopify tries again", async () => {
  const db = fakeDatabase();
  db.orderSnapshot.create = async () => {
    throw new Error("connection lost");
  };
  await assert.rejects(save(db, shopify().graphql), /connection lost/);
});

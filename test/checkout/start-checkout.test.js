import assert from "node:assert/strict";
import { test } from "node:test";
import { draftInput, startCheckout } from "../../app/checkout/start-checkout.server.js";

const VARIANT = "gid://shopify/ProductVariant/333";
const URL_ONE = "https://shop.test/invoice/1";

const product = {
  id: "gid://shopify/Product/222",
  title: "Mattress",
  handle: "mattress",
  status: "ACTIVE",
  publishedAt: "2026-01-01T00:00:00Z",
  featuredMedia: null,
  variants: {
    pageInfo: { hasNextPage: false },
    nodes: [{
      id: VARIANT,
      sku: "M",
      title: "Single",
      price: "149.00",
      availableForSale: true,
      inventoryQuantity: 5,
      inventoryPolicy: "DENY",
      inventoryItem: { tracked: true },
    }],
  },
  modelCards: null,
  workflow: null,
  options: null,
};

function fakeShopify({ userErrors = [], failCreate = false, found = null, draftOrder = { id: "draft-1", invoiceUrl: URL_ONE } } = {}) {
  const calls = { creates: [], searches: [] };
  const graphql = async (query, { variables } = {}) => {
    let data;
    if (query.includes("draftOrderCreate")) {
      calls.creates.push(variables.input);
      if (failCreate) throw new Error("timeout");
      data = { draftOrderCreate: { draftOrder: userErrors.length ? null : draftOrder, userErrors } };
    } else if (query.includes("draftOrders(")) {
      calls.searches.push(variables.query);
      data = { draftOrders: { nodes: found ? [found] : [] } };
    } else if (query.includes("currencyCode")) {
      data = { shop: { currencyCode: "GBP" } };
    } else {
      data = { product };
    }
    return { json: async () => ({ data }) };
  };
  return { graphql, calls };
}

function fakeDatabase({ lines, existing = null } = {}) {
  const state = { attempt: existing, locks: 0 };
  const basket = {
    id: "basket-1",
    version: 4,
    lines: lines ?? [{ id: "l1", productId: "222", variantId: VARIANT, quantity: 2, baseCents: 14900, unitCents: 14900, selection: [] }],
  };
  const db = {
    state,
    basket: { findUnique: async () => basket },
    checkoutAttempt: {
      createMany: async ({ data: [row] }) => {
        if (state.attempt) return { count: 0 };
        state.attempt = { id: "attempt-1", status: "creating", draftOrderId: null, invoiceUrl: null, updatedAt: new Date(), ...row };
        return { count: 1 };
      },
      findUnique: async () => state.attempt,
      update: async ({ data }) => {
        state.attempt = { ...state.attempt, ...data };
        return state.attempt;
      },
    },
    $queryRaw: async () => {
      state.locks += 1;
      return [];
    },
    $transaction: (work) => work(db),
  };
  return db;
}

const start = (db, graphql) => startCheckout({ db, graphql, shop: "test.myshopify.com", token: "token" });
const earlier = (changes) => ({
  id: "attempt-1",
  basketId: "basket-1",
  basketVersion: 4,
  status: "creating",
  totalCents: 29800,
  draftOrderId: null,
  invoiceUrl: null,
  updatedAt: new Date(Date.now() - 120000),
  ...changes,
});

test("a configured line carries its price and chosen options", () => {
  const line = {
    variantId: "v1",
    quantity: 2,
    unitCents: 108998,
    selection: [
      { group: "Select Drawer", label: "with 2 Drawer", cents: 8999 },
      { group: "Select Fabric", label: "Carlton Black", cents: 0 },
    ],
  };
  assert.deepEqual(draftInput("a1", [line], "GBP"), {
    tags: ["cfs-checkout", "cfs-attempt-a1"],
    customAttributes: [{ key: "_cfs_attempt", value: "a1" }],
    acceptAutomaticDiscounts: true,
    allowDiscountCodesInCheckout: true,
    lineItems: [{
      variantId: "v1",
      quantity: 2,
      priceOverride: { amount: "1089.98", currencyCode: "GBP" },
      customAttributes: [
        { key: "Drawer", value: "with 2 Drawer" },
        { key: "Fabric", value: "Carlton Black" },
      ],
    }],
  });
});

test("prices are written exactly, including whole pounds and single pennies", () => {
  const amount = (unitCents) =>
    draftInput("a", [{ variantId: "v", quantity: 1, unitCents, selection: [{ group: "G", label: "L" }] }], "GBP").lineItems[0].priceOverride.amount;
  assert.equal(amount(100000), "1000.00");
  assert.equal(amount(5), "0.05");
  assert.equal(amount(114), "1.14");
});

test("an ordinary line keeps Shopify's own price", () => {
  const line = { variantId: "v2", quantity: 1, unitCents: 14900, selection: [] };
  assert.deepEqual(draftInput("a1", [line], "GBP").lineItems, [{ variantId: "v2", quantity: 1 }]);
});

test("saves the attempt, locks it and returns the checkout link", async () => {
  const db = fakeDatabase();
  const { graphql, calls } = fakeShopify();
  assert.deepEqual(await start(db, graphql), { ok: true, attemptId: "attempt-1", checkoutUrl: URL_ONE, totalCents: 29800 });
  assert.equal(calls.creates.length, 1);
  assert.equal(db.state.locks, 1);
  assert.equal(db.state.attempt.status, "ready");
  assert.equal(db.state.attempt.draftOrderId, "draft-1");
  assert.equal(db.state.attempt.basketVersion, 4);
  assert.equal(db.state.attempt.lines[0].lineId, "l1");
});

test("a repeat click reuses the checkout", async () => {
  const db = fakeDatabase();
  const { graphql, calls } = fakeShopify();
  await start(db, graphql);
  const again = await start(db, graphql);
  assert.equal(again.checkoutUrl, URL_ONE);
  assert.equal(calls.creates.length, 1);
});

test("does not create a checkout when a line fails its check", async () => {
  const db = fakeDatabase({
    lines: [{ id: "l1", productId: "222", variantId: VARIANT, quantity: 6, baseCents: 14900, unitCents: 14900, selection: [] }],
  });
  const { graphql, calls } = fakeShopify();
  const result = await start(db, graphql);
  assert.equal(result.problems[0].code, "insufficient_stock");
  assert.equal(calls.creates.length, 0);
  assert.equal(db.state.attempt, null);
});

test("records a refusal and can try again", async () => {
  const db = fakeDatabase();
  const refused = fakeShopify({ userErrors: [{ field: ["lineItems"], message: "no" }] });
  assert.deepEqual(await start(db, refused.graphql), { ok: false, code: "checkout_refused" });
  assert.equal(db.state.attempt.status, "failed");

  const working = fakeShopify();
  assert.equal((await start(db, working.graphql)).checkoutUrl, URL_ONE);
  assert.equal(working.calls.searches.length, 0);
});

test("leaves the attempt unfinished when Shopify gives no answer", async () => {
  const db = fakeDatabase();
  const { graphql } = fakeShopify({ failCreate: true });
  assert.deepEqual(await start(db, graphql), { ok: false, code: "unavailable" });
  assert.equal(db.state.attempt.status, "creating");
});

test("does not start a second draft while another request may still be creating one", async () => {
  const db = fakeDatabase({ existing: earlier({ updatedAt: new Date() }) });
  const { graphql, calls } = fakeShopify();
  assert.deepEqual(await start(db, graphql), { ok: false, code: "checkout_in_progress" });
  assert.equal(calls.creates.length + calls.searches.length, 0);
});

test("after an unanswered attempt, reuses the draft Shopify did make", async () => {
  const db = fakeDatabase({ existing: earlier() });
  const { graphql, calls } = fakeShopify({ found: { id: "draft-9", invoiceUrl: "https://shop.test/invoice/9" } });
  const result = await start(db, graphql);
  assert.equal(result.checkoutUrl, "https://shop.test/invoice/9");
  assert.deepEqual(calls.searches, ["tag:cfs-attempt-attempt-1"]);
  assert.equal(calls.creates.length, 0);
  assert.equal(db.state.attempt.draftOrderId, "draft-9");
});

test("after an unanswered attempt with no draft found, creates one", async () => {
  const db = fakeDatabase({ existing: earlier() });
  const { graphql, calls } = fakeShopify();
  assert.equal((await start(db, graphql)).checkoutUrl, URL_ONE);
  assert.equal(calls.searches.length, 1);
  assert.equal(calls.creates.length, 1);
});

test("refuses a basket that does not exist", async () => {
  const db = { basket: { findUnique: async () => null } };
  assert.deepEqual(await start(db, fakeShopify().graphql), { ok: false, code: "basket_not_found" });
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { handleCheckoutRequest } from "../../app/checkout/checkout-request.server.js";

const TOKEN = "a".repeat(43);
const VARIANT = "gid://shopify/ProductVariant/333";
const CHECKOUT_URL = "https://shop.test/invoice/1";

const forbidden = (name) => new Proxy({}, { get: () => assert.fail(`${name} should not be used`) });
const neverCalled = async () => assert.fail("Shopify should not be called");

const product = (price, inventoryQuantity) => ({
  id: "gid://shopify/Product/222",
  title: "Mattress",
  handle: "mattress",
  status: "ACTIVE",
  publishedAt: "2026-01-01T00:00:00Z",
  featuredMedia: null,
  variants: {
    pageInfo: { hasNextPage: false },
    nodes: [{ id: VARIANT, sku: "M", title: "Single", price, availableForSale: true, inventoryQuantity, inventoryPolicy: "DENY", inventoryItem: { tracked: true } }],
  },
  modelCards: null,
  workflow: null,
  options: null,
});

function fakeShopify({ price = "149.00", stock = 5, userErrors = [], failing = false } = {}) {
  const calls = { creates: 0 };
  const graphql = async (query) => {
    if (failing) throw new Error("network");
    let data = { product: product(price, stock) };
    if (query.includes("currencyCode")) data = { shop: { currencyCode: "GBP" } };
    if (query.includes("draftOrderCreate")) {
      calls.creates += 1;
      data = { draftOrderCreate: { draftOrder: userErrors.length ? null : { id: "draft-1", invoiceUrl: CHECKOUT_URL }, userErrors } };
    }
    return { json: async () => ({ data }) };
  };
  return { graphql, calls };
}

function fakeDatabase({ quantity = 1, lines } = {}) {
  const state = {
    attempt: null,
    basket: {
      id: "basket-1",
      version: 3,
      lines: lines ?? [{
        id: "line-1", productId: "222", variantId: VARIANT, sku: "M", title: "Mattress", variantTitle: "Single",
        handle: "mattress", imageUrl: null, quantity, baseCents: 14900, unitCents: 14900, selection: [],
      }],
    },
  };
  const db = {
    state,
    basket: {
      findUnique: async () => state.basket,
      updateMany: async () => {
        state.basket.version += 1;
        return { count: 1 };
      },
    },
    basketLine: {
      updateMany: async ({ where, data }) => {
        const line = state.basket.lines.find((l) => l.id === where.id);
        Object.assign(line, data);
        return { count: 1 };
      },
    },
    checkoutAttempt: {
      createMany: async ({ data: [row] }) => {
        state.attempt = { id: "attempt-1", status: "creating", updatedAt: new Date(), ...row };
        return { count: 1 };
      },
      findUnique: async () => state.attempt,
      update: async ({ data }) => {
        state.attempt = { ...state.attempt, ...data };
        return state.attempt;
      },
    },
    $queryRaw: async () => [],
    $transaction: (work) => work(db),
  };
  return db;
}

const send = (db, graphql, body = { token: TOKEN }) =>
  handleCheckoutRequest({ db, graphql, shop: "test.myshopify.com", rawBody: typeof body === "string" ? body : JSON.stringify(body) });

const codeOf = (result) => result.body.errors[0].code;

test("refuses malformed requests before reaching Shopify or the database", async () => {
  for (const body of ["not json", "null", "[]", "x".repeat(2000), {}, { token: "short" }, { token: 12345 }, { token: ["a"] }]) {
    const result = await send(forbidden("database"), neverCalled, body);
    assert.equal(result.status, 400, String(JSON.stringify(body)).slice(0, 60));
    assert.equal(codeOf(result), "bad_request");
  }
});

test("returns the checkout link and total", async () => {
  const { graphql, calls } = fakeShopify();
  const result = await send(fakeDatabase({ quantity: 2 }), graphql);
  assert.deepEqual(result, { status: 200, body: { ok: true, checkoutUrl: CHECKOUT_URL, totalCents: 29800 } });
  assert.equal(calls.creates, 1);
});

test("ignores prices sent by the browser", async () => {
  const { graphql } = fakeShopify();
  const result = await send(fakeDatabase(), graphql, { token: TOKEN, totalCents: 1, unitCents: 1 });
  assert.equal(result.body.totalCents, 14900);
});

test("saves a changed price and asks the shopper to review it", async () => {
  const db = fakeDatabase({ quantity: 2 });
  const { graphql, calls } = fakeShopify({ price: "159.00" });
  const result = await send(db, graphql);

  assert.equal(result.status, 409);
  assert.equal(codeOf(result), "review_basket");
  assert.deepEqual(result.body.problems, [{
    line: "line-1", code: "price_changed", available: undefined, previousUnitCents: 14900, unitCents: 15900,
  }]);
  assert.equal(result.body.problems[0].quote, undefined);
  assert.equal(result.body.totalCents, 31800);
  assert.equal(result.body.lines[0].quantity, 2);
  assert.equal(result.body.version, 4);
  assert.equal(calls.creates, 0);
  assert.equal(db.state.attempt, null);
});

test("after reviewing a changed price, the next click goes through", async () => {
  const db = fakeDatabase();
  const { graphql, calls } = fakeShopify({ price: "159.00" });
  assert.equal((await send(db, graphql)).status, 409);
  const result = await send(db, graphql);
  assert.equal(result.status, 200);
  assert.equal(result.body.totalCents, 15900);
  assert.equal(db.state.attempt.basketVersion, 4);
  assert.equal(calls.creates, 1);
});

test("reports low stock without changing the basket", async () => {
  const db = fakeDatabase({ quantity: 6 });
  const result = await send(db, fakeShopify().graphql);
  assert.equal(result.status, 409);
  assert.equal(result.body.problems[0].code, "insufficient_stock");
  assert.equal(result.body.problems[0].available, 5);
  assert.equal(result.body.lines[0].quantity, 6);
  assert.equal(result.body.version, 3);
});

test("gives each failure its own answer", async () => {
  const missing = { basket: { findUnique: async () => null } };
  let result = await send(missing, fakeShopify().graphql);
  assert.deepEqual([result.status, codeOf(result)], [404, "basket_not_found"]);

  result = await send(fakeDatabase({ lines: [] }), neverCalled);
  assert.deepEqual([result.status, codeOf(result)], [422, "empty_basket"]);

  result = await send(fakeDatabase(), fakeShopify({ failing: true }).graphql);
  assert.deepEqual([result.status, codeOf(result)], [503, "unavailable"]);

  result = await send(fakeDatabase(), fakeShopify({ userErrors: [{ message: "no" }] }).graphql);
  assert.deepEqual([result.status, codeOf(result)], [502, "checkout_refused"]);
});

test("says unavailable when the database fails", async () => {
  const broken = {
    basket: {
      findUnique: async () => {
        throw new Error("down");
      },
    },
  };
  const result = await send(broken, neverCalled);
  assert.deepEqual([result.status, codeOf(result)], [503, "unavailable"]);
});

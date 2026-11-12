import assert from "node:assert/strict";
import { test } from "node:test";
import { handleBasketRequest } from "../../app/basket/basket-request.server.js";

const TOKEN = "a".repeat(43);
const LINE = "11111111-1111-1111-1111-111111111111";
const ADD = { action: "add", token: TOKEN, product: "1", variant: "2", choices: [] };

const forbidden = (name) => new Proxy({}, { get: () => assert.fail(`${name} should not be used`) });
const neverCalled = async () => assert.fail("Shopify should not be called");

const send = (body, { db = forbidden("database"), graphql = neverCalled } = {}) =>
  handleBasketRequest({
    db,
    graphql,
    shop: "test.myshopify.com",
    rawBody: typeof body === "string" ? body : JSON.stringify(body),
  });

const codeOf = (result) => result.body.errors[0].code;

test("refuses malformed requests before reaching Shopify or the database", async () => {
  const bad = [
    "not json",
    "null",
    "[]",
    "x".repeat(5000),
    {},
    { action: "view" },
    { action: "view", token: "short" },
    { action: "view", token: 12345 },
    { action: "unknown", token: TOKEN },
    { ...ADD, token: "short" },
    { ...ADD, product: 1 },
    { ...ADD, product: "abc" },
    { ...ADD, variant: ["2"] },
    { ...ADD, choices: "17020886" },
    { ...ADD, choices: ["bad id"] },
    { action: "set_quantity", token: TOKEN, line: "bad", quantity: 1 },
    { action: "remove", token: TOKEN },
    { action: "replace", token: TOKEN, line: "bad", variant: "2", choices: [] },
    { action: "replace", line: LINE, variant: "2", choices: [] },
  ];
  for (const body of bad) {
    const result = await send(body);
    assert.equal(result.status, 400, JSON.stringify(body).slice(0, 80));
    assert.equal(codeOf(result), "bad_request");
  }
});

test("refuses a bad quantity before asking Shopify", async () => {
  for (const quantity of [0, 100, 1.5, "2"]) {
    assert.equal(codeOf(await send({ ...ADD, quantity })), "invalid_quantity");
    assert.equal(codeOf(await send({ action: "set_quantity", token: TOKEN, line: LINE, quantity })), "invalid_quantity");
  }
});

test("saves nothing when Shopify cannot supply the price", async () => {
  const failing = async () => {
    throw new Error("network");
  };
  const result = await send(ADD, { graphql: failing });
  assert.equal(result.status, 502);
  assert.equal(codeOf(result), "unavailable");
});

test("an unknown token views as an empty basket", async () => {
  const db = { basket: { findUnique: async () => null } };
  const { status, body } = await send({ action: "view", token: TOKEN }, { db });
  assert.equal(status, 200);
  assert.deepEqual(body, { ok: true, version: 0, lines: [], totalCents: 0 });
});

test("a database failure is reported without details", async () => {
  const db = {
    basket: {
      findUnique: async () => {
        throw Object.assign(new Error("secret connection detail"), { code: "P1001" });
      },
    },
  };
  const { status, body } = await send({ action: "view", token: TOKEN }, { db });
  assert.equal(status, 503);
  assert.deepEqual(body, { ok: false, errors: [{ code: "unavailable" }] });
});

test("an edit prices the saved line's product, whatever product the request names", async () => {
  const saved = { id: LINE, productId: "111", variantId: "gid://shopify/ProductVariant/2", selection: [] };
  const db = { basket: { findUnique: async () => ({ version: 1, lines: [saved] }) } };
  let asked;
  const graphql = async (_query, { variables }) => {
    asked = variables.id;
    throw new Error("stop here");
  };
  const result = await send({ action: "replace", token: TOKEN, line: LINE, product: "999", variant: "2", choices: [] }, { db, graphql });
  assert.equal(asked, "gid://shopify/Product/111");
  assert.equal(codeOf(result), "unavailable");
});

test("an edit of a line that is not in the basket is refused before asking Shopify", async () => {
  const db = { basket: { findUnique: async () => ({ version: 1, lines: [] }) } };
  const result = await send({ action: "replace", token: TOKEN, line: LINE, variant: "2", choices: [] }, { db });
  assert.equal(result.status, 404);
  assert.equal(codeOf(result), "line_not_found");
});

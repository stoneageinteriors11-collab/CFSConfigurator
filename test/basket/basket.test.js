import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_LINE_QUANTITY,
  addLine,
  configurationKey,
  hashToken,
  newBasketToken,
  setLineQuantity,
} from "../../app/basket/basket.server.js";

const quote = (choiceIds, variantId = "v1") => ({
  ok: true,
  variantId,
  lines: choiceIds.map((choiceId) => ({ choiceId })),
});

const noDatabase = new Proxy({}, { get: () => assert.fail("the database should not be used") });
const ref = { shop: "test.myshopify.com", token: "token" };

test("tokens are long, random and never stored as written", () => {
  const token = newBasketToken();
  assert.ok(token.length >= 43);
  assert.notEqual(token, newBasketToken());
  assert.match(hashToken(token), /^[0-9a-f]{64}$/);
  assert.notEqual(hashToken(token), token);
  assert.equal(hashToken(token), hashToken(token));
});

test("the same choices give the same key in any order", () => {
  assert.equal(configurationKey(quote(["a", "b"])), configurationKey(quote(["b", "a"])));
});

test("different choices or variants give different keys", () => {
  const key = configurationKey(quote(["a", "b"]));
  assert.notEqual(key, configurationKey(quote(["a", "c"])));
  assert.notEqual(key, configurationKey(quote(["a", "b"], "v2")));
});

test("refuses a bad quantity before touching the database", async () => {
  for (const quantity of [0, -1, 1.5, "2", null, MAX_LINE_QUANTITY + 1]) {
    assert.deepEqual(
      await addLine(noDatabase, ref, { productId: "1", quote: quote([]), quantity }),
      { ok: false, code: "invalid_quantity" },
    );
    assert.deepEqual(await setLineQuantity(noDatabase, ref, "line", quantity), {
      ok: false,
      code: "invalid_quantity",
    });
  }
});

test("refuses a selection that failed validation", async () => {
  assert.deepEqual(
    await addLine(noDatabase, ref, { productId: "1", quote: { ok: false, errors: [] } }),
    { ok: false, code: "invalid_quote" },
  );
});

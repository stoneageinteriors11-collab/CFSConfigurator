import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_LINE_QUANTITY,
  addLine,
  configurationKey,
  hashToken,
  newBasketToken,
  replaceLine,
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

// A basket held in memory, answering only the calls replaceLine makes.
function memoryBasket(lines) {
  const basket = { id: "b1", shop: ref.shop, tokenHash: hashToken(ref.token), version: 1 };
  const owns = (where) => where.basket.shop === basket.shop && where.basket.tokenHash === basket.tokenHash;
  const tx = {
    basket: {
      updateMany: async () => (basket.version++, { count: 1 }),
      findUnique: async () => ({ ...basket, lines: lines.map((l) => ({ ...l })) }),
    },
    basketLine: {
      findFirst: async ({ where }) => (owns(where) && lines.find((l) => l.id === where.id)) || null,
      findUnique: async ({ where: { basketId_configurationKey: k } }) =>
        lines.find((l) => l.basketId === k.basketId && l.configurationKey === k.configurationKey) || null,
      update: async ({ where, data }) => Object.assign(lines.find((l) => l.id === where.id), data),
      delete: async ({ where }) => lines.splice(lines.findIndex((l) => l.id === where.id), 1),
    },
  };
  return { $transaction: (fn) => fn(tx), lines };
}

const line = (id, choiceIds, quantity) => ({
  id,
  basketId: "b1",
  configurationKey: configurationKey(quote(choiceIds)),
  quantity,
  unitCents: 100,
});
const priced = (choiceIds, totalCents, variantId) => ({ ...quote(choiceIds, variantId), totalCents });

test("editing a line changes its configuration and price but keeps its quantity and place", async () => {
  const db = memoryBasket([line("l1", ["a"], 3), line("l2", ["c"], 1)]);
  const result = await replaceLine(db, ref, "l1", priced(["b"], 250, "v2"));
  assert.equal(result.ok, true);
  assert.deepEqual(result.basket.lines.map((l) => [l.id, l.quantity, l.unitCents, l.variantId]), [
    ["l1", 3, 250, "v2"],
    ["l2", 1, 100, undefined],
  ]);
  assert.equal(db.lines[0].configurationKey, configurationKey(quote(["b"], "v2")));
});

test("editing a line into a configuration already in the basket joins the two", async () => {
  const db = memoryBasket([line("l1", ["a"], 2), line("l2", ["b"], 3)]);
  const result = await replaceLine(db, ref, "l1", priced(["b"], 300));
  assert.deepEqual(result.basket.lines.map((l) => [l.id, l.quantity, l.unitCents]), [["l2", 5, 300]]);
});

test("an edit that leaves the configuration unchanged only refreshes its price", async () => {
  const db = memoryBasket([line("l1", ["a"], 2)]);
  const result = await replaceLine(db, ref, "l1", priced(["a"], 120));
  assert.deepEqual(result.basket.lines.map((l) => [l.id, l.quantity, l.unitCents]), [["l1", 2, 120]]);
});

test("an edit is refused for a missing line, an over-full join or a failed quote, and changes nothing", async () => {
  const db = memoryBasket([line("l1", ["a"], 60), line("l2", ["b"], 40)]);
  assert.deepEqual(await replaceLine(db, ref, "nope", priced(["b"], 1)), { ok: false, code: "line_not_found" });
  assert.deepEqual(await replaceLine(db, ref, "l1", priced(["b"], 1)), { ok: false, code: "invalid_quantity" });
  assert.deepEqual(await replaceLine(noDatabase, ref, "l1", { ok: false, errors: [] }), { ok: false, code: "invalid_quote" });
  assert.deepEqual(db.lines.map((l) => [l.id, l.quantity, l.unitCents]), [["l1", 60, 100], ["l2", 40, 100]]);
});

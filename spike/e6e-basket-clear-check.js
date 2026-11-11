// E6e check before deploying, in a transaction that is always rolled back. Leaves nothing behind.
// 1. A test basket: the paid quantities leave it, and an item added after checkout stays.
// 2. Real order #1030 saved through the full path empties its basket's paid lines in the same transaction.
// Usage: node --env-file=.env spike/e6e-basket-clear-check.js
import assert from "node:assert/strict";
import process from "node:process";
import { PrismaClient } from "@prisma/client";
import { removePaidLines } from "../app/basket/basket.server.js";
import { saveOrderSnapshot } from "../app/orders/save-snapshot.server.js";
import { STORE, read } from "./lib.js";

const ORDER_1030 = "gid://shopify/Order/8378072465747";
const ROLLBACK = new Error("rollback");
const graphql = async (query, { variables }) => ({ json: async () => ({ data: read(query, variables) }) });
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });
const results = [];
const pass = (name) => results.push(`pass: ${name}`);

const line = (basketId, key, quantity) => ({
  basketId,
  configurationKey: key,
  productId: "1",
  variantId: `gid://shopify/ProductVariant/${key}`,
  sku: key,
  quantity,
  baseCents: 100,
  unitCents: 100,
});

try {
  const before = { snapshots: await prisma.orderSnapshot.count(), baskets: await prisma.basket.count() };
  await prisma.$transaction(
    async (tx) => {
      const basket = await tx.basket.create({ data: { shop: STORE, tokenHash: "e6e-check" } });
      const bed = await tx.basketLine.create({ data: line(basket.id, "bed", 3) });
      const mattress = await tx.basketLine.create({ data: line(basket.id, "mattress", 1) });
      const later = await tx.basketLine.create({ data: line(basket.id, "later", 1) });
      const attempt = {
        basketId: basket.id,
        lines: [{ lineId: bed.id, quantity: 2 }, { lineId: mattress.id, quantity: 1 }],
      };

      assert.equal(await removePaidLines(tx, attempt), 2);
      const left = await tx.basketLine.findMany({ where: { basketId: basket.id }, orderBy: { sku: "asc" } });
      assert.deepEqual(left.map((l) => [l.id, l.quantity]), [[bed.id, 1], [later.id, 1]]);
      assert.equal((await tx.basket.findUnique({ where: { id: basket.id } })).version, 2);
      pass("paid bed quantity taken off, paid mattress removed, later item kept, version raised");

      assert.equal(await removePaidLines(tx, { basketId: null, lines: attempt.lines }), 0);
      assert.equal(await removePaidLines(tx, { basketId: "no-such-basket", lines: attempt.lines }), 0);
      pass("a checkout with no basket left changes nothing");

      // saveOrderSnapshot opens its own transaction; here it joins this one so everything rolls back.
      const db = new Proxy(tx, { get: (target, key) => (key === "$transaction" ? (work) => work(target) : target[key]) });
      const paid = await tx.checkoutAttempt.findUnique({ where: { id: "5fc5b5f7-fa9f-4366-b311-15d332c5f360" } });
      assert.ok(paid.basketId, "#1030's checkout still has its basket");
      const paidLineIds = paid.lines.map((l) => l.lineId);
      const heldBefore = await tx.basketLine.findMany({ where: { basketId: paid.basketId, id: { in: paidLineIds } } });
      assert.deepEqual(await saveOrderSnapshot({ db, graphql, shop: STORE, orderId: ORDER_1030 }), {
        outcome: "saved",
        matchStatus: "matched",
      });
      const heldAfter = await tx.basketLine.findMany({ where: { basketId: paid.basketId, id: { in: paidLineIds } } });
      const quantity = (lines, id) => lines.find((l) => l.id === id)?.quantity ?? 0;
      for (const paidLine of paid.lines) {
        assert.equal(quantity(heldAfter, paidLine.lineId), Math.max(quantity(heldBefore, paidLine.lineId) - paidLine.quantity, 0));
      }
      pass(`#1030 saved and its paid lines left its basket (held ${heldBefore.length} of them before)`);
      throw ROLLBACK;
    },
    { timeout: 120000, maxWait: 20000 },
  ).catch((error) => {
    if (error !== ROLLBACK) throw error;
  });

  const after = { snapshots: await prisma.orderSnapshot.count(), baskets: await prisma.basket.count() };
  assert.deepEqual(after, before);
  console.log(results.join("\n"));
  console.log(`database unchanged: ${after.snapshots} records, ${after.baskets} baskets`);
} catch (error) {
  console.log(results.join("\n"));
  console.log(`FAILED: ${String(error.message).slice(0, 400)}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

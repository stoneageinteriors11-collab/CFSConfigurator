// E6f check before deploying, in a transaction that is always rolled back. Leaves nothing behind.
// The new table is created inside the transaction, so it disappears with it.
// 1. The real order search returns only orders changed since the date asked for.
// 2. With #1032's record removed, as if its paid notification had been missed, the catch-up
//    saves it again, matched, with the same specification as the original.
// 3. A second run straight after finds nothing to do.
// Usage: node --env-file=.env spike/e6f-recovery-check.js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import process from "node:process";
import { PrismaClient } from "@prisma/client";
import { recoverOrders } from "../app/orders/recover-orders.server.js";
import { STORE, read } from "./lib.js";

const ROLLBACK = new Error("rollback");
const MIGRATION = readFileSync(new URL("../prisma/migrations/20261111120000_create_order_recovery/migration.sql", import.meta.url), "utf8");
const graphql = async (query, { variables }) => ({ json: async () => ({ data: read(query, variables) }) });
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });
const results = [];
const pass = (name) => results.push(`pass: ${name}`);

try {
  const { orders } = read(`query { orders(first: 1, query: "name:#1032") { nodes { id updatedAt } } }`);
  const order1032 = orders.nodes[0];
  assert.ok(order1032, "#1032 found");

  const before = { snapshots: await prisma.orderSnapshot.count(), baskets: await prisma.basket.count() };
  await prisma.$transaction(
    async (tx) => {
      for (const statement of MIGRATION.split(";").map((s) => s.trim()).filter(Boolean)) {
        await tx.$executeRawUnsafe(statement.replace(/^--.*$/gm, ""));
      }

      const original = await tx.orderSnapshot.findUnique({ where: { shop_orderId: { shop: STORE, orderId: order1032.id } } });
      assert.ok(original, "#1032 has a record to start with");
      await tx.orderSnapshot.delete({ where: { id: original.id } });

      // Start the search just before #1032 last changed, so the check is quick.
      const since = new Date(new Date(order1032.updatedAt).getTime() - 60 * 1000);
      await tx.orderRecovery.create({ data: { shop: STORE, checkedUntil: new Date(since.getTime() + 10 * 60 * 1000) } });

      const db = new Proxy(tx, { get: (target, key) => (key === "$transaction" ? (work) => work(target) : target[key]) });
      const listed = read(
        `query($q: String!) { orders(first: 50, sortKey: UPDATED_AT, query: $q) { nodes { id updatedAt } } }`,
        { q: `updated_at:>='${since.toISOString()}'` },
      ).orders.nodes;
      assert.ok(listed.some((o) => o.id === order1032.id), "#1032 listed");
      assert.ok(listed.every((o) => new Date(o.updatedAt) >= since), "only orders changed since then");
      pass(`order search by update time works (${listed.length} orders since ${since.toISOString()})`);

      const now = new Date();
      const first = await recoverOrders({ db, graphql, shop: STORE, now });
      assert.equal(first.failed, 0);
      assert.ok(first.saved >= 1 && first.complete);
      const restored = await tx.orderSnapshot.findUnique({ where: { shop_orderId: { shop: STORE, orderId: order1032.id } } });
      assert.equal(restored.matchStatus, "matched");
      assert.equal(restored.attemptId, original.attemptId);
      assert.equal(restored.financialStatus, original.financialStatus);
      assert.deepEqual(restored.specification, original.specification);
      assert.deepEqual((await tx.orderRecovery.findUnique({ where: { shop: STORE } })).checkedUntil, now);
      pass(`#1032 rebuilt, matched, same specification (checked ${first.checked}, saved ${first.saved})`);

      const second = await recoverOrders({ db, graphql, shop: STORE });
      assert.equal(second.saved + second.updated + second.failed, 0);
      pass(`a second run straight after changes nothing (checked ${second.checked})`);
      throw ROLLBACK;
    },
    { timeout: 180000, maxWait: 20000 },
  ).catch((error) => {
    if (error !== ROLLBACK) throw error;
  });

  const after = { snapshots: await prisma.orderSnapshot.count(), baskets: await prisma.basket.count() };
  assert.deepEqual(after, before);
  const table = await prisma.$queryRawUnsafe(`SELECT to_regclass('"OrderRecovery"')::text AS name`);
  assert.equal(table[0].name, null);
  console.log(results.join("\n"));
  console.log(`database unchanged: ${after.snapshots} records, ${after.baskets} baskets, no new table`);
} catch (error) {
  console.log(results.join("\n"));
  console.log(`FAILED: ${String(error.message).slice(0, 400)}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

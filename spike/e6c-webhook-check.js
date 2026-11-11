// E6c checks before deploying. Leaves nothing saved.
// 1. Saves real order #1030 into Supabase inside a transaction that is always rolled back.
// 2. Sends paid notifications to a locally running app: unsigned and wrongly signed ones must be
//    refused, and a signed one for an order that does not exist must be answered without saving.
// Usage: node --env-file=.env spike/e6c-webhook-check.js <port>
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import process from "node:process";
import { PrismaClient } from "@prisma/client";
import { saveOrderSnapshot } from "../app/orders/save-snapshot.server.js";
import { STORE, read } from "./lib.js";

const port = process.argv[2];
const ORDER_1030 = "gid://shopify/Order/8378072465747";
const ROLLBACK = new Error("rollback");
const graphql = async (query, { variables }) => ({ json: async () => ({ data: read(query, variables) }) });

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });
const results = [];
const pass = (name) => results.push(`pass: ${name}`);

async function databaseCheck() {
  await prisma.$transaction(
    async (tx) => {
      const first = await saveOrderSnapshot({ db: tx, graphql, shop: STORE, orderId: ORDER_1030 });
      assert.deepEqual(first, { outcome: "saved", matchStatus: "matched" });
      pass("#1030 saved and matched to its checkout");

      const again = await saveOrderSnapshot({ db: tx, graphql, shop: STORE, orderId: ORDER_1030 });
      assert.deepEqual(again, { outcome: "already_saved" });
      assert.equal(await tx.orderSnapshot.count({ where: { orderId: ORDER_1030 } }), 1);
      pass("repeat notification left one record");

      const row = await tx.orderSnapshot.findFirst({ where: { orderId: ORDER_1030 }, include: { attempt: true } });
      assert.equal(row.orderName, "#1030");
      assert.equal(row.financialStatus, "PAID");
      assert.equal(row.attempt.totalCents, 123898);
      assert.equal(row.specification.totals.totalCents, 123898);
      assert.equal(row.specification.lines[0].configuration.options[0].cfsId, "17020886");
      pass("saved record reads back with its checkout and options");

      await tx.$executeRawUnsafe("SAVEPOINT change");
      await assert.rejects(
        tx.orderSnapshot.update({ where: { id: row.id }, data: { specification: { changed: true } } }),
      );
      await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT change");
      pass("saved specification cannot be changed");
      throw ROLLBACK;
    },
    { timeout: 120000, maxWait: 20000 },
  ).catch((error) => {
    if (error !== ROLLBACK) throw error;
  });
}

function notify(body, { sign = true, secret = process.env.SHOPIFY_API_SECRET } = {}) {
  const raw = JSON.stringify(body);
  const headers = {
    "Content-Type": "application/json",
    "X-Shopify-Topic": "orders/paid",
    "X-Shopify-Shop-Domain": STORE,
    "X-Shopify-API-Version": "2026-10",
    "X-Shopify-Webhook-Id": randomUUID(),
    "X-Shopify-Event-Id": randomUUID(),
    "X-Shopify-Triggered-At": new Date().toISOString(),
  };
  if (sign) headers["X-Shopify-Hmac-Sha256"] = createHmac("sha256", secret).update(raw).digest("base64");
  return fetch(`http://localhost:${port}/webhooks/orders/paid`, { method: "POST", headers, body: raw });
}

async function webhookCheck() {
  const missing = { id: 1, admin_graphql_api_id: "gid://shopify/Order/1" };
  // Shopify's library answers 400 when the signature header is missing, 401 when it is wrong.
  assert.equal((await notify(missing, { sign: false })).status, 400);
  pass("unsigned notification refused");
  assert.equal((await notify(missing, { secret: "wrong" })).status, 401);
  pass("wrongly signed notification refused");
  assert.equal((await notify(missing)).status, 200);
  pass("signed notification for an unknown order answered, read from Shopify with stored access");
  assert.equal((await notify({ id: 1 })).status, 200);
  pass("signed notification naming no order answered");
}

try {
  const before = await prisma.orderSnapshot.count();
  await databaseCheck();
  if (port) await webhookCheck();
  const after = await prisma.orderSnapshot.count();
  assert.equal(after, before);
  console.log(results.join("\n"));
  console.log(`records saved: ${after}`);
} catch (error) {
  console.log(results.join("\n"));
  console.log(`FAILED: ${String(error.message).slice(0, 400)}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

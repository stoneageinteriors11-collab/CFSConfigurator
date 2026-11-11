// E6d checks before deploying. Leaves the database as it was.
// 1. In a transaction that is always rolled back: real #1027 (a configured bed bought without the
//    app) is saved for staff, and #1031's record follows a status change while its specification stays.
// 2. Sends signed cancellation and refund notifications to a locally running app. #1031 is unchanged
//    in Shopify, so its record is read but not written.
// Usage: node --env-file=.env spike/e6d-status-check.js <port>
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import process from "node:process";
import { PrismaClient } from "@prisma/client";
import { saveOrderSnapshot } from "../app/orders/save-snapshot.server.js";
import { updateOrderStatus } from "../app/orders/order-status.server.js";
import { STORE, read } from "./lib.js";

const port = process.argv[2];
const ORDER_1027 = "gid://shopify/Order/8372053016915";
const ORDER_1031 = "gid://shopify/Order/8381011231059";
const ROLLBACK = new Error("rollback");
const graphql = async (query, { variables }) => ({ json: async () => ({ data: read(query, variables) }) });

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });
const results = [];
const pass = (name) => results.push(`pass: ${name}`);

async function databaseCheck() {
  await prisma.$transaction(
    async (tx) => {
      const bypass = await saveOrderSnapshot({ db: tx, graphql, shop: STORE, orderId: ORDER_1027 });
      assert.deepEqual(bypass, { outcome: "saved", matchStatus: "no_attempt" });
      const row = await tx.orderSnapshot.findFirst({ where: { orderId: ORDER_1027 } });
      assert.deepEqual(row.specification.lines.map((l) => [l.sku, l.configurable]), [
        ["CFS-TYPE-146477-17019157", true],
        ["TEST-EOC-S", false],
      ]);
      pass("#1027 bed bought without the app saved for staff, mattress marked ordinary");

      const before = await tx.orderSnapshot.findFirst({ where: { orderId: ORDER_1031 } });
      assert.equal(before.financialStatus, "PAID");
      assert.deepEqual(await updateOrderStatus({ db: tx, graphql, shop: STORE, orderId: ORDER_1031 }), {
        outcome: "unchanged",
        financialStatus: "PAID",
      });
      pass("#1031 status read from Shopify, nothing new to write");

      await tx.orderSnapshot.update({ where: { id: before.id }, data: { financialStatus: "PENDING" } });
      assert.deepEqual(await updateOrderStatus({ db: tx, graphql, shop: STORE, orderId: ORDER_1031 }), {
        outcome: "updated",
        financialStatus: "PAID",
      });
      const after = await tx.orderSnapshot.findFirst({ where: { orderId: ORDER_1031 } });
      assert.equal(after.financialStatus, "PAID");
      assert.deepEqual(after.specification, before.specification);
      pass("#1031 status corrected from Shopify, specification untouched");
      throw ROLLBACK;
    },
    { timeout: 120000, maxWait: 20000 },
  ).catch((error) => {
    if (error !== ROLLBACK) throw error;
  });
}

function notify(topic, body, { secret = process.env.SHOPIFY_API_SECRET } = {}) {
  const raw = JSON.stringify(body);
  return fetch(`http://localhost:${port}/webhooks/orders/status`, {
    method: "POST",
    body: raw,
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Topic": topic,
      "X-Shopify-Shop-Domain": STORE,
      "X-Shopify-API-Version": "2026-10",
      "X-Shopify-Webhook-Id": randomUUID(),
      "X-Shopify-Event-Id": randomUUID(),
      "X-Shopify-Triggered-At": new Date().toISOString(),
      "X-Shopify-Hmac-Sha256": createHmac("sha256", secret).update(raw).digest("base64"),
    },
  });
}

async function webhookCheck() {
  assert.equal((await notify("refunds/create", { order_id: 8381011231059 }, { secret: "wrong" })).status, 401);
  pass("wrongly signed refund notification refused");
  assert.equal((await notify("orders/cancelled", { admin_graphql_api_id: ORDER_1031 })).status, 200);
  pass("signed cancellation for #1031 answered");
  assert.equal((await notify("refunds/create", { order_id: 8381011231059, admin_graphql_api_id: "gid://shopify/Refund/1" })).status, 200);
  pass("signed refund for #1031 answered");
  assert.equal((await notify("refunds/create", { order_id: 1 })).status, 200);
  pass("signed refund for an order without a record answered");
}

try {
  const before = await prisma.orderSnapshot.findMany({ orderBy: { id: "asc" } });
  await databaseCheck();
  if (port) await webhookCheck();
  const after = await prisma.orderSnapshot.findMany({ orderBy: { id: "asc" } });
  assert.deepEqual(after, before);
  console.log(results.join("\n"));
  console.log(`records: ${after.length}, unchanged`);
} catch (error) {
  console.log(results.join("\n"));
  console.log(`FAILED: ${String(error.message).slice(0, 400)}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

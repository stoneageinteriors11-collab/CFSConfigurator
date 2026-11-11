// E6b: builds order records from real paid test orders, reading only. Nothing is saved.
// Usage: node --env-file=.env spike/e6b-specification-check.js
import assert from "node:assert/strict";
import process from "node:process";
import { PrismaClient } from "@prisma/client";
import { attemptIdOf, buildSnapshot, readOrder } from "../app/orders/specification.server.js";
import { STORE, read } from "./lib.js";

// #1029 and #1030 came from app checkouts; #1027 and #1028 were made by hand in Part B.
const ORDERS = {
  "#1029": { id: "gid://shopify/Order/8377374769491", expect: "matched", totalCents: 472992 },
  "#1030": { id: "gid://shopify/Order/8378072465747", expect: "matched", totalCents: 123898 },
  "#1027": { id: "gid://shopify/Order/8372053016915", expect: "no_attempt" },
  "#1028": { id: "gid://shopify/Order/8372373225811", expect: "no_attempt" },
};

const graphql = async (query, { variables }) => ({ json: async () => ({ data: read(query, variables) }) });
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });
const pounds = (cents) => `£${(cents / 100).toFixed(2)}`;

try {
  for (const [name, { id, expect, totalCents }] of Object.entries(ORDERS)) {
    const order = await readOrder(graphql, id);
    assert.equal(order.name, name);
    const attemptId = attemptIdOf(order);
    const attempt = attemptId ? await prisma.checkoutAttempt.findFirst({ where: { id: attemptId, shop: STORE } }) : null;
    const snapshot = buildSnapshot(order, attempt);
    const { specification: spec } = snapshot;

    assert.equal(snapshot.matchStatus, expect, `${name} match`);
    assert.equal(spec.totals.totalCents, spec.totals.subtotalCents + spec.totals.shippingCents + (spec.order.taxesIncluded ? 0 : spec.totals.taxCents), `${name} totals add up`);
    assert.equal(spec.totals.beforeDiscountsCents - spec.totals.discountCents, spec.lines.reduce((sum, l) => sum + l.totalCents, 0), `${name} lines add up`);
    if (totalCents !== undefined) {
      assert.equal(attempt.totalCents, totalCents);
      assert.equal(spec.totals.beforeDiscountsCents, totalCents, `${name} matches the app's price`);
    }
    JSON.parse(JSON.stringify(spec));

    console.log(`\n${name} ${snapshot.financialStatus} ${snapshot.matchStatus}${attempt ? ` (checkout ${attempt.id.slice(0, 8)})` : ""}`);
    for (const line of spec.lines) {
      console.log(`  ${line.quantity} x ${line.sku} ${line.variantTitle} @ ${pounds(line.unitCents)}, after discounts ${pounds(line.totalCents)}`);
      if (line.configuration) {
        console.log(`    base ${pounds(line.configuration.baseCents)}`);
        for (const o of line.configuration.options) console.log(`    ${o.group}: ${o.label} [CFS ${o.cfsId} / ${o.assignmentId}] +${pounds(o.cents)}`);
      } else if (line.attributes.length) {
        console.log(`    notes: ${line.attributes.map((a) => `${a.key}=${a.value}`).join(", ")}`);
      }
      for (const d of line.discounts) console.log(`    discount #${d.discount}: -${pounds(d.cents)}`);
    }
    for (const d of spec.discounts) console.log(`  discount #${d.index}: ${d.type} ${d.title ?? d.code} ${JSON.stringify(d.value)}`);
    const t = spec.totals;
    console.log(`  before discounts ${pounds(t.beforeDiscountsCents)}, discounts ${pounds(t.discountCents)}, shipping ${pounds(t.shippingCents)}, tax ${pounds(t.taxCents)}, total ${pounds(t.totalCents)}`);
  }
  const saved = await prisma.orderSnapshot.count();
  console.log(`\nsnapshots in database: ${saved}`);
  assert.equal(saved, 0);
  console.log("pass: all four orders");
} catch (error) {
  console.log(`FAILED: ${String(error.message).slice(0, 400)}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

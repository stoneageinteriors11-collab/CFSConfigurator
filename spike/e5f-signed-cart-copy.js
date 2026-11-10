// E5f: sends signed checkout requests with a Shopify cart to a locally running app.
// Uses the real database and live Shopify reads. Every case stops before a draft is made,
// so nothing is written to the store. Deletes every basket it creates.
// Usage: node --env-file=.env spike/e5f-signed-cart-copy.js <port>
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import process from "node:process";
import { PrismaClient } from "@prisma/client";
import { hashToken } from "../app/basket/basket.server.js";

const port = process.argv[2];
const SHOP = "urban-deco-dev.myshopify.com";
const MATTRESS = { product: "11057927913811", variant: "55724611273043" };
const BED = { product: "11067852980563", variant: "55773143433555" };

function signedUrl(path) {
  const all = { shop: SHOP, path_prefix: "/apps/cfs", timestamp: String(Math.floor(Date.now() / 1000)) };
  const message = Object.keys(all).sort().map((key) => `${key}=${all[key]}`).join("");
  const signature = createHmac("sha256", process.env.SHOPIFY_API_SECRET).update(message).digest("hex");
  return `http://localhost:${port}/proxy/${path}?${new URLSearchParams({ ...all, signature })}`;
}

async function post(path, body) {
  const response = await fetch(signedUrl(path), { method: "POST", body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}

const codeOf = (result) => result.body.errors?.[0]?.code;
const mattressLine = (result) => result.body.lines.find((l) => l.sku === "TEST-EOC-S");

const prisma = new PrismaClient();
const tokens = [];
const results = [];
const pass = (name) => results.push(`pass: ${name}`);
const attemptsBefore = await prisma.checkoutAttempt.count();

try {
  const added = await post("basket", { action: "add", ...BED, choices: ["17020886", "17020903"] });
  assert.equal(added.status, 200);
  const { token } = added.body;
  tokens.push(token);
  const checkout = (cart) => post("checkout", { token, cart });

  let result = await checkout([{ ...MATTRESS, quantity: "2" }]);
  assert.deepEqual([result.status, codeOf(result)], [400, "bad_request"]);
  pass("a malformed cart is refused");

  result = await checkout([{ ...MATTRESS, quantity: 25 }]);
  assert.deepEqual([result.status, codeOf(result)], [409, "review_basket"]);
  assert.equal(result.body.problems[0].code, "insufficient_stock");
  assert.equal(result.body.problems[0].line, mattressLine(result).id);
  assert.equal(mattressLine(result).quantity, 25);
  assert.equal(mattressLine(result).unitCents, 14900);
  assert.equal(result.body.totalCents, 108998 + 25 * 14900);
  const { version } = result.body;
  pass("a cart item is copied at the real Shopify price, and the real stock is checked");

  result = await checkout([{ ...MATTRESS, quantity: 25 }]);
  assert.equal(result.body.version, version);
  pass("the same cart again does not change the basket version");

  result = await checkout([{ ...MATTRESS, quantity: 20 }]);
  assert.equal(mattressLine(result).quantity, 20);
  assert.equal(result.body.version, version + 1);
  pass("a changed quantity replaces the copy rather than adding to it");

  result = await checkout([{ product: MATTRESS.product, variant: "1", quantity: 1 }]);
  assert.deepEqual(result.body.problems, [{ variant: "1", code: "unknown_variant" }]);
  assert.equal(mattressLine(result).quantity, 20);
  pass("an item that cannot be sold is named and the basket is left alone");

  result = await checkout([{ ...BED, quantity: 1 }]);
  assert.equal(codeOf(result), "review_basket");
  assert.ok(["missing_required", "not_ordinary"].includes(result.body.problems[0].code), result.body.problems[0].code);
  pass(`a configured product in Shopify's cart is refused (${result.body.problems[0].code})`);

  for (const line of result.body.lines.filter((l) => l.selection.length > 0)) {
    await post("basket", { action: "remove", token, line: line.id });
  }
  result = await checkout([{ ...MATTRESS, quantity: 1 }]);
  assert.deepEqual([result.status, codeOf(result)], [422, "empty_basket"]);
  pass("ordinary items are not checked out through the app on their own");

  assert.equal(await prisma.checkoutAttempt.count(), attemptsBefore);
  pass("none of these created a checkout attempt");
} catch (error) {
  console.log(results.join("\n"));
  console.log(`FAILED: ${String(error.message).split("\n").slice(0, 3).join(" ")}`.slice(0, 400));
  process.exitCode = 1;
} finally {
  await prisma.basket.deleteMany({ where: { shop: SHOP, tokenHash: { in: tokens.map(hashToken) } } });
  if (!process.exitCode) console.log(results.join("\n"));
  await prisma.$disconnect();
}

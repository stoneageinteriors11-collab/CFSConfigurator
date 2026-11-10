// E5d: sends signed checkout requests to a locally running app, the way Shopify's app proxy signs them.
// Covers every path except creating a draft, so nothing is written to the store.
// Deletes every basket it creates. Usage: node --env-file=.env spike/e5d-signed-checkout.js <port>
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import process from "node:process";
import { PrismaClient } from "@prisma/client";
import { hashToken } from "../app/basket/basket.server.js";

const port = process.argv[2];
const SECRET = process.env.SHOPIFY_API_SECRET;
const SHOP = "urban-deco-dev.myshopify.com";
const FAKE_TOKEN = "z".repeat(43);

function signedUrl(path, { secret = SECRET, timestamp = Math.floor(Date.now() / 1000) } = {}) {
  const all = { shop: SHOP, path_prefix: "/apps/cfs", timestamp: String(timestamp) };
  const message = Object.keys(all).sort().map((key) => `${key}=${all[key]}`).join("");
  const signature = createHmac("sha256", secret).update(message).digest("hex");
  return `http://localhost:${port}/proxy/${path}?${new URLSearchParams({ ...all, signature })}`;
}

async function post(path, body, options) {
  const response = await fetch(signedUrl(path, options), { method: "POST", body: JSON.stringify(body) });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return { status: response.status, body: json, cache: response.headers.get("cache-control") };
}

const checkout = (token, options) => post("checkout", { token }, options);
const codeOf = (result) => result.body?.errors?.[0]?.code;

const prisma = new PrismaClient();
const tokens = [];
const results = [];
const pass = (name) => results.push(`pass: ${name}`);
const attemptsBefore = await prisma.checkoutAttempt.count();

try {
  assert.equal((await checkout(FAKE_TOKEN, { secret: "wrong" })).status, 400);
  assert.equal((await checkout(FAKE_TOKEN, { timestamp: Math.floor(Date.now() / 1000) - 3600 })).status, 400);
  const unsigned = await fetch(`http://localhost:${port}/proxy/checkout`, { method: "POST", body: JSON.stringify({ token: FAKE_TOKEN }) });
  assert.equal(unsigned.status, 400);
  pass("wrong secret, old timestamp and unsigned requests are refused");

  let result = await checkout("short");
  assert.deepEqual([result.status, codeOf(result)], [400, "bad_request"]);
  pass("a malformed token is refused");

  result = await checkout(FAKE_TOKEN);
  assert.deepEqual([result.status, codeOf(result), result.cache], [404, "basket_not_found", "no-store"]);
  pass("an unknown basket is refused");

  const added = await post("basket", {
    action: "add", product: "11067852980563", variant: "55773143433555", choices: ["17020886", "17020903"],
  });
  assert.equal(added.status, 200);
  const { token } = added.body;
  tokens.push(token);
  const bedLine = added.body.lines[0].id;

  await prisma.basketLine.update({ where: { id: bedLine }, data: { unitCents: 1, baseCents: 1 } });
  result = await checkout(token);
  assert.deepEqual([result.status, codeOf(result)], [409, "review_basket"]);
  assert.equal(result.body.problems[0].code, "price_changed");
  assert.equal(result.body.problems[0].previousUnitCents, 1);
  assert.equal(result.body.problems[0].unitCents, 108998);
  assert.equal(result.body.problems[0].quote, undefined);
  assert.equal(result.body.totalCents, 108998);
  assert.equal(result.body.version, added.body.version + 1);
  assert.equal(result.body.tokenHash, undefined);
  pass("a changed price is saved and sent back for review, using live Shopify data and the app's own permissions");

  const withMattress = await post("basket", { action: "add", token, product: "11057927913811", variant: "55724611273043", choices: [], quantity: 25 });
  assert.equal(withMattress.status, 200);
  result = await checkout(token);
  assert.deepEqual([result.status, codeOf(result)], [409, "review_basket"]);
  assert.equal(result.body.problems.length, 1);
  assert.equal(result.body.problems[0].code, "insufficient_stock");
  assert.equal(result.body.problems[0].available, 19);
  assert.equal(result.body.lines.find((l) => l.sku === "TEST-EOC-S").quantity, 25);
  pass("too many of an item is refused with the real stock, and the basket is left alone");

  for (const line of result.body.lines) await post("basket", { action: "remove", token, line: line.id });
  result = await checkout(token);
  assert.deepEqual([result.status, codeOf(result)], [422, "empty_basket"]);
  pass("an empty basket is refused");

  assert.equal(await prisma.checkoutAttempt.count(), attemptsBefore);
  pass("none of these created a checkout attempt");
} catch (error) {
  console.log(results.join("\n"));
  console.log(`FAILED: ${String(error.message).split("\n").slice(0, 3).join(" ")}`.slice(0, 400));
  process.exitCode = 1;
} finally {
  await prisma.basket.deleteMany({ where: { shop: SHOP, tokenHash: { in: tokens.map(hashToken) } } });
  if (!process.exitCode) console.log(results.join("\n"));
  console.log(`baskets left in the database after cleanup: ${await prisma.basket.count()}`);
  await prisma.$disconnect();
}

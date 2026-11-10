// E4c: sends signed basket requests to a locally running app, the way Shopify's app proxy signs them.
// Reads Natural Gold from the dev store and deletes every basket it creates.
// Usage: node --env-file=.env spike/e4c-signed-basket.js <port>
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import process from "node:process";
import { PrismaClient } from "@prisma/client";
import { hashToken } from "../app/basket/basket.server.js";

const base = `http://localhost:${process.argv[2]}/proxy/basket`;
const SECRET = process.env.SHOPIFY_API_SECRET;
const SHOP = "urban-deco-dev.myshopify.com";
const PRODUCT = "11067852980563";
const VARIANT = "55773143433555";
const DRAWER = "17020886";
const NO_DRAWER = "17020880";
const FABRIC = "17020903";

function signedUrl({ shop = SHOP, secret = SECRET, timestamp = Math.floor(Date.now() / 1000) } = {}) {
  const all = { shop, path_prefix: "/apps/cfs", timestamp: String(timestamp) };
  const message = Object.keys(all).sort().map((key) => `${key}=${all[key]}`).join("");
  const signature = createHmac("sha256", secret).update(message).digest("hex");
  return `${base}?${new URLSearchParams({ ...all, signature })}`;
}

async function post(body, urlOptions) {
  const response = await fetch(signedUrl(urlOptions), { method: "POST", body: JSON.stringify(body) });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return { status: response.status, body: json, cache: response.headers.get("cache-control") };
}

const add = (token, choices, extra = {}) =>
  post({ action: "add", ...(token ? { token } : {}), product: PRODUCT, variant: VARIANT, choices, ...extra });
const codes = (result) => result.body?.errors?.map((e) => e.code);

const prisma = new PrismaClient();
const tokens = [];
const results = [];
const pass = (name) => results.push(`pass: ${name}`);

try {
  let refused = await add(undefined, [DRAWER]);
  assert.equal(refused.status, 422);
  assert.deepEqual(codes(refused), ["missing_required"]);
  assert.equal(refused.body.token, undefined);
  pass("an invalid selection is refused and issues no token");

  let result = await add(undefined, [DRAWER, FABRIC], { totalCents: 1, unitCents: 1, price: "0.01" });
  assert.equal(result.status, 200);
  assert.equal(result.cache, "no-store");
  const { token } = result.body;
  tokens.push(token);
  assert.match(token, /^[\w-]{43}$/);
  assert.equal(result.body.totalCents, 108998);
  assert.equal(result.body.lines[0].unitCents, 108998);
  pass("first add issues a token and ignores prices sent by the browser");
  const drawerLine = result.body.lines[0].id;
  let { version } = result.body;

  const stored = await prisma.basket.findUnique({
    where: { shop_tokenHash: { shop: SHOP, tokenHash: hashToken(token) } },
  });
  assert.ok(stored);
  pass("basket is saved under the shop Shopify verified, by token hash");

  result = await add(token, [FABRIC, DRAWER]);
  assert.equal(result.body.token, undefined);
  assert.equal(result.body.lines.length, 1);
  assert.equal(result.body.lines[0].quantity, 2);
  assert.equal(result.body.totalCents, 217996);
  assert.equal(result.body.version, version + 1);
  version = result.body.version;
  pass("same configuration in a different order raises the quantity");

  result = await add(token, [NO_DRAWER, FABRIC]);
  assert.equal(result.status, 200);
  assert.equal(result.body.lines.length, 2);
  version = result.body.version;
  const otherLine = result.body.lines[1];
  pass("a different configuration gets its own line");

  result = await post({ action: "view", token });
  assert.equal(result.status, 200);
  assert.equal(result.body.version, version);
  assert.equal(result.body.lines.length, 2);
  assert.equal(result.body.tokenHash, undefined);
  assert.equal(result.body.shop, undefined);
  pass("view returns the basket without changing it");

  await prisma.basketLine.update({ where: { id: drawerLine }, data: { unitCents: 1 } });
  result = await post({ action: "set_quantity", token, line: drawerLine, quantity: 4 });
  assert.equal(result.status, 200);
  assert.equal(result.body.lines[0].quantity, 4);
  assert.equal(result.body.lines[0].unitCents, 108998);
  assert.equal(result.body.version, version + 1);
  version = result.body.version;
  pass("changing quantity re-prices the line from live Shopify data");

  const stranger = await add(undefined, [DRAWER, FABRIC]);
  tokens.push(stranger.body.token);
  result = await post({ action: "remove", token: stranger.body.token, line: drawerLine });
  assert.equal(result.status, 404);
  assert.deepEqual(codes(result), ["line_not_found"]);
  result = await post({ action: "set_quantity", token: stranger.body.token, line: drawerLine, quantity: 1 });
  assert.equal(result.status, 404);
  pass("another shopper's token cannot change this basket");

  result = await post({ action: "remove", token, line: otherLine.id });
  assert.equal(result.status, 200);
  assert.equal(result.body.lines.length, 1);
  assert.equal(result.body.version, version + 1);
  pass("removing a line works");

  for (const [name, options] of [
    ["wrong secret", { secret: "wrong" }],
    ["old timestamp", { timestamp: Math.floor(Date.now() / 1000) - 3600 }],
  ]) {
    assert.equal((await post({ action: "view", token }, options)).status, 400, name);
  }
  const unsigned = await fetch(base, { method: "POST", body: JSON.stringify({ action: "view", token }) });
  assert.equal(unsigned.status, 400);
  pass("wrong secret, old timestamp and unsigned requests are refused");
} catch (error) {
  console.log(results.join("\n"));
  console.log(`FAILED: ${String(error.message).split("\n").slice(0, 3).join(" ")}`.slice(0, 400));
  process.exitCode = 1;
} finally {
  await prisma.basket.deleteMany({ where: { tokenHash: { in: tokens.map(hashToken) } } });
  const left = await prisma.basket.count();
  if (!process.exitCode) console.log(results.join("\n"));
  console.log(`baskets left in the database after cleanup: ${left}`);
  if (left !== 0) process.exitCode = 1;
  await prisma.$disconnect();
}

// E4d: sends signed basket requests for a mixed basket to a locally running app.
// Reads the dev store only, and deletes every basket it creates.
// Usage: node --env-file=.env spike/e4d-signed-mixed-basket.js <port>
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import process from "node:process";
import { PrismaClient } from "@prisma/client";
import { hashToken } from "../app/basket/basket.server.js";
import { read } from "./lib.js";

const base = `http://localhost:${process.argv[2]}/proxy/basket`;
const SHOP = "urban-deco-dev.myshopify.com";
const MATTRESS = { product: "11057927913811", variant: "55724611273043" };
const BED = { product: "11067852980563", variant: "55773143433555" };
const BED_CHOICES = ["17020886", "17020903"];

const firstVariant = (query) => {
  const { id, variants } = read(
    `query($q:String!){ products(first:1, query:$q){ nodes { id variants(first:1){ nodes { id } } } } }`,
    { q: query },
  ).products.nodes[0];
  return { product: id.split("/").pop(), variant: variants.nodes[0].id.split("/").pop() };
};
const OTHER_BED = firstVariant("handle:cfs-type-test-1253441");
const DRAFT = firstVariant("handle:test-product");
const SOLD_OUT = firstVariant("tag:cfs-spike");

function signedUrl() {
  const all = { shop: SHOP, path_prefix: "/apps/cfs", timestamp: String(Math.floor(Date.now() / 1000)) };
  const message = Object.keys(all).sort().map((key) => `${key}=${all[key]}`).join("");
  const signature = createHmac("sha256", process.env.SHOPIFY_API_SECRET).update(message).digest("hex");
  return `${base}?${new URLSearchParams({ ...all, signature })}`;
}

async function post(body) {
  const response = await fetch(signedUrl(), { method: "POST", body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}

const add = (item, choices = [], token) =>
  post({ action: "add", ...(token ? { token } : {}), ...item, choices });
const refusedWith = (result, status, code) => {
  assert.equal(result.status, status);
  assert.equal(result.body.errors[0].code, code);
  assert.equal(result.body.token, undefined);
};

const prisma = new PrismaClient();
const tokens = [];
const results = [];
const pass = (name) => results.push(`pass: ${name}`);

try {
  let result = await add(MATTRESS);
  assert.equal(result.status, 200);
  const { token } = result.body;
  tokens.push(token);
  assert.equal(result.body.lines[0].unitCents, 14900);
  assert.equal(result.body.lines[0].sku, "TEST-EOC-S");
  assert.deepEqual(result.body.lines[0].selection, []);
  pass("ordinary product added at its Shopify price of 149.00");
  const mattressLine = result.body.lines[0].id;

  result = await add(BED, BED_CHOICES, token);
  assert.equal(result.body.lines.length, 2);
  assert.equal(result.body.totalCents, 14900 + 108998);
  pass("configured bed and ordinary product share one basket");

  result = await add(MATTRESS, [], token);
  assert.equal(result.body.lines.length, 2);
  assert.equal(result.body.lines[0].quantity, 2);
  pass("adding the ordinary product again raises its quantity");

  await prisma.basketLine.update({ where: { id: mattressLine }, data: { unitCents: 1 } });
  result = await post({ action: "set_quantity", token, line: mattressLine, quantity: 3 });
  assert.equal(result.status, 200);
  assert.equal(result.body.lines[0].quantity, 3);
  assert.equal(result.body.lines[0].unitCents, 14900);
  assert.equal(result.body.totalCents, 3 * 14900 + 108998);
  pass("changing quantity re-prices the ordinary line from Shopify");

  refusedWith(await add(BED), 422, "missing_required");
  refusedWith(await add(OTHER_BED), 422, "unsupported_product");
  pass("configurable beds cannot be added as plain products at base price");

  refusedWith(await add(MATTRESS, ["17020886"]), 422, "choices_not_allowed");
  refusedWith(await add({ ...MATTRESS, variant: BED.variant }), 422, "unknown_variant");
  pass("choices on a mattress and a variant from another product are refused");

  refusedWith(await add(DRAFT), 422, "product_unavailable");
  refusedWith(await add(SOLD_OUT), 422, "variant_unavailable");
  pass("a draft product and a sold-out product are refused");

  const view = await post({ action: "view", token });
  assert.equal(view.body.lines.length, 2);
  assert.equal(view.body.lines[0].quantity, 3);
  pass("refused requests left the basket unchanged");
} catch (error) {
  console.log(results.join("\n"));
  console.log(`FAILED: ${String(error.message).split("\n").slice(0, 4).join(" ")}`.slice(0, 400));
  process.exitCode = 1;
} finally {
  await prisma.basket.deleteMany({ where: { tokenHash: { in: tokens.map(hashToken) } } });
  const left = await prisma.basket.count();
  if (!process.exitCode) console.log(results.join("\n"));
  console.log(`baskets left in the database after cleanup: ${left}`);
  if (left !== 0) process.exitCode = 1;
  await prisma.$disconnect();
}

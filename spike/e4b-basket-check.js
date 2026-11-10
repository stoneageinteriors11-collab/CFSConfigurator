// E4b: runs the real basket code against Supabase using a made-up shop name, then deletes
// everything it created. Usage: node --env-file=.env spike/e4b-basket-check.js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import process from "node:process";
import { PrismaClient } from "@prisma/client";
import {
  MAX_LINE_QUANTITY,
  addLine,
  getBasket,
  hashToken,
  newBasketToken,
  removeLine,
  setLineQuantity,
} from "../app/basket/basket.server.js";
import { quoteConfiguration } from "../app/pricing/quote.server.js";

const SHOP = "e4b-check.invalid";
const VARIANT = "gid://shopify/ProductVariant/55773143433555";
const DRAWER = "17020886";
const NO_DRAWER = "17020880";
const FABRIC = "17020903";

const product = JSON.parse(readFileSync(new URL("../test/fixtures/natural-gold.json", import.meta.url), "utf8"));
const priced = (choiceIds) => quoteConfiguration(product, { variantId: VARIANT, choiceIds });
const withDrawer = priced([DRAWER, FABRIC]);
const withoutDrawer = priced([NO_DRAWER, FABRIC]);
assert.equal(withDrawer.totalCents, 108998);
assert.ok(withoutDrawer.ok);

const prisma = new PrismaClient();
const mine = { shop: SHOP, token: newBasketToken() };
const stranger = { shop: SHOP, token: newBasketToken() };
const results = [];
const pass = (name) => results.push(`pass: ${name}`);
const add = (ref, quote, quantity) => addLine(prisma, ref, { productId: "11067852980563", quote, quantity });

try {
  let result = await add(mine, withDrawer);
  assert.ok(result.ok);
  assert.equal(result.basket.lines[0].unitCents, 108998);
  assert.equal(result.basket.lines[0].selection.length, 2);
  assert.equal(result.basket.tokenHash, hashToken(mine.token));
  assert.notEqual(result.basket.tokenHash, mine.token);
  pass("first add creates the basket, stores the server price and only the token hash");
  let { version } = result.basket;

  result = await add(mine, withDrawer, 2);
  assert.equal(result.basket.lines.length, 1);
  assert.equal(result.basket.lines[0].quantity, 3);
  assert.equal(result.basket.version, version + 1);
  version = result.basket.version;
  pass("adding the same configuration raises its quantity and the version");

  result = await add(mine, withoutDrawer);
  assert.equal(result.basket.lines.length, 2);
  assert.equal(result.basket.version, version + 1);
  version = result.basket.version;
  const [drawerLine, otherLine] = result.basket.lines;
  pass("a different configuration of the same variant stays on its own line");

  result = await setLineQuantity(prisma, mine, drawerLine.id, 5, withDrawer);
  assert.equal(result.basket.lines[0].quantity, 5);
  assert.equal(result.basket.version, version + 1);
  version = result.basket.version;
  pass("changing quantity raises the version");

  await add(stranger, withDrawer);
  assert.deepEqual(await setLineQuantity(prisma, stranger, drawerLine.id, 1, withDrawer), { ok: false, code: "line_not_found" });
  assert.deepEqual(await removeLine(prisma, stranger, drawerLine.id), { ok: false, code: "line_not_found" });
  let current = await getBasket(prisma, mine);
  assert.equal(current.lines[0].quantity, 5);
  assert.equal(current.version, version);
  pass("another shopper's token cannot change or remove this basket's lines");

  assert.deepEqual(await add(mine, withDrawer, MAX_LINE_QUANTITY), { ok: false, code: "invalid_quantity" });
  current = await getBasket(prisma, mine);
  assert.equal(current.lines[0].quantity, 5);
  assert.equal(current.version, version);
  pass("a refused add leaves quantity and version unchanged");

  const unknown = { shop: SHOP, token: newBasketToken() };
  assert.deepEqual(await removeLine(prisma, unknown, drawerLine.id), { ok: false, code: "basket_not_found" });
  assert.equal(await getBasket(prisma, unknown), null);
  pass("an unknown token is refused and creates nothing");

  const together = await Promise.all(Array.from({ length: 5 }, () => add(mine, withDrawer)));
  assert.ok(together.every((r) => r.ok));
  current = await getBasket(prisma, mine);
  assert.equal(current.lines[0].quantity, 10);
  assert.equal(current.version, version + 5);
  version = current.version;
  pass("five simultaneous adds are all counted, with no lost update");

  const firstToken = { shop: SHOP, token: newBasketToken() };
  const firstAdds = await Promise.all(Array.from({ length: 3 }, () => add(firstToken, withDrawer)));
  assert.ok(firstAdds.every((r) => r.ok));
  assert.equal((await getBasket(prisma, firstToken)).lines[0].quantity, 3);
  pass("simultaneous first adds create one basket");

  result = await removeLine(prisma, mine, otherLine.id);
  assert.equal(result.basket.lines.length, 1);
  assert.equal(result.basket.version, version + 1);
  pass("removing a line raises the version and keeps the other line");
} catch (error) {
  console.log(results.join("\n"));
  console.log(`FAILED: ${String(error.code ?? "")} ${String(error.message).split("\n").slice(-1)[0]}`.slice(0, 300));
  process.exitCode = 1;
} finally {
  await prisma.basket.deleteMany({ where: { shop: SHOP } });
  const baskets = await prisma.basket.count();
  const lines = await prisma.basketLine.count();
  if (!process.exitCode) console.log(results.join("\n"));
  console.log(`rows left in the database after cleanup: ${baskets + lines}`);
  if (baskets + lines !== 0) process.exitCode = 1;
  await prisma.$disconnect();
}

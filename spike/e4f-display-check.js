// E4f: applies the display columns migration inside a transaction, saves a basket with the
// real basket code, then rolls everything back. Usage: node --env-file=.env spike/e4f-display-check.js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import process from "node:process";
import { PrismaClient } from "@prisma/client";
import { addLine, getBasket, newBasketToken } from "../app/basket/basket.server.js";
import { quoteConfiguration } from "../app/pricing/quote.server.js";

const MIGRATION = "../prisma/migrations/20261110140000_add_basket_line_display/migration.sql";
const ROLLBACK = new Error("rollback");
const statements = readFileSync(new URL(MIGRATION, import.meta.url), "utf8")
  .replace(/^--.*$/gm, "")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

const fixture = JSON.parse(readFileSync(new URL("../test/fixtures/natural-gold.json", import.meta.url), "utf8"));
const product = { ...fixture, title: "Natural Gold", handle: "natural-gold", imageUrl: "https://cdn.example/bed.jpg" };
const quote = quoteConfiguration(product, {
  variantId: "gid://shopify/ProductVariant/55773143433555",
  choiceIds: ["17020886", "17020903"],
});
assert.ok(quote.ok);

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });
const results = [];

try {
  await prisma.$transaction(
    async (tx) => {
      for (const statement of statements) await tx.$executeRawUnsafe(statement);
      results.push("pass: migration applies");

      const db = { basket: tx.basket, basketLine: tx.basketLine, $transaction: (work) => work(tx) };
      const ref = { shop: "e4f-check.invalid", token: newBasketToken() };
      const result = await addLine(db, ref, { productId: "1", quote });
      assert.ok(result.ok);
      const [line] = (await getBasket(db, ref)).lines;
      assert.equal(line.title, "Natural Gold");
      assert.equal(line.handle, "natural-gold");
      assert.equal(line.imageUrl, "https://cdn.example/bed.jpg");
      assert.equal(line.unitCents, 108998);
      results.push("pass: a saved line keeps its title, handle and photo");

      const [counted] = await tx.$queryRawUnsafe(
        `SELECT count(*)::int AS n FROM "BasketLine" WHERE title = '' AND "basketId" NOT IN (SELECT id FROM "Basket" WHERE shop = 'e4f-check.invalid')`,
      );
      results.push(`pass: existing lines stay valid with blank details (${counted.n})`);
      throw ROLLBACK;
    },
    { timeout: 60000, maxWait: 20000 },
  );
} catch (error) {
  if (error !== ROLLBACK) {
    console.log(results.join("\n"));
    console.log(`FAILED: ${String(error.code ?? "")} ${String(error.message).split("\n").slice(-1)[0]}`.slice(0, 400));
    process.exitCode = 1;
  }
}

if (!process.exitCode) {
  const [{ n }] = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name = 'BasketLine' AND column_name IN ('title', 'variantTitle', 'handle', 'imageUrl')`,
  );
  const [{ b }] = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS b FROM "Basket" WHERE shop = 'e4f-check.invalid'`);
  console.log(results.join("\n"));
  console.log(`new columns left in database after rollback: ${n}, test baskets left: ${b}`);
  if (n !== 0 || b !== 0) process.exitCode = 1;
}
await prisma.$disconnect();

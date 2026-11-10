// E4a: applies the basket migration inside a transaction, tests its rules, then rolls everything back.
// Nothing stays in the database. Usage: node --env-file=.env spike/e4a-basket-tables-check.js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import process from "node:process";
import { PrismaClient } from "@prisma/client";

const MIGRATION = "../prisma/migrations/20261110120000_create_basket_tables/migration.sql";
const ROLLBACK = new Error("rollback");

const statements = readFileSync(new URL(MIGRATION, import.meta.url), "utf8")
  .replace(/^--.*$/gm, "")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });
const results = [];

try {
  await prisma.$transaction(
    async (tx) => {
      for (const statement of statements) await tx.$executeRawUnsafe(statement);

      const basket = (id, token, version = 1) =>
        tx.$executeRawUnsafe(
          `INSERT INTO "Basket" (id, shop, "tokenHash", version, "updatedAt") VALUES ($1, 'test.myshopify.com', $2, $3, now())`,
          id, token, version,
        );
      const line = (id, basketId, key, { quantity = 1, baseCents = 100, unitCents = 100 } = {}) =>
        tx.$executeRawUnsafe(
          `INSERT INTO "BasketLine" (id, "basketId", "configurationKey", "productId", "variantId", sku, quantity, "baseCents", "unitCents", "updatedAt")
           VALUES ($1, $2, $3, '1', '2', 'SKU', $4, $5, $6, now())`,
          id, basketId, key, quantity, baseCents, unitCents,
        );
      const rows = (sql) => tx.$queryRawUnsafe(sql);

      const accepts = async (name, action) => {
        await action();
        results.push(`pass: ${name}`);
      };
      const refuses = async (name, action, code) => {
        await tx.$executeRawUnsafe("SAVEPOINT attempt");
        let refusedBy = null;
        try {
          await action();
        } catch (error) {
          refusedBy = error.meta?.code ?? error.code;
        }
        await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT attempt");
        assert.equal(refusedBy, code, `${name}: expected refusal ${code}, got ${refusedBy}`);
        results.push(`pass: ${name} refused`);
      };

      await accepts("new basket", () => basket("b1", "token-1"));
      await accepts("second basket", () => basket("b2", "token-2"));
      await accepts("first configuration", () => line("l1", "b1", "2:drawer,fabricA"));
      await accepts("different configuration of the same variant", () => line("l2", "b1", "2:drawer,fabricB"));
      await accepts("same configuration in another basket", () => line("l3", "b2", "2:drawer,fabricA"));

      const [{ version, selection }] = await rows(
        `SELECT b.version, l.selection FROM "Basket" b JOIN "BasketLine" l ON l."basketId" = b.id WHERE l.id = 'l1'`,
      );
      assert.equal(version, 1);
      assert.deepEqual(selection, []);
      results.push("pass: starts at version 1 with an empty selection");

      const UNIQUE = "23505";
      const CHECK = "23514";
      const MISSING_BASKET = "23503";
      await refuses("same token twice", () => basket("b3", "token-1"), UNIQUE);
      await refuses("identical configuration on two lines", () => line("l4", "b1", "2:drawer,fabricA"), UNIQUE);
      await refuses("line without a basket", () => line("l5", "nope", "k"), MISSING_BASKET);
      await refuses("zero quantity", () => line("l6", "b1", "q0", { quantity: 0 }), CHECK);
      await refuses("negative base price", () => line("l7", "b1", "m1", { baseCents: -1 }), CHECK);
      await refuses("negative unit price", () => line("l8", "b1", "m2", { unitCents: -1 }), CHECK);
      await refuses("version zero", () => basket("b4", "token-4", 0), CHECK);

      await tx.$executeRawUnsafe(`DELETE FROM "Basket" WHERE id = 'b1'`);
      const remaining = await rows(`SELECT id FROM "BasketLine" ORDER BY id`);
      assert.deepEqual(remaining.map((r) => r.id), ["l3"]);
      results.push("pass: deleting a basket removes only its lines");

      const security = await rows(
        `SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('Basket', 'BasketLine') AND relkind = 'r' ORDER BY relname`,
      );
      assert.deepEqual(security.map((r) => [r.relname, r.relrowsecurity]), [["Basket", true], ["BasketLine", true]]);
      results.push("pass: row level security on for both tables");

      throw ROLLBACK;
    },
    { timeout: 60000, maxWait: 20000 },
  );
} catch (error) {
  if (error !== ROLLBACK) {
    console.log(results.join("\n"));
    console.log(`FAILED: ${error.message}`.slice(0, 400));
    process.exitCode = 1;
  }
}

if (!process.exitCode) {
  const left = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_name IN ('Basket', 'BasketLine')`,
  );
  console.log(results.join("\n"));
  console.log(`tables left in database after rollback: ${left[0].n}`);
  if (left[0].n !== 0) process.exitCode = 1;
}
await prisma.$disconnect();

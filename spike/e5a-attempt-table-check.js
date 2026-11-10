// E5a: applies the checkout attempts migration inside a transaction, tests its rules, then rolls everything back.
// Nothing stays in the database. Usage: node --env-file=.env spike/e5a-attempt-table-check.js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import process from "node:process";
import { PrismaClient } from "@prisma/client";

const MIGRATION = "../prisma/migrations/20261110160000_create_checkout_attempts/migration.sql";
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

      await tx.$executeRawUnsafe(
        `INSERT INTO "Basket" (id, shop, "tokenHash", "updatedAt") VALUES ('e5a-b1', 'test.myshopify.com', 'e5a-token', now())`,
      );

      const attempt = (id, { basketId = "e5a-b1", version = 1, status = "creating", total = 100, draft = null, url = null } = {}) =>
        tx.$executeRawUnsafe(
          `INSERT INTO "CheckoutAttempt" (id, shop, "basketId", "basketVersion", status, lines, "totalCents", "draftOrderId", "invoiceUrl", "updatedAt")
           VALUES ($1, 'test.myshopify.com', $2, $3, $4, '[]'::jsonb, $5, $6, $7, now())`,
          id, basketId, version, status, total, draft, url,
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

      const UNIQUE = "23505";
      const CHECK = "23514";
      const MISSING_BASKET = "23503";

      await accepts("first attempt for a basket version", () => attempt("a1"));
      await accepts("attempt for the next basket version", () => attempt("a2", { version: 2 }));
      await accepts("ready attempt with draft and link", () =>
        attempt("a3", { version: 3, status: "ready", draft: "gid://d/1", url: "https://x" }),
      );
      await accepts("failed attempt without a draft", () => attempt("a4", { version: 4, status: "failed" }));

      const [{ status }] = await rows(`SELECT status FROM "CheckoutAttempt" WHERE id = 'a1'`);
      assert.equal(status, "creating");
      results.push("pass: starts as creating");

      await refuses("second attempt for the same basket version", () => attempt("a5"), UNIQUE);
      await refuses("same draft order on two attempts", () => attempt("a6", { version: 6, draft: "gid://d/1" }), UNIQUE);
      await refuses("attempt for a missing basket", () => attempt("a7", { basketId: "nope" }), MISSING_BASKET);
      await refuses("version zero", () => attempt("a8", { version: 0 }), CHECK);
      await refuses("negative total", () => attempt("a9", { version: 9, total: -1 }), CHECK);
      await refuses("unknown status", () => attempt("a10", { version: 10, status: "paid" }), CHECK);
      await refuses("ready without a draft", () => attempt("a11", { version: 11, status: "ready", url: "https://x" }), CHECK);
      await refuses("ready without a link", () => attempt("a12", { version: 12, status: "ready", draft: "gid://d/2" }), CHECK);

      await tx.$executeRawUnsafe(`DELETE FROM "Basket" WHERE id = 'e5a-b1'`);
      const kept = await rows(`SELECT id, "basketId" FROM "CheckoutAttempt" ORDER BY id`);
      assert.deepEqual(kept, [
        { id: "a1", basketId: null },
        { id: "a2", basketId: null },
        { id: "a3", basketId: null },
        { id: "a4", basketId: null },
      ]);
      results.push("pass: deleting a basket keeps its attempts");

      const security = await rows(`SELECT relrowsecurity FROM pg_class WHERE relname = 'CheckoutAttempt' AND relkind = 'r'`);
      assert.deepEqual(security, [{ relrowsecurity: true }]);
      results.push("pass: row level security on");

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
    `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_name = 'CheckoutAttempt'`,
  );
  const baskets = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "Basket" WHERE id = 'e5a-b1'`);
  console.log(results.join("\n"));
  console.log(`table left after rollback: ${left[0].n}, test baskets left: ${baskets[0].n}`);
  if (left[0].n !== 0 || baskets[0].n !== 0) process.exitCode = 1;
}
await prisma.$disconnect();

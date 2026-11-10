// E6a: applies the order snapshot migration inside a transaction, tests its rules, then rolls everything back.
// Nothing stays in the database. Usage: node --env-file=.env spike/e6a-snapshot-table-check.js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import process from "node:process";
import { PrismaClient } from "@prisma/client";

const MIGRATION = "../prisma/migrations/20261110200000_create_order_snapshots/migration.sql";
const ROLLBACK = new Error("rollback");

// Splits on semicolons, keeping the trigger function's $$ body in one piece.
const statements = readFileSync(new URL(MIGRATION, import.meta.url), "utf8")
  .replace(/^--.*$/gm, "")
  .match(/(?:\$\$[\s\S]*?\$\$|[^;])+/g)
  .map((s) => s.trim())
  .filter(Boolean);

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });
const results = [];

try {
  await prisma.$transaction(
    async (tx) => {
      for (const statement of statements) await tx.$executeRawUnsafe(statement);

      for (const id of ["e6a-a1", "e6a-a2", "e6a-a3"]) {
        await tx.$executeRawUnsafe(
          `INSERT INTO "CheckoutAttempt" (id, shop, "basketVersion", lines, "totalCents", "updatedAt")
           VALUES ($1, 'test.myshopify.com', 1, '[]'::jsonb, 100, now())`,
          id,
        );
      }

      const snapshot = (id, { order = id, attempt = null, match = "no_attempt", spec = "{}", shop = "test.myshopify.com" } = {}) =>
        tx.$executeRawUnsafe(
          `INSERT INTO "OrderSnapshot" (id, shop, "orderId", "orderName", "attemptId", "matchStatus", specification, "financialStatus", "updatedAt")
           VALUES ($1, $2, $3, '#1', $4, $5, $6::jsonb, 'PAID', now())`,
          id, shop, order, attempt, match, spec,
        );
      const update = (set) => tx.$executeRawUnsafe(`UPDATE "OrderSnapshot" SET ${set} WHERE id = 's1'`);
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
      const LINKED = "23503";

      await accepts("order matched to its checkout", () =>
        snapshot("s1", { attempt: "e6a-a1", match: "matched", spec: '{"lines":[1]}' }),
      );
      await accepts("order with no app checkout", () => snapshot("s2"));
      await accepts("order with a price mismatch", () => snapshot("s3", { attempt: "e6a-a2", match: "price_mismatch" }));
      await accepts("same order number on another shop", () => snapshot("s4", { order: "s1", shop: "other.myshopify.com" }));

      await refuses("same order twice", () => snapshot("s5", { order: "s1" }), UNIQUE);
      await refuses("two orders for one checkout", () => snapshot("s6", { attempt: "e6a-a1", match: "matched" }), UNIQUE);
      await refuses("unknown match status", () => snapshot("s7", { match: "maybe" }), CHECK);
      await refuses("matched without a checkout", () => snapshot("s8", { match: "matched" }), CHECK);
      await refuses("no_attempt with a checkout", () => snapshot("s9", { attempt: "e6a-a3" }), CHECK);
      await refuses("specification that is not an object", () => snapshot("s10", { spec: "[]" }), CHECK);
      await refuses("checkout that does not exist", () => snapshot("s11", { attempt: "nope", match: "matched" }), LINKED);

      await refuses("changing a specification", () => update(`specification = '{"lines":[2]}'::jsonb`), CHECK);
      await refuses("clearing a specification field", () => update(`specification = specification - 'lines'`), CHECK);
      await refuses("moving a snapshot to another order", () => update(`"orderId" = 'other'`), CHECK);
      await refuses("moving a snapshot to another shop", () => update(`shop = 'x.myshopify.com'`), CHECK);
      await refuses("moving a snapshot to another checkout", () => update(`"attemptId" = 'e6a-a3'`), CHECK);

      await accepts("status follows Shopify", () => update(`"financialStatus" = 'REFUNDED', "cancelledAt" = now()`));
      const [saved] = await rows(`SELECT specification, "financialStatus" FROM "OrderSnapshot" WHERE id = 's1'`);
      assert.deepEqual(saved, { specification: { lines: [1] }, financialStatus: "REFUNDED" });
      results.push("pass: status changed and the specification did not");

      await refuses("deleting a checkout that has an order", () => tx.$executeRawUnsafe(`DELETE FROM "CheckoutAttempt" WHERE id = 'e6a-a1'`), LINKED);

      const security = await rows(`SELECT relrowsecurity FROM pg_class WHERE relname = 'OrderSnapshot' AND relkind = 'r'`);
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
    `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_name = 'OrderSnapshot'`,
  );
  const attempts = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "CheckoutAttempt" WHERE id LIKE 'e6a-%'`);
  console.log(results.join("\n"));
  console.log(`table left after rollback: ${left[0].n}, test attempts left: ${attempts[0].n}`);
  if (left[0].n !== 0 || attempts[0].n !== 0) process.exitCode = 1;
}
await prisma.$disconnect();

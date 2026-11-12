import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, test } from "node:test";
import { buildProduct } from "../../app/import/build-product.js";
import { exportRows } from "../../app/import/export-rows.js";
import { beginRun, runPlans, runView, startRestore, writesAllowed } from "../../app/import/import-run.server.js";
import { loadConfigurableProduct } from "../../app/pricing/load-product.server.js";
import { fakeStore } from "./fake-store.js";

const load = (name) => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), "utf8"));
const SHOP = "urban-deco-dev.myshopify.com";
const NG = "146477";
const LOFT = "69733";
const noSleep = async () => {};

let savedEnv;
beforeEach(() => {
  savedEnv = process.env.IMPORT_WRITE_SHOPS;
  process.env.IMPORT_WRITE_SHOPS = SHOP;
});
afterEach(() => {
  if (savedEnv === undefined) delete process.env.IMPORT_WRITE_SHOPS;
  else process.env.IMPORT_WRITE_SHOPS = savedEnv;
});

// In-memory ImportRun and ImportBackup tables. A second running run for a shop is refused the
// way the database's unique index refuses it. clock() gives the time stamped on changes.
function fakeDatabase({ clock = () => new Date() } = {}) {
  const runs = [];
  const backups = [];
  const events = [];
  let n = 0;
  const db = {
    runs,
    backups,
    events,
    importRun: {
      updateMany: async ({ where, data }) => {
        let count = 0;
        for (const run of runs) {
          if (run.shop === where.shop && run.status === where.status && run.updatedAt < where.updatedAt.lt) {
            Object.assign(run, data, { updatedAt: clock() });
            count += 1;
          }
        }
        return { count };
      },
      create: async ({ data }) => {
        if (runs.some((r) => r.shop === data.shop && r.status === "running")) {
          throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
        }
        const run = { id: `${String(++n).padStart(8, "0")}-aaaa-4000-8000-000000000000`, createdAt: clock(), updatedAt: clock(), ...data };
        runs.push(run);
        return run;
      },
      update: async ({ where, data }) => {
        const run = runs.find((r) => r.id === where.id);
        Object.assign(run, structuredClone(data), { updatedAt: clock() });
        return run;
      },
    },
    importBackup: {
      create: async ({ data }) => {
        if (db.failBackups) throw new Error("database is down");
        events.push("backup");
        const backup = { id: `backup-${backups.length + 1}`, restoredAt: null, createdAt: clock(), ...structuredClone(data) };
        backups.push(backup);
        return backup;
      },
      findUnique: async ({ where }) => backups.find((b) => b.id === where.id) ?? null,
      update: async ({ where, data }) => Object.assign(backups.find((b) => b.id === where.id), data),
      delete: async ({ where }) => {
        backups.splice(backups.findIndex((b) => b.id === where.id), 1);
      },
    },
  };
  return db;
}

// A store with Natural Gold and Loft, and a plan for each with one price changed.
async function setup(failures = {}) {
  const naturalGold = { ...load("natural-gold"), title: "Natural Gold" };
  const loft = load("loft");
  const store = fakeStore([naturalGold, loft], failures);
  const writes = [];
  const graphql = async (query, args) => {
    if (query.includes("CfsCreateEntry") && !writes.length) writes.push("write");
    return store.graphql(query, args);
  };
  const plans = [];
  for (const [id, fixture, label] of [[NG, naturalGold, "with 2 Drawer"], [LOFT, loft, null]]) {
    const current = await loadConfigurableProduct(graphql, fixture.productId);
    const rows = exportRows(id, fixture);
    const choice = label ? rows.choices.find((c) => c.label === label) : rows.choices[0];
    choice.price = "123.45";
    const { product, errors } = buildProduct({ cfsProductId: id, ...rows }, current);
    assert.deepEqual(errors, []);
    plans.push({ cfsProductId: id, productId: fixture.productId, title: current.title, current, product });
  }
  return { store, graphql, plans, naturalGold, loft, writes };
}

const begin = (db, plans, extra = {}) =>
  beginRun({
    db,
    shop: SHOP,
    kind: "import",
    createdBy: "staff-1",
    fileName: "options.xlsx",
    planned: plans.map((p) => ({ cfsProductId: p.cfsProductId, title: p.title })),
    ...extra,
  });
const run = (db, s, started, plans = s.plans) =>
  runPlans({ db, graphql: s.graphql, run: started.run, plans, sleep: noSleep });

test("only shops listed in IMPORT_WRITE_SHOPS may be written", async () => {
  assert.equal(writesAllowed(SHOP), true);
  assert.equal(writesAllowed("urban-deco-uk.myshopify.com"), false);
  process.env.IMPORT_WRITE_SHOPS = ` other.myshopify.com , ${SHOP} `;
  assert.equal(writesAllowed(SHOP), true);
  delete process.env.IMPORT_WRITE_SHOPS;
  assert.equal(writesAllowed(SHOP), false);
});

test("refuses a shop not switched on", async () => {
  const db = fakeDatabase();
  process.env.IMPORT_WRITE_SHOPS = "other.myshopify.com";
  assert.deepEqual(await begin(db, []), { error: "Importing is not switched on for this store" });
  assert.equal(db.runs.length, 0);
});

test("refuses a second run while one is running", async () => {
  const db = fakeDatabase();
  assert.ok((await begin(db, [])).run);
  assert.deepEqual(await begin(db, []), { error: "Another import is running for this store; wait for it to finish" });
  assert.equal(db.runs.length, 1);
});

test("marks a stale run stopped and allows a new one", async () => {
  let now = new Date("2026-11-12T10:00:00Z");
  const db = fakeDatabase({ clock: () => now });
  const first = await begin(db, [], { now });
  assert.ok(first.run);

  now = new Date("2026-11-12T10:09:00Z");
  assert.ok((await begin(db, [], { now })).error, "still running at 9 minutes");

  now = new Date("2026-11-12T10:11:00Z");
  const second = await begin(db, [], { now });
  assert.ok(second.run);
  assert.equal(db.runs[0].status, "stopped");
  assert.equal(db.runs[1].status, "running");
});

test("saves a backup before writing each product", async () => {
  const db = fakeDatabase();
  const s = await setup();
  await run(db, s, await begin(db, s.plans));
  assert.equal(db.backups.length, 2);
  const [ngBackup] = db.backups;
  assert.equal(ngBackup.productId, s.naturalGold.productId);
  assert.equal(ngBackup.cfsProductId, NG);
  assert.equal(ngBackup.shop, SHOP);
  // the backup holds the options as they were, with their old prices
  const old = ngBackup.data.options.find((o) => o.label === "with 2 Drawer");
  assert.notEqual(old.mappings.assignments[0].raw_price, "123.45");
  assert.equal(ngBackup.data.options.length, load("natural-gold").options.length);
  assert.deepEqual(ngBackup.data.workflow, load("natural-gold").workflow);
  // and it was saved before the first write
  assert.deepEqual(s.writes, ["write"]);
  assert.equal(db.events[0], "backup");
});

test("records each product's result and finishes done", async () => {
  const db = fakeDatabase();
  const s = await setup();
  const started = await begin(db, s.plans);
  await run(db, s, started);
  const saved = db.runs[0];
  assert.equal(saved.status, "done");
  assert.equal(saved.total, 2);
  assert.deepEqual(saved.results.planned, [
    { cfsProductId: NG, title: s.plans[0].title },
    { cfsProductId: LOFT, title: s.plans[1].title },
  ]);
  assert.deepEqual(
    saved.results.done.map((d) => [d.cfsProductId, d.status, d.ready, d.message, d.backupId]),
    [
      [NG, "imported", true, "Imported, ready to sell", "backup-1"],
      [LOFT, "imported", true, "Imported, ready to sell", "backup-2"],
    ],
  );
});

test("carries on after one product fails, and keeps no backup of an unchanged product", async () => {
  const db = fakeDatabase();
  const s = await setup({ refuseCreateAt: 1 });
  await run(db, s, await begin(db, s.plans));
  const { done } = db.runs[0].results;
  assert.equal(db.runs[0].status, "done");
  assert.equal(done[0].status, "failed");
  assert.match(done[0].message, /^Not changed: Shopify refused/);
  assert.equal(done[0].backupId, null);
  assert.equal(done[1].status, "imported");
  assert.deepEqual(db.backups.map((b) => b.cfsProductId), [LOFT]);
});

test("does not write a product whose backup cannot be saved", async () => {
  const db = fakeDatabase();
  db.failBackups = true;
  const s = await setup();
  await run(db, s, await begin(db, s.plans));
  assert.deepEqual(db.runs[0].results.done.map((d) => [d.status, d.message]), [
    ["failed", "Not changed: the backup could not be saved"],
    ["failed", "Not changed: the backup could not be saved"],
  ]);
  assert.equal(s.store.calls.creates, 0);
});

test("says when a product was written but is not ready", async () => {
  const db = fakeDatabase();
  const s = await setup();
  s.plans[0].product.options[0].mappings = null;
  await run(db, s, await begin(db, s.plans, { now: new Date() }));
  const [first] = db.runs[0].results.done;
  assert.equal(first.status, "imported");
  assert.equal(first.ready, false);
  assert.match(first.message, /^Imported, but not ready to sell: /);
});

test("restores a backup and marks it restored", async () => {
  const db = fakeDatabase();
  const s = await setup();
  await run(db, s, await begin(db, s.plans));
  const priceNow = async () =>
    (await loadConfigurableProduct(s.graphql, s.naturalGold.productId)).options.find((o) => o.label === "with 2 Drawer")
      .mappings.assignments[0].raw_price;
  assert.equal(await priceNow(), "123.45");

  const restore = await startRestore({ db, graphql: s.graphql, shop: SHOP, backupId: "backup-1", createdBy: "staff-1" });
  assert.equal(restore.error, undefined);
  assert.equal(restore.run.kind, "restore");
  await runPlans({ db, graphql: s.graphql, run: restore.run, plans: [restore.plan], sleep: noSleep });

  assert.notEqual(await priceNow(), "123.45");
  const saved = db.runs[1];
  assert.equal(saved.status, "done");
  assert.deepEqual(saved.results.done.map((d) => [d.status, d.message]), [["restored", "Restored, ready to sell"]]);
  assert.ok(db.backups[0].restoredAt);
  // a fresh backup was taken first, so the restore can itself be undone
  assert.equal(db.backups.filter((b) => b.runId === saved.id).length, 1);
  // and the restored product has the same choices as the original
  const after = await loadConfigurableProduct(s.graphql, s.naturalGold.productId);
  assert.equal(after.options.length, load("natural-gold").options.length);
});

test("refuses to restore the same backup twice, or another shop's", async () => {
  const db = fakeDatabase();
  const s = await setup();
  await run(db, s, await begin(db, s.plans));
  const restore = await startRestore({ db, graphql: s.graphql, shop: SHOP, backupId: "backup-1", createdBy: "staff-1" });
  await runPlans({ db, graphql: s.graphql, run: restore.run, plans: [restore.plan], sleep: noSleep });

  assert.deepEqual(await startRestore({ db, graphql: s.graphql, shop: SHOP, backupId: "backup-1" }), {
    error: "This backup has already been restored",
  });
  process.env.IMPORT_WRITE_SHOPS = `${SHOP},other.myshopify.com`;
  assert.deepEqual(await startRestore({ db, graphql: s.graphql, shop: "other.myshopify.com", backupId: "backup-2" }), {
    error: "That backup was not found",
  });
  assert.deepEqual(await startRestore({ db, graphql: s.graphql, shop: SHOP, backupId: "nope" }), {
    error: "That backup was not found",
  });
});

test("refuses a restore of a product that had no options", async () => {
  const db = fakeDatabase();
  const s = await setup();
  db.backups.push({ id: "b-empty", runId: "r", shop: SHOP, productId: s.naturalGold.productId, cfsProductId: NG, title: "x", restoredAt: null, data: { options: null, workflow: null, modelCards: null } });
  assert.deepEqual(await startRestore({ db, graphql: s.graphql, shop: SHOP, backupId: "b-empty" }), {
    error: "This product had no options before that import, so there is nothing to restore",
  });
  assert.equal(db.runs.length, 0);
});

test("refuses a restore whose shared option changed elsewhere", async () => {
  const db = fakeDatabase();
  const s = await setup();
  // The backup holds an option with a code; another product now has that code under another name.
  const coded = structuredClone(s.plans[0].current.options.slice(0, 2));
  coded[0].optionCode = "DRAWER-2";
  db.backups.push({ id: "b-coded", runId: "r", shop: SHOP, productId: s.naturalGold.productId, cfsProductId: NG, title: "x", restoredAt: null, data: { options: coded, workflow: s.naturalGold.workflow, modelCards: s.naturalGold.modelCards } });
  const other = { id: "gid://shopify/Product/999", title: "Other Bed" };
  const graphql = fakeStore([s.naturalGold], {}); // only for reads
  const withEntries = async (query, args) => {
    if (query.includes("CfsSharedOptions")) {
      const code = /option_code:(.+)$/.exec(args.variables.query)?.[1];
      const nodes = code === "DRAWER-2"
        ? [{ id: "e1", label: { value: "Two drawers" }, imageUrl: null, mappings: { value: "{}" }, optionCode: { value: "DRAWER-2" }, referencedBy: { nodes: [{ referencer: other }] } }]
        : [];
      return { json: async () => ({ data: { metaobjects: { pageInfo: { hasNextPage: false }, nodes } } }) };
    }
    return graphql.graphql(query, args);
  };
  const result = await startRestore({ db, graphql: withEntries, shop: SHOP, backupId: "b-coded" });
  assert.match(result.error, /Option code DRAWER-2 is "Two drawers" on Other Bed \(999\)/);
  assert.equal(db.runs.length, 0);
});

test("shows unfinished products of a stopped run", async () => {
  const planned = [{ cfsProductId: NG, title: "Natural Gold" }, { cfsProductId: LOFT, title: "Loft Bed" }];
  const stopped = {
    id: "r1",
    status: "stopped",
    total: 2,
    results: { planned, done: [{ cfsProductId: NG, status: "imported", message: "Imported, ready to sell" }] },
  };
  assert.deepEqual(runView(stopped).results, [
    { cfsProductId: NG, status: "imported", message: "Imported, ready to sell" },
    { cfsProductId: LOFT, title: "Loft Bed", status: "stopped", message: "Stopped part-way; check this product" },
  ]);
  const finished = { ...stopped, status: "done" };
  assert.equal(runView(finished).results.length, 1);
  assert.equal(runView({ ...stopped, results: {} }).results.length, 0);
});

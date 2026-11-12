import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildProduct } from "../../app/import/build-product.js";
import { exportRows } from "../../app/import/export-rows.js";
import { writeProduct } from "../../app/import/write-product.server.js";
import { loadConfigurableProduct } from "../../app/pricing/load-product.server.js";
import { fakeStore } from "./fake-store.js";

const load = (name) => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), "utf8"));
const NG = "146477";
const RUN = "1234abcd-0000-4000-8000-000000000000";
const noSleep = async () => {};

// A store holding Natural Gold (and Loft), the loaded current product, and the product built
// from its own sheet with one price changed.
async function setup(failures = {}, { change } = {}) {
  const naturalGold = { ...load("natural-gold"), title: "Natural Gold" };
  const loft = load("loft");
  const store = fakeStore([naturalGold, loft], failures);
  const current = await loadConfigurableProduct(store.graphql, naturalGold.productId);
  const rows = exportRows(NG, naturalGold);
  rows.choices.find((c) => c.label === "with 2 Drawer").price = "99.99";
  const { product, errors } = buildProduct({ cfsProductId: NG, ...rows }, current);
  assert.deepEqual(errors, []);
  if (change) change(product);
  const oldIds = current.options.map((o) => o.entryId);
  return { store, naturalGold, loft, current, product, oldIds };
}

const write = (s) =>
  writeProduct({ graphql: s.store.graphql, product: s.product, current: s.current, runId: RUN, sleep: noSleep });
const listedIds = (store, product) => product.options.map((o) => o.entryId);

test("writes a product and removes its old entries", async () => {
  const s = await setup();
  const result = await write(s);
  assert.deepEqual(result, { ok: true, ready: true, problems: [] });

  assert.equal(s.naturalGold.options.length, s.product.options.length);
  assert.ok(s.naturalGold.options.every((o) => o.entryId.includes("new-")));
  for (const id of s.oldIds) assert.equal(s.store.entries.has(id), false, id);
  // Loft's entries are not touched, and nothing else is left behind
  assert.equal(s.store.entries.size, s.naturalGold.options.length + s.loft.options.length);

  const after = await loadConfigurableProduct(s.store.graphql, s.naturalGold.productId);
  const drawer = after.options.find((o) => o.label === "with 2 Drawer");
  assert.equal(drawer.mappings.assignments[0].raw_price, "99.99");
});

test("leaves the product unchanged when an entry is refused", async () => {
  const s = await setup({ refuseCreateAt: 5 });
  const before = structuredClone(s.naturalGold);
  const result = await write(s);
  assert.deepEqual(result, { ok: false, error: 'Not changed: Shopify refused "Select Drawer none": Image url is invalid'.replace("Select Drawer none", s.product.options[4].label) });
  assert.deepEqual(s.naturalGold, before);
  assert.equal(s.store.calls.switches, 0);
  // the four entries made before the refusal are deleted again
  assert.equal(s.store.entries.size, s.oldIds.length + s.loft.options.length);
  assert.equal(s.store.calls.deletes.length, 4);
});

test("leaves the product unchanged when the switch is refused", async () => {
  const s = await setup({ refuseSwitch: true });
  const before = structuredClone(s.naturalGold);
  const result = await write(s);
  assert.deepEqual(result, { ok: false, error: "Not changed: Shopify refused the switch: Value is invalid" });
  assert.deepEqual(s.naturalGold, before);
  assert.equal(s.store.entries.size, s.oldIds.length + s.loft.options.length);
});

test("keeps an old entry another product still lists", async () => {
  const s = await setup();
  const shared = s.oldIds[0];
  s.loft.options.push({ ...s.loft.options[0], entryId: shared });
  const result = await write(s);
  assert.equal(result.ok, true);
  assert.equal(s.store.entries.has(shared), true);
  for (const id of s.oldIds.slice(1)) assert.equal(s.store.entries.has(id), false);
});

test("reports a product that is written but not ready", async () => {
  const s = await setup({}, { change: (product) => { product.options[0].mappings = null; } });
  const result = await write(s);
  assert.equal(result.ok, true);
  assert.equal(result.ready, false);
  assert.ok(result.problems.length > 0);
  // it is written all the same, so it can be restored
  assert.ok(s.naturalGold.options.every((o) => o.entryId.includes("new-")));
});

test("keeps the new entries when an unconfirmed switch did apply", async () => {
  const s = await setup({ switchThrows: "applied" });
  const result = await write(s);
  assert.deepEqual(result, { ok: true, ready: true, problems: [] });
  assert.ok(s.naturalGold.options.every((o) => o.entryId.includes("new-")));
  for (const id of s.oldIds) assert.equal(s.store.entries.has(id), false);
});

test("deletes the new entries when an unconfirmed switch did not apply", async () => {
  const s = await setup({ switchThrows: "lost" });
  const before = structuredClone(s.naturalGold);
  const result = await write(s);
  assert.equal(result.ok, false);
  assert.match(result.error, /^Not changed: Shopify could not confirm the switch/);
  assert.deepEqual(s.naturalGold, before);
  assert.equal(s.store.entries.size, s.oldIds.length + s.loft.options.length);
});

test("deletes nothing when an unconfirmed switch cannot be read back", async () => {
  const s = await setup({ switchThrows: "applied", unreadable: true });
  const entriesBefore = s.store.entries.size;
  const result = await write(s);
  assert.deepEqual(result, { ok: false, error: "Check this product: Shopify did not confirm the change" });
  assert.equal(s.store.calls.deletes.length, 0);
  assert.equal(s.store.entries.size, entriesBefore + s.product.options.length);
});

test("reports old entries that could not be removed without undoing the write", async () => {
  const s = await setup();
  s.store = fakeStore([s.naturalGold, s.loft], { deleteFails: new Set(s.oldIds.slice(0, 2)) });
  const result = await write(s);
  assert.equal(result.ok, true);
  assert.equal(result.ready, true);
  assert.deepEqual(result.problems, ["2 old options could not be removed"]);
  assert.ok(s.naturalGold.options.every((o) => o.entryId.includes("new-")));
});

test("keeps an old entry whose use cannot be checked", async () => {
  const s = await setup();
  const base = s.store.graphql;
  const graphql = async (query, args) => {
    if (query.includes("CfsEntryListed") && args.variables.id === s.oldIds[0]) throw new Error("boom");
    return base(query, args);
  };
  const result = await writeProduct({ graphql, product: s.product, current: s.current, runId: RUN, sleep: noSleep });
  assert.equal(result.ok, true);
  assert.equal(s.store.entries.has(s.oldIds[0]), true);
  assert.equal(s.store.entries.has(s.oldIds[1]), false);
});

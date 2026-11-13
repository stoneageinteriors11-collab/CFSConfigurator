import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, test } from "node:test";
import { exportRows, sheetValues } from "../../app/import/export-rows.js";
import { startImport } from "../../app/import/start-import.server.js";
import { writeWorkbook } from "../../app/import/spreadsheet.server.js";
import { fakeShop } from "./fake-shop.js";

const load = (name) => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), "utf8"));
const SHOP = "urban-deco-dev.myshopify.com";
const naturalGold = { ...load("natural-gold"), title: "Natural Gold" };
const NG = "146477";

let savedEnv;
beforeEach(() => {
  savedEnv = process.env.IMPORT_WRITE_SHOPS;
  process.env.IMPORT_WRITE_SHOPS = SHOP;
});
afterEach(() => {
  if (savedEnv === undefined) delete process.env.IMPORT_WRITE_SHOPS;
  else process.env.IMPORT_WRITE_SHOPS = savedEnv;
});

// The sheet of Natural Gold's current options; change(rows) can edit them first.
async function sheet(change = () => {}) {
  const rows = sheetValues(NG, exportRows(NG, naturalGold));
  change(rows);
  return writeWorkbook(rows.groups, rows.choices);
}
const dearer = (rows) => {
  rows.choices.find((c) => c.Choice === "with 2 Drawer")["Price (£)"] = "99.99";
};

// Just enough database for beginRun.
function fakeDatabase() {
  const runs = [];
  return {
    runs,
    importRun: {
      updateMany: async () => ({ count: 0 }),
      create: async ({ data }) => {
        const run = { id: "run-1", ...data };
        runs.push(run);
        return run;
      },
    },
  };
}

function start(db, bytes, extra = {}) {
  const background = [];
  const promise = startImport({
    db,
    graphql: fakeShop([naturalGold]),
    shop: SHOP,
    bytes,
    fileName: "options.xlsx",
    createdBy: "staff-1",
    createdByName: "Sam Staff",
    runInBackground: (work) => background.push(work),
    ...extra,
  });
  return promise.then((result) => ({ result, background }));
}

test("refuses import when the file no longer previews as ready", async () => {
  const db = fakeDatabase();
  const bad = await sheet((rows) => {
    rows.choices[0]["Price (£)"] = "abc";
  });
  const { result, background } = await start(db, bad);
  assert.deepEqual(result, { errors: ["The file no longer previews as ready to import; preview it again"] });
  assert.equal(db.runs.length, 0);
  assert.equal(background.length, 0);

  // for example a size deleted in Shopify since the preview
  const gone = { ...naturalGold, variants: naturalGold.variants.slice(0, 2) };
  const changed = await start(db, await sheet(dearer), { graphql: fakeShop([gone]) });
  assert.ok(changed.result.errors, "the sheet's size prices no longer fit the product");
  assert.equal(changed.background.length, 0);
});

test("refuses when nothing would change", async () => {
  const db = fakeDatabase();
  const { result, background } = await start(db, await sheet());
  assert.deepEqual(result, { errors: ["Nothing to import: the sheet matches the store"] });
  assert.equal(db.runs.length, 0);
  assert.equal(background.length, 0);
});

test("starts a run and hands the work to the background", async () => {
  const db = fakeDatabase();
  const { result, background } = await start(db, await sheet(dearer));
  assert.deepEqual(result, { runId: "run-1" });
  assert.equal(db.runs.length, 1);
  assert.equal(db.runs[0].kind, "import");
  assert.equal(db.runs[0].createdBy, "staff-1");
  assert.equal(db.runs[0].createdByName, "Sam Staff");
  assert.equal(db.runs[0].fileName, "options.xlsx");
  assert.deepEqual(db.runs[0].results.planned, [{ cfsProductId: NG, title: "Natural Gold" }]);
  assert.equal(background.length, 1, "the write is handed over, not run before answering");
});

test("refuses a store that is not switched on, after the preview", async () => {
  const db = fakeDatabase();
  process.env.IMPORT_WRITE_SHOPS = "other.myshopify.com";
  const { result } = await start(db, await sheet(dearer));
  assert.deepEqual(result, { errors: ["Importing is not switched on for this store"] });
  assert.equal(db.runs.length, 0);
});

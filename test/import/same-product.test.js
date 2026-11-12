import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildProduct } from "../../app/import/build-product.js";
import { exportRows } from "../../app/import/export-rows.js";
import { sameProduct } from "../../app/import/same-product.js";

const load = (name) => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), "utf8"));
const FIXTURES = ["natural-gold", "fargo", "loft", "mayfair", "moreno", "paris", "zenaya"];
const cfsIdOf = (product) => /-(\d+)-\d+$/.exec(product.variants[0].sku)[1];

// Rebuilds a product from its own export; change(rows) can edit the rows first.
function rebuild(fixture, change = () => {}) {
  const id = cfsIdOf(fixture);
  const rows = exportRows(id, fixture);
  change(rows);
  const { product, errors } = buildProduct({ cfsProductId: id, ...rows }, fixture);
  assert.deepEqual(errors, []);
  return product;
}

test("a product rebuilt from its own export is the same", () => {
  for (const name of FIXTURES) {
    const fixture = load(name);
    assert.equal(sameProduct(fixture, rebuild(fixture)), true, name);
  }
});

test("one changed price is not the same", () => {
  const fixture = load("natural-gold");
  const built = rebuild(fixture, (rows) => {
    const drawer = rows.choices.find((c) => c.label === "with 2 Drawer");
    drawer.price = "99.99";
  });
  assert.equal(sameProduct(fixture, built), false);
});

test("a changed option code is not the same", () => {
  const fixture = load("natural-gold");
  const built = rebuild(fixture, (rows) => {
    rows.choices.find((c) => c.label === "with 2 Drawer").optionCode = "DRAWER-2";
  });
  assert.equal(sameProduct(fixture, built), false);
});

test("a missing image and an empty one are the same, and entry IDs are ignored", () => {
  const fixture = load("loft");
  const current = {
    ...fixture,
    options: fixture.options.map((o, i) => ({ ...o, imageUrl: o.imageUrl ?? "", entryId: `gid://shopify/Metaobject/${i}`, optionCode: "" })),
  };
  assert.equal(sameProduct(current, rebuild(fixture)), true);
});

test("a choice moved to another place in the list is not the same", () => {
  const fixture = load("loft");
  const built = rebuild(fixture);
  built.options = [...built.options.slice(1), built.options[0]];
  assert.equal(sameProduct(fixture, built), false);
});

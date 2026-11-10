import assert from "node:assert/strict";
import { test } from "node:test";
import { copyCartItems, readCartItems } from "../../app/checkout/copy-cart.server.js";

const ref = { shop: "test.myshopify.com", token: "a".repeat(43) };
const variantGid = (id) => `gid://shopify/ProductVariant/${id}`;
const BED = { id: "bed", variantId: variantGid(1), quantity: 1, baseCents: 99999, unitCents: 108998, selection: [{ choiceId: "x" }] };

const item = (variant, quantity = 1, product = "222") => ({ product, variant, quantity });

function product({ price = "149.00", variants = ["333", "444"], status = "ACTIVE" } = {}) {
  return {
    id: "gid://shopify/Product/222",
    title: "Mattress",
    handle: "mattress",
    status,
    publishedAt: "2026-01-01T00:00:00Z",
    featuredMedia: null,
    variants: {
      pageInfo: { hasNextPage: false },
      nodes: variants.map((id) => ({
        id: variantGid(id), sku: `M${id}`, title: "Single", price, availableForSale: true,
        inventoryQuantity: 5, inventoryPolicy: "DENY", inventoryItem: { tracked: true },
      })),
    },
    modelCards: null,
    workflow: null,
    options: null,
  };
}

const shopify = (options) => async () => ({ json: async () => ({ data: { product: product(options) } }) });

function fakeDatabase(lines = [BED]) {
  const state = { version: 3, lines: lines.map((line) => ({ ...line })), nextId: 1 };
  const db = {
    state,
    basket: {
      createMany: async () => ({ count: 0 }),
      updateMany: async () => {
        state.version += 1;
        return { count: 1 };
      },
      findUnique: async () => ({ id: "basket-1", version: state.version, lines: state.lines }),
    },
    basketLine: {
      findUnique: async () => null,
      count: async () => state.lines.length,
      create: async ({ data }) => state.lines.push({ id: `new-${state.nextId++}`, ...data }),
      updateMany: async ({ where, data }) => {
        Object.assign(state.lines.find((l) => l.id === where.id), data);
        return { count: 1 };
      },
      deleteMany: async ({ where }) => {
        state.lines = state.lines.filter((l) => l.id !== where.id);
        return { count: 1 };
      },
    },
    $transaction: (work) => work(db),
  };
  return db;
}

const copy = (db, graphql, items) => copyCartItems({ db, graphql, ref, items });
const ordinary = (db) => db.state.lines.filter((l) => l.selection.length === 0);
const savedMattress = { id: "m", variantId: variantGid(333), quantity: 2, baseCents: 14900, unitCents: 14900, selection: [] };

test("reads a valid list and joins repeats of one variant", () => {
  assert.deepEqual(readCartItems([]), []);
  assert.deepEqual(readCartItems([item("333", 2), item("333", 3), item("444")]), [item("333", 5), item("444", 1)]);
});

test("refuses a malformed list", () => {
  const bad = [
    "x", null, {}, [null], [{}], [item("abc")], [item(333)], [item("333", 0)], [item("333", 100)], [item("333", 1.5)],
    [item("333", 60), item("333", 60)], [item("333", 1, "222"), item("333", 1, "999")],
    Array.from({ length: 31 }, (_, i) => item(String(i + 1))),
  ];
  for (const value of bad) assert.equal(readCartItems(value), null, JSON.stringify(value).slice(0, 60));
});

test("adds an item from the Shopify cart at Shopify's price and keeps the rest of the basket", async () => {
  const db = fakeDatabase();
  assert.deepEqual(await copy(db, shopify(), [item("333", 2)]), { ok: true });
  const [line] = ordinary(db);
  assert.equal(line.quantity, 2);
  assert.equal(line.unitCents, 14900);
  assert.equal(line.productId, "222");
  assert.equal(db.state.lines.length, 2);
  assert.equal(db.state.version, 4);
});

test("an unchanged cart does not change the basket, so a repeat click reuses its checkout", async () => {
  const db = fakeDatabase([BED, savedMattress]);
  assert.deepEqual(await copy(db, shopify(), [item("333", 2)]), { ok: true });
  assert.equal(db.state.version, 3);
});

test("a changed quantity or Shopify price updates the saved line", async () => {
  let db = fakeDatabase([BED, savedMattress]);
  await copy(db, shopify(), [item("333", 4)]);
  assert.equal(ordinary(db)[0].quantity, 4);
  assert.equal(db.state.version, 4);

  db = fakeDatabase([BED, savedMattress]);
  await copy(db, shopify({ price: "159.00" }), [item("333", 2)]);
  assert.equal(ordinary(db)[0].unitCents, 15900);
  assert.equal(db.state.version, 4);
});

test("an item gone from the Shopify cart leaves the basket, and the configured item stays", async () => {
  const db = fakeDatabase([BED, savedMattress]);
  assert.deepEqual(await copy(db, shopify(), []), { ok: true });
  assert.deepEqual(db.state.lines.map((l) => l.id), ["bed"]);
});

test("a refused item changes nothing and is named", async () => {
  const db = fakeDatabase([BED, savedMattress]);
  const result = await copy(db, shopify({ variants: ["333"] }), [item("333", 9), item("444")]);
  assert.deepEqual(result, { ok: false, problems: [{ variant: "444", code: "unknown_variant" }] });
  assert.equal(db.state.version, 3);
  assert.equal(ordinary(db)[0].quantity, 2);
});

test("will not check out ordinary items on their own", async () => {
  const neverCalled = async () => assert.fail("Shopify should not be called");
  assert.deepEqual(await copy(fakeDatabase([savedMattress]), neverCalled, [item("333")]), { ok: false, code: "empty_basket" });
  assert.deepEqual(await copy(fakeDatabase([]), neverCalled, []), { ok: false, code: "empty_basket" });
});

test("reports a missing basket and an unreachable Shopify", async () => {
  const missing = { basket: { findUnique: async () => null } };
  assert.deepEqual(await copy(missing, shopify(), []), { ok: false, code: "basket_not_found" });

  const failing = async () => {
    throw new Error("network");
  };
  const db = fakeDatabase();
  assert.deepEqual(await copy(db, failing, [item("333")]), { ok: false, code: "unavailable" });
  assert.equal(db.state.version, 3);
});

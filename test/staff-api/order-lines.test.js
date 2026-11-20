// What the Orders app is told about an order's lines, from the saved order snapshot.
import assert from "node:assert/strict";
import { test } from "node:test";
import { orderLinesFor } from "../../app/staff-api/order-lines.server.js";

const SHOP = "urban-deco-dev.myshopify.com";
const ORDER = "gid://shopify/Order/8420856463699";

const configuration = { baseCents: 99999, unitCents: 112999, options: [{ group: "Select Fabric", label: "Carlton Caramel", cfsId: "17020903", assignmentId: "a1", quantity: 1, cents: 13000 }] };
const line = (over = {}) => ({
  lineItemId: "gid://shopify/LineItem/1",
  productId: "gid://shopify/Product/11067852980563",
  configurable: true,
  variantId: "gid://shopify/ProductVariant/55773143433555",
  sku: "CFS-TYPE-146477-17019157",
  title: "Natural Gold Bed",
  variantTitle: "2ft 6in Small Single",
  quantity: 2,
  attributes: [],
  unitCents: 112999,
  discounts: [],
  discountCents: 0,
  totalCents: 225998,
  configuration,
  ...over,
});
const row = (over = {}, lines = [line()]) => ({
  orderName: "#1038",
  matchStatus: "matched",
  financialStatus: "PAID",
  cancelledAt: null,
  specification: { lines },
  ...over,
});
const dbWith = (snapshot) => ({ orderSnapshot: { findUnique: async ({ where }) => (where.shop_orderId.shop === SHOP && where.shop_orderId.orderId === ORDER ? snapshot : null) } });
const ask = (snapshot) => orderLinesFor(dbWith(snapshot), { shop: SHOP, orderId: ORDER });

test("lists a configured line of a matched order as editable, with its configuration", async () => {
  const { status, body } = await ask(row());
  assert.equal(status, 200);
  assert.equal(body.orderName, "#1038");
  assert.equal(body.financialStatus, "PAID");
  assert.equal(body.cancelledAt, null);
  assert.deepEqual(body.lines, [
    {
      lineItemId: "gid://shopify/LineItem/1",
      productId: "gid://shopify/Product/11067852980563",
      variantId: "gid://shopify/ProductVariant/55773143433555",
      title: "Natural Gold Bed",
      variantTitle: "2ft 6in Small Single",
      quantity: 2,
      unitCents: 112999,
      configuration,
      editable: true,
    },
  ]);
});

test("a snapshot that did not match its checkout is not editable", async () => {
  for (const matchStatus of ["price_mismatch", "no_attempt"]) {
    const { body } = await ask(row({ matchStatus }));
    assert.deepEqual([body.lines[0].editable, body.lines[0].reason], [false, "no_matching_checkout"], matchStatus);
  }
});

test("a cancelled order is not editable", async () => {
  const { body } = await ask(row({ cancelledAt: new Date("2026-11-20T09:00:00Z") }));
  assert.deepEqual([body.lines[0].editable, body.lines[0].reason], [false, "order_cancelled"]);
  assert.equal(body.cancelledAt, "2026-11-20T09:00:00.000Z");
});

test("an ordinary line with no configuration is not editable", async () => {
  const { body } = await ask(row({}, [line({ configurable: false, configuration: null })]));
  assert.deepEqual([body.lines[0].editable, body.lines[0].reason], [false, "not_configured"]);
});

test("each line is judged on its own", async () => {
  const { body } = await ask(row({}, [line(), line({ lineItemId: "gid://shopify/LineItem/2", configurable: false, configuration: null })]));
  assert.deepEqual(body.lines.map((l) => l.editable), [true, false]);
});

test("an order with no snapshot is 404 no_snapshot", async () => {
  assert.deepEqual(await ask(null), { status: 404, body: { ok: false, errors: [{ code: "no_snapshot" }] } });
});

test("a snapshot with no readable lines gives an empty list, not a crash", async () => {
  const { status, body } = await ask(row({ specification: {} }));
  assert.equal(status, 200);
  assert.deepEqual(body.lines, []);
});

test("rejects a malformed order id without reading the database", async () => {
  let reads = 0;
  const db = { orderSnapshot: { findUnique: async () => { reads += 1; return null; } } };
  const result = await orderLinesFor(db, { shop: SHOP, orderId: "not-an-order" });
  assert.deepEqual(result, { status: 400, body: { ok: false, errors: [{ code: "bad_request" }] } });
  assert.equal(reads, 0);
});

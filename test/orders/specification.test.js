import assert from "node:assert/strict";
import { test } from "node:test";
import { attemptIdOf, buildSnapshot, readOrder } from "../../app/orders/specification.server.js";

const BED = "gid://shopify/ProductVariant/1";
const KING = "gid://shopify/ProductVariant/2";
const MATTRESS = "gid://shopify/ProductVariant/3";

const money = (amount, currencyCode = "GBP") => ({ shopMoney: { amount, currencyCode } });

const twoDrawer = [
  { choiceId: "17020886", assignmentId: "17020886", group: "Select Drawer", label: "with 2 Drawer", cents: 8999 },
  { choiceId: "17020909", assignmentId: "17020909", group: "Select Fabric", label: "Carlton Caramel", cents: 0 },
];
const slidestore = [
  { choiceId: "17020898", assignmentId: "17020902", group: "Select Drawer", label: "with Slidestore", cents: 5999 },
  { choiceId: "17020909", assignmentId: "17020909", group: "Select Fabric", label: "Carlton Caramel", cents: 0 },
];

const checkoutLine = (variantId, selection, { quantity = 1, baseCents = 99999, sku = "BED" } = {}) => ({
  lineId: `line-${variantId}-${selection.length}`,
  productId: "10",
  variantId,
  sku,
  title: "Natural Gold",
  variantTitle: "2ft 6in",
  quantity,
  baseCents,
  unitCents: selection.reduce((sum, choice) => sum + choice.cents, baseCents),
  selection,
});

const attempt = (lines, id = "attempt-1") => ({
  id,
  basketVersion: 4,
  createdAt: new Date("2026-11-10T10:00:00Z"),
  totalCents: lines.reduce((sum, line) => sum + line.unitCents * line.quantity, 0),
  lines,
});

const orderLine = (variantId, unitAmount, { quantity = 1, attributes = [], allocations = [], id = variantId } = {}) => ({
  id: `gid://shopify/LineItem/${id}`,
  title: "Natural Gold",
  variantTitle: "2ft 6in",
  sku: "BED",
  quantity,
  variant: { id: variantId },
  product: { id: "gid://shopify/Product/10" },
  originalUnitPriceSet: money(unitAmount),
  customAttributes: attributes,
  discountAllocations: allocations.map(([index, amount]) => ({
    allocatedAmountSet: money(amount),
    discountApplication: { index },
  })),
});

const twoDrawerNotes = [{ key: "Drawer", value: "with 2 Drawer" }, { key: "Fabric", value: "Carlton Caramel" }];
const slidestoreNotes = [{ key: "Drawer", value: "with Slidestore" }, { key: "Fabric", value: "Carlton Caramel" }];

const order = (lineItems, { attemptId = "attempt-1", discounts = [], totals = {} } = {}) => ({
  id: "gid://shopify/Order/99",
  name: "#1099",
  createdAt: "2026-11-10T10:05:00Z",
  test: true,
  sourceName: "shopify_draft_order",
  displayFinancialStatus: "PAID",
  cancelledAt: null,
  currencyCode: "GBP",
  taxesIncluded: true,
  customAttributes: attemptId ? [{ key: "_cfs_attempt", value: attemptId }] : [],
  discountApplications: { pageInfo: { hasNextPage: false }, nodes: discounts },
  lineItems: { pageInfo: { hasNextPage: false }, nodes: lineItems },
  subtotalPriceSet: money(totals.subtotal ?? "0.0"),
  totalDiscountsSet: money(totals.discounts ?? "0.0"),
  totalShippingPriceSet: money(totals.shipping ?? "0.0"),
  totalTaxSet: money(totals.tax ?? "0.0"),
  totalPriceSet: money(totals.total ?? "0.0"),
});

test("a mixed order matching its checkout keeps the bed's options and the mattress's plain price", () => {
  const bed = checkoutLine(BED, twoDrawer);
  const mattress = checkoutLine(MATTRESS, [], { baseCents: 14900, sku: "TEST-EOC-S" });
  const snapshot = buildSnapshot(
    order([orderLine(BED, "1089.98", { attributes: twoDrawerNotes }), orderLine(MATTRESS, "149.0")], {
      totals: { subtotal: "1238.98", total: "1238.98" },
    }),
    attempt([bed, mattress]),
  );

  assert.equal(snapshot.matchStatus, "matched");
  assert.equal(snapshot.attemptId, "attempt-1");
  assert.equal(snapshot.financialStatus, "PAID");
  const [bedLine, mattressLine] = snapshot.specification.lines;
  assert.deepEqual(bedLine.configuration, {
    baseCents: 99999,
    unitCents: 108998,
    options: [
      { group: "Select Drawer", label: "with 2 Drawer", cfsId: "17020886", assignmentId: "17020886", cents: 8999 },
      { group: "Select Fabric", label: "Carlton Caramel", cfsId: "17020909", assignmentId: "17020909", cents: 0 },
    ],
  });
  assert.equal(bedLine.totalCents, 108998);
  assert.deepEqual(mattressLine.configuration, { baseCents: 14900, unitCents: 14900, options: [] });
  assert.deepEqual(snapshot.specification.totals, {
    beforeDiscountsCents: 123898,
    discountCents: 0,
    subtotalCents: 123898,
    shippingCents: 0,
    taxCents: 0,
    totalCents: 123898,
  });
  assert.deepEqual(snapshot.specification.checkout, {
    attemptId: "attempt-1",
    basketVersion: 4,
    createdAt: "2026-11-10T10:00:00.000Z",
    totalCents: 123898,
  });
  assert.deepEqual(snapshot.specification.missingCheckoutLines, []);
});

test("two configurations of the same size are told apart by their options, in any order", () => {
  const snapshot = buildSnapshot(
    order([
      orderLine(BED, "1059.98", { attributes: slidestoreNotes, id: "a" }),
      orderLine(BED, "1089.98", { attributes: twoDrawerNotes, id: "b" }),
    ]),
    attempt([checkoutLine(BED, twoDrawer), checkoutLine(BED, slidestore)]),
  );

  assert.equal(snapshot.matchStatus, "matched");
  assert.equal(snapshot.specification.lines[0].configuration.options[0].assignmentId, "17020902");
  assert.equal(snapshot.specification.lines[1].configuration.options[0].assignmentId, "17020886");
});

test("Shopify's discounts are kept per line and per discount, after the app's price", () => {
  const snapshot = buildSnapshot(
    order([orderLine(BED, "1089.98", { quantity: 2, attributes: twoDrawerNotes, allocations: [[0, "218.00"], [1, "50.00"]] })], {
      discounts: [
        {
          __typename: "AutomaticDiscountApplication",
          index: 0,
          title: "10% off beds",
          allocationMethod: "ACROSS",
          targetSelection: "ENTITLED",
          targetType: "LINE_ITEM",
          value: { percentage: 10 },
        },
        {
          __typename: "DiscountCodeApplication",
          index: 1,
          code: "TAKE50",
          allocationMethod: "ACROSS",
          targetSelection: "ALL",
          targetType: "LINE_ITEM",
          value: { amount: "50.0", currencyCode: "GBP" },
        },
      ],
      totals: { subtotal: "1911.96", discounts: "268.00", total: "1911.96" },
    }),
    attempt([checkoutLine(BED, twoDrawer, { quantity: 2 })]),
  );

  assert.equal(snapshot.matchStatus, "matched");
  const [line] = snapshot.specification.lines;
  assert.deepEqual(line.discounts, [{ discount: 0, cents: 21800 }, { discount: 1, cents: 5000 }]);
  assert.equal(line.discountCents, 26800);
  assert.equal(line.totalCents, 2 * 108998 - 26800);
  assert.deepEqual(snapshot.specification.discounts.map((d) => [d.type, d.title, d.code, d.value]), [
    ["AutomaticDiscountApplication", "10% off beds", null, { percentage: 10 }],
    ["DiscountCodeApplication", null, "TAKE50", { cents: 5000 }],
  ]);
  assert.equal(snapshot.specification.totals.beforeDiscountsCents, 217996);
  assert.equal(snapshot.specification.totals.discountCents, 26800);
});

test("an order that did not come from an app checkout is recorded with no checkout", () => {
  const snapshot = buildSnapshot(order([orderLine(BED, "999.99")], { attemptId: null }), null);

  assert.equal(snapshot.matchStatus, "no_attempt");
  assert.equal(snapshot.attemptId, null);
  assert.equal(snapshot.specification.checkout, null);
  assert.equal(snapshot.specification.claimedAttemptId, null);
  assert.equal(snapshot.specification.lines[0].configuration, null);
});

test("an order naming a checkout the app cannot find keeps the name it gave", () => {
  const snapshot = buildSnapshot(order([orderLine(BED, "1089.98")], { attemptId: "missing" }), null);

  assert.equal(snapshot.matchStatus, "no_attempt");
  assert.equal(snapshot.specification.claimedAttemptId, "missing");
});

test("a checkout for a different attempt is never linked", () => {
  const snapshot = buildSnapshot(
    order([orderLine(BED, "1089.98", { attributes: twoDrawerNotes })], { attemptId: "attempt-1" }),
    attempt([checkoutLine(BED, twoDrawer)], "attempt-2"),
  );

  assert.equal(snapshot.matchStatus, "no_attempt");
  assert.equal(snapshot.attemptId, null);
});

test("a different price, quantity, option or extra line makes the order a mismatch", () => {
  const checkout = attempt([checkoutLine(BED, twoDrawer)]);
  const cases = {
    price: [orderLine(BED, "999.99", { attributes: twoDrawerNotes })],
    quantity: [orderLine(BED, "1089.98", { quantity: 2, attributes: twoDrawerNotes })],
    option: [orderLine(BED, "1089.98", { attributes: slidestoreNotes })],
    variant: [orderLine(KING, "1089.98", { attributes: twoDrawerNotes })],
    extra: [orderLine(BED, "1089.98", { attributes: twoDrawerNotes }), orderLine(MATTRESS, "149.0")],
  };
  for (const [name, lines] of Object.entries(cases)) {
    assert.equal(buildSnapshot(order(lines), checkout).matchStatus, "price_mismatch", name);
  }
});

test("a checkout line missing from the order is listed", () => {
  const snapshot = buildSnapshot(
    order([orderLine(BED, "1089.98", { attributes: twoDrawerNotes })]),
    attempt([checkoutLine(BED, twoDrawer), checkoutLine(MATTRESS, [], { baseCents: 14900, sku: "TEST-EOC-S" })]),
  );

  assert.equal(snapshot.matchStatus, "price_mismatch");
  assert.deepEqual(
    snapshot.specification.missingCheckoutLines.map((line) => [line.sku, line.quantity, line.unitCents]),
    [["TEST-EOC-S", 1, 14900]],
  );
});

test("amounts in another currency or an unreadable form are refused", () => {
  const checkout = attempt([checkoutLine(MATTRESS, [], { baseCents: 14900 })]);
  const euro = orderLine(MATTRESS, "149.0");
  euro.originalUnitPriceSet = money("149.0", "EUR");
  assert.throws(() => buildSnapshot(order([euro]), checkout), /currency/);
  assert.throws(() => buildSnapshot(order([orderLine(MATTRESS, "149.005")]), checkout), /amount/);
});

test("a cancelled order keeps its cancellation time", () => {
  const cancelled = { ...order([orderLine(BED, "999.99")], { attemptId: null }), cancelledAt: "2026-11-11T09:00:00Z", displayFinancialStatus: "REFUNDED" };
  const snapshot = buildSnapshot(cancelled, null);
  assert.equal(snapshot.financialStatus, "REFUNDED");
  assert.equal(snapshot.cancelledAt.toISOString(), "2026-11-11T09:00:00.000Z");
});

test("each line says whether its product is a CFS configurable product", () => {
  const configured = orderLine(BED, "999.99", { id: "a" });
  configured.product = { id: "gid://shopify/Product/10", cfsWorkflow: { id: "m1" }, cfsModelCards: null, cfsOptions: null };
  const plain = orderLine(MATTRESS, "149.0", { id: "b" });
  plain.product = { id: "gid://shopify/Product/2", cfsWorkflow: null, cfsModelCards: null, cfsOptions: null };
  const custom = { ...orderLine(MATTRESS, "10.0", { id: "c" }), product: null, variant: null };

  const lines = buildSnapshot(order([configured, plain, custom], { attemptId: null }), null).specification.lines;
  assert.deepEqual(lines.map((line) => line.configurable), [true, false, false]);
});

test("attemptIdOf reads only the app's own note", () => {
  assert.equal(attemptIdOf(order([], { attemptId: "abc" })), "abc");
  assert.equal(attemptIdOf(order([], { attemptId: null })), null);
  assert.equal(attemptIdOf({ customAttributes: [{ key: "_cfs_attempt", value: "" }] }), null);
});

test("readOrder refuses an order Shopify sent only part of, and returns null for none", async () => {
  const reply = (data) => async () => ({ json: async () => ({ data }) });
  const partial = order([]);
  partial.lineItems.pageInfo.hasNextPage = true;
  await assert.rejects(readOrder(reply({ order: partial }), "id"), /too large/);
  assert.equal(await readOrder(reply({ order: null }), "id"), null);
  assert.equal((await readOrder(reply({ order: order([]) }), "id")).name, "#1099");
});

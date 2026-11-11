import assert from "node:assert/strict";
import { test } from "node:test";
import { adminOrderUrl, dateTime, discountText, groupName, matchBadge, money, paymentLabel } from "../../app/orders/format.js";
import { pageOf } from "../../app/orders/order-list.server.js";

test("amounts are shown in pounds", () => {
  assert.equal(money(108998, "GBP"), "£1,089.98");
  assert.equal(money(-5000, "GBP"), "-£50.00");
});

test("times are shown in UK time", () => {
  assert.equal(dateTime("2026-11-11T08:02:51Z"), "11 Nov 2026, 08:02");
  assert.equal(dateTime("2026-07-01T08:00:00Z"), "1 Jul 2026, 09:00");
});

test("each check result has a badge, and anything unexpected is not shown as fine", () => {
  assert.deepEqual(matchBadge("matched"), { label: "Matched", tone: "success" });
  assert.equal(matchBadge("no_attempt").tone, "critical");
  assert.equal(matchBadge("price_mismatch").tone, "critical");
  assert.equal(matchBadge("something_new").tone, "warning");
});

test("Shopify's payment statuses read as words", () => {
  assert.equal(paymentLabel("PAID"), "Paid");
  assert.equal(paymentLabel("PARTIALLY_REFUNDED"), "Partially refunded");
});

test("the Shopify admin link uses the order number", () => {
  assert.equal(adminOrderUrl("gid://shopify/Order/8378072465747"), "shopify://admin/orders/8378072465747");
});

test("discounts show their code or title and value", () => {
  assert.equal(discountText({ code: "SUMMER10", value: { percentage: 10 } }, "GBP"), "SUMMER10 (10%)");
  assert.equal(discountText({ code: null, title: "Staff", value: { cents: 5000 } }, "GBP"), "Staff (£50.00)");
});

test("option groups read as on the storefront", () => {
  assert.equal(groupName("Select Drawer"), "Drawer");
  assert.equal(groupName("Headboard"), "Headboard");
});

test("a page number in the address is used only if it makes sense", () => {
  const at = (query) => pageOf(`https://app.test/app/orders${query}`);
  assert.equal(at(""), 1);
  assert.equal(at("?page=3"), 3);
  for (const bad of ["?page=0", "?page=-2", "?page=1.5", "?page=abc", "?page=100000"]) assert.equal(at(bad), 1);
});

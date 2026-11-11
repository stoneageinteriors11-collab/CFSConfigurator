import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { quoteConfiguration } from "../../app/pricing/quote.server.js";

const load = (name) => JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8"));
const naturalGold = load("natural-gold.json");
const priceChecks = load("natural-gold-price-checks.json");

const VARIANT_2FT6 = "gid://shopify/ProductVariant/55773143433555";
const WITHOUT_DRAWER = "17020880";
const TWO_DRAWERS = "17020886";
const FOUR_DRAWERS = "17020892";
const CARLTON_BLACK = "17020903";

const quote = (choiceIds, variantId = VARIANT_2FT6, product = naturalGold) =>
  quoteConfiguration(product, { variantId, choiceIds });

const codes = (result) => result.errors.map((e) => e.code);
const copy = () => structuredClone(naturalGold);
const option = (product, cfsId) => product.options.find((o) => o.cfsId === cfsId);

test("Natural Gold with 2 drawers is £1,089.98 before discounts", () => {
  const result = quote([TWO_DRAWERS, CARLTON_BLACK]);
  assert.equal(result.ok, true);
  assert.equal(result.baseCents, 99999);
  assert.equal(result.totalCents, 108998);
  assert.deepEqual(result.lines.map((l) => [l.group, l.assignmentId, l.cents]), [
    ["Select Drawer", TWO_DRAWERS, 8999],
    ["Select Fabric", CARLTON_BLACK, 0],
  ]);
});

test("Without Drawer is a valid no-charge choice", () => {
  assert.equal(quote([WITHOUT_DRAWER, CARLTON_BLACK]).totalCents, 99999);
});

test("matches all stored Natural Gold price checks", () => {
  const variantFor = (modelId) => {
    const sku = Object.keys(naturalGold.modelCards).find((s) => naturalGold.modelCards[s].source_id === modelId);
    return naturalGold.variants.find((v) => v.sku === sku).id;
  };
  const choiceFor = (assignmentId) =>
    naturalGold.options.find((o) => o.mappings.assignments.some((a) => a.id === assignmentId)).cfsId;

  assert.equal(priceChecks.length, 311);
  for (const check of priceChecks) {
    const result = quote(check.option_ids.map(choiceFor), variantFor(check.model_id));
    assert.equal(result.ok, true, check.name);
    assert.equal(result.totalCents, check.raw_cents, check.name);
  }
});

test("uses the choice's price for the selected size", () => {
  const big = naturalGold.variants.find((v) => v.sku === "CFS-TYPE-146477-17019162");
  const result = quote([TWO_DRAWERS, CARLTON_BLACK], big.id);
  assert.equal(result.totalCents, 184999 + 8999);
  assert.equal(result.lines[0].assignmentId, "17020891");
});

test("refuses missing required choices", () => {
  assert.deepEqual(codes(quote([])), ["missing_required", "missing_required"]);
  assert.deepEqual(quote([TWO_DRAWERS]).errors, [{ code: "missing_required", group: "Select Fabric" }]);
  assert.deepEqual(codes(quote([CARLTON_BLACK])), ["missing_required", "prerequisite_missing"]);
});

test("refuses a choice not available for the selected size", () => {
  assert.deepEqual(codes(quote([FOUR_DRAWERS, CARLTON_BLACK])), [
    "incompatible_choice",
    "missing_required",
    "prerequisite_missing",
  ]);
});

test("refuses two choices in one group, repeats and unknown choices", () => {
  assert.ok(codes(quote([TWO_DRAWERS, WITHOUT_DRAWER, CARLTON_BLACK])).includes("too_many_in_group"));
  assert.deepEqual(codes(quote([TWO_DRAWERS, TWO_DRAWERS, CARLTON_BLACK])), ["duplicate_choice"]);
  assert.ok(codes(quote(["99999999", TWO_DRAWERS, CARLTON_BLACK])).includes("unknown_choice"));
});

test("refuses an unknown or sold-out variant", () => {
  assert.deepEqual(codes(quote([TWO_DRAWERS, CARLTON_BLACK], "gid://shopify/ProductVariant/1")), ["unknown_variant"]);
  const product = copy();
  product.variants[0].inventoryQuantity = 0;
  assert.deepEqual(codes(quote([TWO_DRAWERS, CARLTON_BLACK], VARIANT_2FT6, product)), ["variant_unavailable"]);
});

test("ignores prices sent by the browser", () => {
  const result = quoteConfiguration(naturalGold, {
    variantId: VARIANT_2FT6,
    choiceIds: [TWO_DRAWERS, CARLTON_BLACK],
    totalCents: 1,
    baseCents: 1,
  });
  assert.equal(result.totalCents, 108998);
});

test("refuses bad data instead of treating it as free", () => {
  for (const bad of ["", "abc", "-1.00", "1.999", null, undefined]) {
    const product = copy();
    option(product, TWO_DRAWERS).mappings.assignments[0].raw_price = bad;
    assert.ok(codes(quote([TWO_DRAWERS, CARLTON_BLACK], VARIANT_2FT6, product)).includes("invalid_choice_data"), String(bad));
  }

  const noMappings = copy();
  delete option(noMappings, TWO_DRAWERS).mappings;
  assert.ok(codes(quote([TWO_DRAWERS, CARLTON_BLACK], VARIANT_2FT6, noMappings)).includes("invalid_choice_data"));

  const ambiguous = copy();
  const drawer = option(ambiguous, TWO_DRAWERS);
  drawer.mappings.assignments.push({ ...drawer.mappings.assignments[0], raw_price: "1.00" });
  assert.ok(codes(quote([TWO_DRAWERS, CARLTON_BLACK], VARIANT_2FT6, ambiguous)).includes("invalid_choice_data"));

  const noCard = copy();
  delete noCard.modelCards["CFS-TYPE-146477-17019157"];
  assert.deepEqual(codes(quote([TWO_DRAWERS, CARLTON_BLACK], VARIANT_2FT6, noCard)), ["invalid_product_data"]);

  const badBase = copy();
  badBase.variants[0].price = "free";
  assert.deepEqual(codes(quote([TWO_DRAWERS, CARLTON_BLACK], VARIANT_2FT6, badBase)), ["invalid_product_data"]);
});

test("the CFS type name does not change the price", () => {
  const renamed = copy();
  renamed.workflow.mode = "aTypeNobodyHasSeen";
  assert.equal(quote([TWO_DRAWERS, CARLTON_BLACK], VARIANT_2FT6, renamed).totalCents, 108998);
});

test("a product with a kind of choice the app does not price yet is refused whole", () => {
  const accessory = copy();
  option(accessory, FOUR_DRAWERS).mappings.kind = "accessory";
  // Refused even when that choice is not picked, so the shopper never meets a choice that cannot be bought.
  assert.deepEqual(codes(quote([TWO_DRAWERS, CARLTON_BLACK], VARIANT_2FT6, accessory)), ["unsupported_product"]);
});

test("refuses a later choice when its optional prerequisite is not selected", () => {
  const product = copy();
  product.workflow.groups[0].optional = true;
  assert.deepEqual(quote([CARLTON_BLACK], VARIANT_2FT6, product).errors, [
    { code: "prerequisite_missing", group: "Select Fabric", requires: "Select Drawer" },
  ]);
});

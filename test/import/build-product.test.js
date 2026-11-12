import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildProduct, choiceIdFor, sizeIdOf } from "../../app/import/build-product.js";
import { exportRows } from "../../app/import/export-rows.js";
import { checkProduct } from "../../app/pricing/product-check.server.js";
import { quoteConfiguration } from "../../app/pricing/quote.server.js";

const load = (name) => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), "utf8"));
const FIXTURES = ["natural-gold", "fargo", "loft", "mayfair", "moreno", "paris", "zenaya"];
const cfsIdOf = (product) => /-(\d+)-\d+$/.exec(product.variants[0].sku)[1];
const rebuild = (fixture) => {
  const id = cfsIdOf(fixture);
  return buildProduct({ cfsProductId: id, ...exportRows(id, fixture) }, fixture);
};

const naturalGold = load("natural-gold");
const NG = "146477";
const SIZES = ["17019157", "17019158", "17019159", "17019160", "17019161", "17019162"];
const variantOf = (product, sizeId) => product.variants.find((v) => v.sku.endsWith(`-${sizeId}`)).id;

// A small valid sheet for Natural Gold, changed per test.
const group = (values = {}) => ({
  row: 2, name: "Select Fabric", order: 1, required: true, after: "", kind: "option", maxQuantity: null, ...values,
});
const choice = (values = {}) => ({
  row: 2, group: "Select Fabric", label: "Carlton Black", price: "0", sizes: [], sizePrices: {},
  cfsId: "", optionCode: "", imageUrl: "", details: "", ...values,
});
const build = (groups, choices, product = naturalGold) => buildProduct({ cfsProductId: NG, groups, choices }, product);
const messages = (result) => result.errors.map((e) => e.message);

test("reads the size ID from real and test SKUs", () => {
  assert.equal(sizeIdOf("CFS-146477-17019157", "146477"), "17019157");
  assert.equal(sizeIdOf("UD-146477-17019157", "146477"), "17019157");
  assert.equal(sizeIdOf("CFS-TYPE-146477-17019157", "146477"), "17019157");
  assert.equal(sizeIdOf("CFS-146478-17019157", "146477"), null);
  assert.equal(sizeIdOf("CFSDB-070", "146477"), null);
  assert.equal(sizeIdOf("", "146477"), null);
  assert.equal(sizeIdOf(null, "146477"), null);
});

for (const name of FIXTURES) {
  test(`round trip keeps every price, ID and product check result: ${name}`, () => {
    const fixture = load(name);
    const { product, errors } = rebuild(fixture);
    assert.deepEqual(errors, []);

    // Choices, their CFS IDs per size, prices and details come back exactly.
    // loadConfigurableProduct always gives imageUrl; the oldest fixture predates that.
    assert.deepEqual(product.options, fixture.options.map((o) => ({ ...o, imageUrl: o.imageUrl ?? null })));
    assert.deepEqual(product.modelCards, fixture.modelCards);
    assert.deepEqual(
      product.workflow.groups.map((g) => [g.name, g.optional]),
      fixture.workflow.groups.map((g) => [g.name, g.optional]),
    );

    const before = checkProduct(fixture);
    const after = checkProduct(product);
    assert.equal(after.ready, true, after.problems.join("; "));
    assert.deepEqual(after.problems, before.problems);
    assert.equal(after.fromCents, before.fromCents);
  });
}

test("round trip matches all 311 Natural Gold price checks", () => {
  const { product } = rebuild(naturalGold);
  const checks = load("natural-gold-price-checks");
  const choiceFor = (assignmentId) =>
    product.options.find((o) => o.mappings.assignments.some((a) => a.id === assignmentId)).cfsId;
  assert.equal(checks.length, 311);
  for (const check of checks) {
    const result = quoteConfiguration(product, {
      variantId: variantOf(product, check.model_id),
      choiceIds: check.option_ids.map(choiceFor),
    });
    assert.equal(result.totalCents, check.raw_cents, check.name);
  }
});

test("blank Sizes prices every size, Size prices override one", () => {
  const { product, errors } = build(
    [group({ name: "Select Drawer" })],
    [choice({ group: "Select Drawer", label: "with 2 Drawer", price: "89.99", sizePrices: { 17019162: "99.99" } })],
  );
  assert.deepEqual(errors, []);
  const id = product.options[0].cfsId;
  const price = (sizeId) =>
    quoteConfiguration(product, { variantId: variantOf(product, sizeId), choiceIds: [id] }).lines[0].cents;
  assert.equal(price("17019157"), 8999);
  assert.equal(price("17019162"), 9999);
});

test("a choice limited to some sizes is not offered on the others", () => {
  const { product, errors } = build(
    [group({ required: false })],
    [choice({ sizes: ["17019159"], price: "5" })],
  );
  assert.deepEqual(errors, []);
  const id = product.options[0].cfsId;
  const on = (sizeId) => quoteConfiguration(product, { variantId: variantOf(product, sizeId), choiceIds: [id] });
  assert.equal(on("17019159").totalCents, 120999 + 500);
  assert.deepEqual(on("17019157").errors.map((e) => e.code), ["incompatible_choice"]);
});

test("the same row always gets the same choice ID", () => {
  const first = choiceIdFor("146477", "Select Fabric", "Carlton Black", "");
  assert.equal(first, choiceIdFor("146477", "Select Fabric", "Carlton Black", ""));
  assert.match(first, /^imp-[0-9a-f]{16}$/);
  assert.notEqual(first, choiceIdFor("146477", "Select Fabric", "Carlton Mink", ""));
  assert.notEqual(first, choiceIdFor("146506", "Select Fabric", "Carlton Black", ""));
  assert.equal(choiceIdFor("146477", "Select Fabric", "Carlton Black", "17020903"), "17020903");
});

test("keeps CFS's own reference for each size, and makes new ones only for new sizes", () => {
  // Natural Gold's "with 2 Drawer" has CFS reference 17020887 on size 17019158.
  const { product } = build(
    [group({ name: "Select Drawer", required: false })],
    [choice({ group: "Select Drawer", label: "with 2 Drawer", cfsId: "17020886", price: "89.99", sizes: ["17019158"] })],
  );
  assert.deepEqual(product.options[0].mappings.assignments, [
    { id: "17020887", parent: "17019158", parent2: "0", raw_price: "89.99" },
  ]);
  const fresh = build([group()], [choice({ price: "1" })]).product.options[0];
  assert.deepEqual(fresh.mappings.assignments, [{ id: fresh.cfsId, parent: "0", parent2: "0", raw_price: "1" }]);
  const sized = build([group()], [choice({ price: "1", sizePrices: { 17019160: "2" } })]).product.options[0];
  assert.deepEqual(sized.mappings.assignments[1], {
    id: `${sized.cfsId}-17019160`, parent: "17019160", parent2: "0", raw_price: "2",
  });
});

test("a group with no Choose after waits only for the size", () => {
  const { product, errors } = build(
    [group(), group({ row: 3, name: "Select Drawer", order: 2 })],
    [choice(), choice({ row: 3, group: "Select Drawer", label: "None" })],
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(product.workflow.groups.map((g) => g.requires), ["$model", "$model"]);
  assert.equal(product.workflow.ordered, false);

  const chained = build(
    [group(), group({ row: 3, name: "Select Drawer", order: 2, after: "Select Fabric" })],
    [choice(), choice({ row: 3, group: "Select Drawer", label: "None" })],
  ).product;
  assert.deepEqual(chained.workflow.groups.map((g) => g.requires), ["$model", "Select Fabric"]);
  assert.equal(chained.workflow.ordered, true);
});

test("groups follow Display order and add-ons set the most per item", () => {
  const { product, errors } = build(
    [
      group({ name: "Select Lights", order: 2, required: false, kind: "accessory", maxQuantity: 3 }),
      group({ row: 3, order: 1 }),
    ],
    [choice(), choice({ row: 3, group: "Select Lights", label: "Lamp", price: "10" })],
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(product.workflow.groups.map((g) => g.name), ["Select Fabric", "Select Lights"]);
  assert.equal(product.workflow.pricing.accessory_max_quantity, 3);
  assert.equal(product.options[1].mappings.kind, "accessory");
});

test("refuses what the shop could not sell", () => {
  assert.deepEqual(messages(build([group({ required: false })], [choice({ sizes: ["99999999"] })])), [
    "Size 99999999 is not a size of this product in Shopify",
  ]);
  assert.deepEqual(messages(build([group()], [choice({ sizePrices: { 99999999: "1" } })])), [
    "Size 99999999 is not a size of this product in Shopify",
  ]);
  assert.deepEqual(messages(build([group()], [choice(), choice({ row: 3, group: "Select Colour" })])), [
    'Group "Select Colour" is not on the Groups sheet for product 146477',
  ]);
  const unknownAfter = build([group({ after: "Select Lid" })], [choice()]);
  assert.deepEqual(unknownAfter.errors, [
    { sheet: "Groups", row: 2, message: '"Choose after" names "Select Lid", which is not a group of this product' },
  ]);
  assert.deepEqual(messages(build([group({ after: "Select Fabric" })], [choice()])), [
    '"Choose after" must name a group shown earlier (lower Display order)',
  ]);
  assert.deepEqual(
    messages(
      build(
        [group({ after: "Select Drawer" }), group({ row: 3, name: "Select Drawer", order: 2 })],
        [choice(), choice({ row: 3, group: "Select Drawer" })],
      ),
    ),
    ['"Choose after" must name a group shown earlier (lower Display order)'],
  );
  assert.deepEqual(
    messages(
      build(
        [group(), group({ row: 3, name: "A", order: 2, required: false, kind: "accessory", maxQuantity: 5 }),
          group({ row: 4, name: "B", order: 3, required: false, kind: "accessory", maxQuantity: 3 })],
        [choice(), choice({ row: 3, group: "A" }), choice({ row: 4, group: "B" })],
      ),
    ),
    ['All add-on groups of one product must have the same "Max quantity" for now'],
  );
  assert.deepEqual(build([group()], [choice({ sizes: SIZES.slice(0, 5) })]).errors, [
    { sheet: "Groups", row: 2, message: 'Required group "Select Fabric" has no choice for size 17019162' },
  ]);
  assert.deepEqual(messages(build([group(), group({ row: 3, name: "Select Drawer", order: 2 })], [choice()])), [
    'Group "Select Drawer" has no choices',
  ]);
  assert.deepEqual(
    messages(build([group()], [choice({ cfsId: "17020903" }), choice({ row: 3, label: "Carlton Mink", cfsId: "17020903" })])),
    ["CFS choice ID 17020903 is used twice in product 146477"],
  );

  const many = Array.from({ length: 1251 }, (_, i) => choice({ row: i + 2, label: `Fabric ${i}` }));
  assert.deepEqual(messages(build([group()], many)), [
    "Product 146477 has 1,251 choices; the most the app can read is 1,250",
  ]);

  const noSizes = { ...naturalGold, variants: naturalGold.variants.map((v) => ({ ...v, sku: "CFSDB-070" })) };
  assert.deepEqual(messages(build([group()], [choice()], noSizes)), [
    "No Shopify size of this product has a SKU like CFS-146477-<size ID>",
  ]);
});

test("a refused product is not built", () => {
  assert.equal(build([group({ after: "Select Lid" })], [choice()]).product, null);
});

test("keeps settings the sheet does not cover", () => {
  const loft = load("loft");
  const { product } = rebuild(loft);
  assert.deepEqual(product.workflow.filters, ["height", "width"]);
  assert.equal(product.workflow.model_label, "Option");
  assert.equal(product.workflow.mode, loft.workflow.mode);
  assert.equal(product.workflow.pricing.source_url, loft.workflow.pricing.source_url);
  for (const sku of Object.keys(loft.modelCards)) {
    assert.equal(product.modelCards[sku].height, loft.modelCards[sku].height);
    assert.equal(product.modelCards[sku].width, loft.modelCards[sku].width);
  }
});

test("a product with no option data yet gets simple defaults", () => {
  const blank = { productId: naturalGold.productId, variants: naturalGold.variants };
  const { product, errors } = build([group()], [choice({ optionCode: "FAB-CARLTON-BLACK" })], blank);
  assert.deepEqual(errors, []);
  assert.equal(product.workflow.model_label, "Size");
  assert.deepEqual(product.workflow.filters, []);
  assert.equal(Object.keys(product.modelCards).length, 6);
  assert.deepEqual(product.modelCards["CFS-TYPE-146477-17019157"], {
    source_id: "17019157", image: "", dimensions: "", height: "", width: "",
  });
  assert.equal(product.options[0].optionCode, "FAB-CARLTON-BLACK");
  assert.equal(checkProduct(product).ready, true);
});

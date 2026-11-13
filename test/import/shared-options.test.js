import assert from "node:assert/strict";
import { test } from "node:test";
import { checkSharedOptions } from "../../app/import/shared-options.server.js";
import { fakeShop } from "./fake-shop.js";

const IN_SHEET = "gid://shopify/Product/1";
const OTHER = { id: "gid://shopify/Product/2", title: "Moreno Oak Bed" };
const THIRD = { id: "gid://shopify/Product/3", title: "Loft Bed" };

const live = (values = {}) => ({
  id: "gid://shopify/Metaobject/10",
  label: "Carlton Black",
  imageUrl: "https://cdn.example/black.jpg",
  details: "Soft touch",
  code: "FAB-CARLTON-BLACK",
  products: [OTHER],
  ...values,
});
const option = (values = {}) => ({
  cfsId: "c1",
  label: "Carlton Black",
  groupName: "Select Fabric",
  imageUrl: "https://cdn.example/black.jpg",
  optionCode: "FAB-CARLTON-BLACK",
  mappings: { kind: "option", dimensions: "Soft touch", assignments: [] },
  ...values,
});
const check = (entries, options, { pageSize, except = [IN_SHEET] } = {}) =>
  checkSharedOptions(fakeShop([], entries, pageSize), options, { exceptProductIds: except });

test("allows a code that matches on other products", async () => {
  assert.deepEqual(await check([live()], [option()]), { errors: [], warnings: [] });
});

test("allows a code nobody else has used yet", async () => {
  assert.deepEqual(await check([], [option()]), { errors: [], warnings: [] });
});

test("refuses a code whose name differs on another product, naming it", async () => {
  const { errors, warnings } = await check([live({ label: "Carlton Midnight" })], [option()]);
  assert.deepEqual(errors, [
    'Option code FAB-CARLTON-BLACK is "Carlton Midnight" on Moreno Oak Bed (2); this sheet gives it a different name. Add those products to the sheet to change it everywhere',
  ]);
  assert.deepEqual(warnings, []);
});

test("names every difference and every product", async () => {
  const entries = [
    live({ imageUrl: "https://cdn.example/other.jpg" }),
    live({ id: "gid://shopify/Metaobject/11", details: "Different", products: [THIRD] }),
  ];
  const { errors } = await check(entries, [option()]);
  assert.deepEqual(errors, [
    'Option code FAB-CARLTON-BLACK is "Carlton Black" on Moreno Oak Bed (2), Loft Bed (3); this sheet gives it a different image and details. Add those products to the sheet to change it everywhere',
  ]);
});

test("a missing image and an empty one are the same", async () => {
  const { errors } = await check([live({ imageUrl: "" })], [option({ imageUrl: null })]);
  assert.deepEqual(errors, []);
});

test("ignores products in the sheet", async () => {
  const entries = [live({ label: "Carlton Midnight", products: [{ id: IN_SHEET, title: "Natural Gold" }] })];
  assert.deepEqual(await check(entries, [option()]), { errors: [], warnings: [] });
});

test("ignores entries no product lists", async () => {
  const entries = [live({ label: "Carlton Midnight", products: [] })];
  assert.deepEqual(await check(entries, [option()]), { errors: [], warnings: [] });
});

test("warns on an uncoded choice named like a live coded option", async () => {
  const { errors, warnings } = await check([live()], [option({ optionCode: "" })]);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, [
    '"Carlton Black" has the same name as option code FAB-CARLTON-BLACK on Moreno Oak Bed; add the code if it is the same option',
  ]);
});

test("warns on a choice with a different code, and not on one with the same code", async () => {
  const { warnings } = await check([live()], [option({ optionCode: "FAB-OTHER" })]);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /same name as option code FAB-CARLTON-BLACK/);
  assert.deepEqual((await check([live()], [option()])).warnings, []);
});

test("does not warn about entries with no code", async () => {
  const { warnings } = await check([live({ code: "" })], [option({ optionCode: "" })]);
  assert.deepEqual(warnings, []);
});

test("looks up a quoted name safely", async () => {
  const label = 'The "Big" one';
  const { warnings } = await check([live({ label })], [option({ label, optionCode: "" })]);
  assert.equal(warnings.length, 1);
});

test("reads every page of matches", async () => {
  const entries = [1, 2, 3, 4, 5].map((n) =>
    live({
      id: `gid://shopify/Metaobject/${n}`,
      products: [{ id: `gid://shopify/Product/${100 + n}`, title: `Bed ${n}` }],
      label: n === 5 ? "Carlton Midnight" : "Carlton Black",
    }),
  );
  const { errors } = await check(entries, [option()], { pageSize: 2 });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Bed 5 \(105\)/);
});

test("looks each code and name up once however often it is used", async () => {
  let searches = 0;
  const shop = fakeShop([], [live()]);
  const counting = async (query, args) => {
    searches += 1;
    return shop(query, args);
  };
  const options = [option(), option({ cfsId: "c2", optionCode: "" }), option({ cfsId: "c3", optionCode: "" })];
  await checkSharedOptions(counting, options, { exceptProductIds: [IN_SHEET] });
  assert.equal(searches, 2); // the code once, the name once
});

test("an unreadable answer from Shopify blocks the import", async () => {
  const broken = async () => ({ json: async () => ({ errors: [{ message: "boom" }] }) });
  const { errors } = await checkSharedOptions(broken, [option()], { exceptProductIds: [IN_SHEET], sleep: async () => {} });
  assert.deepEqual(errors, ["Shopify could not be asked about shared options just now; try again"]);
});

test("retries a search that fails once, but not for ever", async () => {
  const shop = fakeShop([], [live()]);
  let failures = 1;
  const flaky = async (query, args) => {
    if (failures-- > 0) throw new Error("socket hang up");
    return shop(query, args);
  };
  const noWait = async () => {};
  const once = await checkSharedOptions(flaky, [option()], { exceptProductIds: [IN_SHEET], sleep: noWait });
  assert.deepEqual(once, { errors: [], warnings: [] });

  let calls = 0;
  const down = async () => {
    calls += 1;
    throw new Error("socket hang up");
  };
  const result = await checkSharedOptions(down, [option()], { exceptProductIds: [IN_SHEET], sleep: noWait });
  assert.deepEqual(result.errors, ["Shopify could not be asked about shared options just now; try again"]);
  assert.equal(calls, 3);
});

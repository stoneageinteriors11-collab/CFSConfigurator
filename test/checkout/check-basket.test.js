import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { checkBasket } from "../../app/checkout/check-basket.server.js";

const fixture = JSON.parse(readFileSync(new URL("../fixtures/natural-gold.json", import.meta.url), "utf8"));

const BED = "11067852980563";
const MATTRESS = "222";
const BED_VARIANT = "gid://shopify/ProductVariant/55773143433555";
const MATTRESS_VARIANT = "gid://shopify/ProductVariant/333";
const STOCK = { inventoryQuantity: 5, inventoryPolicy: "DENY", inventoryItem: { tracked: true } };

// Builds Shopify's reply, so these tests also cover the real product loader.
function shopifyBed({ variant = {}, options = fixture.options } = {}) {
  return {
    id: `gid://shopify/Product/${BED}`,
    title: "Bed",
    handle: "bed",
    status: "ACTIVE",
    publishedAt: "2026-01-01T00:00:00Z",
    featuredMedia: null,
    variants: {
      pageInfo: { hasNextPage: false },
      nodes: fixture.variants.map((v) => ({ ...v, ...STOCK, ...(v.id === BED_VARIANT ? variant : {}) })),
    },
    modelCards: { value: JSON.stringify(fixture.modelCards) },
    workflow: { value: JSON.stringify(fixture.workflow) },
    options: {
      references: {
        pageInfo: { hasNextPage: false },
        nodes: options.map((o) => ({
          cfsId: { value: o.cfsId },
          label: { value: o.label },
          groupName: { value: o.groupName },
          mappings: { value: JSON.stringify(o.mappings) },
        })),
      },
    },
  };
}

function shopifyMattress(variant = {}) {
  return {
    id: `gid://shopify/Product/${MATTRESS}`,
    title: "Mattress",
    handle: "mattress",
    status: "ACTIVE",
    publishedAt: "2026-01-01T00:00:00Z",
    featuredMedia: null,
    variants: {
      pageInfo: { hasNextPage: false },
      nodes: [{ id: MATTRESS_VARIANT, sku: "M", title: "Single", price: "149.00", availableForSale: true, ...STOCK, ...variant }],
    },
    modelCards: null,
    workflow: null,
    options: null,
  };
}

function shop(products) {
  const graphql = async (_query, { variables }) => {
    graphql.calls += 1;
    return { json: async () => ({ data: { product: products[variables.id.split("/").pop()] ?? null } }) };
  };
  graphql.calls = 0;
  return graphql;
}

const bedLine = (changes = {}) => ({
  id: "bed-line",
  productId: BED,
  variantId: BED_VARIANT,
  quantity: 1,
  baseCents: 99999,
  unitCents: 108998,
  selection: [{ choiceId: "17020886" }, { choiceId: "17020903" }],
  ...changes,
});
const mattressLine = (changes = {}) => ({
  id: "mattress-line",
  productId: MATTRESS,
  variantId: MATTRESS_VARIANT,
  quantity: 1,
  baseCents: 14900,
  unitCents: 14900,
  selection: [],
  ...changes,
});

const everything = () => ({ [BED]: shopifyBed(), [MATTRESS]: shopifyMattress() });
const check = (lines, products = everything()) => checkBasket(shop(products), { lines });

test("passes a mixed basket and totals it from live prices", async () => {
  const result = await check([bedLine({ quantity: 2 }), mattressLine()]);
  assert.equal(result.ok, true);
  assert.equal(result.totalCents, 108998 * 2 + 14900);
  assert.deepEqual(result.lines.map((l) => [l.lineId, l.quantity, l.unitCents]), [
    ["bed-line", 2, 108998],
    ["mattress-line", 1, 14900],
  ]);
  assert.deepEqual(result.lines[0].selection.map((c) => [c.choiceId, c.cents]), [
    ["17020886", 8999],
    ["17020903", 0],
  ]);
  assert.equal(result.lines[0].title, "Bed");
});

test("reads each product once however many lines use it", async () => {
  const graphql = shop(everything());
  const lines = [bedLine(), bedLine({ id: "other", selection: [{ choiceId: "17020886" }, { choiceId: "17020909" }] }), mattressLine()];
  assert.equal((await checkBasket(graphql, { lines })).ok, true);
  assert.equal(graphql.calls, 2);
});

test("refuses when the size price has changed and gives the new price", async () => {
  const result = await check([bedLine()], { [BED]: shopifyBed({ variant: { price: "1099.99" } }) });
  assert.equal(result.ok, false);
  const [problem] = result.problems;
  assert.equal(problem.code, "price_changed");
  assert.equal(problem.previousUnitCents, 108998);
  assert.equal(problem.unitCents, 118998);
  assert.equal(problem.quote.totalCents, 118998);
});

test("refuses when an option charge has changed", async () => {
  const options = fixture.options.map((o) =>
    o.cfsId === "17020886"
      ? { ...o, mappings: { ...o.mappings, assignments: o.mappings.assignments.map((a) => ({ ...a, raw_price: "100.00" })) } }
      : o,
  );
  const result = await check([bedLine()], { [BED]: shopifyBed({ options }) });
  assert.equal(result.problems[0].code, "price_changed");
  assert.equal(result.problems[0].unitCents, 109999);
});

test("refuses a change that moves money between the size and an option", async () => {
  const result = await check([bedLine({ baseCents: 99998 })]);
  assert.equal(result.problems[0].code, "price_changed");
});

test("allows exactly the stock available and refuses one more", async () => {
  assert.equal((await check([bedLine({ quantity: 5 })])).ok, true);
  const result = await check([bedLine({ quantity: 6 })]);
  assert.deepEqual(result.problems, [{ lineId: "bed-line", code: "insufficient_stock", available: 5 }]);
});

test("adds up different configurations of the same size against its stock", async () => {
  const caramel = bedLine({ id: "caramel", quantity: 3, selection: [{ choiceId: "17020886" }, { choiceId: "17020909" }] });
  const result = await check([bedLine({ quantity: 3 }), caramel]);
  assert.deepEqual(result.problems.map((p) => [p.lineId, p.code]), [
    ["bed-line", "insufficient_stock"],
    ["caramel", "insufficient_stock"],
  ]);
  assert.equal((await check([bedLine({ quantity: 2 }), caramel])).ok, true);
});

test("does not limit quantity when Shopify allows overselling or does not track stock", async () => {
  const quantity = 50;
  for (const variant of [{ inventoryPolicy: "CONTINUE" }, { inventoryItem: { tracked: false } }]) {
    assert.equal((await check([bedLine({ quantity })], { [BED]: shopifyBed({ variant }) })).ok, true);
  }
});

test("refuses when stock data is missing rather than assuming there is stock", async () => {
  const result = await check([mattressLine()], { [MATTRESS]: shopifyMattress({ inventoryQuantity: null }) });
  assert.deepEqual(result.problems, [{ lineId: "mattress-line", code: "insufficient_stock", available: 0 }]);
});

test("refuses items that can no longer be bought", async () => {
  const code = async (lines, products) => (await check(lines, products)).problems[0].code;
  assert.equal(await code([mattressLine()], { [MATTRESS]: shopifyMattress({ availableForSale: false }) }), "variant_unavailable");
  assert.equal(await code([mattressLine()], { [MATTRESS]: { ...shopifyMattress(), status: "DRAFT" } }), "product_unavailable");
  assert.equal(await code([mattressLine()], {}), "product_not_found");
  assert.equal(await code([bedLine()], { [BED]: shopifyBed({ variant: { inventoryQuantity: 0 } }) }), "variant_unavailable");
  const withoutOption = fixture.options.filter((o) => o.cfsId !== "17020903");
  assert.equal(await code([bedLine()], { [BED]: shopifyBed({ options: withoutOption }) }), "unknown_choice");
  assert.equal(await code([bedLine({ variantId: "gid://shopify/ProductVariant/9" })], everything()), "unknown_variant");
});

test("names only the lines with a problem", async () => {
  const result = await check([bedLine(), mattressLine()], { [BED]: shopifyBed(), [MATTRESS]: shopifyMattress({ availableForSale: false }) });
  assert.deepEqual(result.problems, [{ lineId: "mattress-line", code: "variant_unavailable" }]);
});

test("refuses an empty basket", async () => {
  assert.deepEqual(await checkBasket(shop({}), { lines: [] }), { ok: false, code: "empty_basket" });
  assert.deepEqual(await checkBasket(shop({}), null), { ok: false, code: "empty_basket" });
});

test("says unavailable when Shopify cannot be read", async () => {
  const graphql = async () => {
    throw new Error("timeout");
  };
  assert.deepEqual(await checkBasket(graphql, { lines: [bedLine()] }), { ok: false, code: "unavailable" });
  const throttled = async () => ({ json: async () => ({ errors: [{ message: "Throttled" }] }) });
  assert.deepEqual(await checkBasket(throttled, { lines: [bedLine()] }), { ok: false, code: "unavailable" });
});

// A product's groups, choices and accessory limit, for the Orders app's option picker.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { handleChoicesRequest } from "../../app/pricing/choices-request.server.js";
import { staffChoices } from "../../app/staff-api/choices.server.js";

const saved = JSON.parse(readFileSync(new URL("../fixtures/natural-gold.json", import.meta.url), "utf8"));
const page = (nodes) => ({ pageInfo: { hasNextPage: false }, nodes });

function shopifyProduct(over = {}) {
  return {
    id: "gid://shopify/Product/11067852980563",
    title: "Bed",
    handle: "bed",
    featuredMedia: null,
    variants: page(saved.variants),
    modelCards: { value: JSON.stringify(saved.modelCards) },
    workflow: { value: JSON.stringify(saved.workflow) },
    options: {
      references: page(
        saved.options.map((o) => ({
          cfsId: { value: o.cfsId },
          label: { value: o.label },
          groupName: { value: o.groupName },
          mappings: { value: JSON.stringify(o.mappings) },
        })),
      ),
    },
    ...over,
  };
}
const graphqlReturning = (product) => async () => ({ json: async () => ({ data: { product } }) });
const ask = (product = shopifyProduct()) => staffChoices(graphqlReturning(product), new URLSearchParams("product=11067852980563"));

test("returns the groups in workflow order, with what each group requires and whether it is optional", async () => {
  const { status, body } = await ask();
  assert.equal(status, 200);
  assert.deepEqual(
    body.groups,
    saved.workflow.groups.map((g) => ({ name: g.name, optional: g.optional, requires: g.requires ?? "" })),
  );
});

test("returns the same choice cards as the storefront choices route", async () => {
  const staff = await ask();
  const storefront = await handleChoicesRequest(graphqlReturning(shopifyProduct()), new URLSearchParams("product=11067852980563"));
  assert.deepEqual(staff.body.choices, storefront.body.choices);
  assert.ok(staff.body.choices.length > 0);
});

test("returns the most of one accessory an item can take, or null when the data has none", async () => {
  const withLimit = { ...saved.workflow, pricing: { ...saved.workflow.pricing, accessory_max_quantity: 4 } };
  assert.equal((await ask(shopifyProduct({ workflow: { value: JSON.stringify(withLimit) } }))).body.accessoryMax, 4);
  const noLimit = { ...saved.workflow, pricing: { ...saved.workflow.pricing } };
  delete noLimit.pricing.accessory_max_quantity;
  assert.equal((await ask(shopifyProduct({ workflow: { value: JSON.stringify(noLimit) } }))).body.accessoryMax, null);
});

test("an ordinary product (no CFS data) is 404 product_not_found", async () => {
  const ordinary = { id: "gid://shopify/Product/1", title: "Mug", handle: "mug", featuredMedia: null, variants: page([]), modelCards: null, workflow: null, options: null };
  assert.deepEqual(await ask(ordinary), { status: 404, body: { ok: false, errors: [{ code: "product_not_found" }] } });
});

test("a product the app cannot price is 422 unsupported_product", async () => {
  const broken = { ...saved.workflow, mystery_rule: true };
  assert.deepEqual(await ask(shopifyProduct({ workflow: { value: JSON.stringify(broken) } })), { status: 422, body: { ok: false, errors: [{ code: "unsupported_product" }] } });
});

test("a bad product id is 400 and Shopify is not asked", async () => {
  let calls = 0;
  const graphql = async () => { calls += 1; return { json: async () => ({}) }; };
  for (const q of ["product=abc", "product=", ""]) {
    const result = await staffChoices(graphql, new URLSearchParams(q));
    assert.deepEqual(result, { status: 400, body: { ok: false, errors: [{ code: "bad_request" }] } });
  }
  assert.equal(calls, 0);
});

test("a Shopify failure is 502 unavailable, not a crash", async () => {
  const graphql = async () => { throw new Error("Throttled"); };
  assert.deepEqual(await staffChoices(graphql, new URLSearchParams("product=1")), { status: 502, body: { ok: false, errors: [{ code: "unavailable" }] } });
});

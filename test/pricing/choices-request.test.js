// The product page's full list of choices, for products with more than 250.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { handleChoicesRequest } from "../../app/pricing/choices-request.server.js";

const saved = JSON.parse(readFileSync(new URL("../fixtures/natural-gold.json", import.meta.url), "utf8"));
const fabric = saved.options.find((o) => o.groupName === "Select Fabric");

// Natural Gold's real choices plus made-up fabrics, 300 in all, each with its own ID.
const extraFabrics = Array.from({ length: 300 - saved.options.length }, (_, i) => ({
  ...fabric,
  cfsId: `extra-${i + 1}`,
  label: `Extra fabric ${i + 1}`,
}));
const allChoices = [...saved.options, ...extraFabrics];
const LAST = extraFabrics.at(-1).cfsId;

const node = (o) => ({
  cfsId: { value: o.cfsId },
  label: { value: o.label },
  groupName: { value: o.groupName },
  mappings: { value: JSON.stringify(o.mappings) },
  imageUrl: o.cfsId === LAST ? { value: "https://cdn.example/fabric.jpg" } : null,
});
const page = (choices, endCursor) => ({ pageInfo: { hasNextPage: Boolean(endCursor), endCursor }, nodes: choices.map(node) });

function shop(choices = allChoices, product = {}) {
  const shopifyProduct = {
    id: "gid://shopify/Product/11067852980563",
    title: "Bed",
    handle: "bed",
    featuredMedia: null,
    variants: { pageInfo: { hasNextPage: false }, nodes: saved.variants },
    modelCards: { value: JSON.stringify(saved.modelCards) },
    workflow: { value: JSON.stringify(saved.workflow) },
    options: { references: page(choices.slice(0, 250), choices.length > 250 ? "p2" : null) },
    ...product,
  };
  return async (_query, { variables }) => ({
    json: async () => ({
      data: {
        product: variables.after ? { options: { references: page(choices.slice(250), null) } } : shopifyProduct,
      },
    }),
  });
}

const ask = (graphql, query = "product=11067852980563") => handleChoicesRequest(graphql, new URLSearchParams(query));

test("gives every choice of a 300-choice product, with what each card shows", async () => {
  const { status, body } = await ask(shop());
  assert.equal(status, 200);
  assert.equal(body.total, 300);
  assert.equal(body.choices.length, 300);
  assert.equal(new Set(body.choices.map((c) => c.id)).size, 300);
  const last = body.choices.at(-1);
  assert.deepEqual(
    { ...last, assignments: last.assignments.length },
    {
      id: LAST,
      label: `Extra fabric ${extraFabrics.length}`,
      group: "Select Fabric",
      kind: "option",
      imageUrl: "https://cdn.example/fabric.jpg",
      dimensions: fabric.mappings.dimensions,
      insideColor: fabric.mappings.inside_color,
      assignments: fabric.mappings.assignments.length,
    },
  );
});

test("leaves out a choice whose data is unreadable", async () => {
  const broken = [...allChoices];
  broken[260] = { ...broken[260], mappings: undefined };
  const { body } = await ask(shop(broken));
  assert.equal(body.total, 300);
  assert.equal(body.choices.length, 299);
  assert.ok(!body.choices.some((c) => c.id === broken[260].cfsId));
});

test("refuses a product the app cannot price, or one with no CFS data", async () => {
  const unknownRule = { ...saved.workflow, minimumOrder: 2 };
  assert.equal((await ask(shop(allChoices, { workflow: { value: JSON.stringify(unknownRule) } }))).status, 422);

  const plain = shop([], { status: "ACTIVE", publishedAt: "2026-01-01", modelCards: null, workflow: null, options: null });
  assert.equal((await ask(plain)).status, 404);
});

test("refuses the product if a later page of choices cannot be read", async () => {
  const graphql = async (_query, { variables }) => ({
    json: async () => ({ data: { product: variables.after ? null : await (await shop()(_query, { variables })).json().then((r) => r.data.product) } }),
  });
  assert.equal((await ask(graphql)).status, 404);
});

test("refuses a malformed product ID without asking Shopify", async () => {
  const neverCalled = async () => assert.fail("Shopify should not be called");
  for (const query of ["", "product=abc", "product=1%202", `product=${"9".repeat(21)}`]) {
    assert.equal((await ask(neverCalled, query)).status, 400, query);
  }
});

test("reports Shopify being unreachable", async () => {
  const failing = async () => {
    throw new Error("network");
  };
  const original = console.error;
  console.error = () => {};
  try {
    assert.equal((await ask(failing)).status, 502);
  } finally {
    console.error = original;
  }
});

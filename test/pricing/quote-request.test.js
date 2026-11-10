import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { handleQuoteRequest } from "../../app/pricing/quote-request.server.js";

const saved = JSON.parse(readFileSync(new URL("../fixtures/natural-gold.json", import.meta.url), "utf8"));
const page = (nodes) => ({ pageInfo: { hasNextPage: false }, nodes });

const shopifyProduct = {
  id: saved.productId,
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
};

const graphqlReturning = (product) => async () => ({ json: async () => ({ data: { product } }) });
const VALID = "product=11067852980563&variant=55773143433555&choice=17020886&choice=17020903";
const ask = (query, graphql = graphqlReturning(shopifyProduct)) =>
  handleQuoteRequest(graphql, new URLSearchParams(query));

test("returns the validated price", async () => {
  const { status, body } = await ask(VALID);
  assert.equal(status, 200);
  assert.equal(body.totalCents, 108998);
  assert.deepEqual(body.lines.map((l) => l.cents), [8999, 0]);
});

test("ignores a price sent by the browser", async () => {
  assert.equal((await ask(`${VALID}&totalCents=1&price=1`)).body.totalCents, 108998);
});

test("explains why a selection is refused", async () => {
  const { status, body } = await ask("product=11067852980563&variant=55773143433555&choice=17020886");
  assert.equal(status, 422);
  assert.deepEqual(body.errors, [{ code: "missing_required", group: "Select Fabric" }]);
});

test("refuses malformed requests without asking Shopify", async () => {
  const neverCalled = async () => assert.fail("Shopify should not be called");
  const tooMany = Array.from({ length: 21 }, (_, i) => `choice=${i}`).join("&");
  for (const query of ["", "product=1", "product=abc&variant=1", "product=1&variant=1&choice=a%20b", `product=1&variant=1&${tooMany}`]) {
    const { status, body } = await ask(query, neverCalled);
    assert.equal(status, 400, query);
    assert.deepEqual(body.errors, [{ code: "bad_request" }]);
  }
});

test("reports a product that is not configurable", async () => {
  assert.equal((await ask(VALID, graphqlReturning(null))).status, 404);
});

test("reports a Shopify failure rather than a price", async () => {
  const failing = async () => {
    throw new Error("network");
  };
  const { status, body } = await ask(VALID, failing);
  assert.equal(status, 502);
  assert.deepEqual(body.errors, [{ code: "unavailable" }]);
});

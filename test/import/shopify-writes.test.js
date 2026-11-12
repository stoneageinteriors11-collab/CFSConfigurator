import assert from "node:assert/strict";
import { test } from "node:test";
import {
  callShopify,
  createEntries,
  deleteEntries,
  entryHandle,
  isListed,
  switchProduct,
} from "../../app/import/shopify-writes.server.js";

const PRODUCT = "gid://shopify/Product/123";
const RUN = "1234abcd-0000-4000-8000-000000000000";
const noSleep = async () => {};

// A fake Shopify that answers each call with the next item of `script`, or by a function.
function fakeShopify(script) {
  const calls = [];
  const graphql = async (query, { variables } = {}) => {
    calls.push({ query, variables });
    const step = typeof script === "function" ? script(query, variables, calls.length) : script[calls.length - 1];
    if (step instanceof Error) throw step;
    return { json: async () => step };
  };
  return { graphql, calls };
}

const option = (values = {}) => ({
  cfsId: "c1",
  label: "Carlton Black",
  groupName: "Select Fabric",
  imageUrl: "https://cdn.example/black.jpg",
  optionCode: "FAB-CARLTON-BLACK",
  mappings: { kind: "option", dimensions: "Soft", inside_color: "", assignments: [] },
  ...values,
});
const fieldsOf = (call) => Object.fromEntries(call.variables.metaobject.fields.map((f) => [f.key, f.value]));
const created = (n) => ({ data: { metaobjectCreate: { metaobject: { id: `gid://shopify/Metaobject/${n}` }, userErrors: [] } } });
const throttled = { errors: [{ message: "Throttled", extensions: { code: "THROTTLED" } }] };

test("makes handles Shopify accepts", () => {
  assert.equal(entryHandle(PRODUCT, "IMP-ab_c", RUN), "cfs-123-imp-ab-c-1234abcd");
  assert.equal(entryHandle(PRODUCT, "17283544", RUN), "cfs-123-17283544-1234abcd");
});

test("retries a throttled call then succeeds", async () => {
  const waits = [];
  const { graphql, calls } = fakeShopify([throttled, throttled, { data: { ok: 1 } }]);
  const data = await callShopify(graphql, "query", {}, { sleep: async (ms) => waits.push(ms) });
  assert.deepEqual(data, { ok: 1 });
  assert.equal(calls.length, 3);
  assert.deepEqual(waits, [1000, 2000]);
});

test("retries a throttled error that is thrown", async () => {
  const { graphql } = fakeShopify([new Error("Throttled: THROTTLED"), { data: { ok: 1 } }]);
  assert.deepEqual(await callShopify(graphql, "query", {}, { sleep: noSleep }), { ok: 1 });
});

test("gives up after four retries", async () => {
  const waits = [];
  const { graphql, calls } = fakeShopify(() => throttled);
  await assert.rejects(callShopify(graphql, "query", {}, { sleep: async (ms) => waits.push(ms) }), /Throttled/);
  assert.equal(calls.length, 5);
  assert.deepEqual(waits, [1000, 2000, 4000, 8000]);
});

test("throws Shopify's message on other errors, without retrying", async () => {
  const { graphql, calls } = fakeShopify([{ errors: [{ message: "Access denied for metaobjectCreate field." }] }]);
  await assert.rejects(callShopify(graphql, "query", {}, { sleep: noSleep }), /Access denied for metaobjectCreate/);
  assert.equal(calls.length, 1);
  const network = fakeShopify([new Error("socket hang up")]);
  await assert.rejects(callShopify(network.graphql, "query", {}, { sleep: noSleep }), /socket hang up/);
  assert.equal(network.calls.length, 1);
});

test("creates entries with the right fields, in order", async () => {
  const { graphql, calls } = fakeShopify((q, v, n) => created(n));
  const options = [option(), option({ cfsId: "c2", label: "Plain", imageUrl: null, optionCode: "" })];
  const result = await createEntries(graphql, PRODUCT, options, RUN, { sleep: noSleep });
  assert.deepEqual(result, { ids: ["gid://shopify/Metaobject/1", "gid://shopify/Metaobject/2"] });

  assert.equal(calls[0].variables.metaobject.type, "cfs_import_option");
  assert.equal(calls[0].variables.metaobject.handle, "cfs-123-c1-1234abcd");
  assert.deepEqual(fieldsOf(calls[0]), {
    cfs_id: "c1",
    label: "Carlton Black",
    group_name: "Select Fabric",
    source_mappings: JSON.stringify(option().mappings),
    image_url: "https://cdn.example/black.jpg",
    option_code: "FAB-CARLTON-BLACK",
  });
  // image_url and option_code are left out when empty
  assert.deepEqual(Object.keys(fieldsOf(calls[1])), ["cfs_id", "label", "group_name", "source_mappings"]);
});

test("stops at the first refusal and returns what it made", async () => {
  const refused = { data: { metaobjectCreate: { metaobject: null, userErrors: [{ message: "Image url is invalid" }] } } };
  const { graphql, calls } = fakeShopify((q, v, n) => (n === 3 ? refused : created(n)));
  const options = [1, 2, 3, 4].map((n) => option({ cfsId: `c${n}` }));
  const result = await createEntries(graphql, PRODUCT, options, RUN, { sleep: noSleep });
  assert.deepEqual(result, {
    ids: ["gid://shopify/Metaobject/1", "gid://shopify/Metaobject/2"],
    error: 'Shopify refused "Carlton Black": Image url is invalid',
  });
  assert.equal(calls.length, 3);
});

test("finds an entry whose create answer was lost, so it can be cleaned up", async () => {
  const { graphql } = fakeShopify((query, variables, n) => {
    if (n === 1) return created(1);
    if (query.includes("metaobjectCreate")) return new Error("socket hang up");
    return { data: { metaobjectByHandle: { id: "gid://shopify/Metaobject/77" } } };
  });
  const result = await createEntries(graphql, PRODUCT, [option(), option({ cfsId: "c2" })], RUN, { sleep: noSleep });
  assert.deepEqual(result.ids, ["gid://shopify/Metaobject/1", "gid://shopify/Metaobject/77"]);
  assert.match(result.error, /socket hang up/);
});

test("switches all three values in one call", async () => {
  const { graphql, calls } = fakeShopify([{ data: { metafieldsSet: { metafields: [{}, {}, {}], userErrors: [] } } }]);
  const product = { workflow: { mode: "x" }, modelCards: { A: { source_id: "1" } } };
  const result = await switchProduct(graphql, PRODUCT, ["gid://shopify/Metaobject/1", "gid://shopify/Metaobject/2"], product);
  assert.deepEqual(result, {});
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].variables.metafields, [
    { ownerId: PRODUCT, namespace: "cfs_import", key: "options", type: "list.metaobject_reference", value: JSON.stringify(["gid://shopify/Metaobject/1", "gid://shopify/Metaobject/2"]) },
    { ownerId: PRODUCT, namespace: "cfs_import", key: "workflow", type: "json", value: JSON.stringify({ mode: "x" }) },
    { ownerId: PRODUCT, namespace: "cfs_import", key: "model_cards", type: "json", value: JSON.stringify({ A: { source_id: "1" } }) },
  ]);
});

test("reports userErrors from the switch", async () => {
  const { graphql } = fakeShopify([{ data: { metafieldsSet: { metafields: [], userErrors: [{ message: "Value is invalid" }] } } }]);
  const result = await switchProduct(graphql, PRODUCT, [], { workflow: {}, modelCards: {} });
  assert.deepEqual(result, { error: "Shopify refused the switch: Value is invalid" });
});

test("says whether another product still lists an entry", async () => {
  const listed = fakeShopify([{ data: { metaobject: { referencedBy: { nodes: [{ referencer: { id: "x" } }] } } } }]);
  assert.equal(await isListed(listed.graphql, "gid://shopify/Metaobject/5"), true);
  const unlisted = fakeShopify([{ data: { metaobject: { referencedBy: { nodes: [] } } } }]);
  assert.equal(await isListed(unlisted.graphql, "gid://shopify/Metaobject/5"), false);
  // an entry Shopify no longer has is not listed
  const gone = fakeShopify([{ data: { metaobject: null } }]);
  assert.equal(await isListed(gone.graphql, "gid://shopify/Metaobject/5"), false);
});

test("deletes and reports failures, carrying on past them", async () => {
  const { graphql, calls } = fakeShopify((q, v, n) =>
    n === 2
      ? { data: { metaobjectDelete: { deletedId: null, userErrors: [{ message: "Cannot delete" }] } } }
      : { data: { metaobjectDelete: { deletedId: v.id, userErrors: [] } } },
  );
  const result = await deleteEntries(graphql, ["a", "b", "c"], { sleep: noSleep });
  assert.deepEqual(result, { failed: ["b"] });
  assert.equal(calls.length, 3);
  const thrown = fakeShopify([new Error("boom"), { data: { metaobjectDelete: { deletedId: "b", userErrors: [] } } }]);
  assert.deepEqual(await deleteEntries(thrown.graphql, ["a", "b"], { sleep: noSleep }), { failed: ["a"] });
});

test("a switch whose answer was never seen is marked uncertain", async () => {
  const { graphql } = fakeShopify([new Error("socket hang up")]);
  const result = await switchProduct(graphql, PRODUCT, [], { workflow: {}, modelCards: {} });
  assert.deepEqual(result, { error: "Shopify could not confirm the switch: socket hang up", uncertain: true });
});

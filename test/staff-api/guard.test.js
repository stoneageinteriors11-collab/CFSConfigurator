import assert from "node:assert/strict";
import { test } from "node:test";
import { signRequest } from "../../app/staff-api/signature.server.js";
import { staffGuard } from "../../app/staff-api/guard.server.js";

const SECRET = "g".repeat(40);
const NOW = 1_800_000_000_000;
const SHOP = "urban-deco-dev.myshopify.com";

function signed({ method = "POST", url = "https://cfs.test/staff/quote", body = '{"x":1}', secret = SECRET } = {}) {
  const u = new URL(url);
  const path = u.pathname + u.search;
  const headers = {
    "x-cfs-shop": SHOP,
    "x-cfs-timestamp": String(NOW),
    "x-cfs-signature": signRequest({ secret, timestamp: String(NOW), method, path, shop: SHOP, body: method === "GET" ? "" : body }),
  };
  return new Request(url, { method, headers, ...(method === "GET" ? {} : { body }) });
}

test("returns the shop and the raw body for a good request", async () => {
  assert.deepEqual(await staffGuard(signed(), { secret: SECRET, now: NOW }), { shop: SHOP, body: '{"x":1}' });
});

test("accepts a signed GET with a query string", async () => {
  const guard = await staffGuard(signed({ method: "GET", url: "https://cfs.test/staff/choices?product=7" }), { secret: SECRET, now: NOW });
  assert.equal(guard.shop, SHOP);
});

test("throws a 401 Response for a bad signature, a tampered body and an old timestamp", async () => {
  const tampered = signed();
  const forged = new Request(tampered.url, { method: "POST", headers: tampered.headers, body: '{"x":2}' });
  for (const [req, now] of [[signed({ secret: "h".repeat(40) }), NOW], [forged, NOW], [signed(), NOW + 10 * 60 * 1000]]) {
    const thrown = await staffGuard(req, { secret: SECRET, now }).catch((e) => e);
    assert.ok(thrown instanceof Response);
    assert.equal(thrown.status, 401);
    assert.deepEqual(await thrown.json(), { ok: false, errors: [{ code: "unauthorized" }] });
  }
});

test("refuses every request when the secret is not set", async () => {
  const thrown = await staffGuard(signed(), { secret: undefined, now: NOW }).catch((e) => e);
  assert.equal(thrown.status, 401);
});

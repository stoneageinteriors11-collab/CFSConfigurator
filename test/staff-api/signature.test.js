// Signed server-to-server requests from the CFS Orders app.
import assert from "node:assert/strict";
import { test } from "node:test";
import { signRequest, verifyStaffRequest } from "../../app/staff-api/signature.server.js";

const SECRET = "s".repeat(40);
const NOW = 1_800_000_000_000;
const SHOP = "urban-deco-dev.myshopify.com";

// A request as the Orders app would send it, with any part replaced.
function request(over = {}) {
  const r = { secret: SECRET, timestamp: String(NOW), method: "POST", path: "/staff/quote", shop: SHOP, body: '{"a":1}', ...over };
  const signature = over.signature ?? signRequest(r);
  const headers = new Headers({ "x-cfs-shop": r.shop, "x-cfs-timestamp": r.timestamp, "x-cfs-signature": signature });
  for (const name of over.drop ?? []) headers.delete(name);
  return { secret: over.verifySecret ?? SECRET, headers, method: r.method, path: r.path, body: r.body, now: NOW };
}

test("a correctly signed request is accepted and names its shop", () => {
  assert.deepEqual(verifyStaffRequest(request()), { ok: true, shop: SHOP });
});

test("a GET with a query string and an empty body is accepted", () => {
  assert.equal(verifyStaffRequest(request({ method: "GET", path: "/staff/choices?product=1", body: "" })).ok, true);
});

test("the signature differs for a different body, path, method, shop, timestamp or secret", () => {
  const base = { secret: SECRET, timestamp: "1", method: "POST", path: "/a", shop: SHOP, body: "x" };
  const sig = signRequest(base);
  for (const change of [{ body: "y" }, { path: "/b" }, { method: "GET" }, { shop: "b.myshopify.com" }, { timestamp: "2" }, { secret: "t".repeat(40) }]) {
    assert.notEqual(signRequest({ ...base, ...change }), sig);
  }
});

test("refuses a changed body, changed path or query, or different secret", () => {
  const good = request();
  assert.equal(verifyStaffRequest({ ...good, body: '{"a":2}' }).ok, false);
  assert.equal(verifyStaffRequest({ ...good, path: "/staff/choices" }).ok, false);
  assert.equal(verifyStaffRequest({ ...request({ method: "GET", path: "/staff/choices?product=1", body: "" }), path: "/staff/choices?product=2" }).ok, false);
  assert.equal(verifyStaffRequest({ ...good, secret: "t".repeat(40) }).ok, false);
});

test("refuses a request older than 5 minutes, or more than a minute in the future", () => {
  assert.equal(verifyStaffRequest(request({ timestamp: String(NOW - 5 * 60 * 1000 - 1) })).ok, false);
  assert.equal(verifyStaffRequest(request({ timestamp: String(NOW - 5 * 60 * 1000) })).ok, true);
  assert.equal(verifyStaffRequest(request({ timestamp: String(NOW + 60 * 1000 + 1) })).ok, false);
  assert.equal(verifyStaffRequest(request({ timestamp: String(NOW + 60 * 1000) })).ok, true);
});

test("refuses a missing header, a bad or wrong-length signature and a non-numeric timestamp", () => {
  for (const name of ["x-cfs-shop", "x-cfs-timestamp", "x-cfs-signature"]) {
    assert.equal(verifyStaffRequest(request({ drop: [name] })).ok, false, name);
  }
  assert.equal(verifyStaffRequest(request({ signature: "zz" })).ok, false);
  assert.equal(verifyStaffRequest(request({ signature: "ab".repeat(32) })).ok, false);
  assert.equal(verifyStaffRequest(request({ timestamp: "soon" })).ok, false);
});

test("refuses everything when the secret is missing, empty or shorter than 32 characters", () => {
  for (const secret of [undefined, "", "short"]) {
    const good = request({ secret: SECRET });
    assert.equal(verifyStaffRequest({ ...good, secret }).ok, false);
  }
});

test("refuses a shop name that is not a plain myshopify.com store", () => {
  for (const shop of ["evil.com", "a.myshopify.com.evil.com", "-a.myshopify.com", "a b.myshopify.com", "", "a.myshopify.com/x"]) {
    assert.equal(verifyStaffRequest(request({ shop })).ok, false, shop);
  }
});

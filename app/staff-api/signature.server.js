// Signed requests between the CFS Orders app and this app. Nothing else may call /staff/*.
// The signature covers the time, method, path with query, shop and a hash of the body, so a
// captured request cannot be changed, redirected to another route or replayed after 5 minutes.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const WINDOW_MS = 5 * 60 * 1000;
const FUTURE_MS = 60 * 1000;
const MIN_SECRET_LENGTH = 32;
const SHOP = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
const HEX_SHA256 = /^[0-9a-f]{64}$/;

/** Hex HMAC-SHA256 over the request. path includes the query string; body is the raw string ("" for a GET). */
export function signRequest({ secret, timestamp, method, path, shop, body = "" }) {
  const bodyHash = createHash("sha256").update(body).digest("hex");
  return createHmac("sha256", secret).update([timestamp, method.toUpperCase(), path, shop, bodyHash].join("\n")).digest("hex");
}

/** The path and query as both sides sign them: the query is re-encoded the same way whatever form it arrived in. */
export function canonicalPath(url) {
  const { pathname, searchParams } = new URL(url);
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

const header = (headers, name) => (typeof headers?.get === "function" ? headers.get(name) : headers?.[name]) ?? "";

/** Returns { ok: true, shop } for a good request, or { ok: false, reason }. Never throws. */
export function verifyStaffRequest({ secret, headers, method, path, body = "", now = Date.now() }) {
  if (typeof secret !== "string" || secret.length < MIN_SECRET_LENGTH) return { ok: false, reason: "no_secret" };

  const shop = header(headers, "x-cfs-shop");
  const timestamp = header(headers, "x-cfs-timestamp");
  const signature = header(headers, "x-cfs-signature");
  if (!SHOP.test(shop)) return { ok: false, reason: "bad_shop" };
  if (!/^\d{1,15}$/.test(timestamp)) return { ok: false, reason: "bad_timestamp" };
  if (!HEX_SHA256.test(signature)) return { ok: false, reason: "bad_signature" };

  const age = now - Number(timestamp);
  if (age > WINDOW_MS || age < -FUTURE_MS) return { ok: false, reason: "expired" };

  const expected = signRequest({ secret, timestamp, method, path, shop, body });
  const same = timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  return same ? { ok: true, shop } : { ok: false, reason: "bad_signature" };
}

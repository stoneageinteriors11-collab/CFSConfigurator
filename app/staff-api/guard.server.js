// Every /staff/* route starts here: a request that is not correctly signed never gets further.
import { canonicalPath, verifyStaffRequest } from "./signature.server.js";

const unauthorized = () =>
  Response.json({ ok: false, errors: [{ code: "unauthorized" }] }, { status: 401, headers: { "Cache-Control": "no-store" } });

/** Returns { shop, body } (the raw body text) or throws a 401 Response. */
export async function staffGuard(request, { secret = process.env.STAFF_API_SECRET, now = Date.now() } = {}) {
  const body = await request.text();
  const result = verifyStaffRequest({ secret, headers: request.headers, method: request.method, path: canonicalPath(request.url), body, now });
  if (!result.ok) {
    console.warn("Staff API request refused:", result.reason);
    throw unauthorized();
  }
  return { shop: result.shop, body };
}

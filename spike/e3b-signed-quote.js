// E3b: sends signed requests to a locally running app, the same way Shopify's app proxy signs them. Read-only.
// Usage: node --env-file=.env spike/e3b-signed-quote.js <port>
import { createHmac } from "node:crypto";
import process from "node:process";

const base = `http://localhost:${process.argv[2]}/proxy/quote`;
const SECRET = process.env.SHOPIFY_API_SECRET;
const SHOP = "urban-deco-dev.myshopify.com";
const PRODUCT = "11067852980563";
const VARIANT = "55773143433555";
const DRAWER = "17020886";
const FABRIC = "17020903";

function signedUrl(params, { timestamp = Math.floor(Date.now() / 1000), secret = SECRET, tamper } = {}) {
  const all = { ...params, shop: SHOP, path_prefix: "/apps/cfs", timestamp: String(timestamp) };
  const message = Object.keys(all)
    .sort()
    .map((key) => `${key}=${[].concat(all[key]).join(",")}`)
    .join("");
  const signature = createHmac("sha256", secret).update(message).digest("hex");

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...all, ...tamper, signature })) {
    for (const item of [].concat(value)) search.append(key, item);
  }
  return `${base}?${search}`;
}

const good = { product: PRODUCT, variant: VARIANT, choice: [DRAWER, FABRIC] };
const cases = [
  ["valid", signedUrl(good), 200, 108998],
  ["browser price ignored", signedUrl({ ...good, totalCents: "1" }), 200, 108998],
  ["missing fabric", signedUrl({ ...good, choice: [DRAWER] }), 422],
  ["unknown product", signedUrl({ ...good, product: "1" }), 404],
  ["malformed", signedUrl({ product: "abc", variant: VARIANT }), 400],
  ["wrong secret", signedUrl(good, { secret: "wrong" }), 400],
  ["changed after signing", signedUrl(good, { tamper: { variant: "55773143597395" } }), 400],
  ["old timestamp", signedUrl(good, { timestamp: Math.floor(Date.now() / 1000) - 3600 }), 400],
  ["no signature", `${base}?product=${PRODUCT}&variant=${VARIANT}`, 400],
];

let failures = 0;
for (const [name, url, expectedStatus, expectedTotal] of cases) {
  const response = await fetch(url);
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = undefined;
  }
  const passed = response.status === expectedStatus && (expectedTotal === undefined || body?.totalCents === expectedTotal);
  if (!passed) failures += 1;
  console.log(JSON.stringify({
    name,
    passed,
    status: response.status,
    cache: response.headers.get("cache-control"),
    totalCents: body?.totalCents,
    errors: body?.errors?.map((e) => e.code),
  }));
}
console.log(failures ? `FAILED: ${failures}` : "ALL PASSED");
process.exitCode = failures ? 1 : 0;

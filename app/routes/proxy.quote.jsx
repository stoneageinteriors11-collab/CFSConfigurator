import { authenticate } from "../shopify.server";
import { handleQuoteRequest } from "../pricing/quote-request.server";

const reply = (status, body) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Storefront price check, reached through the Shopify app proxy at /apps/cfs/quote.
// A GET is used because Shopify's signature covers the query string but not a request body.
export const loader = async ({ request }) => {
  const { admin } = await authenticate.public.appProxy(request);
  if (!admin) return reply(503, { ok: false, errors: [{ code: "unavailable" }] });

  const { status, body } = await handleQuoteRequest(admin.graphql, new URL(request.url).searchParams);
  return reply(status, body);
};

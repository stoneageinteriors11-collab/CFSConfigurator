import { authenticate } from "../shopify.server";
import db from "../db.server";
import { handleCheckoutRequest } from "../checkout/checkout-request.server";

const reply = (status, body) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Starts a checkout, reached through the Shopify app proxy at /apps/cfs/checkout.
// A POST keeps the shopper's token out of URLs and logs.
export const action = async ({ request }) => {
  const { admin, session } = await authenticate.public.appProxy(request);
  if (!admin || !session) return reply(503, { ok: false, errors: [{ code: "unavailable" }] });

  const { status, body } = await handleCheckoutRequest({
    db,
    graphql: admin.graphql,
    shop: session.shop,
    rawBody: await request.text(),
  });
  return reply(status, body);
};

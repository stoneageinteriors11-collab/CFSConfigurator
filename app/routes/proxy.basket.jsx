import { authenticate } from "../shopify.server";
import db from "../db.server";
import { handleBasketRequest } from "../basket/basket-request.server";

const reply = (status, body) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Storefront basket, reached through the Shopify app proxy at /apps/cfs/basket.
// A POST keeps the shopper's token out of URLs and logs.
export const action = async ({ request }) => {
  const { admin, session } = await authenticate.public.appProxy(request);
  if (!admin || !session) return reply(503, { ok: false, errors: [{ code: "unavailable" }] });

  const { status, body } = await handleBasketRequest({
    db,
    graphql: admin.graphql,
    shop: session.shop,
    rawBody: await request.text(),
  });
  return reply(status, body);
};

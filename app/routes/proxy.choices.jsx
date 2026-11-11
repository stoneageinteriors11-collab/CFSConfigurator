import { authenticate } from "../shopify.server";
import { handleChoicesRequest } from "../pricing/choices-request.server";

const reply = (status, body) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

// A product's full list of choices, reached through the Shopify app proxy at /apps/cfs/choices.
// Only products with more than 250 choices need it: the theme shows smaller lists itself.
export const loader = async ({ request }) => {
  const { admin } = await authenticate.public.appProxy(request);
  if (!admin) return reply(503, { ok: false, errors: [{ code: "unavailable" }] });

  const { status, body } = await handleChoicesRequest(admin.graphql, new URL(request.url).searchParams);
  return reply(status, body);
};

import { handleQuoteRequest } from "../pricing/quote-request.server";
import { graphqlForShop, staffReply, unknownShop } from "../staff-api/admin.server";
import { staffGuard } from "../staff-api/guard.server";
import { quoteParams } from "../staff-api/quote-params.server";

// Signed, server-to-server: prices a selection with the same engine the storefront uses.
export const action = async ({ request }) => {
  if (request.method !== "POST") return staffReply(405, { ok: false, errors: [{ code: "method_not_allowed" }] });
  const { shop, body } = await staffGuard(request);

  let json;
  try {
    json = JSON.parse(body);
  } catch {
    return staffReply(400, { ok: false, errors: [{ code: "bad_request" }] });
  }
  const params = quoteParams(json);
  if (!params) return staffReply(400, { ok: false, errors: [{ code: "bad_request" }] });

  const graphql = await graphqlForShop(shop);
  if (!graphql) return unknownShop();
  const { status, body: result } = await handleQuoteRequest(graphql, params);
  return staffReply(status, result);
};

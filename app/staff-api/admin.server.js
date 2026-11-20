// The Admin API client for a shop that has installed this app, or null when it has not.
import { unauthenticated } from "../shopify.server";

export async function graphqlForShop(shop) {
  try {
    const { admin } = await unauthenticated.admin(shop);
    return admin.graphql;
  } catch (error) {
    console.error("Staff API: no Shopify access for", shop, error?.message);
    return null;
  }
}

export const staffReply = (status, body) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export const unknownShop = () => staffReply(404, { ok: false, errors: [{ code: "unknown_shop" }] });

import { authenticate } from "../shopify.server";
import db from "../db.server";
import { saveOrderSnapshot } from "../orders/save-snapshot.server.js";

// Shopify's paid notification is the only proof of payment the app accepts.
// authenticate.webhook refuses any request without Shopify's signature.
export const action = async ({ request }) => {
  const { shop, topic, admin, payload } = await authenticate.webhook(request);
  const orderId = payload?.admin_graphql_api_id;

  if (!admin || typeof orderId !== "string") {
    // No stored access for this shop (for example after uninstalling), or no order named.
    console.error(`Webhook ${topic} for ${shop}: cannot read the order`, orderId ?? "");
    return new Response();
  }

  try {
    const result = await saveOrderSnapshot({ db, graphql: admin.graphql, shop, orderId });
    console.log(`Webhook ${topic} for ${shop}: ${orderId} ${result.outcome} ${result.matchStatus ?? ""}`.trim());
    return new Response();
  } catch (error) {
    // Shopify sends it again later, and the repeat is safe.
    console.error(`Webhook ${topic} for ${shop}: ${orderId} not saved`, error?.message);
    return new Response(null, { status: 500 });
  }
};

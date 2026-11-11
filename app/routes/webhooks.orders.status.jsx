import { authenticate } from "../shopify.server";
import db from "../db.server";
import { orderIdOf, updateOrderStatus } from "../orders/order-status.server.js";

// Cancellations and refunds. authenticate.webhook refuses any request without Shopify's signature.
export const action = async ({ request }) => {
  const { shop, topic, admin, payload } = await authenticate.webhook(request);
  const orderId = orderIdOf(topic, payload);

  if (!admin || !orderId) {
    console.error(`Webhook ${topic} for ${shop}: cannot read the order`, orderId ?? "");
    return new Response();
  }

  try {
    const result = await updateOrderStatus({ db, graphql: admin.graphql, shop, orderId });
    console.log(`Webhook ${topic} for ${shop}: ${orderId} ${result.outcome} ${result.financialStatus ?? ""}`.trim());
    return new Response();
  } catch (error) {
    // Shopify sends it again later, and the repeat is safe.
    console.error(`Webhook ${topic} for ${shop}: ${orderId} not updated`, error?.message);
    return new Response(null, { status: 500 });
  }
};

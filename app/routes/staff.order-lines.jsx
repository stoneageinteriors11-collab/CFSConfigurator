import db from "../db.server";
import { staffReply } from "../staff-api/admin.server";
import { staffGuard } from "../staff-api/guard.server";
import { orderLinesFor } from "../staff-api/order-lines.server";

// Signed, server-to-server: the CFS Orders app asks what an order's lines were configured as.
export const loader = async ({ request }) => {
  const { shop } = await staffGuard(request);
  const orderId = new URL(request.url).searchParams.get("order");
  const { status, body } = await orderLinesFor(db, { shop, orderId });
  return staffReply(status, body);
};

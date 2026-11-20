// What the Orders app is told about an order's lines. Read only, from the saved order snapshot,
// which records the configuration the app priced at checkout and can never be changed.
const ORDER_ID = /^gid:\/\/shopify\/Order\/\d{1,20}$/;

const refuse = (status, code) => ({ status, body: { ok: false, errors: [{ code }] } });

function describeLine(line, { matched, cancelled }) {
  const base = {
    lineItemId: line.lineItemId,
    productId: line.productId,
    variantId: line.variantId,
    title: line.title,
    variantTitle: line.variantTitle,
    quantity: line.quantity,
    unitCents: line.unitCents,
    configuration: line.configuration ?? null,
  };
  if (cancelled) return { ...base, editable: false, reason: "order_cancelled" };
  if (!matched) return { ...base, editable: false, reason: "no_matching_checkout" };
  if (!line.configuration || line.configurable === false) return { ...base, editable: false, reason: "not_configured" };
  return { ...base, editable: true };
}

/** Returns { status, body }. A line is editable only when its order matched an app checkout, is not cancelled, and has a configuration. */
export async function orderLinesFor(db, { shop, orderId }) {
  if (typeof orderId !== "string" || !ORDER_ID.test(orderId)) return refuse(400, "bad_request");
  const snapshot = await db.orderSnapshot.findUnique({ where: { shop_orderId: { shop, orderId } } });
  if (!snapshot) return refuse(404, "no_snapshot");

  const state = { matched: snapshot.matchStatus === "matched", cancelled: Boolean(snapshot.cancelledAt) };
  const lines = Array.isArray(snapshot.specification?.lines) ? snapshot.specification.lines : [];
  return {
    status: 200,
    body: {
      ok: true,
      orderName: snapshot.orderName,
      financialStatus: snapshot.financialStatus,
      cancelledAt: snapshot.cancelledAt ? new Date(snapshot.cancelledAt).toISOString() : null,
      lines: lines.map((line) => describeLine(line, state)),
    },
  };
}

// Saves the permanent record of a paid order, once. Shopify can send the same paid
// notification more than once, so a repeat finds the saved record and changes nothing.
import { removePaidLines } from "../basket/basket.server.js";
import { attemptIdOf, buildSnapshot, readOrder } from "./specification.server.js";

const TRANSACTION_LIMITS = { maxWait: 10000, timeout: 20000 };

const isUniqueClash = (error) => error?.code === "P2002";

async function findAttempt(db, shop, order) {
  const id = attemptIdOf(order);
  if (!id) return null;
  return db.checkoutAttempt.findFirst({ where: { id, shop }, include: { snapshot: { select: { orderId: true } } } });
}

/**
 * Returns { outcome: "saved" | "already_saved" | "order_not_found" | "not_app_order", matchStatus? }.
 * A saved matchStatus other than "matched" means the order needs staff attention.
 * Throws when Shopify or the database cannot be reached, so Shopify sends the notification again.
 */
export async function saveOrderSnapshot({ db, graphql, shop, orderId }) {
  const existing = await db.orderSnapshot.findUnique({ where: { shop_orderId: { shop, orderId } }, select: { id: true } });
  if (existing) return { outcome: "already_saved" };

  const order = await readOrder(graphql, orderId);
  if (!order) return { outcome: "order_not_found" };

  let attempt = await findAttempt(db, shop, order);
  // A checkout is paid for once. A second order naming it is not linked, so it is flagged instead.
  if (attempt?.snapshot && attempt.snapshot.orderId !== order.id) attempt = null;

  // The record and the basket change are saved together, so a repeat cannot remove items twice.
  const save = (snapshot) =>
    db.$transaction(async (tx) => {
      await tx.orderSnapshot.create({ data: { shop, ...snapshot }, select: { id: true } });
      if (snapshot.attemptId) await removePaidLines(tx, attempt);
    }, TRANSACTION_LIMITS);
  let snapshot = buildSnapshot(order, attempt);
  // An order of ordinary products from Shopify's own checkout is not the app's to keep.
  // One with a configurable product but no app checkout is kept, so staff can see it.
  const { specification } = snapshot;
  if (!specification.checkout && !specification.claimedAttemptId && !specification.lines.some((l) => l.configurable)) {
    return { outcome: "not_app_order" };
  }
  try {
    await save(snapshot);
  } catch (error) {
    if (!isUniqueClash(error)) throw error;
    // Either a repeat notification saved this order a moment ago, or another order took the checkout.
    const saved = await db.orderSnapshot.findUnique({ where: { shop_orderId: { shop, orderId: order.id } }, select: { id: true } });
    if (saved) return { outcome: "already_saved" };
    snapshot = buildSnapshot(order, null);
    await save(snapshot);
  }
  return { outcome: "saved", matchStatus: snapshot.matchStatus };
}

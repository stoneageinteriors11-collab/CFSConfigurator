// Runs the catch-up on missed order notifications soon after the app starts, then every
// 15 minutes, for each shop the app is installed on. A sleeping app runs it when it wakes.
import db from "../db.server";
import { unauthenticated } from "../shopify.server";
import { recoverOrders } from "./recover-orders.server.js";

const FIRST_RUN_MS = 30 * 1000;
const EVERY_MS = 15 * 60 * 1000;

let running = false;

export async function recoverAllShops() {
  if (running) return;
  running = true;
  try {
    // Offline access is removed when a shop uninstalls the app, so these are installed shops.
    const shops = await db.session.findMany({
      where: { isOnline: false },
      select: { shop: true },
      distinct: ["shop"],
    });
    for (const { shop } of shops) {
      try {
        const { admin } = await unauthenticated.admin(shop);
        const result = await recoverOrders({ db, graphql: admin.graphql, shop });
        console.log(
          `Order recovery for ${shop}: checked ${result.checked}, saved ${result.saved}, updated ${result.updated}, failed ${result.failed}${result.complete ? "" : ", more next time"}`,
        );
      } catch (error) {
        console.error(`Order recovery for ${shop} failed`, error?.message);
      }
    }
  } catch (error) {
    console.error("Order recovery could not start", error?.message);
  } finally {
    running = false;
  }
}

/** Starts once per server, even if this module is loaded again. ORDER_RECOVERY=off turns it off. */
export function startOrderRecovery() {
  if (process.env.ORDER_RECOVERY === "off" || globalThis.cfsOrderRecoveryStarted) return;
  globalThis.cfsOrderRecoveryStarted = true;
  setTimeout(recoverAllShops, FIRST_RUN_MS);
  setInterval(recoverAllShops, EVERY_MS);
}

// Copies the ordinary items from the shopper's Shopify cart into the app basket at Checkout,
// so that a mixed basket has one version and one checkout. The browser says only which items
// and how many: prices come from Shopify. The Shopify cart is the record of ordinary items,
// so a repeat click with an unchanged cart changes nothing and reuses the same checkout.
import {
  addLine,
  getBasket,
  MAX_BASKET_LINES,
  removeLine,
  setLineQuantity,
  validQuantity,
} from "../basket/basket.server.js";
import { quoteSelection } from "../pricing/quote-request.server.js";

const SHOPIFY_ID = /^\d{1,20}$/;

const validId = (value) => typeof value === "string" && SHOPIFY_ID.test(value);
const isOrdinary = (line) => line.selection.length === 0;

/** Returns one entry per variant, or null if the browser's list is malformed. */
export function readCartItems(value) {
  if (!Array.isArray(value) || value.length > MAX_BASKET_LINES) return null;

  const byVariant = new Map();
  for (const item of value) {
    if (!validId(item?.product) || !validId(item.variant) || !validQuantity(item.quantity)) return null;
    const seen = byVariant.get(item.variant);
    if (seen && seen.product !== item.product) return null;
    byVariant.set(item.variant, {
      product: item.product,
      variant: item.variant,
      quantity: (seen?.quantity ?? 0) + item.quantity,
    });
  }

  const items = [...byVariant.values()];
  return items.every((item) => validQuantity(item.quantity)) ? items : null;
}

async function priceItem(graphql, item) {
  const { quote, refusal } = await quoteSelection(graphql, {
    productId: item.product,
    variantId: item.variant,
    choiceIds: [],
  });
  if (refusal) return { item, code: refusal.body.errors[0].code };
  // A configured product reached Shopify's cart without its options, so its price would be wrong.
  return quote.modelId ? { item, code: "not_ordinary" } : { item, quote };
}

const upToDate = (line, item, quote) =>
  line.quantity === item.quantity && line.baseCents === quote.baseCents && line.unitCents === quote.totalCents;

/**
 * Makes the basket's ordinary lines match the Shopify cart. Returns one of:
 *   { ok: true }
 *   { ok: false, code }
 *   { ok: false, problems: [{ variant, code }] }, listing the cart items that cannot be sold
 * A refused list changes nothing.
 */
export async function copyCartItems({ db, graphql, ref, items }) {
  const basket = await getBasket(db, ref);
  if (!basket) return { ok: false, code: "basket_not_found" };
  // The app checks out ordinary items only alongside a configured one.
  if (basket.lines.every(isOrdinary)) return { ok: false, code: "empty_basket" };

  const priced = await Promise.all(items.map((item) => priceItem(graphql, item)));
  if (priced.some((result) => result.code === "unavailable")) return { ok: false, code: "unavailable" };
  const refused = priced.filter((result) => result.code);
  if (refused.length) {
    return { ok: false, problems: refused.map(({ item, code }) => ({ variant: item.variant, code })) };
  }

  const wanted = new Set(priced.map(({ quote }) => quote.variantId));
  const saved = basket.lines.filter(isOrdinary);
  for (const line of saved.filter((l) => !wanted.has(l.variantId))) {
    const removed = await removeLine(db, ref, line.id);
    if (!removed.ok) return removed;
  }

  for (const { item, quote } of priced) {
    const line = saved.find((l) => l.variantId === quote.variantId);
    if (line && upToDate(line, item, quote)) continue;
    const result = line
      ? await setLineQuantity(db, ref, line.id, item.quantity, quote)
      : await addLine(db, ref, { productId: item.product, quote, quantity: item.quantity });
    if (!result.ok) return result;
  }
  return { ok: true };
}

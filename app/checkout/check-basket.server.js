// Re-checks a saved basket against live Shopify data just before checkout. Reads only.
// A line passes only if it can still be sold, in that quantity, at the price the shopper saw.
import { loadConfigurableProduct } from "../pricing/load-product.server.js";
import { priceProduct, selectionRequest } from "../pricing/quote.server.js";

async function loadProducts(graphql, lines) {
  const ids = [...new Set(lines.map((line) => line.productId))];
  const products = await Promise.all(ids.map((id) => loadConfigurableProduct(graphql, `gid://shopify/Product/${id}`)));
  return new Map(ids.map((id, index) => [id, products[index]]));
}

// Different configurations of one size are separate lines drawing on the same stock.
function quantityByVariant(lines) {
  const totals = new Map();
  for (const line of lines) totals.set(line.variantId, (totals.get(line.variantId) ?? 0) + line.quantity);
  return totals;
}

// Configured sizes are always held to their stock, as the price check requires. Ordinary products follow Shopify's own setting.
const stockIsLimited = (product, variant) =>
  !product.ordinary || (variant.inventoryPolicy !== "CONTINUE" && variant.inventoryItem?.tracked !== false);

function checkLine(line, product, wanted) {
  const lineId = line.id;
  if (!product) return { problem: { lineId, code: "product_not_found" } };

  const quote = priceProduct(product, {
    variantId: line.variantId,
    ...selectionRequest(line.selection),
  });
  if (!quote.ok) return { problem: { lineId, code: quote.errors[0].code } };

  const variant = product.variants.find((v) => v.id === line.variantId);
  // Written so that missing stock data is refused too.
  if (stockIsLimited(product, variant) &&!(wanted <= variant.inventoryQuantity)) {
    return { problem: { lineId, code: "insufficient_stock", available: Math.max(variant.inventoryQuantity ?? 0, 0) } };
  }

  if (quote.baseCents !== line.baseCents || quote.totalCents !== line.unitCents) {
    return {
      problem: {
        lineId,
        code: "price_changed",
        quantity: line.quantity,
        previousUnitCents: line.unitCents,
        unitCents: quote.totalCents,
        quote,
      },
    };
  }

  return {
    checked: {
      lineId,
      productId: line.productId,
      variantId: quote.variantId,
      sku: quote.sku,
      ...quote.display,
      quantity: line.quantity,
      baseCents: quote.baseCents,
      unitCents: quote.totalCents,
      selection: quote.lines,
    },
  };
}

/**
 * basket comes from getBasket. Returns one of:
 *   { ok: true, lines, totalCents }
 *   { ok: false, problems: [{ lineId, code, ... }] }, listing only the lines that failed
 *   { ok: false, code: "empty_basket" | "unavailable" }
 */
export async function checkBasket(graphql, basket) {
  if (!basket?.lines.length) return { ok: false, code: "empty_basket" };

  let products;
  try {
    products = await loadProducts(graphql, basket.lines);
  } catch (error) {
    console.error("Checkout: could not read products", error?.message);
    return { ok: false, code: "unavailable" };
  }

  const wanted = quantityByVariant(basket.lines);
  const results = basket.lines.map((line) => checkLine(line, products.get(line.productId), wanted.get(line.variantId)));
  const problems = results.filter((result) => result.problem).map((result) => result.problem);
  if (problems.length) return { ok: false, problems };

  const lines = results.map((result) => result.checked);
  return { ok: true, lines, totalCents: lines.reduce((sum, line) => sum + line.unitCents * line.quantity, 0) };
}

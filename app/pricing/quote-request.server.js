// Turns a storefront price request into a validated quote. Prices sent by the browser are never read.
import { loadConfigurableProduct } from "./load-product.server.js";
import { priceProduct } from "./quote.server.js";

const MAX_CHOICES = 20;
const SHOPIFY_ID = /^\d{1,20}$/;
const CHOICE_ID = /^[\w-]{1,64}$/;

const refuse = (status, code) => ({ status, body: { ok: false, errors: [{ code }] } });

const matches = (pattern, value) => typeof value === "string" && pattern.test(value);

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * Validates untrusted IDs and prices them from live Shopify data. Returns { quote } or { refusal }.
 * quantities maps an accessory's choice ID to how many; the pricing engine checks the numbers.
 */
export async function quoteSelection(graphql, { productId, variantId, choiceIds, quantities = {} }) {
  if (
    !matches(SHOPIFY_ID, productId) ||
    !matches(SHOPIFY_ID, variantId) ||
    !Array.isArray(choiceIds) ||
    choiceIds.length > MAX_CHOICES ||
    !choiceIds.every((id) => matches(CHOICE_ID, id)) ||
    !isPlainObject(quantities) ||
    !Object.keys(quantities).every((id) => choiceIds.includes(id))
  ) {
    return { refusal: refuse(400, "bad_request") };
  }

  let product;
  try {
    product = await loadConfigurableProduct(graphql, `gid://shopify/Product/${productId}`);
  } catch (error) {
    console.error("Quote: could not read product", productId, error?.message);
    return { refusal: refuse(502, "unavailable") };
  }
  if (!product) return { refusal: refuse(404, "product_not_found") };

  const quote = priceProduct(product, {
    variantId: `gid://shopify/ProductVariant/${variantId}`,
    choiceIds,
    quantities,
  });
  return quote.ok ? { quote } : { refusal: { status: 422, body: quote } };
}

const QUANTITY_PARAM = /^([\w-]{1,64}):(\d{1,3})$/;

/** Reads "choiceId:count" entries, or returns null if any is malformed or repeated. */
function readQuantityParams(entries) {
  const quantities = {};
  for (const entry of entries) {
    const match = QUANTITY_PARAM.exec(entry);
    if (!match || Object.hasOwn(quantities, match[1])) return null;
    quantities[match[1]] = Number(match[2]);
  }
  return quantities;
}

/**
 * params is a URLSearchParams with product, variant, one choice entry per selected choice and,
 * for an accessory wanted more than once, a quantity entry such as "217067:2".
 */
export async function handleQuoteRequest(graphql, params) {
  const quantities = readQuantityParams(params.getAll("quantity"));
  if (!quantities) return refuse(400, "bad_request");

  const { quote, refusal } = await quoteSelection(graphql, {
    productId: params.get("product"),
    variantId: params.get("variant"),
    choiceIds: params.getAll("choice"),
    quantities,
  });
  if (refusal) return refusal;

  return {
    status: 200,
    body: {
      ok: true,
      baseCents: quote.baseCents,
      lines: quote.lines.map(({ choiceId, group, label, quantity, unitCents, cents }) => ({
        choiceId,
        group,
        label,
        quantity,
        unitCents,
        cents,
      })),
      totalCents: quote.totalCents,
    },
  };
}

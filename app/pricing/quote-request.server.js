// Turns a storefront price request into a validated quote. Prices sent by the browser are never read.
import { loadConfigurableProduct } from "./load-product.server.js";
import { quoteConfiguration, quoteOrdinaryProduct } from "./quote.server.js";

const MAX_CHOICES = 20;
const SHOPIFY_ID = /^\d{1,20}$/;
const CHOICE_ID = /^[\w-]{1,64}$/;

const refuse = (status, code) => ({ status, body: { ok: false, errors: [{ code }] } });

const matches = (pattern, value) => typeof value === "string" && pattern.test(value);

/** Validates untrusted IDs and prices them from live Shopify data. Returns { quote } or { refusal }. */
export async function quoteSelection(graphql, { productId, variantId, choiceIds }) {
  if (
    !matches(SHOPIFY_ID, productId) ||
    !matches(SHOPIFY_ID, variantId) ||
    !Array.isArray(choiceIds) ||
    choiceIds.length > MAX_CHOICES ||
    !choiceIds.every((id) => matches(CHOICE_ID, id))
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

  const quoteProduct = product.ordinary ? quoteOrdinaryProduct : quoteConfiguration;
  const quote = quoteProduct(product, {
    variantId: `gid://shopify/ProductVariant/${variantId}`,
    choiceIds,
  });
  return quote.ok ? { quote } : { refusal: { status: 422, body: quote } };
}

/** params is a URLSearchParams with product, variant and one choice entry per selected option. */
export async function handleQuoteRequest(graphql, params) {
  const { quote, refusal } = await quoteSelection(graphql, {
    productId: params.get("product"),
    variantId: params.get("variant"),
    choiceIds: params.getAll("choice"),
  });
  if (refusal) return refusal;

  return {
    status: 200,
    body: {
      ok: true,
      baseCents: quote.baseCents,
      lines: quote.lines.map(({ choiceId, group, label, cents }) => ({ choiceId, group, label, cents })),
      totalCents: quote.totalCents,
    },
  };
}

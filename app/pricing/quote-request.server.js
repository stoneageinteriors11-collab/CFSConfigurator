// Turns a storefront price request into a validated quote. Prices sent by the browser are never read.
import { loadConfigurableProduct } from "./load-product.server.js";
import { quoteConfiguration } from "./quote.server.js";

const MAX_CHOICES = 20;
const SHOPIFY_ID = /^\d{1,20}$/;
const CHOICE_ID = /^[\w-]{1,64}$/;

const refuse = (status, code) => ({ status, body: { ok: false, errors: [{ code }] } });

/** params is a URLSearchParams with product, variant and one choice entry per selected option. */
export async function handleQuoteRequest(graphql, params) {
  const productId = params.get("product");
  const variantId = params.get("variant");
  const choiceIds = params.getAll("choice");

  if (
    !SHOPIFY_ID.test(productId ?? "") ||
    !SHOPIFY_ID.test(variantId ?? "") ||
    choiceIds.length > MAX_CHOICES ||
    !choiceIds.every((id) => CHOICE_ID.test(id))
  ) {
    return refuse(400, "bad_request");
  }

  let product;
  try {
    product = await loadConfigurableProduct(graphql, `gid://shopify/Product/${productId}`);
  } catch (error) {
    console.error("Quote: could not read product", productId, error?.message);
    return refuse(502, "unavailable");
  }
  if (!product) return refuse(404, "product_not_found");

  const quote = quoteConfiguration(product, {
    variantId: `gid://shopify/ProductVariant/${variantId}`,
    choiceIds,
  });
  if (!quote.ok) return { status: 422, body: quote };

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

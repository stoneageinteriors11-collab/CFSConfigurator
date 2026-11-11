// Gives the product page a product's full list of choices. A theme page can only show the first
// 250 choices from Shopify, so for a larger product the page asks for the list here and adds the
// choices it is missing. Read only. Prices shown from this list are for display: every price is
// still worked out again by the price check before anything is sold.
import { loadConfigurableProduct } from "./load-product.server.js";
import { unsupportedReason } from "./quote.server.js";

const SHOPIFY_ID = /^\d{1,20}$/;

const refuse = (status, code) => ({ status, body: { ok: false, errors: [{ code }] } });

/** What one choice card needs, in the same shape as the data the theme reads itself. */
const cardOf = (option) => ({
  id: option.cfsId,
  label: option.label,
  group: option.groupName,
  kind: option.mappings.kind,
  imageUrl: option.imageUrl ?? null,
  dimensions: option.mappings.dimensions ?? "",
  insideColor: option.mappings.inside_color ?? "",
  assignments: option.mappings.assignments,
});

/** params is a URLSearchParams with the product's numeric ID. */
export async function handleChoicesRequest(graphql, params) {
  const productId = params.get("product");
  if (typeof productId !== "string" || !SHOPIFY_ID.test(productId)) return refuse(400, "bad_request");

  let product;
  try {
    product = await loadConfigurableProduct(graphql, `gid://shopify/Product/${productId}`);
  } catch (error) {
    console.error("Choices: could not read product", productId, error?.message);
    return refuse(502, "unavailable");
  }
  if (!product || product.ordinary) return refuse(404, "product_not_found");
  // The same rule as the price check: a product the app cannot price gets no choices to show.
  if (unsupportedReason(product)) return refuse(422, "unsupported_product");

  // Choices with unreadable data are left out; the price check refuses them if picked anyway.
  const usable = product.options.filter(
    (o) => o.cfsId && o.label && o.groupName && o.mappings && Array.isArray(o.mappings.assignments),
  );
  return { status: 200, body: { ok: true, total: product.options.length, choices: usable.map(cardOf) } };
}

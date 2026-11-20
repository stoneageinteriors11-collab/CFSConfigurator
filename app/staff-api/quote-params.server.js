// Turns the Orders app's JSON quote request into the URLSearchParams the existing price check reads.
// No validation here: handleQuoteRequest refuses anything malformed, so there is one set of rules.
const numeric = (id) => (typeof id === "string" ? id.replace(/^gid:\/\/shopify\/\w+\//, "") : id);

/** Returns URLSearchParams, or null when the body is not an object with a list of choice ids. */
export function quoteParams(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) || !Array.isArray(body.choiceIds)) return null;
  const params = new URLSearchParams();
  params.set("product", String(numeric(body.productId)));
  params.set("variant", String(numeric(body.variantId)));
  for (const id of body.choiceIds) params.append("choice", String(id));
  for (const [id, count] of Object.entries(body.quantities ?? {})) params.append("quantity", `${id}:${count}`);
  return params;
}

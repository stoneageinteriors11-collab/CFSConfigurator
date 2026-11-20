// A product's groups, choices and accessory limit, for the Orders app's option picker.
// Same product checks and choice cards as the storefront choices route; read only.
import { readChoices } from "../pricing/choices-request.server.js";

/** params is a URLSearchParams with the product's numeric ID. Returns { status, body }. */
export async function staffChoices(graphql, params) {
  const { product, choices, refusal } = await readChoices(graphql, params);
  if (refusal) return refusal;

  const limit = product.workflow?.pricing?.accessory_max_quantity;
  return {
    status: 200,
    body: {
      ok: true,
      groups: product.workflow.groups.map((g) => ({ name: g.name, optional: g.optional, requires: g.requires ?? "" })),
      choices,
      accessoryMax: Number.isInteger(limit) ? limit : null,
    },
  };
}

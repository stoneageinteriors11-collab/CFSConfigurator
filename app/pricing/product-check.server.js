// Checks whether the app can price and sell each CFS product right now, using the same
// pricing code as the shop. Read only: nothing in Shopify is changed.
import { loadConfigurableProduct } from "./load-product.server.js";
import { SUPPORTED_MODE, quoteConfiguration, resolveAssignment } from "./quote.server.js";

// The products in scope for now: the seven CFS configuration test products.
export const CHECKED_PRODUCTS_QUERY = `#graphql
  query CfsCheckedProducts {
    products(first: 50, sortKey: TITLE, query: "tag:cfs-configuration-type-test") {
      nodes {
        id
        title
        handle
        status
      }
    }
  }`;

const REASONS = {
  unknown_variant: "unknown size",
  variant_unavailable: "not in stock",
  invalid_product_data: "price or model data unreadable",
  unknown_choice: "a choice is missing",
  invalid_choice_data: "a choice's data is unreadable",
  unsupported_choice: "a kind of choice the app does not support yet",
  incompatible_choice: "a choice does not fit this size",
  too_many_in_group: "two choices in one group",
  missing_required: "a required group has no usable choice",
  prerequisite_missing: "a group needs another group that has no usable choice",
  duplicate_choice: "a choice is repeated",
};

const reasonOf = (error) => [REASONS[error.code] ?? error.code, error.group].filter(Boolean).join(": ");

/** The cheapest complete selection for one size: the cheapest usable choice in each required group. */
function cheapestSelection(product, modelId, note) {
  const picked = new Set();
  const choiceIds = [];
  for (const group of product.workflow.groups) {
    if (group.optional) continue;
    if (group.requires && group.requires !== "$model" && !picked.has(group.requires)) continue;
    let best = null;
    for (const option of product.options) {
      if (option.groupName !== group.name || option.mappings?.kind !== "option") continue;
      const assignment = resolveAssignment(option, modelId);
      if (assignment === "invalid") note(`Choice "${option.label}" (${option.cfsId}) has unreadable price data`);
      if (typeof assignment === "object" && (!best || assignment.cents < best.cents)) {
        best = { cents: assignment.cents, cfsId: option.cfsId };
      }
    }
    if (best) {
      picked.add(group.name);
      choiceIds.push(best.cfsId);
    }
  }
  return choiceIds;
}

/**
 * product comes from loadConfigurableProduct. Returns
 * { ready, problems, sizes, sizesOnSale, groups, choices, fromCents }.
 * Ready means every size in stock can be priced, at least one is in stock, and no choice data is broken.
 */
export function checkProduct(product) {
  if (!product) return { ready: false, problems: ["Shopify returned only part of this product (over 250 sizes or choices)"] };
  if (product.ordinary) return { ready: false, problems: ["Has no CFS option data"] };

  const { workflow } = product;
  const summary = {
    sizes: product.variants.length,
    sizesOnSale: product.variants.filter((v) => v.inventoryQuantity > 0).length,
    groups: Array.isArray(workflow?.groups) ? workflow.groups.length : 0,
    choices: product.options.length,
    fromCents: null,
  };
  if (!Array.isArray(workflow?.groups)) {
    return { ...summary, ready: false, problems: ["Its option setup (workflow) is missing or unreadable"] };
  }
  if (workflow.mode !== SUPPORTED_MODE) {
    return { ...summary, ready: false, problems: [`Product type "${workflow.mode}" is not supported yet`] };
  }

  const problems = new Set();
  const note = (problem) => problems.add(problem);
  const groupNames = new Set(workflow.groups.map((g) => g.name));
  for (const option of product.options) {
    if (!option.cfsId || !option.label || !option.groupName) note(`A choice is missing its ID, name or group (${option.cfsId ?? "no ID"})`);
    else if (!groupNames.has(option.groupName)) note(`Choice "${option.label}" is in unknown group "${option.groupName}"`);
    else if (!option.mappings) note(`Choice "${option.label}" (${option.cfsId}) has unreadable price data`);
  }

  for (const variant of product.variants) {
    if (!(variant.inventoryQuantity > 0)) continue;
    const size = `Size ${variant.title} (${variant.sku || "no SKU"})`;
    const modelId = product.modelCards?.[variant.sku]?.source_id;
    if (!modelId) {
      note(`${size} has no model card`);
      continue;
    }
    const quote = quoteConfiguration(product, { variantId: variant.id, choiceIds: cheapestSelection(product, modelId, note) });
    if (!quote.ok) {
      note(`${size} cannot be priced: ${[...new Set(quote.errors.map(reasonOf))].join("; ")}`);
    } else if (summary.fromCents === null || quote.totalCents < summary.fromCents) {
      summary.fromCents = quote.totalCents;
    }
  }
  if (summary.sizesOnSale === 0) note("No size is in stock, so it cannot be bought");

  return { ...summary, ready: problems.size === 0, problems: [...problems] };
}

/** Checks every product in scope. Products are read one at a time to stay well inside Shopify's limits. */
export async function checkProducts(graphql) {
  const response = await graphql(CHECKED_PRODUCTS_QUERY, { variables: {} });
  const { data } = await response.json();
  const results = [];
  for (const listed of data.products.nodes) {
    const product = await loadConfigurableProduct(graphql, listed.id);
    results.push({ ...listed, ...checkProduct(product) });
  }
  return results;
}

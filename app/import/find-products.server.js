// Finds the Shopify product for each CFS product ID through its variant SKUs
// ({PREFIX}-{productId}-{sizeId}). Read only.
import { loadConfigurableProduct } from "../pricing/load-product.server.js";
import { sizeIdOf } from "./build-product.js";

export const VARIANTS_BY_SKU_QUERY = `#graphql
  query CfsImportVariantsBySku($query: String!) {
    productVariants(first: 250, query: $query) {
      pageInfo { hasNextPage }
      nodes { sku product { id } }
    }
  }`;

const PARTIAL =
  "Shopify returned only part of this product (over 250 sizes, or its choices could not all be read)";

async function findOne(graphql, id) {
  const query = `sku:CFS-${id}-* OR sku:UD-${id}-* OR sku:CFS-TYPE-${id}-*`;
  const response = await graphql(VARIANTS_BY_SKU_QUERY, {
    variables: { query },
  });
  const { data } = await response.json();
  const variants = data?.productVariants;
  if (!variants) return { error: PARTIAL };
  if (variants.pageInfo.hasNextPage) return { error: PARTIAL };

  // Shopify's search matches loosely, so only exact SKU patterns count.
  const productIds = new Set(
    variants.nodes.filter((v) => sizeIdOf(v.sku, id)).map((v) => v.product.id),
  );
  if (productIds.size === 0)
    return {
      error: `No Shopify product has sizes with SKUs like CFS-${id}-<size ID>`,
    };
  if (productIds.size > 1)
    return {
      error: "Sizes with this product ID are on more than one Shopify product",
    };

  const product = await loadConfigurableProduct(graphql, [...productIds][0]);
  return product ? { product } : { error: PARTIAL };
}

/** Map of CFS product ID to { product } or { error }. Products are looked up one at a time. */
export async function findProducts(graphql, cfsProductIds) {
  const found = new Map();
  for (const id of cfsProductIds) {
    if (found.has(id)) continue;
    try {
      found.set(id, await findOne(graphql, id));
    } catch {
      // A rate limit or network hiccup affects this product only, not the whole preview.
      found.set(id, {
        error: "Shopify could not be read for this product just now; try again",
      });
    }
  }
  return found;
}

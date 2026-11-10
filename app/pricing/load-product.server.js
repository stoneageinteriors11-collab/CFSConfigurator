// Reads a configurable product from Shopify in the shape the pricing engine expects.

const PRODUCT_QUERY = `#graphql
  query CfsConfigurableProduct($id: ID!) {
    product(id: $id) {
      id
      variants(first: 250) {
        pageInfo { hasNextPage }
        nodes { id sku price inventoryQuantity }
      }
      modelCards: metafield(namespace: "cfs_import", key: "model_cards") { value }
      workflow: metafield(namespace: "cfs_import", key: "workflow") { value }
      options: metafield(namespace: "cfs_import", key: "options") {
        references(first: 250) {
          pageInfo { hasNextPage }
          nodes {
            ... on Metaobject {
              cfsId: field(key: "cfs_id") { value }
              label: field(key: "label") { value }
              groupName: field(key: "group_name") { value }
              mappings: field(key: "source_mappings") { value }
            }
          }
        }
      }
    }
  }`;

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

/**
 * Returns the product, or null if it is missing or Shopify returned only part of it.
 * Bad JSON is left undefined so the pricing engine refuses it.
 */
export async function loadConfigurableProduct(graphql, productId) {
  const response = await graphql(PRODUCT_QUERY, { variables: { id: productId } });
  const { data } = await response.json();
  const product = data.product;
  const references = product?.options?.references;

  if (!product || !references) return null;
  if (product.variants.pageInfo.hasNextPage || references.pageInfo.hasNextPage) return null;

  return {
    productId: product.id,
    variants: product.variants.nodes,
    modelCards: parseJson(product.modelCards?.value),
    workflow: parseJson(product.workflow?.value),
    options: references.nodes.map((node) => ({
      cfsId: node.cfsId?.value,
      label: node.label?.value,
      groupName: node.groupName?.value,
      mappings: parseJson(node.mappings?.value),
    })),
  };
}

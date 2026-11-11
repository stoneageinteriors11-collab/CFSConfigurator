// Reads a configurable product from Shopify in the shape the pricing engine expects.

// Shopify gives at most 250 choices per request, and a product's list holds at most 1,024,
// so 5 requests read any complete list. Anything still unread after that is refused.
const CHOICES_PER_PAGE = 250;
const MAX_CHOICE_PAGES = 5;

const CHOICE_FIELDS = `
  ... on Metaobject {
    cfsId: field(key: "cfs_id") { value }
    label: field(key: "label") { value }
    groupName: field(key: "group_name") { value }
    mappings: field(key: "source_mappings") { value }
  }`;

const MORE_CHOICES_QUERY = `#graphql
  query CfsMoreChoices($id: ID!, $after: String!) {
    product(id: $id) {
      options: metafield(namespace: "cfs_import", key: "options") {
        references(first: ${CHOICES_PER_PAGE}, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes { ${CHOICE_FIELDS} }
        }
      }
    }
  }`;

const PRODUCT_QUERY = `#graphql
  query CfsConfigurableProduct($id: ID!) {
    product(id: $id) {
      id
      title
      handle
      status
      publishedAt
      featuredMedia { preview { image { url } } }
      variants(first: 250) {
        pageInfo { hasNextPage }
        nodes { id sku title price inventoryQuantity inventoryPolicy availableForSale inventoryItem { tracked } }
      }
      modelCards: metafield(namespace: "cfs_import", key: "model_cards") { value }
      workflow: metafield(namespace: "cfs_import", key: "workflow") { value }
      options: metafield(namespace: "cfs_import", key: "options") {
        references(first: ${CHOICES_PER_PAGE}) {
          pageInfo { hasNextPage endCursor }
          nodes { ${CHOICE_FIELDS} }
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

/** Every choice in the product's list, reading further pages as needed, or null if any page is missing. */
async function readAllChoices(graphql, productId, firstPage) {
  if (!firstPage) return null;
  const nodes = [...firstPage.nodes];
  let { pageInfo } = firstPage;
  for (let page = 1; pageInfo.hasNextPage; page += 1) {
    if (page >= MAX_CHOICE_PAGES || !pageInfo.endCursor) return null;
    const response = await graphql(MORE_CHOICES_QUERY, { variables: { id: productId, after: pageInfo.endCursor } });
    const { data } = await response.json();
    const next = data?.product?.options?.references;
    if (!next) return null;
    nodes.push(...next.nodes);
    pageInfo = next.pageInfo;
  }
  return nodes;
}

/**
 * Returns the product, or null if it is missing or Shopify returned only part of it.
 * Bad JSON is left undefined so the pricing engine refuses it.
 * A product is marked ordinary only if it has none of the CFS data, so a configurable
 * product with damaged or partial data can never be sold at its plain variant price.
 */
export async function loadConfigurableProduct(graphql, productId) {
  const response = await graphql(PRODUCT_QUERY, { variables: { id: productId } });
  const { data } = await response.json();
  const product = data.product;

  if (!product || product.variants.pageInfo.hasNextPage) return null;

  const shared = {
    productId: product.id,
    title: product.title,
    handle: product.handle,
    imageUrl: product.featuredMedia?.preview?.image?.url ?? null,
  };

  if (!product.modelCards && !product.workflow && !product.options) {
    return {
      ...shared,
      ordinary: true,
      status: product.status,
      publishedAt: product.publishedAt,
      variants: product.variants.nodes,
    };
  }

  const nodes = await readAllChoices(graphql, productId, product.options?.references);
  if (!nodes) return null;

  return {
    ...shared,
    variants: product.variants.nodes,
    modelCards: parseJson(product.modelCards?.value),
    workflow: parseJson(product.workflow?.value),
    options: nodes.map((node) => ({
      cfsId: node.cfsId?.value,
      label: node.label?.value,
      groupName: node.groupName?.value,
      mappings: parseJson(node.mappings?.value),
    })),
  };
}

// A fake Shopify Admin API serving test fixtures, for the import tests.
// A product with ordinary: true is served with no CFS option data.

const asShopify = (p) => ({
  id: p.productId,
  title: p.title,
  handle: p.handle ?? "",
  featuredMedia: null,
  variants: { pageInfo: { hasNextPage: false }, nodes: p.variants },
  modelCards: p.ordinary ? null : { value: JSON.stringify(p.modelCards) },
  workflow: p.ordinary ? null : { value: JSON.stringify(p.workflow) },
  options: p.ordinary
    ? null
    : {
        references: {
          pageInfo: { hasNextPage: false },
          nodes: p.options.map((o) => ({
            cfsId: { value: o.cfsId },
            label: { value: o.label },
            groupName: { value: o.groupName },
            mappings: { value: JSON.stringify(o.mappings) },
            imageUrl: o.imageUrl ? { value: o.imageUrl } : null,
          })),
        },
      },
});

/** graphql(query, { variables }) over these products. Products are read when called, so tests may change them. */
export function fakeShop(products) {
  return async function graphql(query, { variables }) {
    let data;
    if (query.includes("productVariants")) {
      const nodes = products.flatMap((p) => p.variants.map((v) => ({ sku: v.sku, product: { id: p.productId } })));
      data = { productVariants: { pageInfo: { hasNextPage: false }, nodes } };
    } else {
      const product = products.find((p) => p.productId === variables.id);
      data = { product: product ? asShopify(product) : null };
    }
    return { json: async () => ({ data }) };
  };
}

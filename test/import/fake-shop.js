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
          nodes: p.options.map((o, i) => ({
            entryId: o.entryId ?? `gid://shopify/Metaobject/${p.productId.split("/").pop()}${i}`,
            cfsId: { value: o.cfsId },
            label: { value: o.label },
            groupName: { value: o.groupName },
            mappings: { value: JSON.stringify(o.mappings) },
            imageUrl: o.imageUrl ? { value: o.imageUrl } : null,
            optionCode: o.optionCode ? { value: o.optionCode } : null,
          })),
        },
      },
});

// A live option entry as the shared-option lookup sees it:
// { id, label, imageUrl, details, code, products: [{ id, title }] }.
const asEntry = (e) => ({
  id: e.id,
  label: { value: e.label },
  imageUrl: e.imageUrl ? { value: e.imageUrl } : null,
  mappings: { value: JSON.stringify({ dimensions: e.details ?? "" }) },
  optionCode: e.code ? { value: e.code } : null,
  referencedBy: { nodes: (e.products ?? []).map((p) => ({ referencer: p })) },
});

/** The metaobjects search: fields.option_code:CODE or fields.label:"NAME", pageSize entries at a time. */
function searchEntries(entries, { query, after }, pageSize) {
  const code = /^fields\.option_code:(.+)$/.exec(query)?.[1];
  const label = /^fields\.label:"(.*)"$/.exec(query)?.[1]?.replace(/\\(.)/g, "$1");
  const hits = entries.filter((e) => (code !== undefined ? e.code === code : e.label === label));
  const start = after ? Number(after) : 0;
  const page = hits.slice(start, start + pageSize);
  const end = start + page.length;
  return {
    pageInfo: { hasNextPage: end < hits.length, endCursor: String(end) },
    nodes: page.map(asEntry),
  };
}

/**
 * graphql(query, { variables }) over these products. Products are read when called, so tests may
 * change them. entries are live option entries (see asEntry) for the shared-option lookup.
 */
export function fakeShop(products, entries = [], pageSize = 250) {
  return async function graphql(query, { variables }) {
    let data;
    if (query.includes("CfsSharedOptions")) {
      data = { metaobjects: searchEntries(entries, variables, pageSize) };
    } else if (query.includes("productVariants")) {
      const nodes = products.flatMap((p) => p.variants.map((v) => ({ sku: v.sku, product: { id: p.productId } })));
      data = { productVariants: { pageInfo: { hasNextPage: false }, nodes } };
    } else {
      const product = products.find((p) => p.productId === variables.id);
      data = { product: product ? asShopify(product) : null };
    }
    return { json: async () => ({ data }) };
  };
}

// E7e: one cfs-spike product with 300 choices (Natural Gold's 53 plus 247 made-up fabrics at £25.00),
// to test the product page loading choices past the first 250. Removed afterwards by e7e-cleanup.js.
import { SPIKE_TAG, loadResults, read, saveResult, write } from "./lib.js";

const NATURAL_GOLD = "gid://shopify/Product/11067852980563";
const ONLINE_STORE = "gid://shopify/Publication/360294285651";
const EXTRA = 247;
const BATCH = 25;
const EXTRA_PRICE = "25.00";

if (loadResults().E7e?.ids?.product) throw new Error("E7e already created a product.");

const { product: source } = read(
  `query($id: ID!) { product(id: $id) {
    variants(first: 10) { nodes { sku price selectedOptions { name value } } }
    modelCards: metafield(namespace: "cfs_import", key: "model_cards") { value }
    workflow: metafield(namespace: "cfs_import", key: "workflow") { value }
    options: metafield(namespace: "cfs_import", key: "options") { value }
  } }`,
  { id: NATURAL_GOLD },
);

const sourceIds = JSON.parse(source.options.value);
const modelCards = JSON.parse(source.modelCards.value);
const skuOf = (sku) => sku.replace("CFS-TYPE-146477-", "CFS-SPIKE-300-");
const parents = source.variants.nodes.map((v) => modelCards[v.sku].source_id);
if (sourceIds.length !== 53 || parents.some((p) => !p)) throw new Error("Natural Gold is not as expected.");

// The made-up fabrics, each priced £25.00 on every size.
const extraFields = (n) => [
  { key: "label", value: `Spike fabric ${n}` },
  { key: "group_name", value: "Select Fabric" },
  { key: "cfs_id", value: `spike-${n}` },
  { key: "source_product_id", value: SPIKE_TAG },
  { key: "source_product_name", value: "CFS SPIKE - 300 choices" },
  { key: "parent_cfs_id", value: parents[0] },
  { key: "raw_price", value: EXTRA_PRICE },
  { key: "pricing_status", value: "Made-up test choice (cfs-spike)" },
  { key: "image_url", value: "https://images.choicefurnituresuperstore.co.uk/images2/Bedrooms/Beds/V-146477-Carlton-Black.jpg" },
  {
    key: "source_mappings",
    value: JSON.stringify({
      kind: "option",
      dimensions: "",
      inside_color: "",
      assignments: parents.map((parent) => ({ id: `spike-${n}-${parent}`, parent, parent2: "0", raw_price: EXTRA_PRICE })),
    }),
  },
];

const extraIds = [];
for (let start = 1; start <= EXTRA; start += BATCH) {
  const numbers = Array.from({ length: Math.min(BATCH, EXTRA - start + 1) }, (_, i) => start + i);
  const variables = Object.fromEntries(
    numbers.flatMap((n) => [
      [`h${n}`, { type: "cfs_import_option", handle: `cfs-spike-fabric-${n}` }],
      [`m${n}`, { fields: extraFields(n) }],
    ]),
  );
  const params = numbers.map((n) => `$h${n}: MetaobjectHandleInput!, $m${n}: MetaobjectUpsertInput!`).join(", ");
  const calls = numbers
    .map((n) => `f${n}: metaobjectUpsert(handle: $h${n}, metaobject: $m${n}) { metaobject { id } userErrors { field message code } }`)
    .join("\n");
  const result = write(`mutation(${params}) {\n${calls}\n}`, variables);
  for (const n of numbers) {
    const { metaobject, userErrors } = result[`f${n}`];
    if (userErrors.length || !metaobject) {
      saveResult("E7e", { status: "Failed creating choices", ids: { extraChoices: extraIds } });
      console.log(n, JSON.stringify(userErrors, null, 2));
      process.exit(1);
    }
    extraIds.push(metaobject.id);
  }
  saveResult("E7e", { status: "Creating choices", ids: { extraChoices: extraIds } });
  console.log(`choices ${extraIds.length}/${EXTRA}`);
}

const input = {
  title: "CFS SPIKE - 300 choices",
  status: "ACTIVE",
  templateSuffix: "cfs-import-preview",
  tags: [SPIKE_TAG, "spike-E7e"],
  productOptions: [{ name: "Model", position: 1, values: source.variants.nodes.map((v) => ({ name: v.selectedOptions[0].value })) }],
  variants: source.variants.nodes.map((v) => ({
    optionValues: [{ optionName: "Model", name: v.selectedOptions[0].value }],
    sku: skuOf(v.sku),
    price: v.price,
    inventoryItem: { tracked: false },
  })),
  metafields: [
    {
      namespace: "cfs_import",
      key: "model_cards",
      type: "json",
      value: JSON.stringify(Object.fromEntries(Object.entries(modelCards).map(([sku, card]) => [skuOf(sku), card]))),
    },
    { namespace: "cfs_import", key: "workflow", type: "json", value: source.workflow.value },
    { namespace: "cfs_import", key: "options", type: "list.metaobject_reference", value: JSON.stringify([...sourceIds, ...extraIds]) },
  ],
};

const { productSet: created } = write(
  `mutation($input: ProductSetInput!) { productSet(input: $input, synchronous: true) {
    product { id handle variants(first: 10) { nodes { id sku price } } }
    userErrors { field message code } } }`,
  { input },
);
if (created.userErrors.length) {
  console.log(JSON.stringify(created.userErrors, null, 2));
  process.exit(1);
}
const product = created.product;
saveResult("E7e", { status: "Product created", ids: { product: product.id, handle: product.handle, extraChoices: extraIds } });

const { publishablePublish: published } = write(
  `mutation($id: ID!, $input: [PublicationInput!]!) { publishablePublish(id: $id, input: $input) {
    publishable { ... on Product { id } } userErrors { field message } } }`,
  { id: product.id, input: [{ publicationId: ONLINE_STORE }] },
);
if (published.userErrors.length) {
  console.log(JSON.stringify(published.userErrors, null, 2));
  process.exit(1);
}

saveResult("E7e", { status: "Published, browser check pending" });
console.log(JSON.stringify({ handle: product.handle, choices: sourceIds.length + extraIds.length, variants: product.variants.nodes }, null, 2));

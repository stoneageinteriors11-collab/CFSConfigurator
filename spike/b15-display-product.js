// B15: one published display-style product, tracked at zero stock with overselling off.
import { SPIKE_TAG, loadResults, saveResult, write } from "./lib.js";

const ONLINE_STORE = "gid://shopify/Publication/360294285651";

if (loadResults().B15?.ids?.product) throw new Error("B15 already created a product.");

const input = {
  title: "CFS SPIKE B15 - Display product zero stock",
  status: "ACTIVE",
  tags: [SPIKE_TAG, "spike-B15"],
  productOptions: [{ name: "Title", position: 1, values: [{ name: "Default Title" }] }],
  variants: [
    {
      optionValues: [{ optionName: "Title", name: "Default Title" }],
      sku: "TEST-CFS-DISPLAY",
      price: "499.00",
      inventoryPolicy: "DENY",
      inventoryItem: { tracked: true },
    },
  ],
};

const { productSet: created } = write(
  `mutation($input: ProductSetInput!) { productSet(input: $input, synchronous: true) {
    product { id handle status publishedAt tags variants(first: 1) { nodes {
      id legacyResourceId sku price inventoryPolicy inventoryQuantity inventoryItem { tracked } } } }
    userErrors { field message code } } }`,
  { input },
);

if (created.userErrors.length) {
  console.log(JSON.stringify(created.userErrors, null, 2));
  process.exit(1);
}

const product = created.product;
saveResult("B15", { status: "Product created", inputs: input, ids: { product: product.id, handle: product.handle } });

const { publishablePublish: published } = write(
  `mutation($id: ID!, $input: [PublicationInput!]!) { publishablePublish(id: $id, input: $input) {
    publishable { ... on Product { id publishedAt } } userErrors { field message } } }`,
  { id: product.id, input: [{ publicationId: ONLINE_STORE }] },
);

if (published.userErrors.length) {
  console.log(JSON.stringify(published.userErrors, null, 2));
  process.exit(1);
}

const variant = product.variants.nodes[0];
saveResult("B15", {
  status: "Published, browser check pending",
  ids: { product: product.id, handle: product.handle, variant: variant.id, legacyVariant: variant.legacyResourceId },
  actual: { variant, publishedAt: published.publishable.publishedAt },
});

console.log(JSON.stringify({ handle: product.handle, status: product.status, variant, publishedAt: published.publishable.publishedAt }, null, 2));

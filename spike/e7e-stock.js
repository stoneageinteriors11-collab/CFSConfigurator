// E7e: track stock on the 300-choice test product's six sizes and set 100 of each, like Natural Gold.
import { randomUUID } from "node:crypto";
import { loadResults, read, saveResult, write } from "./lib.js";

const productId = loadResults().E7e?.ids?.product;
if (!productId) throw new Error("E7e has no product.");

const { product, locations } = read(
  `query($id: ID!) {
    product(id: $id) { tags variants(first: 10) { nodes { sku inventoryItem { id tracked } } } }
    locations(first: 5) { nodes { id name isActive } }
  }`,
  { id: productId },
);
if (!product.tags.includes("spike-E7e")) throw new Error("Not the E7e product.");
const active = locations.nodes.filter((l) => l.isActive);
if (active.length !== 1) throw new Error(`Expected one active location, found ${active.length}.`);

const items = product.variants.nodes.map((v) => v.inventoryItem.id);
for (const id of items) {
  const { inventoryItemUpdate: updated } = write(
    `mutation($id: ID!, $input: InventoryItemInput!) { inventoryItemUpdate(id: $id, input: $input) {
      inventoryItem { id tracked } userErrors { field message } } }`,
    { id, input: { tracked: true } },
  );
  if (updated.userErrors.length) throw new Error(JSON.stringify(updated.userErrors));
}

const { inventorySetQuantities: set } = write(
  `mutation($input: InventorySetQuantitiesInput!, $key: String!) { inventorySetQuantities(input: $input) @idempotent(key: $key) {
    inventoryAdjustmentGroup { id } userErrors { field message code } } }`,
  {
    key: randomUUID(),
    input: {
      name: "available",
      reason: "correction",
      quantities: items.map((inventoryItemId) => ({
        inventoryItemId,
        locationId: active[0].id,
        quantity: 100,
        changeFromQuantity: null,
      })),
    },
  },
);
if (set.userErrors.length) throw new Error(JSON.stringify(set.userErrors));

const { product: after } = read(
  `query($id: ID!) { product(id: $id) { variants(first: 10) { nodes { sku inventoryQuantity inventoryItem { tracked } } } } }`,
  { id: productId },
);
saveResult("E7e", { status: "Stock set, browser check pending", stock: after.variants.nodes });
console.log(JSON.stringify(after.variants.nodes));

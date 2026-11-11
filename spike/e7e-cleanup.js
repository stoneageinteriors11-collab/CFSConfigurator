// E7e cleanup: deletes the 300-choice test product and its 247 made-up choices. Natural Gold's 53 are untouched.
import { loadResults, read, saveResult, write } from "./lib.js";

const { ids } = loadResults().E7e ?? {};
if (!ids?.product) throw new Error("E7e has no product to remove.");

const { product } = read(`query($id: ID!) { product(id: $id) { tags } }`, { id: ids.product });
if (product && !product.tags.includes("spike-E7e")) throw new Error("Not the E7e product.");

// Only made-up choices: every one must have a cfs-spike-fabric- handle.
const { nodes } = read(`query($ids: [ID!]!) { nodes(ids: $ids) { ... on Metaobject { id handle } } }`, { ids: ids.extraChoices });
const choices = nodes.filter(Boolean);
if (choices.some((m) => !m.handle.startsWith("cfs-spike-fabric-"))) throw new Error("A choice is not a made-up spike choice.");

if (product) {
  const { productDelete } = write(
    `mutation($input: ProductDeleteInput!) { productDelete(input: $input, synchronous: true) { deletedProductId userErrors { field message } } }`,
    { input: { id: ids.product } },
  );
  if (productDelete.userErrors.length) throw new Error(JSON.stringify(productDelete.userErrors));
}

if (choices.length) {
  const { metaobjectBulkDelete } = write(
    `mutation($where: MetaobjectBulkDeleteWhereCondition!) { metaobjectBulkDelete(where: $where) { job { id done } userErrors { field message code } } }`,
    { where: { ids: choices.map((m) => m.id) } },
  );
  if (metaobjectBulkDelete.userErrors.length) throw new Error(JSON.stringify(metaobjectBulkDelete.userErrors));
}

saveResult("E7e", { status: "Removed", removed: { product: Boolean(product), choices: choices.length } });
console.log(`Removed product: ${Boolean(product)}, choices: ${choices.length}`);

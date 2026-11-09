// B12: delete the B11 test draft while its checkout is open. Only deletes an open, spike-tagged draft.
import { SPIKE_TAG, loadResults, read, saveResult, write } from "./lib.js";

const { ids } = loadResults().B11;

const { draftOrder } = read(
  "query($id: ID!) { draftOrder(id: $id) { id name status tags order { id } } }",
  { id: ids.draftOrder },
);

if (!draftOrder || draftOrder.status !== "OPEN" || draftOrder.order || !draftOrder.tags.includes(SPIKE_TAG)) {
  console.log(JSON.stringify(draftOrder, null, 2));
  throw new Error("Refusing to delete: not an open spike draft with no order.");
}

const { draftOrderDelete: r } = write(
  "mutation($input: DraftOrderDeleteInput!) { draftOrderDelete(input: $input) { deletedId userErrors { field message } } }",
  { input: { id: draftOrder.id } },
);

if (r.userErrors.length) {
  console.log(JSON.stringify(r.userErrors, null, 2));
  process.exit(1);
}

const { draftOrder: after } = read("query($id: ID!) { draftOrder(id: $id) { id status } }", { id: ids.draftOrder });

saveResult("B12", {
  status: "Draft deleted, checking links",
  ids: { deletedDraft: r.deletedId, name: draftOrder.name, invoiceUrl: ids.invoiceUrl },
  actual: { deletedId: r.deletedId, readBackAfterDelete: after },
});

console.log(JSON.stringify({ deletedId: r.deletedId, name: draftOrder.name, readBackAfterDelete: after }, null, 2));

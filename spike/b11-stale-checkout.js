// B11: create a draft (step "create"), then change its price while its checkout is open (step "update").
import { DRAFT_FIELDS, NATURAL_GOLD_VARIANT, SPIKE_TAG, loadResults, saveResult, write } from "./lib.js";

const step = process.argv[2];
const previous = loadResults().B11;

const line = (amount) => ({
  variantId: NATURAL_GOLD_VARIANT,
  quantity: 1,
  priceOverride: { amount, currencyCode: "GBP" },
  customAttributes: [{ key: "CFS test price", value: amount }],
});

const summary = (d) => ({
  id: d.id,
  name: d.name,
  status: d.status,
  invoiceUrl: d.invoiceUrl,
  total: d.totalPriceSet.shopMoney.amount,
  line: d.lineItems.nodes[0].originalUnitPriceSet.shopMoney.amount,
});

if (step === "create") {
  if (previous?.ids?.draftOrder) throw new Error("B11 already created a draft.");
  const input = {
    tags: [SPIKE_TAG, "spike-B11"],
    note: "CFS spike B11: stale checkout test. Not a real order.",
    acceptAutomaticDiscounts: false,
    allowDiscountCodesInCheckout: false,
    lineItems: [line("1089.98")],
  };
  const { draftOrderCreate: r } = write(
    `mutation($input: DraftOrderInput!) { draftOrderCreate(input: $input) {
      draftOrder { ${DRAFT_FIELDS} } userErrors { field message } } }`,
    { input },
  );
  if (r.userErrors.length) {
    console.log(JSON.stringify(r.userErrors, null, 2));
    process.exit(1);
  }
  const s = summary(r.draftOrder);
  saveResult("B11", { status: "Draft created", inputs: input, ids: { draftOrder: s.id, name: s.name, invoiceUrl: s.invoiceUrl }, created: s });
  console.log(JSON.stringify(s, null, 2));
} else if (step === "update") {
  if (!previous?.ids?.draftOrder) throw new Error("Create the draft first.");
  if (previous.updated) throw new Error("B11 draft already updated.");
  const { draftOrderUpdate: r } = write(
    `mutation($id: ID!, $input: DraftOrderInput!) { draftOrderUpdate(id: $id, input: $input) {
      draftOrder { ${DRAFT_FIELDS} } userErrors { field message } } }`,
    { id: previous.ids.draftOrder, input: { lineItems: [line("1179.97")] } },
  );
  if (r.userErrors.length) {
    console.log(JSON.stringify(r.userErrors, null, 2));
    process.exit(1);
  }
  const s = summary(r.draftOrder);
  saveResult("B11", { status: "Draft updated while checkout open", updated: s, updatedAt2: new Date().toISOString() });
  console.log(JSON.stringify(s, null, 2));
} else {
  throw new Error('Use "create" or "update".');
}

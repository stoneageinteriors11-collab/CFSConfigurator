// E5c: simultaneous clicks against the real database with a simulated Shopify, then at most
// one real draft on the dev store, tagged cfs-spike and deleted at the end.
// Baskets use an invalid shop name and are removed afterwards.
// Usage: node --env-file=.env spike/e5c-draft-check.js
import assert from "node:assert/strict";
import process from "node:process";
import { setTimeout as wait } from "node:timers/promises";
import { PrismaClient } from "@prisma/client";
import { addLine, newBasketToken } from "../app/basket/basket.server.js";
import { startCheckout } from "../app/checkout/start-checkout.server.js";
import { quoteSelection } from "../app/pricing/quote-request.server.js";
import { DRAFT_FIELDS, SPIKE_TAG, read, write } from "./lib.js";

const SHOP = "e5c-check.invalid";
const BED = "11067852980563";
const BED_VARIANT = "55773143433555";
const prisma = new PrismaClient();
const made = [];

async function simultaneousClicks() {
  const variantId = "gid://shopify/ProductVariant/333";
  const product = {
    id: "gid://shopify/Product/222", title: "T", handle: "t", status: "ACTIVE", publishedAt: "2026-01-01T00:00:00Z", featuredMedia: null,
    variants: { pageInfo: { hasNextPage: false }, nodes: [{ id: variantId, sku: "T", title: "T", price: "10.00", availableForSale: true, inventoryQuantity: 9, inventoryPolicy: "DENY", inventoryItem: { tracked: true } }] },
    modelCards: null, workflow: null, options: null,
  };
  let creates = 0;
  const graphql = async (query) => {
    let data = { product };
    if (query.includes("currencyCode")) data = { shop: { currencyCode: "GBP" } };
    if (query.includes("draftOrderCreate")) {
      creates += 1;
      await wait(700);
      data = { draftOrderCreate: { draftOrder: { id: `fake-${Date.now()}`, invoiceUrl: "https://fake.invalid/1" }, userErrors: [] } };
    }
    return { json: async () => ({ data }) };
  };
  const token = newBasketToken();
  const quote = { ok: true, variantId, sku: "T", display: {}, baseCents: 1000, lines: [], totalCents: 1000 };
  assert.ok((await addLine(prisma, { shop: SHOP, token }, { productId: "222", quote })).ok);

  const clicks = Array.from({ length: 8 }, () => startCheckout({ db: prisma, graphql, shop: SHOP, token }));
  const results = await Promise.all(clicks);
  const done = results.filter((r) => r.ok);
  const waiting = results.filter((r) => r.code === "checkout_in_progress");
  assert.equal(creates, 1, `drafts created: ${creates}`);
  assert.equal(done.length + waiting.length, 8, JSON.stringify(results.filter((r) => !r.ok)));
  assert.equal(new Set(done.map((r) => r.checkoutUrl)).size, 1);
  assert.ok(done.length >= 1);
  console.log(`pass: 8 simultaneous clicks made 1 draft (${done.length} got the link, ${waiting.length} told to retry)`);
  const after = await startCheckout({ db: prisma, graphql, shop: SHOP, token });
  assert.ok(after.ok);
  assert.equal(creates, 1);
  console.log("pass: a click afterwards gets the same link");
}

async function realDraft() {
  let creates = 0;
  const graphql = async (query, { variables } = {}) => {
    let data;
    if (query.includes("draftOrderCreate")) {
      creates += 1;
      if (creates > 1) throw new Error("second draft blocked by the test");
      data = write(query, { input: { ...variables.input, tags: [...variables.input.tags, SPIKE_TAG] } });
      if (data.draftOrderCreate.draftOrder) made.push(data.draftOrderCreate.draftOrder.id);
    } else {
      data = read(query, variables);
    }
    return { json: async () => ({ data }) };
  };

  const token = newBasketToken();
  const { quote, refusal } = await quoteSelection(graphql, { productId: BED, variantId: BED_VARIANT, choiceIds: ["17020886", "17020903"] });
  assert.ok(quote, JSON.stringify(refusal));
  assert.ok((await addLine(prisma, { shop: SHOP, token }, { productId: BED, quote })).ok);

  const first = await startCheckout({ db: prisma, graphql, shop: SHOP, token });
  assert.ok(first.ok, JSON.stringify(first));
  assert.equal(first.totalCents, 108998);
  assert.equal(creates, 1);
  console.log("pass: one real draft created");

  const { draftOrder: draft } = read(
    `query($id: ID!) { draftOrder(id: $id) { ${DRAFT_FIELDS} acceptAutomaticDiscounts allowDiscountCodesInCheckout customAttributes { key value } } }`,
    { id: made[0] },
  );
  const [line] = draft.lineItems.nodes;
  assert.equal(draft.invoiceUrl, first.checkoutUrl);
  assert.equal(draft.totalPriceSet.shopMoney.amount, "1089.98");
  assert.equal(line.originalUnitPriceSet.shopMoney.amount, "1089.98");
  assert.equal(line.variant.id, `gid://shopify/ProductVariant/${BED_VARIANT}`);
  assert.deepEqual(line.customAttributes.map((a) => [a.key, a.value]), [["Drawer", "with 2 Drawer"], ["Fabric", "Carlton Black"]]);
  assert.equal(draft.acceptAutomaticDiscounts, true);
  assert.equal(draft.allowDiscountCodesInCheckout, true);
  assert.deepEqual(draft.customAttributes, [{ key: "_cfs_attempt", value: first.attemptId }]);
  assert.ok(draft.tags.includes(`cfs-attempt-${first.attemptId}`.toLowerCase()) || draft.tags.includes(`cfs-attempt-${first.attemptId}`));
  console.log(`pass: ${draft.name} is £1,089.98 with its options, discounts allowed and the attempt ID`);

  const again = await startCheckout({ db: prisma, graphql, shop: SHOP, token });
  assert.equal(again.checkoutUrl, first.checkoutUrl);
  assert.equal(creates, 1);
  console.log("pass: a repeat click reused it");

  console.log("waiting 60 seconds for Shopify's search");
  await wait(60000);
  await prisma.checkoutAttempt.update({
    where: { id: first.attemptId },
    data: { status: "creating", draftOrderId: null, invoiceUrl: null, updatedAt: new Date(Date.now() - 120000) },
  });
  const recovered = await startCheckout({ db: prisma, graphql, shop: SHOP, token });
  assert.ok(recovered.ok, JSON.stringify(recovered));
  assert.equal(recovered.checkoutUrl, first.checkoutUrl);
  assert.equal(creates, 1);
  console.log("pass: after a simulated timeout the draft was found by its tag, not made again");
}

try {
  await simultaneousClicks();
  await realDraft();
} catch (error) {
  console.log(`FAILED: ${String(error.message).slice(0, 500)}`);
  process.exitCode = 1;
} finally {
  for (const id of made) {
    const { draftOrderDelete } = write(
      `mutation($input: DraftOrderDeleteInput!) { draftOrderDelete(input: $input) { deletedId userErrors { message } } }`,
      { input: { id } },
    );
    console.log(`draft deleted: ${draftOrderDelete.deletedId === id}`);
  }
  await prisma.checkoutAttempt.deleteMany({ where: { shop: SHOP } });
  const { count } = await prisma.basket.deleteMany({ where: { shop: SHOP } });
  const left = await prisma.checkoutAttempt.count();
  console.log(`test baskets removed: ${count}, attempts left in database: ${left}, baskets left: ${await prisma.basket.count()}`);
  await prisma.$disconnect();
}

// Turns a checked basket into one Shopify draft order checkout.
// Each basket version gets one attempt, saved before Shopify is called, and a repeat click
// gets the same checkout link. Shopify's @idempotent key did not prevent duplicates when
// tested, so the row lock below is what does.
import { getBasket } from "../basket/basket.server.js";
import { checkBasket } from "./check-basket.server.js";

// Shopify's draft search lags behind creation, so an unfinished attempt is only searched for after this long.
const SEARCH_AFTER_MS = 60000;
const TRANSACTION_LIMITS = { maxWait: 10000, timeout: 20000 };

const CURRENCY_QUERY = `#graphql
  query CfsShopCurrency { shop { currencyCode } }`;

const CREATE_DRAFT = `#graphql
  mutation CfsCreateCheckout($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder { id invoiceUrl }
      userErrors { field message }
    }
  }`;

const FIND_DRAFT = `#graphql
  query CfsFindAttemptDraft($query: String!) {
    draftOrders(first: 1, query: $query) { nodes { id invoiceUrl } }
  }`;

const attemptTag = (attemptId) => `cfs-attempt-${attemptId}`;

const toAmount = (cents) => `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;

async function shopify(graphql, query, variables) {
  const response = await graphql(query, { variables });
  const { data } = await response.json();
  if (!data) throw new Error("Shopify returned no data");
  return data;
}

/** The option notes shown on a configured line in Shopify, such as "Fabric: Carlton Caramel". */
export const lineAttributes = (selection) =>
  selection.map((choice) => ({ key: choice.group.replace(/^Select /, ""), value: choice.label }));

function draftLine(line, currencyCode) {
  // An ordinary product has no options, so it keeps Shopify's own price.
  if (line.selection.length === 0) return { variantId: line.variantId, quantity: line.quantity };
  return {
    variantId: line.variantId,
    quantity: line.quantity,
    priceOverride: { amount: toAmount(line.unitCents), currencyCode },
    customAttributes: lineAttributes(line.selection),
  };
}

export function draftInput(attemptId, lines, currencyCode) {
  return {
    tags: ["cfs-checkout", attemptTag(attemptId)],
    customAttributes: [{ key: "_cfs_attempt", value: attemptId }],
    acceptAutomaticDiscounts: true,
    allowDiscountCodesInCheckout: true,
    lineItems: lines.map((line) => draftLine(line, currencyCode)),
  };
}

async function createDraft(graphql, attemptId, lines) {
  const { shop } = await shopify(graphql, CURRENCY_QUERY);
  const { draftOrderCreate } = await shopify(graphql, CREATE_DRAFT, {
    input: draftInput(attemptId, lines, shop.currencyCode),
  });
  return draftOrderCreate;
}

async function findDraft(graphql, attemptId) {
  const { draftOrders } = await shopify(graphql, FIND_DRAFT, { query: `tag:${attemptTag(attemptId)}` });
  return draftOrders.nodes[0] ?? null;
}

const success = (attempt) => ({
  ok: true,
  attemptId: attempt.id,
  checkoutUrl: attempt.invoiceUrl,
  totalCents: attempt.totalCents,
});

// Runs with the attempt's row locked, so a second click waits here and then gets this checkout.
async function finishAttempt(tx, graphql, attempt, { isNew, lines }) {
  if (attempt.status === "ready") return success(attempt);

  let draft = null;
  if (attempt.status === "creating" && !isNew) {
    // An earlier request stopped without an answer, and Shopify may have made the draft.
    if (Date.now() - attempt.updatedAt.getTime() < SEARCH_AFTER_MS) return { ok: false, code: "checkout_in_progress" };
    draft = await findDraft(graphql, attempt.id);
  }

  if (!draft) {
    const created = await createDraft(graphql, attempt.id, lines);
    if (created.userErrors.length) {
      console.error("Checkout: Shopify refused the draft", attempt.id, JSON.stringify(created.userErrors));
      await tx.checkoutAttempt.update({ where: { id: attempt.id }, data: { status: "failed" } });
      return { ok: false, code: "checkout_refused" };
    }
    draft = created.draftOrder;
  }
  if (!draft?.id || !draft.invoiceUrl) throw new Error("Shopify returned no checkout link");

  return success(
    await tx.checkoutAttempt.update({
      where: { id: attempt.id },
      data: { status: "ready", draftOrderId: draft.id, invoiceUrl: draft.invoiceUrl },
    }),
  );
}

/**
 * Returns { ok: true, attemptId, checkoutUrl, totalCents } or { ok: false, code } or,
 * when items need the shopper's attention, { ok: false, problems } from checkBasket.
 */
export async function startCheckout({ db, graphql, shop, token }) {
  const basket = await getBasket(db, { shop, token });
  if (!basket) return { ok: false, code: "basket_not_found" };

  const checked = await checkBasket(graphql, basket);
  if (!checked.ok) return checked;

  const key = { basketId: basket.id, basketVersion: basket.version };
  const { count } = await db.checkoutAttempt.createMany({
    data: [{ shop, ...key, lines: checked.lines, totalCents: checked.totalCents }],
    skipDuplicates: true,
  });

  try {
    return await db.$transaction(async (tx) => {
      const { id } = await tx.checkoutAttempt.findUnique({
        where: { basketId_basketVersion: key },
        select: { id: true },
      });
      await tx.$queryRaw`SELECT id FROM "CheckoutAttempt" WHERE id = ${id} FOR UPDATE`;
      const attempt = await tx.checkoutAttempt.findUnique({ where: { id } });
      return finishAttempt(tx, graphql, attempt, { isNew: count === 1, lines: checked.lines });
    }, TRANSACTION_LIMITS);
  } catch (error) {
    // The attempt stays unfinished, so a later click looks for a draft before making another.
    console.error("Checkout: could not create the draft", basket.id, error?.message);
    return { ok: false, code: "unavailable" };
  }
}

// Turns a storefront basket request into a basket change. The body is not covered by Shopify's
// signature, so nothing in it is trusted: the token proves ownership and prices are worked out here.
import { quoteSelection } from "../pricing/quote-request.server.js";
import {
  addLine,
  getBasket,
  newBasketToken,
  removeLine,
  setLineQuantity,
  validQuantity,
} from "./basket.server.js";

const MAX_BODY_LENGTH = 4096;
const TOKEN = /^[\w-]{43}$/;
const LINE_ID = /^[0-9a-f-]{36}$/;
const NOT_FOUND = new Set(["basket_not_found", "line_not_found"]);

const refuse = (status, code) => ({ status, body: { ok: false, errors: [{ code }] } });
const matches = (pattern, value) => typeof value === "string" && pattern.test(value);
const numericId = (gid) => gid.split("/").pop();

function publicBasket(basket) {
  const lines = (basket?.lines ?? []).map((line) => ({
    id: line.id,
    productId: line.productId,
    variantId: numericId(line.variantId),
    sku: line.sku,
    quantity: line.quantity,
    baseCents: line.baseCents,
    unitCents: line.unitCents,
    selection: line.selection.map(({ choiceId, group, label, cents }) => ({ choiceId, group, label, cents })),
  }));
  return {
    version: basket?.version ?? 0,
    lines,
    totalCents: lines.reduce((sum, line) => sum + line.unitCents * line.quantity, 0),
  };
}

function changed(result, extra = {}) {
  if (!result.ok) return refuse(NOT_FOUND.has(result.code) ? 404 : 422, result.code);
  return { status: 200, body: { ok: true, ...extra, ...publicBasket(result.basket) } };
}

async function view(db, ref) {
  return { status: 200, body: { ok: true, ...publicBasket(await getBasket(db, ref)) } };
}

async function add(db, graphql, shop, request) {
  const { token, product: productId, variant: variantId, choices: choiceIds, quantity = 1 } = request;
  if (token !== undefined && !matches(TOKEN, token)) return refuse(400, "bad_request");
  if (!validQuantity(quantity)) return refuse(422, "invalid_quantity");

  const { quote, refusal } = await quoteSelection(graphql, { productId, variantId, choiceIds });
  if (refusal) return refusal;

  const issued = token === undefined ? newBasketToken() : undefined;
  const result = await addLine(db, { shop, token: token ?? issued }, { productId, quote, quantity });
  return changed(result, issued ? { token: issued } : {});
}

async function changeQuantity(db, graphql, ref, { line: lineId, quantity }) {
  if (!matches(LINE_ID, lineId)) return refuse(400, "bad_request");
  if (!validQuantity(quantity)) return refuse(422, "invalid_quantity");

  const basket = await getBasket(db, ref);
  if (!basket) return refuse(404, "basket_not_found");
  const line = basket.lines.find((l) => l.id === lineId);
  if (!line) return refuse(404, "line_not_found");

  const { quote, refusal } = await quoteSelection(graphql, {
    productId: line.productId,
    variantId: numericId(line.variantId),
    choiceIds: line.selection.map((s) => s.choiceId),
  });
  if (refusal) return refusal;

  return changed(await setLineQuantity(db, ref, lineId, quantity, quote));
}

async function remove(db, ref, { line: lineId }) {
  if (!matches(LINE_ID, lineId)) return refuse(400, "bad_request");
  return changed(await removeLine(db, ref, lineId));
}

/** shop must come from the verified Shopify request; rawBody is the unverified JSON text. */
export async function handleBasketRequest({ db, graphql, shop, rawBody }) {
  if (rawBody.length > MAX_BODY_LENGTH) return refuse(400, "bad_request");

  let request;
  try {
    request = JSON.parse(rawBody);
  } catch {
    return refuse(400, "bad_request");
  }
  if (request === null || typeof request !== "object") return refuse(400, "bad_request");

  const { action, token } = request;
  if (action !== "add" && !matches(TOKEN, token)) return refuse(400, "bad_request");
  const ref = { shop, token };

  try {
    if (action === "view") return await view(db, ref);
    if (action === "add") return await add(db, graphql, shop, request);
    if (action === "set_quantity") return await changeQuantity(db, graphql, ref, request);
    if (action === "remove") return await remove(db, ref, request);
  } catch (error) {
    console.error("Basket: request failed", action, error?.code);
    return refuse(503, "unavailable");
  }
  return refuse(400, "bad_request");
}

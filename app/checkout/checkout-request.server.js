// Turns a storefront Checkout click into a checkout link. The body is not covered by Shopify's
// signature, so the only thing read from it is the token, which proves ownership of the basket.
import { TOKEN, publicBasket } from "../basket/basket-request.server.js";
import { getBasket, setLineQuantity } from "../basket/basket.server.js";
import { startCheckout } from "./start-checkout.server.js";

const MAX_BODY_LENGTH = 1024;
const STATUS = { basket_not_found: 404, empty_basket: 422, checkout_in_progress: 409, checkout_refused: 502 };

const refuse = (status, code) => ({ status, body: { ok: false, errors: [{ code }] } });

function readToken(rawBody) {
  if (rawBody.length > MAX_BODY_LENGTH) return null;
  try {
    const token = JSON.parse(rawBody)?.token;
    return typeof token === "string" && TOKEN.test(token) ? token : null;
  } catch {
    return null;
  }
}

// Saves new prices, so the shopper reviews the same amount the next Checkout click will charge.
async function saveNewPrices(db, ref, problems) {
  for (const { lineId, code, quantity, quote } of problems) {
    if (code === "price_changed") await setLineQuantity(db, ref, lineId, quantity, quote);
  }
}

const publicProblem = ({ lineId, code, available, previousUnitCents, unitCents }) => ({
  line: lineId,
  code,
  available,
  previousUnitCents,
  unitCents,
});

async function needsReview(db, ref, problems) {
  await saveNewPrices(db, ref, problems);
  return {
    status: 409,
    body: {
      ok: false,
      errors: [{ code: "review_basket" }],
      problems: problems.map(publicProblem),
      ...publicBasket(await getBasket(db, ref)),
    },
  };
}

/** shop must come from the verified Shopify request; rawBody is the unverified JSON text. */
export async function handleCheckoutRequest({ db, graphql, shop, rawBody }) {
  const token = readToken(rawBody);
  if (!token) return refuse(400, "bad_request");
  const ref = { shop, token };

  try {
    const result = await startCheckout({ db, graphql, ...ref });
    if (result.ok) {
      return { status: 200, body: { ok: true, checkoutUrl: result.checkoutUrl, totalCents: result.totalCents } };
    }
    if (result.problems) return await needsReview(db, ref, result.problems);
    return refuse(STATUS[result.code] ?? 503, result.code);
  } catch (error) {
    console.error("Checkout: request failed", error?.code);
    return refuse(503, "unavailable");
  }
}

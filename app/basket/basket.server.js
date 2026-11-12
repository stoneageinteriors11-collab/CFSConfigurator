// Saves shoppers' baskets. The shopper holds a secret token and only its hash is stored.
// Prices come only from a validated quote. Every change raises the basket version, and a
// refused change leaves the basket exactly as it was.
import { createHash, randomBytes } from "node:crypto";

export const MAX_LINE_QUANTITY = 99;
export const MAX_BASKET_LINES = 30;

const WITH_LINES = { lines: { orderBy: { createdAt: "asc" } } };

// Prisma's 5-second default includes time spent queueing behind other changes to the basket.
const TRANSACTION_LIMITS = { maxWait: 10000, timeout: 20000 };

class Refused extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

export const newBasketToken = () => randomBytes(32).toString("base64url");

export const hashToken = (token) => createHash("sha256").update(token).digest("hex");

/**
 * Identical copies of a configuration share this key; any different choice or accessory quantity
 * gives a new one. A choice taken once is written as before, so existing baskets keep their keys.
 */
export function configurationKey(quote) {
  const choices = quote.lines.map(({ choiceId, quantity = 1 }) => (quantity === 1 ? choiceId : `${choiceId}*${quantity}`));
  return `${quote.variantId}:${choices.sort().join(",")}`;
}

export const validQuantity = (quantity) =>
  Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_LINE_QUANTITY;

const pricedFields = (quote) => ({
  variantId: quote.variantId,
  sku: quote.sku,
  ...quote.display,
  baseCents: quote.baseCents,
  unitCents: quote.totalCents,
  selection: quote.lines,
});

// Raising the version first locks the basket row, so simultaneous changes run one at a time.
async function changeBasket(db, { shop, token }, change) {
  const tokenHash = hashToken(token);
  try {
    const basket = await db.$transaction(async (tx) => {
      const { count } = await tx.basket.updateMany({
        where: { shop, tokenHash },
        data: { version: { increment: 1 } },
      });
      if (count === 0) throw new Refused("basket_not_found");

      const owned = { shop, tokenHash };
      await change(tx, owned);
      return tx.basket.findUnique({
        where: { shop_tokenHash: owned },
        include: WITH_LINES,
      });
    }, TRANSACTION_LIMITS);
    return { ok: true, basket };
  } catch (error) {
    if (error instanceof Refused) return { ok: false, code: error.code };
    throw error;
  }
}

export async function getBasket(db, { shop, token }) {
  return db.basket.findUnique({
    where: { shop_tokenHash: { shop, tokenHash: hashToken(token) } },
    include: WITH_LINES,
  });
}

/** quote is a successful result from quoteConfiguration. Creates the basket if it is new. */
export async function addLine(db, { shop, token }, { productId, quote, quantity = 1 }) {
  if (!validQuantity(quantity)) return { ok: false, code: "invalid_quantity" };
  if (!quote?.ok) return { ok: false, code: "invalid_quote" };

  // Does nothing if the basket already exists, so two first requests cannot collide.
  await db.basket.createMany({
    data: [{ shop, tokenHash: hashToken(token) }],
    skipDuplicates: true,
  });

  const key = configurationKey(quote);
  const priced = { productId, ...pricedFields(quote) };

  return changeBasket(db, { shop, token }, async (tx, owned) => {
    const { id: basketId } = await tx.basket.findUnique({
      where: { shop_tokenHash: owned },
      select: { id: true },
    });
    const where = { basketId_configurationKey: { basketId, configurationKey: key } };
    const existing = await tx.basketLine.findUnique({ where, select: { quantity: true } });

    if (!existing) {
      const lineCount = await tx.basketLine.count({ where: { basketId } });
      if (lineCount >= MAX_BASKET_LINES) throw new Refused("basket_full");
      await tx.basketLine.create({ data: { basketId, configurationKey: key, quantity, ...priced } });
      return;
    }
    const combined = existing.quantity + quantity;
    if (combined > MAX_LINE_QUANTITY) throw new Refused("invalid_quantity");
    await tx.basketLine.update({ where, data: { quantity: combined, ...priced } });
  });
}

/** quote is a fresh validated quote for this line, so a quantity change also updates its price. */
export async function setLineQuantity(db, ref, lineId, quantity, quote) {
  if (!validQuantity(quantity)) return { ok: false, code: "invalid_quantity" };
  if (!quote?.ok) return { ok: false, code: "invalid_quote" };

  return changeBasket(db, ref, async (tx, owned) => {
    const { count } = await tx.basketLine.updateMany({
      where: { id: lineId, basket: owned },
      data: { quantity, ...pricedFields(quote) },
    });
    if (count === 0) throw new Refused("line_not_found");
  });
}

/**
 * After payment, takes the paid quantities out of the basket the checkout came from.
 * tx must be the transaction that saves the order record, so this runs exactly once per order.
 * Anything added after checkout started stays. Returns the number of lines changed.
 */
export async function removePaidLines(tx, attempt) {
  if (!attempt.basketId) return 0;
  // Raising the version locks the basket and tells any open checkout that the basket changed.
  const { count } = await tx.basket.updateMany({ where: { id: attempt.basketId }, data: { version: { increment: 1 } } });
  if (count === 0) return 0;

  let changed = 0;
  for (const paid of attempt.lines) {
    const where = { id: paid.lineId, basketId: attempt.basketId };
    const { count: removed } = await tx.basketLine.deleteMany({ where: { ...where, quantity: { lte: paid.quantity } } });
    const { count: reduced } = removed
      ? { count: 0 }
      : await tx.basketLine.updateMany({ where, data: { quantity: { decrement: paid.quantity } } });
    changed += removed + reduced;
  }
  return changed;
}

/**
 * Puts a newly quoted configuration in place of a line, keeping its quantity and place in the basket.
 * If the new configuration is already in the basket, the two lines join into one.
 */
export async function replaceLine(db, ref, lineId, quote) {
  if (!quote?.ok) return { ok: false, code: "invalid_quote" };
  const key = configurationKey(quote);

  return changeBasket(db, ref, async (tx, owned) => {
    const line = await tx.basketLine.findFirst({
      where: { id: lineId, basket: owned },
      select: { basketId: true, quantity: true },
    });
    if (!line) throw new Refused("line_not_found");

    const twin = await tx.basketLine.findUnique({
      where: { basketId_configurationKey: { basketId: line.basketId, configurationKey: key } },
      select: { id: true, quantity: true },
    });
    if (twin && twin.id !== lineId) {
      const combined = twin.quantity + line.quantity;
      if (combined > MAX_LINE_QUANTITY) throw new Refused("invalid_quantity");
      await tx.basketLine.update({ where: { id: twin.id }, data: { quantity: combined, ...pricedFields(quote) } });
      await tx.basketLine.delete({ where: { id: lineId } });
      return;
    }
    await tx.basketLine.update({ where: { id: lineId }, data: { configurationKey: key, ...pricedFields(quote) } });
  });
}

export async function removeLine(db, ref, lineId) {
  return changeBasket(db, ref, async (tx, owned) => {
    const { count } = await tx.basketLine.deleteMany({ where: { id: lineId, basket: owned } });
    if (count === 0) throw new Refused("line_not_found");
  });
}

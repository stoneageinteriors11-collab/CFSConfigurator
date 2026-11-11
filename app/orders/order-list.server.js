// Reads saved order records for the admin screens. Every read is limited to one shop.

export const PAGE_SIZE = 25;
const MAX_PAGE = 1000;

/** The page number in the address, or 1 if it is missing or not a sensible number. */
export function pageOf(url) {
  const page = Number(new URL(url).searchParams.get("page"));
  return Number.isSafeInteger(page) && page >= 1 && page <= MAX_PAGE ? page : 1;
}

/**
 * One page of a shop's orders, newest order first. Records are sorted by when the order was
 * placed, because an order recovered later is saved later.
 */
export async function listOrders(db, shop, page) {
  const offset = (page - 1) * PAGE_SIZE;
  const rows = await db.$queryRaw`
    SELECT
      "id",
      "orderName",
      "matchStatus",
      "financialStatus",
      "cancelledAt",
      "specification"->'order'->>'createdAt' AS "orderedAt",
      ("specification"->'order'->>'test')::boolean AS "test",
      "specification"->'order'->>'currency' AS "currency",
      ("specification"->'totals'->>'totalCents')::bigint AS "totalCents",
      (SELECT COALESCE(SUM((line->>'quantity')::int), 0) FROM jsonb_array_elements("specification"->'lines') AS line)::int AS "itemCount"
    FROM "OrderSnapshot"
    WHERE "shop" = ${shop}
    ORDER BY "orderedAt" DESC, "id" DESC
    LIMIT ${PAGE_SIZE + 1} OFFSET ${offset}`;
  return {
    orders: rows.slice(0, PAGE_SIZE).map((row) => ({ ...row, totalCents: Number(row.totalCents) })),
    page,
    hasNextPage: rows.length > PAGE_SIZE,
    hasPreviousPage: page > 1,
  };
}

/** One saved order, or null if this shop has no such record. */
export function getOrder(db, shop, id) {
  return db.orderSnapshot.findFirst({
    where: { id, shop },
    select: {
      id: true,
      orderId: true,
      orderName: true,
      matchStatus: true,
      financialStatus: true,
      cancelledAt: true,
      createdAt: true,
      specification: true,
    },
  });
}

// Writes one product's options to Shopify so the product is never half written: new entries are
// made beside the live ones, the product switches to them in one all-or-nothing step, and only
// then are the old entries removed. A failure before the switch leaves the product as it was.
import { checkProduct } from "../pricing/product-check.server.js";
import { loadConfigurableProduct } from "../pricing/load-product.server.js";
import {
  createEntries,
  deleteEntries,
  isListed,
  switchProduct,
} from "./shopify-writes.server.js";

const NOT_CONFIRMED =
  "Check this product: Shopify did not confirm the change";

const sameList = (a, b) => a.length === b.length && a.every((id, i) => id === b[i]);

/** The product's listed entry IDs as Shopify holds them now, or null if they cannot be read. */
async function listedNow(graphql, productId) {
  try {
    const product = await loadConfigurableProduct(graphql, productId);
    return product?.options?.map((o) => o.entryId) ?? null;
  } catch {
    return null;
  }
}

/**
 * product: the built product to write (options, workflow, modelCards). current: the product as
 * loaded before, whose entries are replaced. runId: this import's ID, which makes new entry names.
 * Returns { ok: true, ready, problems } once the product is switched (problems also notes any old
 * entries that could not be removed), or { ok: false, error } when it was not changed or, for an
 * unconfirmed change that could not be read back, when it must be checked by hand.
 */
export async function writeProduct({ graphql, product, current, runId, sleep }) {
  const productId = current.productId;

  const made = await createEntries(graphql, productId, product.options, runId, { sleep });
  if (made.error) {
    await deleteEntries(graphql, made.ids, { sleep });
    return { ok: false, error: `Not changed: ${made.error}` };
  }

  const switched = await switchProduct(graphql, productId, made.ids, product, { sleep });
  if (switched.error) {
    if (switched.uncertain) {
      const listed = await listedNow(graphql, productId);
      // Unknown: deleting either set could leave the product pointing at nothing.
      if (!listed) return { ok: false, error: NOT_CONFIRMED };
      // Applied after all: carry on as a success. Otherwise it is unchanged.
      if (!sameList(listed, made.ids)) {
        await deleteEntries(graphql, made.ids, { sleep });
        return { ok: false, error: `Not changed: ${switched.error}` };
      }
    } else {
      await deleteEntries(graphql, made.ids, { sleep });
      return { ok: false, error: `Not changed: ${switched.error}` };
    }
  }

  // The product now uses the new entries. Whatever happens next cannot undo that.
  let ready = false;
  let problems;
  try {
    const written = await loadConfigurableProduct(graphql, productId);
    ({ ready, problems } = written
      ? checkProduct(written)
      : { ready: false, problems: ["The product could not be read back to check it"] });
  } catch {
    problems = ["The product could not be read back to check it"];
  }

  const old = (current.options ?? []).map((o) => o.entryId).filter(Boolean);
  const removable = [];
  for (const id of old) {
    let listed = true; // when in doubt, keep it
    try {
      listed = await isListed(graphql, id, { sleep });
    } catch {
      // keep the entry
    }
    if (!listed) removable.push(id);
  }
  const { failed } = await deleteEntries(graphql, removable, { sleep });
  if (failed.length) {
    problems = [
      ...problems,
      `${failed.length} old option${failed.length === 1 ? "" : "s"} could not be removed`,
    ];
  }
  return { ok: true, ready, problems };
}

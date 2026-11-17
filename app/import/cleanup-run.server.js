// Removes the option entries a stopped import left behind: entries made for a product that never
// got switched to them, so nothing uses them. Entries are named after the run that made them.
import { deleteEntries, isListed, listEntries } from "./shopify-writes.server.js";
import { runView, writesAllowed } from "./import-run.server.js";

/**
 * Returns { error } or { deleted, kept, failed }. kept counts entries some product still uses.
 * Only a stopped run of this shop can be cleaned up, and only where importing is switched on.
 */
export async function cleanupRun({ db, graphql, shop, runId, sleep }) {
  if (!writesAllowed(shop)) return { error: "Importing is not switched on for this store" };
  const run = await db.importRun.findFirst({ where: { id: runId, shop } });
  if (!run) return { error: "That import was not found" };
  if (runView(run).status !== "stopped") {
    return { error: "Only an import that stopped part-way can be cleaned up" };
  }

  let entries;
  try {
    entries = await listEntries(graphql, { sleep });
  } catch {
    return { error: "Shopify could not be read just now; try again" };
  }
  const suffix = `-${run.id.slice(0, 8)}`;
  let kept = 0;
  const removable = [];
  for (const entry of entries) {
    if (!entry.handle?.endsWith(suffix)) continue;
    let listed = true; // when in doubt, keep it
    try {
      listed = await isListed(graphql, entry.id, { sleep });
    } catch {
      // keep the entry
    }
    if (listed) kept += 1;
    else removable.push(entry.id);
  }
  const { failed } = await deleteEntries(graphql, removable, { sleep });
  return { deleted: removable.length - failed.length, kept, failed: failed.length };
}

// Starts an option import from an uploaded sheet: checks the file again in full, then hands
// the writing to the background so the page can show progress.
import { beginRun, runPlans } from "./import-run.server.js";
import { prepareImport } from "./preview.server.js";

/**
 * runInBackground(work, runId) must call work(graphql) later, with a Shopify client that lasts beyond
 * this request. Returns { runId } or { errors }.
 */
export async function startImport({ db, graphql, shop, bytes, fileName, createdBy, createdByName, runInBackground }) {
  // The sheet is checked again now, not trusted from the preview: Shopify may have changed since.
  const { preview, plans } = await prepareImport(graphql, bytes);
  if (!preview.importable) {
    return { errors: ["The file no longer previews as ready to import; preview it again"] };
  }
  if (!plans.length) return { errors: ["Nothing to import: the sheet matches the store"] };

  const started = await beginRun({
    db,
    shop,
    kind: "import",
    createdBy,
    createdByName,
    fileName,
    planned: plans.map((p) => ({ cfsProductId: p.cfsProductId, title: p.title })),
  });
  if (started.error) return { errors: [started.error] };

  runInBackground(
    (backgroundGraphql) => runPlans({ db, graphql: backgroundGraphql, run: started.run, plans }),
    started.run.id,
  );
  return { runId: started.run.id };
}

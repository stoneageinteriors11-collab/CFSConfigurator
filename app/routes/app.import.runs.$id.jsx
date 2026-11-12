// One import or restore run, as JSON, for the progress shown on the Options import page.
import db from "../db.server";
import { authenticate } from "../shopify.server";
import { runView } from "../import/import-run.server.js";

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  // Only this shop's own runs
  const run = await db.importRun.findFirst({ where: { id: params.id, shop: session.shop } });
  if (!run) return Response.json({ error: "Run not found" }, { status: 404 });
  const { id, kind, status, total, results } = runView(run);
  return Response.json({ id, kind, status, total, results });
};

// Runs option import work after the request has been answered, with a Shopify client that
// stays valid (and refreshes its own access) for as long as the work takes.
import db from "../db.server";
import { unauthenticated } from "../shopify.server";
import { stopRun } from "./import-run.server.js";

/**
 * Returns runInBackground(work, runId) for a shop; work is called with that shop's Shopify
 * graphql. If the work fails, the run is marked stopped so the page shows it and the shop is not
 * blocked from starting another run.
 */
export const backgroundRunnerFor = (shop) => (work, runId) => {
  unauthenticated
    .admin(shop)
    .then(({ admin }) => work(admin.graphql))
    .catch(async (error) => {
      console.error(`Option import for ${shop} failed`, error?.message);
      try {
        if (runId) await stopRun(db, runId);
      } catch (stopError) {
        console.error(`Could not mark run ${runId} stopped`, stopError?.message);
      }
    });
};

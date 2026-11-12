// Runs option import work after the request has been answered, with a Shopify client that
// stays valid (and refreshes its own access) for as long as the work takes.
import { unauthenticated } from "../shopify.server";

/** Returns runInBackground(work) for a shop; work is called with that shop's Shopify graphql. */
export const backgroundRunnerFor = (shop) => (work) => {
  unauthenticated
    .admin(shop)
    .then(({ admin }) => work(admin.graphql))
    .catch((error) => console.error(`Option import for ${shop} failed`, error?.message));
};

import { graphqlForShop, staffReply, unknownShop } from "../staff-api/admin.server";
import { staffChoices } from "../staff-api/choices.server";
import { staffGuard } from "../staff-api/guard.server";

// Signed, server-to-server: a product's groups, choices and accessory limit for the staff option picker.
export const loader = async ({ request }) => {
  const { shop } = await staffGuard(request);
  const graphql = await graphqlForShop(shop);
  if (!graphql) return unknownShop();
  const { status, body } = await staffChoices(graphql, new URL(request.url).searchParams);
  return staffReply(status, body);
};

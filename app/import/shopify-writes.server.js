// The Shopify calls an option import makes to write: create option entries, switch a product to
// them, check whether an entry is still in use, and delete entries. Each call is small; the
// order they are used in, and what to do when one fails, is in write-product.server.js.

const ENTRY_TYPE = "cfs_import_option";
const RETRY_WAITS_MS = [1000, 2000, 4000, 8000];

export const CREATE_ENTRY_MUTATION = `#graphql
  mutation CfsCreateEntry($metaobject: MetaobjectCreateInput!) {
    metaobjectCreate(metaobject: $metaobject) {
      metaobject { id }
      userErrors { field message code }
    }
  }`;

export const ENTRY_BY_HANDLE_QUERY = `#graphql
  query CfsEntryByHandle($handle: MetaobjectHandleInput!) {
    metaobjectByHandle(handle: $handle) { id }
  }`;

export const SWITCH_PRODUCT_MUTATION = `#graphql
  mutation CfsSwitchProduct($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { key }
      userErrors { field message code }
    }
  }`;

export const ENTRY_LISTED_QUERY = `#graphql
  query CfsEntryListed($id: ID!) {
    metaobject(id: $id) {
      referencedBy(first: 1) { nodes { referencer { ... on Product { id } } } }
    }
  }`;

export const DELETE_ENTRY_MUTATION = `#graphql
  mutation CfsDeleteEntry($id: ID!) {
    metaobjectDelete(id: $id) {
      deletedId
      userErrors { field message code }
    }
  }`;

const realSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const messagesOf = (errors) => errors.map((e) => e.message).join("; ");

/**
 * Runs one GraphQL call and returns its data. Shopify asking the app to slow down (THROTTLED),
 * whether returned or thrown, is retried after 1, 2, 4 and 8 seconds. Every other error is
 * thrown at once with Shopify's message, because the call may or may not have happened.
 */
export async function callShopify(graphql, query, variables, { sleep = realSleep } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    let failure;
    try {
      const response = await graphql(query, { variables });
      const { data, errors } = await response.json();
      if (!errors?.length) return data;
      failure = new Error(messagesOf(errors));
      failure.throttled = /throttled/i.test(JSON.stringify(errors));
    } catch (error) {
      failure = error;
      failure.throttled ??= /throttled/i.test(String(error?.message));
    }
    if (!failure.throttled || attempt >= RETRY_WAITS_MS.length) throw failure;
    await sleep(RETRY_WAITS_MS[attempt]);
  }
}

/** cfs-{product number}-{choice ID}-{first 8 characters of the run ID}, in characters Shopify accepts. */
export function entryHandle(productId, cfsId, runId) {
  const number = productId.split("/").pop();
  const choice = cfsId.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return `cfs-${number}-${choice}-${runId.slice(0, 8)}`;
}

function fieldsFor(option) {
  const fields = [
    { key: "cfs_id", value: option.cfsId },
    { key: "label", value: option.label },
    { key: "group_name", value: option.groupName },
    { key: "source_mappings", value: JSON.stringify(option.mappings) },
  ];
  if (option.imageUrl) fields.push({ key: "image_url", value: option.imageUrl });
  if (option.optionCode) fields.push({ key: "option_code", value: option.optionCode });
  return fields;
}

/**
 * Creates one new entry per option, one at a time, in order. Stops at the first problem.
 * Returns { ids } or { ids, error }; ids always lists every entry that now exists, so the
 * caller can delete them if the product is not switched. An entry whose create answer was lost
 * is looked up by its handle so it is not left behind.
 */
export async function createEntries(graphql, productId, options, runId, { sleep } = {}) {
  const ids = [];
  for (const option of options) {
    const handle = entryHandle(productId, option.cfsId, runId);
    try {
      const data = await callShopify(
        graphql,
        CREATE_ENTRY_MUTATION,
        { metaobject: { type: ENTRY_TYPE, handle, fields: fieldsFor(option) } },
        { sleep },
      );
      const { metaobject, userErrors } = data.metaobjectCreate;
      if (userErrors.length) {
        return { ids, error: `Shopify refused "${option.label}": ${messagesOf(userErrors)}` };
      }
      ids.push(metaobject.id);
    } catch (error) {
      try {
        const found = await callShopify(
          graphql,
          ENTRY_BY_HANDLE_QUERY,
          { handle: { type: ENTRY_TYPE, handle } },
          { sleep },
        );
        if (found.metaobjectByHandle?.id) ids.push(found.metaobjectByHandle.id);
      } catch {
        // Nothing more can be done; an unused entry is harmless.
      }
      return { ids, error: `Shopify could not create "${option.label}": ${error.message}` };
    }
  }
  return { ids };
}

/**
 * Sets the product's options list, workflow and model cards in one all-or-nothing call.
 * Returns {} on success; { error } when Shopify refused (nothing changed); or
 * { error, uncertain: true } when Shopify's answer was never seen, so the product must be
 * read back before anything is deleted.
 */
export async function switchProduct(graphql, productId, entryIds, product, { sleep } = {}) {
  const metafield = (key, type, value) => ({
    ownerId: productId,
    namespace: "cfs_import",
    key,
    type,
    value: JSON.stringify(value),
  });
  try {
    const data = await callShopify(
      graphql,
      SWITCH_PRODUCT_MUTATION,
      {
        metafields: [
          metafield("options", "list.metaobject_reference", entryIds),
          metafield("workflow", "json", product.workflow),
          metafield("model_cards", "json", product.modelCards),
        ],
      },
      { sleep },
    );
    const { userErrors } = data.metafieldsSet;
    if (userErrors.length) return { error: `Shopify refused the switch: ${messagesOf(userErrors)}` };
    return {};
  } catch (error) {
    return { error: `Shopify could not confirm the switch: ${error.message}`, uncertain: true };
  }
}

/** Whether any product still lists this entry. An entry Shopify no longer has is not listed. */
export async function isListed(graphql, entryId, { sleep } = {}) {
  const data = await callShopify(graphql, ENTRY_LISTED_QUERY, { id: entryId }, { sleep });
  return (data.metaobject?.referencedBy?.nodes?.length ?? 0) > 0;
}

/** Deletes each entry, carrying on past failures. Returns { failed: the IDs that could not be deleted }. */
export async function deleteEntries(graphql, ids, { sleep } = {}) {
  const failed = [];
  for (const id of ids) {
    try {
      const data = await callShopify(graphql, DELETE_ENTRY_MUTATION, { id }, { sleep });
      if (data.metaobjectDelete.userErrors.length) failed.push(id);
    } catch {
      failed.push(id);
    }
  }
  return { failed };
}

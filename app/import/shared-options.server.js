// Checks a sheet's options against the options already live on other products, so one option
// code cannot drift apart between products. Read only.

export const LIVE_OPTIONS_QUERY = `#graphql
  query CfsSharedOptions($query: String!, $after: String) {
    metaobjects(type: "cfs_import_option", first: 250, query: $query, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        label: field(key: "label") { value }
        imageUrl: field(key: "image_url") { value }
        mappings: field(key: "source_mappings") { value }
        optionCode: field(key: "option_code") { value }
        referencedBy(first: 10) {
          nodes { referencer { ... on Product { id title } } }
        }
      }
    }
  }`;

const UNREADABLE =
  "Shopify could not be asked about shared options just now; try again";

const quoted = (text) => text.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
const numberOf = (gid) => gid.split("/").pop();
const sameText = (a, b) => (a ?? "") === (b ?? "");
const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

function detailsOf(mappings) {
  try {
    return JSON.parse(mappings ?? "{}")?.dimensions ?? "";
  } catch {
    return "";
  }
}

const ATTEMPTS = 3;
const realSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** One page of a search. Reading is safe to repeat, so a failed read is tried again, twice at most. */
async function readPage(graphql, variables, sleep) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await graphql(LIVE_OPTIONS_QUERY, { variables });
      const { data } = await response.json();
      if (data?.metaobjects) return data.metaobjects;
      throw new Error(UNREADABLE);
    } catch (error) {
      if (attempt >= ATTEMPTS) throw error;
      await sleep(500 * attempt);
    }
  }
}

/** Every live entry matching a Shopify search, across all pages. Throws if Shopify's answer is unusable. */
async function search(graphql, query, cache, sleep) {
  if (cache.has(query)) return cache.get(query);
  const entries = [];
  let after = null;
  for (;;) {
    const page = await readPage(graphql, { query, after }, sleep);
    for (const node of page.nodes) {
      entries.push({
        label: node.label?.value ?? "",
        imageUrl: node.imageUrl?.value ?? "",
        details: detailsOf(node.mappings?.value),
        code: node.optionCode?.value ?? "",
        products: (node.referencedBy?.nodes ?? [])
          .map((n) => n.referencer)
          .filter((p) => p?.id),
      });
    }
    if (!page.pageInfo.hasNextPage) break;
    after = page.pageInfo.endCursor;
  }
  cache.set(query, entries);
  return entries;
}

const productList = (products) =>
  products.map((p) => `${p.title} (${numberOf(p.id)})`).join(", ");

/** The products in `entries` that are not in the sheet, each once, in the order met. */
function outside(entries, except) {
  const seen = new Map();
  for (const entry of entries)
    for (const p of entry.products)
      if (!except.has(p.id) && !seen.has(p.id)) seen.set(p.id, p);
  return [...seen.values()];
}

/**
 * options: one product's built options. exceptProductIds: the Shopify products in the sheet (and
 * any product being restored), whose entries are about to be replaced. cache: an optional Map
 * shared between calls so each search is made once. Returns { errors, warnings } as plain text.
 */
export async function checkSharedOptions(
  graphql,
  options,
  { exceptProductIds = [], cache = new Map(), sleep = realSleep } = {},
) {
  const except = new Set(exceptProductIds);
  const errors = [];
  const warnings = new Set();
  try {
    for (const option of options) {
      const code = option.optionCode || "";
      const details = option.mappings?.dimensions ?? "";

      if (code) {
        const live = (
          await search(graphql, `fields.option_code:${code}`, cache, sleep)
        ).filter((e) => e.code === code && outside([e], except).length);
        const differing = live.filter(
          (e) =>
            e.label !== option.label ||
            !sameText(e.imageUrl, option.imageUrl) ||
            !sameText(e.details, details),
        );
        if (differing.length) {
          const aspects = [
            ["name", differing.some((e) => e.label !== option.label)],
            [
              "image",
              differing.some((e) => !sameText(e.imageUrl, option.imageUrl)),
            ],
            ["details", differing.some((e) => !sameText(e.details, details))],
          ]
            .filter(([, differs]) => differs)
            .map(([name]) => name);
          const listed = aspects.length > 1
            ? `${aspects.slice(0, -1).join(", ")} and ${aspects.at(-1)}`
            : aspects[0];
          errors.push(
            `Option code ${code} is "${differing[0].label}" on ${productList(outside(differing, except))}; this sheet gives it a different ${listed}. Add those products to the sheet to change it everywhere`,
          );
        }
      }

      const sameNamed = (
        await search(graphql, `fields.label:"${quoted(option.label)}"`, cache, sleep)
      ).filter(
        (e) =>
          e.code &&
          e.code !== code &&
          sameName(e.label, option.label) &&
          outside([e], except).length,
      );
      const codes = [...new Set(sameNamed.map((e) => e.code))];
      for (const other of codes) {
        const on = outside(
          sameNamed.filter((e) => e.code === other),
          except,
        );
        warnings.add(
          `"${option.label}" has the same name as option code ${other} on ${on.map((p) => p.title).join(", ")}; add the code if it is the same option`,
        );
      }
    }
  } catch {
    return { errors: [UNREADABLE], warnings: [] };
  }
  return { errors, warnings: [...warnings] };
}

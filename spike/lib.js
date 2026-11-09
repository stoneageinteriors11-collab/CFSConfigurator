// Shared helpers for the checkout risk tests. Throwaway: deleted before the real build.
import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const STORE = "urban-deco-dev.myshopify.com";
export const SPIKE_TAG = "cfs-spike";
export const NATURAL_GOLD_VARIANT = "gid://shopify/ProductVariant/55773143433555";

const RESULTS = join(dirname(fileURLToPath(import.meta.url)), "results.json");

function execute(query, variables, allowMutations) {
  const dir = mkdtempSync(join(tmpdir(), "cfs-spike-"));
  try {
    const q = join(dir, "q.graphql");
    const v = join(dir, "v.json");
    const out = join(dir, "out.json");
    writeFileSync(q, query);
    writeFileSync(v, JSON.stringify(variables));
    const flag = allowMutations ? " --allow-mutations" : "";
    execSync(
      `shopify store execute --store ${STORE} --version 2026-10 --query-file "${q}" --variable-file "${v}" --output-file "${out}"${flag}`,
      { stdio: "pipe" },
    );
    return JSON.parse(readFileSync(out, "utf8"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export const read = (query, variables = {}) => execute(query, variables, false);

/** Runs a mutation only after the connected store confirms it is the dev store. */
export function write(query, variables = {}) {
  const { shop } = read("query { shop { myshopifyDomain plan { partnerDevelopment } } }");
  if (shop.myshopifyDomain !== STORE || shop.plan.partnerDevelopment !== true) {
    throw new Error(`Refusing to write: connected to ${shop.myshopifyDomain}`);
  }
  return execute(query, variables, true);
}

export function loadResults() {
  return existsSync(RESULTS) ? JSON.parse(readFileSync(RESULTS, "utf8")) : {};
}

export function saveResult(id, result) {
  const results = loadResults();
  results[id] = { ...results[id], ...result, updatedAt: new Date().toISOString() };
  writeFileSync(RESULTS, `${JSON.stringify(results, null, 2)}\n`);
}

export const variantPrice = (id) =>
  read("query($id: ID!) { productVariant(id: $id) { price inventoryQuantity } }", { id }).productVariant;

export const DRAFT_FIELDS = `id name status invoiceUrl taxesIncluded tags
  subtotalPriceSet { shopMoney { amount currencyCode } }
  totalDiscountsSet { shopMoney { amount currencyCode } }
  totalTaxSet { shopMoney { amount currencyCode } }
  totalPriceSet { shopMoney { amount currencyCode } }
  lineItems(first: 5) { nodes { title sku quantity variant { id }
    originalUnitPriceSet { shopMoney { amount } }
    discountedTotalSet { shopMoney { amount } }
    customAttributes { key value } } }`;

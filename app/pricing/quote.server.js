// Validates a shopper's selection and works out the price before discounts, in whole pennies.
// Independent of Shopify and the theme. Anything it cannot match exactly is refused.
// Only Natural Gold's product type is supported so far; other types are refused.

export const SUPPORTED_MODE = "multipleDropDownWithMapping";

function toPennies(value) {
  if (typeof value !== "string" || !/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const [pounds, pence = ""] = value.split(".");
  return Number(pounds) * 100 + Number(pence.padEnd(2, "0"));
}

/** Finds a choice's price for this model. Returns "incompatible", "invalid" or the assignment. */
export function resolveAssignment(option, modelId) {
  const assignments = option.mappings?.assignments;
  if (!Array.isArray(assignments)) return "invalid";

  const forModel = assignments.filter((a) => a.parent === modelId);
  const matches = forModel.length ? forModel : assignments.filter((a) => a.parent === "0");
  if (matches.length === 0) return "incompatible";
  if (matches.length > 1 || matches[0].parent2 !== "0") return "invalid";

  const cents = toPennies(matches[0].raw_price);
  return cents === null ? "invalid" : { id: matches[0].id, cents };
}

/** What the basket shows for this item. */
const displayOf = (product, variant) => ({
  title: product.title ?? "",
  variantTitle: variant.title ?? "",
  handle: product.handle ?? "",
  imageUrl: product.imageUrl ?? null,
});

/** Prices a product with no configuration at its Shopify variant price. */
export function quoteOrdinaryProduct(product, { variantId, choiceIds }) {
  const fail = (code) => ({ ok: false, errors: [{ code }] });

  if (choiceIds.length > 0) return fail("choices_not_allowed");
  if (product.status !== "ACTIVE" || !product.publishedAt) return fail("product_unavailable");

  const variant = product.variants.find((v) => v.id === variantId);
  if (!variant) return fail("unknown_variant");
  if (!variant.availableForSale) return fail("variant_unavailable");

  const baseCents = toPennies(variant.price);
  if (baseCents === null) return fail("invalid_product_data");

  return {
    ok: true,
    variantId: variant.id,
    sku: variant.sku ?? "",
    display: displayOf(product, variant),
    baseCents,
    lines: [],
    totalCents: baseCents,
  };
}

export function quoteConfiguration(product, { variantId, choiceIds }) {
  const fail = (...errors) => ({ ok: false, errors });

  const { workflow } = product;
  if (workflow?.mode !== SUPPORTED_MODE) return fail({ code: "unsupported_product" });

  const variant = product.variants.find((v) => v.id === variantId);
  if (!variant) return fail({ code: "unknown_variant" });
  if (!(variant.inventoryQuantity > 0)) return fail({ code: "variant_unavailable" });

  const modelId = product.modelCards?.[variant.sku]?.source_id;
  const baseCents = toPennies(variant.price);
  if (!modelId || baseCents === null) return fail({ code: "invalid_product_data" });

  if (new Set(choiceIds).size !== choiceIds.length) return fail({ code: "duplicate_choice" });

  const groupNames = new Set(workflow.groups.map((g) => g.name));
  const errors = [];
  const picked = new Map();

  for (const choiceId of choiceIds) {
    const option = product.options.find((o) => o.cfsId === choiceId);
    if (!option) {
      errors.push({ code: "unknown_choice", choiceId });
      continue;
    }
    if (!groupNames.has(option.groupName) || !option.mappings) {
      errors.push({ code: "invalid_choice_data", choiceId });
      continue;
    }
    if (option.mappings.kind !== "option") {
      errors.push({ code: "unsupported_choice", choiceId });
      continue;
    }
    const assignment = resolveAssignment(option, modelId);
    if (assignment === "incompatible") {
      errors.push({ code: "incompatible_choice", choiceId });
    } else if (assignment === "invalid") {
      errors.push({ code: "invalid_choice_data", choiceId });
    } else if (picked.has(option.groupName)) {
      errors.push({ code: "too_many_in_group", group: option.groupName });
    } else {
      picked.set(option.groupName, { option, assignment });
    }
  }

  const lines = [];
  for (const group of workflow.groups) {
    const selected = picked.get(group.name);
    if (!selected) {
      const hasChoices = product.options.some(
        (o) => o.groupName === group.name && resolveAssignment(o, modelId) !== "incompatible",
      );
      if (!group.optional && hasChoices) errors.push({ code: "missing_required", group: group.name });
      continue;
    }
    if (group.requires && group.requires !== "$model" && !picked.has(group.requires)) {
      errors.push({ code: "prerequisite_missing", group: group.name, requires: group.requires });
    }
    lines.push({
      choiceId: selected.option.cfsId,
      assignmentId: selected.assignment.id,
      group: group.name,
      label: selected.option.label,
      cents: selected.assignment.cents,
    });
  }

  if (errors.length) return fail(...errors);

  return {
    ok: true,
    variantId: variant.id,
    sku: variant.sku,
    modelId,
    display: displayOf(product, variant),
    baseCents,
    lines,
    totalCents: lines.reduce((sum, line) => sum + line.cents, baseCents),
  };
}

/** Prices a product loaded by loadConfigurableProduct, whichever kind it is. */
export const priceProduct = (product, request) =>
  product.ordinary ? quoteOrdinaryProduct(product, request) : quoteConfiguration(product, request);

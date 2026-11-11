// Validates a shopper's selection and works out the price before discounts, in whole pennies.
// Independent of Shopify and the theme. Anything it cannot match exactly is refused.
// Products are priced by what their data contains, never by their CFS type name.
// A product whose data uses any rule or field the app does not understand is refused whole,
// so an unknown rule can never be silently ignored and sold at the wrong price.

// Every field the app understands. mode, model_label, ordered, filters and pricing are for
// display only: the shopper picks an exact size, and discounts come from Shopify.
const WORKFLOW_FIELDS = new Set(["mode", "model_label", "ordered", "filters", "groups", "pricing"]);
const GROUP_FIELDS = new Set(["name", "optional", "requires"]);
const CHOICE_KINDS = new Set(["option"]);
const MAPPING_FIELDS = new Set(["kind", "dimensions", "inside_color", "assignments"]);
const ASSIGNMENT_FIELDS = new Set(["id", "parent", "parent2", "raw_price"]);

const unknownField = (object, known) => Object.keys(object).find((key) => !known.has(key));

/** Why the app cannot price this product, or null when every rule in its data is one it understands. */
export function unsupportedReason(product) {
  const { workflow } = product;
  if (!workflow || typeof workflow !== "object" || !Array.isArray(workflow.groups)) {
    return "Its option setup (workflow) is missing or unreadable";
  }
  const field = unknownField(workflow, WORKFLOW_FIELDS);
  if (field) return `Its option setup has a setting the app does not know: "${field}"`;

  const earlier = new Set();
  for (const group of workflow.groups) {
    if (!group || typeof group !== "object" || typeof group.name !== "string" || !group.name) return "A group has no name";
    const rule = unknownField(group, GROUP_FIELDS);
    if (rule) return `Group "${group.name}" has a rule the app does not know: "${rule}"`;
    if (typeof group.optional !== "boolean") return `Group "${group.name}" does not say whether it is optional`;
    if (earlier.has(group.name)) return `Group "${group.name}" appears twice`;
    const requires = group.requires ?? "";
    if (requires !== "" && requires !== "$model" && !earlier.has(requires)) {
      return `Group "${group.name}" must come after "${requires}", which is not an earlier group`;
    }
    earlier.add(group.name);
  }

  // Unreadable choice data is refused when that choice is picked, and listed by the product check.
  for (const option of product.options ?? []) {
    const mappings = option.mappings;
    if (!mappings || typeof mappings !== "object") continue;
    if (!CHOICE_KINDS.has(mappings.kind)) return `Choice "${option.label}" is a kind the app does not price yet: "${mappings.kind}"`;
    const setting = unknownField(mappings, MAPPING_FIELDS);
    if (setting) return `Choice "${option.label}" has a setting the app does not know: "${setting}"`;
    for (const assignment of Array.isArray(mappings.assignments) ? mappings.assignments : []) {
      const extra = assignment && typeof assignment === "object" ? unknownField(assignment, ASSIGNMENT_FIELDS) : null;
      if (extra) return `Choice "${option.label}" has a price setting the app does not know: "${extra}"`;
    }
  }
  return null;
}

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

  if (unsupportedReason(product)) return fail({ code: "unsupported_product" });
  const { workflow } = product;

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

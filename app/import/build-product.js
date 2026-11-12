// Turns one product's checked spreadsheet rows into the option data the app already reads
// (the same shape as loadConfigurableProduct returns), checking it against the Shopify product.
import { createHash } from "node:crypto";
import { unsupportedReason } from "../pricing/quote.server.js";

const MAX_CHOICES = 1250;
const ANY_SIZE = "0";

/** The CFS size ID in a variant SKU like CFS-146477-17019159, UD-… or CFS-TYPE-…, or null. */
export function sizeIdOf(sku, cfsProductId) {
  const match = /^(?:CFS|UD|CFS-TYPE)-(\d+)-(\d+)$/.exec(sku ?? "");
  return match && match[1] === cfsProductId ? match[2] : null;
}

/** The CFS choice ID when given; otherwise one made from the product, group and name, the same every time. */
export function choiceIdFor(cfsProductId, group, label, cfsId) {
  if (cfsId) return cfsId;
  const hash = createHash("sha256").update(`${cfsProductId}\n${group}\n${label}`).digest("hex");
  return `imp-${hash.slice(0, 16)}`;
}

function checkGroups(cfsProductId, groups, choices, fail) {
  const byName = new Map(groups.map((g) => [g.name, g]));
  for (const group of groups) {
    if (!group.after) continue;
    const earlier = byName.get(group.after);
    if (!earlier) fail(group.row, `"Choose after" names "${group.after}", which is not a group of this product`);
    else if (earlier.order >= group.order) fail(group.row, '"Choose after" must name a group shown earlier (lower Display order)');
  }

  const addOns = groups.filter((g) => g.kind === "accessory");
  const odd = addOns.find((g) => g.maxQuantity !== addOns[0].maxQuantity);
  if (odd) fail(odd.row, 'All add-on groups of one product must have the same "Max quantity" for now');

  for (const group of groups) {
    if (!choices.some((c) => c.group === group.name)) fail(group.row, `Group "${group.name}" has no choices`);
  }
  return byName;
}

function checkChoices(cfsProductId, choices, byName, sizeIds, fail) {
  const seenIds = new Set();
  for (const choice of choices) {
    if (!byName.has(choice.group)) {
      fail(choice.row, `Group "${choice.group}" is not on the Groups sheet for product ${cfsProductId}`, "Choices");
    }
    for (const size of new Set([...choice.sizes, ...Object.keys(choice.sizePrices)])) {
      if (!sizeIds.includes(size)) fail(choice.row, `Size ${size} is not a size of this product in Shopify`, "Choices");
    }
    const id = choiceIdFor(cfsProductId, choice.group, choice.label, choice.cfsId);
    if (seenIds.has(id)) fail(choice.row, `CFS choice ID ${id} is used twice in product ${cfsProductId}`, "Choices");
    seenIds.add(id);
  }
}

function checkRequiredGroups(groups, choices, sizeIds, fail) {
  for (const group of groups) {
    if (!group.required) continue;
    const inGroup = choices.filter((c) => c.group === group.name);
    if (!inGroup.length) continue; // reported as a group with no choices
    for (const size of sizeIds) {
      if (!inGroup.some((c) => !c.sizes.length || c.sizes.includes(size))) {
        fail(group.row, `Required group "${group.name}" has no choice for size ${size}`);
      }
    }
  }
}

/** One price per size the choice is offered on. CFS's own reference for a size is kept when the product already has it. */
function assignmentsFor(choice, cfsId, existing) {
  const keptId = (parent) =>
    existing?.mappings?.assignments?.find((a) => a.parent === parent && a.parent2 === "0")?.id;
  const assignment = (parent, price, newId) => ({ id: keptId(parent) ?? newId, parent, parent2: "0", raw_price: price });

  if (!choice.sizes.length) {
    return [
      assignment(ANY_SIZE, choice.price, cfsId),
      ...Object.entries(choice.sizePrices).map(([size, price]) => assignment(size, price, `${cfsId}-${size}`)),
    ];
  }
  return choice.sizes.map((size) => assignment(size, choice.sizePrices[size] ?? choice.price, `${cfsId}-${size}`));
}

function workflowFor(kept, groups) {
  const sorted = [...groups].sort((a, b) => a.order - b.order);
  const addOn = groups.find((g) => g.kind === "accessory");
  const pricing = { ...(kept?.pricing ?? {}) };
  if (addOn) pricing.accessory_max_quantity = addOn.maxQuantity;

  const workflow = {};
  if (kept?.mode !== undefined) workflow.mode = kept.mode;
  workflow.model_label = kept?.model_label ?? "Size";
  workflow.ordered = groups.some((g) => g.after);
  workflow.filters = kept?.filters ?? [];
  workflow.groups = sorted.map((g) => ({ name: g.name, optional: !g.required, requires: g.after || "$model" }));
  if (Object.keys(pricing).length) workflow.pricing = pricing;
  return workflow;
}

/**
 * sheet: { cfsProductId, groups, choices } from checkRows. shopifyProduct: from loadConfigurableProduct.
 * Returns { product, errors }; product is null when there is any error.
 */
export function buildProduct({ cfsProductId, groups, choices }, shopifyProduct) {
  const errors = [];
  const fail = (row, message, sheet = "Groups") => errors.push({ sheet: row === null ? null : sheet, row, message });

  const sized = shopifyProduct.variants
    .map((variant) => ({ variant, sizeId: sizeIdOf(variant.sku, cfsProductId) }))
    .filter((v) => v.sizeId);
  if (!sized.length) {
    fail(null, `No Shopify size of this product has a SKU like CFS-${cfsProductId}-<size ID>`);
    return { product: null, errors };
  }
  const sizeIds = sized.map((v) => v.sizeId);

  if (choices.length > MAX_CHOICES) {
    fail(
      null,
      `Product ${cfsProductId} has ${choices.length.toLocaleString("en-GB")} choices; the most the app can read is ${MAX_CHOICES.toLocaleString("en-GB")}`,
    );
  }
  const byName = checkGroups(cfsProductId, groups, choices, fail);
  checkChoices(cfsProductId, choices, byName, sizeIds, fail);
  checkRequiredGroups(groups, choices, sizeIds, fail);
  if (errors.length) return { product: null, errors };

  const existingOptions = new Map((shopifyProduct.options ?? []).map((o) => [o.cfsId, o]));
  const options = choices.map((choice) => {
    const cfsId = choiceIdFor(cfsProductId, choice.group, choice.label, choice.cfsId);
    const existing = existingOptions.get(cfsId);
    const option = {
      cfsId,
      label: choice.label,
      groupName: choice.group,
      mappings: {
        kind: byName.get(choice.group).kind,
        dimensions: choice.details,
        // Not on the sheet: kept from the product's current data.
        inside_color: existing?.mappings?.inside_color ?? "",
        assignments: assignmentsFor(choice, cfsId, existing),
      },
      imageUrl: choice.imageUrl || null,
    };
    if (choice.optionCode) option.optionCode = choice.optionCode;
    return option;
  });

  const modelCards = {};
  for (const { variant, sizeId } of sized) {
    const kept = shopifyProduct.modelCards?.[variant.sku];
    modelCards[variant.sku] = { image: "", dimensions: "", height: "", width: "", ...kept, source_id: sizeId };
  }

  const rest = { ...shopifyProduct };
  for (const key of ["options", "modelCards", "workflow", "ordinary"]) delete rest[key];
  const product = { ...rest, modelCards, workflow: workflowFor(shopifyProduct.workflow, groups), options };

  const reason = unsupportedReason(product);
  if (reason) return { product: null, errors: [{ sheet: null, row: null, message: `Product ${cfsProductId}: ${reason}` }] };
  return { product, errors };
}

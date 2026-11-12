// Turns a product's current option data back into spreadsheet rows: the reverse of buildProduct.

function priceColumns(assignments) {
  const anySize = assignments.find((a) => a.parent === "0");
  if (anySize) {
    const sizePrices = {};
    for (const a of assignments) if (a !== anySize) sizePrices[a.parent] = a.raw_price;
    return { price: anySize.raw_price, sizes: [], sizePrices };
  }

  // Offered on listed sizes only: the most common price goes in Price, the rest in Size prices.
  const counts = new Map();
  for (const a of assignments) counts.set(a.raw_price, (counts.get(a.raw_price) ?? 0) + 1);
  let price = assignments[0]?.raw_price ?? "0";
  for (const [value, count] of counts) if (count > counts.get(price)) price = value;
  const sizePrices = {};
  for (const a of assignments) if (a.raw_price !== price) sizePrices[a.parent] = a.raw_price;
  return { price, sizes: assignments.map((a) => a.parent), sizePrices };
}

/** product: from loadConfigurableProduct. Returns { groups, choices } in checkRows' shapes, without row numbers. */
export function exportRows(cfsProductId, product) {
  const groups = product.workflow.groups.map((group, index) => {
    const kind = product.options.find((o) => o.groupName === group.name)?.mappings?.kind ?? "option";
    return {
      name: group.name,
      order: index + 1,
      required: !group.optional,
      after: group.requires && group.requires !== "$model" ? group.requires : "",
      kind,
      maxQuantity: kind === "accessory" ? product.workflow.pricing?.accessory_max_quantity ?? null : null,
    };
  });

  const choices = product.options.map((option) => ({
    group: option.groupName,
    label: option.label,
    ...priceColumns(option.mappings.assignments),
    cfsId: option.cfsId,
    optionCode: option.optionCode ?? "",
    imageUrl: option.imageUrl ?? "",
    details: option.mappings.dimensions ?? "",
  }));

  return { groups, choices };
}

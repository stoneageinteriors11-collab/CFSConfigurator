// Checks each spreadsheet row on its own and turns it into typed data.
// Checks that need the Shopify product (sizes, groups across sheets) are in build-product.js.

const PRICE = /^\d+(\.\d{1,2})?$/;
const WHOLE = /^\d+$/;
const PRICE_MESSAGE = '"Price (£)" must be pounds with up to two decimals, like 89.99';
const TYPES = { "choose one": "option", "add-on with quantity": "accessory" };

function rowChecker(sheet, raw, errors) {
  const problems = [];
  return {
    problems,
    fail: (message) => problems.push({ sheet, row: raw.row, message }),
    // The value of a column that must be filled, or null after reporting it empty.
    need(column) {
      const value = raw.values[column];
      if (value) return value;
      problems.push({ sheet, row: raw.row, message: `"${column}" is empty` });
      return null;
    },
    done(result) {
      errors.push(...problems);
      return problems.length ? null : result;
    },
  };
}

function productId(check) {
  const id = check.need("CFS product ID");
  if (id && !WHOLE.test(id)) check.fail('"CFS product ID" must be a number, like 146477');
  return id;
}

function checkGroup(raw, errors) {
  const check = rowChecker("Groups", raw, errors);
  const { values } = raw;
  const product = productId(check);
  const name = check.need("Group");

  const orderText = check.need("Display order");
  const order = Number(orderText);
  if (orderText && (!WHOLE.test(orderText) || order < 1)) check.fail('"Display order" must be a whole number from 1');

  const requiredText = check.need("Required");
  const required = requiredText?.toLowerCase();
  if (requiredText && required !== "yes" && required !== "no") check.fail('"Required" must be Yes or No');

  const typeText = check.need("Type");
  const kind = typeText ? TYPES[typeText.toLowerCase()] : undefined;
  if (typeText && !kind) check.fail('"Type" must be "Choose one" or "Add-on with quantity"');

  const maxText = values["Max quantity"];
  const max = Number(maxText);
  if (kind === "accessory" && (!WHOLE.test(maxText) || max < 1 || max > 99)) {
    check.fail('"Max quantity" must be a whole number from 1 to 99 for an add-on');
  }
  if (kind === "option" && maxText) check.fail('"Max quantity" is only for add-ons');

  return check.done({
    product,
    group: {
      row: raw.row,
      name,
      order,
      required: required === "yes",
      after: values["Choose after"],
      kind,
      maxQuantity: kind === "accessory" ? max : null,
    },
  });
}

function parseSizePrices(text, check) {
  const prices = {};
  for (const entry of text.split(";").map((part) => part.trim()).filter(Boolean)) {
    const match = /^(\d+)\s*=\s*(\d+(?:\.\d{1,2})?)$/.exec(entry);
    if (!match) {
      check.fail('"Size prices" must look like 17019161=99.99');
      return prices;
    }
    if (match[1] in prices) {
      check.fail(`Size ${match[1]} is priced twice in "Size prices"`);
      return prices;
    }
    prices[match[1]] = match[2];
  }
  return prices;
}

function checkChoice(raw, errors) {
  const check = rowChecker("Choices", raw, errors);
  const { values } = raw;
  const product = productId(check);
  const group = check.need("Group");
  const label = check.need("Choice");

  const price = check.need("Price (£)");
  if (price && !PRICE.test(price)) check.fail(PRICE_MESSAGE);

  const sizes = [...new Set(values.Sizes.split(";").map((part) => part.trim()).filter(Boolean))];
  if (sizes.some((size) => !WHOLE.test(size))) check.fail('"Sizes" must be CFS size IDs separated by ;');

  const sizePrices = parseSizePrices(values["Size prices"], check);
  if (sizes.length) {
    for (const size of Object.keys(sizePrices)) {
      if (!sizes.includes(size)) check.fail(`Size ${size} has a price but is not in "Sizes"`);
    }
  }

  const imageUrl = values["Image URL"];
  if (imageUrl && !/^https:\/\/\S+$/i.test(imageUrl)) {
    check.fail('"Image URL" must be a full address starting with https://');
  }

  const optionCode = values["Option code"].toUpperCase();
  if (optionCode && !/^[A-Z0-9-]+$/.test(optionCode)) {
    check.fail('"Option code" may only use letters, digits and hyphens, like FAB-CARLTON-BLACK');
  }

  return check.done({
    product,
    choice: {
      row: raw.row,
      group,
      label,
      price,
      sizes,
      sizePrices,
      cfsId: values["CFS choice ID"],
      optionCode,
      imageUrl,
      details: values.Details,
    },
  });
}

export function checkRows({ groups, choices }) {
  const errors = [];
  const products = new Map();
  const productFor = (id) => {
    if (!products.has(id)) products.set(id, { groups: [], choices: [] });
    return products.get(id);
  };

  for (const raw of groups) {
    const checked = checkGroup(raw, errors);
    if (!checked) continue;
    const { product, group } = checked;
    const existing = products.get(product)?.groups ?? [];
    if (existing.some((g) => g.name === group.name)) {
      errors.push({ sheet: "Groups", row: raw.row, message: `Group "${group.name}" is listed twice for product ${product}` });
    } else if (existing.some((g) => g.order === group.order)) {
      errors.push({ sheet: "Groups", row: raw.row, message: `Display order ${group.order} is used twice for product ${product}` });
    } else {
      productFor(product).groups.push(group);
    }
  }

  const firstWithCode = new Map();
  for (const raw of choices) {
    const checked = checkChoice(raw, errors);
    if (!checked) continue;
    const { product, choice } = checked;
    const existing = products.get(product)?.choices ?? [];
    const fail = (message) => errors.push({ sheet: "Choices", row: raw.row, message });

    if (existing.some((c) => c.group === choice.group && c.label === choice.label)) {
      fail(`"${choice.label}" is listed twice in "${choice.group}"`);
      continue;
    }
    if (choice.optionCode) {
      const code = choice.optionCode;
      if (existing.some((c) => c.optionCode === code)) {
        fail(`Option code ${code} is used twice in product ${product}`);
        continue;
      }
      const first = firstWithCode.get(code);
      if (!first) firstWithCode.set(code, choice);
      else if (first.label !== choice.label || first.imageUrl !== choice.imageUrl || first.details !== choice.details) {
        fail(
          `Option code ${code} is "${first.label}" on row ${first.row}; every row with this code must use the same Choice, Image URL and Details`,
        );
        continue;
      }
    }
    productFor(product).choices.push(choice);
  }

  return { products, errors };
}

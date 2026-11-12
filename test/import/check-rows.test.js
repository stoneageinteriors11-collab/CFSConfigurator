import assert from "node:assert/strict";
import { test } from "node:test";
import { checkRows } from "../../app/import/check-rows.js";

const GROUP = {
  "CFS product ID": "146477",
  Group: "Select Fabric",
  "Display order": "1",
  Required: "Yes",
  "Choose after": "",
  Type: "Choose one",
  "Max quantity": "",
};
const CHOICE = {
  "CFS product ID": "146477",
  Group: "Select Fabric",
  Choice: "Carlton Black",
  "Price (£)": "0",
  Sizes: "",
  "Size prices": "",
  "CFS choice ID": "",
  "Option code": "",
  "Image URL": "",
  Details: "",
};

let nextRow = 2;
const group = (values = {}) => ({ row: nextRow++, values: { ...GROUP, ...values } });
const choice = (values = {}) => ({ row: nextRow++, values: { ...CHOICE, ...values } });

// The one error message for a single bad Groups or Choices row.
function groupError(values) {
  const row = group(values);
  const { errors } = checkRows({ groups: [row], choices: [] });
  assert.equal(errors.length, 1, JSON.stringify(errors));
  assert.equal(errors[0].sheet, "Groups");
  assert.equal(errors[0].row, row.row);
  return errors[0].message;
}
function choiceError(values) {
  const row = choice(values);
  const { errors } = checkRows({ groups: [], choices: [row] });
  assert.equal(errors.length, 1, JSON.stringify(errors));
  assert.equal(errors[0].sheet, "Choices");
  assert.equal(errors[0].row, row.row);
  return errors[0].message;
}

test("types a good group and choice row", () => {
  const { products, errors } = checkRows({
    groups: [
      { row: 2, values: { ...GROUP, Required: "yes" } },
      {
        row: 3,
        values: { ...GROUP, Group: "Select Lights", "Display order": "2", Required: "no", "Choose after": "Select Fabric", Type: "add-on with quantity", "Max quantity": "5" },
      },
    ],
    choices: [
      {
        row: 2,
        values: {
          ...CHOICE,
          "Price (£)": "89.99",
          Sizes: "17019159; 17019160;17019161",
          "Size prices": "17019161=99.99;17019160 = 109.99",
          "CFS choice ID": "17020903",
          "Image URL": "https://images.example.co.uk/a.jpg",
          Details: "W 90cm<br>H 40cm",
        },
      },
    ],
  });
  assert.deepEqual(errors, []);
  const product = products.get("146477");
  assert.deepEqual(product.groups, [
    { row: 2, name: "Select Fabric", order: 1, required: true, after: "", kind: "option", maxQuantity: null },
    { row: 3, name: "Select Lights", order: 2, required: false, after: "Select Fabric", kind: "accessory", maxQuantity: 5 },
  ]);
  assert.deepEqual(product.choices, [
    {
      row: 2,
      group: "Select Fabric",
      label: "Carlton Black",
      price: "89.99",
      sizes: ["17019159", "17019160", "17019161"],
      sizePrices: { 17019161: "99.99", 17019160: "109.99" },
      cfsId: "17020903",
      optionCode: "",
      imageUrl: "https://images.example.co.uk/a.jpg",
      details: "W 90cm<br>H 40cm",
    },
  ]);
});

test("names the sheet, row and column of each bad value", () => {
  assert.equal(groupError({ Group: "" }), '"Group" is empty');
  assert.equal(choiceError({ "Price (£)": "" }), '"Price (£)" is empty');
  assert.equal(groupError({ "CFS product ID": "UD-146477" }), '"CFS product ID" must be a number, like 146477');
  assert.equal(choiceError({ "CFS product ID": "14 6477" }), '"CFS product ID" must be a number, like 146477');
  assert.equal(groupError({ Required: "maybe" }), '"Required" must be Yes or No');
  assert.equal(groupError({ Type: "Pick one" }), '"Type" must be "Choose one" or "Add-on with quantity"');
  for (const order of ["first", "0", "1.5"]) {
    assert.equal(groupError({ "Display order": order }), '"Display order" must be a whole number from 1');
  }
  for (const max of ["", "0", "100", "2.5"]) {
    assert.equal(
      groupError({ Type: "Add-on with quantity", "Max quantity": max }),
      '"Max quantity" must be a whole number from 1 to 99 for an add-on',
    );
  }
  assert.equal(groupError({ "Max quantity": "5" }), '"Max quantity" is only for add-ons');
  for (const price of ["-1", "1.999", "abc", "£5"]) {
    assert.equal(choiceError({ "Price (£)": price }), '"Price (£)" must be pounds with up to two decimals, like 89.99');
  }
  assert.equal(choiceError({ Sizes: "17019159; abc" }), '"Sizes" must be CFS size IDs separated by ;');
  assert.equal(choiceError({ "Size prices": "17019161:99" }), '"Size prices" must look like 17019161=99.99');
  assert.equal(choiceError({ "Size prices": "17019161=9.999" }), '"Size prices" must look like 17019161=99.99');
  assert.equal(
    choiceError({ "Size prices": "17019161=1;17019161=2" }),
    'Size 17019161 is priced twice in "Size prices"',
  );
  assert.equal(
    choiceError({ Sizes: "17019159", "Size prices": "17019161=99" }),
    'Size 17019161 has a price but is not in "Sizes"',
  );
  for (const url of ["http://x", "carlton-black.jpg"]) {
    assert.equal(choiceError({ "Image URL": url }), '"Image URL" must be a full address starting with https://');
  }
  assert.equal(
    choiceError({ "Option code": "FAB CARLTON" }),
    '"Option code" may only use letters, digits and hyphens, like FAB-CARLTON-BLACK',
  );
});

test("a row with several problems lists each one, and is left out", () => {
  const { products, errors } = checkRows({
    groups: [],
    choices: [{ row: 7, values: { ...CHOICE, Choice: "", "Price (£)": "abc" } }],
  });
  assert.deepEqual(
    errors.map((e) => e.message),
    ['"Choice" is empty', '"Price (£)" must be pounds with up to two decimals, like 89.99'],
  );
  assert.equal(products.size, 0);
});

test("refuses repeated groups and choices within a product", () => {
  const { products, errors } = checkRows({
    groups: [
      { row: 2, values: GROUP },
      { row: 3, values: { ...GROUP, "Display order": "2" } },
      { row: 4, values: { ...GROUP, Group: "Select Drawer" } },
    ],
    choices: [
      { row: 2, values: CHOICE },
      { row: 3, values: { ...CHOICE, "Price (£)": "5" } },
    ],
  });
  assert.deepEqual(errors, [
    { sheet: "Groups", row: 3, message: 'Group "Select Fabric" is listed twice for product 146477' },
    { sheet: "Groups", row: 4, message: "Display order 1 is used twice for product 146477" },
    { sheet: "Choices", row: 3, message: '"Carlton Black" is listed twice in "Select Fabric"' },
  ]);
  assert.equal(products.get("146477").groups.length, 1);
  assert.equal(products.get("146477").choices.length, 1);
});

test("the same group name in two products is fine", () => {
  const { products, errors } = checkRows({
    groups: [{ row: 2, values: GROUP }, { row: 3, values: { ...GROUP, "CFS product ID": "146506" } }],
    choices: [{ row: 2, values: CHOICE }, { row: 3, values: { ...CHOICE, "CFS product ID": "146506" } }],
  });
  assert.deepEqual(errors, []);
  assert.deepEqual([...products.keys()], ["146477", "146506"]);
});

test("shared option codes must agree", () => {
  const shared = { "Option code": "fab-carlton-black", "Image URL": "https://x.example/b.jpg", Details: "Soft" };
  const { products, errors } = checkRows({
    groups: [],
    choices: [
      { row: 2, values: { ...CHOICE, ...shared } },
      { row: 3, values: { ...CHOICE, ...shared, "CFS product ID": "146506", "Option code": "FAB-CARLTON-BLACK", "Price (£)": "20", Sizes: "1" } },
      { row: 4, values: { ...CHOICE, ...shared, "CFS product ID": "69733", Choice: "Carlton Mink" } },
      { row: 5, values: { ...CHOICE, ...shared, "CFS product ID": "69734", "Image URL": "https://x.example/c.jpg" } },
      { row: 6, values: { ...CHOICE, ...shared, "CFS product ID": "69735", Details: "Firm" } },
      { row: 7, values: { ...CHOICE, ...shared, Group: "Select Lining" } },
    ],
  });
  const disagree =
    'Option code FAB-CARLTON-BLACK is "Carlton Black" on row 2; every row with this code must use the same Choice, Image URL and Details';
  assert.deepEqual(errors, [
    { sheet: "Choices", row: 4, message: disagree },
    { sheet: "Choices", row: 5, message: disagree },
    { sheet: "Choices", row: 6, message: disagree },
    { sheet: "Choices", row: 7, message: "Option code FAB-CARLTON-BLACK is used twice in product 146477" },
  ]);
  assert.equal(products.get("146477").choices[0].optionCode, "FAB-CARLTON-BLACK");
  assert.equal(products.get("146506").choices[0].optionCode, "FAB-CARLTON-BLACK");
  assert.equal(products.has("69733"), false);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import ExcelJS from "exceljs";
import {
  CHOICE_COLUMNS,
  GROUP_COLUMNS,
  readWorkbook,
  sampleWorkbook,
} from "../../app/import/spreadsheet.server.js";

// Builds a workbook from { sheetName: [headerRow, ...rows] }; a row of null leaves a blank row.
async function workbook(sheets) {
  const book = new ExcelJS.Workbook();
  for (const [name, rows] of Object.entries(sheets)) {
    const sheet = book.addWorksheet(name);
    rows.forEach((row, index) => {
      if (row) sheet.getRow(index + 1).values = row;
    });
  }
  return Buffer.from(await book.xlsx.writeBuffer());
}

const choiceRow = (overrides = {}) =>
  CHOICE_COLUMNS.map((column) => overrides[column] ?? "");

test("reads both sheets into trimmed text rows with spreadsheet row numbers", async () => {
  const bytes = await workbook({
    Groups: [GROUP_COLUMNS, [146477, " Select Fabric ", 1, "Yes", "", "Choose one", ""]],
    Choices: [CHOICE_COLUMNS],
  });
  const { groups, choices, errors } = await readWorkbook(bytes);
  assert.deepEqual(errors, []);
  assert.equal(choices.length, 0);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].row, 2);
  assert.equal(groups[0].values["CFS product ID"], "146477");
  assert.equal(groups[0].values.Group, "Select Fabric");
  assert.equal(groups[0].values["Display order"], "1");
  assert.equal(groups[0].values["Choose after"], "");
});

test("reads numbers, formulas and rich text as the text a person sees", async () => {
  const bytes = await workbook({
    Groups: [GROUP_COLUMNS],
    Choices: [
      CHOICE_COLUMNS,
      choiceRow({ "Price (£)": 89.99000000000001 }),
      choiceRow({ "Price (£)": { formula: "100+79.99", result: 179.99 } }),
      choiceRow({ Choice: { richText: [{ text: "Carlton " }, { text: "Black" }] }, "Price (£)": 0 }),
    ],
  });
  const { choices, errors } = await readWorkbook(bytes);
  assert.deepEqual(errors, []);
  assert.equal(choices[0].values["Price (£)"], "89.99");
  assert.equal(choices[1].values["Price (£)"], "179.99");
  assert.equal(choices[2].values.Choice, "Carlton Black");
  assert.equal(choices[2].values["Price (£)"], "0");
});

test("skips blank rows and matches headers ignoring case and spaces", async () => {
  const header = CHOICE_COLUMNS.map((c) => (c === "Price (£)" ? " price (£) " : c));
  const bytes = await workbook({
    Groups: [GROUP_COLUMNS],
    Choices: [header, choiceRow({ Choice: "A", "Price (£)": 1 }), null, choiceRow({ Choice: "B", "Price (£)": 2 })],
  });
  const { choices, errors } = await readWorkbook(bytes);
  assert.deepEqual(errors, []);
  assert.equal(choices.length, 2);
  assert.equal(choices[0].values["Price (£)"], "1");
  assert.equal(choices[1].row, 4);
  assert.equal(choices[1].values.Choice, "B");
});

test("refuses a workbook without both sheets, or with a missing or unknown column", async () => {
  const noChoices = await readWorkbook(await workbook({ Groups: [GROUP_COLUMNS] }));
  assert.deepEqual(noChoices.errors, [{ sheet: null, row: null, message: 'The file has no "Choices" sheet' }]);

  const bad = await readWorkbook(
    await workbook({
      Groups: [GROUP_COLUMNS.filter((c) => c !== "Required")],
      Choices: [[...CHOICE_COLUMNS, "Colour"]],
    }),
  );
  assert.deepEqual(bad.errors, [
    { sheet: "Groups", row: 1, message: 'Missing column "Required"' },
    { sheet: "Choices", row: 1, message: 'Unknown column "Colour"' },
  ]);

  const extra = await readWorkbook(
    await workbook({ Groups: [GROUP_COLUMNS], Choices: [CHOICE_COLUMNS], Notes: [["hello"]] }),
  );
  assert.deepEqual(extra.errors, [
    { sheet: null, row: null, message: 'Unknown sheet "Notes"; only "Groups" and "Choices" are read' },
  ]);
});

test("refuses a file that is not an Excel workbook", async () => {
  const { errors } = await readWorkbook(Buffer.from("hello"));
  assert.equal(errors.length, 1);
  assert.equal(errors[0].message, "The file could not be read as an Excel (.xlsx) workbook");
});

test("the sample reads back without errors", async () => {
  const { groups, choices, errors } = await readWorkbook(await sampleWorkbook());
  assert.deepEqual(errors, []);
  assert.equal(groups.length, 3);
  assert.equal(choices.length, 4);
  assert.equal(choices[2].values["Option code"], "FAB-CARLTON-BLACK");
});

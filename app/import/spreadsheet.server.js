// Reads the option import workbook (.xlsx) into plain text rows, and builds the sample file.
// Nothing here knows what the values mean; check-rows.js does that.
import ExcelJS from "exceljs";

export const GROUP_COLUMNS = [
  "CFS product ID",
  "Group",
  "Display order",
  "Required",
  "Choose after",
  "Type",
  "Max quantity",
];

export const CHOICE_COLUMNS = [
  "CFS product ID",
  "Group",
  "Choice",
  "Price (£)",
  "Sizes",
  "Size prices",
  "CFS choice ID",
  "Option code",
  "Image URL",
  "Details",
];

const SHEETS = { Groups: GROUP_COLUMNS, Choices: CHOICE_COLUMNS };

const normalise = (text) => String(text).trim().replace(/\s+/g, " ").toLowerCase();

// The text a person sees in the cell. Numbers are rounded to 2 decimals so
// 89.99000000000001 reads as "89.99".
function cellText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number(value.toFixed(2)).toString();
  if (typeof value === "string") return value.trim();
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (Array.isArray(value.richText)) return value.richText.map((run) => run.text).join("").trim();
  if ("result" in value) return cellText(value.result);
  if ("text" in value) return cellText(value.text);
  return "";
}

function readSheet(sheet, name, columns, errors) {
  const wanted = new Map(columns.map((column) => [normalise(column), column]));
  const byIndex = new Map();
  const seen = new Set();
  sheet.getRow(1).eachCell((cell, index) => {
    const header = cellText(cell.value);
    if (!header) return;
    const column = wanted.get(normalise(header));
    if (!column) errors.push({ sheet: name, row: 1, message: `Unknown column "${header}"` });
    else if (seen.has(column)) errors.push({ sheet: name, row: 1, message: `Column "${column}" appears twice` });
    else {
      seen.add(column);
      byIndex.set(index, column);
    }
  });
  for (const column of columns) {
    if (!seen.has(column)) errors.push({ sheet: name, row: 1, message: `Missing column "${column}"` });
  }

  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = Object.fromEntries(columns.map((column) => [column, ""]));
    for (const [index, column] of byIndex) values[column] = cellText(row.getCell(index).value);
    if (Object.values(values).some((text) => text !== "")) rows.push({ row: rowNumber, values });
  });
  return rows;
}

export async function readWorkbook(bytes) {
  const book = new ExcelJS.Workbook();
  try {
    await book.xlsx.load(bytes);
  } catch {
    return {
      groups: [],
      choices: [],
      errors: [{ sheet: null, row: null, message: "The file could not be read as an Excel (.xlsx) workbook" }],
    };
  }

  const errors = [];
  const found = {};
  for (const sheet of book.worksheets) {
    const name = Object.keys(SHEETS).find((n) => normalise(n) === normalise(sheet.name));
    if (name) found[name] = sheet;
    else {
      errors.push({
        sheet: null,
        row: null,
        message: `Unknown sheet "${sheet.name}"; only "Groups" and "Choices" are read`,
      });
    }
  }

  const result = { groups: [], choices: [], errors };
  for (const [name, columns] of Object.entries(SHEETS)) {
    if (!found[name]) {
      errors.push({ sheet: null, row: null, message: `The file has no "${name}" sheet` });
      continue;
    }
    result[name === "Groups" ? "groups" : "choices"] = readSheet(found[name], name, columns, errors);
  }
  return result;
}

const SAMPLE_GROUPS = [
  ["146477", "Select Drawer", 1, "Yes", "", "Choose one", ""],
  ["146477", "Select Fabric", 2, "Yes", "Select Drawer", "Choose one", ""],
  ["69733", "Select Lightings", 1, "No", "", "Add-on with quantity", 5],
];

const SAMPLE_CHOICES = [
  ["146477", "Select Drawer", "with 2 Drawer", 89.99, "", "", "17020886", "", "", ""],
  ["146477", "Select Drawer", "with 4 Drawer", 179.99, "17019159; 17019160; 17019161; 17019162", "", "17020892", "", "", ""],
  [
    "146477",
    "Select Fabric",
    "Carlton Black",
    0,
    "",
    "",
    "17020903",
    "FAB-CARLTON-BLACK",
    "https://images.choicefurnituresuperstore.co.uk/images2/Bedrooms/Beds/carlton-black.jpg",
    "",
  ],
  ["69733", "Select Lightings", "102 : Lighting for Footboard", 209.99, "", "", "217067", "", "", ""],
];

export async function sampleWorkbook() {
  const book = new ExcelJS.Workbook();
  for (const [name, columns, rows] of [
    ["Groups", GROUP_COLUMNS, SAMPLE_GROUPS],
    ["Choices", CHOICE_COLUMNS, SAMPLE_CHOICES],
  ]) {
    const sheet = book.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.columns = columns.map((header) => ({ header, width: Math.max(14, header.length + 4) }));
    sheet.getRow(1).font = { bold: true };
    rows.forEach((row) => sheet.addRow(row));
  }
  return Buffer.from(await book.xlsx.writeBuffer());
}

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

const normalise = (text) =>
  String(text).trim().replace(/\s+/g, " ").toLowerCase();

/** A cell whose value cannot be trusted: an Excel error, or a formula Excel never calculated. */
class CellProblem extends Error {}

// The text a person sees in the cell. Float noise such as 89.99000000000001 reads as "89.99",
// but real extra decimals (89.999) are kept, so the price and ID checks refuse them.
function cellText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    const rounded = Number(value.toFixed(2));
    return String(Math.abs(value - rounded) < 1e-9 ? rounded : value);
  }
  if (typeof value === "string") return value.trim();
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (Array.isArray(value.richText))
    return value.richText
      .map((run) => run.text)
      .join("")
      .trim();
  if (value.error)
    throw new CellProblem(`shows the Excel error ${value.error}; fix the cell`);
  if ("formula" in value || "sharedFormula" in value) {
    if (value.result === undefined || value.result === null) {
      throw new CellProblem(
        "is a formula with no saved result; open the file in Excel and save it again",
      );
    }
    return cellText(value.result);
  }
  if ("result" in value) return cellText(value.result);
  if ("text" in value) return cellText(value.text);
  return "";
}

function readSheet(sheet, name, columns, errors) {
  const wanted = new Map(columns.map((column) => [normalise(column), column]));
  const byIndex = new Map();
  const seen = new Set();
  sheet.getRow(1).eachCell((cell, index) => {
    let header;
    try {
      header = cellText(cell.value);
    } catch {
      header = "";
    }
    if (!header) return;
    const column = wanted.get(normalise(header));
    if (!column)
      errors.push({
        sheet: name,
        row: 1,
        message: `Unknown column "${header}"`,
      });
    else if (seen.has(column))
      errors.push({
        sheet: name,
        row: 1,
        message: `Column "${column}" appears twice`,
      });
    else {
      seen.add(column);
      byIndex.set(index, column);
    }
  });
  for (const column of columns) {
    if (!seen.has(column))
      errors.push({
        sheet: name,
        row: 1,
        message: `Missing column "${column}"`,
      });
  }

  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = Object.fromEntries(columns.map((column) => [column, ""]));
    for (const [index, column] of byIndex) {
      try {
        values[column] = cellText(row.getCell(index).value);
      } catch (problem) {
        if (!(problem instanceof CellProblem)) throw problem;
        errors.push({
          sheet: name,
          row: rowNumber,
          message: `"${column}" ${problem.message}`,
        });
        values[column] = "#ERROR";
      }
    }
    if (Object.values(values).some((text) => text !== ""))
      rows.push({ row: rowNumber, values });
  });
  return rows;
}

const MAX_UNPACKED_BYTES = 50 * 1024 * 1024;

/**
 * The total unpacked size of the files in a zip (an .xlsx is a zip), read from its directory
 * without unpacking anything. Null when the directory cannot be read or uses the zip64 format.
 */
function unpackedSize(bytes) {
  const end = bytes.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0 || end + 22 > bytes.length) return null;
  const count = bytes.readUInt16LE(end + 10);
  let at = bytes.readUInt32LE(end + 16);
  let total = 0;
  for (let i = 0; i < count; i += 1) {
    if (at + 46 > bytes.length || bytes.readUInt32LE(at) !== 0x02014b50)
      return null;
    const size = bytes.readUInt32LE(at + 24);
    if (size === 0xffffffff) return null;
    total += size;
    at +=
      46 +
      bytes.readUInt16LE(at + 28) +
      bytes.readUInt16LE(at + 30) +
      bytes.readUInt16LE(at + 32);
  }
  return total;
}

export async function readWorkbook(bytes) {
  const unreadable = {
    groups: [],
    choices: [],
    errors: [
      {
        sheet: null,
        row: null,
        message: "The file could not be read as an Excel (.xlsx) workbook",
      },
    ],
  };
  const size = unpackedSize(bytes);
  if (size === null) return unreadable;
  if (size > MAX_UNPACKED_BYTES) {
    return {
      groups: [],
      choices: [],
      errors: [
        {
          sheet: null,
          row: null,
          message:
            "The file unpacks to more than 50 MB; split it into smaller files",
        },
      ],
    };
  }

  const book = new ExcelJS.Workbook();
  try {
    await book.xlsx.load(bytes);
  } catch {
    return unreadable;
  }

  const errors = [];
  const found = {};
  for (const sheet of book.worksheets) {
    const name = Object.keys(SHEETS).find(
      (n) => normalise(n) === normalise(sheet.name),
    );
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
      errors.push({
        sheet: null,
        row: null,
        message: `The file has no "${name}" sheet`,
      });
      continue;
    }
    result[name === "Groups" ? "groups" : "choices"] = readSheet(
      found[name],
      name,
      columns,
      errors,
    );
  }
  return result;
}

// Sample rows, in column order.
const SAMPLE_GROUPS = [
  ["146477", "Select Drawer", 1, "Yes", "", "Choose one", ""],
  ["146477", "Select Fabric", 2, "Yes", "Select Drawer", "Choose one", ""],
  ["69733", "Select Lightings", 1, "No", "", "Add-on with quantity", 5],
];

const SAMPLE_CHOICES = [
  [
    "146477",
    "Select Drawer",
    "with 2 Drawer",
    89.99,
    "",
    "",
    "17020886",
    "",
    "",
    "",
  ],
  [
    "146477",
    "Select Drawer",
    "with 4 Drawer",
    179.99,
    "17019159; 17019160; 17019161; 17019162",
    "",
    "17020892",
    "",
    "",
    "",
  ],
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
  [
    "69733",
    "Select Lightings",
    "102 : Lighting for Footboard",
    209.99,
    "",
    "",
    "217067",
    "",
    "",
    "",
  ],
];

const asValues = (columns, rows) =>
  rows.map((row) => Object.fromEntries(columns.map((c, i) => [c, row[i]])));

/** A workbook with both sheets. Each row is { columnName: value }; missing columns are left blank. */
export async function writeWorkbook(groups, choices) {
  const book = new ExcelJS.Workbook();
  for (const [name, columns, rows] of [
    ["Groups", GROUP_COLUMNS, groups],
    ["Choices", CHOICE_COLUMNS, choices],
  ]) {
    const sheet = book.addWorksheet(name, {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    sheet.columns = columns.map((header) => ({
      header,
      width: Math.max(14, header.length + 4),
    }));
    sheet.getRow(1).font = { bold: true };
    for (const row of rows)
      sheet.addRow(columns.map((column) => row[column] ?? ""));
  }
  return Buffer.from(await book.xlsx.writeBuffer());
}

export const sampleWorkbook = () =>
  writeWorkbook(
    asValues(GROUP_COLUMNS, SAMPLE_GROUPS),
    asValues(CHOICE_COLUMNS, SAMPLE_CHOICES),
  );

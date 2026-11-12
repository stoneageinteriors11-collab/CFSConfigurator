# Option importer, stage 1 (read-only preview) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Staff can download a sample spreadsheet, upload a filled one, and see a preview of every product's groups, choices and per-size prices with all problems listed by sheet and row. Nothing is written to Shopify.

**Architecture:** A pure pipeline in `app/import/`: read the workbook into raw rows, check and type each row, then build each product's option data in exactly the shape `loadConfigurableProduct` returns, using the real Shopify variants. The built product is run through the existing `checkProduct`, so the preview says what the shop would say. One admin route shows the upload form and preview, one resource route serves the sample file. Stage 2 (download current options) and stage 3 (write and restore) get their own plans.

**Tech Stack:** React Router 7 admin routes with Polaris web components (`s-page`, `s-section`, `s-table`), `exceljs` 4.4.0 for `.xlsx`, `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-12-option-importer-design.md`

## Global Constraints

- JavaScript/JSX only. Tests run with `npm test` (`node --test "test/**/*.test.js"`); all existing tests must keep passing.
- Read only in this stage: no Admin API mutation anywhere in `app/import/`.
- Sheet names exactly `Groups` and `Choices`. Columns exactly: Groups: `CFS product ID`, `Group`, `Display order`, `Required`, `Choose after`, `Type`, `Max quantity`. Choices: `CFS product ID`, `Group`, `Choice`, `Price (£)`, `Sizes`, `Size prices`, `CFS choice ID`, `Option code`, `Image URL`, `Details`. Column order does not matter; header matching ignores surrounding spaces and case.
- `Required`: `Yes` or `No`. `Type`: `Choose one` or `Add-on with quantity`.
- Prices: pounds, digits with up to two decimals, not negative (`/^\d+(\.\d{1,2})?$/` after trimming; a whole number such as `0` is fine).
- `Sizes` separated by `;`; `Size prices` as `sizeId=price` separated by `;`.
- Image URL must start with `https://`.
- Upload limit 5 MB. At most 1,250 choices per product.
- Variant SKU pattern `{PREFIX}-{productId}-{sizeId}` with PREFIX one of `CFS`, `UD`, `CFS-TYPE`.
- Every error is `{ sheet: "Groups" | "Choices" | null, row: number | null, message: string }`; `row` is the spreadsheet's own row number (header is row 1).
- The user commits and pushes; each task ends by giving a one-line commit message in the form `git commit -m "feat:..."`. Stop after each task for the user's go-ahead.

## Review Focus

- **Excel cell types:** a price typed as a number (`89.99`), a product ID stored as a number (`146477`), a formula cell, or a rich-text cell must all read as the same text as if typed plainly. Test owned by Task 1.
- **Floating-point prices:** `89.99` read from Excel as `89.99000000000001` or `0.1+0.2`-style values must become `"89.99"`, never refused or rounded wrongly. Test owned by Task 1.
- **Blank rows and trailing spaces:** empty rows between products, and `" Select Fabric "` must be ignored and trimmed, not reported as errors or treated as a different group. Test owned by Task 1 and Task 2.
- **One wrong product in a multi-product sheet:** the preview still shows every other product, but the import as a whole is marked not importable. Test owned by Task 5.
- **Re-uploading the same sheet:** choices with a blank `CFS choice ID` get the same ID every time. Test owned by Task 3.

---

## File Structure

- Create `app/import/spreadsheet.server.js`: workbook bytes to raw rows; sample workbook bytes.
- Create `app/import/check-rows.js`: raw rows to typed groups and choices, with row errors.
- Create `app/import/build-product.js`: typed rows plus one Shopify product to an engine-shaped product, with errors.
- Create `app/import/export-rows.js`: engine-shaped product to typed rows (used by tests now, by stage 2's download later).
- Create `app/import/find-products.server.js`: CFS product IDs to loaded Shopify products.
- Create `app/import/preview.server.js`: the whole read-only pipeline.
- Create `app/routes/app.import.jsx`: upload form and preview.
- Create `app/routes/app.import.sample.jsx`: sample download.
- Modify `app/routes/app.jsx`: add the nav link `Options import`.
- Modify `package.json`: add `exceljs`.
- Tests in `test/import/`.

---

### Task 1: Read the workbook and make the sample

**Files:**
- Modify: `package.json` (dependency `"exceljs": "4.4.0"`; run `npm install exceljs@4.4.0`)
- Create: `app/import/spreadsheet.server.js`
- Test: `test/import/spreadsheet.test.js`

**Interfaces:**
- Produces:
  - `GROUP_COLUMNS`, `CHOICE_COLUMNS`: arrays of the exact column names above, in sample order.
  - `async readWorkbook(bytes: Buffer) -> { groups: RawRow[], choices: RawRow[], errors: Error[] }` where `RawRow = { row: number, values: { [columnName]: string } }`: every value is a trimmed string (`""` when empty); fully blank rows are skipped.
  - `async sampleWorkbook() -> Buffer`: both sheets with headers and the four example Choices rows and three Groups rows from the spec's Example section.

- [ ] **Step 1: Write the failing tests** (build workbooks in the test with `exceljs`)
  - `reads both sheets into trimmed text rows with spreadsheet row numbers`: a Groups row typed with `146477` as a number and `" Select Fabric "` gives `values["CFS product ID"] === "146477"`, `values.Group === "Select Fabric"`, `row === 2`.
  - `reads numbers, formulas and rich text as the text a person sees`: price cell `89.99000000000001` gives `"89.99"`; a formula cell with result `179.99` gives `"179.99"`; a rich-text cell `["Carlton ", "Black"]` gives `"Carlton Black"`; `0` gives `"0"`.
  - `skips blank rows and matches headers ignoring case and spaces`: header `" price (£) "` maps to `Price (£)`; a blank row 3 is skipped and row 4 keeps `row === 4`.
  - `refuses a workbook without both sheets, or with a missing or unknown column`: errors `{ sheet: null, row: null, message: 'The file has no "Choices" sheet' }`, `{ sheet: "Groups", row: 1, message: 'Missing column "Required"' }`, `{ sheet: "Choices", row: 1, message: 'Unknown column "Colour"' }`.
  - `refuses a file that is not an Excel workbook`: bytes `"hello"` give one error with `message: "The file could not be read as an Excel (.xlsx) workbook"`.
  - `the sample reads back without errors`: `readWorkbook(await sampleWorkbook())` gives `errors: []`, 3 groups, 4 choices.

- [ ] **Step 2: Run** `node --test test/import/spreadsheet.test.js`. Expected: FAIL, module not found.

- [ ] **Step 3: Implement** `readWorkbook` and `sampleWorkbook` in `app/import/spreadsheet.server.js`. Numbers become text by rounding to 2 decimals and dropping trailing zeros (`Number(n.toFixed(2)).toString()`); formula cells use their cached result; rich text joins its runs.

- [ ] **Step 4: Run** `npm test`. Expected: all pass.

- [ ] **Step 5:** give the commit message `git commit -m "feat:read option import workbooks and build the sample file"`.

---

### Task 2: Check and type each row

**Files:**
- Create: `app/import/check-rows.js`
- Test: `test/import/check-rows.test.js`

**Interfaces:**
- Consumes: `RawRow` from Task 1.
- Produces: `checkRows({ groups: RawRow[], choices: RawRow[] }) -> { products: Map<cfsProductId, { groups: Group[], choices: Choice[] }>, errors: Error[] }`
  - `Group = { row, name, order: number, required: boolean, after: string, kind: "option" | "accessory", maxQuantity: number | null }`
  - `Choice = { row, group, label, price: string, sizes: string[], sizePrices: { [sizeId]: string }, cfsId: string, optionCode: string, imageUrl: string, details: string }` (`optionCode` upper-cased, `""` when blank)`
  - Rows with errors are left out of `products`; errors still list them.

- [ ] **Step 1: Write the failing tests**
  - `types a good group and choice row`: `Required "yes"` gives `required: true`; `Type "Add-on with quantity"` with `Max quantity "5"` gives `kind: "accessory", maxQuantity: 5`; `Sizes "17019159; 17019160"` gives `["17019159","17019160"]`; `Size prices "17019161=99.99;17019162=109.99"` gives `{ "17019161": "99.99", "17019162": "109.99" }`.
  - `names the sheet, row and column of each bad value`: one assertion per rule, with these exact messages:
    - empty required value: `'"Group" is empty'`
    - product ID not digits: `'"CFS product ID" must be a number, like 146477'`
    - `Required "maybe"`: `'"Required" must be Yes or No'`
    - `Type "Pick one"`: `'"Type" must be "Choose one" or "Add-on with quantity"'`
    - `Display order "first"` or `0`: `'"Display order" must be a whole number from 1'`
    - add-on without Max quantity, or `0`, or `100`: `'"Max quantity" must be a whole number from 1 to 99 for an add-on'`
    - Max quantity on Choose one: `'"Max quantity" is only for add-ons'`
    - price `-1`, `1.999`, `abc`: `'"Price (£)" must be pounds with up to two decimals, like 89.99'`
    - size `abc` in Sizes: `'"Sizes" must be CFS size IDs separated by ;'`
    - Size prices entry `17019161:99`: `'"Size prices" must look like 17019161=99.99'`
    - size priced in Size prices but missing from a filled Sizes: `'Size 17019161 has a price but is not in "Sizes"'`
    - `Image URL "http://x"` or a bare file name: `'"Image URL" must be a full address starting with https://'`
    - `Option code "FAB CARLTON"`: `'"Option code" may only use letters, digits and hyphens, like FAB-CARLTON-BLACK'`
  - `refuses repeated groups and choices within a product`: two Groups rows `146477 / Select Fabric` give `'Group "Select Fabric" is listed twice for product 146477'` on the second row; two Choices rows with the same product, group and label give `'"Carlton Black" is listed twice in "Select Fabric"'`.
  - `the same group name in two products is fine`.
  - `shared option codes must agree`: rows in products 146477 and 146506 with `Option code` `fab-carlton-black` and `FAB-CARLTON-BLACK`, same Choice, Image URL and Details, give no errors and `optionCode === "FAB-CARLTON-BLACK"` on both; a third row with that code and Choice `Carlton Mink` gives `'Option code FAB-CARLTON-BLACK is "Carlton Black" on row 2; every row with this code must use the same Choice, Image URL and Details'` on its own row (same message shape for a different Image URL or Details); the code twice in one product gives `'Option code FAB-CARLTON-BLACK is used twice in product 146477'`. Different prices or sizes with the same code are fine.

- [ ] **Step 2: Run** `node --test test/import/check-rows.test.js`. Expected: FAIL.

- [ ] **Step 3: Implement** `checkRows` in `app/import/check-rows.js`. `Yes`/`No` and `Type` values match ignoring case. Choice `group` is matched to Groups later (Task 3), not here.

- [ ] **Step 4: Run** `npm test`. Expected: all pass.

- [ ] **Step 5:** give the commit message `git commit -m "feat:check and type option import rows"`.

---

### Task 3: Build a product's option data, and turn it back into rows

**Files:**
- Create: `app/import/build-product.js`
- Create: `app/import/export-rows.js`
- Test: `test/import/build-product.test.js`

**Interfaces:**
- Consumes: `Group`, `Choice` from Task 2; product shape from `loadConfigurableProduct` (`{ productId, title, variants: [{ id, sku, title, ... }], modelCards?, workflow?, options? }`, or `{ ordinary: true, variants }`).
- Produces:
  - `sizeIdOf(sku: string, cfsProductId: string) -> string | null`: the size ID when `sku` is `{CFS|UD|CFS-TYPE}-{cfsProductId}-{digits}`, else `null`.
  - `buildProduct({ cfsProductId, groups, choices }, shopifyProduct) -> { product, errors }`: `product` has the same fields as `loadConfigurableProduct`'s result (`variants` copied from `shopifyProduct`), with:
    - `workflow`: `{ ...kept, ordered, groups, ...(pricing) }`. Keep `mode`, `model_label`, `filters`, `pricing.source_url` from an existing workflow; else `model_label: "Size"`, `filters: []`. `groups` sorted by Display order: `{ name, optional: !required, requires: after || "$model" }`. `ordered: true` when any group has a `Choose after`. `pricing.accessory_max_quantity` set when the product has add-ons.
    - `modelCards`: one per variant whose `sizeIdOf` is not null, `{ source_id: sizeId, image: "", dimensions: "", height: "", width: "" }`, keeping an existing card's `image`, `dimensions`, `height`, `width`.
    - `options`: one per choice: `{ cfsId, label, groupName, optionCode, imageUrl: imageUrl || null, mappings: { kind, dimensions: details, inside_color: "", assignments } }`. Assignments: blank Sizes gives `{ id: cfsId, parent: "0", parent2: "0", raw_price: price }` plus one `{ id: \`${cfsId}-${sizeId}\`, parent: sizeId, parent2: "0", raw_price }` per Size prices entry; filled Sizes gives one assignment per listed size, priced from Size prices or Price.
  - `choiceIdFor(cfsProductId, group, label, cfsId) -> string`: `cfsId` when given, else `"imp-" +` the first 16 hex characters of SHA-256 of `` `${cfsProductId}\n${group}\n${label}` ``.
  - `exportRows(cfsProductId, product) -> { groups: Group[], choices: Choice[] }` (no `row`): the inverse of `buildProduct`. For a choice whose assignments have no `parent: "0"`, `sizes` lists every parent, `price` is the most common price and `sizePrices` holds the others. `inside_color` is not on the sheet; `buildProduct` keeps it from the product's current choice with the same ID (ruling, Task 3). `optionCode` is exported when the option has one, else `""` (today's products have none; storing codes in Shopify is stage 3).

- [ ] **Step 1: Write the failing tests** (use the seven fixtures in `test/fixtures/`)
  - `reads the size ID from real and test SKUs`: `sizeIdOf("CFS-146477-17019157","146477") === "17019157"`, same for `UD-` and `CFS-TYPE-`; `sizeIdOf("CFS-146478-17019157","146477") === null`; `sizeIdOf("CFSDB-070","146477") === null`.
  - `round trip keeps every price`: for each of the seven fixtures, `buildProduct(exportRows(id, fixture), fixture)` gives `errors: []`, and `quoteConfiguration` on the rebuilt product gives the same `totalCents` as on the fixture for every price check in `test/fixtures/natural-gold-price-checks.json` (Natural Gold) and for the cheapest complete selection of every size of the other six (reuse `checkProduct(...).fromCents` and `ready`).
  - `round trip passes the product check`: `checkProduct(rebuilt).ready === true` and `problems` equal the fixture's for all seven.
  - `blank Sizes prices every size, Size prices override one`: Price `89.99`, Size prices `17019162=99.99` gives 2ft 6in `8999`, 6ft `9999`.
  - `a choice limited to some sizes is not offered on the others`: `quoteConfiguration` with it on an unlisted size gives `incompatible_choice`.
  - `the same row always gets the same choice ID`: `choiceIdFor("146477","Select Fabric","Carlton Black","")` equals itself on a second call, matches `/^imp-[0-9a-f]{16}$/`, and differs for `"Carlton Mink"`.
  - `a group with no Choose after waits only for the size`: `requires === "$model"`, `ordered === false` when no group has one.
  - `refuses what the shop could not sell`, with exact messages and the row of the offending line:
    - size not a variant: `'Size 99999999 is not a size of this product in Shopify'`
    - choice in a group missing from Groups: `'Group "Select Colour" is not on the Groups sheet for product 146477'`
    - `Choose after` unknown: `'"Choose after" names "Select Lid", which is not a group of this product'`
    - `Choose after` itself or a later-displayed group: `'"Choose after" must name a group shown earlier (lower Display order)'`
    - two add-on groups with different Max quantity: `'All add-on groups of one product must have the same "Max quantity" for now'`
    - a Required group with no choice on a size: `'Required group "Select Fabric" has no choice for size 17019162'`
    - more than 1,250 choices: `'Product 146477 has 1,251 choices; the most the app can read is 1,250'`
    - a product with no variant matching the SKU pattern: `'No Shopify size of this product has a SKU like CFS-146477-<size ID>'`
    - a group with no choices: `'Group "Select Fabric" has no choices'`
  - `keeps settings the sheet does not cover`: rebuilding Loft keeps `workflow.filters` `["height","width"]`, `model_label` `"Option"` and each model card's `height` and `width`.

- [ ] **Step 2: Run** `node --test test/import/build-product.test.js`. Expected: FAIL.

- [ ] **Step 3: Implement** `sizeIdOf`, `choiceIdFor`, `buildProduct` in `app/import/build-product.js`, and `exportRows` in `app/import/export-rows.js`. `buildProduct` ends by calling `unsupportedReason(product)` from `app/pricing/quote.server.js` and reports a non-null reason as `{ sheet: null, row: null, message: \`Product ${cfsProductId}: ${reason}\` }`.

- [ ] **Step 4: Run** `npm test`. Expected: all pass, including all existing pricing tests.

- [ ] **Step 5:** give the commit message `git commit -m "feat:build product option data from import rows"`.

**Rulings made while building (Task 3):** CFS's per-size reference (assignment `id`) is kept from the product's current data when the same choice is on the same size, so order records keep CFS's real numbers; only new sizes or choices get made-up IDs. `inside_color` is kept the same way instead of being folded into Details. The whole existing `pricing` object is kept, not only `source_url`. Two rows giving the same CFS choice ID in one product are refused.

---

### Task 4: Find the Shopify products

**Files:**
- Create: `app/import/find-products.server.js`
- Test: `test/import/find-products.test.js`

**Interfaces:**
- Consumes: `loadConfigurableProduct(graphql, productId)` from `app/pricing/load-product.server.js`; `sizeIdOf` from Task 3.
- Produces: `async findProducts(graphql, cfsProductIds: string[]) -> Map<cfsProductId, { product } | { error: string }>`.
  - Query per ID (one at a time): `productVariants(first: 250, query: "sku:CFS-{id}-* OR sku:UD-{id}-* OR sku:CFS-TYPE-{id}-*") { nodes { sku product { id } } }`, keeping only variants where `sizeIdOf(sku, id)` is not null.
  - Errors: `'No Shopify product has sizes with SKUs like CFS-{id}-<size ID>'`; `'Sizes with this product ID are on more than one Shopify product'`; `'Shopify returned only part of this product (over 250 sizes, or its choices could not all be read)'` when `loadConfigurableProduct` returns `null`.

- [ ] **Step 1: Write the failing tests** with a fake `graphql(query, { variables })` returning canned JSON: found (one product), not found, two products, `loadConfigurableProduct` null, and `sku:CFS-1464770-1` ignored for ID `146477`.

- [ ] **Step 2: Run** `node --test test/import/find-products.test.js`. Expected: FAIL.

- [ ] **Step 3: Implement** `findProducts`. Validate the query with `node C:\Users\Admin\.claude\plugins\cache\claude-plugins-official\shopify-ai-toolkit\2.1.2\skills\shopify\scripts\validate.mjs --api admin --version 2026-10 --file <query file>`. Expected: SUCCESS.

- [ ] **Step 4: Run** `npm test`. Expected: all pass.

- [ ] **Step 5:** give the commit message `git commit -m "feat:find Shopify products for option import by CFS product ID"`.

---

### Task 5: The preview pipeline

**Files:**
- Create: `app/import/preview.server.js`
- Test: `test/import/preview.test.js`

**Interfaces:**
- Consumes: Tasks 1 to 4; `checkProduct` from `app/pricing/product-check.server.js`.
- Produces: `async previewImport(graphql, bytes: Buffer) -> { importable: boolean, errors: Error[], products: ProductPreview[] }`
  - `ProductPreview = { cfsProductId, title, productId, check: { ready, problems, fromCents }, groups: [{ name, required, after, kind, maxQuantity, choices: [{ label, cfsId, prices: [{ sizeId, sizeTitle, cents }] }] }], removed: string[] }`. `removed` lists labels of choices the product has today that the sheet leaves out (warning only).
  - `importable` is `true` only when `errors` is empty and every product's `check.ready` is `true`.
  - Bytes over 5 MB give `importable: false`, one error `'The file is larger than 5 MB'`, and no workbook read.

- [ ] **Step 1: Write the failing tests** with a fake `graphql` serving the Natural Gold and Loft fixtures:
  - `previews a good two-product sheet`: built with `exportRows` and the sample writer; `importable: true`; Natural Gold's `with 2 Drawer` shows `cents: 8999` on all six sizes.
  - `one bad product still shows the others but blocks the import`: Loft with a bad size ID gives `importable: false`, the error on its row, and Natural Gold's preview still present.
  - `warns about choices the sheet removes`: drop `Carlton Mink` gives `removed: ["Carlton Mink"]`.
  - `refuses an oversized file before reading it`.

- [ ] **Step 2: Run** `node --test test/import/preview.test.js`. Expected: FAIL.

- [ ] **Step 3: Implement** `previewImport`. Products appear in the order of their first row on the Groups sheet.

- [ ] **Step 4: Run** `npm test`. Expected: all pass.

- [ ] **Step 5:** give the commit message `git commit -m "feat:preview an option import without writing"`.

---

### Task 6: Admin page and sample download

**Files:**
- Create: `app/routes/app.import.jsx`
- Create: `app/routes/app.import.sample.jsx`
- Modify: `app/routes/app.jsx` (add `<s-link href="/app/import">Options import</s-link>` after Product check)

**Interfaces:**
- Consumes: `previewImport` (Task 5), `sampleWorkbook` (Task 1), `money` from `app/orders/format.js`.
- Produces:
  - `GET /app/import.sample`: loader returns the sample as `cfs-options-sample.xlsx` (`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `Content-Disposition: attachment`).
  - `/app/import`: page "Options import" with a "Download sample" link, a file input (`accept=".xlsx"`) and a "Preview" button posting `multipart/form-data`. The action reads the file with `request.formData()`, calls `previewImport(admin.graphql, Buffer.from(await file.arrayBuffer()))` and returns the result.
  - Preview shows: a banner, either "Ready to import: N products" or "Not ready: fix the problems below. Nothing has been changed."; an errors table (Sheet, Row, Problem); then one section per product with title, check result, a "Will remove" warning listing `removed`, and a table per group (Choice, then one price column per size). There is no import button in this stage.

- [ ] **Step 1: Build the routes** following `app/routes/app.products.jsx` for layout and `authenticate.admin(request)` in both loader and action.

- [ ] **Step 2: Run** `npm test` and `npm run build`. Expected: all tests pass; build succeeds.

- [ ] **Step 3: Give the user** the commit message `git commit -m "feat:add options import page with sample download and preview"` and ask them to push and wait for Render Live (no `shopify app deploy`: `shopify.app.toml` is unchanged).

- [ ] **Step 4: Verify in the dev store admin** (Claude in Chrome): Download sample opens in Excel form (read back with `readWorkbook`, no errors); upload a sheet made by `exportRows` for the seven test products shows "Ready to import: 7 products" with Natural Gold's 2 Drawer at £89.99 on every size; upload the same sheet with one size ID changed to `99999999` shows "Not ready" and the row. Confirm with a read query that no product's `cfs_import` metafields changed (`updatedAt` of the seven products unchanged).

- [ ] **Step 5: Record** the result in `docs/PLAN.md` under item 8 (stage 1 done, date, what was checked) and give the commit message `git commit -m "docs:record option importer preview check"`.

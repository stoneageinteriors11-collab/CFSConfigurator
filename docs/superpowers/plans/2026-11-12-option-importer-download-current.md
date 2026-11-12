# Option importer stage 2: Download current options. Implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the Options import page, staff enter CFS product IDs and download those products' current options as a sheet in the upload layout. The team edits it and uploads it back through the stage 1 preview. Read only.

**Architecture:** One server module looks the products up (`findProducts`), turns each into rows (`exportRows` and `sheetValues`), and writes one workbook (`writeWorkbook`). All of these come from stage 1. A resource route serves the file. The page fetches it the same way as Download sample, so the request is signed in.

**Tech Stack:** React Router app (JS/JSX), exceljs 4.4.0, Shopify Admin GraphQL 2026-10 (reads only), Node test runner.

**Spec:** `docs/superpowers/specs/2026-11-12-option-importer-design.md` (page action 2, "Download current options", and Build order step 2).

## Global Constraints

- Read only: no Shopify write of any kind. Store work only on `urban-deco-dev.myshopify.com`.
- JS/JSX only. No new dependencies.
- Same columns, sheet names and header order as the sample: `GROUP_COLUMNS` and `CHOICE_COLUMNS` in `app/import/spreadsheet.server.js`.
- At most 100 products per download, the same as the preview limit.
- The user commits and pushes. Each task ends with a commit message, then stops for the go-ahead. No `shopify app deploy` is needed, because `shopify.app.toml` is unchanged.

## Review Focus

- **Round trip:** a downloaded file uploaded unchanged must preview as importable with nothing removed, for all seven test products. Test owned by Task 1.
- **Messy ID input:** `146477, 69733` or `146477 69733` pasted on separate lines, repeated IDs, or blank space must all work, in the order entered. A non-number such as `UD-146477` is refused by name. Test owned by Task 1.
- **A product with no option data yet**, or one that isn't found, must give a clear message naming the ID, not an empty or partial file. Test owned by Task 1.
- **Exact prices:** prices must download as written in the data (for example `89.99` or `0.00`) and never become `89.98999…`. Test owned by Task 1.
- **Signed-in download:** the file must come through the app's own sign-in from inside the Shopify admin. Checked in Task 2's browser step.

---

### Task 1: Build the current-options workbook

**Files:**
- Create: `app/import/current-options.server.js`
- Test: `test/import/current-options.test.js`

**Interfaces:**
- Consumes: `findProducts(graphql, ids)` from `app/import/find-products.server.js`; `exportRows`, `sheetValues` from `app/import/export-rows.js`; `writeWorkbook` from `app/import/spreadsheet.server.js`; `previewImport` (tests only).
- Produces:
  - `parseProductIds(text: string) -> { ids: string[], errors: string[] }`. Splits on commas, semicolons and any whitespace. Drops blanks and repeats, and keeps the order entered.
  - `async currentOptionsWorkbook(graphql, text: string) -> { bytes: Buffer, filename: string } | { errors: string[] }`.

- [ ] **Step 1: Write the failing tests**, with the fake Shopify from `test/import/preview.test.js`, serving the Natural Gold and Loft fixtures.
  - `reads IDs however they are typed`: `parseProductIds(" 146477, 69733\n146477;  ")` gives `{ ids: ["146477", "69733"], errors: [] }`. `parseProductIds("UD-146477 abc")` gives errors `['"UD-146477" is not a CFS product ID (a number, like 146477)', '"abc" is not a CFS product ID (a number, like 146477)']`. `parseProductIds("  ")` gives the error `"Enter at least one CFS product ID"`. 101 IDs give `"Enter at most 100 products at a time"`.
  - `downloads both products and they preview unchanged`: `readWorkbook(bytes)` has no errors and the Groups rows of Natural Gold then Loft. `previewImport(graphql, bytes)` gives `importable: true` and `removed: []` on every product.
  - `keeps prices exactly`: the Natural Gold `with 2 Drawer` row has `Price (£)` `"89.99"`.
  - `names the file`: one product gives `cfs-options-146477-YYYY-MM-DD.xlsx`, and several give `cfs-options-2-products-YYYY-MM-DD.xlsx`. The date is London's date, from an injected `now` parameter: `currentOptionsWorkbook(graphql, text, now = new Date())`.
  - `refuses unknown products and products with no options, with no file`: ID `999999` gives `["Product 999999: No Shopify product has sizes with SKUs like CFS-999999-<size ID>"]`. A product with no CFS option data (`ordinary: true`) gives `["Product 146477: has no options yet; start from the sample sheet"]`. In both cases there is no `bytes`.

- [ ] **Step 2: Run** `node --test test/import/current-options.test.js`. Expected: FAIL, module not found.

- [ ] **Step 3: Implement** `parseProductIds` and `currentOptionsWorkbook` in `app/import/current-options.server.js`.
  - If any product fails, return all the errors and no file. A partial file would look complete to the team.
  - A product whose `workflow` isn't readable (no `groups` array) gives `"Product {id}: its current options cannot be read"`.

- [ ] **Step 4: Run** `npm test`. Expected: all pass.

- [ ] **Step 5:** give the commit message `git commit -m "feat:build a sheet of products' current options"`.

---

### Task 2: Page control and download route

**Files:**
- Create: `app/routes/app.import.current.jsx` (resource route, loader only)
- Modify: `app/routes/app.import.jsx` (a second card, "Download current options")

**Interfaces:**
- Consumes: `currentOptionsWorkbook` (Task 1).
- Produces: `GET /app/import/current?ids=<text>`.
  - On success: the workbook with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and `Content-Disposition: attachment; filename="<filename>"`.
  - On error: status 400 with JSON `{ errors: string[] }`.
  - `authenticate.admin(request)` first.

- [ ] **Step 1: Build the route and the page control.**
  - Under the upload form, add a section with a multi-line text field labelled "CFS product IDs". The hint is "One or more, separated by commas, spaces or new lines".
  - Add a "Download current options" button. It fetches `/app/import/current?ids=…` like `downloadSample`, saves the file under the name from `Content-Disposition`, and on a 400 shows the errors in a critical banner as a list.
  - While the download runs, the button shows as loading.

- [ ] **Step 2: Run** `npm test`, `npm run build` and `npx eslint app/routes/app.import.current.jsx app/routes/app.import.jsx`. Expected:
  - all tests pass and the build succeeds;
  - lint shows only the existing `react/prop-types` pattern.

- [ ] **Step 3: Give the user** the commit message `git commit -m "feat:download products' current options from the options import page"`. Ask them to push and wait for Render Live. No `shopify app deploy` is needed.

- [ ] **Step 4: Verify in the dev store admin**, with the user doing any file-picker steps:
  1. Enter `146477, 69733` and download. The file reads back with `readWorkbook` with no errors.
  2. Upload it unchanged. The preview shows "Ready to import: 2 products" with nothing to remove.
  3. Enter `999999`. The error banner names it.
  4. Confirm with the before/after `updatedAt` script that nothing changed in Shopify.

- [ ] **Step 5: Record** the result in `docs/PLAN.md` under item 8 (stage 2 done, date, what was checked). Give the commit message `git commit -m "docs:record download current options check"`.

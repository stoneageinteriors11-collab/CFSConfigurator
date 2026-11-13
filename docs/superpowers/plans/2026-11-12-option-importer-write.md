# Option importer stage 3: write and restore. Implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a preview says Ready to import, staff can write the sheet's products to Shopify, watch progress, see each product's result, and restore any product to how it was before an import.

**Architecture:**
- **Preview first.** The preview is split into a preparation step that also returns the built products. It also checks the sheet against live shared options (option codes and names on products not in the sheet) and marks unchanged products.
- **Writing a product.** New metaobject entries are created, then one `metafieldsSet` switches the product over, then old entries that nothing references are deleted. A failure before the switch deletes the new entries and leaves the product as it was.
- **Running an import.** Each import is an `ImportRun` row with an `ImportBackup` row per written product. It runs in the background on the server, and the page polls it.

**Tech Stack:** React Router 7 (JS/JSX only), Shopify Admin GraphQL 2026-10, Prisma on Supabase Postgres, `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-12-option-importer-write-design.md` (option A decided), building on `docs/superpowers/specs/2026-11-12-option-importer-design.md`.

## Global Constraints

- **Language and store:**
  - JS/JSX only, API version 2026-10.
  - The dev store `urban-deco-dev.myshopify.com` only.
- **Safety switch:** writing is allowed only for shops listed in the comma-separated env var `IMPORT_WRITE_SHOPS`. With it unset, every write is refused with: `Importing is not switched on for this store`.
- **Store writes:** the app writes only `cfs_import_option` entries and the `cfs_import` metafields `options`, `workflow` and `model_cards` on products named in the sheet. It never changes a product the sheet does not mention.
- **New entries:**
  - Handle: `cfs-{numeric product ID}-{cfsId}-{run short ID}`, lowercased, with any character other than `a-z0-9-` replaced by `-`. The run short ID is the first 8 characters of the run's id.
  - Fields: `cfs_id`, `label`, `group_name`, `source_mappings` (JSON text), `image_url` (only when set) and `option_code` (only when set).
- **Imports:** one import or restore at a time per shop. A second is refused with: `Another import is running for this store; wait for it to finish`.
- **Owner steps:**
  - Claude never runs `shopify app deploy`, `prisma migrate deploy`, `git commit` or `git push`. It gives a short `git commit -m "feat/fix/docs:…"` message after each task.
  - Theme files are untouched.
- **Validation:** validate every new GraphQL operation with `node C:\Users\Admin\.claude\plugins\cache\claude-plugins-official\shopify-ai-toolkit\2.1.2\skills\shopify\scripts\validate.mjs --api admin --version 2026-10 --file <file>`.
- **Working style:** stop after each task, report in plain language, and wait for the user's go-ahead.

## Review Focus

1. **The server restarts mid-import:** the run must not stay "running" forever and block every later import. Runs not updated for 10 minutes are marked stopped, and products with no result say `Stopped part-way; check this product`. Task 6 test `marks a stale run stopped and allows a new one`.
2. **Shopify rate limits (THROTTLED) part-way through a product's ~150 entry creations:** retry with waits rather than failing the product. Task 4 test `retries a throttled call then succeeds`.
3. **An old entry is still listed by another product:** it must not be deleted. Task 5 test `keeps an old entry another product still lists`.
4. **Restoring a product whose shared option has since changed on other products:** refused, with those products named. Task 6 test `refuses a restore whose shared option changed elsewhere`.
5. **A product changed in Shopify between preview and Import (for example a size deleted):** Import re-runs the full preview on the confirmed file and writes nothing if it is no longer ready. Task 7 test `refuses import when the file no longer previews as ready`.

---

### Task 1: Read entry IDs and option codes from Shopify

**Files:**
- Modify: `app/pricing/load-product.server.js` (`CHOICE_FIELDS`, `options` mapping)
- Modify: `test/import/fake-shop.js`
- Test: `test/import/find-products.test.js`, `test/import/current-options.test.js`

**Interfaces:**
- Produces: each loaded option gains `entryId` (the metaobject GID) and `optionCode` (string, or `""` when the entry has none). `fakeShop` serves `entryId` (fixture value, or `gid://shopify/Metaobject/{productNumber}{index}` when absent) and `optionCode`.

- [ ] **Step 1: Write the failing tests.** In `find-products.test.js`, add `reads each choice's entry ID and option code`. With a fixture option given `optionCode: "FAB-CARLTON-BLACK"`, assert that the loaded option has that `optionCode`, that `entryId` starts with `gid://shopify/Metaobject/`, and that an option without a code has `optionCode === ""`. In `current-options.test.js`, add `downloads each choice's option code`: that option's row in the downloaded sheet has `"Option code": "FAB-CARLTON-BLACK"`.
- [ ] **Step 2:** Run `node --test test/import/find-products.test.js test/import/current-options.test.js`. Expected: FAIL on the new tests.
- [ ] **Step 3: Implement.**
  - In `CHOICE_FIELDS`, add `entryId: id` and `optionCode: field(key: "option_code") { value }`.
  - Map them as `entryId: node.entryId` and `optionCode: node.optionCode?.value ?? ""`.
  - Update `fakeShop` to match.
  - Validate both product queries with validate.mjs.
- [ ] **Step 4:** Run `npm test`. Expected: all pass, 252 or more.
- [ ] **Step 5:** Give the commit message `feat:read option entry IDs and option codes from Shopify`.

### Task 2: Mark products the sheet does not change

**Files:**
- Modify: `app/import/preview.server.js`
- Create: `app/import/same-product.js`
- Modify: `app/routes/app.import.jsx` (tab mark and banner)
- Test: `test/import/same-product.test.js`, `test/import/preview.test.js`

**Interfaces:**
- Produces:
  - `sameProduct(current, built) -> boolean`. True when `workflow` and `modelCards` are deeply equal, and the options are equal in order on `cfsId`, `label`, `groupName`, `imageUrl` (null and `""` count as the same), `optionCode` and `mappings`.
  - `prepareImport(graphql, bytes) -> { preview, plans }`. `preview` is exactly what `previewImport` returns, with `unchanged: boolean` on each product. `plans` is `[{ cfsProductId, productId, title, current, product }]` for every ready, changed product.
  - `previewImport(graphql, bytes)` stays and returns `(await prepareImport(...)).preview`.

- [ ] **Step 1: Write the failing tests.**
  - `same-product.test.js`:
    - `a product rebuilt from its own export is the same`: Natural Gold export, then build, gives `sameProduct === true`.
    - `one changed price is not the same`.
    - `a changed option code is not the same`.
  - `preview.test.js`:
    - `marks a re-uploaded product unchanged and plans nothing for it`: a current-options download of 146477 uploaded back gives `products[0].unchanged === true`, `importable === true` and `plans.length === 0`.
    - `plans a changed product with its built data`.
- [ ] **Step 2:** Run them. Expected: FAIL, because `sameProduct` and `prepareImport` are not defined.
- [ ] **Step 3: Implement** both in the files named above.
- [ ] **Step 4: Update the page.** An unchanged product's tab shows `=` instead of ✓, and its panel shows a banner: `No changes; this product will be skipped`. When every product is unchanged, the result banner says `Nothing to import: the sheet matches the store` and there is no Import button (the button comes in Task 7).
- [ ] **Step 5:** Run `npm test`. Expected: all pass.
- [ ] **Step 6:** Give the commit message `feat:mark products an option import would not change`.

### Task 3: Check shared options against live products

**Files:**
- Create: `app/import/shared-options.server.js`
- Modify: `app/import/preview.server.js` (call it from `prepareImport`; add `warnings`)
- Modify: `app/routes/app.import.jsx` (warnings list per product)
- Modify: `test/import/fake-shop.js` (serve the `metaobjects` query)
- Test: `test/import/shared-options.test.js`, `test/import/preview.test.js`

**Interfaces:**
- Produces:
  - `liveOptionsQuery`, a GraphQL query `CfsSharedOptions($query: String!, $after: String)` over `metaobjects(type: "cfs_import_option", first: 250, query: $query, after: $after)`. For each node it returns `id`, the fields `label`, `image_url`, `source_mappings` and `option_code`, and `referencedBy(first: 10) { nodes { referencer { ... on Product { id title } } } }`.
  - `checkSharedOptions(graphql, options, { exceptProductIds }) -> { errors: string[], warnings: string[] }`. `options` are built options; `exceptProductIds` are the Shopify product GIDs in the sheet, plus the product being restored. Live entries with no referencing product are ignored.
  - Exact copy:
    - error: `Option code {CODE} is "{live label}" on {title} ({product number}){, …}; this sheet gives it a different {name|image|details}. Add those products to the sheet to change it everywhere`
    - warning: `"{label}" has the same name as option code {CODE} on {title}{, …}; add the code if it is the same option`
  - The search strings are `fields.option_code:{CODE}` and `fields.label:"{label with " escaped}"`. Each distinct code or uncoded label is looked up once, following every page.
  - `prepareImport` adds `warnings: string[]` to each product. Shared-option errors join `errors` tagged with the product and block `importable`; warnings do not.

- [ ] **Step 1: Write the failing tests** in `shared-options.test.js`, against a fake shop holding a live coded entry on product P2 (not in the sheet):
  - `allows a code that matches on other products`
  - `refuses a code whose name differs on another product, naming it`
  - `ignores products in the sheet`
  - `warns on an uncoded choice named like a live coded option`
  - `ignores entries no product lists`
  - `reads every page of matches`

  Add `preview.test.js` `a shared-option error blocks import and a warning does not`.
- [ ] **Step 2:** Run them. Expected: FAIL, because the module is not found.
- [ ] **Step 3: Implement**, then validate `liveOptionsQuery` with validate.mjs.
- [ ] **Step 4: Update the page.** Show each product's warnings under its problems, as a warning-tone list headed `Check these`.
- [ ] **Step 5:** Run `npm test`. Expected: all pass.
- [ ] **Step 6 (user, before any live check):** in Shopify admin, open Content, then Metaobjects, then "CFS imported option (test)":
  - add the field **Option code** (key `option_code`, single line text);
  - mark both **Option code** and **Label** as filterable.

  Claude then reads the definition back, read-only, and confirms both are filterable.
- [ ] **Step 7:** Give the commit message `feat:check option codes against live products in option import`.

### Task 4: Shopify write calls

**Files:**
- Create: `app/import/shopify-writes.server.js`
- Test: `test/import/shopify-writes.test.js`

**Interfaces:**
- Produces:
  - `callShopify(graphql, query, variables, { sleep }) -> data`
    - Retries up to 4 times, waiting 1, 2, 4 and 8 seconds, when the call throws, or returns `errors`, mentioning `THROTTLED`.
    - Any other error, or one that is still throttled after the last retry, throws an `Error` with Shopify's message.
    - `sleep` defaults to a real timer; tests pass a no-op.
  - `entryHandle(productId, cfsId, runId) -> string`, following the handle rule in Global Constraints.
  - `createEntries(graphql, productId, options, runId, { sleep }) -> { ids: string[] } | { ids: string[], error: string }`. Creates entries one at a time, in order, with `metaobjectCreate`. It stops at the first `userErrors` and returns the IDs it did create.
  - `switchProduct(graphql, productId, entryIds, product) -> { error?: string, uncertain?: true }`. `uncertain` is set only when Shopify's answer was never seen. One `metafieldsSet` with three inputs on `cfs_import`:
    - `options`, type `list.metaobject_reference`, value `JSON.stringify(entryIds)`;
    - `workflow`, type `json`;
    - `model_cards`, type `json`.
  - `isListed(graphql, entryId) -> boolean`: whether the entry's `referencedBy(first: 1)` has any node.
  - `deleteEntries(graphql, ids, { sleep }) -> { failed: string[] }`: `metaobjectDelete` per ID; it carries on past failures.

- [ ] **Step 1: Confirm the metafield types (read-only).** Read the dev store's `cfs_import` product metafield definitions with the scratchpad `defs.mjs`. Confirm that `workflow` and `model_cards` are `json` and `options` is `list.metaobject_reference`. If they differ, use the real types and write a ledger ruling.
- [ ] **Step 2: Write the failing tests:**
  - `makes handles Shopify accepts`: `entryHandle("gid://shopify/Product/1", "IMP-ab_c", "1234abcd-…")` gives `cfs-1-imp-ab-c-1234abcd`.
  - `retries a throttled call then succeeds`
  - `throws Shopify's message on other errors`
  - `creates entries with the right fields and stops at the first refusal`: asserts `image_url` and `option_code` are left out when empty, and that `source_mappings` is a JSON string.
  - `switches all three values in one call`
  - `deletes and reports failures`
- [ ] **Step 3:** Run them. Expected: FAIL, because the module is not found.
- [ ] **Step 4: Implement**, then validate the four operations with validate.mjs.
- [ ] **Step 5:** Run `npm test`. Expected: all pass.
- [ ] **Step 6:** Give the commit message `feat:add Shopify write calls for option import`.

### Task 5: Write one product safely

**Files:**
- Create: `app/import/write-product.server.js`
- Test: `test/import/write-product.test.js`, with an in-memory fake that keeps entries and product metafields

**Interfaces:**
- Consumes:
  - Task 4's functions;
  - `loadConfigurableProduct`;
  - `checkProduct(product) -> { ready, problems }`.
- Produces: `writeProduct({ graphql, product, current, runId, sleep }) -> { ok: true, ready, problems } | { ok: false, error }`.
  - Steps, in order: create entries, then switch, then read back and check, then delete each old `current.options[].entryId` for which `isListed` is false.
  - If creation fails, or the switch is refused, it deletes the IDs created so far and returns `ok: false`. Error copy: `Not changed: {Shopify's message}`.
  - If `switchProduct` returns `uncertain: true` (its answer was never seen), it reads the product back first. Only if the product still lists its old entries does it delete the new ones and return `ok: false`. If the product lists the new entries, it carries on as a success. If the product cannot be read back, it deletes nothing and returns `ok: false` with `Check this product: Shopify did not confirm the change`.
  - A read-back or clean-up failure after the switch does not undo the switch. It returns `ok: true` with `ready: false` and the problem, or, for clean-up, adds a problem: `{n} old options could not be removed`.

- [ ] **Step 1: Write the failing tests:**
  - `writes a product and removes its old entries`
  - `leaves the product unchanged when an entry is refused`
  - `leaves the product unchanged when the switch is refused`
  - `keeps an old entry another product still lists`
  - `reports a product that is written but not ready`
  - `keeps the new entries when an unconfirmed switch did apply`
  - `deletes the new entries when an unconfirmed switch did not apply`
  - `deletes nothing when an unconfirmed switch cannot be read back`
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Run `npm test`. Expected: all pass.
- [ ] **Step 5:** Give the commit message `feat:write one product's options with no half-written state`.

### Task 6: Import runs, backups and restore

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261112120000_create_import_runs/migration.sql`
- Create: `app/import/import-run.server.js`
- Test: `test/import/import-run.test.js`, with a fake `db` in the style of `test/checkout/start-checkout.test.js`

**Interfaces:**
- Schema:
  - `ImportRun`: `id` uuid, `shop`, `kind` (`import` or `restore`), `createdBy String?`, `fileName String?`, `status` (`running`, `done` or `stopped`), `total Int`, `results Json @default("[]")`, `createdAt`, `updatedAt @updatedAt`, `backups ImportBackup[]`.
  - `ImportBackup`: `id` uuid, `runId` with a cascade relation, `shop`, `productId`, `cfsProductId`, `title`, `data Json` (the loaded product's `options`, `workflow` and `modelCards`), `restoredAt DateTime?`, `createdAt`.
  - The migration enables RLS on both tables, as earlier migrations do, and adds `CREATE UNIQUE INDEX "ImportRun_one_running" ON "ImportRun"("shop") WHERE "status" = 'running';`.
- Produces:
  - `writesAllowed(shop) -> boolean`, from `IMPORT_WRITE_SHOPS`.
  - `beginRun({ db, shop, kind, createdBy, fileName, total, now }) -> { run } | { error }`.
    - First marks the shop's runs that are `running` and older than 10 minutes as `stopped`.
    - A unique-index clash (`P2002`) gives the "Another import is running" copy.
    - A shop not in the allowlist gives the "not switched on" copy.
  - `runPlans({ db, graphql, run, plans, sleep }) -> void`. For each plan, in order: save the backup, then `writeProduct`, then append to `results.done` a result `{ cfsProductId, productId, title, status: "imported" | "failed", ready, message, backupId }` and update the run. The run ends `done`. Unchanged products are never in `plans`.
  - `startRestore({ db, graphql, shop, backupId, createdBy }) -> { run, plan } | { error }`. The plan's `product` is the live product with the backup's `options`, `workflow` and `modelCards`, and `current` is the live product. Refusal copy:
    - a backup with `data.options` missing: `This product had no options before that import, so there is nothing to restore`;
    - a shared-option drift error from `checkSharedOptions` with `exceptProductIds: [productId]`.
  - A restore result uses `status: "restored"` and sets that backup's `restoredAt`.
  - `runView(run) -> { …run, results }`. Fills in `Stopped part-way; check this product` for planned products with no result when the status is `stopped`. To know them, `total` and a `planned: [{ cfsProductId, title }]` list are stored in `results` at the start as `{ planned, done: [] }`, so `results` is `{ planned, done }`.

- [ ] **Step 1: Write the failing tests:**
  - `refuses a shop not switched on`
  - `refuses a second run while one is running`
  - `marks a stale run stopped and allows a new one`
  - `saves a backup before writing each product`
  - `records each product's result and finishes done`
  - `carries on after one product fails`
  - `restores a backup and marks it restored`
  - `refuses a restore of a product that had no options`
  - `refuses a restore whose shared option changed elsewhere`
  - `shows unfinished products of a stopped run`
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3: Implement** the schema, migration and module. Run `npx prisma generate` (local client only; no migrate).
- [ ] **Step 4:** Run `npm test`. Expected: all pass.
- [ ] **Step 5:** Give the commit message `feat:record option import runs and back up products for restore`.

### Task 7: Import button, progress and history

**Files:**
- Modify: `shopify.app.toml` (add `write_metaobjects` to `scopes`)
- Modify: `app/routes/app.import.jsx` (an `intent=import` action and the Import button)
- Create: `app/routes/app.import.runs.$id.jsx` (loader returning JSON `runView` for this shop's run, or 404)
- Create: `app/routes/app.import_.history.jsx` (the trailing underscore keeps it from nesting inside the import page; the last 50 runs with their results, a Restore button per backup, and an action with `intent=restore`)
- Create: `app/import/start-import.server.js`
- Modify: `app/routes/app.jsx` (nav link "Import history")
- Test: `test/import/start-import.test.js`

**Interfaces:**
- Produces: `startImport({ db, graphql, shop, bytes, fileName, createdBy, runInBackground }) -> { runId } | { errors }`.
  - Calls `prepareImport`.
  - Refuses with `The file no longer previews as ready to import; preview it again` unless `preview.importable`.
  - Refuses with `Nothing to import: the sheet matches the store` when `plans` is empty.
  - Otherwise calls `beginRun`, then `runInBackground(() => runPlans(...))`, and returns the run id.
- Routes:
  - Background work uses `unauthenticated.admin(shop).admin.graphql`, so it outlives the request.
  - `createdBy` is `sessionToken?.sub ?? null` from `authenticate.admin`.
  - The page polls the run route every 2 seconds while `status === "running"`, showing `Imported {n} of {total}`. When finished it lists each product's result and links to Import history.
  - The Import button re-submits the same chosen file with `intent=import`. It shows only when the preview is importable and there are planned products.

- [ ] **Step 1: Write the failing tests:**
  - `refuses import when the file no longer previews as ready`
  - `refuses when nothing would change`
  - `starts a run and hands the work to the background`
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3: Implement** the module, routes, nav link and scope.
- [ ] **Step 4:** Run `npm test` and `npm run lint` on the changed files. Expected: tests pass, and lint shows no new errors beyond the project's existing prop-types pattern.
- [ ] **Step 5: Check the page locally.** Render the import page with a running and a finished run using the scratchpad `render/` setup, and screenshot both.
- [ ] **Step 6:** Give the commit message `feat:import options to Shopify with progress, history and restore`. Then tell the user:
  1. push and wait for Render Live, which runs the new migration through `npm run setup`;
  2. run `shopify app deploy` and accept `write_metaobjects` on the dev store;
  3. add `IMPORT_WRITE_SHOPS=urban-deco-dev.myshopify.com` in Render.

### Task 8: Dev store trial

Each store write below is named and approved by the user before it happens.

- [ ] **Step 1: Snapshot (read-only).** Rerun `updated-at.mjs` and confirm the seven products are unchanged.
- [ ] **Step 2: Create a test product (store write, needs approval).** Create one `cfs-spike` draft product, "CFS import trial (copy of Natural Gold)", with Natural Gold's sizes and SKUs renumbered to `CFS-9146477-{sizeId}`, and no options.
- [ ] **Step 3: First import.** Take Natural Gold's current-options download, change its CFS product ID to 9146477, and import it from the page.
  - Expected: `Imported 1 of 1`, ready to sell.
  - The product page on the preview theme shows the options.
  - A draft-order quote matches Natural Gold's prices.
- [ ] **Step 4: Price change.** Change one price and import again.
  - Expected: the new price on the product page and in the quote.
  - The old entries are gone; the entry count for the definition is checked read-only.
- [ ] **Step 5: Restore** the step 4 backup.
  - Expected: the old price is back.
  - Restoring the step 3 backup is refused with the "no options before" copy.
- [ ] **Step 6: Unchanged re-upload.** Upload the seven test products' current-options sheet.
  - Expected: `Nothing to import: the sheet matches the store`.
  - `updated-at.mjs` still shows the seven unchanged.
- [ ] **Step 7: Record the results** in `docs/PLAN.md` item 8. Leave the trial product in place, tagged, unless the user asks for its removal. Give the commit message `docs:record option import write and restore trial`.

## After all tasks

Final whole-branch review on the most capable model, as in stage 1. Then fix the Critical and Important findings and list the deferred minors.

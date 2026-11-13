# Graph Report - cfs-configurator  (2026-11-13)

## Corpus Check
- 140 files · ~98,675 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 8, .toml 3, .css 1)

## Summary
- 960 nodes · 1914 edges · 50 communities (46 shown, 4 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 79 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7d71ea07`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- Shopify App Template - React Router README
- app.orders.$id.jsx
- Server Rendering Runtime
- choices-request.test.js
- Option importer: design
- Prisma session storage
- TypeScript Editor Config
- NPM Scripts
- PNPM Build Allowlist
- eslint-import-resolver-typescript@^3.10.1
- lib.js
- Cursor MCP Config
- Claude MCP Config
- shopify-writes.server.js
- fakeShop
- eslint-plugin-react-hooks@^4.6.2
- entry.server.jsx
- quote.server.js
- spreadsheet.server.js
- preview.server.js
- @react-router/dev
- exportRows
- devDependencies
- same-product.test.js
- overrides
- start-checkout.server.js
- start-checkout.server.js
- CFS configurator MVP: acceptance report
- ref_node_assert
- app.import.jsx
- Option importer stage 3: write and restore. Design
- e4b-basket-check.js
- Polaris web components 2.x (polaris-2.js)
- @shopify/shopify-app-template-remix
- qs forced to ^6.16.0
- shopify.app.toml
- polarisUrl option
- Shopify CLI
- app/shopify.server.ts shopify const
- quote.server.js
- .graphqlrc.js
- shopify.server.js
- quote-fargo.test.js
- build-product.test.js
- e6d-status-check.js
- quote-accessories.test.js
- find-products.server.js
- current-options.test.js

## God Nodes (most connected - your core abstractions)
1. `loadConfigurableProduct()` - 28 edges
2. `exportRows()` - 21 edges
3. `buildProduct()` - 21 edges
4. `authenticate` - 20 edges
5. `quoteConfiguration()` - 19 edges
6. `compilerOptions` - 18 edges
7. `scripts` - 18 edges
8. `checkProduct()` - 17 edges
9. `prepareImport()` - 17 edges
10. `Option importer: design` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Task 1: Read entry IDs and option codes from Shopify` --references--> `fakeShop()`  [INFERRED]
  docs/superpowers/plans/2026-11-12-option-importer-write.md → test/import/fake-shop.js
- `Task 2: Check and type each row` --references--> `checkRows()`  [INFERRED]
  docs/superpowers/plans/2026-11-12-option-importer-preview.md → app/import/check-rows.js
- `Task 3: Check shared options against live products` --references--> `prepareImport()`  [INFERRED]
  docs/superpowers/plans/2026-11-12-option-importer-write.md → app/import/preview.server.js
- `Option importer, stage 1 (read-only preview) Implementation Plan` --references--> `loadConfigurableProduct()`  [INFERRED]
  docs/superpowers/plans/2026-11-12-option-importer-preview.md → app/pricing/load-product.server.js
- `Task 3: Build a product's option data, and turn it back into rows` --references--> `loadConfigurableProduct()`  [INFERRED]
  docs/superpowers/plans/2026-11-12-option-importer-preview.md → app/pricing/load-product.server.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Expiring offline token session upgrade** — changelog_shopify_shopify_app_react_router, changelog_shopify_shopify_app_session_storage_prisma, changelog_session_refresh_token_fields, changelog_expiring_offline_access_tokens [EXTRACTED 1.00]
- **Production hosting options** — readme_google_cloud_run_deployment, readme_fly_io_deployment, readme_render_deployment, readme_manual_deployment_guide [EXTRACTED 1.00]
- **Webhook subscription pitfalls and remedy** — readme_app_specific_webhooks, readme_afterauth_shop_specific_webhooks, readme_admin_created_webhook_hmac_failure, readme_cli_webhook_admin_undefined [INFERRED 0.85]

## Communities (50 total, 4 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.12
Nodes (16): author, eslint-plugin-import@^2.32.0, typescript@^5.9.3, @typescript-eslint/parser@^6.21.0, engines, node, name, private (+8 more)

### Community 1 - "Shopify App Template - React Router README"
Cohesion: 0.15
Nodes (14): Shopify AI Toolkit, Shopify app development agent guide, Shopify Dev MCP added to template, CLAUDE.md agent instructions, app/routes/app._index.tsx example route, Fly.io deployment, Google Cloud Run deployment, .graphqlrc.ts GraphQL hints config (+6 more)

### Community 2 - "app.orders.$id.jsx"
Cohesion: 0.13
Nodes (29): adminOrderUrl(), dateTime(), discountText(), groupName(), MATCH, matchBadge(), money(), needsAttention() (+21 more)

### Community 3 - "Server Rendering Runtime"
Cohesion: 0.12
Nodes (16): dependencies, prisma@^6.16.3, @prisma/client@^6.16.3, @react-router/fs-routes@7.18.2, @react-router/serve@7.18.2, @shopify/app-bridge-react@^4.2.4, @shopify/cli@4.9.3, @shopify/shopify-app-react-router@^4.0.0 (+8 more)

### Community 4 - "choices-request.test.js"
Cohesion: 0.20
Nodes (13): cardOf(), handleChoicesRequest(), refuse(), loader(), reply(), allChoices, ask(), extraFabrics (+5 more)

### Community 5 - "Option importer: design"
Cohesion: 0.10
Nodes (20): Build order, Builder's notes (calls made by Claude, not the user), Checks on upload (each one is an error with its row), Choice identity, Done when, Example, Goals, How products and sizes are found (+12 more)

### Community 6 - "Prisma session storage"
Cohesion: 0.25
Nodes (6): Session refreshToken and refreshTokenExpires fields, @shopify/shopify-app-session-storage-prisma, prisma/schema.prisma, Prisma session storage, SessionStorage adapter package, SQLite default database

### Community 7 - "TypeScript Editor Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, allowSyntheticDefaultImports, baseUrl, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+11 more)

### Community 8 - "NPM Scripts"
Cohesion: 0.11
Nodes (18): scripts, build, config:link, config:use, deploy, dev, docker-start, env (+10 more)

### Community 9 - "PNPM Build Allowlist"
Cohesion: 0.20
Nodes (9): allowBuilds, esbuild, @parcel/watcher, prisma, @prisma/client, @prisma/engines, unrs-resolver, packages (+1 more)

### Community 11 - "lib.js"
Cohesion: 0.17
Nodes (11): DRAFT_FIELDS, execute(), loadResults(), NATURAL_GOLD_VARIANT, read(), RESULTS, saveResult(), SPIKE_TAG (+3 more)

### Community 12 - "Cursor MCP Config"
Cohesion: 0.50
Nodes (3): npx, @shopify/dev-mcp, shopify-dev-mcp

### Community 13 - "Claude MCP Config"
Cohesion: 0.50
Nodes (3): npx, @shopify/dev-mcp, shopify-dev-mcp

### Community 14 - "shopify-writes.server.js"
Cohesion: 0.07
Nodes (41): callShopify(), CREATE_ENTRY_MUTATION, createEntries(), DELETE_ENTRY_MUTATION, deleteEntries(), ENTRY_BY_HANDLE_QUERY, ENTRY_LISTED_QUERY, entryHandle() (+33 more)

### Community 16 - "fakeShop"
Cohesion: 0.17
Nodes (11): asEntry(), asShopify(), fakeShop(), searchEntries(), fakeStore(), load(), setup(), check() (+3 more)

### Community 18 - "entry.server.jsx"
Cohesion: 0.20
Nodes (9): handleRequest(), streamTimeout, addDocumentResponseHeaders, isbot@^5.1.31, react-dom@^18.3.1, @react-router/node@7.18.2, isbot, react-dom (+1 more)

### Community 20 - "quote.server.js"
Cohesion: 0.27
Nodes (11): cheapestSelection(), CHECKED_PRODUCTS_QUERY, checkProduct(), checkProducts(), reasonOf(), REASONS, quoteConfiguration(), resolveAssignment() (+3 more)

### Community 21 - "spreadsheet.server.js"
Cohesion: 0.11
Nodes (24): asValues(), CellProblem, cellText(), CHOICE_COLUMNS, GROUP_COLUMNS, normalise(), readSheet(), readWorkbook() (+16 more)

### Community 22 - "preview.server.js"
Cohesion: 0.10
Nodes (31): checkChoice(), checkGroup(), checkRows(), parseSizePrices(), productId(), rowChecker(), TYPES, groupsPreview() (+23 more)

### Community 23 - "@react-router/dev"
Cohesion: 0.29
Nodes (6): @react-router/dev@7.18.2, vite-tsconfig-paths@^5.1.4, vite@^6.3.6, @react-router/dev, vite, vite-tsconfig-paths

### Community 24 - "exportRows"
Cohesion: 0.13
Nodes (17): exportRows(), priceColumns(), sheetValues(), TYPE_NAMES, writeWorkbook(), Global Constraints, Option importer stage 2: Download current options. Implementation plan, Review Focus (+9 more)

### Community 25 - "devDependencies"
Cohesion: 0.09
Nodes (23): devDependencies, eslint@^8.57.1, eslint-plugin-jsx-a11y@^6.10.2, eslint-plugin-react@^7.37.5, graphql-config@^5.1.1, prettier@^3.6.2, @shopify/polaris-types@^2.0.0, @types/eslint@^9.6.1 (+15 more)

### Community 26 - "same-product.test.js"
Cohesion: 0.50
Nodes (3): cfsIdOf(), FIXTURES, rebuild()

### Community 27 - "overrides"
Cohesion: 0.40
Nodes (5): overrides, p-map, qs, pnpm, overrides

### Community 28 - "start-checkout.server.js"
Cohesion: 0.06
Nodes (43): checkBasket(), checkLine(), loadProducts(), quantityByVariant(), stockIsLimited(), attemptTag(), createDraft(), draftInput() (+35 more)

### Community 29 - "start-checkout.server.js"
Cohesion: 0.09
Nodes (30): removePaidLines(), lineAttributes(), findAttempt(), isUniqueClash(), saveOrderSnapshot(), TRANSACTION_LIMITS, attemptIdOf(), buildSnapshot() (+22 more)

### Community 30 - "CFS configurator MVP: acceptance report"
Cohesion: 0.06
Nodes (29): 1. Identifiers and breakdowns: Pass, 2. Basket cases: Pass, 3. Shopify discounts: Pass for percentage discounts, 4. Stock and duplicates: Pass, 5. Saved order record: Pass, two fields missing, 6. Price bypass, shipping and VAT, payment methods: Open, CFS configurator MVP: acceptance report, Evidence orders (+21 more)

### Community 31 - "ref_node_assert"
Cohesion: 0.14
Nodes (5): naturalGold, naturalGold, priceChecks, quote(), FIXTURES

### Community 32 - "app.import.jsx"
Cohesion: 0.07
Nodes (48): backgroundRunnerFor(), beginRun(), messageFor(), runPlans(), runView(), startRestore(), writesAllowed(), MAX_FILE_BYTES (+40 more)

### Community 33 - "Option importer stage 3: write and restore. Design"
Cohesion: 0.15
Nodes (12): Database (new tables, applied by the Render deploy as before), How a product is written (both options), Not in this stage, Option importer stage 3: write and restore. Design, Permission and setup steps for the user, Restore, Running an import, Tests and trial (+4 more)

### Community 34 - "e4b-basket-check.js"
Cohesion: 0.06
Nodes (63): add(), changed(), changeQuantity(), handleBasketRequest(), matches(), NOT_FOUND, numericId(), publicBasket() (+55 more)

### Community 35 - "Polaris web components 2.x (polaris-2.js)"
Cohesion: 0.25
Nodes (7): Admin intents, App Bridge web components, Polaris web components 2.x (polaris-2.js), @shopify/shopify-app-template-react-router changelog, @shopify/polaris-types, @shopify/shopify-app-react-router, Polaris Web Components

### Community 36 - "@shopify/shopify-app-template-remix"
Cohesion: 0.25
Nodes (5): productVariantsBulkUpdate, Scopes Update Webhook, SHOP_REDACT webhook without admin context, @shopify/shopify-app-template-remix, Shopify Remix app template

### Community 37 - "qs forced to ^6.16.0"
Cohesion: 0.29
Nodes (5): Action-origin validation, CVE-2026-82417, CVE-2026-82562, @react-router/serve, React Router

### Community 38 - "shopify.app.toml"
Cohesion: 0.33
Nodes (5): Declarative metaobject definition, Declarative product metafield definition, Admin-created webhook HMAC validation failure, afterAuth shop-specific webhook registration, shopify.app.toml

### Community 39 - "polarisUrl option"
Cohesion: 0.40
Nodes (3): AppProvider, polarisUrl option, shopifyApp

### Community 40 - "Shopify CLI"
Cohesion: 0.40
Nodes (4): Admin object undefined on CLI-triggered webhooks, Cloudflare tunnel streaming limitation, Localhost-based development, Shopify CLI

### Community 42 - "quote.server.js"
Cohesion: 0.16
Nodes (13): accessoryLimit(), ASSIGNMENT_FIELDS, CHOICE_KINDS, displayOf(), GROUP_FIELDS, MAPPING_FIELDS, priceProduct(), quoteOrdinaryProduct() (+5 more)

### Community 44 - ".graphqlrc.js"
Cohesion: 0.33
Nodes (3): config, @shopify/api-codegen-preset@^1.2.0, @shopify/api-codegen-preset

### Community 46 - "shopify.server.js"
Cohesion: 0.06
Nodes (20): decrypt(), encrypt(), EncryptedSessionStorage, parseKey(), loginErrorMessage(), action(), loader(), loginErrorMessage() (+12 more)

### Community 49 - "quote-fargo.test.js"
Cohesion: 0.25
Nodes (9): cents(), fargo, groups, inGroup(), LIVE_CFS, pick(), priceOf(), quote() (+1 more)

### Community 52 - "build-product.test.js"
Cohesion: 0.16
Nodes (15): assignmentsFor(), buildProduct(), checkChoices(), checkGroups(), checkRequiredGroups(), choiceIdFor(), sizeIdOf(), workflowFor() (+7 more)

### Community 53 - "e6d-status-check.js"
Cohesion: 0.12
Nodes (17): copyStatus(), orderIdOf(), updateOrderStatus(), CHANGED_ORDERS_QUERY, handleOrder(), PAID_STATUSES, recoverOrders(), recoverAllShops() (+9 more)

### Community 55 - "quote-accessories.test.js"
Cohesion: 0.38
Nodes (5): LIVE_CFS_ACCESSORIES, LIVE_CFS_PLAIN, load(), quote(), variantFor()

### Community 57 - "find-products.server.js"
Cohesion: 0.38
Nodes (3): findOne(), findProducts(), VARIANTS_BY_SKU_QUERY

### Community 58 - "current-options.test.js"
Cohesion: 0.26
Nodes (8): currentOptionsWorkbook(), londonDate(), parseProductIds(), loader(), graphql, loft, naturalGold, NOW

## Knowledge Gaps
- **28 isolated node(s):** `npx`, `@shopify/dev-mcp`, `npx`, `@shopify/dev-mcp`, `Shopify Dev MCP added to template` (+23 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 368 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `exceljs` connect `spreadsheet.server.js` to `package.json`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `loadConfigurableProduct()` (e.g. with `Option importer, stage 1 (read-only preview) Implementation Plan` and `Task 3: Build a product's option data, and turn it back into rows`) actually correct?**
  _`loadConfigurableProduct()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `npx`, `@shopify/dev-mcp`, `npx` to the rest of the system?**
  _28 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Why does `@shopify/shopify-app-react-router` connect `shopify.server.js` to `app.import.jsx`, `package.json`, `app.orders.$id.jsx`, `Server Rendering Runtime`, `.graphqlrc.js`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `exportRows()` (e.g. with `Option importer stage 2: Download current options. Implementation plan` and `Task 1: Build the current-options workbook`) actually correct?**
  _`exportRows()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Should `app.orders.$id.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12564102564102564 - nodes in this community are weakly interconnected._
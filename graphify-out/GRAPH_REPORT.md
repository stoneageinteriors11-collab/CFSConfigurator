# Graph Report - cfs-configurator  (2026-11-17)

## Corpus Check
- 144 files · ~108,379 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 8, .toml 3, .css 1)

## Summary
- 998 nodes · 2040 edges · 67 communities (61 shown, 6 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 81 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `19350da3`
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
- shared-options.server.js
- lib.js
- Cursor MCP Config
- Claude MCP Config
- shopify-writes.server.js
- preview.server.js
- @shopify/shopify-app-react-router
- same-product.test.js
- recover-orders.test.js
- start-import.test.js
- spreadsheet.server.js
- buildProduct
- @react-router/dev
- exportRows
- devDependencies
- basket-request.server.js
- overrides
- quote-request.server.js
- start-checkout.server.js
- CFS configurator MVP: acceptance report
- app.products.jsx
- app.import.jsx
- Option importer stage 3: write and restore. Design
- basket.server.js
- Polaris web components 2.x (polaris-2.js)
- @shopify/shopify-app-template-remix
- qs forced to ^6.16.0
- shopify.app.toml
- polarisUrl option
- Shopify CLI
- app/shopify.server.ts shopify const
- product-check.server.js
- checkout-request.server.js
- EncryptedSessionStorage
- current-options.test.js
- entry.server.jsx
- ref_node_fs
- graphql-config@^5.1.1
- start-checkout.server.js
- check-rows.js
- accessories-flow.test.js
- costs.test.js
- shopify.server.js
- app.orders._index.jsx
- copy-cart.test.js
- quote-fargo.test.js
- check-basket.test.js
- quote.server.js
- ref_node_assert
- checkout-request.test.js
- quote.test.js
- quote-ordinary.test.js
- quote-accessories.test.js
- app.products.jsx
- .graphqlrc.js
- display-order.test.js

## God Nodes (most connected - your core abstractions)
1. `loadConfigurableProduct()` - 29 edges
2. `buildProduct()` - 26 edges
3. `exportRows()` - 25 edges
4. `authenticate` - 20 edges
5. `prepareImport()` - 19 edges
6. `quoteConfiguration()` - 19 edges
7. `Option importer: design` - 18 edges
8. `compilerOptions` - 18 edges
9. `scripts` - 18 edges
10. `checkProduct()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Task 2: Check and type each row` --references--> `checkRows()`  [INFERRED]
  docs/superpowers/plans/2026-11-12-option-importer-preview.md → app/import/check-rows.js
- `Task 3: Check shared options against live products` --references--> `prepareImport()`  [INFERRED]
  docs/superpowers/plans/2026-11-12-option-importer-write.md → app/import/preview.server.js
- `Task 1: Read entry IDs and option codes from Shopify` --references--> `fakeShop()`  [INFERRED]
  docs/superpowers/plans/2026-11-12-option-importer-write.md → test/import/fake-shop.js
- `Task 7: Import button, progress and history` --references--> `runView()`  [INFERRED]
  docs/superpowers/plans/2026-11-12-option-importer-write.md → app/import/import-run.server.js
- `Task 6: Import runs, backups and restore` --references--> `productId()`  [INFERRED]
  docs/superpowers/plans/2026-11-12-option-importer-write.md → app/import/check-rows.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Expiring offline token session upgrade** — changelog_shopify_shopify_app_react_router, changelog_shopify_shopify_app_session_storage_prisma, changelog_session_refresh_token_fields, changelog_expiring_offline_access_tokens [EXTRACTED 1.00]
- **Production hosting options** — readme_google_cloud_run_deployment, readme_fly_io_deployment, readme_render_deployment, readme_manual_deployment_guide [EXTRACTED 1.00]
- **Webhook subscription pitfalls and remedy** — readme_app_specific_webhooks, readme_afterauth_shop_specific_webhooks, readme_admin_created_webhook_hmac_failure, readme_cli_webhook_admin_undefined [INFERRED 0.85]

## Communities (67 total, 6 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.12
Nodes (16): author, eslint-plugin-import@^2.32.0, @shopify/polaris-types@^2.0.0, @types/eslint@^9.6.1, engines, node, name, private (+8 more)

### Community 1 - "Shopify App Template - React Router README"
Cohesion: 0.15
Nodes (14): Shopify AI Toolkit, Shopify app development agent guide, Shopify Dev MCP added to template, CLAUDE.md agent instructions, app/routes/app._index.tsx example route, Fly.io deployment, Google Cloud Run deployment, .graphqlrc.ts GraphQL hints config (+6 more)

### Community 2 - "app.orders.$id.jsx"
Cohesion: 0.28
Nodes (16): adminOrderUrl(), dateTime(), discountText(), groupName(), MATCH, matchBadge(), money(), needsAttention() (+8 more)

### Community 3 - "Server Rendering Runtime"
Cohesion: 0.11
Nodes (18): dependencies, prisma@^6.16.3, @prisma/client@^6.16.3, react@^18.3.1, @react-router/fs-routes@7.18.2, @react-router/serve@7.18.2, @shopify/app-bridge-react@^4.2.4, @shopify/cli@4.9.3 (+10 more)

### Community 4 - "choices-request.test.js"
Cohesion: 0.20
Nodes (13): cardOf(), handleChoicesRequest(), refuse(), loader(), reply(), allChoices, ask(), extraFabrics (+5 more)

### Community 5 - "Option importer: design"
Cohesion: 0.09
Nodes (21): Build order, Builder's notes (calls made by Claude, not the user), Checks on upload (each one is an error with its row), Choice identity, Costs (added 17 November 2026), Done when, Example, Goals (+13 more)

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

### Community 10 - "shared-options.server.js"
Cohesion: 0.17
Nodes (16): checkSharedOptions(), detailsOf(), LIVE_OPTIONS_QUERY, numberOf(), outside(), productList(), queriesFor(), quoted() (+8 more)

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
Cohesion: 0.06
Nodes (41): callShopify(), CREATE_ENTRY_MUTATION, createEntries(), DELETE_ENTRY_MUTATION, ENTRY_BY_HANDLE_QUERY, ENTRY_LISTED_QUERY, entryHandle(), fieldsFor() (+33 more)

### Community 16 - "preview.server.js"
Cohesion: 0.21
Nodes (11): groupsPreview(), prepareImport(), previewImport(), refused(), comparable(), sameProduct(), Task 2: Mark products the sheet does not change, graphql (+3 more)

### Community 17 - "@shopify/shopify-app-react-router"
Cohesion: 0.23
Nodes (7): loginErrorMessage(), action(), loader(), loginErrorMessage(), action(), login, @shopify/shopify-app-react-router

### Community 18 - "same-product.test.js"
Cohesion: 0.50
Nodes (3): cfsIdOf(), FIXTURES, rebuild()

### Community 19 - "recover-orders.test.js"
Cohesion: 0.12
Nodes (16): copyStatus(), orderIdOf(), updateOrderStatus(), CHANGED_ORDERS_QUERY, handleOrder(), PAID_STATUSES, recoverOrders(), recoverAllShops() (+8 more)

### Community 20 - "start-import.test.js"
Cohesion: 0.27
Nodes (5): beginRun(), startImport(), Task 7: Import button, progress and history, naturalGold, start()

### Community 21 - "spreadsheet.server.js"
Cohesion: 0.09
Nodes (27): asValues(), CellProblem, cellText(), CHOICE_COLUMNS, GROUP_COLUMNS, normalise(), OPTIONAL_COLUMNS, readSheet() (+19 more)

### Community 22 - "buildProduct"
Cohesion: 0.14
Nodes (18): assignmentsFor(), buildProduct(), checkChoices(), checkGroups(), checkRequiredGroups(), choiceIdFor(), costsFor(), hasCost() (+10 more)

### Community 23 - "@react-router/dev"
Cohesion: 0.29
Nodes (6): @react-router/dev@7.18.2, vite-tsconfig-paths@^5.1.4, vite@^6.3.6, @react-router/dev, vite, vite-tsconfig-paths

### Community 24 - "exportRows"
Cohesion: 0.19
Nodes (18): currentOptionsWorkbook(), londonDate(), parseProductIds(), costsOf(), exportRows(), priceColumns(), sheetValues(), sizeList() (+10 more)

### Community 25 - "devDependencies"
Cohesion: 0.08
Nodes (25): devDependencies, eslint@^8.57.1, eslint-import-resolver-typescript@^3.10.1, eslint-plugin-jsx-a11y@^6.10.2, eslint-plugin-react@^7.37.5, eslint-plugin-react-hooks@^4.6.2, prettier@^3.6.2, @types/node@^22.18.8 (+17 more)

### Community 26 - "basket-request.server.js"
Cohesion: 0.22
Nodes (16): add(), changed(), changeQuantity(), handleBasketRequest(), matches(), NOT_FOUND, numericId(), publicBasket() (+8 more)

### Community 27 - "overrides"
Cohesion: 0.40
Nodes (5): overrides, p-map, qs, pnpm, overrides

### Community 28 - "quote-request.server.js"
Cohesion: 0.19
Nodes (13): handleQuoteRequest(), isPlainObject(), matches(), quoteSelection(), readQuantityParams(), refuse(), priceProduct(), loader() (+5 more)

### Community 29 - "start-checkout.server.js"
Cohesion: 0.09
Nodes (30): removePaidLines(), lineAttributes(), findAttempt(), isUniqueClash(), saveOrderSnapshot(), TRANSACTION_LIMITS, attemptIdOf(), buildSnapshot() (+22 more)

### Community 30 - "CFS configurator MVP: acceptance report"
Cohesion: 0.06
Nodes (29): 1. Identifiers and breakdowns: Pass, 2. Basket cases: Pass, 3. Shopify discounts: Pass for percentage discounts, 4. Stock and duplicates: Pass, 5. Saved order record: Pass, two fields missing, 6. Price bypass, shipping and VAT, payment methods: Open, CFS configurator MVP: acceptance report, Evidence orders (+21 more)

### Community 32 - "app.import.jsx"
Cohesion: 0.06
Nodes (58): backgroundRunnerFor(), cleanupRun(), hasOptionsToRestore(), messageFor(), optionKey(), runPlans(), runView(), startRestore() (+50 more)

### Community 33 - "Option importer stage 3: write and restore. Design"
Cohesion: 0.15
Nodes (12): Database (new tables, applied by the Render deploy as before), How a product is written (both options), Not in this stage, Option importer stage 3: write and restore. Design, Permission and setup steps for the user, Restore, Running an import, Tests and trial (+4 more)

### Community 34 - "basket.server.js"
Cohesion: 0.20
Nodes (19): addLine(), changeBasket(), configurationKey(), hashToken(), MAX_BASKET_LINES, MAX_LINE_QUANTITY, newBasketToken(), pricedFields() (+11 more)

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

### Community 42 - "product-check.server.js"
Cohesion: 0.29
Nodes (10): cheapestSelection(), CHECKED_PRODUCTS_QUERY, checkProduct(), reasonOf(), REASONS, quoteConfiguration(), resolveAssignment(), toPennies() (+2 more)

### Community 43 - "checkout-request.server.js"
Cohesion: 0.22
Nodes (18): getBasket(), removeLine(), validQuantity(), cartRefused(), handleCheckoutRequest(), needsReview(), publicProblem(), readRequest() (+10 more)

### Community 44 - "EncryptedSessionStorage"
Cohesion: 0.20
Nodes (4): decrypt(), encrypt(), EncryptedSessionStorage, parseKey()

### Community 45 - "current-options.test.js"
Cohesion: 0.21
Nodes (9): graphql, loft, naturalGold, NOW, asEntry(), asShopify(), fakeShop(), searchEntries() (+1 more)

### Community 46 - "entry.server.jsx"
Cohesion: 0.20
Nodes (9): handleRequest(), streamTimeout, addDocumentResponseHeaders, isbot@^5.1.31, react-dom@^18.3.1, @react-router/node@7.18.2, isbot, react-dom (+1 more)

### Community 47 - "ref_node_fs"
Cohesion: 0.32
Nodes (3): findOne(), findProducts(), VARIANTS_BY_SKU_QUERY

### Community 49 - "start-checkout.server.js"
Cohesion: 0.20
Nodes (12): attemptTag(), createDraft(), draftInput(), draftLine(), findDraft(), finishAttempt(), shopify(), success() (+4 more)

### Community 50 - "check-rows.js"
Cohesion: 0.25
Nodes (13): checkChoice(), checkGroup(), checkRows(), parseSizePrices(), productId(), rowChecker(), TYPES, CHOICE (+5 more)

### Community 51 - "accessories-flow.test.js"
Cohesion: 0.24
Nodes (9): checkBasket(), checkLine(), loadProducts(), quantityByVariant(), stockIsLimited(), selectionRequest(), loft, PRODUCT (+1 more)

### Community 52 - "costs.test.js"
Cohesion: 0.21
Nodes (8): cents(), costWarnings(), PARTS, pounds(), sizesOf(), naturalGold, noCost, rebuild()

### Community 53 - "shopify.server.js"
Cohesion: 0.13
Nodes (9): action(), reply(), action(), reply(), apiVersion, authenticate, registerWebhooks, sessionStorage (+1 more)

### Community 54 - "app.orders._index.jsx"
Cohesion: 0.33
Nodes (8): countNeedingAttention(), listOrders(), NEEDS_ATTENTION, PAGE_SIZE, pageOf(), viewOf(), loader(), pageUrl()

### Community 55 - "copy-cart.test.js"
Cohesion: 0.22
Nodes (7): BED, copy(), product(), ref, savedMattress, shopify(), variantGid()

### Community 56 - "quote-fargo.test.js"
Cohesion: 0.25
Nodes (9): cents(), fargo, groups, inGroup(), LIVE_CFS, pick(), priceOf(), quote() (+1 more)

### Community 57 - "check-basket.test.js"
Cohesion: 0.27
Nodes (7): check(), everything(), fixture, shop(), shopifyBed(), shopifyMattress(), STOCK

### Community 58 - "quote.server.js"
Cohesion: 0.28
Nodes (8): accessoryLimit(), ASSIGNMENT_FIELDS, CHOICE_KINDS, GROUP_FIELDS, MAPPING_FIELDS, unknownField(), unsupportedReason(), WORKFLOW_FIELDS

### Community 60 - "checkout-request.test.js"
Cohesion: 0.25
Nodes (4): fakeShopify(), product(), send(), TOKEN

### Community 61 - "quote.test.js"
Cohesion: 0.25
Nodes (3): naturalGold, priceChecks, quote()

### Community 62 - "quote-ordinary.test.js"
Cohesion: 0.33
Nodes (4): displayOf(), quoteOrdinaryProduct(), quote(), variant

### Community 63 - "quote-accessories.test.js"
Cohesion: 0.38
Nodes (5): LIVE_CFS_ACCESSORIES, LIVE_CFS_PLAIN, load(), quote(), variantFor()

### Community 64 - "app.products.jsx"
Cohesion: 0.47
Nodes (4): checkProducts(), adminProductUrl(), loader(), ProductCheck()

### Community 65 - ".graphqlrc.js"
Cohesion: 0.33
Nodes (3): config, @shopify/api-codegen-preset@^1.2.0, @shopify/api-codegen-preset

## Knowledge Gaps
- **28 isolated node(s):** `npx`, `@shopify/dev-mcp`, `npx`, `@shopify/dev-mcp`, `Shopify Dev MCP added to template` (+23 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 378 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `exceljs` connect `spreadsheet.server.js` to `package.json`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `loadConfigurableProduct()` (e.g. with `Option importer, stage 1 (read-only preview) Implementation Plan` and `Task 3: Build a product's option data, and turn it back into rows`) actually correct?**
  _`loadConfigurableProduct()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `npx`, `@shopify/dev-mcp`, `npx` to the rest of the system?**
  _28 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Why does `@shopify/shopify-app-react-router` connect `@shopify/shopify-app-react-router` to `app.import.jsx`, `app.products.jsx`, `app.orders.$id.jsx`, `.graphqlrc.js`, `package.json`, `Server Rendering Runtime`, `EncryptedSessionStorage`, `shopify.server.js`, `app.orders._index.jsx`, `app.products.jsx`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `exportRows()` (e.g. with `Option importer stage 2: Download current options. Implementation plan` and `Task 1: Build the current-options workbook`) actually correct?**
  _`exportRows()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Should `Server Rendering Runtime` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
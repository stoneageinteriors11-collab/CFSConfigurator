# Graph Report - cfs-configurator  (2026-11-20)

## Corpus Check
- 159 files · ~112,231 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 8, .toml 3, .css 1)

## Summary
- 1050 nodes · 2166 edges · 54 communities (50 shown, 4 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 81 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ab7eb4bd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- engines
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
- staff.quote.jsx
- same-product.test.js
- recover-orders.test.js
- Promotion questions for the CFS team
- exportRows
- buildProduct
- @react-router/dev
- resolutions
- devDependencies
- basket-request.server.js
- overrides
- quote-request.server.js
- start-checkout.server.js
- CFS configurator MVP: acceptance report
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
- quote.server.js
- checkout-request.server.js
- entry.server.jsx
- start-checkout.server.js
- check-rows.js
- costs.test.js
- shopify.server.js
- copy-cart.test.js
- quote-fargo.test.js
- ref_node_assert
- checkout-request.test.js
- quote-accessories.test.js
- .graphqlrc.js

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
- `Task 6: Import runs, backups and restore` --references--> `writeProduct()`  [INFERRED]
  docs/superpowers/plans/2026-11-12-option-importer-write.md → app/import/write-product.server.js
- `Option importer, stage 1 (read-only preview) Implementation Plan` --references--> `loadConfigurableProduct()`  [INFERRED]
  docs/superpowers/plans/2026-11-12-option-importer-preview.md → app/pricing/load-product.server.js
- `Task 3: Build a product's option data, and turn it back into rows` --references--> `loadConfigurableProduct()`  [INFERRED]
  docs/superpowers/plans/2026-11-12-option-importer-preview.md → app/pricing/load-product.server.js
- `Task 4: Find the Shopify products` --references--> `loadConfigurableProduct()`  [INFERRED]
  docs/superpowers/plans/2026-11-12-option-importer-preview.md → app/pricing/load-product.server.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Expiring offline token session upgrade** — changelog_shopify_shopify_app_react_router, changelog_shopify_shopify_app_session_storage_prisma, changelog_session_refresh_token_fields, changelog_expiring_offline_access_tokens [EXTRACTED 1.00]
- **Production hosting options** — readme_google_cloud_run_deployment, readme_fly_io_deployment, readme_render_deployment, readme_manual_deployment_guide [EXTRACTED 1.00]
- **Webhook subscription pitfalls and remedy** — readme_app_specific_webhooks, readme_afterauth_shop_specific_webhooks, readme_admin_created_webhook_hmac_failure, readme_cli_webhook_admin_undefined [INFERRED 0.85]

## Communities (54 total, 4 thin omitted)

### Community 1 - "Shopify App Template - React Router README"
Cohesion: 0.15
Nodes (14): Shopify AI Toolkit, Shopify app development agent guide, Shopify Dev MCP added to template, CLAUDE.md agent instructions, app/routes/app._index.tsx example route, Fly.io deployment, Google Cloud Run deployment, .graphqlrc.ts GraphQL hints config (+6 more)

### Community 2 - "app.orders.$id.jsx"
Cohesion: 0.18
Nodes (24): adminOrderUrl(), dateTime(), discountText(), groupName(), MATCH, matchBadge(), money(), needsAttention() (+16 more)

### Community 3 - "Server Rendering Runtime"
Cohesion: 0.11
Nodes (18): dependencies, prisma@^6.16.3, @prisma/client@^6.16.3, react@^18.3.1, @react-router/fs-routes@7.18.2, @react-router/serve@7.18.2, @shopify/app-bridge-react@^4.2.4, @shopify/cli@4.9.3 (+10 more)

### Community 4 - "choices-request.test.js"
Cohesion: 0.14
Nodes (20): cardOf(), handleChoicesRequest(), readChoices(), refuse(), loader(), reply(), staffChoices(), allChoices (+12 more)

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
Cohesion: 0.16
Nodes (17): checkSharedOptions(), detailsOf(), LIVE_OPTIONS_QUERY, numberOf(), outside(), productList(), queriesFor(), quoted() (+9 more)

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
Cohesion: 0.05
Nodes (65): cleanupRun(), beginRun(), hasOptionsToRestore(), messageFor(), optionKey(), runPlans(), runView(), startRestore() (+57 more)

### Community 16 - "preview.server.js"
Cohesion: 0.16
Nodes (15): groupsPreview(), prepareImport(), previewImport(), refused(), comparable(), sameProduct(), After all tasks, Global Constraints (+7 more)

### Community 17 - "staff.quote.jsx"
Cohesion: 0.12
Nodes (23): loader(), loader(), action(), graphqlForShop(), staffReply(), unknownShop(), staffGuard(), unauthorized() (+15 more)

### Community 18 - "same-product.test.js"
Cohesion: 0.50
Nodes (3): cfsIdOf(), FIXTURES, rebuild()

### Community 19 - "recover-orders.test.js"
Cohesion: 0.12
Nodes (16): copyStatus(), orderIdOf(), updateOrderStatus(), CHANGED_ORDERS_QUERY, handleOrder(), PAID_STATUSES, recoverOrders(), recoverAllShops() (+8 more)

### Community 20 - "Promotion questions for the CFS team"
Cohesion: 0.33
Nodes (5): 1. What kinds of promotion do you run?, 2. For each one, tell us, 3. Cases that need a clear rule, Promotion questions for the CFS team, Why we ask

### Community 21 - "exportRows"
Cohesion: 0.05
Nodes (56): currentOptionsWorkbook(), londonDate(), parseProductIds(), costsOf(), exportRows(), priceColumns(), sheetValues(), sizeList() (+48 more)

### Community 22 - "buildProduct"
Cohesion: 0.14
Nodes (18): assignmentsFor(), buildProduct(), checkChoices(), checkGroups(), checkRequiredGroups(), choiceIdFor(), costsFor(), hasCost() (+10 more)

### Community 23 - "@react-router/dev"
Cohesion: 0.29
Nodes (6): @react-router/dev@7.18.2, vite-tsconfig-paths@^5.1.4, vite@^6.3.6, @react-router/dev, vite, vite-tsconfig-paths

### Community 25 - "devDependencies"
Cohesion: 0.07
Nodes (39): author, devDependencies, eslint@^8.57.1, eslint-import-resolver-typescript@^3.10.1, eslint-plugin-import@^2.32.0, eslint-plugin-jsx-a11y@^6.10.2, eslint-plugin-react@^7.37.5, eslint-plugin-react-hooks@^4.6.2 (+31 more)

### Community 26 - "basket-request.server.js"
Cohesion: 0.23
Nodes (14): add(), changed(), changeQuantity(), handleBasketRequest(), matches(), NOT_FOUND, numericId(), refuse() (+6 more)

### Community 27 - "overrides"
Cohesion: 0.40
Nodes (5): overrides, p-map, qs, pnpm, overrides

### Community 28 - "quote-request.server.js"
Cohesion: 0.14
Nodes (15): handleQuoteRequest(), isPlainObject(), matches(), quoteSelection(), readQuantityParams(), refuse(), loader(), reply() (+7 more)

### Community 29 - "start-checkout.server.js"
Cohesion: 0.09
Nodes (30): removePaidLines(), lineAttributes(), findAttempt(), isUniqueClash(), saveOrderSnapshot(), TRANSACTION_LIMITS, attemptIdOf(), buildSnapshot() (+22 more)

### Community 30 - "CFS configurator MVP: acceptance report"
Cohesion: 0.06
Nodes (29): 1. Identifiers and breakdowns: Pass, 2. Basket cases: Pass, 3. Shopify discounts: Pass for percentage discounts, 4. Stock and duplicates: Pass, 5. Saved order record: Pass, two fields missing, 6. Price bypass, shipping and VAT, payment methods: Open, CFS configurator MVP: acceptance report, Evidence orders (+21 more)

### Community 32 - "app.import.jsx"
Cohesion: 0.09
Nodes (35): backgroundRunnerFor(), stopRun(), MAX_FILE_BYTES, badgeFor(), BADGES, headline(), ResultBadge(), ResultRows() (+27 more)

### Community 33 - "Option importer stage 3: write and restore. Design"
Cohesion: 0.15
Nodes (12): Database (new tables, applied by the Render deploy as before), How a product is written (both options), Not in this stage, Option importer stage 3: write and restore. Design, Permission and setup steps for the user, Restore, Running an import, Tests and trial (+4 more)

### Community 34 - "basket.server.js"
Cohesion: 0.19
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

### Community 42 - "quote.server.js"
Cohesion: 0.13
Nodes (23): cheapestSelection(), CHECKED_PRODUCTS_QUERY, checkProduct(), reasonOf(), REASONS, accessoryLimit(), ASSIGNMENT_FIELDS, CHOICE_KINDS (+15 more)

### Community 43 - "checkout-request.server.js"
Cohesion: 0.33
Nodes (12): publicBasket(), view(), getBasket(), cartRefused(), handleCheckoutRequest(), needsReview(), publicProblem(), readRequest() (+4 more)

### Community 46 - "entry.server.jsx"
Cohesion: 0.14
Nodes (11): handleRequest(), streamTimeout, addDocumentResponseHeaders, isbot@^5.1.31, react-dom@^18.3.1, react-router@7.18.2, @react-router/node@7.18.2, isbot (+3 more)

### Community 49 - "start-checkout.server.js"
Cohesion: 0.10
Nodes (25): checkBasket(), checkLine(), loadProducts(), quantityByVariant(), stockIsLimited(), attemptTag(), createDraft(), draftInput() (+17 more)

### Community 50 - "check-rows.js"
Cohesion: 0.25
Nodes (13): checkChoice(), checkGroup(), checkRows(), parseSizePrices(), productId(), rowChecker(), TYPES, CHOICE (+5 more)

### Community 52 - "costs.test.js"
Cohesion: 0.21
Nodes (8): cents(), costWarnings(), PARTS, pounds(), sizesOf(), naturalGold, noCost, rebuild()

### Community 53 - "shopify.server.js"
Cohesion: 0.05
Nodes (24): decrypt(), encrypt(), EncryptedSessionStorage, parseKey(), checkProducts(), adminProductUrl(), loader(), ProductCheck() (+16 more)

### Community 55 - "copy-cart.test.js"
Cohesion: 0.16
Nodes (15): setLineQuantity(), validQuantity(), copyCartItems(), isOrdinary(), priceItem(), readCartItems(), upToDate(), validId() (+7 more)

### Community 56 - "quote-fargo.test.js"
Cohesion: 0.25
Nodes (9): cents(), fargo, groups, inGroup(), LIVE_CFS, pick(), priceOf(), quote() (+1 more)

### Community 59 - "ref_node_assert"
Cohesion: 0.10
Nodes (6): naturalGold, naturalGold, naturalGold, priceChecks, quote(), FIXTURES

### Community 60 - "checkout-request.test.js"
Cohesion: 0.25
Nodes (4): fakeShopify(), product(), send(), TOKEN

### Community 63 - "quote-accessories.test.js"
Cohesion: 0.38
Nodes (5): LIVE_CFS_ACCESSORIES, LIVE_CFS_PLAIN, load(), quote(), variantFor()

### Community 65 - ".graphqlrc.js"
Cohesion: 0.33
Nodes (3): config, @shopify/api-codegen-preset@^1.2.0, @shopify/api-codegen-preset

## Knowledge Gaps
- **28 isolated node(s):** `npx`, `@shopify/dev-mcp`, `npx`, `@shopify/dev-mcp`, `Shopify Dev MCP added to template` (+23 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 389 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@shopify/shopify-app-react-router` connect `shopify.server.js` to `app.import.jsx`, `.graphqlrc.js`, `app.orders.$id.jsx`, `Server Rendering Runtime`, `devDependencies`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `loadConfigurableProduct()` (e.g. with `Option importer, stage 1 (read-only preview) Implementation Plan` and `Task 3: Build a product's option data, and turn it back into rows`) actually correct?**
  _`loadConfigurableProduct()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `npx`, `@shopify/dev-mcp`, `npx` to the rest of the system?**
  _28 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Server Rendering Runtime` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Why does `exceljs` connect `exportRows` to `devDependencies`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `exportRows()` (e.g. with `Option importer stage 2: Download current options. Implementation plan` and `Task 1: Build the current-options workbook`) actually correct?**
  _`exportRows()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Should `choices-request.test.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
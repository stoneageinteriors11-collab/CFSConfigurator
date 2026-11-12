# Graph Report - cfs-configurator  (2026-11-12)

## Corpus Check
- 108 files · ~74,334 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 8, .toml 3, .css 1)

## Summary
- 757 nodes · 1390 edges · 47 communities (38 shown, 9 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 44 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a0c30e7c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- Shopify App Template - React Router README
- shopify.server.js
- Server Rendering Runtime
- quote-request.server.js
- Option importer: design
- Prisma session storage
- TypeScript Editor Config
- NPM Scripts
- PNPM Build Allowlist
- build-product.test.js
- lib.js
- Cursor MCP Config
- Claude MCP Config
- loadConfigurableProduct
- check-rows.test.js
- EncryptedSessionStorage
- entry.server.jsx
- graphql-config@^5.1.1
- quote.server.js
- spreadsheet.server.js
- app.orders.$id.jsx
- @shopify/shopify-app-react-router
- order-status.test.js
- devDependencies
- react-router
- overrides
- accessories-flow.test.js
- start-checkout.server.js
- CFS configurator MVP: acceptance report
- @react-router/dev
- checkout-request.test.js
- e4b-basket-check.js
- Polaris web components 2.x (polaris-2.js)
- @shopify/shopify-app-template-remix
- qs forced to ^6.16.0
- shopify.app.toml
- polarisUrl option
- Shopify CLI
- app/shopify.server.ts shopify const
- eslint-import-resolver-typescript@^3.10.1
- eslint-plugin-react-hooks@^4.6.2
- @shopify/api-codegen-preset
- e6d-status-check.js
- .graphqlrc.js

## God Nodes (most connected - your core abstractions)
1. `quoteConfiguration()` - 19 edges
2. `loadConfigurableProduct()` - 18 edges
3. `compilerOptions` - 18 edges
4. `scripts` - 18 edges
5. `Option importer: design` - 17 edges
6. `Shopify App Template - React Router README` - 17 edges
7. `authenticate` - 15 edges
8. `@shopify/shopify-app-react-router` - 14 edges
9. `buildProduct()` - 13 edges
10. `checkProduct()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Task 2: Check and type each row` --references--> `checkRows()`  [INFERRED]
  docs/superpowers/plans/2026-11-12-option-importer-preview.md → app/import/check-rows.js
- `Task 5: The preview pipeline` --references--> `exportRows()`  [INFERRED]
  docs/superpowers/plans/2026-11-12-option-importer-preview.md → app/import/export-rows.js
- `Task 6: Admin page and sample download` --references--> `exportRows()`  [INFERRED]
  docs/superpowers/plans/2026-11-12-option-importer-preview.md → app/import/export-rows.js
- `Option importer, stage 1 (read-only preview) Implementation Plan` --references--> `loadConfigurableProduct()`  [INFERRED]
  docs/superpowers/plans/2026-11-12-option-importer-preview.md → app/pricing/load-product.server.js
- `Option importer, stage 1 (read-only preview) Implementation Plan` --references--> `checkProduct()`  [INFERRED]
  docs/superpowers/plans/2026-11-12-option-importer-preview.md → app/pricing/product-check.server.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Expiring offline token session upgrade** — changelog_shopify_shopify_app_react_router, changelog_shopify_shopify_app_session_storage_prisma, changelog_session_refresh_token_fields, changelog_expiring_offline_access_tokens [EXTRACTED 1.00]
- **Production hosting options** — readme_google_cloud_run_deployment, readme_fly_io_deployment, readme_render_deployment, readme_manual_deployment_guide [EXTRACTED 1.00]
- **Webhook subscription pitfalls and remedy** — readme_app_specific_webhooks, readme_afterauth_shop_specific_webhooks, readme_admin_created_webhook_hmac_failure, readme_cli_webhook_admin_undefined [INFERRED 0.85]

## Communities (47 total, 9 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.13
Nodes (14): author, prettier@^3.6.2, @types/eslint@^9.6.1, engines, node, name, private, resolutions (+6 more)

### Community 1 - "Shopify App Template - React Router README"
Cohesion: 0.15
Nodes (14): Shopify AI Toolkit, Shopify app development agent guide, Shopify Dev MCP added to template, CLAUDE.md agent instructions, app/routes/app._index.tsx example route, Fly.io deployment, Google Cloud Run deployment, .graphqlrc.ts GraphQL hints config (+6 more)

### Community 2 - "shopify.server.js"
Cohesion: 0.15
Nodes (10): action(), reply(), action(), reply(), apiVersion, authenticate, registerWebhooks, sessionStorage (+2 more)

### Community 3 - "Server Rendering Runtime"
Cohesion: 0.11
Nodes (18): dependencies, prisma@^6.16.3, @prisma/client@^6.16.3, react@^18.3.1, @react-router/fs-routes@7.18.2, @react-router/serve@7.18.2, @shopify/app-bridge-react@^4.2.4, @shopify/cli@4.9.3 (+10 more)

### Community 4 - "quote-request.server.js"
Cohesion: 0.20
Nodes (12): handleQuoteRequest(), isPlainObject(), matches(), quoteSelection(), readQuantityParams(), refuse(), loader(), reply() (+4 more)

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

### Community 10 - "build-product.test.js"
Cohesion: 0.09
Nodes (30): assignmentsFor(), buildProduct(), checkChoices(), checkGroups(), checkRequiredGroups(), choiceIdFor(), sizeIdOf(), workflowFor() (+22 more)

### Community 11 - "lib.js"
Cohesion: 0.17
Nodes (11): DRAFT_FIELDS, execute(), loadResults(), NATURAL_GOLD_VARIANT, read(), RESULTS, saveResult(), SPIKE_TAG (+3 more)

### Community 12 - "Cursor MCP Config"
Cohesion: 0.50
Nodes (3): npx, @shopify/dev-mcp, shopify-dev-mcp

### Community 13 - "Claude MCP Config"
Cohesion: 0.50
Nodes (3): npx, @shopify/dev-mcp, shopify-dev-mcp

### Community 14 - "loadConfigurableProduct"
Cohesion: 0.20
Nodes (13): cardOf(), handleChoicesRequest(), refuse(), loader(), reply(), allChoices, ask(), extraFabrics (+5 more)

### Community 16 - "check-rows.test.js"
Cohesion: 0.25
Nodes (13): checkChoice(), checkGroup(), checkRows(), parseSizePrices(), productId(), rowChecker(), TYPES, CHOICE (+5 more)

### Community 17 - "EncryptedSessionStorage"
Cohesion: 0.20
Nodes (4): decrypt(), encrypt(), EncryptedSessionStorage, parseKey()

### Community 18 - "entry.server.jsx"
Cohesion: 0.20
Nodes (9): handleRequest(), streamTimeout, addDocumentResponseHeaders, isbot@^5.1.31, react-dom@^18.3.1, @react-router/node@7.18.2, isbot, react-dom (+1 more)

### Community 20 - "quote.server.js"
Cohesion: 0.06
Nodes (42): cheapestSelection(), CHECKED_PRODUCTS_QUERY, checkProduct(), reasonOf(), REASONS, accessoryLimit(), ASSIGNMENT_FIELDS, CHOICE_KINDS (+34 more)

### Community 21 - "spreadsheet.server.js"
Cohesion: 0.13
Nodes (19): cellText(), CHOICE_COLUMNS, GROUP_COLUMNS, normalise(), readSheet(), readWorkbook(), SAMPLE_CHOICES, SAMPLE_GROUPS (+11 more)

### Community 22 - "app.orders.$id.jsx"
Cohesion: 0.14
Nodes (28): adminOrderUrl(), dateTime(), discountText(), groupName(), MATCH, matchBadge(), money(), needsAttention() (+20 more)

### Community 23 - "@shopify/shopify-app-react-router"
Cohesion: 0.23
Nodes (7): loginErrorMessage(), action(), loader(), loginErrorMessage(), action(), login, @shopify/shopify-app-react-router

### Community 24 - "order-status.test.js"
Cohesion: 0.33
Nodes (6): copyStatus(), orderIdOf(), updateOrderStatus(), action(), paidRecord, update()

### Community 25 - "devDependencies"
Cohesion: 0.09
Nodes (23): devDependencies, eslint@^8.57.1, eslint-plugin-import@^2.32.0, eslint-plugin-jsx-a11y@^6.10.2, eslint-plugin-react@^7.37.5, @shopify/polaris-types@^2.0.0, @types/node@^22.18.8, @types/react@^18.3.25 (+15 more)

### Community 27 - "overrides"
Cohesion: 0.40
Nodes (5): overrides, p-map, qs, pnpm, overrides

### Community 28 - "accessories-flow.test.js"
Cohesion: 0.08
Nodes (31): checkBasket(), checkLine(), loadProducts(), quantityByVariant(), stockIsLimited(), attemptTag(), createDraft(), draftInput() (+23 more)

### Community 29 - "start-checkout.server.js"
Cohesion: 0.09
Nodes (30): removePaidLines(), lineAttributes(), findAttempt(), isUniqueClash(), saveOrderSnapshot(), TRANSACTION_LIMITS, attemptIdOf(), buildSnapshot() (+22 more)

### Community 30 - "CFS configurator MVP: acceptance report"
Cohesion: 0.06
Nodes (29): 1. Identifiers and breakdowns: Pass, 2. Basket cases: Pass, 3. Shopify discounts: Pass for percentage discounts, 4. Stock and duplicates: Pass, 5. Saved order record: Pass, two fields missing, 6. Price bypass, shipping and VAT, payment methods: Open, CFS configurator MVP: acceptance report, Evidence orders (+21 more)

### Community 31 - "@react-router/dev"
Cohesion: 0.29
Nodes (6): @react-router/dev@7.18.2, vite-tsconfig-paths@^5.1.4, vite@^6.3.6, @react-router/dev, vite, vite-tsconfig-paths

### Community 32 - "checkout-request.test.js"
Cohesion: 0.25
Nodes (4): fakeShopify(), product(), send(), TOKEN

### Community 34 - "e4b-basket-check.js"
Cohesion: 0.07
Nodes (59): add(), changed(), changeQuantity(), handleBasketRequest(), matches(), NOT_FOUND, numericId(), publicBasket() (+51 more)

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

### Community 53 - "e6d-status-check.js"
Cohesion: 0.18
Nodes (10): CHANGED_ORDERS_QUERY, handleOrder(), PAID_STATUSES, recoverOrders(), recoverAllShops(), startOrderRecovery(), fullOrder(), money() (+2 more)

## Knowledge Gaps
- **28 isolated node(s):** `npx`, `@shopify/dev-mcp`, `npx`, `@shopify/dev-mcp`, `Shopify Dev MCP added to template` (+23 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 299 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `exceljs` connect `spreadsheet.server.js` to `package.json`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `loadConfigurableProduct()` (e.g. with `Option importer, stage 1 (read-only preview) Implementation Plan` and `Task 3: Build a product's option data, and turn it back into rows`) actually correct?**
  _`loadConfigurableProduct()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `npx`, `@shopify/dev-mcp`, `npx` to the rest of the system?**
  _28 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Why does `@shopify/shopify-app-react-router` connect `@shopify/shopify-app-react-router` to `package.json`, `app._index.jsx`, `shopify.server.js`, `.graphqlrc.js`, `Server Rendering Runtime`, `EncryptedSessionStorage`, `app.orders.$id.jsx`, `react-router`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `shopify.server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14761904761904762 - nodes in this community are weakly interconnected._
- **Why does `scripts` connect `NPM Scripts` to `package.json`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
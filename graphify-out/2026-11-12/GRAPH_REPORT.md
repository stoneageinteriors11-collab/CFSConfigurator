# Graph Report - cfs-configurator  (2026-11-12)

## Corpus Check
- 97 files · ~62,266 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 8, .toml 3, .css 1)

## Summary
- 663 nodes · 1216 edges · 49 communities (38 shown, 11 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8c2e5c0f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- Shopify App Template - React Router README
- shopify.server.js
- Server Rendering Runtime
- entry.server.jsx
- react-router
- Prisma session storage
- TypeScript Editor Config
- NPM Scripts
- PNPM Build Allowlist
- @shopify/shopify-app-react-router
- lib.js
- Cursor MCP Config
- Claude MCP Config
- choices-request.test.js
- _index/route.jsx
- EncryptedSessionStorage
- eslint-import-resolver-typescript@^3.10.1
- quote.server.js
- quoteConfiguration
- app.orders.$id.jsx
- eslint-plugin-react-hooks@^4.6.2
- graphql-config@^5.1.1
- devDependencies
- quote.test.js
- overrides
- accessories-flow.test.js
- start-checkout.server.js
- CFS configurator MVP: acceptance report
- @react-router/dev
- @shopify/api-codegen-preset
- e4b-basket-check.js
- Polaris web components 2.x (polaris-2.js)
- @shopify/shopify-app-template-remix
- qs forced to ^6.16.0
- shopify.app.toml
- polarisUrl option
- Shopify CLI
- app/shopify.server.ts shopify const
- checkout-request.test.js
- ref_node_test
- quote-fargo.test.js
- e6d-status-check.js
- quote-accessories.test.js
- start-checkout.server.js
- copy-cart.test.js
- .graphqlrc.js

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `scripts` - 18 edges
3. `quoteConfiguration()` - 17 edges
4. `Shopify App Template - React Router README` - 17 edges
5. `authenticate` - 15 edges
6. `@shopify/shopify-app-react-router` - 14 edges
7. `loadConfigurableProduct()` - 13 edges
8. `quoteSelection()` - 13 edges
9. `getBasket()` - 13 edges
10. `saveOrderSnapshot()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `quote()` --calls--> `quoteConfiguration()`  [EXTRACTED]
  test/pricing/quote.test.js → app/pricing/quote.server.js
- `send()` --calls--> `handleBasketRequest()`  [EXTRACTED]
  test/basket/basket-request.test.js → app/basket/basket-request.server.js
- `send()` --calls--> `handleCheckoutRequest()`  [EXTRACTED]
  test/checkout/checkout-request.test.js → app/checkout/checkout-request.server.js
- `ask()` --calls--> `handleChoicesRequest()`  [EXTRACTED]
  test/pricing/choices-request.test.js → app/pricing/choices-request.server.js
- `quote()` --calls--> `quoteOrdinaryProduct()`  [EXTRACTED]
  test/pricing/quote-ordinary.test.js → app/pricing/quote.server.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Expiring offline token session upgrade** — changelog_shopify_shopify_app_react_router, changelog_shopify_shopify_app_session_storage_prisma, changelog_session_refresh_token_fields, changelog_expiring_offline_access_tokens [EXTRACTED 1.00]
- **Production hosting options** — readme_google_cloud_run_deployment, readme_fly_io_deployment, readme_render_deployment, readme_manual_deployment_guide [EXTRACTED 1.00]
- **Webhook subscription pitfalls and remedy** — readme_app_specific_webhooks, readme_afterauth_shop_specific_webhooks, readme_admin_created_webhook_hmac_failure, readme_cli_webhook_admin_undefined [INFERRED 0.85]

## Communities (49 total, 11 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.13
Nodes (14): author, prettier@^3.6.2, @types/eslint@^9.6.1, engines, node, name, private, resolutions (+6 more)

### Community 1 - "Shopify App Template - React Router README"
Cohesion: 0.15
Nodes (14): Shopify AI Toolkit, Shopify app development agent guide, Shopify Dev MCP added to template, CLAUDE.md agent instructions, app/routes/app._index.tsx example route, Fly.io deployment, Google Cloud Run deployment, .graphqlrc.ts GraphQL hints config (+6 more)

### Community 2 - "shopify.server.js"
Cohesion: 0.16
Nodes (9): action(), reply(), action(), reply(), apiVersion, authenticate, registerWebhooks, sessionStorage (+1 more)

### Community 3 - "Server Rendering Runtime"
Cohesion: 0.11
Nodes (18): dependencies, prisma@^6.16.3, @prisma/client@^6.16.3, react@^18.3.1, @react-router/fs-routes@7.18.2, @react-router/serve@7.18.2, @shopify/app-bridge-react@^4.2.4, @shopify/cli@4.9.3 (+10 more)

### Community 4 - "entry.server.jsx"
Cohesion: 0.20
Nodes (9): handleRequest(), streamTimeout, addDocumentResponseHeaders, isbot@^5.1.31, react-dom@^18.3.1, @react-router/node@7.18.2, isbot, react-dom (+1 more)

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

### Community 10 - "@shopify/shopify-app-react-router"
Cohesion: 0.46
Nodes (5): loginErrorMessage(), action(), loader(), login, @shopify/shopify-app-react-router

### Community 11 - "lib.js"
Cohesion: 0.17
Nodes (11): DRAFT_FIELDS, execute(), loadResults(), NATURAL_GOLD_VARIANT, read(), RESULTS, saveResult(), SPIKE_TAG (+3 more)

### Community 12 - "Cursor MCP Config"
Cohesion: 0.50
Nodes (3): npx, @shopify/dev-mcp, shopify-dev-mcp

### Community 13 - "Claude MCP Config"
Cohesion: 0.50
Nodes (3): npx, @shopify/dev-mcp, shopify-dev-mcp

### Community 14 - "choices-request.test.js"
Cohesion: 0.20
Nodes (13): cardOf(), handleChoicesRequest(), refuse(), loader(), reply(), allChoices, ask(), extraFabrics (+5 more)

### Community 17 - "EncryptedSessionStorage"
Cohesion: 0.20
Nodes (4): decrypt(), encrypt(), EncryptedSessionStorage, parseKey()

### Community 20 - "quote.server.js"
Cohesion: 0.17
Nodes (12): accessoryLimit(), ASSIGNMENT_FIELDS, CHOICE_KINDS, displayOf(), GROUP_FIELDS, MAPPING_FIELDS, quoteOrdinaryProduct(), unknownField() (+4 more)

### Community 21 - "quoteConfiguration"
Cohesion: 0.29
Nodes (10): cheapestSelection(), CHECKED_PRODUCTS_QUERY, checkProduct(), reasonOf(), REASONS, quoteConfiguration(), resolveAssignment(), toPennies() (+2 more)

### Community 22 - "app.orders.$id.jsx"
Cohesion: 0.14
Nodes (28): adminOrderUrl(), dateTime(), discountText(), groupName(), MATCH, matchBadge(), money(), needsAttention() (+20 more)

### Community 25 - "devDependencies"
Cohesion: 0.09
Nodes (23): devDependencies, eslint@^8.57.1, eslint-plugin-import@^2.32.0, eslint-plugin-jsx-a11y@^6.10.2, eslint-plugin-react@^7.37.5, @shopify/polaris-types@^2.0.0, @types/node@^22.18.8, @types/react@^18.3.25 (+15 more)

### Community 26 - "quote.test.js"
Cohesion: 0.25
Nodes (3): naturalGold, priceChecks, quote()

### Community 27 - "overrides"
Cohesion: 0.40
Nodes (5): overrides, p-map, qs, pnpm, overrides

### Community 28 - "accessories-flow.test.js"
Cohesion: 0.07
Nodes (38): checkBasket(), checkLine(), loadProducts(), quantityByVariant(), stockIsLimited(), loadConfigurableProduct(), parseJson(), readAllChoices() (+30 more)

### Community 29 - "start-checkout.server.js"
Cohesion: 0.09
Nodes (30): removePaidLines(), lineAttributes(), findAttempt(), isUniqueClash(), saveOrderSnapshot(), TRANSACTION_LIMITS, attemptIdOf(), buildSnapshot() (+22 more)

### Community 30 - "CFS configurator MVP: acceptance report"
Cohesion: 0.06
Nodes (29): 1. Identifiers and breakdowns: Pass, 2. Basket cases: Pass, 3. Shopify discounts: Pass for percentage discounts, 4. Stock and duplicates: Pass, 5. Saved order record: Pass, two fields missing, 6. Price bypass, shipping and VAT, payment methods: Open, CFS configurator MVP: acceptance report, Evidence orders (+21 more)

### Community 31 - "@react-router/dev"
Cohesion: 0.29
Nodes (6): @react-router/dev@7.18.2, vite-tsconfig-paths@^5.1.4, vite@^6.3.6, @react-router/dev, vite, vite-tsconfig-paths

### Community 34 - "e4b-basket-check.js"
Cohesion: 0.11
Nodes (50): add(), changed(), changeQuantity(), handleBasketRequest(), matches(), NOT_FOUND, numericId(), publicBasket() (+42 more)

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

### Community 46 - "checkout-request.test.js"
Cohesion: 0.25
Nodes (4): fakeShopify(), product(), send(), TOKEN

### Community 49 - "quote-fargo.test.js"
Cohesion: 0.25
Nodes (9): cents(), fargo, groups, inGroup(), LIVE_CFS, pick(), priceOf(), quote() (+1 more)

### Community 53 - "e6d-status-check.js"
Cohesion: 0.08
Nodes (20): copyStatus(), orderIdOf(), updateOrderStatus(), CHANGED_ORDERS_QUERY, handleOrder(), PAID_STATUSES, recoverOrders(), recoverAllShops() (+12 more)

### Community 55 - "quote-accessories.test.js"
Cohesion: 0.38
Nodes (5): LIVE_CFS_ACCESSORIES, LIVE_CFS_PLAIN, load(), quote(), variantFor()

### Community 56 - "start-checkout.server.js"
Cohesion: 0.20
Nodes (13): attemptTag(), createDraft(), draftInput(), draftLine(), findDraft(), finishAttempt(), shopify(), startCheckout() (+5 more)

### Community 58 - "copy-cart.test.js"
Cohesion: 0.24
Nodes (6): BED, product(), ref, savedMattress, shopify(), variantGid()

## Knowledge Gaps
- **28 isolated node(s):** `npx`, `@shopify/dev-mcp`, `npx`, `@shopify/dev-mcp`, `Shopify Dev MCP added to template` (+23 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 259 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@shopify/shopify-app-react-router` connect `@shopify/shopify-app-react-router` to `package.json`, `shopify.server.js`, `.graphqlrc.js`, `Server Rendering Runtime`, `react-router`, `_index/route.jsx`, `EncryptedSessionStorage`, `app._index.jsx`, `app.orders.$id.jsx`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **What connects `npx`, `@shopify/dev-mcp`, `npx` to the rest of the system?**
  _28 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Why does `@prisma/client` connect `Server Rendering Runtime` to `package.json`, `shopify.server.js`, `app.orders.$id.jsx`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `Server Rendering Runtime` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Why does `react-router` connect `react-router` to `package.json`, `entry.server.jsx`, `@shopify/shopify-app-react-router`, `_index/route.jsx`, `app.orders.$id.jsx`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Should `TypeScript Editor Config` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
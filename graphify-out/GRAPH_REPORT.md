# Graph Report - cfs-configurator  (2026-11-11)

## Corpus Check
- 113 files · ~51,247 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 8, .toml 3, .css 1)

## Summary
- 786 nodes · 1472 edges · 65 communities (55 shown, 10 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `53fe9c66`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- Shopify App Template - React Router README
- shopify.server.js
- Server Rendering Runtime
- DRAFT_FIELDS
- loadResults
- Prisma session storage
- TypeScript Editor Config
- NPM Scripts
- PNPM Build Allowlist
- write
- lib.js
- Cursor MCP Config
- Claude MCP Config
- app.orders.$id.jsx
- b4b-combinable.js
- CFS checkout risk tests: report
- b1-draft-price-override.js
- b2-automatic-discount.js
- e6d-status-check.js
- copy-cart.test.js
- e6e-basket-clear-check.js
- b6-mixed-basket.js
- start-checkout.server.js
- devDependencies
- e6f-recovery-check.js
- overrides
- quote-request.server.js
- specification.server.js
- CFS configurator: small-step plan
- EncryptedSessionStorage
- @prisma/client
- e4d-signed-mixed-basket.js
- e4b-basket-check.js
- Polaris web components 2.x (polaris-2.js)
- @shopify/shopify-app-template-remix
- qs forced to ^6.16.0
- shopify.app.toml
- polarisUrl option
- Shopify CLI
- app/shopify.server.ts shopify const
- e4c-signed-basket.js
- e4f-display-check.js
- saveOrderSnapshot
- e5f-signed-cart-copy.js
- checkout-request.test.js
- specification.test.js
- e3a-live-quote.js
- e6c-webhook-check.js
- e5d-signed-checkout.js
- save-snapshot.test.js
- @react-router/dev
- start-checkout.test.js
- ref_node_crypto
- b3-discount-code.js
- b4a-non-combinable.js
- b10a-unpublished-automatic.js
- ref_node_assert
- b5-rejected-codes.js
- eslint-plugin-import@^2.32.0
- eslint-plugin-jsx-a11y@^6.10.2
- @shopify/polaris-types@^2.0.0
- @types/node@^22.18.8
- typescript@^5.9.3

## God Nodes (most connected - your core abstractions)
1. `read()` - 27 edges
2. `write()` - 19 edges
3. `@prisma/client` - 19 edges
4. `addLine()` - 18 edges
5. `loadResults()` - 18 edges
6. `compilerOptions` - 18 edges
7. `scripts` - 18 edges
8. `saveOrderSnapshot()` - 17 edges
9. `Shopify App Template - React Router README` - 17 edges
10. `saveResult()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `copy()` --calls--> `copyCartItems()`  [EXTRACTED]
  test/checkout/copy-cart.test.js → app/checkout/copy-cart.server.js
- `save()` --calls--> `saveOrderSnapshot()`  [EXTRACTED]
  test/orders/save-snapshot.test.js → app/orders/save-snapshot.server.js
- `start()` --calls--> `startCheckout()`  [EXTRACTED]
  test/checkout/start-checkout.test.js → app/checkout/start-checkout.server.js
- `send()` --calls--> `handleBasketRequest()`  [EXTRACTED]
  test/basket/basket-request.test.js → app/basket/basket-request.server.js
- `send()` --calls--> `handleCheckoutRequest()`  [EXTRACTED]
  test/checkout/checkout-request.test.js → app/checkout/checkout-request.server.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Expiring offline token session upgrade** — changelog_shopify_shopify_app_react_router, changelog_shopify_shopify_app_session_storage_prisma, changelog_session_refresh_token_fields, changelog_expiring_offline_access_tokens [EXTRACTED 1.00]
- **Production hosting options** — readme_google_cloud_run_deployment, readme_fly_io_deployment, readme_render_deployment, readme_manual_deployment_guide [EXTRACTED 1.00]
- **Webhook subscription pitfalls and remedy** — readme_app_specific_webhooks, readme_afterauth_shop_specific_webhooks, readme_admin_created_webhook_hmac_failure, readme_cli_webhook_admin_undefined [INFERRED 0.85]

## Communities (65 total, 10 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.13
Nodes (14): author, graphql-config@^5.1.1, @types/react-dom@^18.3.7, engines, node, name, private, resolutions (+6 more)

### Community 1 - "Shopify App Template - React Router README"
Cohesion: 0.15
Nodes (14): Shopify AI Toolkit, Shopify app development agent guide, Shopify Dev MCP added to template, CLAUDE.md agent instructions, app/routes/app._index.tsx example route, Fly.io deployment, Google Cloud Run deployment, .graphqlrc.ts GraphQL hints config (+6 more)

### Community 2 - "shopify.server.js"
Cohesion: 0.05
Nodes (25): handleRequest(), streamTimeout, recoverAllShops(), startOrderRecovery(), loginErrorMessage(), action(), loader(), loginErrorMessage() (+17 more)

### Community 3 - "Server Rendering Runtime"
Cohesion: 0.08
Nodes (23): dependencies, isbot@^5.1.31, prisma@^6.16.3, @prisma/client@^6.16.3, react@^18.3.1, react-dom@^18.3.1, @react-router/fs-routes@7.18.2, @react-router/node@7.18.2 (+15 more)

### Community 4 - "DRAFT_FIELDS"
Cohesion: 0.33
Nodes (5): after, before, { draftOrderCreate }, input, DRAFT_FIELDS

### Community 5 - "loadResults"
Cohesion: 0.20
Nodes (9): { draftOrder }, { draftOrder: after }, { draftOrderDelete: r }, input, { productSet: created }, { publishablePublish: published }, loadResults(), saveResult() (+1 more)

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

### Community 10 - "write"
Cohesion: 0.25
Nodes (8): attempt(), { draftOrders }, drafts, input, key, keyed, result, write()

### Community 11 - "lib.js"
Cohesion: 0.15
Nodes (10): { draftOrder }, { draftOrder }, { draftOrder }, graphql(), { shop }, execute(), NATURAL_GOLD_VARIANT, read() (+2 more)

### Community 12 - "Cursor MCP Config"
Cohesion: 0.50
Nodes (3): npx, @shopify/dev-mcp, shopify-dev-mcp

### Community 13 - "Claude MCP Config"
Cohesion: 0.50
Nodes (3): npx, @shopify/dev-mcp, shopify-dev-mcp

### Community 14 - "app.orders.$id.jsx"
Cohesion: 0.18
Nodes (24): adminOrderUrl(), dateTime(), discountText(), groupName(), MATCH, matchBadge(), money(), needsAttention() (+16 more)

### Community 16 - "b4b-combinable.js"
Cohesion: 0.22
Nodes (8): after, before, combinesWith, { discountAutomaticBasicUpdate: automatic }, { discountCodeBasicUpdate: code }, { draftOrderCreate }, input, results

### Community 17 - "CFS checkout risk tests: report"
Cohesion: 0.25
Nodes (7): CFS checkout risk tests: report, Conclusion, Decisions for Part C, Left on the development store, Not proven, Results, Rules for the build

### Community 18 - "b1-draft-price-override.js"
Cohesion: 0.40
Nodes (4): after, before, { draftOrderCreate }, input

### Community 19 - "b2-automatic-discount.js"
Cohesion: 0.40
Nodes (4): after, before, { draftOrderCreate }, input

### Community 20 - "e6d-status-check.js"
Cohesion: 0.10
Nodes (22): copyStatus(), orderIdOf(), updateOrderStatus(), CHANGED_ORDERS_QUERY, handleOrder(), PAID_STATUSES, recoverOrders(), action() (+14 more)

### Community 21 - "copy-cart.test.js"
Cohesion: 0.22
Nodes (7): BED, copy(), product(), ref, savedMattress, shopify(), variantGid()

### Community 22 - "e6e-basket-clear-check.js"
Cohesion: 0.15
Nodes (8): graphql(), ORDERS, prisma, graphql(), prisma, results, ROLLBACK, STORE

### Community 23 - "b6-mixed-basket.js"
Cohesion: 0.40
Nodes (4): after, before, { draftOrderCreate }, input

### Community 24 - "start-checkout.server.js"
Cohesion: 0.36
Nodes (10): attemptTag(), createDraft(), draftInput(), draftLine(), findDraft(), finishAttempt(), shopify(), success() (+2 more)

### Community 25 - "devDependencies"
Cohesion: 0.10
Nodes (21): devDependencies, eslint@^8.57.1, eslint-import-resolver-typescript@^3.10.1, eslint-plugin-react@^7.37.5, eslint-plugin-react-hooks@^4.6.2, prettier@^3.6.2, @shopify/api-codegen-preset@^1.2.0, @types/eslint@^9.6.1 (+13 more)

### Community 26 - "e6f-recovery-check.js"
Cohesion: 0.29
Nodes (5): graphql(), MIGRATION, prisma, results, ROLLBACK

### Community 27 - "overrides"
Cohesion: 0.40
Nodes (5): overrides, p-map, qs, pnpm, overrides

### Community 28 - "quote-request.server.js"
Cohesion: 0.27
Nodes (6): handleQuoteRequest(), loader(), reply(), ask(), saved, shopifyProduct

### Community 29 - "specification.server.js"
Cohesion: 0.35
Nodes (10): lineAttributes(), buildSnapshot(), configurationOf(), ORDER_QUERY, pairLines(), pennies(), readDiscount(), readLine() (+2 more)

### Community 30 - "CFS configurator: small-step plan"
Cohesion: 0.17
Nodes (11): CFS configurator: small-step plan, Context, How we work, Inputs needed from the CFS team, Part A: Setup, Part B: Checkout tests (one test per step), Part C: Decision (with you), Part D: Supabase and Render (one step each) (+3 more)

### Community 31 - "EncryptedSessionStorage"
Cohesion: 0.22
Nodes (4): decrypt(), encrypt(), EncryptedSessionStorage, parseKey()

### Community 32 - "@prisma/client"
Cohesion: 0.14
Nodes (13): @prisma/client, prisma, results, ROLLBACK, statements, prisma, results, ROLLBACK (+5 more)

### Community 33 - "e4d-signed-mixed-basket.js"
Cohesion: 0.14
Nodes (13): add(), BED, BED_CHOICES, DRAFT, firstVariant(), MATTRESS, OTHER_BED, post() (+5 more)

### Community 34 - "e4b-basket-check.js"
Cohesion: 0.08
Nodes (60): add(), changed(), changeQuantity(), handleBasketRequest(), matches(), NOT_FOUND, numericId(), publicBasket() (+52 more)

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

### Community 42 - "e4c-signed-basket.js"
Cohesion: 0.28
Nodes (6): add(), post(), prisma, results, signedUrl(), tokens

### Community 43 - "e4f-display-check.js"
Cohesion: 0.25
Nodes (7): fixture, prisma, product, quote, results, ROLLBACK, statements

### Community 44 - "saveOrderSnapshot"
Cohesion: 0.36
Nodes (8): removePaidLines(), findAttempt(), isUniqueClash(), saveOrderSnapshot(), TRANSACTION_LIMITS, attemptIdOf(), readOrder(), action()

### Community 45 - "e5f-signed-cart-copy.js"
Cohesion: 0.20
Nodes (7): BED, MATTRESS, post(), prisma, results, signedUrl(), tokens

### Community 46 - "checkout-request.test.js"
Cohesion: 0.25
Nodes (4): fakeShopify(), product(), send(), TOKEN

### Community 47 - "specification.test.js"
Cohesion: 0.24
Nodes (7): money(), order(), orderLine(), slidestore, slidestoreNotes, twoDrawer, twoDrawerNotes

### Community 48 - "e3a-live-quote.js"
Cohesion: 0.05
Nodes (35): checkBasket(), checkLine(), loadProducts(), quantityByVariant(), stockIsLimited(), loadConfigurableProduct(), parseJson(), displayOf() (+27 more)

### Community 49 - "e6c-webhook-check.js"
Cohesion: 0.33
Nodes (8): databaseCheck(), graphql(), notify(), pass(), prisma, results, ROLLBACK, webhookCheck()

### Community 50 - "e5d-signed-checkout.js"
Cohesion: 0.24
Nodes (7): checkout(), FAKE_TOKEN, post(), prisma, results, signedUrl(), tokens

### Community 51 - "save-snapshot.test.js"
Cohesion: 0.32
Nodes (5): clash(), fakeDatabase(), money(), order(), save()

### Community 52 - "@react-router/dev"
Cohesion: 0.29
Nodes (6): @react-router/dev@7.18.2, vite-tsconfig-paths@^5.1.4, vite@^6.3.6, @react-router/dev, vite, vite-tsconfig-paths

### Community 55 - "b3-discount-code.js"
Cohesion: 0.40
Nodes (4): after, before, { draftOrderCreate }, input

### Community 56 - "b4a-non-combinable.js"
Cohesion: 0.40
Nodes (4): after, before, { draftOrderCreate }, input

### Community 57 - "b10a-unpublished-automatic.js"
Cohesion: 0.40
Nodes (4): after, before, { draftOrderCreate }, input

### Community 59 - "b5-rejected-codes.js"
Cohesion: 0.40
Nodes (4): after, before, { draftOrderCreate }, input

## Knowledge Gaps
- **28 isolated node(s):** `npx`, `@shopify/dev-mcp`, `npx`, `@shopify/dev-mcp`, `Shopify Dev MCP added to template` (+23 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 368 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `@prisma/client` to `package.json`, `e4d-signed-mixed-basket.js`, `shopify.server.js`, `Server Rendering Runtime`, `e4b-basket-check.js`, `e4c-signed-basket.js`, `e4f-display-check.js`, `e5f-signed-cart-copy.js`, `app.orders.$id.jsx`, `e6c-webhook-check.js`, `e5d-signed-checkout.js`, `e6d-status-check.js`, `e6e-basket-clear-check.js`, `e6f-recovery-check.js`?**
  _High betweenness centrality (0.188) - this node is a cross-community bridge._
- **What connects `npx`, `@shopify/dev-mcp`, `npx` to the rest of the system?**
  _28 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Why does `@shopify/shopify-app-react-router` connect `shopify.server.js` to `package.json`, `Server Rendering Runtime`, `app.orders.$id.jsx`, `ref_node_assert`, `EncryptedSessionStorage`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `shopify.server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.054098360655737705 - nodes in this community are weakly interconnected._
- **Why does `scripts` connect `NPM Scripts` to `package.json`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Should `Server Rendering Runtime` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
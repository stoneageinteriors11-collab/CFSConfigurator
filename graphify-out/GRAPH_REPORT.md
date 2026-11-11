# Graph Report - cfs-configurator  (2026-11-11)

## Corpus Check
- 123 files · ~60,728 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 8, .toml 3, .css 1)

## Summary
- 827 nodes · 1566 edges · 59 communities (52 shown, 7 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4e29274c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- Shopify App Template - React Router README
- shopify.server.js
- Server Rendering Runtime
- loadResults
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
- _index/route.jsx
- saveOrderSnapshot
- b6-mixed-basket.js
- start-checkout.server.js
- devDependencies
- e6f-recovery-check.js
- overrides
- e3a-live-quote.js
- auth.login/route.jsx
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
- @react-router/dev
- e5f-signed-cart-copy.js
- checkout-request.test.js
- SPIKE_TAG
- quote.server.js
- app.products.jsx
- e5d-signed-checkout.js
- entry.server.jsx
- b3-discount-code.js
- ref_node_crypto
- b4a-non-combinable.js
- ref_node_assert
- b5-rejected-codes.js
- @shopify/shopify-app-react-router

## God Nodes (most connected - your core abstractions)
1. `read()` - 27 edges
2. `write()` - 19 edges
3. `@prisma/client` - 19 edges
4. `quoteConfiguration()` - 18 edges
5. `addLine()` - 18 edges
6. `loadResults()` - 18 edges
7. `compilerOptions` - 18 edges
8. `scripts` - 18 edges
9. `saveOrderSnapshot()` - 17 edges
10. `Shopify App Template - React Router README` - 17 edges

## Surprising Connections (you probably didn't know these)
- `priced()` --calls--> `quoteConfiguration()`  [EXTRACTED]
  spike/e4b-basket-check.js → app/pricing/quote.server.js
- `send()` --calls--> `handleCheckoutRequest()`  [EXTRACTED]
  test/checkout/checkout-request.test.js → app/checkout/checkout-request.server.js
- `quote()` --calls--> `quoteOrdinaryProduct()`  [EXTRACTED]
  test/pricing/quote-ordinary.test.js → app/pricing/quote.server.js
- `quote()` --calls--> `quoteConfiguration()`  [EXTRACTED]
  test/pricing/quote.test.js → app/pricing/quote.server.js
- `update()` --calls--> `updateOrderStatus()`  [EXTRACTED]
  test/orders/order-status.test.js → app/orders/order-status.server.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Expiring offline token session upgrade** — changelog_shopify_shopify_app_react_router, changelog_shopify_shopify_app_session_storage_prisma, changelog_session_refresh_token_fields, changelog_expiring_offline_access_tokens [EXTRACTED 1.00]
- **Production hosting options** — readme_google_cloud_run_deployment, readme_fly_io_deployment, readme_render_deployment, readme_manual_deployment_guide [EXTRACTED 1.00]
- **Webhook subscription pitfalls and remedy** — readme_app_specific_webhooks, readme_afterauth_shop_specific_webhooks, readme_admin_created_webhook_hmac_failure, readme_cli_webhook_admin_undefined [INFERRED 0.85]

## Communities (59 total, 7 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.11
Nodes (18): author, eslint-import-resolver-typescript@^3.10.1, eslint-plugin-import@^2.32.0, @types/eslint@^9.6.1, @types/react-dom@^18.3.7, engines, node, name (+10 more)

### Community 1 - "Shopify App Template - React Router README"
Cohesion: 0.15
Nodes (14): Shopify AI Toolkit, Shopify app development agent guide, Shopify Dev MCP added to template, CLAUDE.md agent instructions, app/routes/app._index.tsx example route, Fly.io deployment, Google Cloud Run deployment, .graphqlrc.ts GraphQL hints config (+6 more)

### Community 2 - "shopify.server.js"
Cohesion: 0.19
Nodes (9): action(), reply(), action(), reply(), apiVersion, authenticate, registerWebhooks, sessionStorage (+1 more)

### Community 3 - "Server Rendering Runtime"
Cohesion: 0.11
Nodes (17): dependencies, prisma@^6.16.3, @prisma/client@^6.16.3, react@^18.3.1, @react-router/fs-routes@7.18.2, @react-router/serve@7.18.2, @shopify/app-bridge-react@^4.2.4, @shopify/cli@4.9.3 (+9 more)

### Community 4 - "loadResults"
Cohesion: 0.22
Nodes (9): after, before, { draftOrderCreate }, input, input, { productSet: created }, { publishablePublish: published }, loadResults() (+1 more)

### Community 5 - "loadResults"
Cohesion: 0.22
Nodes (5): after, before, { draftOrderCreate }, input, DRAFT_FIELDS

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
Cohesion: 0.17
Nodes (13): attempt(), { draftOrders }, drafts, input, key, keyed, result, made (+5 more)

### Community 11 - "lib.js"
Cohesion: 0.20
Nodes (6): { draftOrder }, { draftOrder }, { draftOrder }, NATURAL_GOLD_VARIANT, RESULTS, variantPrice()

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
Cohesion: 0.09
Nodes (25): copyStatus(), orderIdOf(), updateOrderStatus(), CHANGED_ORDERS_QUERY, handleOrder(), PAID_STATUSES, recoverOrders(), recoverAllShops() (+17 more)

### Community 22 - "saveOrderSnapshot"
Cohesion: 0.05
Nodes (48): removePaidLines(), lineAttributes(), findAttempt(), isUniqueClash(), saveOrderSnapshot(), TRANSACTION_LIMITS, attemptIdOf(), buildSnapshot() (+40 more)

### Community 23 - "b6-mixed-basket.js"
Cohesion: 0.40
Nodes (4): after, before, { draftOrderCreate }, input

### Community 24 - "start-checkout.server.js"
Cohesion: 0.20
Nodes (13): attemptTag(), createDraft(), draftInput(), draftLine(), findDraft(), finishAttempt(), shopify(), startCheckout() (+5 more)

### Community 25 - "devDependencies"
Cohesion: 0.07
Nodes (27): devDependencies, eslint@^8.57.1, eslint-plugin-jsx-a11y@^6.10.2, eslint-plugin-react@^7.37.5, eslint-plugin-react-hooks@^4.6.2, graphql-config@^5.1.1, prettier@^3.6.2, @shopify/api-codegen-preset@^1.2.0 (+19 more)

### Community 26 - "e6f-recovery-check.js"
Cohesion: 0.29
Nodes (5): graphql(), MIGRATION, prisma, results, ROLLBACK

### Community 27 - "overrides"
Cohesion: 0.40
Nodes (5): overrides, p-map, qs, pnpm, overrides

### Community 28 - "e3a-live-quote.js"
Cohesion: 0.07
Nodes (31): checkBasket(), checkLine(), loadProducts(), quantityByVariant(), stockIsLimited(), loadConfigurableProduct(), parseJson(), handleQuoteRequest() (+23 more)

### Community 29 - "auth.login/route.jsx"
Cohesion: 0.52
Nodes (4): loginErrorMessage(), action(), loader(), login

### Community 30 - "CFS configurator: small-step plan"
Cohesion: 0.17
Nodes (11): CFS configurator: small-step plan, Context, How we work, Inputs needed from the CFS team, Part A: Setup, Part B: Checkout tests (one test per step), Part C: Decision (with you), Part D: Supabase and Render (one step each) (+3 more)

### Community 31 - "EncryptedSessionStorage"
Cohesion: 0.17
Nodes (6): decrypt(), encrypt(), EncryptedSessionStorage, parseKey(), original, storage

### Community 32 - "@prisma/client"
Cohesion: 0.18
Nodes (9): @prisma/client, prisma, results, ROLLBACK, statements, prisma, results, ROLLBACK (+1 more)

### Community 33 - "e4d-signed-mixed-basket.js"
Cohesion: 0.14
Nodes (13): add(), BED, BED_CHOICES, DRAFT, firstVariant(), MATTRESS, OTHER_BED, post() (+5 more)

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

### Community 42 - "e4c-signed-basket.js"
Cohesion: 0.28
Nodes (6): add(), post(), prisma, results, signedUrl(), tokens

### Community 43 - "e4f-display-check.js"
Cohesion: 0.25
Nodes (7): fixture, prisma, product, quote, results, ROLLBACK, statements

### Community 44 - "@react-router/dev"
Cohesion: 0.29
Nodes (6): @react-router/dev@7.18.2, vite-tsconfig-paths@^5.1.4, vite@^6.3.6, @react-router/dev, vite, vite-tsconfig-paths

### Community 45 - "e5f-signed-cart-copy.js"
Cohesion: 0.20
Nodes (7): BED, MATTRESS, post(), prisma, results, signedUrl(), tokens

### Community 46 - "checkout-request.test.js"
Cohesion: 0.25
Nodes (4): fakeShopify(), product(), send(), TOKEN

### Community 47 - "SPIKE_TAG"
Cohesion: 0.40
Nodes (4): { draftOrder }, { draftOrder: after }, { draftOrderDelete: r }, SPIKE_TAG

### Community 48 - "quote.server.js"
Cohesion: 0.06
Nodes (38): cheapestSelection(), CHECKED_PRODUCTS_QUERY, checkProduct(), checkProducts(), reasonOf(), REASONS, ASSIGNMENT_FIELDS, CHOICE_KINDS (+30 more)

### Community 50 - "e5d-signed-checkout.js"
Cohesion: 0.24
Nodes (7): checkout(), FAKE_TOKEN, post(), prisma, results, signedUrl(), tokens

### Community 51 - "entry.server.jsx"
Cohesion: 0.20
Nodes (9): handleRequest(), streamTimeout, addDocumentResponseHeaders, isbot@^5.1.31, react-dom@^18.3.1, @react-router/node@7.18.2, isbot, react-dom (+1 more)

### Community 52 - "b3-discount-code.js"
Cohesion: 0.40
Nodes (4): after, before, { draftOrderCreate }, input

### Community 56 - "b4a-non-combinable.js"
Cohesion: 0.40
Nodes (4): after, before, { draftOrderCreate }, input

### Community 58 - "ref_node_assert"
Cohesion: 0.22
Nodes (5): prisma, results, ROLLBACK, statements, FIXTURES

### Community 59 - "b5-rejected-codes.js"
Cohesion: 0.40
Nodes (4): after, before, { draftOrderCreate }, input

## Knowledge Gaps
- **28 isolated node(s):** `npx`, `@shopify/dev-mcp`, `npx`, `@shopify/dev-mcp`, `Shopify Dev MCP added to template` (+23 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 387 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `@prisma/client` to `package.json`, `e4d-signed-mixed-basket.js`, `shopify.server.js`, `Server Rendering Runtime`, `e4b-basket-check.js`, `e6f-recovery-check.js`, `e4c-signed-basket.js`, `e4f-display-check.js`, `write`, `e5f-signed-cart-copy.js`, `app.orders.$id.jsx`, `e5d-signed-checkout.js`, `e6d-status-check.js`, `saveOrderSnapshot`, `ref_node_assert`?**
  _High betweenness centrality (0.177) - this node is a cross-community bridge._
- **What connects `npx`, `@shopify/dev-mcp`, `npx` to the rest of the system?**
  _28 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Why does `@shopify/shopify-app-react-router` connect `@shopify/shopify-app-react-router` to `package.json`, `shopify.server.js`, `Server Rendering Runtime`, `app.orders.$id.jsx`, `quote.server.js`, `app.products.jsx`, `app._index.jsx`, `_index/route.jsx`, `auth.login/route.jsx`, `EncryptedSessionStorage`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `Server Rendering Runtime` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Why does `scripts` connect `NPM Scripts` to `package.json`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Should `TypeScript Editor Config` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
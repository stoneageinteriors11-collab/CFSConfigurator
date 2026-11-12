# Graph Report - cfs-configurator  (2026-11-12)

## Corpus Check
- 136 files · ~77,191 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 8, .toml 3, .css 1)

## Summary
- 908 nodes · 1740 edges · 74 communities (65 shown, 9 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `30c2f896`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- Shopify App Template - React Router README
- shopify.server.js
- Server Rendering Runtime
- b10a-unpublished-automatic.js
- loadResults
- Prisma session storage
- TypeScript Editor Config
- NPM Scripts
- PNPM Build Allowlist
- write
- lib.js
- Cursor MCP Config
- Claude MCP Config
- choices-request.test.js
- b4b-combinable.js
- EncryptedSessionStorage
- b1-draft-price-override.js
- b2-automatic-discount.js
- quote.server.js
- quoteConfiguration
- app.orders.$id.jsx
- b6-mixed-basket.js
- e7e-300-choices.js
- devDependencies
- quote.test.js
- overrides
- quote-request.server.js
- start-checkout.server.js
- CFS configurator MVP: acceptance report
- @react-router/dev
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
- e7e-stock.js
- e5f-signed-cart-copy.js
- checkout-request.test.js
- e6c-webhook-check.js
- ref_node_test
- quote-fargo.test.js
- e5d-signed-checkout.js
- e6e-basket-clear-check.js
- b10b-unpublished-code.js
- e6d-status-check.js
- loadResults
- quote-accessories.test.js
- start-checkout.server.js
- loadConfigurableProduct
- copy-cart.test.js
- e3a-live-quote.js
- ref_node_assert
- check-basket.test.js
- b3-discount-code.js
- ref_node_crypto
- check-basket.server.js
- accessories-flow.test.js
- e6f-recovery-check.js
- .graphqlrc.js
- start-checkout.test.js
- b5-rejected-codes.js
- eslint@^8.57.1
- prettier@^3.6.2
- @types/react@^18.3.25
- typescript@^5.9.3

## God Nodes (most connected - your core abstractions)
1. `read()` - 30 edges
2. `write()` - 23 edges
3. `loadResults()` - 22 edges
4. `quoteConfiguration()` - 21 edges
5. `saveResult()` - 19 edges
6. `@prisma/client` - 19 edges
7. `addLine()` - 18 edges
8. `compilerOptions` - 18 edges
9. `scripts` - 18 edges
10. `saveOrderSnapshot()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `priced()` --calls--> `quoteConfiguration()`  [EXTRACTED]
  spike/e4b-basket-check.js → app/pricing/quote.server.js
- `quote()` --calls--> `quoteConfiguration()`  [EXTRACTED]
  test/pricing/quote.test.js → app/pricing/quote.server.js
- `ask()` --calls--> `handleQuoteRequest()`  [EXTRACTED]
  test/checkout/accessories-flow.test.js → app/pricing/quote-request.server.js
- `start()` --calls--> `startCheckout()`  [EXTRACTED]
  test/checkout/start-checkout.test.js → app/checkout/start-checkout.server.js
- `send()` --calls--> `handleCheckoutRequest()`  [EXTRACTED]
  test/checkout/checkout-request.test.js → app/checkout/checkout-request.server.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Expiring offline token session upgrade** — changelog_shopify_shopify_app_react_router, changelog_shopify_shopify_app_session_storage_prisma, changelog_session_refresh_token_fields, changelog_expiring_offline_access_tokens [EXTRACTED 1.00]
- **Production hosting options** — readme_google_cloud_run_deployment, readme_fly_io_deployment, readme_render_deployment, readme_manual_deployment_guide [EXTRACTED 1.00]
- **Webhook subscription pitfalls and remedy** — readme_app_specific_webhooks, readme_afterauth_shop_specific_webhooks, readme_admin_created_webhook_hmac_failure, readme_cli_webhook_admin_undefined [INFERRED 0.85]

## Communities (74 total, 9 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.13
Nodes (14): author, eslint-plugin-react-hooks@^4.6.2, @typescript-eslint/eslint-plugin@^6.21.0, engines, node, name, private, resolutions (+6 more)

### Community 1 - "Shopify App Template - React Router README"
Cohesion: 0.15
Nodes (14): Shopify AI Toolkit, Shopify app development agent guide, Shopify Dev MCP added to template, CLAUDE.md agent instructions, app/routes/app._index.tsx example route, Fly.io deployment, Google Cloud Run deployment, .graphqlrc.ts GraphQL hints config (+6 more)

### Community 2 - "shopify.server.js"
Cohesion: 0.05
Nodes (29): handleRequest(), streamTimeout, recoverOrders(), recoverAllShops(), startOrderRecovery(), checkProducts(), adminProductUrl(), loader() (+21 more)

### Community 3 - "Server Rendering Runtime"
Cohesion: 0.08
Nodes (23): dependencies, isbot@^5.1.31, prisma@^6.16.3, @prisma/client@^6.16.3, react@^18.3.1, react-dom@^18.3.1, @react-router/fs-routes@7.18.2, @react-router/node@7.18.2 (+15 more)

### Community 4 - "b10a-unpublished-automatic.js"
Cohesion: 0.40
Nodes (4): after, before, { draftOrderCreate }, input

### Community 5 - "loadResults"
Cohesion: 0.22
Nodes (7): input, { productSet: created }, { publishablePublish: published }, automaticBasicDiscount, { discountAutomaticBasicCreate: created }, now, SPIKE_TAG

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
Cohesion: 0.16
Nodes (11): { draftOrder }, after, before, { draftOrderCreate }, input, { draftOrder }, execute(), NATURAL_GOLD_VARIANT (+3 more)

### Community 12 - "Cursor MCP Config"
Cohesion: 0.50
Nodes (3): npx, @shopify/dev-mcp, shopify-dev-mcp

### Community 13 - "Claude MCP Config"
Cohesion: 0.50
Nodes (3): npx, @shopify/dev-mcp, shopify-dev-mcp

### Community 14 - "choices-request.test.js"
Cohesion: 0.20
Nodes (13): cardOf(), handleChoicesRequest(), refuse(), loader(), reply(), allChoices, ask(), extraFabrics (+5 more)

### Community 16 - "b4b-combinable.js"
Cohesion: 0.22
Nodes (8): after, before, combinesWith, { discountAutomaticBasicUpdate: automatic }, { discountCodeBasicUpdate: code }, { draftOrderCreate }, input, results

### Community 17 - "EncryptedSessionStorage"
Cohesion: 0.22
Nodes (4): decrypt(), encrypt(), EncryptedSessionStorage, parseKey()

### Community 18 - "b1-draft-price-override.js"
Cohesion: 0.40
Nodes (4): after, before, { draftOrderCreate }, input

### Community 19 - "b2-automatic-discount.js"
Cohesion: 0.40
Nodes (4): after, before, { draftOrderCreate }, input

### Community 20 - "quote.server.js"
Cohesion: 0.17
Nodes (12): accessoryLimit(), ASSIGNMENT_FIELDS, CHOICE_KINDS, displayOf(), GROUP_FIELDS, MAPPING_FIELDS, quoteOrdinaryProduct(), unknownField() (+4 more)

### Community 21 - "quoteConfiguration"
Cohesion: 0.29
Nodes (10): cheapestSelection(), CHECKED_PRODUCTS_QUERY, checkProduct(), reasonOf(), REASONS, quoteConfiguration(), resolveAssignment(), toPennies() (+2 more)

### Community 22 - "app.orders.$id.jsx"
Cohesion: 0.18
Nodes (24): adminOrderUrl(), dateTime(), discountText(), groupName(), MATCH, matchBadge(), money(), needsAttention() (+16 more)

### Community 23 - "b6-mixed-basket.js"
Cohesion: 0.40
Nodes (4): after, before, { draftOrderCreate }, input

### Community 24 - "e7e-300-choices.js"
Cohesion: 0.18
Nodes (8): extraIds, input, modelCards, parents, { product: source }, { productSet: created }, { publishablePublish: published }, sourceIds

### Community 25 - "devDependencies"
Cohesion: 0.10
Nodes (21): devDependencies, eslint-import-resolver-typescript@^3.10.1, eslint-plugin-import@^2.32.0, eslint-plugin-jsx-a11y@^6.10.2, eslint-plugin-react@^7.37.5, graphql-config@^5.1.1, @shopify/polaris-types@^2.0.0, @types/eslint@^9.6.1 (+13 more)

### Community 26 - "quote.test.js"
Cohesion: 0.25
Nodes (3): naturalGold, priceChecks, quote()

### Community 27 - "overrides"
Cohesion: 0.40
Nodes (5): overrides, p-map, qs, pnpm, overrides

### Community 28 - "quote-request.server.js"
Cohesion: 0.22
Nodes (11): handleQuoteRequest(), isPlainObject(), matches(), quoteSelection(), readQuantityParams(), refuse(), loader(), reply() (+3 more)

### Community 29 - "start-checkout.server.js"
Cohesion: 0.08
Nodes (33): removePaidLines(), lineAttributes(), findAttempt(), isUniqueClash(), saveOrderSnapshot(), TRANSACTION_LIMITS, attemptIdOf(), buildSnapshot() (+25 more)

### Community 30 - "CFS configurator MVP: acceptance report"
Cohesion: 0.06
Nodes (29): 1. Identifiers and breakdowns: Pass, 2. Basket cases: Pass, one gap, 3. Shopify discounts: Pass for percentage discounts, 4. Stock and duplicates: Pass, 5. Saved order record: Pass, two fields missing, 6. Price bypass, shipping and VAT, payment methods: Open, CFS configurator MVP: acceptance report, Evidence orders (+21 more)

### Community 31 - "@react-router/dev"
Cohesion: 0.29
Nodes (6): @react-router/dev@7.18.2, vite-tsconfig-paths@^5.1.4, vite@^6.3.6, @react-router/dev, vite, vite-tsconfig-paths

### Community 32 - "@prisma/client"
Cohesion: 0.18
Nodes (9): @prisma/client, prisma, results, ROLLBACK, statements, prisma, results, ROLLBACK (+1 more)

### Community 33 - "e4d-signed-mixed-basket.js"
Cohesion: 0.14
Nodes (13): add(), BED, BED_CHOICES, DRAFT, firstVariant(), MATTRESS, OTHER_BED, post() (+5 more)

### Community 34 - "e4b-basket-check.js"
Cohesion: 0.07
Nodes (66): add(), changed(), changeQuantity(), handleBasketRequest(), matches(), NOT_FOUND, numericId(), publicBasket() (+58 more)

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

### Community 44 - "e7e-stock.js"
Cohesion: 0.33
Nodes (5): active, { inventorySetQuantities: set }, items, { product: after }, { product, locations }

### Community 45 - "e5f-signed-cart-copy.js"
Cohesion: 0.20
Nodes (7): BED, MATTRESS, post(), prisma, results, signedUrl(), tokens

### Community 46 - "checkout-request.test.js"
Cohesion: 0.25
Nodes (4): fakeShopify(), product(), send(), TOKEN

### Community 47 - "e6c-webhook-check.js"
Cohesion: 0.33
Nodes (8): databaseCheck(), graphql(), notify(), pass(), prisma, results, ROLLBACK, webhookCheck()

### Community 49 - "quote-fargo.test.js"
Cohesion: 0.25
Nodes (9): cents(), fargo, groups, inGroup(), LIVE_CFS, pick(), priceOf(), quote() (+1 more)

### Community 50 - "e5d-signed-checkout.js"
Cohesion: 0.24
Nodes (7): checkout(), FAKE_TOKEN, post(), prisma, results, signedUrl(), tokens

### Community 51 - "e6e-basket-clear-check.js"
Cohesion: 0.15
Nodes (7): graphql(), { shop }, graphql(), prisma, results, ROLLBACK, STORE

### Community 52 - "b10b-unpublished-code.js"
Cohesion: 0.22
Nodes (5): after, before, { draftOrderCreate }, input, DRAFT_FIELDS

### Community 53 - "e6d-status-check.js"
Cohesion: 0.10
Nodes (21): copyStatus(), orderIdOf(), updateOrderStatus(), CHANGED_ORDERS_QUERY, handleOrder(), PAID_STATUSES, action(), databaseCheck() (+13 more)

### Community 54 - "loadResults"
Cohesion: 0.20
Nodes (9): { draftOrder }, { draftOrder }, { draftOrder: after }, { draftOrderDelete: r }, choices, { nodes }, { product }, loadResults() (+1 more)

### Community 55 - "quote-accessories.test.js"
Cohesion: 0.38
Nodes (5): LIVE_CFS_ACCESSORIES, LIVE_CFS_PLAIN, load(), quote(), variantFor()

### Community 56 - "start-checkout.server.js"
Cohesion: 0.36
Nodes (10): attemptTag(), createDraft(), draftInput(), draftLine(), findDraft(), finishAttempt(), shopify(), success() (+2 more)

### Community 57 - "loadConfigurableProduct"
Cohesion: 0.31
Nodes (9): loadConfigurableProduct(), parseJson(), readAllChoices(), choiceNode(), choicePage(), load(), pagedShop(), plainProduct() (+1 more)

### Community 58 - "copy-cart.test.js"
Cohesion: 0.22
Nodes (7): BED, copy(), product(), ref, savedMattress, shopify(), variantGid()

### Community 59 - "e3a-live-quote.js"
Cohesion: 0.20
Nodes (4): checks, graphql(), quote, saved

### Community 60 - "ref_node_assert"
Cohesion: 0.22
Nodes (6): prisma, results, ROLLBACK, statements, original, storage

### Community 61 - "check-basket.test.js"
Cohesion: 0.27
Nodes (7): check(), everything(), fixture, shop(), shopifyBed(), shopifyMattress(), STOCK

### Community 62 - "b3-discount-code.js"
Cohesion: 0.40
Nodes (4): after, before, { draftOrderCreate }, input

### Community 64 - "check-basket.server.js"
Cohesion: 0.46
Nodes (7): checkBasket(), checkLine(), loadProducts(), quantityByVariant(), stockIsLimited(), priceProduct(), selectionRequest()

### Community 65 - "accessories-flow.test.js"
Cohesion: 0.25
Nodes (4): ask(), loft, PRODUCT, shopifyLoft

### Community 66 - "e6f-recovery-check.js"
Cohesion: 0.29
Nodes (5): graphql(), MIGRATION, prisma, results, ROLLBACK

### Community 67 - ".graphqlrc.js"
Cohesion: 0.33
Nodes (3): config, @shopify/api-codegen-preset@^1.2.0, @shopify/api-codegen-preset

### Community 69 - "b5-rejected-codes.js"
Cohesion: 0.40
Nodes (4): after, before, { draftOrderCreate }, input

## Knowledge Gaps
- **28 isolated node(s):** `npx`, `@shopify/dev-mcp`, `npx`, `@shopify/dev-mcp`, `Shopify Dev MCP added to template` (+23 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 428 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `@prisma/client` to `package.json`, `e4d-signed-mixed-basket.js`, `shopify.server.js`, `Server Rendering Runtime`, `e4b-basket-check.js`, `e6f-recovery-check.js`, `e4c-signed-basket.js`, `e4f-display-check.js`, `e5f-signed-cart-copy.js`, `e6c-webhook-check.js`, `e5d-signed-checkout.js`, `e6e-basket-clear-check.js`, `e6d-status-check.js`, `app.orders.$id.jsx`, `ref_node_assert`, `start-checkout.server.js`?**
  _High betweenness centrality (0.162) - this node is a cross-community bridge._
- **What connects `npx`, `@shopify/dev-mcp`, `npx` to the rest of the system?**
  _28 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Why does `@shopify/shopify-app-react-router` connect `shopify.server.js` to `package.json`, `.graphqlrc.js`, `Server Rendering Runtime`, `EncryptedSessionStorage`, `app.orders.$id.jsx`, `ref_node_assert`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Should `shopify.server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05357142857142857 - nodes in this community are weakly interconnected._
- **Why does `scripts` connect `NPM Scripts` to `package.json`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Should `Server Rendering Runtime` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
# Graph Report - cfs-configurator  (2026-11-10)

## Corpus Check
- 74 files · ~29,017 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 8, .toml 3, .css 1)

## Summary
- 535 nodes · 873 edges · 49 communities (45 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c1801885`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- Shopify App Template - React Router README
- Admin Demo Routes
- Server Rendering Runtime
- lib.js
- loadResults
- Prisma session storage
- TypeScript Editor Config
- NPM Scripts
- PNPM Build Allowlist
- write
- b10b-unpublished-code.js
- Cursor MCP Config
- Claude MCP Config
- entry.server.jsx
- b4b-combinable.js
- CFS checkout risk tests: report
- b1-draft-price-override.js
- b2-automatic-discount.js
- b3-discount-code.js
- b4a-non-combinable.js
- b5-rejected-codes.js
- b6-mixed-basket.js
- e4c-signed-basket.js
- devDependencies
- @react-router/dev
- overrides
- quote-request.server.js
- b10a-unpublished-automatic.js
- CFS configurator: small-step plan
- ref_node_assert
- e4f-display-check.js
- e4d-signed-mixed-basket.js
- e4b-basket-check.js
- Polaris web components 2.x (polaris-2.js)
- @shopify/shopify-app-template-remix
- qs forced to ^6.16.0
- shopify.app.toml
- polarisUrl option
- Shopify CLI
- app/shopify.server.ts shopify const
- quote.server.js
- e3a-live-quote.js
- quote.test.js
- loadConfigurableProduct
- .graphqlrc.js
- eslint-import-resolver-typescript@^3.10.1
- eslint-plugin-react-hooks@^4.6.2

## God Nodes (most connected - your core abstractions)
1. `loadResults()` - 18 edges
2. `compilerOptions` - 18 edges
3. `scripts` - 18 edges
4. `write()` - 17 edges
5. `Shopify App Template - React Router README` - 17 edges
6. `saveResult()` - 15 edges
7. `variantPrice()` - 14 edges
8. `SPIKE_TAG` - 14 edges
9. `addLine()` - 13 edges
10. `read()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `send()` --calls--> `handleBasketRequest()`  [EXTRACTED]
  test/basket/basket-request.test.js → app/basket/basket-request.server.js
- `priced()` --calls--> `quoteConfiguration()`  [EXTRACTED]
  spike/e4b-basket-check.js → app/pricing/quote.server.js
- `quote()` --calls--> `quoteConfiguration()`  [EXTRACTED]
  test/pricing/quote.test.js → app/pricing/quote.server.js
- `add()` --calls--> `addLine()`  [EXTRACTED]
  spike/e4b-basket-check.js → app/basket/basket.server.js
- `load()` --calls--> `loadConfigurableProduct()`  [EXTRACTED]
  test/pricing/load-product.test.js → app/pricing/load-product.server.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Expiring offline token session upgrade** — changelog_shopify_shopify_app_react_router, changelog_shopify_shopify_app_session_storage_prisma, changelog_session_refresh_token_fields, changelog_expiring_offline_access_tokens [EXTRACTED 1.00]
- **Production hosting options** — readme_google_cloud_run_deployment, readme_fly_io_deployment, readme_render_deployment, readme_manual_deployment_guide [EXTRACTED 1.00]
- **Webhook subscription pitfalls and remedy** — readme_app_specific_webhooks, readme_afterauth_shop_specific_webhooks, readme_admin_created_webhook_hmac_failure, readme_cli_webhook_admin_undefined [INFERRED 0.85]

## Communities (49 total, 4 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.12
Nodes (16): author, eslint-plugin-import@^2.32.0, typescript@^5.9.3, @typescript-eslint/parser@^6.21.0, engines, node, name, private (+8 more)

### Community 1 - "Shopify App Template - React Router README"
Cohesion: 0.15
Nodes (14): Shopify AI Toolkit, Shopify app development agent guide, Shopify Dev MCP added to template, CLAUDE.md agent instructions, app/routes/app._index.tsx example route, Fly.io deployment, Google Cloud Run deployment, .graphqlrc.ts GraphQL hints config (+6 more)

### Community 2 - "Admin Demo Routes"
Cohesion: 0.07
Nodes (17): loginErrorMessage(), action(), loader(), loginErrorMessage(), action(), action(), reply(), apiVersion (+9 more)

### Community 3 - "Server Rendering Runtime"
Cohesion: 0.12
Nodes (16): dependencies, prisma@^6.16.3, react@^18.3.1, @react-router/fs-routes@7.18.2, @react-router/serve@7.18.2, @shopify/app-bridge-react@^4.2.4, @shopify/cli@4.9.3, @shopify/shopify-app-react-router@^4.0.0 (+8 more)

### Community 4 - "lib.js"
Cohesion: 0.18
Nodes (10): { draftOrder }, { draftOrder }, { draftOrder }, firstVariant(), execute(), NATURAL_GOLD_VARIANT, read(), RESULTS (+2 more)

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

### Community 11 - "b10b-unpublished-code.js"
Cohesion: 0.33
Nodes (5): after, before, { draftOrderCreate }, input, DRAFT_FIELDS

### Community 12 - "Cursor MCP Config"
Cohesion: 0.50
Nodes (3): npx, @shopify/dev-mcp, shopify-dev-mcp

### Community 13 - "Claude MCP Config"
Cohesion: 0.50
Nodes (3): npx, @shopify/dev-mcp, shopify-dev-mcp

### Community 14 - "entry.server.jsx"
Cohesion: 0.20
Nodes (9): handleRequest(), streamTimeout, addDocumentResponseHeaders, isbot@^5.1.31, react-dom@^18.3.1, @react-router/node@7.18.2, isbot, react-dom (+1 more)

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

### Community 20 - "b3-discount-code.js"
Cohesion: 0.40
Nodes (4): after, before, { draftOrderCreate }, input

### Community 21 - "b4a-non-combinable.js"
Cohesion: 0.40
Nodes (4): after, before, { draftOrderCreate }, input

### Community 22 - "b5-rejected-codes.js"
Cohesion: 0.40
Nodes (4): after, before, { draftOrderCreate }, input

### Community 23 - "b6-mixed-basket.js"
Cohesion: 0.40
Nodes (4): after, before, { draftOrderCreate }, input

### Community 24 - "e4c-signed-basket.js"
Cohesion: 0.09
Nodes (12): decrypt(), encrypt(), EncryptedSessionStorage, parseKey(), cases, good, add(), post() (+4 more)

### Community 25 - "devDependencies"
Cohesion: 0.09
Nodes (23): devDependencies, eslint@^8.57.1, eslint-plugin-jsx-a11y@^6.10.2, eslint-plugin-react@^7.37.5, graphql-config@^5.1.1, prettier@^3.6.2, @shopify/polaris-types@^2.0.0, @types/eslint@^9.6.1 (+15 more)

### Community 26 - "@react-router/dev"
Cohesion: 0.29
Nodes (6): @react-router/dev@7.18.2, vite-tsconfig-paths@^5.1.4, vite@^6.3.6, @react-router/dev, vite, vite-tsconfig-paths

### Community 27 - "overrides"
Cohesion: 0.40
Nodes (5): overrides, p-map, qs, pnpm, overrides

### Community 28 - "quote-request.server.js"
Cohesion: 0.23
Nodes (9): handleQuoteRequest(), matches(), quoteSelection(), refuse(), loader(), reply(), ask(), saved (+1 more)

### Community 29 - "b10a-unpublished-automatic.js"
Cohesion: 0.40
Nodes (4): after, before, { draftOrderCreate }, input

### Community 30 - "CFS configurator: small-step plan"
Cohesion: 0.17
Nodes (11): CFS configurator: small-step plan, Context, How we work, Inputs needed from the CFS team, Part A: Setup, Part B: Checkout tests (one test per step), Part C: Decision (with you), Part D: Supabase and Render (one step each) (+3 more)

### Community 31 - "ref_node_assert"
Cohesion: 0.18
Nodes (5): original, storage, ADD, send(), TOKEN

### Community 32 - "e4f-display-check.js"
Cohesion: 0.13
Nodes (13): @prisma/client@^6.16.3, @prisma/client, prisma, results, ROLLBACK, statements, fixture, prisma (+5 more)

### Community 33 - "e4d-signed-mixed-basket.js"
Cohesion: 0.15
Nodes (12): add(), BED, BED_CHOICES, DRAFT, MATTRESS, OTHER_BED, post(), prisma (+4 more)

### Community 34 - "e4b-basket-check.js"
Cohesion: 0.11
Nodes (37): add(), changed(), changeQuantity(), handleBasketRequest(), matches(), NOT_FOUND, numericId(), publicBasket() (+29 more)

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
Cohesion: 0.29
Nodes (7): displayOf(), quoteConfiguration(), quoteOrdinaryProduct(), resolveAssignment(), toPennies(), quote(), variant

### Community 43 - "e3a-live-quote.js"
Cohesion: 0.20
Nodes (4): checks, graphql(), quote, saved

### Community 44 - "quote.test.js"
Cohesion: 0.25
Nodes (3): naturalGold, priceChecks, quote()

### Community 45 - "loadConfigurableProduct"
Cohesion: 0.48
Nodes (5): loadConfigurableProduct(), parseJson(), load(), plainProduct(), shopifyProduct()

### Community 46 - ".graphqlrc.js"
Cohesion: 0.33
Nodes (3): config, @shopify/api-codegen-preset@^1.2.0, @shopify/api-codegen-preset

## Knowledge Gaps
- **28 isolated node(s):** `npx`, `@shopify/dev-mcp`, `npx`, `@shopify/dev-mcp`, `Shopify Dev MCP added to template` (+23 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 277 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `e4f-display-check.js` to `package.json`, `e4d-signed-mixed-basket.js`, `Admin Demo Routes`, `e4b-basket-check.js`, `e4c-signed-basket.js`?**
  _High betweenness centrality (0.182) - this node is a cross-community bridge._
- **What connects `npx`, `@shopify/dev-mcp`, `npx` to the rest of the system?**
  _28 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Why does `@shopify/shopify-app-react-router` connect `Admin Demo Routes` to `package.json`, `Server Rendering Runtime`, `.graphqlrc.js`, `e4c-signed-basket.js`, `ref_node_assert`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Should `Admin Demo Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.07053140096618357 - nodes in this community are weakly interconnected._
- **Why does `scripts` connect `NPM Scripts` to `package.json`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `Server Rendering Runtime` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
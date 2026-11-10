# Graph Report - cfs-configurator  (2026-11-10)

## Corpus Check
- 57 files · ~22,383 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 8, .toml 3, .css 1)

## Summary
- 416 nodes · 613 edges · 35 communities (30 shown, 5 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9e7fc753`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- Template Security Changelog
- Admin Demo Routes
- Server Rendering Runtime
- lib.js
- loadResults
- Shopify Platform Upgrades
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
- EncryptedSessionStorage
- devDependencies
- @react-router/dev
- overrides
- e3a-live-quote.js
- b10a-unpublished-automatic.js
- CFS configurator: small-step plan
- graphql-config@^5.1.1
- @types/react@^18.3.25
- eslint-plugin-react-hooks@^4.6.2
- @typescript-eslint/eslint-plugin@^6.21.0

## God Nodes (most connected - your core abstractions)
1. `loadResults()` - 18 edges
2. `compilerOptions` - 18 edges
3. `scripts` - 18 edges
4. `write()` - 17 edges
5. `Shopify App Template - React Router README` - 17 edges
6. `saveResult()` - 15 edges
7. `variantPrice()` - 14 edges
8. `SPIKE_TAG` - 14 edges
9. `@shopify/shopify-app-react-router` - 12 edges
10. `NATURAL_GOLD_VARIANT` - 12 edges

## Surprising Connections (you probably didn't know these)
- `load()` --calls--> `loadConfigurableProduct()`  [EXTRACTED]
  test/pricing/load-product.test.js → app/pricing/load-product.server.js
- `quote()` --calls--> `quoteConfiguration()`  [EXTRACTED]
  test/pricing/quote.test.js → app/pricing/quote.server.js
- `graphql()` --calls--> `read()`  [EXTRACTED]
  spike/e3a-live-quote.js → spike/lib.js
- `Shopify AI Toolkit` --semantically_similar_to--> `Shopify Dev MCP`  [INFERRED] [semantically similar]
  AGENTS.md → README.md
- `@shopify/shopify-app-template-remix` --conceptually_related_to--> `Shopify Remix app template`  [INFERRED]
  CHANGELOG.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Expiring offline token session upgrade** — changelog_shopify_shopify_app_react_router, changelog_shopify_shopify_app_session_storage_prisma, changelog_session_refresh_token_fields, changelog_expiring_offline_access_tokens [EXTRACTED 1.00]
- **Production hosting options** — readme_google_cloud_run_deployment, readme_fly_io_deployment, readme_render_deployment, readme_manual_deployment_guide [EXTRACTED 1.00]
- **Webhook subscription pitfalls and remedy** — readme_app_specific_webhooks, readme_afterauth_shop_specific_webhooks, readme_admin_created_webhook_hmac_failure, readme_cli_webhook_admin_undefined [INFERRED 0.85]

## Communities (35 total, 5 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.13
Nodes (14): author, eslint-plugin-import@^2.32.0, @shopify/polaris-types@^2.0.0, engines, node, name, private, resolutions (+6 more)

### Community 1 - "Template Security Changelog"
Cohesion: 0.05
Nodes (36): Shopify AI Toolkit, Shopify app development agent guide, Action-origin validation, CVE-2026-82417, CVE-2026-82562, Declarative metaobject definition, Declarative product metafield definition, productVariantsBulkUpdate (+28 more)

### Community 2 - "Admin Demo Routes"
Cohesion: 0.06
Nodes (20): loginErrorMessage(), action(), loader(), loginErrorMessage(), action(), apiVersion, authenticate, login (+12 more)

### Community 3 - "Server Rendering Runtime"
Cohesion: 0.12
Nodes (16): dependencies, prisma@^6.16.3, @prisma/client@^6.16.3, react@^18.3.1, @react-router/fs-routes@7.18.2, @react-router/serve@7.18.2, @shopify/app-bridge-react@^4.2.4, @shopify/cli@4.9.3 (+8 more)

### Community 4 - "lib.js"
Cohesion: 0.19
Nodes (9): { draftOrder }, { draftOrder }, { draftOrder }, execute(), NATURAL_GOLD_VARIANT, read(), RESULTS, STORE (+1 more)

### Community 5 - "loadResults"
Cohesion: 0.20
Nodes (9): { draftOrder }, { draftOrder: after }, { draftOrderDelete: r }, input, { productSet: created }, { publishablePublish: published }, loadResults(), saveResult() (+1 more)

### Community 6 - "Shopify Platform Upgrades"
Cohesion: 0.10
Nodes (15): Admin intents, App Bridge web components, AppProvider, Polaris web components 2.x (polaris-2.js), polarisUrl option, Session refreshToken and refreshTokenExpires fields, @shopify/shopify-app-template-react-router changelog, @shopify/polaris-types (+7 more)

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
Cohesion: 0.40
Nodes (4): after, before, { draftOrderCreate }, input

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

### Community 24 - "EncryptedSessionStorage"
Cohesion: 0.20
Nodes (4): decrypt(), encrypt(), EncryptedSessionStorage, parseKey()

### Community 25 - "devDependencies"
Cohesion: 0.09
Nodes (23): devDependencies, eslint@^8.57.1, eslint-import-resolver-typescript@^3.10.1, eslint-plugin-jsx-a11y@^6.10.2, eslint-plugin-react@^7.37.5, prettier@^3.6.2, @shopify/api-codegen-preset@^1.2.0, @types/eslint@^9.6.1 (+15 more)

### Community 26 - "@react-router/dev"
Cohesion: 0.29
Nodes (6): @react-router/dev@7.18.2, vite-tsconfig-paths@^5.1.4, vite@^6.3.6, @react-router/dev, vite, vite-tsconfig-paths

### Community 27 - "overrides"
Cohesion: 0.40
Nodes (5): overrides, p-map, qs, pnpm, overrides

### Community 28 - "e3a-live-quote.js"
Cohesion: 0.09
Nodes (13): loadConfigurableProduct(), parseJson(), quoteConfiguration(), resolveAssignment(), toPennies(), checks, graphql(), quote (+5 more)

### Community 29 - "b10a-unpublished-automatic.js"
Cohesion: 0.33
Nodes (5): after, before, { draftOrderCreate }, input, DRAFT_FIELDS

### Community 30 - "CFS configurator: small-step plan"
Cohesion: 0.17
Nodes (11): CFS configurator: small-step plan, Context, How we work, Inputs needed from the CFS team, Part A: Setup, Part B: Checkout tests (one test per step), Part C: Decision (with you), Part D: Supabase and Render (one step each) (+3 more)

## Knowledge Gaps
- **28 isolated node(s):** `npx`, `@shopify/dev-mcp`, `npx`, `@shopify/dev-mcp`, `CVE-2026-82417` (+23 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 220 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@shopify/shopify-app-react-router` connect `Admin Demo Routes` to `EncryptedSessionStorage`, `package.json`, `Server Rendering Runtime`?**
  _High betweenness centrality (0.177) - this node is a cross-community bridge._
- **What connects `npx`, `@shopify/dev-mcp`, `npx` to the rest of the system?**
  _28 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Why does `scripts` connect `NPM Scripts` to `package.json`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `Template Security Changelog` be split into smaller, more focused modules?**
  _Cohesion score 0.048625792811839326 - nodes in this community are weakly interconnected._
- **Why does `@shopify/shopify-app-session-storage-prisma` connect `Admin Demo Routes` to `package.json`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `Admin Demo Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
# Graph Report - cfs-configurator  (2026-11-09)

## Corpus Check
- 48 files · ~15,009 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: (none) 8, .toml 2, .css 1)

## Summary
- 362 nodes · 533 edges · 24 communities (22 shown, 2 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Dev Tooling Dependencies
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
- b4b-combinable.js
- CFS checkout risk tests: report
- b1-draft-price-override.js
- b2-automatic-discount.js
- b3-discount-code.js
- b4a-non-combinable.js
- b5-rejected-codes.js
- b6-mixed-basket.js

## God Nodes (most connected - your core abstractions)
1. `loadResults()` - 18 edges
2. `compilerOptions` - 18 edges
3. `scripts` - 17 edges
4. `write()` - 17 edges
5. `Shopify App Template - React Router README` - 17 edges
6. `saveResult()` - 15 edges
7. `SPIKE_TAG` - 14 edges
8. `variantPrice()` - 14 edges
9. `NATURAL_GOLD_VARIANT` - 12 edges
10. `DRAFT_FIELDS` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Shopify AI Toolkit` --semantically_similar_to--> `Shopify Dev MCP`  [INFERRED] [semantically similar]
  AGENTS.md → README.md
- `@shopify/shopify-app-template-remix` --conceptually_related_to--> `Shopify Remix app template`  [INFERRED]
  CHANGELOG.md → README.md
- `Global Shopify CLI installation` --conceptually_related_to--> `Shopify CLI`  [INFERRED]
  CHANGELOG.md → README.md
- `Polaris web components 2.x (polaris-2.js)` --conceptually_related_to--> `Polaris Web Components`  [INFERRED]
  CHANGELOG.md → README.md
- `openssl in Docker image for Prisma` --conceptually_related_to--> `Prisma session storage`  [INFERRED]
  CHANGELOG.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Expiring offline token session upgrade** — changelog_shopify_shopify_app_react_router, changelog_shopify_shopify_app_session_storage_prisma, changelog_session_refresh_token_fields, changelog_expiring_offline_access_tokens [EXTRACTED 1.00]
- **Production hosting options** — readme_google_cloud_run_deployment, readme_fly_io_deployment, readme_render_deployment, readme_manual_deployment_guide [EXTRACTED 1.00]
- **Webhook subscription pitfalls and remedy** — readme_app_specific_webhooks, readme_afterauth_shop_specific_webhooks, readme_admin_created_webhook_hmac_failure, readme_cli_webhook_admin_undefined [INFERRED 0.85]

## Communities (24 total, 2 thin omitted)

### Community 0 - "Dev Tooling Dependencies"
Cohesion: 0.05
Nodes (52): author, devDependencies, eslint@^8.57.1, eslint-import-resolver-typescript@^3.10.1, eslint-plugin-import@^2.32.0, eslint-plugin-jsx-a11y@^6.10.2, eslint-plugin-react@^7.37.5, eslint-plugin-react-hooks@^4.6.2 (+44 more)

### Community 1 - "Template Security Changelog"
Cohesion: 0.05
Nodes (36): Shopify AI Toolkit, Shopify app development agent guide, Action-origin validation, CVE-2026-82417, CVE-2026-82562, Declarative metaobject definition, Declarative product metafield definition, productVariantsBulkUpdate (+28 more)

### Community 2 - "Admin Demo Routes"
Cohesion: 0.06
Nodes (20): loginErrorMessage(), action(), loader(), loginErrorMessage(), action(), apiVersion, authenticate, login (+12 more)

### Community 3 - "Server Rendering Runtime"
Cohesion: 0.07
Nodes (27): handleRequest(), streamTimeout, addDocumentResponseHeaders, dependencies, isbot@^5.1.31, prisma@^6.16.3, @prisma/client@^6.16.3, react-dom@^18.3.1 (+19 more)

### Community 4 - "lib.js"
Cohesion: 0.17
Nodes (7): { draftOrder }, { draftOrder }, { draftOrder }, NATURAL_GOLD_VARIANT, RESULTS, STORE, variantPrice()

### Community 5 - "loadResults"
Cohesion: 0.17
Nodes (13): after, before, { draftOrderCreate }, input, { draftOrder }, { draftOrder: after }, { draftOrderDelete: r }, input (+5 more)

### Community 6 - "Shopify Platform Upgrades"
Cohesion: 0.10
Nodes (15): Admin intents, App Bridge web components, AppProvider, Polaris web components 2.x (polaris-2.js), polarisUrl option, Session refreshToken and refreshTokenExpires fields, @shopify/shopify-app-template-react-router changelog, @shopify/polaris-types (+7 more)

### Community 7 - "TypeScript Editor Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, allowSyntheticDefaultImports, baseUrl, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+11 more)

### Community 8 - "NPM Scripts"
Cohesion: 0.12
Nodes (17): scripts, build, config:link, config:use, deploy, dev, docker-start, env (+9 more)

### Community 9 - "PNPM Build Allowlist"
Cohesion: 0.20
Nodes (9): allowBuilds, esbuild, @parcel/watcher, prisma, @prisma/client, @prisma/engines, unrs-resolver, packages (+1 more)

### Community 10 - "write"
Cohesion: 0.21
Nodes (10): attempt(), { draftOrders }, drafts, input, key, keyed, result, execute() (+2 more)

### Community 11 - "b10b-unpublished-code.js"
Cohesion: 0.22
Nodes (5): after, before, { draftOrderCreate }, input, DRAFT_FIELDS

### Community 12 - "Cursor MCP Config"
Cohesion: 0.50
Nodes (3): npx, @shopify/dev-mcp, shopify-dev-mcp

### Community 13 - "Claude MCP Config"
Cohesion: 0.50
Nodes (3): npx, @shopify/dev-mcp, shopify-dev-mcp

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

## Knowledge Gaps
- **28 isolated node(s):** `npx`, `@shopify/dev-mcp`, `npx`, `@shopify/dev-mcp`, `CVE-2026-82417` (+23 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 194 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `scripts` connect `NPM Scripts` to `Dev Tooling Dependencies`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `npx`, `@shopify/dev-mcp`, `npx` to the rest of the system?**
  _28 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dev Tooling Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05152394775036284 - nodes in this community are weakly interconnected._
- **Why does `@shopify/shopify-app-react-router` connect `Admin Demo Routes` to `Dev Tooling Dependencies`, `Server Rendering Runtime`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Should `Template Security Changelog` be split into smaller, more focused modules?**
  _Cohesion score 0.048625792811839326 - nodes in this community are weakly interconnected._
- **Why does `react-router` connect `Admin Demo Routes` to `Dev Tooling Dependencies`, `Server Rendering Runtime`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Should `Admin Demo Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.05660377358490566 - nodes in this community are weakly interconnected._
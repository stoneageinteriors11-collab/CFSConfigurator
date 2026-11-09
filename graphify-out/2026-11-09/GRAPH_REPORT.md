# Graph Report - cfs-configurator  (2026-11-09)

## Corpus Check
- Corpus is ~5,821 words - fits in a single context window. You may not need a graph.

## Summary
- 286 nodes · 375 edges · 16 communities (14 shown, 2 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Dev Tooling Dependencies
- Template Security Changelog
- Admin Demo Routes
- Server Rendering Runtime
- Checkout Spike Scripts
- App Shell and Auth
- Shopify Platform Upgrades
- TypeScript Editor Config
- NPM Scripts
- PNPM Build Allowlist
- Declarative App Config
- Dependency Overrides
- Cursor MCP Config
- Claude MCP Config

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `scripts` - 17 edges
3. `Shopify App Template - React Router README` - 17 edges
4. `@shopify/shopify-app-react-router` - 10 edges
5. `react-router` - 8 edges
6. `@shopify/shopify-app-template-remix` - 8 edges
7. `authenticate` - 7 edges
8. `allowBuilds` - 7 edges
9. `login` - 6 edges
10. `Prisma session storage` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Shopify AI Toolkit` --semantically_similar_to--> `Shopify Dev MCP`  [INFERRED] [semantically similar]
  AGENTS.md → README.md
- `@shopify/shopify-app-template-remix` --conceptually_related_to--> `Shopify Remix app template`  [INFERRED]
  CHANGELOG.md → README.md
- `Global Shopify CLI installation` --conceptually_related_to--> `Shopify CLI`  [INFERRED]
  CHANGELOG.md → README.md
- `openssl in Docker image for Prisma` --conceptually_related_to--> `Prisma session storage`  [INFERRED]
  CHANGELOG.md → README.md
- `@shopify/shopify-app-session-storage-prisma` --conceptually_related_to--> `Prisma session storage`  [INFERRED]
  CHANGELOG.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Production hosting options** — readme_google_cloud_run_deployment, readme_fly_io_deployment, readme_render_deployment, readme_manual_deployment_guide [EXTRACTED 1.00]
- **Expiring offline token session upgrade** — changelog_shopify_shopify_app_react_router, changelog_shopify_shopify_app_session_storage_prisma, changelog_session_refresh_token_fields, changelog_expiring_offline_access_tokens [EXTRACTED 1.00]
- **Webhook subscription pitfalls and remedy** — readme_app_specific_webhooks, readme_afterauth_shop_specific_webhooks, readme_admin_created_webhook_hmac_failure, readme_cli_webhook_admin_undefined [INFERRED 0.85]

## Communities (16 total, 2 thin omitted)

### Community 0 - "Dev Tooling Dependencies"
Cohesion: 0.06
Nodes (47): author, devDependencies, eslint@^8.57.1, eslint-import-resolver-typescript@^3.10.1, eslint-plugin-import@^2.32.0, eslint-plugin-jsx-a11y@^6.10.2, eslint-plugin-react@^7.37.5, eslint-plugin-react-hooks@^4.6.2 (+39 more)

### Community 1 - "Template Security Changelog"
Cohesion: 0.06
Nodes (30): Shopify AI Toolkit, Shopify app development agent guide, Action-origin validation, CVE-2026-82417, CVE-2026-82562, productVariantsBulkUpdate, @react-router/serve, Scopes Update Webhook (+22 more)

### Community 2 - "Admin Demo Routes"
Cohesion: 0.09
Nodes (14): loginErrorMessage(), action(), loader(), loginErrorMessage(), action(), login, config, react@^18.3.1 (+6 more)

### Community 3 - "Server Rendering Runtime"
Cohesion: 0.07
Nodes (27): handleRequest(), streamTimeout, addDocumentResponseHeaders, dependencies, isbot@^5.1.31, prisma@^6.16.3, @prisma/client@^6.16.3, react-dom@^18.3.1 (+19 more)

### Community 4 - "Checkout Spike Scripts"
Cohesion: 0.14
Nodes (16): after, before, { draftOrderCreate }, input, { draftOrder }, DRAFT_FIELDS, execute(), loadResults() (+8 more)

### Community 5 - "App Shell and Auth"
Cohesion: 0.12
Nodes (6): apiVersion, authenticate, registerWebhooks, sessionStorage, shopify, unauthenticated

### Community 6 - "Shopify Platform Upgrades"
Cohesion: 0.10
Nodes (16): Admin intents, App Bridge web components, AppProvider, Polaris web components 2.x (polaris-2.js), polarisUrl option, Session refreshToken and refreshTokenExpires fields, @shopify/shopify-app-template-react-router changelog, @shopify/polaris-types (+8 more)

### Community 7 - "TypeScript Editor Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, allowSyntheticDefaultImports, baseUrl, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+11 more)

### Community 8 - "NPM Scripts"
Cohesion: 0.12
Nodes (17): scripts, build, config:link, config:use, deploy, dev, docker-start, env (+9 more)

### Community 9 - "PNPM Build Allowlist"
Cohesion: 0.20
Nodes (9): allowBuilds, esbuild, @parcel/watcher, prisma, @prisma/client, @prisma/engines, unrs-resolver, packages (+1 more)

### Community 10 - "Declarative App Config"
Cohesion: 0.33
Nodes (5): Declarative metaobject definition, Declarative product metafield definition, Admin-created webhook HMAC validation failure, afterAuth shop-specific webhook registration, shopify.app.toml

### Community 11 - "Dependency Overrides"
Cohesion: 0.40
Nodes (5): overrides, p-map, qs, pnpm, overrides

### Community 12 - "Cursor MCP Config"
Cohesion: 0.50
Nodes (3): npx, @shopify/dev-mcp, shopify-dev-mcp

### Community 13 - "Claude MCP Config"
Cohesion: 0.50
Nodes (3): npx, @shopify/dev-mcp, shopify-dev-mcp

## Knowledge Gaps
- **28 isolated node(s):** `npx`, `@shopify/dev-mcp`, `npx`, `@shopify/dev-mcp`, `CLAUDE.md agent instructions` (+23 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 134 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `scripts` connect `NPM Scripts` to `Dev Tooling Dependencies`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **What connects `npx`, `@shopify/dev-mcp`, `npx` to the rest of the system?**
  _28 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dev Tooling Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.057624113475177305 - nodes in this community are weakly interconnected._
- **Why does `@shopify/shopify-app-react-router` connect `Admin Demo Routes` to `Dev Tooling Dependencies`, `Server Rendering Runtime`, `App Shell and Auth`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Should `Template Security Changelog` be split into smaller, more focused modules?**
  _Cohesion score 0.05855855855855856 - nodes in this community are weakly interconnected._
- **Why does `react-router` connect `Admin Demo Routes` to `Dev Tooling Dependencies`, `Server Rendering Runtime`, `App Shell and Auth`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Should `Admin Demo Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.08870967741935484 - nodes in this community are weakly interconnected._
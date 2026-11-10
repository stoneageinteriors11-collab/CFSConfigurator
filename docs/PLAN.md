# CFS configurator: small-step plan

## Context

CFS needs configurable products on Shopify non-Plus without a variant per fabric or finish. Requirements are in `C:/Users/Admin/Documents/ChatGPT/Shopify/PRODUCTION_DEVELOPMENT_BRIEF.md` and `CLAUDE_MVP_HANDOFF.md`.

Agreed decisions:
- Test the items that could break the checkout route **before** building the validator, quote and basket.
- Shopify React Router template, **JS/JSX only**, Prisma.
- **Supabase** for Postgres, **Render** for hosting.

## How we work

- **One step at a time.** Each step below is a single action.
- After each step I stop and report in plain language: what I did, what happened, and what comes next. I start the next step only when you say so.
- If a step fails or surprises us, we discuss it before continuing.
- Nothing is bundled. Each store write is named in its step before it happens.

## Safety rules (every step)

- Store work targets `urban-deco-dev.myshopify.com` only, and every write checks that domain first. The live store is in the same organization.
- The Claude.ai Shopify connector is signed in to the **live** store, so it is used for documentation and schema lookups only.
- Do not modify the Dwell theme, publish any theme, or change the seven `cfs-type-test-*` fixtures.
- Everything created for testing is tagged `cfs-spike` and removable. Paid test orders stay as evidence.
- Secrets go in `.env` or the Render dashboard, and are never pasted in chat or committed. API version 2026-10.

## Part A: Setup

Done: JS app scaffolded in `cfs-configurator/`, registered in the Urban Deco UK organization and not installed on any store; scopes reduced to the agreed eight; template demo definitions removed; API pinned to 2026-10.

- **A1 (you):** run `shopify store auth` for the dev store and confirm the approval screen says Urban Deco Dev.
- **A2:** read-only check that the connection is the dev store.
- **A3:** read-only comparison of the seven fixtures against `cfs-data-review/mvp-store-snapshot.json`.
- **A4:** read-only list of existing discounts, which could affect test results.
- **A5:** read-only list of possible ordinary products. **You choose** one for the mixed-basket test, or the CFS team supplies one.

## Part B: Checkout tests (one test per step)

Tests live in `spike/`, with each result added to `spike/results.json` and shown to you before moving on. Base case: Natural Gold, variant `55773143433555`, £999.99 + drawer `17020886` £89.99 = **£1,089.98**.

| Step | Action | Pass condition |
|---|---|---|
| B1 | One draft with `priceOverride`, no discount | Checkout shows £1,089.98; catalogue price unchanged |
| B2 | Create one 10% automatic discount on test product IDs, then one draft with `acceptAutomaticDiscounts` | About £980.98, discounted once |
| B3 | Create one 10% code; shopper types it at checkout | Same result; code box appears |
| B4 | Automatic + code together, combinable then non-combinable | Follows Shopify's combination settings |
| B5 | Invalid or expired code | Rejected; price unchanged |
| B6 | Configured line + chosen ordinary variant | Both correct in one checkout |
| B7 | Complete one test payment | Order has real variant ID, attributes, discounts; stock decrements |
| B8 | Baseline: try buying a published fixture through `/cart/add.js` and `/cart/VARIANT:1` | Documents the bypass that exists today |
| B9 | Create one `cfs-spike` product with no sales channels and repeat B8 on it | All paths rejected |
| B10 | Repeat B1-B3 and B7 on the unpublished product | Draft checkout and discounts still work |
| B11 | Change a draft after its checkout is open, then pay from the old tab | Record the price charged |
| B12 | Delete a draft, then open its old URL | Record the outcome |
| B13 | Repeat Checkout clicks and a timed-out create | Idempotency approach identified |

Hosted checkout steps run in the browser via Claude in Chrome.

Only if B9 fails: test a Validation Function. Custom apps containing Functions are Plus-only, so a non-Plus store would need a public App Store app, and a dev-store pass would not prove production support.

**B14:** write `spike/REPORT.md` with Pass, Fail or Blocked for each test.

## Part C: Decision (with you)

**Current direction (9 November 2026):** products stay published. The theme blocks Add to Cart, quick add and every other buying control on these products until all required options are selected, working on the preview theme only. Direct cart links remain open (B8).

**Done on the preview theme, tested 9 November 2026:** product page message for missing options, and product cards and basket suggestions link to the product page. Scope is the CFS test products only, so the mattress add-on, bundle sets and quiz are left unchanged. Theme files go in the `Theme files` folder for the user to install, never pushed.

**Flagged for the end of the build:** whether to close that gap with a published zero-stock display product plus a hidden, unpublished purchase product (zero-stock refusal proven by B15), and what happens to an order with no matching app checkout (staff flag, or automatic cancel and refund, which needs `write_orders`). The bullets below are superseded until then.

- **Discounts, payment and unpublished blocking all pass:** use unpublished configurable products plus draft checkout. Then choose how the product page works, since an unpublished product has no native page: an app-served page, or a published display product paired with a hidden purchase product.
- **Unpublished blocking fails:** evaluate the Validation Function and App Store requirement.
- **Discounts fail:** report the exact case and revise the route, without approximating discounts in the app.

Detecting and cancelling orders afterwards is not prevention, so it does not pass this gate.

## Part D: Supabase and Render (one step each)

**Done 10 November 2026:** Supabase in Frankfurt (`eu-central-1`), session tokens encrypted, app live at `https://cfsconfigurator.onrender.com` and confirmed opening from Render inside the dev store admin. Next is Part E.

- **D1 (you):** create a Supabase project in a UK or EU region.
- **D2 (you):** put its pooled and direct connection strings in `.env`.
- **D3:** switch `prisma/schema.prisma` from SQLite to Postgres with `url` and `directUrl`, replacing the template's SQLite migrations.
- **D4:** run the first migration and confirm the tables exist in Supabase.
- **D5:** run the app locally against Supabase.
- **D6 (you):** create a Render web service connected to the repo, and add env vars in its dashboard. Use a paid always-on instance, because a sleeping free instance can miss Shopify webhooks.
- **D7:** set `application_url` and redirect URLs in `shopify.app.toml` to the Render URL, and deploy the config.
- **D8:** install on the dev store only and confirm the app opens in admin and its session is stored in Supabase.

Check Supabase's current connection guidance at D2 and D6, since Render's network access affects which connection string works.

## Part E: Build (each item broken into small steps when we reach it)

1. Delete spike code and template demo routes.
2. JavaScript config engine, independent of UI: validator and pre-discount quote in integer pennies, using `cfs_import.*` metafields and `source_mappings`. Fails closed on missing or ambiguous mappings. Natural Gold first.
3. Quote endpoint connected to the preview theme `211243106643`, keeping purchase guards until the controlled flow replaces them. **E3a done 10 November 2026:** Natural Gold is read live from the dev store and gives £1,089.98. **E3b done 10 November 2026:** price check live at `/apps/cfs/quote` (app proxy) and confirmed on the dev storefront. **E3c done 10 November 2026:** the Natural Gold product page on the preview theme shows the app's validated price, confirmed in the browser. Other product types are unchanged until E7. Next is E4.
4. Persistent basket. **E4a built 10 November 2026:** basket tables written and tested in a cancelled transaction; they are created in Supabase by the next Render deploy.
5. Checkout attempts tied to basket version.
6. Webhooks and immutable order snapshot.
7. All seven flows, 300+ choice loading, mobile and keyboard checks.

Reuse `cfs-data-review/mvp-store-snapshot.json` and `pdp-shopify-price-checks.json` (957 assignments) as engine fixtures, and `variant-selector-review/check-*.js` as browser regressions.

## Inputs needed from the CFS team

- Actual promotion types required.
- A paid non-Plus store before any production approval.

## Verification

- Part B: each test has inputs, expected, actual, draft/order IDs and checkout evidence. An Admin API read confirms fixtures and prices are unchanged, and cleanup leaves only tagged evidence orders.
- Part D: the app opens from the Render URL inside dev store admin, with its session row visible in Supabase.
- Part E: unit tests reproduce the 957 assignment prices plus the £1,089.98 and Fargo £2,579.96 cases, then the handoff section 8 acceptance list.
- Any dev-store pass is re-run on the paid non-Plus store before production approval.

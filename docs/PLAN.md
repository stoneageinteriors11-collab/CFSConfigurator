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
4. Persistent basket. **E4a done 10 November 2026:** basket tables created in Supabase by the Render deploy and confirmed with their rules and row level security. Render's Start Command is `npm run docker-start`, so future migrations apply on deploy. **E4b built 10 November 2026:** basket logic in `app/basket/basket.server.js` (add, merge, change quantity, remove, version rises on every change), tested against Supabase including simultaneous changes. **E4c done 10 November 2026:** storefront basket address at `/apps/cfs/basket` (app proxy POST: view, add, change quantity, remove), confirmed through the real dev storefront. Render moved from Virginia to Frankfurt beside the database, which cut adding to the basket from about 3.3 seconds to about 0.8. **E4d done 10 November 2026:** ordinary products work in the same basket at their Shopify price, and only a product with none of the CFS data counts as ordinary. Confirmed through the real dev storefront. **E4e done 10 November 2026:** Add to Cart on Natural Gold saves to the app basket on the preview theme, confirmed in the browser. Shoppers cannot see the basket yet because the theme's cart still reads Shopify's cart. **E4f part 1 done 10 November 2026:** each line saves its title, size, link and photo for display, confirmed through the real dev storefront, and Render applied the database change on deploy. **E4f part 2 done 10 November 2026:** the cart drawer and basket page on the preview theme show the app's basket with quantity, remove, total and icon count, confirmed in the browser by mouse and keyboard. Shopify's checkout button is hidden while app items are in the basket. Not yet checked on a real phone.
5. Checkout attempts tied to basket version.
   **Decision, 10 November 2026:** the app handles configured products only. Ordinary products keep Shopify's normal cart and checkout, so they keep selling if the app is down or configured purchases are paused. Only when a basket holds both does the ordinary item join the app's checkout, at the moment the shopper clicks Checkout, using the price and stock checked then. Ordinary Add to Cart is not moved to the app.
   - **E5a done 10 November 2026:** table of checkout attempts, with a database rule allowing one attempt per basket version, saved before calling Shopify. Created by the Render deploy and confirmed in Supabase with its rules and row level security.
   - **E5b done 10 November 2026:** re-check every line before checkout (current price, still for sale, real stock, with different configurations of one size sharing its stock), in `app/checkout/check-basket.server.js`. Confirmed read-only against the real dev store products. Nothing calls it until E5d.
   - **E5c done 10 November 2026:** create the draft order from the checked basket: price override, automatic discounts and codes allowed, tagged with the attempt ID, chosen options saved on each line. A repeat click reuses the same attempt, in `app/checkout/start-checkout.server.js`. Confirmed with one tagged draft on the dev store, since deleted, and 8 simultaneous clicks against the real database making one draft. Nothing calls it until E5d.
   - **E5d done 10 November 2026:** storefront checkout address at `/apps/cfs/checkout` (app proxy), confirmed through the real dev storefront. A changed price is saved to the basket and sent back for the shopper to review.
   - **E5e done 10 November 2026:** Checkout button for configured items in the drawer and basket page on the preview theme, with messages for a changed price, low stock and failures. Paid test order #1029 (draft #D21), £4,729.92, two configurations with their options on the order lines. Shipping and VAT were both £0 on the dev store, so they are still unproven. If the basket cannot be loaded, the shopper is told so and offered Try again, and Shopify's own checkout stays available for ordinary products.
   - **E5f:** both kinds in one basket.
     - **Part 1 done 10 November 2026, confirmed through the real dev storefront:** at Checkout the browser may send the Shopify cart's ordinary items, and the app copies them into the basket at Shopify's price and real stock, in `app/checkout/copy-cart.server.js`. An unchanged cart keeps the same basket version, so a repeat click reuses the same checkout. Configured products in Shopify's cart are refused, and ordinary items never check out through the app on their own. Confirmed locally against the real database and live Shopify reads, with no store write.
     - **Part 2 done 10 November 2026:** on the preview theme, beds and ordinary items share one white card with one total and one Checkout, in the drawer and on the basket page, confirmed in the browser. Ordinary rows are drawn from Shopify's cart and still change Shopify's cart, which stays their record. Paid test order #1030 (draft #D22), £1,238.98, bed plus mattress, with stock down by one on each. Before launch: ordinary cart items with line properties or selling plans are copied without them.
   - **After E6, because it needs to know the order was paid:** empty the app basket, and clear the ordinary items from Shopify's cart so they cannot be bought twice.
   - **Later:** a cleanup rule for old unpaid drafts, which pile up in Orders > Drafts, and only for drafts past an agreed age so that no shopper is still paying from one. Before launch, check the shipping email by fulfilling a test order (order confirmation email confirmed on #1029), and test ad and purchase tracking on draft-order sales.
6. Webhooks and immutable order snapshot. Shopify's payment webhook is the only proof of payment, never a redirect or a draft's state.
   - **E6a:** table of order snapshots, one per order, with a database rule refusing any change to a saved specification.
   - **E6b (done 11 November 2026):** build the specification from a Shopify order and its checkout attempt: SKU, CFS attribute and assignment IDs for each option, names, quantities, price breakdown, Shopify's discount allocations and final totals. No customer details are kept; they stay in Shopify. Checked read-only on real orders: #1029 and #1030 matched their checkouts exactly, and #1027 and #1028 (made by hand, with an automatic discount and a code) were recorded as not from an app checkout with their discounts per line. The test products have no separate supplier code, configuration version or dimensions, so none are recorded; to revisit when real CFS data adds them.
   - **E6c:** add the verified, repeat-safe `orders/paid` webhook and save the snapshot. Code done 11 November 2026 and checked before deploy: #1030 saved and matched in a rolled-back transaction, a repeat left one record, unsigned and wrongly signed notifications were refused, and a signed one read Shopify with the stored access. A second order naming an already paid checkout is saved without the link, to be flagged in E6d. Live test passed: order #1031 (£1,089.98), `orders/paid` delivered on the first attempt with 200 OK in the Dev Dashboard Logs, record saved two seconds after payment and matched to its checkout. No order data was withheld, so no protected-data request was needed; the record reads no customer details. Re-check on the paid store before launch. You run `shopify app deploy`. One paid test, with delivery checked in the Dev Dashboard's Logs. Shopify's docs place the "Protected customer data access" request in the Partner Dashboard, which we do not use, and list this data as always available to custom apps, so we test first and only look for that setting if order data is withheld.
   - **E6d:** follow cancelled, refunded, pending and failed orders on the snapshot, and flag an order that has no matching app checkout or a different price. Code done 11 November 2026: `orders/cancelled` and `refunds/create` copy Shopify's current payment status and cancellation onto the record. Records are only made on payment, so unpaid (pending) orders get none, and a payment that fails makes no order. Orders of ordinary products only, from Shopify's own checkout, are not saved. A paid order containing a configurable product with no app checkout, or differing from its checkout, is saved with that status and logged as needing attention; staff see it on the admin screen later (tagging the Shopify order would need `write_orders`, an end-of-build decision). Checked before deploy on real orders #1027 and #1031 in a rolled-back transaction and with signed local notifications. Live test passed: refunding #1031 changed its record to REFUNDED, and cancelling it saved the cancellation time two seconds later, both matching Shopify, with the specification unchanged.
   - **E6e:** after payment, empty the app basket and remove the ordinary items from Shopify's cart. App basket done 11 November 2026: the paid quantities leave the basket in the same transaction that saves the order record, so a repeat cannot remove them twice, and items added after checkout started stay. Checked in a rolled-back transaction. Live test passed with order #1032 (two beds and the ordinary mattress, £2,298.96): record saved and matched five seconds after payment, the app basket emptied, and Shopify's own cart was empty afterwards without any theme change, as after #1030. This is observed, not documented by Shopify, so it is re-checked in E7. Seen during the test: after about 20 quiet minutes the basket drawer showed "We could not load your basket", which looks like the Render instance sleeping; see D6. The instance is on Render's free plan, so it sleeps. Theme change made the same day: when the app does not answer, the basket asks again quietly for about a minute. Shoppers with no configured items last time see Shopify's normal cart throughout. Shoppers who had configured items see "Loading your basket…", and the error only if the app is still away after that minute.
   - **E6f:** recover webhooks that were missed while the app was down. Code done 11 November 2026: Shopify retries a failed notification 8 times over 4 hours and then stops, and recommends a catch-up job. Soon after start-up and every 15 minutes, the app lists orders changed since its last check (the first check looks back a week, and each check overlaps the last by 10 minutes). It saves any paid order without a record through the same code as the paid notification, and copies Shopify's current status onto saved records. This also covers a refund that arrives before the paid record exists. A failed order is tried again next time. Checked before deploy in a rolled-back transaction: with #1032's record removed, the catch-up rebuilt it matched, with the same specification, and a second run changed nothing. Live run passed 11 November 2026 at 09:47 UTC: 9 orders from the past week checked with no failures, and 4 missed orders recorded. #1029 and #1030 were matched to their app checkouts. #1026 and #1027, configurable beds bought without the app's checkout, were saved as needing attention. #1024, #1025 and #1028 were correctly skipped, because they hold only the old "CFS PILOT - Alice Static Armchair", which has no CFS options. #1031 and #1032 were already recorded and stayed unchanged.
   - **Admin screens** (agreed after E6; no editing, discounts or reports):
     - **Orders:** a list plus each order's saved configuration in readable form. Code done 11 November 2026: Orders in the app menu, newest order first, 25 per page. Each order page shows its check result, payment status, every line's options with CFS option and assignment IDs, prices, discounts, totals, the checkout it came from, and a link to the order in Shopify. Orders needing attention carry a warning. Every read is limited to the signed-in shop. Checked against the live database: six records listed in order, and another shop sees none. Seen live in the dev store admin: the list, #1032 (both beds' options and prices adding up) and #1026 (warning shown) all display correctly.
     - **Orders needing attention.** Code done 11 November 2026: "All orders" and "Needs attention (count)" buttons on the Orders page. An order needs attention when it did not match its checkout and is not cancelled; a cancelled one shows a calm note instead of the warning. Checked against the live database: #1026 and #1027 listed, count 2, another shop 0. Staff cannot mark an order as dealt with (no editing), so an unmatched order stays listed until cancelled; tagging or cancelling it in Shopify needs `write_orders`, which is still an end-of-build decision.
     - **Product check** for the seven products. Code done 11 November 2026: a "Product check" page lists the products tagged `cfs-configuration-type-test`. It is read only and checks live each time it opens, using the shop's own pricing code: every size in stock must have a model card and price the cheapest complete selection, and every choice must have readable data. It shows Ready or the problems found, sizes in stock, option groups, choices and the "from" price. Checked against the dev store: Natural Gold is ready, 6 of 6 sizes from £999.99. The other six are not ready because their product types (normalDropDown, rauchPopup, rauchPopupQuadra, rauchPopupXtend, multipleDropDownWithoutMapping, multipleDropDownWithMappingImperial) are not priced yet; this page tracks that work in E7.
7. All seven flows, 300+ choice loading, mobile and keyboard checks. **Decision, 11 November 2026:** no CFS type names in code. After launch, new products and types must work without a developer, so the app prices any product whose data uses only rules it understands, and refuses (and the Product check lists) any product with a rule or field it does not know. E7 therefore adds missing building blocks, not types.
   - **E7a, prices by rules, not type names:** code done 11 November 2026. A survey of all seven products found one data format; the type label never changes the price. Understood rules: sizes as variants; groups, required or optional, one choice each; a group that comes after the size or an earlier group; a choice price shared by all sizes or set per size. Display-only fields (type label, filters, dimensions, the old CFS sale snapshot) are ignored. Anything else is refused whole. Tests from saved live data match every live CFS price recorded on 7 November before CFS's own sale: Fargo (17, the £2,579.96 example, and all 32 choices on all 15 sizes), Moreno (5), Paris (7) and Mayfair (6). Natural Gold is unchanged. Expected result: 5 of 7 ready. Zenaya and Loft wait for accessories with quantities, the next building block. Theme: every CFS product uses the app's price and basket; the old 15%/23% display discount is removed, and a product the app refuses shows "Not available to order online yet". Checked live on the storefront after deploy: Fargo £2,579.96 example priced 257996, a missing Table Top refused, Paris cheapest smallest size 246999 (matches live CFS), Zenaya refused as unsupported, and the Fargo page shows its £1,459.99 base price without the old 15% discount.
8. **Option importer** (later phase, after E7 and before launch; discussed 11 November 2026, not started). Staff choose products by SKU or brand, upload the option data, and the app creates the option metaobjects and attaches them to the products, instead of a developer running the import script.
   - After E7, so the importer can refuse any data the pricing code cannot price.
   - Step 1 is read only: upload a file, see a preview (products, choices, prices) and the product check result, with nothing written.
   - Step 2 writes, only after the preview has been trusted on real data: confirm before writing, and a way to restore the previous data. Saved orders are unaffected either way.
   - Needs new write permissions for products and metaobjects, which every merchant approves and which the live store would share. This is a deliberate decision.
   - Open questions: where the option data comes from (CFS export, supplier feed or staff), how often it changes and for how many products (manual upload or automatic sync), whether choices such as fabric ranges are shared across products or copied per product, and whether an upload needs a second person's approval.

Reuse `cfs-data-review/mvp-store-snapshot.json` and `pdp-shopify-price-checks.json` (957 assignments) as engine fixtures, and `variant-selector-review/check-*.js` as browser regressions.

## Inputs needed from the CFS team

- Actual promotion types required.
- A paid non-Plus store before any production approval.

## Verification

- Part B: each test has inputs, expected, actual, draft/order IDs and checkout evidence. An Admin API read confirms fixtures and prices are unchanged, and cleanup leaves only tagged evidence orders.
- Part D: the app opens from the Render URL inside dev store admin, with its session row visible in Supabase.
- Part E: unit tests reproduce the 957 assignment prices plus the £1,089.98 and Fargo £2,579.96 cases, then the handoff section 8 acceptance list.
- Any dev-store pass is re-run on the paid non-Plus store before production approval.

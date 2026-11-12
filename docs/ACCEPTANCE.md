# CFS configurator MVP: acceptance report

Checked 11 November 2026 against section 8 of `CLAUDE_MVP_HANDOFF.md`, on the development store `urban-deco-dev.myshopify.com` (non-Plus development store, GBP) with the preview theme "CFS options display preview". Machine-readable results: [`acceptance-results.json`](acceptance-results.json). Build history: [`PLAN.md`](PLAN.md). Early checkout tests: [`../spike/REPORT.md`](../spike/REPORT.md).

**This is a development-store pass. Nothing here is certified for production until it is repeated on a paid non-Plus store.**

## Summary

| # | Area | Result |
|---|---|---|
| 1 | Identifiers, price breakdown, discounts, expected against actual | Pass |
| 2 | Basket cases | Pass |
| 3 | Shopify discounts | Pass for percentage discounts; real promotion types not supplied |
| 4 | Stock and duplicates | Pass, zero stock not tried live through the app |
| 5 | Saved order record | Pass, dimensions and pricing version not recorded |
| 6 | Price bypass, shipping and VAT, payment methods | Open or blocked |

## How prices work

Configured price = Shopify variant price + each chosen option's charge for that size + each accessory's charge × its quantity, in whole pennies, worked out by the app from Shopify's data on every quote and again at checkout. The browser's numbers are never trusted. Shopify then applies its own discounts at checkout. The app does not discount anything itself.

## Evidence orders

All paid with the development store's test gateway. Shipping and tax were £0.00 on every order.

| Order | Route | Lines (SKU × quantity at unit price) | Discount | Total | Shows |
|---|---|---|---|---|---|
| #1026 | Spike draft (B1) | CFS-TYPE-146477-17019157 × 1 at £1,089.98 | £0 | £1,089.98 | Server price on a real variant; catalogue price unchanged |
| #1027 | Spike draft (B7) | Natural Gold × 1 at £1,089.98; TEST-EOC-S × 1 at £149.00 | £108.99 | £1,129.99 | Automatic discount on the configured line only; stock fell on both |
| #1028 | Spike draft (B10c) | Unpublished pilot product × 1 at £672.28 | £67.22 | £605.06 | Code works on an unpublished product |
| #1029 | App checkout (E5e) | CFS-TYPE-146477-17019157 × 3 at £1,089.98; CFS-TYPE-146477-17019161 × 1 at £1,459.98 | £0 | £4,729.92 | Quantity above one; two configurations |
| #1030 | App checkout (E5f) | Natural Gold × 1 at £1,089.98; TEST-EOC-S × 1 at £149.00 | £0 | £1,238.98 | Configured plus ordinary in one checkout |
| #1031 | App checkout (E6c) | Natural Gold × 1 at £1,089.98 | £0 | £1,089.98 | Paid notification saved; later refunded and cancelled, record followed |
| #1032 | App checkout (E6e) | Natural Gold 2ft 6in × 1 at £1,089.98; 3ft × 1 at £1,059.98; TEST-EOC-S × 1 at £149.00 | £0 | £2,298.96 | Basket and Shopify cart emptied after payment |
| #1033 | App checkout (E7d) | CFS-TYPE-69733-1840531 (Loft) × 1 at £1,389.97; TEST-EOC-S × 1 at £149.00 | £0 | £1,538.97 | Accessory quantity 2 ("Lightings: 2 × 102 : Lighting for Footboard") |
| #1034 | App checkout (E8a) | Natural Gold × 1 at £1,089.98 | £108.99 | £980.99 | 10% automatic discount through the app's own checkout |

Breakdown example (#1034): base £999.99 (2ft 6in Small Single) + "with 2 Drawer" £89.99 (CFS assignment 17020886) + Carlton Black £0.00 (17020903) = £1,089.98. Shopify's 10% automatic discount took £108.99, giving £980.99. Expected and actual match.

## 1. Identifiers and breakdowns: Pass

Every app order record holds the Shopify order and line IDs, variant ID, SKU, CFS choice and assignment IDs, base and option charges, Shopify's discount allocations and the final totals, and links to its checkout attempt and basket version. Prices are kept apart from shipping and tax in the record, but shipping and tax were never charged on the development store (see 6).

## 2. Basket cases: Pass

| Case | Result | Evidence |
|---|---|---|
| Configured item alone | Pass | #1031, #1034 |
| Ordinary item alone | Pass by design | Ordinary-only baskets use Shopify's own cart and checkout, so they keep selling if the app is down |
| Mixed basket | Pass | #1030, #1032, #1033 |
| Two different configurations of one size | Pass in automated tests | Kept as separate lines and share the size's stock (`test/checkout/check-basket.test.js`, `test/orders/specification.test.js`). Not yet in a paid order |
| Quantity above one | Pass | #1029, three copies of one configuration |
| Change quantity and remove | Pass | Checked in the browser on the preview theme (E4f) |
| Edit a configuration in place | Pass | Edit link in the basket opens the product page with the line's choices picked; Update item re-prices it and saves over the same line, keeping quantity and place. Editing into a configuration already in the basket joins the two lines. Checked on the preview theme 12 November 2026 (E9) |
| Options at no cost | Pass | Carlton Black £0 in #1034; "without Drawer" included |
| Size-specific charges | Pass | All seven test products; tests match every recorded live CFS price (Fargo all 32 choices on all 15 sizes, plus Moreno, Paris, Mayfair, Natural Gold, Zenaya, Loft) |
| Accessory quantities | Pass | #1033; a quantity over the product's limit (5) is refused |
| More than 250 choices | Pass | 300-choice test product, choice 300 priced £1,114.98 on the page, basket and checkout (E7e) |

## 3. Shopify discounts: Pass for percentage discounts

| Case | Result | Evidence |
|---|---|---|
| Automatic discount | Pass | B2; #1034 through the app's checkout |
| Code typed at checkout | Pass | B3; #1028 |
| Automatic and code, not combinable | Pass | B4a: code refused, automatic kept |
| Automatic and code, combinable | Pass | B4b: Shopify kept one discount on the line |
| Expired or invalid code | Pass | B5: both refused, total unchanged |
| No double discount | Pass | The app sends the price before discounts; the old 15% and 23% display discount was removed from the theme |
| The business's real promotion types | **Blocked** | Not supplied by the CFS team yet |
| Unequal sizes, order-level and shipping discounts | **Open** | Not tested |

## 4. Stock and duplicates: Pass

| Case | Result | Evidence |
|---|---|---|
| Stock is checked again at checkout | Pass | Automated tests: exact stock passes, one more is refused; configurations of one size add up against its stock |
| Real Shopify stock changes | Pass | B7 and #1030: stock fell by one on each line |
| Configured sizes always held to stock | Pass | Rule since E8b: an untracked or overselling configured size is refused or limited; ordinary products follow Shopify |
| Zero stock blocks checkout | Pass in automated tests | Not yet tried live through the app's checkout |
| Repeated Checkout clicks | Pass | 8 simultaneous clicks made one draft (E5c) |
| Repeated paid notification | Pass | One record kept (E6c) |
| Missed notifications | Pass | Catch-up every 15 minutes rebuilt missing records (E6f) |
| Basket kept on recoverable failure | Pass | The basket is emptied only after payment; failures offer Try again (E5e) |

## 5. Saved order record: Pass, two fields missing

The database refuses any change to a saved specification, so later edits to choices or prices cannot rewrite old orders. Each record holds base SKU, CFS choice and assignment IDs, labels, quantities, the price breakdown, Shopify's discounts and final totals. **Not recorded:** dimensions and a configuration or pricing version, because the test data has neither. To add when real CFS data supplies them.

## 6. Price bypass, shipping and VAT, payment methods: Open

| Item | Result | Notes |
|---|---|---|
| Price bypass through direct cart links | **Fail (known, accepted for now)** | `/cart/VARIANT:1` and `/cart/add.js` still buy a published configurable product at its base price (B8). Decided 11 November 2026: products stay published, and such orders are saved and shown to staff as needing attention. A hidden purchase product and automatic cancelling were considered and not chosen for now |
| Paying from an old checkout tab after a change | **Blocked** | B11 and B12: the old tab did not complete payment, cause unknown |
| Shipping | **Open** | Never charged on the development store |
| VAT | **Open** | £0 on every order |
| Payment methods and express checkout buttons | **Open** | Only the test gateway used |
| Paid non-Plus store | **Blocked** | Needed before production approval |

## Known limits

- The app runs on Render's free plan, which sleeps after 15 quiet minutes and takes about 43 seconds to wake. Production needs an always-on plan.
- Mobile and keyboard checks are deferred until after the MVP.
- Ordinary cart items with line properties or selling plans are copied into a mixed checkout without them.

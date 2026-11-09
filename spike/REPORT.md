# CFS checkout risk tests: report

Run on 9 November 2026 on `urban-deco-dev.myshopify.com` (Shopify development store, non-Plus), Admin API 2026-10.
Payments used Shopify's test gateway. Full inputs, IDs and evidence paths are in `spike/results.json`.

## Conclusion

Draft-order checkout worked for every core case tested: server-set prices, automatic discounts, shopper-entered codes, mixed baskets, and paid orders.
Unpublished products were refused by both storefront routes tested, and could still be sold through a draft order.

The route can go forward to the Part C decision. A development store result does not prove production behaviour, so these tests must be repeated on a paid non-Plus store before production approval.

## Results

| Test | What was tested | Result | Evidence and outcome |
|---|---|---|---|
| B1 | Draft with server-set price, no discount | Pass | #D7, order #1026, £1,089.98. Catalogue price stayed £999.99. |
| B2 | 10% automatic discount | Pass | #D8, £980.99. Discount applied once. Shopify rounded it to £108.99. |
| B3 | 10% code typed at checkout | Pass | #D9, £980.99. Code box appeared. |
| B4a | Automatic + code, not combinable | Pass | #D10. Code refused, automatic kept, £980.99. |
| B4b | Automatic + code, combinable | Pass | #D11. Code replaced the automatic discount. One discount on the line, £980.99. |
| B5 | Expired and invalid codes | Pass | #D12. Both refused, total stayed £1,089.98. The invalid code result was reported by the tester, not captured. |
| B6 | Configured line + ordinary product | Pass | #D13, £1,129.99. Discount reached the configured line only. |
| B7 | Paid discounted mixed basket | Pass | Order #1027, £1,129.99. Real variants, attributes and discount kept. Stock fell by one on both lines. |
| B8 | Baseline: buy a published variant directly | Pass (bypass confirmed) | `/cart/VARIANT:1` reached checkout at £999.99 with no configuration. `/cart/add.js` also accepted it. |
| B9 | Same routes on an unpublished product | Pass | Alice pilot. Link refused ("Link no longer exists"), `/cart/add.js` returned 422. |
| B10a | Automatic discount on unpublished product | Pass | #D14, £672.28 to £605.06. |
| B10b | Code on unpublished product | Pass | #D15, £672.28 to £605.06. |
| B10c | Payment on unpublished product | Pass | Order #1028, £605.06. |
| B11 | Change a draft while its checkout is open | Blocked | #D16 changed from £1,089.98 to £1,179.97. The open tab offered £999.99 and payment did not complete, so no price was charged. A fresh link showed £1,179.97. |
| B12 | Delete a draft while its checkout is open | Pass with caveat | Fresh link refused. The open tab still displayed a checkout at £999.99, payment did not complete, and no order was created. |
| B13 | Duplicate draft creation | Pass (approach identified) | The same `@idempotent` key was accepted but created two drafts, #D17 and #D18. The app must prevent duplicates itself. |
| B15 | Published product at zero stock, overselling off | Pass | Page loaded with a Sold out button. `/cart/add.js` returned 422 and the cart stayed empty. `/cart/VARIANT:1` opened an Out of stock dialog with only Return to store. Storefront API not tested. |

## Rules for the build

1. Create a new draft for any change. Never edit or delete a draft after its checkout link has been issued, except to remove a duplicate.
2. Check every incoming order against the recorded checkout attempt, including price.
3. Allow one checkout attempt per basket version, enforced by a unique database rule and saved before calling Shopify. A repeat click returns the same link.
4. Tag each draft with its attempt ID. After a timeout, wait before searching for that tag, because a new draft did not appear in search immediately.
5. Build order snapshots from discount allocations and order totals. On code-discount order #1028 the line's `discountedTotalSet` stayed at £672.28 while its allocation held £67.22.
6. Let Shopify calculate discounts, and do not copy its rounding into the app.

## Not proven

| Item | Status |
|---|---|
| Paid non-Plus store | Not tested. Required before production approval. |
| VAT | Every test order showed £0.00 tax and no VAT line. |
| Storefront API and other sales channels | Not tested for unpublished products. The tests cover the Online Store routes only. |
| Accelerated checkout | Not tested directly. |
| Stock limits on unpublished products | Not proven. Alice is untracked. A tracked test product and `write_inventory` are needed. |
| Why stale checkouts would not pay | Unknown. One attempt each in B11 and B12, with no network evidence captured. |
| Simultaneous clicks and real timeouts | Not tested. B13 sent requests one after the other. To be tested once the checkout button exists. |
| Discount edge cases | Unequal sizes, multi-line discounts, order-level and shipping discounts are not tested. |
| Real promotion types | The CFS team has not yet supplied them. |

## Decisions for Part C

**Current direction (9 November 2026):** products stay published. The theme blocks Add to Cart, quick add and every other buying control on these products until all required options are selected.

Known gap: theme blocking does not stop `/cart/VARIANT:1` or `/cart/add.js`, as B8 shows, so an order without a matching app checkout remains possible.

**Decisions for the end of the build:**

1. Whether to close that gap with a published display product plus a hidden, unpublished purchase product. This was chosen briefly and then deferred.
   - The display product would be tracked at zero stock with overselling off, which B15 proved on the Online Store routes. The block lasts only while stock stays at zero and overselling stays off.
   - The hidden purchase product would hold real stock and be sold only through the app's draft checkout, as proven by B9 and B10.
   - Promotions would have to target the hidden purchase products.
2. What the app does with an order that has no matching app checkout: flag it for staff, or cancel and refund it automatically, which needs `write_orders`.
3. Whether the wrong price shown in a stale checkout tab is acceptable, given that no payment completed.

## Left on the development store

- Paid test orders #1026, #1027 and #1028, kept as evidence.
- Open test drafts #D8 to #D12, #D14, #D17 and #D18, tagged `cfs-spike`.
- Test discounts, which expire within 24 hours of creation.
- Test product `CFS SPIKE B15 - Display product zero stock`, published and tagged `cfs-spike`.

Some evidence screenshots are in a temporary Chrome folder, and may not last. The paths are in `results.json`.

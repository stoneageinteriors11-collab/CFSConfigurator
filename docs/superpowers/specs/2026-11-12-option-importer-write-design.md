# Option importer stage 3: write and restore. Design

12 November 2026. Status: draft for the user's review. Builds on `2026-11-12-option-importer-design.md` (the approved importer design) and stages 1 and 2, which are done.

## What it adds

On the Options import page, after a preview says **Ready to import**:

1. **Import:** writes every product in the sheet to Shopify. The page shows progress per product, then each product's result ("Imported, ready to sell" or "Not changed: reason").
2. **Import history:** a list of past imports (when, who, which products). Each imported product has a **Restore** button that puts back that product's options as they were just before that import.

## What exists today (checked on the dev store, 12 November 2026)

- Each product's choices are entries of the Shopify type `cfs_import_option`, **one entry per choice per product** (292 entries for the seven test products). The product lists them in its `cfs_import.options` list. `cfs_import.workflow` and `cfs_import.model_cards` are JSON values on the product.
- **The theme builds the product page straight from those entries** (`snippets/cfs-import-options.liquid` reads `label`, `group_name`, `image_url` and `source_mappings` from each entry). So do the pricing code, the product check and the large-list loader.
- The entry type was created by hand in the store (merchant-owned, editable by apps). The app has `read_metaobjects` and `write_products`; writing entries needs `write_metaobjects`.
- Shopify's `metafieldsSet` changes up to 25 product values in one step and is all-or-nothing. A product's list can hold 1,024 entries. Each entry type can hold 1,000,000 entries.

## The one decision for the user: how shared options are stored

The sheet already links shared options with **Option code**. There are two ways to store them.

**A. Keep today's storage (recommended for now).**
- Each product keeps its own entry per choice, as the theme and pricing already expect. The Option code is saved on each entry as a new field.
- "Shared" means the app keeps name, image and details the same everywhere. A sheet that gives a code a different name, image or details from products not in the sheet is refused. The preview names those products, and the team includes them in the same sheet to change the option everywhere at once. This keeps the rule that an import never changes a product the sheet doesn't mention.
- No change to the theme, the pricing or checkout. It can be built and tested in days.
- **Limit:** about 1,000,000 ÷ (average choices per product) products. At today's average of 42 that's about 23,800 products; at 150 it's about 6,600.

**B. True shared storage.**
- One entry per shared option (name, image, details), plus each product's own prices and groups in a JSON value on the product.
- Far fewer entries, so no practical limit on products. Changing a shared option's image changes it everywhere automatically.
- Needs a rewrite of the theme's options snippet, the pricing loader, the large-list loader and the product check, and a move of every existing product to the new layout. Weeks, not days, and the risk lands on the checkout path that is already proven.

**Recommendation: A now.** The sheet and the Option code column are the same either way, so moving to B later only changes how the app stores data. Choose B only if CFS expects more configurable products on Shopify than A's limit allows.

**Decided 12 November 2026: A.**

## When a sheet contains an option that is already live

The preview checks the sheet against what is live in the store, before anything is written.

| Case | What happens |
|---|---|
| The product is re-uploaded with nothing changed | That product is skipped: "No changes". Nothing is written. |
| An option code already live on other products, with the same name, image and details | Allowed. This product gets its own copy carrying the code. The other products are not touched. |
| An option code already live on other products, but the sheet gives it a different name, image or details | Refused before writing. The preview lists each product that has the code and what differs. To change the option everywhere, the team adds those products to the same sheet. |
| A choice with no option code (or a different code) whose name matches a live coded option | Allowed, but the preview shows a warning: "Carlton Black has the same name as option code CB01 on products 146477, 69733; add the code if it is the same option". It is stored as a separate option. |
| The same option code twice in one product | Refused (already checked in stage 1). |
| Two imports at once | The second is refused until the first finishes. |

Skipping unchanged products and the same-name warning are the builder's calls, added 12 November 2026.

## How a product is written (both options)

For each product, one at a time:

1. **Check again.** The confirmed file is checked again in full, exactly as the preview did. If anything changed since the preview (for example a size was deleted), nothing is written.
2. **Save the backup.** The product's current options (`workflow`, `model_cards`, every choice with its prices, and the list of entry IDs) are saved in the app's database, with the import, time and staff member.
3. **Create the new entries.** Each choice is written as a **new** entry, with a handle unique to this import (`cfs-{productId}-{choiceId}-{importId}`). Live entries are never edited in place, so shoppers keep seeing the old options until the switch.
4. **Switch in one step.** One `metafieldsSet` sets the product's `options` list, `workflow` and `model_cards` together, all or nothing.
5. **Confirm.** The app reads the product back and runs the product check. The result is recorded.
6. **Clean up.** The product's old entries are deleted, but only those no other product lists.

If anything fails before step 4, that product is unchanged and its half-made new entries are deleted. Products are independent: if product 3 of 5 fails, products 1 and 2 stay imported (each can be restored), and 4 and 5 still run. Shopify cannot change several products in one all-or-nothing step, so this is the closest to "all or nothing" that is safe: **no single product is ever half written**.

Baskets and orders:
- Choice IDs (CFS choice IDs) stay the same, so baskets keep their lines.
- A changed price is caught by the existing re-pricing at checkout.
- Saved orders are never touched.

## Restore

Restore writes a backup through the same path:
- steps 3 to 6, with the backup as the new data;
- a fresh backup is taken first, so a restore can itself be undone.

With option A, a restore puts back the product's own entries as they were, including name, image and details. If that option's code has changed on other products since, the restore is refused, naming them, so shared options never drift apart silently.

## Running an import

- Writing a product takes about one Shopify call per choice, roughly 5 to 10 choices a second, so 7 products with 192 choices take about half a minute. An import therefore runs in the background: the page shows progress and the result when done, and can be left open.
- One import at a time per shop. A second Import click while one is running is refused.
- **Safety switch:** writing is allowed only on shops listed in a Render setting, `IMPORT_WRITE_SHOPS`. For now that's `urban-deco-dev.myshopify.com` only. The live store cannot be written until you add it.

## Database (new tables, applied by the Render deploy as before)

- `ImportRun`: shop, who, when, file name, status (running, done, failed), per-product results.
- `ImportBackup`: run, shop, Shopify product ID, CFS product ID, the saved options (JSON), and whether it has been restored.

## Permission and setup steps for the user

1. Approve adding `write_metaobjects` to `shopify.app.toml`, then run `shopify app deploy` and accept the new permission on the dev store. Already agreed on 12 November 2026.
2. With option A, add one field to the "CFS imported option (test)" entry type in the Shopify admin: **Option code**, single line text, marked filterable so the app can find every product using a code. The app does not get permission to change entry types itself.
3. Add `IMPORT_WRITE_SHOPS` in Render.

## Tests and trial

- **Unit tests:** the write steps against a fake Shopify, including a failure at each step, which leaves the product unchanged.
- **Trial order:**
  1. a `cfs-spike` copy of Natural Gold;
  2. a one-price change on that copy, seen on the product page and at checkout;
  3. Restore on the copy;
  4. then the seven test products re-imported unchanged, still ready and priced as today.

## Not in this stage

Writing to the live store. Deleting a product's options entirely. Importing new sizes or products. A second person approving an import.

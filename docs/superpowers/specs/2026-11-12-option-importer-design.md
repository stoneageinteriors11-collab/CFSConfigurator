# Option importer: design

12 November 2026. Status: approved by the user 12 November 2026.

## Why

Today a configurable product only gets its options (fabrics, drawers, lights and so on) when a developer runs an import. The CFS team needs to set and change options themselves, from a spreadsheet, inside the app. They usually update a handful of products at a time: a new range, or a price change.

## What it does

In the app's admin there is a new **Options import** page. A staff member can:

1. **Download sample**: an empty spreadsheet with the right columns and example rows.
2. **Download current options**: for chosen products, the options they have now, in the same layout, ready to edit.
3. **Upload** a filled spreadsheet and see a **preview**: each product, its groups, its choices and the price on every size, plus anything wrong, by sheet and row number. Nothing is written yet.
4. **Confirm** to write the options to those products in Shopify.
5. **Restore** a product's previous options if an import was a mistake.

## Goals

- The team can add, change and remove options for existing products without a developer.
- One row per choice, so the sheet is short and easy to keep up to date.
- Every row is checked against the real Shopify product and its sizes before anything is written.
- An import can never leave a product half updated, or with options the app cannot price.

## Not in scope

- Creating products or sizes. They already exist in Shopify; a product that is not found is refused.
- Reading the raw CFS database exports (`products.csv`, `product_attributes.csv`, `accessories.csv`). They are far too large to upload (about 535 MB together), and the team works from the spreadsheet. A converter from those exports could come later.
- Search in large choice panels, mobile and keyboard checks: separate later phases.

## Must never happen (anti-goals)

- A product left with some of its options written and some not.
- Options written that the shop then refuses to price, so shoppers meet a product they cannot buy.
- An import that changes a product the sheet does not mention.
- Prices or choices on past orders changing. Saved order records are already locked and must stay so.

## How products and sizes are found

- **Product:** `CFS product ID` (the CFS `iProductId`, for example `146477`). The app finds the Shopify product whose variant SKUs carry that ID.
- **Size:** the CFS size ID (`iProAttrId`, for example `17019159`). Real variant SKUs follow `{PREFIX}-{productId}-{sizeId}`, for example `CFS-146477-17019159`. The app reads the last two numbers of each variant SKU; the prefix does not matter (`CFS-`, `UD-` and the test products' `CFS-TYPE-` all work).
- A size ID in the sheet that is not one of the product's variants is an error on that row.

## The spreadsheet

An Excel file (`.xlsx`) with two sheets. Column names are fixed; the order of columns does not matter. Prices are in pounds with up to two decimals, as in the CFS data.

### Sheet "Groups": one row per option group per product

| Column | Required | Meaning |
|---|---|---|
| CFS product ID | yes | The product |
| Group | yes | Name shown to shoppers, for example `Select Fabric` |
| Display order | yes | Position on the page: 1, 2, 3… |
| Required | yes | `Yes` or `No` |
| Choose after | no | Another group of the same product that must be picked first. Blank means the group does not depend on anything |
| Type | yes | `Choose one` or `Add-on with quantity` |
| Max quantity | only for add-ons | Most a shopper can take of one add-on, for example `5` |

### Sheet "Choices": one row per choice

| Column | Required | Meaning |
|---|---|---|
| CFS product ID | yes | The product |
| Group | yes | Must match a group on the Groups sheet for that product |
| Choice | yes | Name shown to shoppers, for example `Carlton Black` |
| Price (£) | yes | Price on every size it is offered on. `0` means included |
| Sizes | no | Size IDs it is offered on, separated by `;`. Blank means every size |
| Size prices | no | Exceptions to Price, for example `17019161=99.99; 17019162=109.99` |
| CFS choice ID | no | CFS's own reference, kept on orders. See "Choice identity" |
| Option code | no | The team's code for an option offered on several products, for example `FAB-CARLTON-BLACK`. Rows with the same code share one name, image and details. Blank means the choice belongs to this product only. See "Shared options" |
| Image URL | no | Full web address starting with `https://`, copied from the CFS website. A bare CFS file name is refused, because the image folder differs by product type (for example `…/images2/Bedrooms/Beds/`) |
| Details | no | Extra text under the choice, for example dimensions. `<br>` makes a line break |

### Example

Groups:

| CFS product ID | Group | Display order | Required | Choose after | Type | Max quantity |
|---|---|---|---|---|---|---|
| 146477 | Select Drawer | 1 | Yes | | Choose one | |
| 146477 | Select Fabric | 2 | Yes | Select Drawer | Choose one | |
| 69733 | Select Lightings | 1 | No | | Add-on with quantity | 5 |

Choices:

| CFS product ID | Group | Choice | Price (£) | Sizes | Size prices | CFS choice ID | Option code | Image URL | Details |
|---|---|---|---|---|---|---|---|---|---|
| 146477 | Select Drawer | with 2 Drawer | 89.99 | | | 17020886 | | | |
| 146477 | Select Drawer | with 4 Drawer | 179.99 | 17019159; 17019160; 17019161; 17019162 | | 17020892 | | | |
| 146477 | Select Fabric | Carlton Black | 0 | | | 17020903 | FAB-CARLTON-BLACK | https://… | |
| 69733 | Select Lightings | 102 : Lighting for Footboard | 209.99 | | | 217067 | | | |

## What an upload does

- **The sheet is a product's complete option list** (decided with the user). For every product in the sheet, its groups and choices become exactly what the sheet says: choices left out are removed. Products not in the sheet are not touched.
- To change one price, the team uses **Download current options**, edits the row and uploads the whole product again.
- **All or nothing:** if any row has a problem, nothing is written, and the preview lists every problem with its sheet and row number.
- Before writing, every product in the sheet must pass the same check the shop uses to price it (the existing product check). A product that would be refused is an error, not a warning.
- After writing, the app reads each product back and runs the product check again, and the result page says which products are now ready to sell.

## Checks on upload (each one is an error with its row)

- Missing required column or value; unknown sheet or column name.
- Product ID not found in Shopify, or found on more than one product.
- Size ID not a variant of that product; a variant SKU that does not follow the pattern.
- Group on Choices not on Groups; `Choose after` naming a group that does not exist, the group itself, or forming a loop.
- Two choices in one group with the same name.
- An Option code that is not letters, digits and hyphens, or the same code given with a different choice name, image or details, or twice in one product.
- Price not a number with up to two decimals, or negative.
- A size given a price in `Size prices` that is not in `Sizes` (when `Sizes` is filled).
- A `Required` group with no choice on some size.
- `Max quantity` missing on an add-on group, or given on a `Choose one` group.
- Image URL not starting with `https://`.
- More choices on one product than Shopify lets a product list hold (1,024; corrected from 1,250 after review, 12 November 2026).
- A Shopify size whose SKU does not follow the pattern, or an Excel error cell or formula with no saved result.
- File too large: limit 5 MB, enough for many products; a file that unpacks to more than 50 MB; more than 100 products in one sheet.

## Shared options

Decided with the user on 12 November 2026: an option used by several products (for example one fabric across a brand's beds) is stored once, not copied per product.

- The team links rows with the **Option code** column. Codes are letters, digits and hyphens, matched ignoring case.
- The shared option holds what shoppers see: choice name, image and details. Every row with the same code, in any product, must give the same name, image and details; a difference is an error on that row. Prices, sizes and groups stay per product, because a drawer or fabric can cost different amounts on different products and sizes.
- Changing a shared option's image or details in one import changes it on every product that uses it. The preview lists those other products before anything is written (stage 3).
- The CFS exports have no shared ID for this (Carlton Black has a separate ID on every product and size, 214 rows), so the team's code is the only link.
- How shared options and per-product prices are stored in Shopify is decided in the stage 3 design; the spreadsheet does not change.

## Choice identity

A choice's ID is what baskets and orders refer to, so it must stay the same across imports.

- If `CFS choice ID` is filled, that is the ID.
- If it is blank, the app makes one from the product, group and choice name, so re-uploading the same row keeps the same ID.
- Renaming a choice with a blank `CFS choice ID` makes it a new choice: any open basket holding the old one is flagged at checkout, as for any removed choice. The preview warns when an import removes choices.

## Restore

Before writing a product, the app saves that product's current options in its own database with the time and who imported. **Restore** puts them back by the same write path. Past orders are unaffected either way.

## Permissions

Writing options needs the `write_metaobjects` permission, which the app does not have today (it has `read_metaobjects` and `write_products`). Adding it means a new `shopify app deploy` and the store approving the new permission. The live store would get the same permission when the app is installed there. This is a deliberate decision recorded in `PLAN.md`; the user agreed on 12 November 2026 to add it when the writing step is reached.

## Builder's notes (calls made by Claude, not the user)

- **Data written is the shape the app already reads**, so pricing, theme and checkout need no change: one `cfs_import_option` metaobject per choice (`cfs_id`, `label`, `group_name`, `image_url`, `source_mappings` with one assignment per size: `parent` = size ID, `raw_price`), the product's `cfs_import.options` list, `cfs_import.model_cards` (one card per variant SKU, `source_id` = size ID), and `cfs_import.workflow` (groups with `optional` and `requires`).
- **Groups with no `Choose after`**: written with no requirement. Today every test product uses `ordered: true` with a chain; the pricing code and theme must be checked to accept groups that need nothing, or that need only the size.
- **Max quantity per group:** the spreadsheet allows it per add-on group; today the app has one limit per product (`accessory_max_quantity`). Either extend the pricing code to a per-group limit, or refuse two different limits in one product. Builder decides, with a test either way.
- **Workflow fields the sheet does not cover** (`mode`, `model_label`, size `filters` such as Loft's height and width, `pricing.source_url`) are kept as they are on a product that already has them, and given simple defaults on a new one (`model_label` `Size`, no filters).
- **Format:** `.xlsx` read and written with one well-established spreadsheet library. If adding a library is not possible, fall back to two CSV files (`groups.csv`, `choices.csv`) with the same columns.
- **Writes:** in batches, with the dev-store check used elsewhere. The product's `cfs_import.options` list is switched in one step at the end, so a shopper never sees half a list; old choices no longer listed are deleted afterwards.
- **Product check list:** imported products should appear on the app's Product check page (today it lists the `cfs-configuration-type-test` tag only).
- **Who can import:** anyone who can open the app in the Shopify admin. No second-person approval for now.

## Build order

1. **Read only:** download sample, upload, preview with all checks. Nothing is written. Tried on the seven test products' real data.
2. **Download current options** for chosen products (read only).
3. **Write and restore**, after the preview has been trusted on real data, and after the new permission is approved. Tried first on a `cfs-spike` copy, then on the test products.

## Done when

- The seven test products can be exported, re-imported unchanged, and still price exactly as today (all existing price tests pass, and the live product check says ready).
- A changed price shows on the product page and at checkout after import, and Restore brings the old price back.
- A sheet with an error writes nothing and names the row.

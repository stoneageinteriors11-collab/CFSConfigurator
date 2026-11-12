// Options import, stage 1: upload a sheet and preview it. Nothing is written to Shopify.
import { useState } from "react";
import { Form, useActionData, useNavigation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { MAX_FILE_BYTES, previewImport } from "../import/preview.server.js";
import { money } from "../orders/format.js";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

const refused = (message) => ({ importable: false, errors: [{ sheet: null, row: null, message }], products: [] });

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  // Refuse a very large upload before reading it into memory.
  if (Number(request.headers.get("content-length")) > MAX_FILE_BYTES + 64 * 1024) {
    return refused("The file is larger than 5 MB");
  }
  const file = (await request.formData()).get("file");
  if (!file || typeof file === "string" || file.size === 0) return refused("Choose an Excel (.xlsx) file first");
  // eslint-disable-next-line no-undef
  return previewImport(admin.graphql, Buffer.from(await file.arrayBuffer()));
};

/** Fetches the sample through the app (so it is signed in) and saves it. */
async function downloadSample() {
  const response = await fetch("/app/import/sample");
  if (!response.ok) throw new Error(`Download failed (${response.status})`);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = "cfs-options-sample.xlsx";
  link.click();
  URL.revokeObjectURL(url);
}

const place = (error) => [error.sheet, error.row ? `row ${error.row}` : null].filter(Boolean).join(", ") || "Whole file";

function Problems({ errors }) {
  return (
    <s-section heading={`Problems (${errors.length})`} padding="none">
      <s-table>
        <s-table-header-row>
          <s-table-header listSlot="labeled">Where</s-table-header>
          <s-table-header listSlot="labeled">Product</s-table-header>
          <s-table-header listSlot="primary">Problem</s-table-header>
        </s-table-header-row>
        <s-table-body>
          {errors.map((error, index) => (
            <s-table-row key={index}>
              <s-table-cell>{place(error)}</s-table-cell>
              <s-table-cell>{error.product ?? "–"}</s-table-cell>
              <s-table-cell>{error.message}</s-table-cell>
            </s-table-row>
          ))}
        </s-table-body>
      </s-table>
    </s-section>
  );
}

// A plain table, so the product's one scroll box does all the scrolling: the Choice column and
// the header row stay in view, and every group uses the same size columns.
const CELL = { padding: "6px 10px", borderBottom: "1px solid #e3e3e3", textAlign: "right", whiteSpace: "nowrap" };
const SIZE_HEADER = { ...CELL, width: "120px", minWidth: "120px", maxWidth: "120px", whiteSpace: "normal", verticalAlign: "bottom" };
const STICKY_TOP = { position: "sticky", top: 0, background: "#f7f7f7", zIndex: 1 };
const CHOICE_CELL = {
  ...CELL,
  textAlign: "left",
  whiteSpace: "normal",
  width: "240px",
  minWidth: "240px",
  position: "sticky",
  left: 0,
  background: "#fff",
};

/** Every size offered anywhere on the product, in the order Shopify lists them. */
function sizesOf(product) {
  const sizes = [];
  for (const group of product.groups) {
    for (const choice of group.choices) {
      for (const price of choice.prices) {
        if (!sizes.some((s) => s.sizeId === price.sizeId)) sizes.push(price);
      }
    }
  }
  return sizes;
}

function GroupTable({ group, sizes }) {
  const rule = [
    group.kind === "accessory" ? `Add-on, up to ${group.maxQuantity} each` : "Choose one",
    group.required ? "required" : "optional",
    group.after ? `after "${group.after}"` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <table style={{ borderCollapse: "separate", borderSpacing: 0, fontSize: "13px", tableLayout: "fixed" }}>
      <caption style={{ textAlign: "left", fontWeight: 600, padding: "12px 10px 6px", position: "sticky", left: 0 }}>
        {group.name} ({rule})
      </caption>
      <thead>
        <tr>
          <th scope="col" style={{ ...CHOICE_CELL, ...STICKY_TOP, left: 0, zIndex: 2 }}>
            Choice
          </th>
          {sizes.map((size) => (
            <th key={size.sizeId} scope="col" style={{ ...SIZE_HEADER, ...STICKY_TOP }} title={size.sizeTitle}>
              {size.sizeTitle}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {group.choices.map((choice) => (
          <tr key={choice.cfsId}>
            <th scope="row" style={{ ...CHOICE_CELL, fontWeight: 400 }}>
              {choice.label}
            </th>
            {sizes.map((size) => {
              const price = choice.prices.find((p) => p.sizeId === size.sizeId);
              return (
                <td key={size.sizeId} style={{ ...CELL, color: price ? undefined : "#8a8a8a" }}>
                  {price ? money(price.cents, "GBP") : "Not offered"}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ProductPreview({ product }) {
  const sizes = sizesOf(product);
  return (
    <s-section heading={`${product.title} (CFS ${product.cfsProductId})`}>
      <s-stack direction="block" gap="base">
        <s-stack direction="inline" gap="small-200">
          <s-badge tone={product.check.ready ? "success" : "critical"}>
            {product.check.ready ? "Ready to sell" : "Not ready"}
          </s-badge>
          {product.check.fromCents != null && <s-text>From {money(product.check.fromCents, "GBP")}</s-text>}
        </s-stack>
        {product.removed.length > 0 && (
          <s-banner tone="warning" heading={`Will remove ${product.removed.length} choices not in the sheet`}>
            {product.removed.join(", ")}
          </s-banner>
        )}
        <s-scroll-box
          maxBlockSize="480px"
          overflow="auto"
          border="base"
          borderRadius="base"
          accessibilityLabel={`Choices and prices for ${product.title}`}
        >
          {product.groups.map((group) => (
            <GroupTable key={group.name} group={group} sizes={sizes} />
          ))}
        </s-scroll-box>
      </s-stack>
    </s-section>
  );
}

export default function OptionsImport() {
  const result = useActionData();
  const navigation = useNavigation();
  const busy = navigation.state === "submitting";
  const [downloadError, setDownloadError] = useState(null);

  return (
    <s-page heading="Options import">
      <s-section>
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Upload an Excel sheet with a Groups sheet and a Choices sheet. For every product in the sheet, its options become
            exactly what the sheet says. This page only shows a preview: nothing in the shop is changed yet.
          </s-paragraph>
          <s-stack direction="inline" gap="base">
            <s-button
              onClick={() => {
                setDownloadError(null);
                downloadSample().catch((error) => setDownloadError(error.message));
              }}
            >
              Download sample
            </s-button>
          </s-stack>
          {downloadError && <s-banner tone="critical">{downloadError}</s-banner>}
          <Form method="post" encType="multipart/form-data">
            <s-stack direction="inline" gap="base">
              <input type="file" name="file" accept=".xlsx" aria-label="Option sheet (.xlsx)" />
              <s-button type="submit" variant="primary" loading={busy || undefined}>
                Preview
              </s-button>
            </s-stack>
          </Form>
        </s-stack>
      </s-section>

      {result && (
        <s-section>
          {result.importable ? (
            <s-banner tone="success" heading={`Ready to import: ${result.products.length} products`}>
              Every row is correct and every product would be ready to sell. Importing comes in the next stage.
            </s-banner>
          ) : (
            <s-banner tone="critical" heading="Not ready: fix the problems below. Nothing has been changed." />
          )}
        </s-section>
      )}
      {result && result.errors.length > 0 && <Problems errors={result.errors} />}
      {result && result.products.map((product) => <ProductPreview key={product.cfsProductId} product={product} />)}
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);

// Options import: upload a sheet, preview it, then import it into Shopify.
import { useRef, useState } from "react";
import { Form, useActionData, useFetcher, useNavigation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import { authenticate } from "../shopify.server";
import { backgroundRunnerFor } from "../import/background.server.js";
import { MAX_FILE_BYTES, previewImport } from "../import/preview.server.js";
import { RunProgress } from "../import/run-progress.jsx";
import { startImport } from "../import/start-import.server.js";
import { money } from "../orders/format.js";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

const refused = (message) => ({
  importable: false,
  errors: [{ sheet: null, row: null, message }],
  products: [],
});

export const action = async ({ request }) => {
  const { admin, session, sessionToken } = await authenticate.admin(request);
  const importing = new URL(request.url).searchParams.get("intent") === "import";
  // Refuse a very large upload before reading it into memory. The request must state its size:
  // Node's HTTP server never reads more body than the stated length, and browsers always state it
  // for a file upload.
  const length = Number(request.headers.get("content-length"));
  if (!Number.isInteger(length) || length <= 0)
    return refused("Choose an Excel (.xlsx) file first");
  if (length > MAX_FILE_BYTES + 64 * 1024)
    return refused("The file is larger than 5 MB");
  const file = (await request.formData()).get("file");
  if (!file || typeof file === "string" || file.size === 0)
    return refused("Choose an Excel (.xlsx) file first");
  // eslint-disable-next-line no-undef
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!importing) return previewImport(admin.graphql, bytes);
  // The file is checked again in full before anything is written.
  return startImport({
    db,
    graphql: admin.graphql,
    shop: session.shop,
    bytes,
    fileName: file.name,
    createdBy: sessionToken?.sub ?? null,
    runInBackground: backgroundRunnerFor(session.shop),
  });
};

const messageOf = (problem) => problem.message ?? problem;

/** Fetches the sample through the app (so it is signed in) and saves it. */
/**
 * Fetches a file through the app (so it is signed in) and saves it under the name the server gives.
 * Returns null, or the list of problems the server explained.
 */
async function downloadFile(path) {
  const response = await fetch(path);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    return body?.errors ?? [`Download failed (${response.status}); try again`];
  }
  const name = /filename="([^"]+)"/.exec(
    response.headers.get("content-disposition") ?? "",
  )?.[1];
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = name ?? "cfs-options.xlsx";
  link.click();
  URL.revokeObjectURL(url);
  return null;
}

/** A button that downloads a file, showing the server's problems underneath when it refuses. */
function useDownload() {
  const [state, setState] = useState({ busy: false, errors: null });
  const start = async (path) => {
    setState({ busy: true, errors: null });
    let errors;
    try {
      errors = await downloadFile(path);
    } catch {
      errors = ["Download failed; check the connection and try again"];
    }
    setState({ busy: false, errors });
  };
  return { ...state, start };
}

function DownloadProblems({ errors }) {
  if (!errors) return null;
  return (
    <s-banner tone="critical" heading="Nothing was downloaded">
      <s-unordered-list>
        {errors.map((error) => (
          <s-list-item key={error}>{error}</s-list-item>
        ))}
      </s-unordered-list>
    </s-banner>
  );
}

const place = (error) =>
  [error.sheet, error.row ? `row ${error.row}` : null]
    .filter(Boolean)
    .join(", ") || "Whole file";

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
const CHOICE_WIDTH = 240;
const SIZE_WIDTH = 120;
const CELL = {
  padding: "6px 10px",
  borderBottom: "1px solid #e3e3e3",
  textAlign: "right",
  whiteSpace: "nowrap",
};
const SIZE_HEADER = {
  ...CELL,
  width: `${SIZE_WIDTH}px`,
  whiteSpace: "normal",
  verticalAlign: "bottom",
};
const STICKY_TOP = {
  position: "sticky",
  top: 0,
  background: "#f7f7f7",
  zIndex: 1,
};
const CHOICE_CELL = {
  ...CELL,
  textAlign: "left",
  whiteSpace: "normal",
  width: `${CHOICE_WIDTH}px`,
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
    group.kind === "accessory"
      ? `Add-on, up to ${group.maxQuantity} each`
      : "Choose one",
    group.required ? "required" : "optional",
    group.after ? `after "${group.after}"` : null,
  ]
    .filter(Boolean)
    .join(", ");

  // The table's real width, so the box scrolls sideways instead of squeezing the columns.
  const width = `${CHOICE_WIDTH + SIZE_WIDTH * sizes.length}px`;
  return (
    <>
      <div
        style={{
          display: "inline-block",
          position: "sticky",
          left: 0,
          fontWeight: 600,
          padding: "12px 10px 6px",
        }}
      >
        {group.name} ({rule})
      </div>
      <table
        style={{
          borderCollapse: "separate",
          borderSpacing: 0,
          fontSize: "13px",
          tableLayout: "fixed",
          width,
          minWidth: width,
        }}
      >
        <thead>
          <tr>
            <th
              scope="col"
              style={{ ...CHOICE_CELL, ...STICKY_TOP, left: 0, zIndex: 2 }}
            >
              Choice
            </th>
            {sizes.map((size) => (
              <th
                key={size.sizeId}
                scope="col"
                style={{ ...SIZE_HEADER, ...STICKY_TOP }}
                title={size.sizeTitle}
              >
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
                const price = choice.prices.find(
                  (p) => p.sizeId === size.sizeId,
                );
                return (
                  <td
                    key={size.sizeId}
                    style={{ ...CELL, color: price ? undefined : "#8a8a8a" }}
                  >
                    {price ? money(price.cents, "GBP") : "Not offered"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/** "3 products", or "3 products; 2 unchanged, skipped". */
function changedCount(products) {
  const changed = products.filter((p) => !p.unchanged).length;
  const same = products.length - changed;
  const counted = `${changed} product${changed === 1 ? "" : "s"}`;
  return same ? `${counted}; ${same} unchanged, skipped` : counted;
}

/** Ready only when the product has no problems in the sheet and the shop could sell it. */
const isReady = (product) =>
  product.problems.length === 0 && product.check?.ready === true;

function ProductPreview({ product }) {
  const sizes = sizesOf(product);
  const ready = isReady(product);
  return (
    <s-stack direction="block" gap="base">
      <s-heading>
        {product.title ?? "Not found in Shopify"} (CFS {product.cfsProductId})
      </s-heading>
      <s-stack direction="inline" gap="small-200">
        <s-badge tone={ready ? "success" : "critical"}>
          {ready
            ? product.unchanged
              ? "No changes"
              : "Ready to import"
            : `${product.problems.length} problem${product.problems.length === 1 ? "" : "s"}`}
        </s-badge>
        {product.check?.fromCents != null && (
          <s-text>From {money(product.check.fromCents, "GBP")}</s-text>
        )}
      </s-stack>
      {product.unchanged && (
        <s-banner
          tone="info"
          heading="No changes; this product will be skipped"
        />
      )}
      {product.problems.length > 0 && (
        <s-banner tone="critical" heading="Fix these rows for this product">
          <s-unordered-list>
            {product.problems.map((problem, i) => (
              <s-list-item key={i}>
                {place(problem)}: {problem.message}
              </s-list-item>
            ))}
          </s-unordered-list>
        </s-banner>
      )}
      {product.warnings?.length > 0 && (
        <s-banner tone="warning" heading="Check these">
          <s-unordered-list>
            {product.warnings.map((warning, i) => (
              <s-list-item key={i}>{warning}</s-list-item>
            ))}
          </s-unordered-list>
        </s-banner>
      )}
      {product.removed.length > 0 && (
        <s-banner
          tone="warning"
          heading={`Will remove ${product.removed.length} choices not in the sheet`}
        >
          {product.removed.join(", ")}
        </s-banner>
      )}
      {/* A scrolling area must be focusable so it can be scrolled from the keyboard. */}
      {product.groups.length > 0 && (
        <div
          role="region"
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          aria-label={`Choices and prices for ${product.title}`}
          style={{
            maxHeight: "480px",
            overflow: "auto",
            border: "1px solid #e3e3e3",
            borderRadius: "8px",
          }}
        >
          {product.groups.map((group) => (
            <GroupTable key={group.name} group={group} sizes={sizes} />
          ))}
        </div>
      )}
    </s-stack>
  );
}

const shortTitle = (title) => {
  if (!title) return "Not found";
  const plain = title
    .replace(/^CFS TEST - /, "")
    .replace(/ - Sizes Available$/, "");
  return plain.length > 32 ? `${plain.slice(0, 31)}…` : plain;
};

/** One tab per product; the tab strip scrolls sideways so any number of products fit. */
function ProductTabs({ products }) {
  // Open on the first product with a problem, if any.
  const [picked, setPicked] = useState(() =>
    Math.max(
      0,
      products.findIndex((p) => !isReady(p)),
    ),
  );
  const withProblems = products.filter((p) => !isReady(p)).length;
  const index = Math.min(picked, products.length - 1);
  const product = products[index];
  return (
    <s-section
      heading={`Products (${products.length})${withProblems ? ` · ${withProblems} with problems` : ""}`}
    >
      <s-stack direction="block" gap="base">
        <div
          role="tablist"
          aria-label="Products in the sheet"
          style={{
            display: "flex",
            gap: "6px",
            overflowX: "auto",
            paddingBottom: "6px",
          }}
        >
          {products.map((p, i) => {
            const selected = i === index;
            return (
              <button
                key={p.cfsProductId}
                type="button"
                role="tab"
                aria-selected={selected}
                title={p.title ?? `CFS ${p.cfsProductId}`}
                onClick={() => setPicked(i)}
                style={{
                  flex: "0 0 auto",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: selected
                    ? "1px solid #303030"
                    : isReady(p)
                      ? "1px solid #d4d4d4"
                      : "1px solid #e8a39a",
                  background: selected ? "#303030" : "#fff",
                  color: selected ? "#fff" : "#303030",
                  cursor: "pointer",
                  fontSize: "13px",
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    color: isReady(p)
                      ? selected
                        ? "#fff"
                        : "#0c7a3e"
                      : selected
                        ? "#ffb3b3"
                        : "#c5280c",
                  }}
                >
                  {isReady(p)
                    ? p.unchanged
                      ? "="
                      : "✓"
                    : `✗ ${p.problems.length}`}
                </span>{" "}
                {shortTitle(p.title)} · {p.cfsProductId}
              </button>
            );
          })}
        </div>
        <div role="tabpanel">
          <ProductPreview key={product.cfsProductId} product={product} />
        </div>
      </s-stack>
    </s-section>
  );
}

export default function OptionsImport() {
  const previous = useActionData();
  const navigation = useNavigation();
  const busy = navigation.state === "submitting";
  // The last preview is cleared the moment a new one starts, so nothing from the old file
  // (its tabs, its banner, its Import button) is shown beside the new one.
  const result = navigation.state === "idle" ? previous : undefined;
  const sample = useDownload();
  const current = useDownload();
  const [ids, setIds] = useState("");
  // Import re-sends the file, so only the file that was previewed may be imported.
  const fileInput = useRef(null);
  const importer = useFetcher();
  const [previewed, setPreviewed] = useState(null);
  const [chosen, setChosen] = useState(null);
  // Which preview Import was pressed for, so a new preview can be imported again.
  const [previewCount, setPreviewCount] = useState(0);
  const [startedFor, setStartedFor] = useState(null);
  const answer = startedFor === previewCount ? importer.data : undefined;
  const signature = (file) =>
    file ? `${file.name}|${file.size}|${file.lastModified}` : null;
  const importing = importer.state !== "idle";
  const canImport =
    result?.importable &&
    result.products.some((p) => !p.unchanged) &&
    previewed !== null &&
    previewed === chosen &&
    !answer?.runId;
  const startImporting = () => {
    setStartedFor(previewCount);
    const data = new FormData();
    data.set("file", fileInput.current.files[0]);
    importer.submit(data, {
      method: "post",
      action: "/app/import?intent=import",
      encType: "multipart/form-data",
    });
  };

  return (
    <s-page heading="Options import">
      <s-section>
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Upload an Excel sheet with a Groups sheet and a Choices sheet. For
            every product in the sheet, its options become exactly what the
            sheet says. Preview first: nothing in the shop changes until you
            press Import.
          </s-paragraph>
          <s-stack direction="inline" gap="base">
            <s-button
              loading={sample.busy || undefined}
              onClick={() => sample.start("/app/import/sample")}
            >
              Download sample
            </s-button>
          </s-stack>
          <DownloadProblems errors={sample.errors} />
          <Form
            method="post"
            encType="multipart/form-data"
            onSubmit={() => {
              setPreviewed(signature(fileInput.current?.files[0]));
              setPreviewCount((count) => count + 1);
            }}
          >
            <s-stack direction="inline" gap="base">
              <input
                ref={fileInput}
                type="file"
                name="file"
                accept=".xlsx"
                aria-label="Option sheet (.xlsx)"
                onChange={(event) =>
                  setChosen(signature(event.target.files[0]))
                }
              />
              <s-button
                type="submit"
                variant="primary"
                loading={busy || undefined}
              >
                Preview
              </s-button>
            </s-stack>
          </Form>
        </s-stack>
      </s-section>

      <s-section heading="Download current options">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Get a sheet of products&apos; options as they are now, ready to edit
            and upload above. Nothing is changed.
          </s-paragraph>
          <label style={{ display: "grid", gap: "4px", fontSize: "13px" }}>
            <span>CFS product IDs</span>
            <textarea
              value={ids}
              onChange={(event) => setIds(event.target.value)}
              rows={3}
              placeholder="146477, 69733"
              style={{
                font: "inherit",
                padding: "6px 8px",
                borderRadius: "8px",
                border: "1px solid #8a8a8a",
              }}
            />
            <span style={{ color: "#616161" }}>
              One or more, separated by commas, spaces or new lines (up to 100)
            </span>
          </label>
          <s-stack direction="inline" gap="base">
            <s-button
              loading={current.busy || undefined}
              onClick={() =>
                current.start(
                  `/app/import/current?ids=${encodeURIComponent(ids)}`,
                )
              }
            >
              Download current options
            </s-button>
          </s-stack>
          <DownloadProblems errors={current.errors} />
        </s-stack>
      </s-section>

      {result && (
        <s-section>
          {result.importable &&
          result.products.every((p) => p.unchanged) ? (
            <s-banner
              tone="info"
              heading="Nothing to import: the sheet matches the store"
            />
          ) : result.importable ? (
            <s-banner
              tone="success"
              heading={`Ready to import: ${changedCount(result.products)}`}
            >
              Every row is correct and every product would be ready to sell.
              {canImport ? (
                <s-stack direction="block" gap="base">
                  <s-text>
                    Import writes the options to Shopify now. Each product is
                    backed up first, and Import history can restore it.
                  </s-text>
                  <s-button
                    variant="primary"
                    loading={importing || undefined}
                    onClick={startImporting}
                  >
                    Import {result.products.filter((p) => !p.unchanged).length}{" "}
                    {result.products.filter((p) => !p.unchanged).length === 1
                      ? "product"
                      : "products"}
                  </s-button>
                </s-stack>
              ) : (
                !answer?.runId && (
                  <s-text>
                    Choose the file again and press Preview before importing.
                  </s-text>
                )
              )}
            </s-banner>
          ) : (
            <s-banner
              tone="critical"
              heading="Not ready: fix the problems below. Nothing has been changed."
            />
          )}
        </s-section>
      )}
      {answer?.errors && (
        <s-section>
          <s-banner tone="critical" heading="Not imported. Nothing has been changed.">
            <s-unordered-list>
              {answer.errors.map((problem, i) => (
                <s-list-item key={i}>{messageOf(problem)}</s-list-item>
              ))}
            </s-unordered-list>
          </s-banner>
        </s-section>
      )}
      {answer?.runId && (
        <s-section>
          <RunProgress runId={answer.runId} />
        </s-section>
      )}
      {result && result.errors.length > 0 && (
        <Problems errors={result.errors} />
      )}
      {result && result.products.length > 0 && (
        <ProductTabs
          key={result.products.map((p) => p.cfsProductId).join()}
          products={result.products}
        />
      )}
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);

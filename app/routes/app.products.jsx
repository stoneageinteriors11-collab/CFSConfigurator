import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { checkProducts } from "../pricing/product-check.server.js";
import { money } from "../orders/format.js";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  return { products: await checkProducts(admin.graphql) };
};

const adminProductUrl = (productId) => `shopify://admin/products/${productId.split("/").pop()}`;

export default function ProductCheck() {
  const { products } = useLoaderData();
  const ready = products.filter((p) => p.ready).length;

  return (
    <s-page heading="Product check">
      <s-section>
        <s-paragraph>
          {ready} of {products.length} products can be priced and sold by the app. Checked live from Shopify each time this
          page opens, using the same pricing as the shop. Nothing is changed.
        </s-paragraph>
      </s-section>

      <s-section padding="none" accessibilityLabel="Products">
        {products.length === 0 ? (
          <s-box padding="base">
            <s-paragraph>No products found with the tag cfs-configuration-type-test.</s-paragraph>
          </s-box>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header listSlot="primary">Product</s-table-header>
              <s-table-header listSlot="inline">Check</s-table-header>
              <s-table-header listSlot="labeled">Sizes in stock</s-table-header>
              <s-table-header listSlot="labeled" format="numeric">Option groups</s-table-header>
              <s-table-header listSlot="labeled" format="numeric">Choices</s-table-header>
              <s-table-header listSlot="labeled" format="currency">From</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {products.map((product) => (
                <s-table-row key={product.id}>
                  <s-table-cell>
                    <s-link href={adminProductUrl(product.id)} target="_top">
                      {product.title}
                    </s-link>
                    {product.status !== "ACTIVE" ? ` (${product.status.toLowerCase()})` : ""}
                  </s-table-cell>
                  <s-table-cell>
                    <s-badge tone={product.ready ? "success" : "critical"}>{product.ready ? "Ready" : "Not ready"}</s-badge>
                  </s-table-cell>
                  <s-table-cell>{product.sizes === undefined ? "–" : `${product.sizesOnSale} of ${product.sizes}`}</s-table-cell>
                  <s-table-cell>{product.groups ?? "–"}</s-table-cell>
                  <s-table-cell>{product.choices ?? "–"}</s-table-cell>
                  <s-table-cell>{product.fromCents == null ? "–" : money(product.fromCents, "GBP")}</s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-section>

      {products.some((product) => !product.ready) && (
        <s-section heading="Why products are not ready">
          <s-stack direction="block" gap="base">
            {products
              .filter((product) => !product.ready)
              .map((product) => (
                <s-stack key={product.id} direction="block" gap="small-300">
                  <s-text type="strong">{product.title}</s-text>
                  <s-unordered-list>
                    {product.problems.map((problem) => (
                      <s-list-item key={problem}>{problem}</s-list-item>
                    ))}
                  </s-unordered-list>
                </s-stack>
              ))}
          </s-stack>
        </s-section>
      )}
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);

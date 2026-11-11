import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getOrder } from "../orders/order-list.server.js";
import {
  adminOrderUrl,
  dateTime,
  discountText,
  groupName,
  matchBadge,
  money,
  needsAttention,
  paymentLabel,
} from "../orders/format.js";

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const record = await getOrder(db, session.shop, params.id);
  if (!record) throw new Response("Order not found", { status: 404 });
  return record;
};

const ATTENTION = {
  no_attempt:
    "This order has a configurable product but did not come from the app's checkout, so the app did not check its price or options. Check it before fulfilling.",
  price_mismatch:
    "This order is different from the checkout the app priced. Compare the lines below with the checkout before fulfilling.",
};

function Amount({ label, cents, currency, strong }) {
  return (
    <s-grid gridTemplateColumns="1fr auto" gap="base">
      <s-text>{label}</s-text>
      <s-text type={strong ? "strong" : undefined}>{money(cents, currency)}</s-text>
    </s-grid>
  );
}

function Line({ line, currency, discounts }) {
  const configuration = line.configuration;
  const variant = line.variantTitle && line.variantTitle !== "Default Title" ? ` – ${line.variantTitle}` : "";
  return (
    <s-section heading={`${line.title}${variant}`}>
      <s-stack direction="block" gap="base">
        <s-text color="subdued">
          SKU {line.sku || "none"} · Quantity {line.quantity}
          {line.configurable ? "" : " · Ordinary product"}
        </s-text>

        {configuration && configuration.options.length > 0 && (
          <s-stack direction="block" gap="small-200">
            <s-heading>Configuration</s-heading>
            <s-unordered-list>
              {configuration.options.map((option) => (
                <s-list-item key={option.assignmentId ?? option.cfsId}>
                  {groupName(option.group)}: {option.label}
                  {option.cents > 0 ? ` (+${money(option.cents, currency)})` : ""} · CFS option {option.cfsId}, assignment{" "}
                  {option.assignmentId}
                </s-list-item>
              ))}
            </s-unordered-list>
          </s-stack>
        )}

        {!configuration && line.attributes.length > 0 && (
          <s-stack direction="block" gap="small-200">
            <s-heading>Details on the order (not checked by the app)</s-heading>
            <s-unordered-list>
              {line.attributes.map((attribute) => (
                <s-list-item key={attribute.key}>
                  {attribute.key}: {attribute.value}
                </s-list-item>
              ))}
            </s-unordered-list>
          </s-stack>
        )}

        <s-stack direction="block" gap="small-200">
          {configuration && configuration.options.length > 0 && (
            <Amount label="Base price, each" cents={configuration.baseCents} currency={currency} />
          )}
          <Amount label="Price, each" cents={line.unitCents} currency={currency} />
          {line.discounts.map((allocation) => {
            const discount = discounts.find((d) => d.index === allocation.discount);
            return (
              <Amount
                key={allocation.discount}
                label={`Discount: ${discount ? discountText(discount, currency) : "unknown"}`}
                cents={-allocation.cents}
                currency={currency}
              />
            );
          })}
          <Amount label={`Line total (${line.quantity})`} cents={line.totalCents} currency={currency} strong />
        </s-stack>
      </s-stack>
    </s-section>
  );
}

export default function OrderDetail() {
  const record = useLoaderData();
  const spec = record.specification;
  const { currency } = spec.order;
  const match = matchBadge(record.matchStatus);
  const totals = spec.totals;

  return (
    <s-page heading={`Order ${record.orderName}`}>
      <s-link slot="breadcrumb-actions" href="/app/orders">
        Orders
      </s-link>
      <s-button slot="secondary-actions" href={adminOrderUrl(record.orderId)} target="_top">
        View in Shopify
      </s-button>

      {needsAttention(record.matchStatus) && (
        <s-banner tone="critical" heading="Needs attention">
          {ATTENTION[record.matchStatus] ?? "This order needs checking before fulfilling."}
        </s-banner>
      )}

      <s-section>
        <s-stack direction="inline" gap="small-200">
          <s-badge tone={match.tone}>{match.label}</s-badge>
          <s-badge>{paymentLabel(record.financialStatus)}</s-badge>
          {record.cancelledAt && <s-badge tone="warning">Cancelled {dateTime(record.cancelledAt)}</s-badge>}
          {spec.order.test && <s-badge tone="info">Test order</s-badge>}
        </s-stack>
        <s-paragraph>Placed {dateTime(spec.order.createdAt)}</s-paragraph>
      </s-section>

      {spec.lines.map((line) => (
        <Line key={line.lineItemId} line={line} currency={currency} discounts={spec.discounts} />
      ))}

      {spec.missingCheckoutLines?.length > 0 && (
        <s-section heading="In the checkout but not in the order">
          <s-unordered-list>
            {spec.missingCheckoutLines.map((line, i) => (
              <s-list-item key={i}>
                {line.title} {line.variantTitle} · SKU {line.sku} · Quantity {line.quantity} ·{" "}
                {money(line.unitCents, currency)} each
              </s-list-item>
            ))}
          </s-unordered-list>
        </s-section>
      )}

      <s-section heading="Totals">
        <s-stack direction="block" gap="small-200">
          <Amount label="Before discounts" cents={totals.beforeDiscountsCents} currency={currency} />
          {spec.discounts.map((discount) => (
            <s-text key={discount.index} color="subdued">
              {discountText(discount, currency)}
            </s-text>
          ))}
          <Amount label="Discounts" cents={-totals.discountCents} currency={currency} />
          <Amount label="Subtotal" cents={totals.subtotalCents} currency={currency} />
          <Amount label="Shipping" cents={totals.shippingCents} currency={currency} />
          <Amount
            label={spec.order.taxesIncluded ? "Tax (included)" : "Tax"}
            cents={totals.taxCents}
            currency={currency}
          />
          <Amount label="Total" cents={totals.totalCents} currency={currency} strong />
        </s-stack>
      </s-section>

      <s-section heading="Checkout">
        {spec.checkout ? (
          <s-stack direction="block" gap="small-200">
            <s-text>Priced by the app {dateTime(spec.checkout.createdAt)}</s-text>
            <Amount label="Checkout total before discounts" cents={spec.checkout.totalCents} currency={currency} />
            <s-text color="subdued">
              Checkout {spec.checkout.attemptId} · basket version {spec.checkout.basketVersion}
            </s-text>
          </s-stack>
        ) : (
          <s-text>
            Not from the app's checkout
            {spec.claimedAttemptId ? ` (named checkout ${spec.claimedAttemptId}, which was already used)` : ""}.
          </s-text>
        )}
      </s-section>

      <s-section heading="Record">
        <s-text color="subdued">
          Saved {dateTime(record.createdAt)} · cannot be changed · format version {spec.version}
        </s-text>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);

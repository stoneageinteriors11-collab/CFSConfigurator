// Turns saved order records into words and amounts for the admin screens.

export const money = (cents, currency) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(cents / 100);

export const dateTime = (value) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(
    new Date(value),
  );

const MATCH = {
  matched: { label: "Matched", tone: "success" },
  no_attempt: { label: "Not from app checkout", tone: "critical" },
  price_mismatch: { label: "Differs from checkout", tone: "critical" },
};

/** The badge for how an order compares with the checkout the app priced. */
export const matchBadge = (status) => MATCH[status] ?? { label: status, tone: "warning" };

export const needsAttention = (status) => status !== "matched";

/** PARTIALLY_REFUNDED becomes "Partially refunded". */
export function paymentLabel(status) {
  const words = String(status ?? "").toLowerCase().replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Opens the order in the Shopify admin, from inside the embedded app. */
export const adminOrderUrl = (orderId) => `shopify://admin/orders/${String(orderId).split("/").pop()}`;

/** "SUMMER10 (10%)" or "Staff discount (£50.00)". */
export function discountText(discount, currency) {
  const name = discount.code || discount.title || "Discount";
  const amount = discount.value?.percentage !== undefined ? `${discount.value.percentage}%` : money(discount.value?.cents ?? 0, currency);
  return `${name} (${amount})`;
}

/** "Select Drawer" is shown as "Drawer", as on the storefront. */
export const groupName = (group) => String(group).replace(/^Select /, "");

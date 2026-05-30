import fs from "node:fs";

const dto = fs.readFileSync("apps/api/src/modules/payments/dto/create-stripe-checkout-session.dto.ts", "utf8");
const stripe = fs.readFileSync("apps/api/src/modules/payments/stripe-checkout.service.ts", "utf8");
const panel = fs.readFileSync("apps/web/src/components/dbx/CheckoutSessionPanel.tsx", "utf8");
const checkout = fs.readFileSync("apps/web/src/lib/checkout/stripe.ts", "utf8");

const checks = [
  dto.includes("product_id") && dto.includes("variant_id") && dto.includes("priceMinor") && dto.includes("quantity"),
  stripe.includes("input.variantId ?? input.variant_id") && stripe.includes("input.priceMinor"),
  panel.includes("productId") && panel.includes("variantId") && panel.includes("priceMinor") && panel.includes("createStripeCheckoutSession"),
  checkout.includes("/api/checkout/stripe/session") && !checkout.includes("!base || !env.stripePublicKey"),
];
if (checks.some((ok) => !ok)) {
  console.error(JSON.stringify({ success: false, checks }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ success: true }, null, 2));

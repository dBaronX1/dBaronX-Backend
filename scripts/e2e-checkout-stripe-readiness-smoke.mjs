#!/usr/bin/env node

const MEDUSA_URL = (process.env.MEDUSA_URL || process.env.MEDUSA_BACKEND_URL || "http://localhost:9000").replace(/\/$/, "");
const API_URL = (process.env.API_URL || "http://localhost:3000").replace(/\/$/, "");
const MEDUSA_KEY = process.env.MEDUSA_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

const headers = { "content-type": "application/json", ...(MEDUSA_KEY ? { "x-publishable-api-key": MEDUSA_KEY } : {}) };
const blockers = [];

async function getJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  return { ok: response.ok, status: response.status, body };
}

const out = { success: false, medusaUrl: MEDUSA_URL, apiUrl: API_URL, blockers, checks: {} };

const products = await getJson(`${MEDUSA_URL}/store/products?limit=20`, { headers });
out.checks.medusaProductsHttp = products.status;
if (!products.ok) blockers.push(`store_products_http_${products.status}`);
const product = Array.isArray(products.body?.products) ? products.body.products.find((p) => Array.isArray(p?.variants) && p.variants.length > 0) : null;
const variantId = product?.variants?.[0]?.id || null;
if (!variantId) blockers.push("variant_id_missing");

const regions = await getJson(`${MEDUSA_URL}/store/regions?limit=20`, { headers });
out.checks.medusaRegionsHttp = regions.status;
const regionId = Array.isArray(regions.body?.regions) ? regions.body.regions[0]?.id : null;
if (!regionId) blockers.push("region_missing");

const cart = await getJson(`${MEDUSA_URL}/store/carts`, { method: "POST", headers, body: JSON.stringify({ region_id: regionId }) });
out.checks.cartCreateHttp = cart.status;
const cartId = cart.body?.cart?.id || null;
if (!cartId) blockers.push(`cart_create_http_${cart.status}`);

if (cartId && variantId) {
  const line = await getJson(`${MEDUSA_URL}/store/carts/${cartId}/line-items`, { method: "POST", headers, body: JSON.stringify({ variant_id: variantId, quantity: 1 }) });
  out.checks.lineItemAddHttp = line.status;
  if (!line.ok) blockers.push(`line_item_add_http_${line.status}`);

  const shipping = await getJson(`${MEDUSA_URL}/store/shipping-options?cart_id=${encodeURIComponent(cartId)}`, { headers });
  const options = Array.isArray(shipping.body?.shipping_options) ? shipping.body.shipping_options : [];
  out.checks.shippingOptionsHttp = shipping.status;
  out.checks.shippingOptionsCount = options.length;
  if (!shipping.ok) blockers.push(`shipping_options_http_${shipping.status}`);
  if (shipping.ok && options.length === 0) blockers.push("shipping_option_missing");
}

const stripeSession = await getJson(`${API_URL}/v1/checkout/stripe/session`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    cartId: cartId || "smoke-cart",
    amount: 100,
    currency: "usd",
    successUrl: "https://dbaronx.com/checkout/success",
    cancelUrl: "https://dbaronx.com/checkout/cancel",
  }),
});
out.checks.stripeSessionHttp = stripeSession.status;
out.checks.stripeSessionConfigured = Boolean(stripeSession.body?.configured);
out.checks.stripeMode = stripeSession.body?.mode || null;
if (!stripeSession.ok) blockers.push(`stripe_session_http_${stripeSession.status}`);
if (!stripeSession.body?.configured) blockers.push("stripe_not_configured");

const webhook = await getJson(`${API_URL}/v1/checkout/stripe/webhook`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
out.checks.webhookHttp = webhook.status;
out.checks.webhookRouteExists = webhook.status !== 404;
if (webhook.status === 404) blockers.push("stripe_webhook_route_missing");

out.success = blockers.length === 0;
console.log(JSON.stringify(out, null, 2));
process.exit(out.success ? 0 : 1);

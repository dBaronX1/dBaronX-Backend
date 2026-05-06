#!/usr/bin/env node

const MEDUSA_URL = (process.env.MEDUSA_URL || process.env.MEDUSA_BACKEND_URL || "http://localhost:9000").replace(/\/$/, "");
const API_URL = (process.env.API_URL || process.env.NESTJS_API_URL || "http://localhost:3001").replace(/\/$/, "");
const MEDUSA_KEY = process.env.MEDUSA_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
const SHIPPING_OPTION_ID = process.env.SHIPPING_OPTION_ID || "so_01KQZ65XA0Z5SMKSQG2XHYWMVP";

const medusaHeaders = {
  "content-type": "application/json",
  ...(MEDUSA_KEY ? { "x-publishable-api-key": MEDUSA_KEY } : {}),
};
const jsonHeaders = { "content-type": "application/json" };
const blockers = [];
const warnings = [];

function api(path) {
  const prefix = API_URL.endsWith("/api") ? "" : "/api";
  return `${API_URL}${prefix}${path}`;
}

function unwrap(body) {
  return body && typeof body === "object" && body.data && body.success === true ? body.data : body;
}

async function getJson(url, init) {
  let response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: { message: error instanceof Error ? error.message : String(error) },
      data: {},
    };
  }

  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  return { ok: response.ok, status: response.status, body, data: unwrap(body) };
}

const out = {
  success: false,
  medusaUrl: MEDUSA_URL,
  apiUrl: API_URL,
  webhookUrl: api("/v1/checkout/stripe/webhook"),
  blockers,
  warnings,
  checks: {},
};

const products = await getJson(`${MEDUSA_URL}/store/products?limit=20`, { headers: medusaHeaders });
out.checks.medusaProductsHttp = products.status;
if (!products.ok) blockers.push(`store_products_http_${products.status}`);

const product = Array.isArray(products.data?.products)
  ? products.data.products.find((p) => Array.isArray(p?.variants) && p.variants.length > 0)
  : null;
const variantId = product?.variants?.[0]?.id || null;
out.checks.productId = product?.id || null;
out.checks.variantId = variantId;
if (!variantId) blockers.push("variant_id_missing");

const regions = await getJson(`${MEDUSA_URL}/store/regions?limit=20`, { headers: medusaHeaders });
out.checks.medusaRegionsHttp = regions.status;
const regionId = Array.isArray(regions.data?.regions) ? regions.data.regions[0]?.id : null;
out.checks.regionId = regionId;
if (!regions.ok) blockers.push(`store_regions_http_${regions.status}`);
if (!regionId) blockers.push("region_missing");

let cartId = null;
if (regionId) {
  const cart = await getJson(`${MEDUSA_URL}/store/carts`, {
    method: "POST",
    headers: medusaHeaders,
    body: JSON.stringify({ region_id: regionId }),
  });
  out.checks.cartCreateHttp = cart.status;
  cartId = cart.data?.cart?.id || null;
  out.checks.cartId = cartId;
  if (!cart.ok || !cartId) blockers.push(`cart_create_http_${cart.status}`);
}

if (cartId && variantId) {
  const line = await getJson(`${MEDUSA_URL}/store/carts/${cartId}/line-items`, {
    method: "POST",
    headers: medusaHeaders,
    body: JSON.stringify({ variant_id: variantId, quantity: 1 }),
  });
  out.checks.lineItemAddHttp = line.status;
  if (!line.ok) blockers.push(`line_item_add_http_${line.status}`);

  const shipping = await getJson(`${MEDUSA_URL}/store/shipping-options?cart_id=${encodeURIComponent(cartId)}`, {
    headers: medusaHeaders,
  });
  const options = Array.isArray(shipping.data?.shipping_options) ? shipping.data.shipping_options : [];
  out.checks.shippingOptionsHttp = shipping.status;
  out.checks.shippingOptionsCount = options.length;
  out.checks.expectedShippingOptionAvailable = options.some((option) => option?.id === SHIPPING_OPTION_ID);
  if (!shipping.ok) blockers.push(`shipping_options_http_${shipping.status}`);
  if (shipping.ok && options.length === 0) blockers.push("shipping_option_missing");
  if (shipping.ok && SHIPPING_OPTION_ID && !out.checks.expectedShippingOptionAvailable) {
    warnings.push(`shipping_option_${SHIPPING_OPTION_ID}_not_returned_for_cart`);
  }
}

const sessionProbe = await getJson(api("/v1/checkout/stripe/session"), {
  method: "POST",
  headers: jsonHeaders,
  body: JSON.stringify({
    cartId: cartId || "smoke-cart",
    amount: 100,
    currency: "usd",
    successUrl: "https://dbaronx.com/checkout/success?session_id={CHECKOUT_SESSION_ID}",
    cancelUrl: "https://dbaronx.com/checkout/cancel",
    productName: "dBaronX Stripe smoke checkout",
  }),
});
const session = sessionProbe.data || {};
out.checks.stripeSessionHttp = sessionProbe.status;
out.checks.stripeSessionConfigured = Boolean(session.configured);
out.checks.stripeSessionId = session.sessionId || null;
out.checks.stripeCheckoutUrl = session.checkoutUrl || null;
out.checks.stripeSessionBlockers = session.blockers || [];
if (!sessionProbe.ok) blockers.push(`stripe_session_http_${sessionProbe.status}`);
if (session.configured === false && (session.sessionId || session.checkoutUrl)) {
  blockers.push("stripe_returned_checkout_artifacts_while_unconfigured");
}
if (session.configured === true && session.success === true && (!session.sessionId || !session.checkoutUrl)) {
  blockers.push("stripe_configured_session_missing_id_or_url");
}
if (session.configured === true && session.checkoutUrl && !String(session.checkoutUrl).startsWith("https://checkout.stripe.com/")) {
  blockers.push("stripe_checkout_url_not_stripe_hosted");
}
if (session.configured === false) warnings.push("stripe_secret_key_missing_on_api_server");

const webhookProbe = await getJson(api("/v1/checkout/stripe/webhook"), {
  method: "POST",
  headers: jsonHeaders,
  body: "{}",
});
const webhook = webhookProbe.data || {};
out.checks.webhookHttp = webhookProbe.status;
out.checks.webhookRouteExists = webhookProbe.status !== 404;
out.checks.webhookUnsignedVerified = Boolean(webhook.verified);
out.checks.webhookUnsignedPaymentMarkedPaid = Boolean(webhook.paymentMarkedPaid);
out.checks.webhookBlockers = webhook.blockers || [];
if (webhookProbe.status === 404) blockers.push("stripe_webhook_route_missing");
if (!webhookProbe.ok) blockers.push(`stripe_webhook_http_${webhookProbe.status}`);
if (webhook.verified) blockers.push("unsigned_webhook_marked_verified");
if (webhook.paymentMarkedPaid) blockers.push("unsigned_webhook_marked_paid");

out.success = blockers.length === 0;
console.log(JSON.stringify(out, null, 2));
process.exit(out.success ? 0 : 1);

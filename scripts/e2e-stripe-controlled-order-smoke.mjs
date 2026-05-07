#!/usr/bin/env node

const MEDUSA_URL = (process.env.MEDUSA_URL || process.env.MEDUSA_BACKEND_URL || "http://localhost:9000").replace(/\/$/, "");
const API_URL = (process.env.API_URL || process.env.NESTJS_API_URL || "http://localhost:3001").replace(/\/$/, "");
const MEDUSA_KEY = process.env.MEDUSA_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
const SHIPPING_OPTION_ID = process.env.SHIPPING_OPTION_ID || "so_01KQZ65XA0Z5SMKSQG2XHYWMVP";
const WEB_BASE_URL = (process.env.WEB_BASE_URL || process.env.NEXT_PUBLIC_WEB_BASE_URL || "https://dbaronx.com").replace(/\/$/, "");

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

function firstArray(value) {
  return Array.isArray(value) ? value : [];
}

function cartFrom(data) {
  return data?.cart || data;
}

function minorUnitAmountFromCart(cart) {
  const amount = Number(cart?.total ?? cart?.subtotal ?? 0);
  return Number.isInteger(amount) && amount > 0 ? amount : 100;
}

const out = {
  success: false,
  blockers,
  medusaReady: false,
  cartId: null,
  lineItemAdded: false,
  shippingOptionReady: false,
  stripeEndpointReady: false,
  checkoutSessionCreated: false,
  sessionIdPresent: false,
  checkoutUrlPresent: false,
  webhookEndpointReady: false,
  unsignedWebhookRejected: false,
  paymentMarkedPaid: false,
  medusaUrl: MEDUSA_URL,
  apiUrl: API_URL,
  webhookUrl: api("/v1/checkout/stripe/webhook"),
  warnings,
  checks: {},
};

const products = await getJson(`${MEDUSA_URL}/store/products?limit=20`, { headers: medusaHeaders });
out.checks.medusaProductsHttp = products.status;
if (!products.ok) blockers.push(`store_products_http_${products.status}`);

const product = firstArray(products.data?.products).find((p) => firstArray(p?.variants).length > 0) || null;
const variantId = product?.variants?.[0]?.id || null;
out.checks.productId = product?.id || null;
out.checks.variantId = variantId;
if (!variantId) blockers.push("variant_id_missing");

const regions = await getJson(`${MEDUSA_URL}/store/regions?limit=20`, { headers: medusaHeaders });
out.checks.medusaRegionsHttp = regions.status;
const regionId = firstArray(regions.data?.regions)[0]?.id || null;
out.checks.regionId = regionId;
if (!regions.ok) blockers.push(`store_regions_http_${regions.status}`);
if (!regionId) blockers.push("region_missing");
out.medusaReady = products.ok && regions.ok && Boolean(variantId && regionId);

let cart = null;
if (regionId) {
  const cartProbe = await getJson(`${MEDUSA_URL}/store/carts`, {
    method: "POST",
    headers: medusaHeaders,
    body: JSON.stringify({ region_id: regionId }),
  });
  out.checks.cartCreateHttp = cartProbe.status;
  cart = cartFrom(cartProbe.data);
  out.cartId = cart?.id || null;
  if (!cartProbe.ok || !out.cartId) blockers.push(`cart_create_http_${cartProbe.status}`);
}

if (out.cartId && variantId) {
  const line = await getJson(`${MEDUSA_URL}/store/carts/${out.cartId}/line-items`, {
    method: "POST",
    headers: medusaHeaders,
    body: JSON.stringify({ variant_id: variantId, quantity: 1 }),
  });
  out.checks.lineItemAddHttp = line.status;
  out.lineItemAdded = line.ok;
  cart = cartFrom(line.data) || cart;
  if (!line.ok) blockers.push(`line_item_add_http_${line.status}`);

  const shipping = await getJson(`${MEDUSA_URL}/store/shipping-options?cart_id=${encodeURIComponent(out.cartId)}`, {
    headers: medusaHeaders,
  });
  const options = firstArray(shipping.data?.shipping_options);
  out.checks.shippingOptionsHttp = shipping.status;
  out.checks.shippingOptionsCount = options.length;
  out.checks.expectedShippingOptionAvailable = options.some((option) => option?.id === SHIPPING_OPTION_ID);
  out.shippingOptionReady = shipping.ok && options.length > 0;
  if (!shipping.ok) blockers.push(`shipping_options_http_${shipping.status}`);
  if (shipping.ok && options.length === 0) blockers.push("shipping_option_missing");
  if (shipping.ok && SHIPPING_OPTION_ID && !out.checks.expectedShippingOptionAvailable) {
    warnings.push(`shipping_option_${SHIPPING_OPTION_ID}_not_returned_for_cart`);
  }
}

const checkoutAmount = minorUnitAmountFromCart(cart);
out.checks.checkoutAmountMinorUnits = checkoutAmount;
out.checks.checkoutCurrency = String(cart?.currency_code || "usd").toLowerCase();

const sessionProbe = await getJson(api("/v1/checkout/stripe/session"), {
  method: "POST",
  headers: jsonHeaders,
  body: JSON.stringify({
    cartId: out.cartId || "smoke-cart",
    orderRef: `stripe-smoke-${Date.now()}`,
    customerRef: "controlled-order-smoke",
    amount: checkoutAmount,
    currency: out.checks.checkoutCurrency,
    successUrl: `${WEB_BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${WEB_BASE_URL}/checkout/cancel`,
    productName: "dBaronX controlled Stripe checkout smoke",
  }),
});
const session = sessionProbe.data || {};
out.checks.stripeSessionHttp = sessionProbe.status;
out.checks.stripeSessionConfigured = session.configured === true;
out.checks.stripeSessionMode = session.mode || null;
out.checks.stripeSessionBlockers = session.blockers || [];
out.stripeEndpointReady = sessionProbe.status !== 404;
out.sessionIdPresent = Boolean(session.sessionId);
out.checkoutUrlPresent = Boolean(session.checkoutUrl);
out.checkoutSessionCreated = session.success === true && out.sessionIdPresent && out.checkoutUrlPresent;
if (sessionProbe.status === 404) blockers.push("stripe_session_route_missing");
if (!sessionProbe.ok) blockers.push(`stripe_session_http_${sessionProbe.status}`);
if (session.configured === false && (out.sessionIdPresent || out.checkoutUrlPresent)) {
  blockers.push("stripe_returned_checkout_artifacts_while_unconfigured");
}
if (session.configured === true && session.success === true && (!out.sessionIdPresent || !out.checkoutUrlPresent)) {
  blockers.push("stripe_configured_session_missing_id_or_url");
}
if (session.configured === true && out.checkoutUrlPresent && !String(session.checkoutUrl).startsWith("https://checkout.stripe.com/")) {
  blockers.push("stripe_checkout_url_not_stripe_hosted");
}
if (session.configured === true && !out.checkoutSessionCreated) {
  blockers.push("stripe_configured_session_not_created");
}
if (session.configured === false && !firstArray(session.blockers).includes("stripe_secret_key_missing")) {
  blockers.push("stripe_unconfigured_without_missing_secret_blocker");
}
if (session.configured === false) warnings.push("stripe_secret_key_missing_on_api_server");

const webhookProbe = await getJson(api("/v1/checkout/stripe/webhook"), {
  method: "POST",
  headers: jsonHeaders,
  body: "{}",
});
const webhook = webhookProbe.data || {};
out.checks.webhookHttp = webhookProbe.status;
out.checks.webhookBlockers = webhook.blockers || [];
out.webhookEndpointReady = webhookProbe.status !== 404;
out.paymentMarkedPaid = Boolean(webhook.paymentMarkedPaid);
out.unsignedWebhookRejected = webhookProbe.ok && webhook.verified === false && out.paymentMarkedPaid === false;
if (webhookProbe.status === 404) blockers.push("stripe_webhook_route_missing");
if (!webhookProbe.ok) blockers.push(`stripe_webhook_http_${webhookProbe.status}`);
if (webhook.verified) blockers.push("unsigned_webhook_marked_verified");
if (out.paymentMarkedPaid) blockers.push("unsigned_webhook_marked_paid");

out.success = blockers.length === 0;
console.log(JSON.stringify(out, null, 2));
process.exit(out.success ? 0 : 1);

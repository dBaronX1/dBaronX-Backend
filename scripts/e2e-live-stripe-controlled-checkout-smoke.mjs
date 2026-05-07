#!/usr/bin/env node

const MEDUSA_URL = (
  process.env.MEDUSA_URL ||
  process.env.MEDUSA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:9000"
).replace(/\/$/, "");
const API_URL = (process.env.API_URL || process.env.NESTJS_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
const MEDUSA_KEY = process.env.MEDUSA_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || "";
const WEB_BASE_URL = (process.env.WEB_BASE_URL || process.env.NEXT_PUBLIC_WEB_BASE_URL || "https://dbaronx.com").replace(/\/$/, "");

const blockers = [];
const warnings = [];
const checks = {};
const medusaHeaders = {
  "content-type": "application/json",
  ...(MEDUSA_KEY ? { "x-publishable-api-key": MEDUSA_KEY } : {}),
};
const jsonHeaders = { "content-type": "application/json" };
const internalHeaders = {
  ...jsonHeaders,
  ...(INTERNAL_SERVICE_TOKEN ? { authorization: `Bearer ${INTERNAL_SERVICE_TOKEN}` } : {}),
};

function api(path) {
  const prefix = API_URL.endsWith("/api") ? "" : "/api";
  return `${API_URL}${prefix}${path}`;
}

function unwrap(body) {
  return body && typeof body === "object" && body.data && body.success === true ? body.data : body;
}

async function getJson(url, init = {}) {
  let response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    return { ok: false, status: 0, body: { message: error instanceof Error ? error.message : String(error) }, data: {} };
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

function array(value) {
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
  apiReady: false,
  productId: null,
  variantId: null,
  regionId: null,
  cartId: null,
  lineItemAdded: false,
  shippingOptionReady: false,
  shippingAttachedToCart: false,
  stripeEndpointReady: false,
  checkoutSessionCreated: false,
  sessionIdPresent: false,
  checkoutUrlPresent: false,
  webhookEndpointReady: false,
  unsignedWebhookRejected: false,
  paymentMarkedPaid: false,
  orderSyncReady: false,
  nextManualStep: "Resolve blockers before opening Stripe Checkout.",
  warnings,
  checks,
};

const medusaHealth = await getJson(`${MEDUSA_URL}/health`, { headers: medusaHeaders });
checks.medusaHealthHttp = medusaHealth.status;
if (!medusaHealth.ok) warnings.push(`medusa_health_http_${medusaHealth.status}`);

const apiHealth = await getJson(api("/v1/commerce/health"), { headers: internalHeaders });
checks.apiCommerceHealthHttp = apiHealth.status;
out.apiReady = apiHealth.ok || apiHealth.status === 401 || apiHealth.status === 403;
if (!out.apiReady) blockers.push(`api_commerce_health_http_${apiHealth.status}`);
if ((apiHealth.status === 401 || apiHealth.status === 403) && !INTERNAL_SERVICE_TOKEN) warnings.push("internal_service_token_missing_for_api_health_probe");

const products = await getJson(`${MEDUSA_URL}/store/products?limit=20`, { headers: medusaHeaders });
checks.medusaProductsHttp = products.status;
if (!products.ok) blockers.push(`store_products_http_${products.status}`);
const product = array(products.data?.products).find((candidate) => array(candidate?.variants).length > 0) || null;
out.productId = product?.id || null;
out.variantId = product?.variants?.[0]?.id || null;
if (!out.productId) blockers.push("product_id_missing");
if (!out.variantId) blockers.push("variant_id_missing");

const regions = await getJson(`${MEDUSA_URL}/store/regions?limit=20`, { headers: medusaHeaders });
checks.medusaRegionsHttp = regions.status;
out.regionId = array(regions.data?.regions)[0]?.id || null;
if (!regions.ok) blockers.push(`store_regions_http_${regions.status}`);
if (!out.regionId) blockers.push("region_missing");
out.medusaReady = (medusaHealth.ok || products.ok) && products.ok && regions.ok && Boolean(out.productId && out.variantId && out.regionId);

let cart = null;
if (out.regionId) {
  const cartProbe = await getJson(`${MEDUSA_URL}/store/carts`, {
    method: "POST",
    headers: medusaHeaders,
    body: JSON.stringify({ region_id: out.regionId }),
  });
  checks.cartCreateHttp = cartProbe.status;
  cart = cartFrom(cartProbe.data);
  out.cartId = cart?.id || null;
  if (!cartProbe.ok || !out.cartId) blockers.push(`cart_create_http_${cartProbe.status}`);
}

if (out.cartId && out.variantId) {
  const line = await getJson(`${MEDUSA_URL}/store/carts/${out.cartId}/line-items`, {
    method: "POST",
    headers: medusaHeaders,
    body: JSON.stringify({ variant_id: out.variantId, quantity: 1 }),
  });
  checks.lineItemAddHttp = line.status;
  out.lineItemAdded = line.ok;
  cart = cartFrom(line.data) || cart;
  if (!line.ok) blockers.push(`line_item_add_http_${line.status}`);
}

let shippingOptionId = null;
if (out.cartId) {
  const shipping = await getJson(`${MEDUSA_URL}/store/shipping-options?cart_id=${encodeURIComponent(out.cartId)}`, { headers: medusaHeaders });
  const options = array(shipping.data?.shipping_options);
  checks.shippingOptionsHttp = shipping.status;
  checks.shippingOptionsCount = options.length;
  shippingOptionId = options[0]?.id || null;
  checks.shippingOptionId = shippingOptionId;
  out.shippingOptionReady = shipping.ok && Boolean(shippingOptionId);
  if (!shipping.ok) blockers.push(`shipping_options_http_${shipping.status}`);
  if (shipping.ok && !shippingOptionId) blockers.push("shipping_option_missing");
}

if (out.cartId && shippingOptionId) {
  const addShippingBodies = [{ option_id: shippingOptionId }, { shipping_option_id: shippingOptionId }];
  for (const body of addShippingBodies) {
    const attach = await getJson(`${MEDUSA_URL}/store/carts/${out.cartId}/shipping-methods`, {
      method: "POST",
      headers: medusaHeaders,
      body: JSON.stringify(body),
    });
    checks.shippingAttachHttp = attach.status;
    if (attach.ok) {
      cart = cartFrom(attach.data) || cart;
      out.shippingAttachedToCart = true;
      break;
    }
    checks.shippingAttachLastBodyKey = Object.keys(body)[0];
    if ([404, 405, 501].includes(attach.status)) {
      warnings.push(`shipping_attach_not_supported_by_store_api_http_${attach.status}`);
      break;
    }
  }
  if (!out.shippingAttachedToCart && !warnings.some((warning) => warning.startsWith("shipping_attach_not_supported"))) {
    blockers.push(`shipping_attach_http_${checks.shippingAttachHttp}`);
  }
}

const checkoutAmount = minorUnitAmountFromCart(cart);
const checkoutCurrency = String(cart?.currency_code || "usd").toLowerCase();
const checkoutRef = `stripe-controlled-${Date.now()}`;
checks.checkoutAmountMinorUnits = checkoutAmount;
checks.checkoutCurrency = checkoutCurrency;
checks.checkoutRef = checkoutRef;

const sessionPayload = {
  cartId: out.cartId || "controlled-smoke-cart-missing",
  checkoutRef,
  orderRef: checkoutRef,
  customerRef: "controlled-live-smoke",
  productId: out.productId || undefined,
  variantId: out.variantId || undefined,
  amount: checkoutAmount,
  currency: checkoutCurrency,
  successUrl: `${WEB_BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
  cancelUrl: `${WEB_BASE_URL}/checkout/cancel`,
  productName: product?.title || "dBaronX controlled Stripe checkout smoke",
  checkoutMode: "test",
};
const sessionProbe = await getJson(api("/v1/checkout/stripe/session"), {
  method: "POST",
  headers: jsonHeaders,
  body: JSON.stringify(sessionPayload),
});
const session = sessionProbe.data || {};
checks.stripeSessionHttp = sessionProbe.status;
checks.stripeSessionBlockers = session.blockers || [];
checks.stripeSessionMetadata = session.metadata || null;
out.stripeEndpointReady = sessionProbe.status !== 404;
out.sessionIdPresent = Boolean(session.sessionId);
out.checkoutUrlPresent = Boolean(session.checkoutUrl);
out.checkoutSessionCreated = session.success === true && out.sessionIdPresent && out.checkoutUrlPresent;
if (sessionProbe.status === 404) blockers.push("stripe_session_route_missing");
if (!sessionProbe.ok) blockers.push(`stripe_session_http_${sessionProbe.status}`);
if (session.configured === false) blockers.push("stripe_secret_key_missing_on_api_server");
if (session.configured === false && (out.sessionIdPresent || out.checkoutUrlPresent)) blockers.push("stripe_returned_checkout_artifacts_while_unconfigured");
if (session.configured === true && out.checkoutUrlPresent && !String(session.checkoutUrl).startsWith("https://checkout.stripe.com/")) blockers.push("stripe_checkout_url_not_stripe_hosted");
if (session.configured === true && !out.checkoutSessionCreated) blockers.push("stripe_configured_session_not_created");

const webhookProbe = await getJson(api("/v1/checkout/stripe/webhook"), { method: "POST", headers: jsonHeaders, body: "{}" });
const webhook = webhookProbe.data || {};
checks.webhookHttp = webhookProbe.status;
checks.webhookBlockers = webhook.blockers || [];
out.webhookEndpointReady = webhookProbe.status !== 404;
out.paymentMarkedPaid = Boolean(webhook.paymentMarkedPaid);
out.unsignedWebhookRejected = webhookProbe.ok && webhook.verified === false && out.paymentMarkedPaid === false;
if (webhookProbe.status === 404) blockers.push("stripe_webhook_route_missing");
if (!webhookProbe.ok) blockers.push(`stripe_webhook_http_${webhookProbe.status}`);
if (webhook.verified) blockers.push("unsigned_webhook_marked_verified");
if (out.paymentMarkedPaid) blockers.push("unsigned_webhook_marked_paid");
if (!out.unsignedWebhookRejected) blockers.push("unsigned_webhook_not_rejected");

if (out.cartId) {
  const previewProbe = await getJson(api("/v1/checkout/stripe/order-sync-preview"), {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ ...sessionPayload, sessionId: session.sessionId || undefined }),
  });
  const preview = previewProbe.data || {};
  checks.orderSyncPreviewHttp = previewProbe.status;
  checks.orderSyncPreviewBlockers = preview.blockers || [];
  out.orderSyncReady = preview.orderSyncReady === true;
  if (previewProbe.status === 404) blockers.push("order_sync_preview_route_missing");
  if (!previewProbe.ok) blockers.push(`order_sync_preview_http_${previewProbe.status}`);
  if (preview.canMapVerifiedStripeSession !== true) blockers.push("verified_stripe_session_cart_mapping_not_ready");
  if (array(preview.blockers).includes("payment_record_lookup_pending")) warnings.push("payment_record_lookup_pending_before_settlement_implementation");
}

out.success = blockers.length === 0;
out.nextManualStep = out.success
  ? `Open ${session.checkoutUrl} and complete Stripe Checkout with test card 4242 4242 4242 4242; verify checkout.session.completed reaches ${api("/v1/checkout/stripe/webhook")}.`
  : "Resolve blockers, redeploy API/Medusa if needed, then re-run this smoke before opening Stripe Checkout.";

console.log(JSON.stringify(out, null, 2));
process.exit(out.success ? 0 : 1);

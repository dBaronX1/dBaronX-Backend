#!/usr/bin/env node

const API_URL = (process.env.API_URL || process.env.NESTJS_API_URL || "https://dbaronx-api-unified.onrender.com").replace(/\/$/, "");
const MEDUSA_URL = (
  process.env.MEDUSA_URL ||
  process.env.MEDUSA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "https://dbaronx-medusa.onrender.com"
).replace(/\/$/, "");
const MEDUSA_KEY = (process.env.MEDUSA_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "").trim();
const INTERNAL_SERVICE_TOKEN = (process.env.INTERNAL_SERVICE_TOKEN || "").trim();
const WEB_BASE_URL = (process.env.WEB_BASE_URL || process.env.NEXT_PUBLIC_WEB_BASE_URL || "https://dbaronx.com").replace(/\/$/, "");
const SNIPPET_LIMIT = 900;

const blockers = [];
const warnings = [];
const responseSnippets = {};
const fetchErrors = [];
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
  const base = API_URL.endsWith("/api") ? API_URL.slice(0, -4) : API_URL;
  return `${base}/api${path}`;
}

function apiAbsolute(path) {
  const base = API_URL.endsWith("/api") ? API_URL.slice(0, -4) : API_URL;
  return `${base}${path}`;
}

function snippet(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? null);
  return text.length > SNIPPET_LIMIT ? `${text.slice(0, SNIPPET_LIMIT)}…` : text;
}

function safeHeaders(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      /authorization|token|key|secret/i.test(key) ? Boolean(String(value || "").trim()) : value,
    ]),
  );
}

function unwrap(body) {
  return body && typeof body === "object" && body.success === true && body.data ? body.data : body;
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function cartFrom(data) {
  return data?.cart || data;
}

function firstProductWithVariant(products) {
  return array(products).find((product) => array(product?.variants).length > 0) || null;
}

function salesChannelIdFrom(product) {
  return (process.env.MEDUSA_SALES_CHANNEL_ID || array(product?.sales_channels)[0]?.id || "").trim();
}

function minorUnitAmountFromCart(cart) {
  const total = Number(cart?.total ?? cart?.subtotal ?? cart?.item_total ?? 0);
  return Number.isInteger(total) && total > 0 ? total : Number(process.env.STRIPE_TEST_AMOUNT_MINOR || 100);
}

function addBlocker(blocker) {
  if (blocker && !blockers.includes(blocker)) blockers.push(blocker);
}

function addWarning(warning) {
  if (warning && !warnings.includes(warning)) warnings.push(warning);
}

async function requestJson(label, url, init = {}) {
  const request = { url, method: init.method || "GET", headers: init.headers || {}, body: init.body };
  let response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    const normalized = {
      endpoint: request.url,
      method: request.method,
      headersUsed: safeHeaders(request.headers),
      bodyPreview: request.body ? snippet(request.body) : null,
      errorName: error instanceof Error ? error.name : "NonErrorThrown",
      errorMessage: error instanceof Error ? error.message : String(error),
    };
    fetchErrors.push(normalized);
    responseSnippets[label] = normalized.errorMessage;
    return { ok: false, status: 0, body: { message: normalized.errorMessage }, data: {}, text: normalized.errorMessage };
  }

  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  responseSnippets[label] = snippet(text || body);
  return { ok: response.ok, status: response.status, body, data: unwrap(body), text };
}

async function firstSuccessfulGet(label, paths, headers = jsonHeaders) {
  let last = null;
  for (const path of paths) {
    const probe = await requestJson(`${label} ${path}`, api(path), { headers });
    last = { probe, path, routeUsed: `/api${path}` };
    if (probe.ok || probe.status === 401 || probe.status === 403) return last;
    if (probe.status !== 404) return last;
  }
  return last;
}

async function firstCanonicalApiGet(label, canonicalPath, legacyPath, headers = jsonHeaders) {
  const canonical = await requestJson(`${label} ${canonicalPath}`, apiAbsolute(canonicalPath), { headers });
  if (canonical.status !== 404 || !legacyPath) return { probe: canonical, path: canonicalPath, routeUsed: canonicalPath };
  const legacy = await requestJson(`${label} ${legacyPath}`, apiAbsolute(legacyPath), { headers });
  return { probe: legacy, path: legacyPath, routeUsed: legacyPath };
}

async function firstCanonicalApiPost(label, canonicalPath, legacyPath, body, headers = jsonHeaders) {
  const init = { method: "POST", headers, body: JSON.stringify(body) };
  const canonical = await requestJson(`${label} ${canonicalPath}`, apiAbsolute(canonicalPath), init);
  if (canonical.status !== 404 || !legacyPath) return { probe: canonical, path: canonicalPath, routeUsed: canonicalPath };
  const legacy = await requestJson(`${label} ${legacyPath}`, apiAbsolute(legacyPath), init);
  return { probe: legacy, path: legacyPath, routeUsed: legacyPath };
}

const out = {
  success: false,
  blockers,
  apiReady: false,
  paymentReadinessReady: false,
  economicReadinessReady: false,
  medusaReady: false,
  cartReady: false,
  lineItemAdded: false,
  shippingOptionReady: false,
  stripeConfigured: false,
  stripeWebhookConfigured: false,
  checkoutSessionCreated: false,
  sessionId: null,
  checkoutUrl: null,
  checkoutUrlPresent: false,
  stripeHostedCheckoutUrl: false,
  unsignedWebhookRejected: false,
  paymentMarkedPaid: false,
  orderSyncReady: false,
  nextManualStep: "Resolve blockers before opening Stripe Checkout.",
  responseSnippets,
  fetchErrors,
  warnings,
  checks,
  apiHealthPathsTried: [],
  apiReadySource: null,
  stripeRoutesUsed: {},
  economicRoutesUsed: {},
  shippingRoutesUsed: [],
  shippingOptionsCount: 0,
  shippingOptionIds: [],
  stripeSessionAuthMode: "public-safe",
  checkoutBlockers: blockers,
  settlementBlockers: [],
  apiUrl: API_URL,
  medusaUrl: MEDUSA_URL,
  productId: null,
  variantId: null,
  regionId: null,
  cartId: null,
};

const trustedReadinessPaths = [
  "/api/health",
  "/health",
  "/api/payments/readiness",
  "/api/system/runtime-contract",
  "/api/system/deployment-readiness",
];
for (const path of trustedReadinessPaths) {
  const probe = await requestJson(`api readiness ${path}`, apiAbsolute(path), { headers: internalHeaders });
  out.apiHealthPathsTried.push({ path, status: probe.status });
  if (!out.apiReady && probe.status === 200) {
    out.apiReady = true;
    out.apiReadySource = path;
  }
}
checks.apiHealthHttp = out.apiHealthPathsTried.find((item) => item.path === "/api/health")?.status ?? 0;
if (!out.apiReady) addBlocker(`api_readiness_http_${out.apiHealthPathsTried.map((item) => `${item.path}:${item.status}`).join(",")}`);

const readiness = await firstCanonicalApiGet("payment readiness", "/api/payments/readiness", "/api/v1/payments/readiness", jsonHeaders);
const readinessBody = readiness?.probe?.data || {};
checks.paymentReadinessHttp = readiness?.probe?.status ?? 0;
checks.paymentReadinessPath = readiness?.path || null;
out.stripeRoutesUsed.readiness = readiness?.routeUsed || null;
out.paymentReadinessReady = readiness?.probe?.ok === true && (readinessBody.ready === true || readinessBody.success === true);
out.stripeConfigured = readinessBody.stripeConfigured === true;
out.stripeWebhookConfigured = readinessBody.stripeWebhookConfigured === true;
if (!readiness?.probe?.ok) addBlocker(readiness?.probe?.status === 404 ? "payment_readiness_route_missing" : `payment_readiness_http_${readiness?.probe?.status ?? 0}`);
for (const blocker of array(readinessBody.blockers)) {
  if (blocker === "stripe_secret_key_missing") addBlocker("stripe_secret_key_missing");
  if (blocker === "stripe_webhook_secret_missing") addBlocker("stripe_webhook_secret_missing");
}

const economic = await firstCanonicalApiGet("economic readiness", "/api/payments/economic-readiness", "/api/v1/payments/economic-readiness", jsonHeaders);
const economicBody = economic?.probe?.data || {};
checks.economicReadinessHttp = economic?.probe?.status ?? 0;
checks.economicReadinessPath = economic?.path || null;
out.economicRoutesUsed.readiness = economic?.routeUsed || null;
out.economicReadinessReady = economic?.probe?.ok === true && (economicBody.ready === true || economicBody.success === true);
if (!economic?.probe?.ok) addBlocker(economic?.probe?.status === 404 ? "economic_readiness_route_missing" : `economic_readiness_http_${economic?.probe?.status ?? 0}`);
if (economicBody.frontendRedirectCanMarkPaid !== false && economicBody.frontendRedirectCanMarkPaid !== undefined) addBlocker("frontend_redirect_can_mark_paid");

const medusaHealth = await requestJson("medusa health", `${MEDUSA_URL}/health`, { headers: medusaHeaders });
checks.medusaHealthHttp = medusaHealth.status;
if (!medusaHealth.ok) addWarning(`medusa_health_http_${medusaHealth.status}`);

const productsProbe = await requestJson("medusa products", `${MEDUSA_URL}/store/products?limit=20`, { headers: medusaHeaders });
checks.medusaProductsHttp = productsProbe.status;
if (!productsProbe.ok) addBlocker(`store_products_http_${productsProbe.status}`);
const product = firstProductWithVariant(productsProbe.data?.products);
out.productId = product?.id || null;
out.variantId = product?.variants?.[0]?.id || null;
if (!out.productId) addBlocker("product_id_missing");
if (!out.variantId) addBlocker("variant_id_missing");

const regionsProbe = await requestJson("medusa regions", `${MEDUSA_URL}/store/regions?limit=20`, { headers: medusaHeaders });
checks.medusaRegionsHttp = regionsProbe.status;
if (!regionsProbe.ok) addBlocker(`store_regions_http_${regionsProbe.status}`);
out.regionId = array(regionsProbe.data?.regions)[0]?.id || null;
if (!out.regionId) addBlocker("region_missing");
out.medusaReady = productsProbe.ok && regionsProbe.ok && Boolean(out.productId && out.variantId && out.regionId);

let cart = null;
if (out.regionId) {
  const salesChannelId = salesChannelIdFrom(product);
  const cartBodies = salesChannelId
    ? [{ region_id: out.regionId, sales_channel_id: salesChannelId }, { region_id: out.regionId }]
    : [{ region_id: out.regionId }];
  let lastCartProbe = null;
  for (const body of cartBodies) {
    lastCartProbe = await requestJson("medusa cart create", `${MEDUSA_URL}/store/carts`, {
      method: "POST",
      headers: medusaHeaders,
      body: JSON.stringify(body),
    });
    checks.cartCreateHttp = lastCartProbe.status;
    cart = cartFrom(lastCartProbe.data);
    out.cartId = cart?.id || null;
    if (lastCartProbe.ok && out.cartId) break;
  }
  out.cartReady = Boolean(out.cartId);
  if (!out.cartReady) addBlocker(`cart_create_http_${lastCartProbe?.status ?? 0}`);
}

if (out.cartId && out.variantId) {
  const lineProbe = await requestJson("medusa line item add", `${MEDUSA_URL}/store/carts/${out.cartId}/line-items`, {
    method: "POST",
    headers: medusaHeaders,
    body: JSON.stringify({ variant_id: out.variantId, quantity: 1 }),
  });
  checks.lineItemAddHttp = lineProbe.status;
  out.lineItemAdded = lineProbe.ok;
  cart = cartFrom(lineProbe.data) || cart;
  if (!out.lineItemAdded) addBlocker(`line_item_add_http_${lineProbe.status}`);
}

let shippingOptionId = null;
if (out.cartId) {
  const shippingAddressBody = {
    email: "first-stripe-smoke@example.com",
    shipping_address: {
      first_name: "First",
      last_name: "StripeSmoke",
      address_1: "101 Test Street",
      city: "New York",
      province: "NY",
      postal_code: "10001",
      country_code: "us",
    },
  };
  const addressRoute = `/store/carts/${out.cartId}`;
  const addressProbe = await requestJson("medusa cart shipping address", `${MEDUSA_URL}${addressRoute}`, {
    method: "POST",
    headers: medusaHeaders,
    body: JSON.stringify(shippingAddressBody),
  });
  out.shippingRoutesUsed.push({ method: "POST", path: addressRoute, body: shippingAddressBody, status: addressProbe.status });
  checks.shippingAddressHttp = addressProbe.status;
  if (addressProbe.ok) cart = cartFrom(addressProbe.data) || cart;
  else addWarning(`shipping_address_update_http_${addressProbe.status}`);

  const shippingPath = `/store/shipping-options?cart_id=${encodeURIComponent(out.cartId)}`;
  const shippingProbe = await requestJson("medusa shipping options", `${MEDUSA_URL}${shippingPath}`, { headers: medusaHeaders });
  out.shippingRoutesUsed.push({ method: "GET", path: shippingPath, headers: { "x-publishable-api-key": Boolean(MEDUSA_KEY) }, status: shippingProbe.status });
  const options = array(shippingProbe.data?.shipping_options);
  checks.shippingOptionsHttp = shippingProbe.status;
  checks.shippingOptionsCount = options.length;
  out.shippingOptionsCount = options.length;
  out.shippingOptionIds = options.map((option) => option?.id).filter(Boolean);
  shippingOptionId = options[0]?.id || null;
  out.shippingOptionReady = shippingProbe.ok && Boolean(shippingOptionId);
  if (!shippingProbe.ok) addBlocker(`shipping_options_http_${shippingProbe.status}`);
  if (shippingProbe.ok && !shippingOptionId) addBlocker("shipping_option_missing");
}

if (out.cartId && shippingOptionId) {
  const bodies = [{ option_id: shippingOptionId }, { shipping_option_id: shippingOptionId }];
  let attached = false;
  let lastStatus = 0;
  for (const body of bodies) {
    const attachProbe = await requestJson("medusa shipping add", `${MEDUSA_URL}/store/carts/${out.cartId}/shipping-methods`, {
      method: "POST",
      headers: medusaHeaders,
      body: JSON.stringify(body),
    });
    lastStatus = attachProbe.status;
    checks.shippingAddHttp = attachProbe.status;
    if (attachProbe.ok) {
      attached = true;
      cart = cartFrom(attachProbe.data) || cart;
      break;
    }
    if ([404, 405, 501].includes(attachProbe.status)) {
      addWarning(`shipping_add_not_supported_by_store_api_http_${attachProbe.status}`);
      break;
    }
  }
  checks.shippingAttachedToCart = attached;
  if (!attached && !warnings.some((warning) => warning.startsWith("shipping_add_not_supported"))) addBlocker(`shipping_add_http_${lastStatus}`);
}

const checkoutRef = `first-stripe-test-${Date.now()}`;
const sessionPayload = {
  cartId: out.cartId || "first-stripe-test-cart-missing",
  checkoutRef,
  orderRef: checkoutRef,
  customerRef: "first-controlled-stripe-test",
  productId: out.productId || undefined,
  variantId: out.variantId || undefined,
  amount: minorUnitAmountFromCart(cart),
  currency: String(cart?.currency_code || "usd").toLowerCase(),
  successUrl: `${WEB_BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
  cancelUrl: `${WEB_BASE_URL}/checkout/cancel`,
  productName: product?.title || "dBaronX first controlled Stripe test transaction",
  checkoutMode: "test",
};
checks.checkoutPayload = { ...sessionPayload, customerRef: Boolean(sessionPayload.customerRef) };

const sessionRoute = await firstCanonicalApiPost("stripe checkout session", "/api/checkout/stripe/session", "/api/v1/checkout/stripe/session", sessionPayload, jsonHeaders);
out.stripeRoutesUsed.session = sessionRoute.routeUsed;
const sessionProbe = sessionRoute.probe;
const session = sessionProbe.data || {};
checks.stripeSessionHttp = sessionProbe.status;
checks.stripeSessionBlockers = session.blockers || [];
out.stripeConfigured = out.stripeConfigured || session.configured === true;
out.checkoutUrl = typeof session.checkoutUrl === "string" ? session.checkoutUrl : null;
out.sessionId = typeof session.sessionId === "string" ? session.sessionId : null;
out.checkoutUrlPresent = Boolean(out.checkoutUrl);
out.stripeHostedCheckoutUrl = Boolean(out.checkoutUrl && /^https:\/\/checkout\.stripe\.com\//.test(out.checkoutUrl));
out.checkoutSessionCreated = session.success === true && Boolean(out.sessionId) && out.stripeHostedCheckoutUrl;
if (sessionProbe.status === 404) addBlocker("stripe_session_route_missing");
if (!sessionProbe.ok) addBlocker(`stripe_session_http_${sessionProbe.status}`);
if (array(session.blockers).includes("stripe_secret_key_missing") || session.configured === false) addBlocker("stripe_secret_key_missing");
if (!out.stripeConfigured && !out.checkoutSessionCreated) addBlocker("stripe_secret_key_missing");
if (!out.checkoutSessionCreated && out.stripeConfigured) addBlocker("stripe_checkout_session_not_created");
if ((out.checkoutUrlPresent || out.sessionId) && !out.stripeConfigured) addBlocker("stripe_returned_checkout_artifacts_while_unconfigured");
if (out.checkoutUrlPresent && !out.stripeHostedCheckoutUrl) addBlocker("checkout_url_not_stripe_hosted");

const unsignedWebhookRoute = await firstCanonicalApiPost("stripe unsigned webhook", "/api/checkout/stripe/webhook", "/api/v1/checkout/stripe/webhook", { type: "checkout.session.completed", data: { object: { id: out.sessionId || "unsigned-smoke" } } }, jsonHeaders);
out.stripeRoutesUsed.webhook = unsignedWebhookRoute.routeUsed;
const unsignedWebhookProbe = unsignedWebhookRoute.probe;
const unsignedWebhook = unsignedWebhookProbe.data || {};
checks.unsignedWebhookHttp = unsignedWebhookProbe.status;
checks.unsignedWebhookBlockers = unsignedWebhook.blockers || [];
out.paymentMarkedPaid = Boolean(unsignedWebhook.paymentMarkedPaid);
out.unsignedWebhookRejected = unsignedWebhookProbe.ok && unsignedWebhook.verified === false && out.paymentMarkedPaid === false;
if (unsignedWebhookProbe.status === 404) addBlocker("stripe_webhook_route_missing");
if (!unsignedWebhookProbe.ok) addBlocker(`stripe_webhook_http_${unsignedWebhookProbe.status}`);
if (unsignedWebhook.verified === true) addBlocker("unsigned_webhook_marked_verified");
if (out.paymentMarkedPaid) addBlocker("unsigned_webhook_marked_paid");
if (!out.unsignedWebhookRejected) addBlocker("unsigned_webhook_not_rejected");
if (array(unsignedWebhook.blockers).includes("stripe_webhook_secret_missing")) addBlocker("stripe_webhook_secret_missing");
out.stripeWebhookConfigured = out.stripeWebhookConfigured || !array(unsignedWebhook.blockers).includes("stripe_webhook_secret_missing");

const previewRoute = await firstCanonicalApiPost("order sync preview", "/api/checkout/stripe/order-sync-preview", "/api/v1/checkout/stripe/order-sync-preview", { ...sessionPayload, sessionId: out.sessionId || undefined }, jsonHeaders);
out.stripeRoutesUsed.orderSyncPreview = previewRoute.routeUsed;
const previewProbe = previewRoute.probe;
const preview = previewProbe.data || {};
checks.orderSyncPreviewHttp = previewProbe.status;
checks.orderSyncPreviewBlockers = preview.blockers || [];
out.orderSyncReady = preview.orderSyncReady === true;
if (previewProbe.status === 404) addBlocker("order_sync_preview_route_missing");
if (!previewProbe.ok) addBlocker(`order_sync_preview_http_${previewProbe.status}`);
if (array(preview.blockers).includes("payment_record_lookup_pending")) addBlocker("payment_verified_order_sync_pending");
if (array(readinessBody.orderSyncBlockers).length > 0) {
  for (const blocker of readinessBody.orderSyncBlockers) addBlocker(blocker);
}
if (!out.orderSyncReady) addBlocker("order_sync_not_configured");

const dryRunRoute = await firstCanonicalApiPost("economic event dry run", "/api/payments/economic-events/dry-run", "/api/v1/payments/economic-events/dry-run", { eventType: "checkout.session.completed", cartId: out.cartId, sessionId: out.sessionId }, jsonHeaders);
out.economicRoutesUsed.dryRun = dryRunRoute.routeUsed;
const dryRunProbe = dryRunRoute.probe;
const dryRun = dryRunProbe.data || {};
checks.economicDryRunHttp = dryRunProbe.status;
checks.economicDryRunBlockers = dryRun.blockers || [];
if (dryRunProbe.status === 404) addBlocker("economic_event_dry_run_route_missing");
if (!dryRunProbe.ok) addBlocker(`economic_event_dry_run_http_${dryRunProbe.status}`);
if (dryRun.paymentMarkedPaid === true || dryRun.orderCompleted === true) addBlocker("economic_dry_run_mutated_paid_or_order_state");

out.settlementBlockers = blockers.filter((blocker) => /webhook|paid|settlement|order_sync|economic|idempotency/i.test(blocker));
out.success = blockers.length === 0;
out.nextManualStep = out.checkoutSessionCreated
  ? `Open ${out.checkoutUrl}; use Stripe test card 4242 4242 4242 4242 with any future expiry, any CVC, and any postal code; then confirm checkout.session.completed in Stripe Dashboard and verify only a signed webhook can move paid/order sync state.`
  : "Resolve blockers before opening Stripe Checkout. No checkoutUrl/sessionId should be used unless Stripe returns real hosted artifacts.";

console.log(JSON.stringify(out, null, 2));
process.exit(out.success ? 0 : 1);

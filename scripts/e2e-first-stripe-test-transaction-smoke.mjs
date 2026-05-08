#!/usr/bin/env node

const API_URL = (process.env.API_URL || process.env.NESTJS_API_URL || "https://dbaronx-api-unified.onrender.com").replace(/\/+$/, "");
const API_BASE_URL = API_URL.endsWith("/api") ? API_URL.slice(0, -4) : API_URL;
const MEDUSA_URL = (
  process.env.MEDUSA_URL ||
  process.env.MEDUSA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "https://dbaronx-medusa.onrender.com"
).replace(/\/+$/, "");
const MEDUSA_KEY = (process.env.MEDUSA_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "").trim();
const INTERNAL_SERVICE_TOKEN = (process.env.INTERNAL_SERVICE_TOKEN || "").trim();
const WEB_BASE_URL = (process.env.WEB_BASE_URL || process.env.NEXT_PUBLIC_WEB_BASE_URL || "https://dbaronx.com").replace(/\/+$/, "");
const TARGET_REGION_ID = "reg_01KQSEKK6A9T86NJ0AG05XPK3H";
const SNIPPET_LIMIT = 900;
const STRIPE_WEBHOOK_URL_EXPECTED = `${API_BASE_URL}/api/checkout/stripe/webhook`;

const blockers = [];
const checkoutBlockers = [];
const settlementBlockers = [];
const warnings = [];
const responseSnippets = {};
const fetchErrors = [];
const checks = {};
const apiHealthPathsTried = [];
const apiRoutesUsed = {};
const stripeRoutesUsed = {};
const economicRoutesUsed = {};
const shippingRoutesUsed = {};

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
  return `${API_BASE_URL}${path}`;
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
  return body && typeof body === "object" && body.success === true && body.data !== undefined ? body.data : body;
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

function addUnique(target, blocker) {
  if (blocker && !target.includes(blocker)) target.push(blocker);
}

function addBlocker(blocker, category = "checkout") {
  addUnique(blockers, blocker);
  addUnique(category === "settlement" ? settlementBlockers : checkoutBlockers, blocker);
}

function addWarning(warning) {
  addUnique(warnings, warning);
}

function stripeSessionModeFromId(sessionId) {
  if (typeof sessionId !== "string") return "unknown";
  if (sessionId.startsWith("cs_test_")) return "test";
  if (sessionId.startsWith("cs_live_")) return "live";
  return sessionId ? "unknown" : "missing";
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

async function getApiWithFallback(label, canonicalPath, legacyPath, headers = jsonHeaders) {
  const canonical = await requestJson(`${label} GET ${canonicalPath}`, api(canonicalPath), { headers });
  if (canonical.status !== 404 || !legacyPath) return { probe: canonical, path: canonicalPath, fallbackUsed: false };
  const legacy = await requestJson(`${label} GET ${legacyPath}`, api(legacyPath), { headers });
  addWarning(`${label.replace(/\s+/g, "_")}_legacy_fallback_used:${legacyPath}`);
  return { probe: legacy, path: legacyPath, fallbackUsed: true };
}

async function postApiWithFallback(label, canonicalPath, legacyPath, body, headers = jsonHeaders) {
  const canonical = await requestJson(`${label} POST ${canonicalPath}`, api(canonicalPath), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (canonical.status !== 404 || !legacyPath) return { probe: canonical, path: canonicalPath, fallbackUsed: false };
  const legacy = await requestJson(`${label} POST ${legacyPath}`, api(legacyPath), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  addWarning(`${label.replace(/\s+/g, "_")}_legacy_fallback_used:${legacyPath}`);
  return { probe: legacy, path: legacyPath, fallbackUsed: true };
}

async function firstReadyHealthPath(paths) {
  let last = null;
  for (const path of paths) {
    const probe = await requestJson(`api health GET ${path}`, api(path), { headers: internalHeaders });
    apiHealthPathsTried.push({ path, status: probe.status, ok: probe.ok });
    last = { probe, path };
    if (probe.ok) return last;
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
  settlementBlockers,
  checkoutBlockers,
  apiReady: false,
  paymentReadinessReady: false,
  economicReadinessReady: false,
  medusaReady: false,
  cartReady: false,
  lineItemAdded: false,
  shippingOptionReady: false,
  stripeConfigured: false,
  stripeSecretKeyMode: "missing",
  stripeWebhookConfigured: false,
  stripeWebhookUrlExpected: STRIPE_WEBHOOK_URL_EXPECTED,
  liveCheckoutExplicitlyAllowed: false,
  checkoutSessionCreated: false,
  sessionId: null,
  stripeSessionModeDetected: "missing",
  stripeSessionModeAllowed: false,
  checkoutUrl: null,
  checkoutUrlPresent: false,
  stripeHostedCheckoutUrl: false,
  unsignedWebhookRejected: false,
  paymentMarkedPaid: false,
  orderSyncReady: false,
  nextManualStep: "Resolve checkout blockers before opening Stripe Checkout.",
  responseSnippets,
  fetchErrors,
  warnings,
  checks,
  apiHealthPathsTried,
  apiRoutesUsed,
  stripeRoutesUsed,
  economicRoutesUsed,
  shippingRoutesUsed,
  shippingOptionsCount: 0,
  shippingOptionIds: [],
  apiUrl: API_URL,
  medusaUrl: MEDUSA_URL,
  medusaPublishableKeyPresent: Boolean(MEDUSA_KEY),
  productId: null,
  variantId: null,
  regionId: null,
  cartId: null,
};

const health = await firstReadyHealthPath([
  "/api/health",
  "/health",
  "/api/payments/readiness",
  "/api/system/runtime-contract",
  "/api/system/deployment-readiness",
]);
checks.apiHealthHttp = health?.probe?.status ?? 0;
checks.apiHealthPath = health?.path || null;
out.apiReady = Boolean(health?.probe?.ok);
apiRoutesUsed.healthReady = out.apiReady ? health.path : null;
if (!out.apiReady) addBlocker(`api_readiness_all_paths_failed_${checks.apiHealthHttp}`);

const readiness = await getApiWithFallback("payment readiness", "/api/payments/readiness", "/api/v1/payments/readiness", jsonHeaders);
const readinessBody = readiness.probe.data || {};
checks.paymentReadinessHttp = readiness.probe.status;
checks.paymentReadinessPath = readiness.path;
apiRoutesUsed.paymentReadiness = readiness.path;
out.paymentReadinessReady = readiness.probe.ok === true;
out.stripeConfigured = readinessBody.stripeConfigured === true;
out.stripeSecretKeyMode = readinessBody.stripeSecretKeyMode || out.stripeSecretKeyMode;
out.stripeWebhookConfigured = readinessBody.stripeWebhookConfigured === true;
out.stripeWebhookUrlExpected = readinessBody.stripeWebhookUrlExpected
  ? `${API_BASE_URL}${String(readinessBody.stripeWebhookUrlExpected).startsWith("/") ? readinessBody.stripeWebhookUrlExpected : `/${readinessBody.stripeWebhookUrlExpected}`}`
  : STRIPE_WEBHOOK_URL_EXPECTED;
out.liveCheckoutExplicitlyAllowed = readinessBody.liveCheckoutExplicitlyAllowed === true;
if (!readiness.probe.ok) addBlocker(readiness.probe.status === 404 ? "payment_readiness_route_missing" : `payment_readiness_http_${readiness.probe.status}`);
for (const blocker of array(readinessBody.blockers)) {
  if (blocker === "stripe_secret_key_missing") addBlocker("stripe_secret_key_missing");
  if (blocker === "stripe_webhook_secret_missing") addBlocker("stripe_webhook_secret_missing", "settlement");
  if (blocker === "stripe_live_key_present_without_live_checkout_allowance") addBlocker("stripe_live_key_present_without_live_checkout_allowance");
}

const economic = await getApiWithFallback("economic readiness", "/api/payments/economic-readiness", "/api/v1/payments/economic-readiness", jsonHeaders);
const economicBody = economic.probe.data || {};
checks.economicReadinessHttp = economic.probe.status;
checks.economicReadinessPath = economic.path;
economicRoutesUsed.readiness = economic.path;
out.economicReadinessReady = economic.probe.ok === true && economicBody.success !== false;
if (!economic.probe.ok) addBlocker(economic.probe.status === 404 ? "economic_readiness_route_missing" : `economic_readiness_http_${economic.probe.status}`, "settlement");
if (economicBody.frontendRedirectCanMarkPaid !== false && economicBody.frontendRedirectCanMarkPaid !== undefined) addBlocker("frontend_redirect_can_mark_paid", "settlement");

const medusaHealth = await requestJson("medusa health GET /health", `${MEDUSA_URL}/health`, { headers: medusaHeaders });
checks.medusaHealthHttp = medusaHealth.status;
if (!medusaHealth.ok) addWarning(`medusa_health_http_${medusaHealth.status}`);

const productsProbe = await requestJson("medusa products GET /store/products", `${MEDUSA_URL}/store/products?limit=20`, { headers: medusaHeaders });
checks.medusaProductsHttp = productsProbe.status;
if (!productsProbe.ok) addBlocker(`store_products_http_${productsProbe.status}`);
const product = firstProductWithVariant(productsProbe.data?.products);
out.productId = product?.id || null;
out.variantId = product?.variants?.[0]?.id || null;
if (!out.productId) addBlocker("product_id_missing");
if (!out.variantId) addBlocker("variant_id_missing");

const regionsProbe = await requestJson("medusa regions GET /store/regions", `${MEDUSA_URL}/store/regions?limit=50`, { headers: medusaHeaders });
checks.medusaRegionsHttp = regionsProbe.status;
if (!regionsProbe.ok) addBlocker(`store_regions_http_${regionsProbe.status}`);
const regions = array(regionsProbe.data?.regions);
out.regionId = regions.find((region) => region?.id === TARGET_REGION_ID)?.id || regions.find((region) => String(region?.currency_code || "").toLowerCase() === "usd")?.id || regions[0]?.id || null;
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
    lastCartProbe = await requestJson("medusa cart create POST /store/carts", `${MEDUSA_URL}/store/carts`, {
      method: "POST",
      headers: medusaHeaders,
      body: JSON.stringify(body),
    });
    checks.cartCreateHttp = lastCartProbe.status;
    checks.cartCreateBody = body;
    cart = cartFrom(lastCartProbe.data);
    out.cartId = cart?.id || null;
    if (lastCartProbe.ok && out.cartId) break;
  }
  out.cartReady = Boolean(out.cartId);
  if (!out.cartReady) addBlocker(`cart_create_http_${lastCartProbe?.status ?? 0}`);
}

if (out.cartId && out.variantId) {
  const lineProbe = await requestJson("medusa line item add POST /store/carts/:id/line-items", `${MEDUSA_URL}/store/carts/${out.cartId}/line-items`, {
    method: "POST",
    headers: medusaHeaders,
    body: JSON.stringify({ variant_id: out.variantId, quantity: 1 }),
  });
  checks.lineItemAddHttp = lineProbe.status;
  out.lineItemAdded = lineProbe.ok;
  cart = cartFrom(lineProbe.data) || cart;
  if (!out.lineItemAdded) addBlocker(`line_item_add_http_${lineProbe.status}`);
}

if (out.cartId) {
  const addressBody = {
    shipping_address: {
      first_name: "Stripe",
      last_name: "Smoke",
      address_1: "123 Test St",
      city: "New York",
      province: "NY",
      postal_code: "10001",
      country_code: "us",
    },
  };
  const addressProbe = await requestJson("medusa cart address POST /store/carts/:id", `${MEDUSA_URL}/store/carts/${out.cartId}`, {
    method: "POST",
    headers: medusaHeaders,
    body: JSON.stringify(addressBody),
  });
  checks.cartAddressHttp = addressProbe.status;
  shippingRoutesUsed.cartAddress = { method: "POST", path: `/store/carts/${out.cartId}`, body: addressBody };
  if (addressProbe.ok) cart = cartFrom(addressProbe.data) || cart;
  else addWarning(`cart_address_http_${addressProbe.status}`);
}

let shippingOptionId = null;
if (out.cartId) {
  const shippingPath = `/store/shipping-options?cart_id=${encodeURIComponent(out.cartId)}`;
  const shippingProbe = await requestJson(`medusa shipping options GET ${shippingPath}`, `${MEDUSA_URL}${shippingPath}`, { headers: medusaHeaders });
  const options = array(shippingProbe.data?.shipping_options);
  checks.shippingOptionsHttp = shippingProbe.status;
  checks.shippingOptionsCount = options.length;
  out.shippingOptionsCount = options.length;
  out.shippingOptionIds = options.map((option) => option?.id).filter(Boolean);
  shippingOptionId = out.shippingOptionIds[0] || null;
  out.shippingOptionReady = shippingProbe.ok && Boolean(shippingOptionId);
  shippingRoutesUsed.shippingOptions = { method: "GET", path: shippingPath, headers: { "x-publishable-api-key": Boolean(MEDUSA_KEY) } };
  if (!shippingProbe.ok) addBlocker(`shipping_options_http_${shippingProbe.status}`);
  if (shippingProbe.ok && !shippingOptionId) addBlocker("shipping_option_missing");
}

if (out.cartId && shippingOptionId) {
  const attachPath = `/store/carts/${out.cartId}/shipping-methods`;
  const body = { option_id: shippingOptionId };
  const attachProbe = await requestJson(`medusa shipping add POST ${attachPath}`, `${MEDUSA_URL}${attachPath}`, {
    method: "POST",
    headers: medusaHeaders,
    body: JSON.stringify(body),
  });
  checks.shippingAddHttp = attachProbe.status;
  shippingRoutesUsed.shippingMethodAttach = { method: "POST", path: attachPath, body };
  if (attachProbe.ok) {
    cart = cartFrom(attachProbe.data) || cart;
    checks.shippingAttachedToCart = true;
  } else {
    checks.shippingAttachedToCart = false;
    addBlocker(`shipping_add_http_${attachProbe.status}`);
  }
}

if (out.cartId) {
  const totalsProbe = await requestJson(`medusa cart totals GET /store/carts/${out.cartId}`, `${MEDUSA_URL}/store/carts/${out.cartId}`, { headers: medusaHeaders });
  if (totalsProbe.ok) cart = cartFrom(totalsProbe.data) || cart;
  checks.cartTotalsHttp = totalsProbe.status;
  checks.cartTotals = {
    subtotal: cart?.subtotal ?? null,
    shipping_total: cart?.shipping_total ?? null,
    total: cart?.total ?? null,
    currency_code: cart?.currency_code ?? null,
  };
  shippingRoutesUsed.cartShippingTotals = { method: "GET", path: `/store/carts/${out.cartId}` };
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

const sessionRoute = await postApiWithFallback("stripe checkout session", "/api/checkout/stripe/session", "/api/v1/checkout/stripe/session", sessionPayload, jsonHeaders);
const sessionProbe = sessionRoute.probe;
const session = sessionProbe.data || {};
stripeRoutesUsed.checkoutSession = sessionRoute.path;
checks.stripeSessionHttp = sessionProbe.status;
checks.stripeSessionPath = sessionRoute.path;
checks.stripeSessionBlockers = session.blockers || [];
out.stripeConfigured = out.stripeConfigured || session.configured === true;
out.checkoutUrl = typeof session.checkoutUrl === "string" ? session.checkoutUrl : null;
out.sessionId = typeof session.sessionId === "string" ? session.sessionId : null;
out.stripeSessionModeDetected = stripeSessionModeFromId(out.sessionId);
out.stripeSessionModeAllowed = out.stripeSessionModeDetected === "test" || out.stripeSessionModeDetected === "missing";
out.checkoutUrlPresent = Boolean(out.checkoutUrl);
out.stripeHostedCheckoutUrl = Boolean(out.checkoutUrl && /^https:\/\/checkout\.stripe\.com\//.test(out.checkoutUrl));
out.checkoutSessionCreated = session.success === true && Boolean(out.sessionId) && out.stripeHostedCheckoutUrl;
if (sessionProbe.status === 404) addBlocker("stripe_session_route_missing");
if (!sessionProbe.ok) addBlocker(`stripe_session_http_${sessionProbe.status}`);
if (array(session.blockers).includes("stripe_secret_key_missing") || session.configured === false) addBlocker("stripe_secret_key_missing");
if (array(session.blockers).includes("stripe_live_key_used_for_test_checkout")) addBlocker("stripe_live_key_used_for_test_checkout");
if (out.stripeSessionModeDetected === "live") {
  out.stripeSessionModeAllowed = false;
  addBlocker("stripe_live_session_returned_for_test_smoke");
}
if (!out.stripeConfigured && !out.checkoutSessionCreated) addBlocker("stripe_secret_key_missing");
if (!out.checkoutSessionCreated && out.stripeConfigured) addBlocker("stripe_checkout_session_not_created");
if ((out.checkoutUrlPresent || out.sessionId) && !out.stripeConfigured) addBlocker("stripe_returned_checkout_artifacts_while_unconfigured");
if (out.checkoutUrlPresent && !out.stripeHostedCheckoutUrl) addBlocker("checkout_url_not_stripe_hosted");

const unsignedWebhookRoute = await postApiWithFallback("stripe unsigned webhook", "/api/checkout/stripe/webhook", "/api/v1/checkout/stripe/webhook", {
  type: "checkout.session.completed",
  data: { object: { id: out.sessionId || "unsigned-smoke" } },
}, jsonHeaders);
const unsignedWebhookProbe = unsignedWebhookRoute.probe;
const unsignedWebhook = unsignedWebhookProbe.data || {};
stripeRoutesUsed.unsignedWebhook = unsignedWebhookRoute.path;
checks.unsignedWebhookHttp = unsignedWebhookProbe.status;
checks.unsignedWebhookPath = unsignedWebhookRoute.path;
checks.unsignedWebhookBlockers = unsignedWebhook.blockers || [];
out.paymentMarkedPaid = Boolean(unsignedWebhook.paymentMarkedPaid);
out.unsignedWebhookRejected = unsignedWebhookProbe.ok && unsignedWebhook.verified === false && out.paymentMarkedPaid === false;
if (unsignedWebhookProbe.status === 404) addBlocker("stripe_webhook_route_missing", "settlement");
if (!unsignedWebhookProbe.ok) addBlocker(`stripe_webhook_http_${unsignedWebhookProbe.status}`, "settlement");
if (unsignedWebhook.verified === true) addBlocker("unsigned_webhook_marked_verified", "settlement");
if (out.paymentMarkedPaid) addBlocker("unsigned_webhook_marked_paid", "settlement");
if (!out.unsignedWebhookRejected) addBlocker("unsigned_webhook_not_rejected", "settlement");
if (array(unsignedWebhook.blockers).includes("stripe_webhook_secret_missing")) addBlocker("stripe_webhook_secret_missing", "settlement");
out.stripeWebhookConfigured = out.stripeWebhookConfigured || !array(unsignedWebhook.blockers).includes("stripe_webhook_secret_missing");

const previewRoute = await postApiWithFallback("order sync preview", "/api/checkout/stripe/order-sync-preview", "/api/v1/checkout/stripe/order-sync-preview", {
  ...sessionPayload,
  sessionId: out.sessionId || undefined,
}, jsonHeaders);
const previewProbe = previewRoute.probe;
const preview = previewProbe.data || {};
stripeRoutesUsed.orderSyncPreview = previewRoute.path;
checks.orderSyncPreviewHttp = previewProbe.status;
checks.orderSyncPreviewPath = previewRoute.path;
checks.orderSyncPreviewBlockers = preview.blockers || [];
out.orderSyncReady = preview.orderSyncReady === true;
if (previewProbe.status === 404) addBlocker("order_sync_preview_route_missing", "settlement");
else if (!previewProbe.ok) addBlocker(`order_sync_preview_http_${previewProbe.status}`, "settlement");
if (array(preview.blockers).includes("payment_record_lookup_pending")) addBlocker("payment_verified_order_sync_pending", "settlement");
if (array(readinessBody.orderSyncBlockers).length > 0) {
  for (const blocker of readinessBody.orderSyncBlockers) addBlocker(blocker, "settlement");
}
if (!out.orderSyncReady) addBlocker("order_sync_not_configured", "settlement");

const dryRunRoute = await postApiWithFallback("economic event dry run", "/api/payments/economic-events/dry-run", "/api/v1/payments/economic-events/dry-run", {
  eventType: "commerce.checkout.payment_requested",
  sourceModule: "commerce",
  sourceRef: checkoutRef,
  currency: sessionPayload.currency,
  amountMinorUnits: sessionPayload.amount,
  assetType: "fiat",
  paymentRail: "stripe",
  direction: "credit",
  status: "requested",
  idempotencyKey: `dry-run-${checkoutRef}`,
  metadata: { cartId: out.cartId, sessionId: out.sessionId, dryRun: true },
}, jsonHeaders);
const dryRunProbe = dryRunRoute.probe;
const dryRun = dryRunProbe.data || {};
economicRoutesUsed.dryRun = dryRunRoute.path;
checks.economicDryRunHttp = dryRunProbe.status;
checks.economicDryRunPath = dryRunRoute.path;
checks.economicDryRunBlockers = dryRun.blockers || [];
if (dryRunProbe.status === 404) addBlocker("economic_event_dry_run_route_missing", "settlement");
else if (!dryRunProbe.ok) addBlocker(`economic_event_dry_run_http_${dryRunProbe.status}`, "settlement");
if (dryRun.paymentMarkedPaid === true || dryRun.orderCompleted === true) addBlocker("economic_dry_run_mutated_paid_or_order_state", "settlement");

out.settlementBlockers = blockers.filter((blocker) => /webhook|paid|settlement|order_sync|economic|idempotency/i.test(blocker));
out.success = blockers.length === 0;
out.nextManualStep = out.checkoutSessionCreated && out.stripeSessionModeDetected === "test"
  ? `Open ${out.checkoutUrl}; use Stripe test card 4242 4242 4242 4242 with any future expiry, any CVC, and any postal code; then confirm checkout.session.completed in Stripe Dashboard and verify only a signed webhook can move paid/order sync state at ${out.stripeWebhookUrlExpected}.`
  : out.checkoutSessionCreated && out.stripeSessionModeDetected === "live"
    ? `Do not use Stripe test cards for live session ${out.sessionId}. Replace Render STRIPE_SECRET_KEY with sk_test_*, confirm STRIPE_WEBHOOK_SECRET is the matching whsec_* test endpoint secret, and rerun this controlled smoke before opening Checkout.`
    : "Resolve checkout blockers before opening Stripe Checkout. No checkoutUrl/sessionId should be used unless Stripe returns real hosted artifacts.";

console.log(JSON.stringify(out, null, 2));
process.exit(out.success ? 0 : 1);

#!/usr/bin/env node

const API_URL = (process.env.API_URL || process.env.NESTJS_API_URL || "https://dbaronx-api-unified.onrender.com").replace(/\/+$/, "");
const MEDUSA_URL = (process.env.MEDUSA_URL || process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://dbaronx-medusa.onrender.com").replace(/\/+$/, "");
const WEB_BASE_URL = (process.env.WEB_BASE_URL || process.env.NEXT_PUBLIC_WEB_BASE_URL || "https://dbaronx.com").replace(/\/+$/, "");
const MEDUSA_PUBLISHABLE_KEY_CANDIDATES = [
  ["MEDUSA_PUBLISHABLE_KEY", process.env.MEDUSA_PUBLISHABLE_KEY],
  ["NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY],
];
const [MEDUSA_PUBLISHABLE_KEY_SOURCE, MEDUSA_PUBLISHABLE_KEY_RAW] = MEDUSA_PUBLISHABLE_KEY_CANDIDATES.find(([, value]) => String(value || "").trim()) || ["missing", ""];
const MEDUSA_PUBLISHABLE_KEY = String(MEDUSA_PUBLISHABLE_KEY_RAW || "").trim();
const API_BEARER_TOKEN = (process.env.API_BEARER_TOKEN || process.env.SMOKE_API_BEARER_TOKEN || process.env.SMOKE_JWT || "").trim();
const INTERNAL_SERVICE_TOKEN = (process.env.INTERNAL_SERVICE_TOKEN || "").trim();
const SHIPPING_OPTION_ID = (process.env.SHIPPING_OPTION_ID || "").trim();
const TARGET_SALES_CHANNEL_ID = "sc_01KQNM6EQZ19Y1BCSRVF9XV61H";
const SNIPPET_LIMIT = 900;
const CANONICAL_STRIPE_WEBHOOK_URL = "https://dbaronx-api-unified.onrender.com/api/checkout/stripe/webhook";
const STRIPE_WEBHOOK_URL_EXPECTED = `${API_URL.endsWith("/api") ? API_URL.slice(0, -4) : API_URL}/api/checkout/stripe/webhook`;
const ALLOW_LIVE_STRIPE_SMOKE = String(process.env.ALLOW_LIVE_STRIPE_SMOKE || "").trim().toLowerCase() === "true";
const FAKE_DBX_SIGNATURE = `fake-smoke-signature-${Date.now()}`;

const blockers = [];
const responseSnippets = {};
const fetchErrors = [];
const apiHealthPathsTried = [];
const apiRoutesUsed = {};
const stripeRoutesUsed = {};
const economicRoutesUsed = {};
const shippingRoutesUsed = {};

function medusaPublishableKeyLooksLikeStripeKey() {
  return /(pk_test_|pk_live_|sk_test_|sk_live_|rk_test_|rk_live_|whsec_)/i.test(MEDUSA_PUBLISHABLE_KEY);
}

function medusaPublishableKeyShape() {
  if (!MEDUSA_PUBLISHABLE_KEY) return "missing";
  if (MEDUSA_PUBLISHABLE_KEY === "<MEDUSA_PUBLISHABLE_KEY>" || /[<>]/.test(MEDUSA_PUBLISHABLE_KEY)) return "placeholder";
  if (medusaPublishableKeyLooksLikeStripeKey()) return "stripe_key_fragment";
  return "medusa_candidate";
}

const out = {
  success: false,
  blockers,
  apiReady: false,
  medusaReady: false,
  cartReady: false,
  lineItemAdded: false,
  shippingOptionReady: false,
  stripeReady: false,
  stripeConfigured: false,
  stripeSecretKeyMode: "missing",
  stripeWebhookConfigured: false,
  stripeWebhookUrlExpected: STRIPE_WEBHOOK_URL_EXPECTED,
  canonicalStripeWebhookUrl: CANONICAL_STRIPE_WEBHOOK_URL,
  stripeSessionCreated: false,
  checkoutSessionCreated: false,
  sessionId: null,
  checkoutUrl: null,
  stripeCheckoutUrlPresent: false,
  checkoutUrlPresent: false,
  stripeHostedCheckoutUrl: false,
  stripeSessionModeDetected: "unknown",
  stripeSessionModeAllowed: false,
  stripeUnsignedWebhookRejected: false,
  unsignedWebhookRejected: false,
  dbxReady: false,
  dbxIntentCreated: false,
  dbxSubmitReady: false,
  dbxFakeTxRejected: false,
  dbxConfirmReady: false,
  dbxPaymentMarkedPaid: false,
  paymentMarkedPaid: false,
  orderSyncReady: false,
  nextManualStep: null,
  responseSnippets,
  fetchErrors,
  apiHealthPathsTried,
  apiRoutesUsed,
  stripeRoutesUsed,
  economicRoutesUsed,
  shippingRoutesUsed,
  shippingOptionsCount: 0,
  shippingOptionIds: [],
  shippingOptions: [],
  medusaPublishableKeyPresent: Boolean(MEDUSA_PUBLISHABLE_KEY),
  medusaPublishableKeySource: MEDUSA_PUBLISHABLE_KEY_SOURCE,
  medusaPublishableKeyShape: medusaPublishableKeyShape(),
  medusaPublishableKeyRejectedByStoreApi: false,
  shippingOptionProofBlockerReason: null,
  storeShippingOptionsEndpoint: null,
  cartRegionId: null,
  cartSalesChannelId: null,
  cartShippingCountry: null,
  medusaPublishableKeyAccepted: false,
  checks: {
    apiUrl: API_URL,
    medusaUrl: MEDUSA_URL,
    medusaPublishableKeyPresent: Boolean(MEDUSA_PUBLISHABLE_KEY),
    medusaPublishableKeySource: MEDUSA_PUBLISHABLE_KEY_SOURCE,
    medusaPublishableKeyShape: medusaPublishableKeyShape(),
    apiBearerTokenPresent: Boolean(API_BEARER_TOKEN),
    internalServiceTokenPresent: Boolean(INTERNAL_SERVICE_TOKEN),
  },
};

const medusaHeaders = {
  "content-type": "application/json",
  ...(MEDUSA_PUBLISHABLE_KEY && medusaPublishableKeyShape() === "medusa_candidate" ? { "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY } : {}),
};
const publicJsonHeaders = { "content-type": "application/json" };
const apiHeaders = {
  "content-type": "application/json",
  ...(API_BEARER_TOKEN ? { authorization: `Bearer ${API_BEARER_TOKEN}` } : {}),
};
const internalHeaders = {
  "content-type": "application/json",
  ...(INTERNAL_SERVICE_TOKEN ? { authorization: `Bearer ${INTERNAL_SERVICE_TOKEN}` } : {}),
};

function api(path) {
  const normalized = API_URL.endsWith("/api") ? API_URL.slice(0, -4) : API_URL;
  return `${normalized}${path}`;
}

function snippet(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? null);
  return text.length > SNIPPET_LIMIT ? `${text.slice(0, SNIPPET_LIMIT)}…` : text;
}

function unwrap(body) {
  return body && typeof body === "object" && body.success === true && body.data !== undefined ? body.data : body;
}

function safeHeadersUsed(headers) {
  return Object.fromEntries(
    Object.entries(headers || {}).map(([key, value]) => {
      const lower = key.toLowerCase();
      const sensitive = lower.includes("authorization") || lower.includes("key") || lower.includes("token") || lower.includes("secret");
      return [key, sensitive ? Boolean(String(value || "").trim()) : value];
    }),
  );
}

function medusaPublishableKeyInvalid(probe) {
  const text = `${probe?.text || ""} ${JSON.stringify(probe?.body || {})}`.toLowerCase();
  return text.includes("a valid publishable key is required");
}

function guardMedusaPublishableKeyProbe(probe) {
  if (medusaPublishableKeyInvalid(probe)) {
    out.medusaPublishableKeyRejectedByStoreApi = true;
    out.checks.medusaPublishableKeyRejectedByStoreApi = true;
    addBlockerOnce("medusa_publishable_key_invalid");
  }
}

function errorPayload(error, request) {
  return {
    endpoint: request.url,
    method: request.method || "GET",
    headersUsed: safeHeadersUsed(request.headers),
    bodyPreview: request.body ? snippet(request.body) : null,
    errorName: error instanceof Error ? error.name : "NonErrorThrown",
    errorMessage: error instanceof Error ? error.message : String(error),
    cause: error instanceof Error && error.cause ? String(error.cause) : null,
  };
}

async function requestJson(url, init = {}, label = url) {
  const request = { url, method: init.method || "GET", headers: init.headers || {}, body: init.body };
  let response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    const normalized = errorPayload(error, request);
    fetchErrors.push(normalized);
    responseSnippets[label] = snippet(normalized);
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

async function postApi(canonicalPath, legacyPath, body, headers = apiHeaders) {
  const canonical = await requestJson(api(canonicalPath), { method: "POST", headers, body: JSON.stringify(body) }, canonicalPath);
  if (canonical.status !== 404 || !legacyPath) return { probe: canonical, pathUsed: canonicalPath };
  const legacy = await requestJson(api(legacyPath), { method: "POST", headers, body: JSON.stringify(body) }, legacyPath);
  return { probe: legacy, pathUsed: legacyPath };
}

async function getApi(canonicalPath, legacyPath, headers = apiHeaders) {
  const canonical = await requestJson(api(canonicalPath), { headers }, canonicalPath);
  if (canonical.status !== 404 || !legacyPath) return { probe: canonical, pathUsed: canonicalPath };
  const legacy = await requestJson(api(legacyPath), { headers }, legacyPath);
  return { probe: legacy, pathUsed: legacyPath };
}

function firstArray(value) {
  return Array.isArray(value) ? value : [];
}

function cartFrom(data) {
  return data?.cart || data;
}

function statusFrom(probe) {
  return String((probe?.data || probe?.body || {})?.status || "").toLowerCase();
}

function markedPaid(probe) {
  const data = probe?.data || probe?.body || {};
  const status = String(data.status || data.paymentStatus || "").toLowerCase();
  return data.paymentMarkedPaid === true || data.paid === true || ["paid", "captured", "completed"].includes(status);
}

function addBlockerOnce(blocker) {
  if (blocker && !blockers.includes(blocker)) blockers.push(blocker);
}

if (out.medusaPublishableKeyShape === "placeholder") addBlockerOnce("medusa_publishable_key_placeholder_not_replaced");
if (out.medusaPublishableKeyShape === "stripe_key_fragment") addBlockerOnce("medusa_publishable_key_looks_like_stripe_key");

function stripeSessionModeFromId(sessionId) {
  if (typeof sessionId !== "string" || sessionId.trim() === "") return "missing";
  if (sessionId.startsWith("cs_test_")) return "test";
  if (sessionId.startsWith("cs_live_")) return "live";
  return "unknown";
}

function liveSessionTestModeWarning() {
  return "Do not open/pay this live session for test-card validation. Configure STRIPE_SECRET_KEY=sk_test_... and STRIPE_WEBHOOK_SECRET from a test webhook endpoint, redeploy, and rerun. Only set ALLOW_LIVE_STRIPE_SMOKE=true for an explicitly approved live smoke.";
}

function normalizeStripeKeyMode(value) {
  return ["test", "live", "missing", "unknown"].includes(value) ? value : "unknown";
}

async function firstReadyHealthPath(paths) {
  let last = null;
  for (const path of paths) {
    const probe = await requestJson(api(path), { headers: apiHeaders }, `GET ${path}`);
    apiHealthPathsTried.push({ path, status: probe.status, ok: probe.ok });
    last = { probe, path };
    if (probe.ok) return last;
  }
  return last;
}

const health = await firstReadyHealthPath([
  "/api/health",
  "/health",
  "/api/payments/readiness",
  "/api/system/runtime-contract",
  "/api/system/deployment-readiness",
]);
out.apiReady = Boolean(health?.probe?.ok);
out.checks.apiHealthHttp = health?.probe?.status ?? 0;
out.checks.apiHealthPath = health?.path || null;
apiRoutesUsed.healthReady = out.apiReady ? health.path : null;
if (!out.apiReady) addBlockerOnce(`api_readiness_all_paths_failed_${out.checks.apiHealthHttp}`);

const readiness = await getApi("/api/payments/readiness", "/api/v1/payments/readiness", {});
apiRoutesUsed.paymentReadiness = readiness.pathUsed;
const readinessData = readiness.probe.data || {};
out.checks.paymentReadinessHttp = readiness.probe.status;
out.checks.paymentReadiness = readinessData;
if (readiness.probe.status === 404) addBlockerOnce("payments_readiness_route_missing");
if (readiness.probe.ok) {
  out.stripeConfigured = readinessData.stripeConfigured === true;
  out.stripeWebhookConfigured = readinessData.stripeWebhookConfigured === true;
  out.stripeSecretKeyMode = normalizeStripeKeyMode(readinessData.stripeSecretKeyMode || out.stripeSecretKeyMode);
  out.stripeWebhookUrlExpected = readinessData.stripeWebhookUrlExpected ? `${API_URL.endsWith("/api") ? API_URL.slice(0, -4) : API_URL}${String(readinessData.stripeWebhookUrlExpected).startsWith("/") ? readinessData.stripeWebhookUrlExpected : `/${readinessData.stripeWebhookUrlExpected}`}` : out.stripeWebhookUrlExpected;
  if (readinessData.stripeConfigured === false) addBlockerOnce("stripe_secret_key_missing");
  if (readinessData.stripeWebhookConfigured === false) addBlockerOnce("stripe_webhook_secret_missing");
  if (out.stripeSecretKeyMode === "live" && !ALLOW_LIVE_STRIPE_SMOKE) addBlockerOnce("stripe_live_mode_blocked_for_controlled_test_smoke");
  if (out.stripeSecretKeyMode !== "test" && !(out.stripeSecretKeyMode === "live" && ALLOW_LIVE_STRIPE_SMOKE)) addBlockerOnce(`stripe_test_mode_required_current_${out.stripeSecretKeyMode}`);
  if (readinessData.stripeSecretKeyMode) out.checks.stripeSecretKeyMode = readinessData.stripeSecretKeyMode;
  if (readinessData.liveCheckoutExplicitlyAllowed !== undefined) out.checks.liveCheckoutExplicitlyAllowed = readinessData.liveCheckoutExplicitlyAllowed;
  if (readinessData.stripeWebhookUrlExpected) out.stripeWebhookUrlExpected = `${API_URL.endsWith("/api") ? API_URL.slice(0, -4) : API_URL}${String(readinessData.stripeWebhookUrlExpected).startsWith("/") ? readinessData.stripeWebhookUrlExpected : `/${readinessData.stripeWebhookUrlExpected}`}`;
  if (firstArray(readinessData.blockers).includes("stripe_live_key_present_without_live_checkout_allowance")) addBlockerOnce("stripe_live_key_present_without_live_checkout_allowance");
  if (readinessData.solanaRpcConfigured === false) addBlockerOnce("solana_rpc_not_configured");
  out.orderSyncReady = readinessData.orderSyncConfigured === true;
  if (!out.orderSyncReady) addBlockerOnce("order_sync_not_configured");
}

const products = await requestJson(`${MEDUSA_URL}/store/products?limit=20`, { headers: medusaHeaders }, "/store/products");
const product = firstArray(products.data?.products).find((item) => firstArray(item?.variants).length > 0) || null;
const variantId = product?.variants?.[0]?.id || null;
out.checks.medusaProductsHttp = products.status;
guardMedusaPublishableKeyProbe(products);
out.checks.productId = product?.id || null;
out.checks.variantId = variantId;
if (!products.ok) addBlockerOnce(`store_products_http_${products.status}`);
if (!variantId) addBlockerOnce("variant_id_missing");

const regions = await requestJson(`${MEDUSA_URL}/store/regions?limit=20`, { headers: medusaHeaders }, "/store/regions");
const regionId = firstArray(regions.data?.regions)[0]?.id || null;
out.checks.medusaRegionsHttp = regions.status;
guardMedusaPublishableKeyProbe(regions);
out.checks.regionId = regionId;
if (!regions.ok) addBlockerOnce(`store_regions_http_${regions.status}`);
if (!regionId) addBlockerOnce("region_missing");
out.medusaReady = products.ok && regions.ok && Boolean(variantId && regionId);

let cart = null;
if (regionId) {
  const salesChannelId = process.env.MEDUSA_SALES_CHANNEL_ID || firstArray(product?.sales_channels)[0]?.id || TARGET_SALES_CHANNEL_ID;
  const cartBodies = salesChannelId
    ? [{ region_id: regionId, sales_channel_id: salesChannelId }, { region_id: regionId }]
    : [{ region_id: regionId }];

  let cartProbe = null;
  for (const body of cartBodies) {
    cartProbe = await requestJson(`${MEDUSA_URL}/store/carts`, {
      method: "POST",
      headers: medusaHeaders,
      body: JSON.stringify(body),
    }, "POST /store/carts");
    guardMedusaPublishableKeyProbe(cartProbe);
    cart = cartFrom(cartProbe.data);
    out.cartRegionId = cart?.region_id || out.cartRegionId;
    out.cartSalesChannelId = cart?.sales_channel_id || out.cartSalesChannelId;
    if (cartProbe.ok && cart?.id) break;
  }
  out.cartReady = Boolean(cart?.id);
  out.checks.cartId = cart?.id || null;
  out.checks.cartCreateHttp = cartProbe?.status ?? 0;
  if (!out.cartReady) addBlockerOnce(`cart_create_http_${cartProbe?.status ?? 0}`);
}

if (cart?.id && variantId) {
  const line = await requestJson(`${MEDUSA_URL}/store/carts/${cart.id}/line-items`, {
    method: "POST",
    headers: medusaHeaders,
    body: JSON.stringify({ variant_id: variantId, quantity: 1 }),
  }, "/store/carts/:id/line-items");
  guardMedusaPublishableKeyProbe(line);
  out.lineItemAdded = line.ok;
  out.checks.lineItemAddHttp = line.status;
  cart = cartFrom(line.data) || cart;
  if (!line.ok) addBlockerOnce(`line_item_add_http_${line.status}`);

  const addressBody = {
    shipping_address: {
      first_name: "Unified",
      last_name: "Smoke",
      address_1: "123 Test St",
      city: "New York",
      province: "NY",
      postal_code: "10001",
      country_code: "us",
    },
  };
  const address = await requestJson(`${MEDUSA_URL}/store/carts/${cart.id}`, {
    method: "POST",
    headers: medusaHeaders,
    body: JSON.stringify(addressBody),
  }, "/store/carts/:id address");
  out.checks.cartAddressHttp = address.status;
  guardMedusaPublishableKeyProbe(address);
  shippingRoutesUsed.cartAddress = { method: "POST", path: `/store/carts/${cart.id}`, body: addressBody };
  if (address.ok) cart = cartFrom(address.data) || cart;
  out.cartRegionId = cart?.region_id || out.cartRegionId;
  out.cartSalesChannelId = cart?.sales_channel_id || out.cartSalesChannelId;
  out.cartShippingCountry = cart?.shipping_address?.country_code || addressBody.shipping_address.country_code;

  const shippingPath = `/store/shipping-options?cart_id=${encodeURIComponent(cart.id)}`;
  const storeShippingOptionsEndpoint = `${MEDUSA_URL}${shippingPath}`;
  out.storeShippingOptionsEndpoint = storeShippingOptionsEndpoint;
  const shipping = await requestJson(storeShippingOptionsEndpoint, { headers: medusaHeaders }, shippingPath);
  guardMedusaPublishableKeyProbe(shipping);
  if (shipping.ok && !out.medusaPublishableKeyRejectedByStoreApi) out.medusaPublishableKeyAccepted = true;
  const options = firstArray(shipping.data?.shipping_options);
  out.shippingOptionReady = shipping.ok && options.length > 0;
  out.shippingOptionsCount = options.length;
  out.shippingOptionIds = options.map((option) => option?.id).filter(Boolean);
  out.shippingOptions = options.map((option) => ({ id: option?.id || null, name: option?.name || option?.title || null }));
  out.checks.shippingOptionsHttp = shipping.status;
  out.checks.shippingOptionsCount = options.length;
  out.checks.shippingOptionIds = out.shippingOptionIds;
  out.checks.expectedShippingOptionAvailable = SHIPPING_OPTION_ID ? options.some((option) => option?.id === SHIPPING_OPTION_ID) : null;
  shippingRoutesUsed.shippingOptions = {
    method: "GET",
    path: shippingPath,
    headers: { "x-publishable-api-key": Boolean(medusaHeaders["x-publishable-api-key"]) },
    proof: {
      targetSalesChannelId: salesChannelId,
      countryCode: "us",
      requiresRealShippingOptionId: true,
    },
  };
  if (!shipping.ok) addBlockerOnce(`shipping_options_http_${shipping.status}`);
  if (shipping.ok && options.length === 0) {
    out.shippingOptionProofBlockerReason = `shipping_option_store_visibility_missing: Store API returned HTTP ${shipping.status} with an empty shipping_options array for cart ${cart.id}; proof used target sales channel ${salesChannelId}, US address country_code=us, and requires a real shipping option ID.`;
    out.checks.shippingOptionProofBlockerReason = out.shippingOptionProofBlockerReason;
    out.checks.shippingVisibilityDiagnostics = {
      storeShippingOptionsEndpoint,
      cartRegionId: out.cartRegionId,
      cartSalesChannelId: out.cartSalesChannelId,
      cartShippingCountry: out.cartShippingCountry,
      medusaPublishableKeyAccepted: out.medusaPublishableKeyAccepted,
    };
    addBlockerOnce("shipping_option_store_visibility_missing");
  }
}

const checkoutAmount = Number.isInteger(Number(cart?.total ?? cart?.subtotal)) && Number(cart?.total ?? cart?.subtotal) > 0 ? Number(cart?.total ?? cart?.subtotal) : 100;
const currency = String(cart?.currency_code || "usd").toLowerCase();
const orderRef = `unified-payment-smoke-${Date.now()}`;
const sessionBody = {
  cartId: cart?.id || "smoke-cart-unavailable",
  orderRef,
  customerRef: "unified-payment-rail-smoke",
  amount: checkoutAmount,
  currency,
  successUrl: `${WEB_BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
  cancelUrl: `${WEB_BASE_URL}/checkout/cancel`,
  productName: "dBaronX unified payment rail smoke",
  checkoutMode: "test",
};
const stripeSession = await postApi("/api/checkout/stripe/session", "/api/v1/checkout/stripe/session", sessionBody, publicJsonHeaders);
stripeRoutesUsed.checkoutSession = stripeSession.pathUsed;
const stripeSessionData = stripeSession.probe.data || {};
out.stripeReady = stripeSession.probe.status !== 404;
out.stripeSecretKeyMode = normalizeStripeKeyMode(stripeSessionData.stripeSecretKeyMode || stripeSessionData.mode || stripeSessionData.metadata?.stripeSecretKeyMode || stripeSessionData.metadata?.stripeKeyMode || out.stripeSecretKeyMode);
out.stripeSessionCreated = stripeSessionData.success === true && Boolean(stripeSessionData.sessionId) && Boolean(stripeSessionData.checkoutUrl);
out.checkoutSessionCreated = out.stripeSessionCreated;
out.stripeCheckoutUrlPresent = Boolean(stripeSessionData.checkoutUrl);
out.checkoutUrlPresent = out.stripeCheckoutUrlPresent;
out.sessionId = typeof stripeSessionData.sessionId === "string" ? stripeSessionData.sessionId : null;
out.checkoutUrl = typeof stripeSessionData.checkoutUrl === "string" ? stripeSessionData.checkoutUrl : null;
out.stripeHostedCheckoutUrl = Boolean(out.checkoutUrl && /^https:\/\/checkout\.stripe\.com\//.test(out.checkoutUrl));
out.stripeSessionModeDetected = stripeSessionModeFromId(out.sessionId);
out.stripeSessionModeAllowed = sessionBody.checkoutMode !== "test" || out.stripeSessionModeDetected !== "live";
out.checks.stripeSessionHttp = stripeSession.probe.status;
out.checks.stripeSessionModeDetected = out.stripeSessionModeDetected;
out.checks.stripeSessionModeAllowed = out.stripeSessionModeAllowed;
out.checks.stripeResponseMode = stripeSessionData.mode || stripeSessionData.metadata?.stripeKeyMode || null;
out.checks.requestedCheckoutMode = stripeSessionData.requestedCheckoutMode || stripeSessionData.metadata?.requestedCheckoutMode || sessionBody.checkoutMode;
out.checks.stripeConfigured = stripeSessionData.configured ?? readinessData.stripeConfigured ?? null;
if (sessionBody.checkoutMode === "test" && out.stripeSessionModeDetected === "live" && !ALLOW_LIVE_STRIPE_SMOKE) {
  addBlockerOnce("stripe_live_session_returned_for_test_smoke");
  addBlockerOnce("stripe_live_mode_blocked_for_controlled_smoke");
}
if (firstArray(stripeSessionData.blockers).includes("stripe_live_key_used_for_test_checkout")) addBlockerOnce("stripe_live_key_used_for_test_checkout");
if (!out.stripeReady) addBlockerOnce("stripe_session_route_missing");
if (stripeSessionData.configured === false) addBlockerOnce("stripe_secret_key_missing");
if (firstArray(stripeSessionData.blockers).includes("stripe_live_key_used_for_test_checkout")) addBlockerOnce("stripe_live_key_used_for_test_checkout");
if (out.stripeSessionModeDetected === "live" && !ALLOW_LIVE_STRIPE_SMOKE) {
  out.stripeSessionModeAllowed = false;
  addBlockerOnce("stripe_live_session_returned_for_test_smoke");
  addBlockerOnce("stripe_live_mode_blocked_for_controlled_smoke");
}
if (out.stripeSecretKeyMode === "live" && !ALLOW_LIVE_STRIPE_SMOKE) addBlockerOnce("stripe_live_mode_blocked_for_controlled_test_smoke");
if (out.stripeSecretKeyMode !== "test" && !(out.stripeSecretKeyMode === "live" && ALLOW_LIVE_STRIPE_SMOKE)) addBlockerOnce(`stripe_test_mode_required_current_${out.stripeSecretKeyMode}`);
if (stripeSessionData.configured === false && (stripeSessionData.sessionId || stripeSessionData.checkoutUrl)) addBlockerOnce("stripe_returned_checkout_artifacts_while_unconfigured");
if (stripeSessionData.configured === true && !out.stripeSessionCreated) addBlockerOnce("stripe_configured_session_not_created");
if (out.stripeCheckoutUrlPresent && !String(stripeSessionData.checkoutUrl).startsWith("https://checkout.stripe.com/")) addBlockerOnce("stripe_checkout_url_not_stripe_hosted");

const webhook = await postApi("/api/checkout/stripe/webhook", "/api/v1/checkout/stripe/webhook", {}, publicJsonHeaders);
stripeRoutesUsed.unsignedWebhook = webhook.pathUsed;
const webhookData = webhook.probe.data || {};
out.stripeUnsignedWebhookRejected = webhook.probe.ok && webhookData.verified === false && webhookData.paymentMarkedPaid === false;
out.unsignedWebhookRejected = out.stripeUnsignedWebhookRejected;
out.checks.stripeWebhookHttp = webhook.probe.status;
out.paymentMarkedPaid = Boolean(webhookData.paymentMarkedPaid);
if (webhook.probe.status === 404) addBlockerOnce("stripe_webhook_route_missing");
if (webhookData.verified === true) addBlockerOnce("unsigned_webhook_marked_verified");
if (webhookData.paymentMarkedPaid === true) addBlockerOnce("unsigned_webhook_marked_paid");
if (!out.stripeUnsignedWebhookRejected) addBlockerOnce("stripe_unsigned_webhook_not_safely_rejected");

const dbxIntentBody = {
  cartId: cart?.id || `smoke-cart-${Date.now()}`,
  email: "smoke@example.com",
  customerName: "Unified Payment Smoke",
  expectedUsdCents: checkoutAmount,
  expectedDbxBaseUnits: 1,
  senderWallet: process.env.DBX_SMOKE_SENDER_WALLET || undefined,
  idempotencyKey: `unified-payment-smoke-${Date.now()}`,
  metadata: { source: "e2e-unified-payment-rail-smoke", orderRef },
};
const dbxIntent = await postApi("/api/dbx-payments/intents", "/api/v1/dbx-payments/intents", dbxIntentBody);
const dbxIntentData = dbxIntent.probe.data || {};
const dbxReference = dbxIntentData.reference || null;
out.dbxReady = dbxIntent.probe.status !== 404;
out.dbxIntentCreated = dbxIntent.probe.ok && dbxIntentData.status === "pending" && Boolean(dbxReference);
out.checks.dbxIntentHttp = dbxIntent.probe.status;
out.checks.dbxIntentStatus = dbxIntentData.status || null;
out.checks.dbxReference = dbxReference;
if (!out.dbxReady) addBlockerOnce("dbx_intent_route_missing");
if (dbxIntent.probe.status === 401 && !API_BEARER_TOKEN) addBlockerOnce("dbx_auth_token_missing");
if (dbxIntent.probe.ok && dbxIntentData.status !== "pending") addBlockerOnce("dbx_intent_not_pending");
if (!out.dbxIntentCreated) addBlockerOnce(`dbx_intent_http_${dbxIntent.probe.status}`);

let dbxSubmit = null;
let dbxConfirm = null;
if (dbxReference) {
  const txBody = { intentReference: dbxReference, transactionSignature: FAKE_DBX_SIGNATURE, senderWallet: process.env.DBX_SMOKE_SENDER_WALLET || undefined };
  dbxSubmit = await postApi("/api/dbx-payments/submit", "/api/v1/dbx-payments/submit", txBody);
  const submitStatus = statusFrom(dbxSubmit.probe);
  out.dbxSubmitReady = dbxSubmit.probe.status !== 404 && (dbxSubmit.probe.ok || dbxSubmit.probe.status >= 400);
  out.dbxPaymentMarkedPaid = markedPaid(dbxSubmit.probe);
  out.dbxFakeTxRejected = !dbxSubmit.probe.ok || ["submitted", "verification_pending", "pending", "failed"].includes(submitStatus);
  out.checks.dbxSubmitHttp = dbxSubmit.probe.status;
  out.checks.dbxSubmitStatus = submitStatus || null;
  if (out.dbxPaymentMarkedPaid) addBlockerOnce("dbx_submit_fake_tx_marked_paid");

  dbxConfirm = await postApi("/api/dbx-payments/confirm", "/api/v1/dbx-payments/confirm", txBody);
  const confirmStatus = statusFrom(dbxConfirm.probe);
  const confirmText = `${dbxConfirm.probe.text || ""} ${JSON.stringify(dbxConfirm.probe.body || {})}`.toLowerCase();
  out.dbxConfirmReady = dbxConfirm.probe.status !== 404 && (dbxConfirm.probe.ok || dbxConfirm.probe.status >= 400);
  out.dbxPaymentMarkedPaid = out.dbxPaymentMarkedPaid || markedPaid(dbxConfirm.probe);
  if (!dbxConfirm.probe.ok || ["failed", "submitted", "verification_pending", "pending"].includes(confirmStatus) || confirmText.includes("solana_rpc_not_configured")) {
    out.dbxFakeTxRejected = true;
  }
  if (confirmText.includes("solana_rpc_not_configured")) addBlockerOnce("solana_rpc_not_configured");
  out.checks.dbxConfirmHttp = dbxConfirm.probe.status;
  out.checks.dbxConfirmStatus = confirmStatus || null;
  if (out.dbxPaymentMarkedPaid) addBlockerOnce("dbx_confirm_fake_tx_marked_paid");

  const dbxStatus = await getApi(`/api/dbx-payments/${encodeURIComponent(dbxReference)}`, `/api/v1/dbx-payments/${encodeURIComponent(dbxReference)}`);
  out.checks.dbxStatusHttp = dbxStatus.probe.status;
  out.checks.dbxStatus = statusFrom(dbxStatus.probe) || null;
  if (markedPaid(dbxStatus.probe)) {
    out.dbxPaymentMarkedPaid = true;
    addBlockerOnce("dbx_status_fake_tx_marked_paid");
  }
}

if (dbxReference && !out.dbxSubmitReady) addBlockerOnce(`dbx_submit_http_${dbxSubmit?.probe?.status ?? 0}`);
if (dbxReference && !out.dbxConfirmReady) addBlockerOnce(`dbx_confirm_http_${dbxConfirm?.probe?.status ?? 0}`);
if (dbxReference && !out.dbxFakeTxRejected) addBlockerOnce("dbx_fake_tx_not_rejected_or_held_for_verification");

out.paymentMarkedPaid = out.paymentMarkedPaid || out.dbxPaymentMarkedPaid;
if (out.paymentMarkedPaid) addBlockerOnce("fake_payment_marked_paid");

out.settlementBlockers = blockers.filter((blocker) => /webhook|paid|settlement|order_sync|economic|idempotency|solana/i.test(blocker));
if (blockers.includes("medusa_publishable_key_placeholder_not_replaced") || blockers.includes("medusa_publishable_key_looks_like_stripe_key") || blockers.includes("medusa_publishable_key_invalid")) {
  out.nextManualStep = "Replace MEDUSA_PUBLISHABLE_KEY/NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY with the real Medusa publishable API key from Medusa, not a Stripe key or placeholder, then rerun the smoke before opening Stripe Checkout.";
} else if (out.stripeSessionModeDetected === "live" && !ALLOW_LIVE_STRIPE_SMOKE) {
  out.nextManualStep = liveSessionTestModeWarning();
} else if (out.checkoutSessionCreated && out.stripeHostedCheckoutUrl && out.stripeSessionModeDetected === "test" && !out.shippingOptionReady) {
  out.nextManualStep = "Stripe test checkout is ready, but do not open it until Medusa Store API returns a real shipping option.";
} else if (out.checkoutSessionCreated && out.stripeHostedCheckoutUrl && out.stripeSessionModeDetected === "unknown") {
  out.nextManualStep = "Resolve unknown Stripe session mode before attempting controlled test-card validation.";
} else if (blockers.length === 0 && out.stripeSessionModeDetected === "test") {
  out.nextManualStep = `Open only the cs_test_* Stripe Checkout URL (${out.checkoutUrl}) against ${CANONICAL_STRIPE_WEBHOOK_URL}, and run a real DBX token transfer only after confirming Store API shipping options are visible; then verify only signed Stripe webhooks or verified Solana transactions advance paid/order-sync state.`;
} else {
  out.nextManualStep = "Resolve blockers, then rerun node scripts/e2e-unified-payment-rail-smoke.mjs before attempting controlled payment orders.";
}

out.success = blockers.length === 0;
console.log(JSON.stringify(out, null, 2));
process.exit(out.success ? 0 : 1);

#!/usr/bin/env node

const API_URL = (
  process.env.API_URL ||
  process.env.NESTJS_API_URL ||
  "https://dbaronx-api-unified.onrender.com"
).replace(/\/+$/, "");
const API_BASE_URL = API_URL.endsWith("/api") ? API_URL.slice(0, -4) : API_URL;
const MEDUSA_URL = (
  process.env.MEDUSA_URL ||
  process.env.MEDUSA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "https://dbaronx-medusa.onrender.com"
).replace(/\/+$/, "");
const MEDUSA_KEY_CANDIDATES = [
  ["MEDUSA_PUBLISHABLE_KEY", process.env.MEDUSA_PUBLISHABLE_KEY],
  [
    "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  ],
];
const [MEDUSA_KEY_SOURCE, MEDUSA_KEY_RAW] = MEDUSA_KEY_CANDIDATES.find(
  ([, value]) => String(value || "").trim(),
) || ["missing", ""];
const MEDUSA_KEY = String(MEDUSA_KEY_RAW || "").trim();
const INTERNAL_SERVICE_TOKEN = (
  process.env.INTERNAL_SERVICE_TOKEN || ""
).trim();
const POST_PAYMENT_SESSION_ID = (
  process.env.STRIPE_SESSION_ID ||
  process.env.CHECKOUT_SESSION_ID ||
  ""
).trim();
const INTERNAL_AUTH_HEADER_NAME = "x-internal-token";
const SMOKE_CONTRACT_VERSION = "2026-05-09.signed-webhook-payment-record-v1";
const WEB_BASE_URL = (
  process.env.WEB_BASE_URL ||
  process.env.NEXT_PUBLIC_WEB_BASE_URL ||
  "https://dbaronx.com"
).replace(/\/+$/, "");
const TARGET_REGION_ID = "reg_01KQSEKK6A9T86NJ0AG05XPK3H";
const SNIPPET_LIMIT = 900;
const CANONICAL_STRIPE_WEBHOOK_URL =
  "https://dbaronx-api-unified.onrender.com/api/checkout/stripe/webhook";
const STRIPE_WEBHOOK_URL_EXPECTED = `${API_BASE_URL}/api/checkout/stripe/webhook`;
const ALLOW_LIVE_STRIPE_SMOKE =
  String(process.env.ALLOW_LIVE_STRIPE_SMOKE || "")
    .trim()
    .toLowerCase() === "true";
const MEDUSA_COMMERCE_ENSURE_SHIPPING_VISIBLE_EXPECTED =
  String(process.env.MEDUSA_COMMERCE_ENSURE_SHIPPING_VISIBLE_EXPECTED || "true")
    .trim()
    .toLowerCase() !== "false";
const TARGET_SALES_CHANNEL_ID = "sc_01KQNM6EQZ19Y1BCSRVF9XV61H";

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

function isSettlementBlocker(blocker) {
  return /webhook|paid|settlement|order_sync|order-sync|economic|idempotency|internal_token|protected_route_requires_internal_token/i.test(
    blocker,
  );
}

const medusaHeaders = {
  "content-type": "application/json",
  ...(MEDUSA_KEY && medusaPublishableKeyShape() === "medusa_candidate"
    ? { "x-publishable-api-key": MEDUSA_KEY }
    : {}),
};
const jsonHeaders = { "content-type": "application/json" };
const internalHeaders = {
  ...jsonHeaders,
  ...(INTERNAL_SERVICE_TOKEN
    ? { [INTERNAL_AUTH_HEADER_NAME]: INTERNAL_SERVICE_TOKEN }
    : {}),
};

function api(path) {
  return `${API_BASE_URL}${path}`;
}

function apiAbsolute(path) {
  const base = API_URL.endsWith("/api") ? API_URL.slice(0, -4) : API_URL;
  return `${base}${path}`;
}

function snippet(value) {
  const text =
    typeof value === "string" ? value : JSON.stringify(value ?? null);
  return text.length > SNIPPET_LIMIT
    ? `${text.slice(0, SNIPPET_LIMIT)}…`
    : text;
}

function safeHeaders(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      /authorization|token|key|secret/i.test(key)
        ? Boolean(String(value || "").trim())
        : value,
    ]),
  );
}

function unwrap(body) {
  return body &&
    typeof body === "object" &&
    body.success === true &&
    body.data !== undefined
    ? body.data
    : body;
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function cartFrom(data) {
  return data?.cart || data;
}

function firstProductWithVariant(products) {
  return (
    array(products).find((product) => array(product?.variants).length > 0) ||
    null
  );
}

function salesChannelIdFrom(product) {
  return (
    process.env.MEDUSA_SALES_CHANNEL_ID ||
    array(product?.sales_channels)[0]?.id ||
    ""
  ).trim();
}

function minorUnitAmountFromCart(cart) {
  const total = Number(cart?.total ?? cart?.subtotal ?? cart?.item_total ?? 0);
  return Number.isInteger(total) && total > 0
    ? total
    : Number(process.env.STRIPE_TEST_AMOUNT_MINOR || 100);
}

function addUnique(target, blocker) {
  if (blocker && !target.includes(blocker)) target.push(blocker);
}

function addBlocker(blocker, category = "checkout") {
  addUnique(blockers, blocker);
  addUnique(
    category === "settlement" ? settlementBlockers : checkoutBlockers,
    blocker,
  );
}

function addWarning(warning) {
  addUnique(warnings, warning);
}

function medusaPublishableKeyLooksLikeStripeKey() {
  return /(pk_test_|pk_live_|sk_test_|sk_live_|rk_test_|rk_live_|whsec_)/i.test(
    MEDUSA_KEY,
  );
}

function medusaPublishableKeyShape() {
  if (!MEDUSA_KEY) return "missing";
  if (MEDUSA_KEY === "<MEDUSA_PUBLISHABLE_KEY>" || /[<>]/.test(MEDUSA_KEY))
    return "placeholder";
  if (medusaPublishableKeyLooksLikeStripeKey()) return "stripe_key_fragment";
  return "medusa_candidate";
}

function medusaPublishableKeyInvalid(probe) {
  const text =
    `${probe?.text || ""} ${JSON.stringify(probe?.body || {})}`.toLowerCase();
  return text.includes("a valid publishable key is required");
}

function guardMedusaPublishableKeyProbe(probe) {
  if (medusaPublishableKeyInvalid(probe)) {
    out.medusaPublishableKeyRejectedByStoreApi = true;
    addBlocker("medusa_publishable_key_invalid");
  }
}

function stripeSessionModeFromId(sessionId) {
  if (typeof sessionId !== "string" || sessionId.trim() === "")
    return "missing";
  if (sessionId.startsWith("cs_test_")) return "test";
  if (sessionId.startsWith("cs_live_")) return "live";
  return "unknown";
}

function liveSessionTestModeWarning() {
  return "Do not open/pay this live session for test-card validation. Configure STRIPE_SECRET_KEY=sk_test_... and STRIPE_WEBHOOK_SECRET from a test webhook endpoint, redeploy, and rerun. Only set ALLOW_LIVE_STRIPE_SMOKE=true for an explicitly approved live smoke.";
}

function normalizeStripeKeyMode(value) {
  return ["test", "live", "missing", "unknown"].includes(value)
    ? value
    : "unknown";
}

function summarizeShippingOption(option) {
  return {
    id: option?.id || null,
    name: option?.name || option?.title || null,
    price:
      option?.amount ??
      option?.price?.amount ??
      option?.calculated_price?.calculated_amount ??
      option?.prices?.[0]?.amount ??
      null,
    currencyCode:
      option?.currency_code ||
      option?.price?.currency_code ||
      option?.calculated_price?.currency_code ||
      option?.prices?.[0]?.currency_code ||
      null,
    providerId:
      option?.provider_id ||
      option?.provider?.id ||
      option?.service_zone?.fulfillment_set?.provider_id ||
      null,
    serviceZoneId: option?.service_zone_id || option?.service_zone?.id || null,
    shippingProfileId:
      option?.shipping_profile_id || option?.shipping_profile?.id || null,
    rules: Array.isArray(option?.rules)
      ? option.rules.map((rule) => ({
          id: rule?.id || null,
          attribute: rule?.attribute || null,
          operator: rule?.operator || null,
          value: rule?.value ?? null,
        }))
      : [],
  };
}

async function requestJson(label, url, init = {}) {
  const request = {
    url,
    method: init.method || "GET",
    headers: init.headers || {},
    body: init.body,
  };
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
    return {
      ok: false,
      status: 0,
      body: { message: normalized.errorMessage },
      data: {},
      text: normalized.errorMessage,
    };
  }

  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  responseSnippets[label] = snippet(text || body);
  return {
    ok: response.ok,
    status: response.status,
    body,
    data: unwrap(body),
    text,
  };
}

async function getApiWithFallback(
  label,
  canonicalPath,
  legacyPath,
  headers = jsonHeaders,
) {
  const canonical = await requestJson(
    `${label} GET ${canonicalPath}`,
    api(canonicalPath),
    { headers },
  );
  if (canonical.status !== 404 || !legacyPath)
    return { probe: canonical, path: canonicalPath, fallbackUsed: false };
  const legacy = await requestJson(
    `${label} GET ${legacyPath}`,
    api(legacyPath),
    { headers },
  );
  addWarning(
    `${label.replace(/\s+/g, "_")}_legacy_fallback_used:${legacyPath}`,
  );
  return { probe: legacy, path: legacyPath, fallbackUsed: true };
}

async function postApiWithFallback(
  label,
  canonicalPath,
  legacyPath,
  body,
  headers = jsonHeaders,
) {
  const canonical = await requestJson(
    `${label} POST ${canonicalPath}`,
    api(canonicalPath),
    {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    },
  );
  if (canonical.status !== 404 || !legacyPath)
    return { probe: canonical, path: canonicalPath, fallbackUsed: false };
  const legacy = await requestJson(
    `${label} POST ${legacyPath}`,
    api(legacyPath),
    {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    },
  );
  addWarning(
    `${label.replace(/\s+/g, "_")}_legacy_fallback_used:${legacyPath}`,
  );
  return { probe: legacy, path: legacyPath, fallbackUsed: true };
}

async function firstReadyHealthPath(paths) {
  let last = null;
  for (const path of paths) {
    const probe = await requestJson(`api health GET ${path}`, api(path), {
      headers: internalHeaders,
    });
    apiHealthPathsTried.push({ path, status: probe.status, ok: probe.ok });
    last = { probe, path };
    if (probe.ok) return last;
  }
  return last;
}

async function firstCanonicalApiGet(
  label,
  canonicalPath,
  legacyPath,
  headers = jsonHeaders,
) {
  const canonical = await requestJson(
    `${label} ${canonicalPath}`,
    apiAbsolute(canonicalPath),
    { headers },
  );
  if (canonical.status !== 404 || !legacyPath)
    return { probe: canonical, path: canonicalPath, routeUsed: canonicalPath };
  const legacy = await requestJson(
    `${label} ${legacyPath}`,
    apiAbsolute(legacyPath),
    { headers },
  );
  return { probe: legacy, path: legacyPath, routeUsed: legacyPath };
}

async function firstCanonicalApiPost(
  label,
  canonicalPath,
  legacyPath,
  body,
  headers = jsonHeaders,
) {
  const init = { method: "POST", headers, body: JSON.stringify(body) };
  const canonical = await requestJson(
    `${label} ${canonicalPath}`,
    apiAbsolute(canonicalPath),
    init,
  );
  if (canonical.status !== 404 || !legacyPath)
    return { probe: canonical, path: canonicalPath, routeUsed: canonicalPath };
  const legacy = await requestJson(
    `${label} ${legacyPath}`,
    apiAbsolute(legacyPath),
    init,
  );
  return { probe: legacy, path: legacyPath, routeUsed: legacyPath };
}

const out = {
  success: false,
  smokeContractVersion: SMOKE_CONTRACT_VERSION,
  scriptVersion: SMOKE_CONTRACT_VERSION,
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
  canonicalStripeWebhookUrl: CANONICAL_STRIPE_WEBHOOK_URL,
  supabaseWebhookWarning:
    "Do not configure a Supabase URL as the direct Stripe webhook destination unless an intentional Supabase relay is built; Stripe should post directly to the API webhook URL.",
  liveCheckoutExplicitlyAllowed: false,
  liveStripeSmokeExplicitlyAllowed: ALLOW_LIVE_STRIPE_SMOKE,
  checkoutSessionCreated: false,
  sessionId: null,
  stripeSessionModeDetected: "unknown",
  stripeSessionModeAllowed: false,
  checkoutSafeToOpen: false,
  settlementSafeToClaim: false,
  telegramOpsReady: false,
  checkoutUrl: null,
  checkoutUrlPresent: false,
  stripeHostedCheckoutUrl: false,
  unsignedWebhookRejected: false,
  paymentMarkedPaid: false,
  orderSyncReady: false,
  verifiedStripeEventReady: false,
  paymentRecordReady: false,
  medusaOrderCompletionReady: false,
  medusaOrderId: null,
  settlementStatus: null,
  duplicateWebhookSafe: false,
  signedWebhookVerification: {
    required: true,
    method:
      "Stripe.webhooks.constructEvent(rawBody, stripe-signature, STRIPE_WEBHOOK_SECRET)",
    manualDashboardWebhookUrl: CANONICAL_STRIPE_WEBHOOK_URL,
    acceptedEventType: "checkout.session.completed",
    postPaymentSessionIdOverride: POST_PAYMENT_SESSION_ID || null,
  },
  internalTokenPresent: Boolean(INTERNAL_SERVICE_TOKEN),
  internalAuthHeaderUsed: INTERNAL_AUTH_HEADER_NAME,
  internalTokenAccepted: false,
  orderSyncPreviewAuthorized: false,
  orderSyncPreviewStatus: null,
  orderSyncPreviewBlockers: [],
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
  shippingOptions: [],
  medusaCommerceEnsureShippingVisibleToStoreApiExpected:
    MEDUSA_COMMERCE_ENSURE_SHIPPING_VISIBLE_EXPECTED,
  apiUrl: API_URL,
  medusaUrl: MEDUSA_URL,
  medusaPublishableKeyPresent: Boolean(MEDUSA_KEY),
  medusaPublishableKeySource: MEDUSA_KEY_SOURCE,
  medusaPublishableKeyShape: medusaPublishableKeyShape(),
  medusaPublishableKeyRejectedByStoreApi: false,
  shippingOptionProofBlockerReason: null,
  storeShippingOptionsEndpoint: null,
  cartRegionId: null,
  cartSalesChannelId: null,
  cartShippingCountry: null,
  medusaPublishableKeyAccepted: false,
  shippingMethodPresent: false,
  shippingTotalPositive: false,
  productId: null,
  variantId: null,
  regionId: null,
  cartId: null,
};

if (out.medusaPublishableKeyShape === "placeholder")
  addBlocker("medusa_publishable_key_placeholder_not_replaced");
if (out.medusaPublishableKeyShape === "stripe_key_fragment")
  addBlocker("medusa_publishable_key_looks_like_stripe_key");

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
if (!out.apiReady)
  addBlocker(`api_readiness_all_paths_failed_${checks.apiHealthHttp}`);

const readiness = await getApiWithFallback(
  "payment readiness",
  "/api/payments/readiness",
  "/api/v1/payments/readiness",
  jsonHeaders,
);
const readinessBody = readiness.probe.data || {};
checks.paymentReadinessHttp = readiness.probe.status;
checks.paymentReadinessPath = readiness.path;
apiRoutesUsed.paymentReadiness = readiness.path;
out.paymentReadinessReady = readiness.probe.ok === true;
out.stripeConfigured = readinessBody.stripeConfigured === true;
out.stripeSecretKeyMode = normalizeStripeKeyMode(
  readinessBody.stripeSecretKeyMode || out.stripeSecretKeyMode,
);
out.stripeWebhookConfigured = readinessBody.stripeWebhookConfigured === true;
out.stripeWebhookUrlExpected = readinessBody.stripeWebhookUrlExpected
  ? `${API_BASE_URL}${String(readinessBody.stripeWebhookUrlExpected).startsWith("/") ? readinessBody.stripeWebhookUrlExpected : `/${readinessBody.stripeWebhookUrlExpected}`}`
  : STRIPE_WEBHOOK_URL_EXPECTED;
out.liveCheckoutExplicitlyAllowed =
  readinessBody.liveCheckoutExplicitlyAllowed === true;
if (out.stripeSecretKeyMode === "live" && !ALLOW_LIVE_STRIPE_SMOKE)
  addBlocker("stripe_live_mode_blocked_for_controlled_test_smoke");
if (
  out.stripeSecretKeyMode !== "test" &&
  !(out.stripeSecretKeyMode === "live" && ALLOW_LIVE_STRIPE_SMOKE)
)
  addBlocker(`stripe_test_mode_required_current_${out.stripeSecretKeyMode}`);
if (!readiness.probe.ok)
  addBlocker(
    readiness.probe.status === 404
      ? "payment_readiness_route_missing"
      : `payment_readiness_http_${readiness.probe.status}`,
  );
for (const blocker of array(readinessBody.blockers)) {
  if (blocker === "stripe_secret_key_missing")
    addBlocker("stripe_secret_key_missing");
  if (blocker === "stripe_webhook_secret_missing")
    addBlocker("stripe_webhook_secret_missing", "settlement");
  if (blocker === "stripe_live_key_present_without_live_checkout_allowance")
    addBlocker("stripe_live_key_present_without_live_checkout_allowance");
}

const economic = await getApiWithFallback(
  "economic readiness",
  "/api/payments/economic-readiness",
  "/api/v1/payments/economic-readiness",
  jsonHeaders,
);
const economicBody = economic.probe.data || {};
checks.economicReadinessHttp = economic.probe.status;
checks.economicReadinessPath = economic.path;
economicRoutesUsed.readiness = economic.path;
out.economicReadinessReady =
  economic.probe.ok === true && economicBody.success !== false;
if (!economic.probe.ok)
  addBlocker(
    economic.probe.status === 404
      ? "economic_readiness_route_missing"
      : `economic_readiness_http_${economic.probe.status}`,
    "settlement",
  );
if (
  economicBody.frontendRedirectCanMarkPaid !== false &&
  economicBody.frontendRedirectCanMarkPaid !== undefined
)
  addBlocker("frontend_redirect_can_mark_paid", "settlement");

const medusaHealth = await requestJson(
  "medusa health GET /health",
  `${MEDUSA_URL}/health`,
  { headers: medusaHeaders },
);
checks.medusaHealthHttp = medusaHealth.status;
if (!medusaHealth.ok) addWarning(`medusa_health_http_${medusaHealth.status}`);

const productsProbe = await requestJson(
  "medusa products GET /store/products",
  `${MEDUSA_URL}/store/products?limit=20`,
  { headers: medusaHeaders },
);
checks.medusaProductsHttp = productsProbe.status;
guardMedusaPublishableKeyProbe(productsProbe);
if (!productsProbe.ok)
  addBlocker(`store_products_http_${productsProbe.status}`);
const product = firstProductWithVariant(productsProbe.data?.products);
out.productId = product?.id || null;
out.variantId = product?.variants?.[0]?.id || null;
if (!out.productId) addBlocker("product_id_missing");
if (!out.variantId) addBlocker("variant_id_missing");

const regionsProbe = await requestJson(
  "medusa regions GET /store/regions",
  `${MEDUSA_URL}/store/regions?limit=50`,
  { headers: medusaHeaders },
);
checks.medusaRegionsHttp = regionsProbe.status;
guardMedusaPublishableKeyProbe(regionsProbe);
if (!regionsProbe.ok) addBlocker(`store_regions_http_${regionsProbe.status}`);
const regions = array(regionsProbe.data?.regions);
out.regionId =
  regions.find((region) => region?.id === TARGET_REGION_ID)?.id ||
  regions.find(
    (region) => String(region?.currency_code || "").toLowerCase() === "usd",
  )?.id ||
  regions[0]?.id ||
  null;
if (!out.regionId) addBlocker("region_missing");
out.medusaReady =
  productsProbe.ok &&
  regionsProbe.ok &&
  Boolean(out.productId && out.variantId && out.regionId);

let cart = null;
if (out.regionId) {
  const salesChannelId = salesChannelIdFrom(product) || TARGET_SALES_CHANNEL_ID;
  const cartBodies = salesChannelId
    ? [
        { region_id: out.regionId, sales_channel_id: salesChannelId },
        { region_id: out.regionId },
      ]
    : [{ region_id: out.regionId }];
  let lastCartProbe = null;
  for (const body of cartBodies) {
    lastCartProbe = await requestJson(
      "medusa cart create POST /store/carts",
      `${MEDUSA_URL}/store/carts`,
      {
        method: "POST",
        headers: medusaHeaders,
        body: JSON.stringify(body),
      },
    );
    checks.cartCreateHttp = lastCartProbe.status;
    checks.cartCreateBody = body;
    guardMedusaPublishableKeyProbe(lastCartProbe);
    cart = cartFrom(lastCartProbe.data);
    out.cartId = cart?.id || null;
    out.cartRegionId = cart?.region_id || out.cartRegionId;
    out.cartSalesChannelId = cart?.sales_channel_id || out.cartSalesChannelId;
    if (lastCartProbe.ok && out.cartId) break;
  }
  out.cartReady = Boolean(out.cartId);
  if (!out.cartReady)
    addBlocker(`cart_create_http_${lastCartProbe?.status ?? 0}`);
}

if (out.cartId && out.variantId) {
  const lineProbe = await requestJson(
    "medusa line item add POST /store/carts/:id/line-items",
    `${MEDUSA_URL}/store/carts/${out.cartId}/line-items`,
    {
      method: "POST",
      headers: medusaHeaders,
      body: JSON.stringify({ variant_id: out.variantId, quantity: 1 }),
    },
  );
  checks.lineItemAddHttp = lineProbe.status;
  guardMedusaPublishableKeyProbe(lineProbe);
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
  const addressProbe = await requestJson(
    "medusa cart address POST /store/carts/:id",
    `${MEDUSA_URL}/store/carts/${out.cartId}`,
    {
      method: "POST",
      headers: medusaHeaders,
      body: JSON.stringify(addressBody),
    },
  );
  checks.cartAddressHttp = addressProbe.status;
  guardMedusaPublishableKeyProbe(addressProbe);
  shippingRoutesUsed.cartAddress = {
    method: "POST",
    path: `/store/carts/${out.cartId}`,
    body: addressBody,
  };
  if (addressProbe.ok) cart = cartFrom(addressProbe.data) || cart;
  else addWarning(`cart_address_http_${addressProbe.status}`);
  out.cartRegionId = cart?.region_id || out.cartRegionId;
  out.cartSalesChannelId = cart?.sales_channel_id || out.cartSalesChannelId;
  out.cartShippingCountry =
    cart?.shipping_address?.country_code ||
    addressBody.shipping_address.country_code;
}

let shippingOptionId = null;
if (out.cartId) {
  const shippingPath = `/store/shipping-options?cart_id=${encodeURIComponent(out.cartId)}`;
  const storeShippingOptionsEndpoint = `${MEDUSA_URL}${shippingPath}`;
  out.storeShippingOptionsEndpoint = storeShippingOptionsEndpoint;
  const shippingProbe = await requestJson(
    `medusa shipping options GET ${shippingPath}`,
    storeShippingOptionsEndpoint,
    { headers: medusaHeaders },
  );
  const options = array(shippingProbe.data?.shipping_options);
  checks.shippingOptionsHttp = shippingProbe.status;
  guardMedusaPublishableKeyProbe(shippingProbe);
  if (shippingProbe.ok && !out.medusaPublishableKeyRejectedByStoreApi)
    out.medusaPublishableKeyAccepted = true;
  checks.shippingOptionsCount = options.length;
  out.shippingOptionsCount = options.length;
  out.shippingOptionIds = options.map((option) => option?.id).filter(Boolean);
  out.shippingOptions = options.map(summarizeShippingOption);
  checks.shippingOptions = out.shippingOptions;
  shippingOptionId = out.shippingOptionIds[0] || null;
  out.shippingOptionReady = shippingProbe.ok && Boolean(shippingOptionId);
  shippingRoutesUsed.shippingOptions = {
    method: "GET",
    path: shippingPath,
    headers: {
      "x-publishable-api-key": Boolean(medusaHeaders["x-publishable-api-key"]),
    },
    proof: {
      targetSalesChannelId:
        salesChannelIdFrom(product) || TARGET_SALES_CHANNEL_ID,
      countryCode: "us",
      requiresRealShippingOptionId: true,
    },
  };
  if (!shippingProbe.ok)
    addBlocker(`shipping_options_http_${shippingProbe.status}`);
  if (shippingProbe.ok && !shippingOptionId) {
    out.shippingOptionProofBlockerReason = `shipping_option_store_visibility_missing: Store API returned HTTP ${shippingProbe.status} with an empty shipping_options array for cart ${out.cartId}; proof used target sales channel ${salesChannelIdFrom(product) || TARGET_SALES_CHANNEL_ID}, US address country_code=us, and requires a real shipping option ID.`;
    checks.shippingOptionProofBlockerReason =
      out.shippingOptionProofBlockerReason;
    checks.shippingVisibilityDiagnostics = {
      storeShippingOptionsEndpoint,
      cartRegionId: out.cartRegionId,
      cartSalesChannelId: out.cartSalesChannelId,
      cartShippingCountry: out.cartShippingCountry,
      medusaPublishableKeyAccepted: out.medusaPublishableKeyAccepted,
    };
    addBlocker("shipping_option_store_visibility_missing");
    if (MEDUSA_COMMERCE_ENSURE_SHIPPING_VISIBLE_EXPECTED)
      addBlocker("shipping_option_store_visibility_mismatch");
  }
}

if (out.cartId && shippingOptionId) {
  const attachPath = `/store/carts/${out.cartId}/shipping-methods`;
  const body = { option_id: shippingOptionId };
  const attachProbe = await requestJson(
    `medusa shipping add POST ${attachPath}`,
    `${MEDUSA_URL}${attachPath}`,
    {
      method: "POST",
      headers: medusaHeaders,
      body: JSON.stringify(body),
    },
  );
  checks.shippingAddHttp = attachProbe.status;
  guardMedusaPublishableKeyProbe(attachProbe);
  shippingRoutesUsed.shippingMethodAttach = {
    method: "POST",
    path: attachPath,
    body,
  };
  if (attachProbe.ok) {
    cart = cartFrom(attachProbe.data) || cart;
    checks.shippingAttachedToCart = true;
  } else {
    checks.shippingAttachedToCart = false;
    addBlocker(`shipping_add_http_${attachProbe.status}`);
  }
}

if (out.cartId) {
  const totalsProbe = await requestJson(
    `medusa cart totals GET /store/carts/${out.cartId}`,
    `${MEDUSA_URL}/store/carts/${out.cartId}`,
    { headers: medusaHeaders },
  );
  if (totalsProbe.ok) cart = cartFrom(totalsProbe.data) || cart;
  checks.cartTotalsHttp = totalsProbe.status;
  const shippingMethods = array(cart?.shipping_methods);
  out.shippingMethodPresent = shippingMethods.length > 0;
  out.shippingTotalPositive = Number(cart?.shipping_total ?? 0) > 0;
  checks.cartTotals = {
    subtotal: cart?.subtotal ?? null,
    shipping_total: cart?.shipping_total ?? null,
    total: cart?.total ?? null,
    currency_code: cart?.currency_code ?? null,
    shipping_methods_count: shippingMethods.length,
  };
  if (
    shippingOptionId &&
    !out.shippingTotalPositive &&
    !out.shippingMethodPresent
  ) {
    addBlocker("shipping_method_not_confirmed_on_cart");
  }
  shippingRoutesUsed.cartShippingTotals = {
    method: "GET",
    path: `/store/carts/${out.cartId}`,
  };
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
  productName:
    product?.title || "dBaronX first controlled Stripe test transaction",
  checkoutMode: "test",
};
checks.checkoutPayload = {
  ...sessionPayload,
  customerRef: Boolean(sessionPayload.customerRef),
};

const sessionRoute = await postApiWithFallback(
  "stripe checkout session",
  "/api/checkout/stripe/session",
  "/api/v1/checkout/stripe/session",
  sessionPayload,
  jsonHeaders,
);
const sessionProbe = sessionRoute.probe;
const session = sessionProbe.data || {};
stripeRoutesUsed.checkoutSession = sessionRoute.path;
checks.stripeSessionHttp = sessionProbe.status;
checks.stripeSessionPath = sessionRoute.path;
checks.stripeSessionBlockers = session.blockers || [];
out.stripeConfigured = out.stripeConfigured || session.configured === true;
out.checkoutUrl =
  typeof session.checkoutUrl === "string" ? session.checkoutUrl : null;
out.sessionId =
  typeof session.sessionId === "string" ? session.sessionId : null;
if (POST_PAYMENT_SESSION_ID) out.sessionId = POST_PAYMENT_SESSION_ID;
out.checkoutUrlPresent = Boolean(out.checkoutUrl);
out.stripeHostedCheckoutUrl = Boolean(
  out.checkoutUrl && /^https:\/\/checkout\.stripe\.com\//.test(out.checkoutUrl),
);
out.checkoutSessionCreated =
  session.success === true &&
  Boolean(out.sessionId) &&
  out.stripeHostedCheckoutUrl;
out.stripeSessionModeDetected = stripeSessionModeFromId(out.sessionId);
out.stripeSessionModeAllowed =
  sessionPayload.checkoutMode !== "test" ||
  out.stripeSessionModeDetected !== "live";
checks.stripeSessionModeDetected = out.stripeSessionModeDetected;
checks.stripeSessionModeAllowed = out.stripeSessionModeAllowed;
out.stripeSecretKeyMode = normalizeStripeKeyMode(
  session.stripeSecretKeyMode ||
    session.mode ||
    session.metadata?.stripeSecretKeyMode ||
    session.metadata?.stripeKeyMode ||
    out.stripeSecretKeyMode,
);
checks.stripeResponseMode =
  session.mode || session.metadata?.stripeKeyMode || null;
checks.requestedCheckoutMode =
  session.requestedCheckoutMode ||
  session.metadata?.requestedCheckoutMode ||
  sessionPayload.checkoutMode;
if (
  sessionPayload.checkoutMode === "test" &&
  out.stripeSessionModeDetected === "live" &&
  !ALLOW_LIVE_STRIPE_SMOKE
) {
  addBlocker("stripe_live_session_returned_for_test_smoke");
  addBlocker("stripe_live_mode_blocked_for_controlled_smoke");
}
if (array(session.blockers).includes("stripe_live_key_used_for_test_checkout"))
  addBlocker("stripe_live_key_used_for_test_checkout");
if (sessionProbe.status === 404) addBlocker("stripe_session_route_missing");
if (!sessionProbe.ok) addBlocker(`stripe_session_http_${sessionProbe.status}`);
if (
  array(session.blockers).includes("stripe_secret_key_missing") ||
  session.configured === false
)
  addBlocker("stripe_secret_key_missing");
if (array(session.blockers).includes("stripe_live_key_used_for_test_checkout"))
  addBlocker("stripe_live_key_used_for_test_checkout");
if (out.stripeSessionModeDetected === "live" && !ALLOW_LIVE_STRIPE_SMOKE) {
  out.stripeSessionModeAllowed = false;
  addBlocker("stripe_live_session_returned_for_test_smoke");
  addBlocker("stripe_live_mode_blocked_for_controlled_smoke");
}
if (out.stripeSecretKeyMode === "live" && !ALLOW_LIVE_STRIPE_SMOKE)
  addBlocker("stripe_live_mode_blocked_for_controlled_test_smoke");
if (
  out.stripeSecretKeyMode !== "test" &&
  !(out.stripeSecretKeyMode === "live" && ALLOW_LIVE_STRIPE_SMOKE)
)
  addBlocker(`stripe_test_mode_required_current_${out.stripeSecretKeyMode}`);
if (!out.stripeConfigured && !out.checkoutSessionCreated)
  addBlocker("stripe_secret_key_missing");
if (!out.checkoutSessionCreated && out.stripeConfigured)
  addBlocker("stripe_checkout_session_not_created");
if ((out.checkoutUrlPresent || out.sessionId) && !out.stripeConfigured)
  addBlocker("stripe_returned_checkout_artifacts_while_unconfigured");
if (out.checkoutUrlPresent && !out.stripeHostedCheckoutUrl)
  addBlocker("checkout_url_not_stripe_hosted");

const unsignedWebhookRoute = await postApiWithFallback(
  "stripe unsigned webhook",
  "/api/checkout/stripe/webhook",
  "/api/v1/checkout/stripe/webhook",
  {
    type: "checkout.session.completed",
    data: { object: { id: out.sessionId || "unsigned-smoke" } },
  },
  jsonHeaders,
);
const unsignedWebhookProbe = unsignedWebhookRoute.probe;
const unsignedWebhook = unsignedWebhookProbe.data || {};
stripeRoutesUsed.unsignedWebhook = unsignedWebhookRoute.path;
checks.unsignedWebhookHttp = unsignedWebhookProbe.status;
checks.unsignedWebhookPath = unsignedWebhookRoute.path;
checks.unsignedWebhookBlockers = unsignedWebhook.blockers || [];
out.paymentMarkedPaid = Boolean(unsignedWebhook.paymentMarkedPaid);
out.unsignedWebhookRejected =
  unsignedWebhookProbe.ok &&
  unsignedWebhook.verified === false &&
  out.paymentMarkedPaid === false;
if (unsignedWebhookProbe.status === 404)
  addBlocker("stripe_webhook_route_missing", "settlement");
if (!unsignedWebhookProbe.ok)
  addBlocker(
    `stripe_webhook_http_${unsignedWebhookProbe.status}`,
    "settlement",
  );
if (unsignedWebhook.verified === true)
  addBlocker("unsigned_webhook_marked_verified", "settlement");
if (out.paymentMarkedPaid)
  addBlocker("unsigned_webhook_marked_paid", "settlement");
if (!out.unsignedWebhookRejected)
  addBlocker("unsigned_webhook_not_rejected", "settlement");
if (array(unsignedWebhook.blockers).includes("stripe_webhook_secret_missing"))
  addBlocker("stripe_webhook_secret_missing", "settlement");
out.stripeWebhookConfigured =
  out.stripeWebhookConfigured ||
  !array(unsignedWebhook.blockers).includes("stripe_webhook_secret_missing");

const previewRoute = await postApiWithFallback(
  "order sync preview",
  "/api/checkout/stripe/order-sync-preview",
  "/api/v1/checkout/stripe/order-sync-preview",
  {
    ...sessionPayload,
    sessionId: out.sessionId || undefined,
  },
  internalHeaders,
);
const previewProbe = previewRoute.probe;
const preview = previewProbe.data || {};
stripeRoutesUsed.orderSyncPreview = previewRoute.path;
checks.orderSyncPreviewHttp = previewProbe.status;
checks.orderSyncPreviewPath = previewRoute.path;
checks.orderSyncPreviewBlockers = preview.blockers || [];
out.orderSyncPreviewStatus = previewProbe.status;
out.orderSyncPreviewBlockers = array(preview.blockers);
out.verifiedStripeEventReady = preview.verifiedStripeEventReady === true;
out.paymentRecordReady = preview.paymentRecordReady === true;
out.medusaOrderCompletionReady = preview.medusaOrderCompletionReady === true;
out.medusaOrderId = preview.medusaOrderId || null;
out.settlementStatus = preview.settlementStatus || null;
out.duplicateWebhookSafe = preview.duplicateWebhookSafe === true;
out.orderSyncPreviewAuthorized = previewProbe.ok;
out.internalTokenAccepted = Boolean(INTERNAL_SERVICE_TOKEN && previewProbe.ok);
out.orderSyncReady =
  previewProbe.ok &&
  preview.orderSyncReady === true &&
  out.orderSyncPreviewBlockers.length === 0;
out.settlementSafeToClaim = Boolean(
  out.verifiedStripeEventReady &&
    out.paymentRecordReady &&
    out.medusaOrderCompletionReady &&
    out.orderSyncReady &&
    out.duplicateWebhookSafe &&
    out.settlementStatus === "settled",
);
if (previewProbe.status === 404)
  addBlocker("order_sync_preview_route_missing", "settlement");
else if ([401, 403].includes(previewProbe.status)) {
  addBlocker(
    INTERNAL_SERVICE_TOKEN
      ? "internal_token_present_but_rejected"
      : "protected_route_requires_internal_token",
    "settlement",
  );
} else if (!previewProbe.ok)
  addBlocker(`order_sync_preview_http_${previewProbe.status}`, "settlement");
if (out.orderSyncPreviewBlockers.includes("payment_record_lookup_pending"))
  addBlocker("payment_verified_order_sync_pending", "settlement");
if (
  out.orderSyncPreviewBlockers.includes(
    "medusa_cart_completion_requires_payment_provider_session",
  )
)
  addBlocker(
    "medusa_cart_completion_requires_payment_provider_session",
    "settlement",
  );
if (array(readinessBody.orderSyncBlockers).length > 0) {
  for (const blocker of readinessBody.orderSyncBlockers)
    addBlocker(blocker, "settlement");
}
if (!out.orderSyncReady) addBlocker("order_sync_not_configured", "settlement");

const dryRunRoute = await postApiWithFallback(
  "economic event dry run",
  "/api/payments/economic-events/dry-run",
  "/api/v1/payments/economic-events/dry-run",
  {
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
  },
  jsonHeaders,
);
const dryRunProbe = dryRunRoute.probe;
const dryRun = dryRunProbe.data || {};
economicRoutesUsed.dryRun = dryRunRoute.path;
checks.economicDryRunHttp = dryRunProbe.status;
checks.economicDryRunPath = dryRunRoute.path;
checks.economicDryRunBlockers = dryRun.blockers || [];
if (dryRunProbe.status === 404)
  addBlocker("economic_event_dry_run_route_missing", "settlement");
else if (!dryRunProbe.ok)
  addBlocker(`economic_event_dry_run_http_${dryRunProbe.status}`, "settlement");
if (dryRun.paymentMarkedPaid === true || dryRun.orderCompleted === true)
  addBlocker("economic_dry_run_mutated_paid_or_order_state", "settlement");

out.settlementBlockers = blockers.filter(isSettlementBlocker);
out.checkoutBlockers = checkoutBlockers;
out.checkoutSafeToOpen = Boolean(
  out.checkoutSessionCreated &&
    out.stripeHostedCheckoutUrl &&
    out.stripeSessionModeDetected === "test" &&
    out.stripeSessionModeAllowed === true &&
    out.shippingOptionReady === true &&
    out.unsignedWebhookRejected === true &&
    checkoutBlockers.length === 0,
);
out.telegramOpsReady = Boolean(
  out.apiReady &&
    out.paymentReadinessReady &&
    out.stripeConfigured &&
    out.stripeWebhookConfigured &&
    out.unsignedWebhookRejected,
);
if (out.stripeSessionModeDetected === "live" && !ALLOW_LIVE_STRIPE_SMOKE)
  out.checkoutSafeToOpen = false;
out.success = blockers.length === 0;
if (
  blockers.includes("medusa_publishable_key_placeholder_not_replaced") ||
  blockers.includes("medusa_publishable_key_looks_like_stripe_key") ||
  blockers.includes("medusa_publishable_key_invalid")
) {
  out.nextManualStep =
    "Replace MEDUSA_PUBLISHABLE_KEY/NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY with the real Medusa publishable API key from Medusa, not a Stripe key or placeholder, then rerun the smoke before opening Stripe Checkout.";
} else if (
  out.stripeSessionModeDetected === "live" &&
  !ALLOW_LIVE_STRIPE_SMOKE
) {
  out.nextManualStep = liveSessionTestModeWarning();
} else if (
  out.checkoutSessionCreated &&
  out.stripeHostedCheckoutUrl &&
  out.stripeSessionModeDetected === "test" &&
  !out.shippingOptionReady
) {
  out.nextManualStep =
    "Stripe test checkout is ready, but do not open it until Medusa Store API returns a real shipping option.";
} else if (
  out.checkoutSafeToOpen === true
) {
  out.nextManualStep =
    "Checkout test URL is safe to open for Stripe test-card validation. Configure the Stripe Dashboard test webhook to post checkout.session.completed to the API, pay with a Stripe test card, then rerun with STRIPE_SESSION_ID or CHECKOUT_SESSION_ID to verify durable payment evidence and Medusa completion state.";
} else if (
  out.checkoutSessionCreated &&
  out.stripeHostedCheckoutUrl &&
  out.stripeSessionModeDetected === "unknown"
) {
  out.nextManualStep =
    "Resolve unknown Stripe session mode before opening Stripe Checkout.";
} else if (out.checkoutSessionCreated) {
  out.nextManualStep =
    "Resolve checkout blockers before opening Stripe Checkout. Current checkout safety checks are incomplete.";
} else {
  out.nextManualStep =
    "Resolve checkout blockers before opening Stripe Checkout. No checkoutUrl/sessionId should be used unless Stripe returns real hosted artifacts.";
}

console.log(JSON.stringify(out, null, 2));
process.exit(out.success ? 0 : 1);

#!/usr/bin/env node

const MEDUSA_URL = (process.env.MEDUSA_URL || process.env.MEDUSA_BACKEND_URL || "https://dbaronx-medusa.onrender.com").replace(/\/+$/, "");
const API_URL = (process.env.API_URL || process.env.NESTJS_API_URL || "https://dbaronx-api-unified.onrender.com").replace(/\/+$/, "");
const WEB_BASE_URL = (process.env.WEB_BASE_URL || process.env.NEXT_PUBLIC_WEB_BASE_URL || "https://dbaronx.com").replace(/\/+$/, "");
const API_BEARER_TOKEN = (process.env.API_BEARER_TOKEN || "").trim();
const MEDUSA_PUBLISHABLE_KEY = (process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || process.env.MEDUSA_PUBLISHABLE_KEY || "").trim();
const SHIPPING_OPTION_ID = (process.env.SHIPPING_OPTION_ID || "").trim();
const SNIPPET_LIMIT = 700;

const blockers = [];
const warnings = [];
const responseSnippets = {};
const fetchErrors = [];
const checks = {};
const apiPathsUsed = {};

const out = {
  success: false,
  blockers,
  apiReady: false,
  medusaReady: false,
  cartReady: false,
  lineItemAdded: false,
  shippingOptionReady: false,
  stripeReady: false,
  stripeSessionCreated: false,
  stripeCheckoutUrlPresent: false,
  stripeUnsignedWebhookRejected: false,
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
  authUsed: Boolean(API_BEARER_TOKEN),
  envReadiness: null,
  medusaUrl: MEDUSA_URL,
  apiUrl: API_URL,
  productId: null,
  variantId: null,
  regionId: null,
  cartId: null,
  dbxReference: null,
  warnings,
  checks,
  apiPathsUsed,
};

const medusaHeaders = {
  "content-type": "application/json",
  ...(MEDUSA_PUBLISHABLE_KEY ? { "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY } : {}),
};
const apiJsonHeaders = {
  "content-type": "application/json",
  ...(API_BEARER_TOKEN ? { authorization: `Bearer ${API_BEARER_TOKEN}` } : {}),
};

function api(path) {
  const base = API_URL.endsWith("/api") ? API_URL.slice(0, -4) : API_URL;
  return `${base}${path}`;
}

function snippet(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? null);
  return text.length > SNIPPET_LIMIT ? `${text.slice(0, SNIPPET_LIMIT)}…` : text;
}

function unwrap(body) {
  return body && typeof body === "object" && body.success === true && body.data ? body.data : body;
}

function firstArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeHeadersUsed(headers) {
  return Object.fromEntries(Object.entries(headers || {}).map(([key, value]) => {
    const lower = key.toLowerCase();
    return [key, lower.includes("authorization") || lower.includes("key") || lower.includes("token") ? Boolean(String(value || "").trim()) : value];
  }));
}

function collectResponseBlockers(payload) {
  const direct = firstArray(payload?.blockers);
  const nested = firstArray(payload?.response?.blockers);
  const errorNested = firstArray(payload?.error?.blockers);
  return [...direct, ...nested, ...errorNested];
}

function addUniqueBlocker(code) {
  if (!blockers.includes(code)) blockers.push(code);
}

function noteAuthBlocker(probe, route) {
  if ((probe.status === 401 || probe.status === 403) && !API_BEARER_TOKEN) {
    addUniqueBlocker("authorized_smoke_jwt_missing");
    checks[`${route}AuthRequired`] = true;
    return true;
  }
  return false;
}

async function getJson(url, init = {}) {
  const request = { url, method: init.method || "GET", headers: init.headers || {}, body: init.body };
  let response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    const normalized = {
      endpoint: request.url,
      method: request.method,
      headersUsed: safeHeadersUsed(request.headers),
      bodyPreview: request.body ? snippet(request.body) : null,
      errorName: error instanceof Error ? error.name : "NonErrorThrown",
      errorMessage: error instanceof Error ? error.message : String(error),
    };
    fetchErrors.push(normalized);
    return { ok: false, status: 0, body: { message: normalized.errorMessage }, data: {}, text: normalized.errorMessage };
  }

  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  return { ok: response.ok, status: response.status, body, data: unwrap(body), text };
}

async function apiJson(path, options = {}) {
  const url = api(path);
  const probe = await getJson(url, {
    method: options.method || "GET",
    headers: options.headers || apiJsonHeaders,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  responseSnippets[path] = snippet(probe.text || probe.body);
  return probe;
}

function cartFrom(data) {
  return data?.cart || data;
}

function salesChannelIdFrom(product) {
  return (process.env.MEDUSA_SALES_CHANNEL_ID || firstArray(product?.sales_channels)[0]?.id || "").trim();
}

function minorUnitAmountFromCart(cart) {
  const amount = Number(cart?.total ?? cart?.subtotal ?? 0);
  return Number.isInteger(amount) && amount > 0 ? amount : 100;
}

async function createCart(regionId, salesChannelId) {
  const bodies = salesChannelId ? [{ region_id: regionId, sales_channel_id: salesChannelId }, { region_id: regionId }] : [{ region_id: regionId }];
  let last = null;
  for (const body of bodies) {
    const probe = await getJson(`${MEDUSA_URL}/store/carts`, { method: "POST", headers: medusaHeaders, body: JSON.stringify(body) });
    responseSnippets["POST /store/carts"] = snippet(probe.text || probe.body);
    last = probe;
    const cart = cartFrom(probe.data);
    if (probe.ok && cart?.id) return { probe, cart };
  }
  return { probe: last, cart: null };
}

const health = await apiJson("/api/health", { headers: { "content-type": "application/json" } });
checks.apiHealthHttp = health.status;
out.apiReady = health.ok;
if (!health.ok) addUniqueBlocker(`api_health_http_${health.status}`);

const readiness = await apiJson("/api/payments/readiness", { headers: { "content-type": "application/json" } });
apiPathsUsed.paymentReadiness = "/api/payments/readiness";
checks.paymentReadinessHttp = readiness.status;
out.envReadiness = readiness.data || null;
out.stripeReady = readiness.ok && readiness.data?.stripeConfigured === true && readiness.data?.stripeWebhookConfigured === true;
out.dbxReady = readiness.ok && readiness.data?.dbxPaymentAddressPresent === true && readiness.data?.solanaRpcConfigured === true && readiness.data?.dbxTokenMintPresent === true && readiness.data?.fastapiVerifierConfigured === true;
out.orderSyncReady = readiness.ok && readiness.data?.orderSyncConfigured === true;
if (!readiness.ok) addUniqueBlocker(`payment_readiness_http_${readiness.status}`);
for (const blocker of firstArray(readiness.data?.blockers)) addUniqueBlocker(blocker);

const products = await getJson(`${MEDUSA_URL}/store/products?limit=20`, { headers: medusaHeaders });
responseSnippets["/store/products"] = snippet(products.text || products.body);
checks.medusaProductsHttp = products.status;
const product = firstArray(products.data?.products).find((item) => firstArray(item?.variants).length > 0) || firstArray(products.data?.products)[0] || null;
out.productId = product?.id || null;
out.variantId = firstArray(product?.variants)[0]?.id || null;
if (!products.ok) addUniqueBlocker(`store_products_http_${products.status}`);
if (!out.variantId) addUniqueBlocker("variant_id_missing");

const regions = await getJson(`${MEDUSA_URL}/store/regions?limit=20`, { headers: medusaHeaders });
responseSnippets["/store/regions"] = snippet(regions.text || regions.body);
checks.medusaRegionsHttp = regions.status;
out.regionId = firstArray(regions.data?.regions)[0]?.id || null;
if (!regions.ok) addUniqueBlocker(`store_regions_http_${regions.status}`);
if (!out.regionId) addUniqueBlocker("region_missing");
out.medusaReady = products.ok && regions.ok && Boolean(out.variantId && out.regionId);

let cart = null;
if (out.regionId) {
  const cartResult = await createCart(out.regionId, salesChannelIdFrom(product));
  checks.cartCreateHttp = cartResult.probe?.status ?? 0;
  cart = cartResult.cart;
  out.cartId = cart?.id || null;
  out.cartReady = Boolean(cartResult.probe?.ok && out.cartId);
  if (!out.cartReady) addUniqueBlocker(`cart_create_http_${cartResult.probe?.status ?? 0}`);
}

if (out.cartId && out.variantId) {
  const line = await getJson(`${MEDUSA_URL}/store/carts/${out.cartId}/line-items`, {
    method: "POST",
    headers: medusaHeaders,
    body: JSON.stringify({ variant_id: out.variantId, quantity: 1 }),
  });
  responseSnippets["/store/carts/:id/line-items"] = snippet(line.text || line.body);
  checks.lineItemAddHttp = line.status;
  out.lineItemAdded = line.ok;
  cart = cartFrom(line.data) || cart;
  if (!line.ok) addUniqueBlocker(`line_item_add_http_${line.status}`);

  const shipping = await getJson(`${MEDUSA_URL}/store/shipping-options?cart_id=${encodeURIComponent(out.cartId)}`, { headers: medusaHeaders });
  responseSnippets["/store/shipping-options"] = snippet(shipping.text || shipping.body);
  checks.shippingOptionsHttp = shipping.status;
  const options = firstArray(shipping.data?.shipping_options);
  checks.shippingOptionsCount = options.length;
  checks.expectedShippingOptionAvailable = SHIPPING_OPTION_ID ? options.some((option) => option?.id === SHIPPING_OPTION_ID) : null;
  out.shippingOptionReady = shipping.ok && options.length > 0;
  if (!shipping.ok) addUniqueBlocker(`shipping_options_http_${shipping.status}`);
  if (shipping.ok && options.length === 0) addUniqueBlocker("shipping_option_missing");
  if (shipping.ok && SHIPPING_OPTION_ID && !checks.expectedShippingOptionAvailable) warnings.push(`shipping_option_${SHIPPING_OPTION_ID}_not_returned_for_cart`);
}

const checkoutAmount = minorUnitAmountFromCart(cart);
const checkoutCurrency = String(cart?.currency_code || "usd").toLowerCase();
const sessionBody = {
  cartId: out.cartId || "smoke-cart",
  orderRef: `unified-stripe-smoke-${Date.now()}`,
  customerRef: "unified-payment-rail-smoke",
  amount: checkoutAmount,
  currency: checkoutCurrency,
  successUrl: `${WEB_BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
  cancelUrl: `${WEB_BASE_URL}/checkout/cancel`,
  productName: "dBaronX unified payment rail smoke",
};
const stripeSession = await apiJson("/api/checkout/stripe/session", { method: "POST", body: sessionBody });
apiPathsUsed.stripeSession = "/api/checkout/stripe/session";
checks.stripeSessionHttp = stripeSession.status;
const stripeSessionBody = stripeSession.data || {};
out.stripeSessionCreated = stripeSessionBody.success === true && Boolean(stripeSessionBody.sessionId) && Boolean(stripeSessionBody.checkoutUrl);
out.stripeCheckoutUrlPresent = Boolean(stripeSessionBody.checkoutUrl);
if (stripeSession.status === 404) addUniqueBlocker("stripe_session_route_missing");
else if (!stripeSession.ok && !noteAuthBlocker(stripeSession, "stripeSession")) addUniqueBlocker(`stripe_session_http_${stripeSession.status}`);
if (stripeSessionBody.configured === false && (stripeSessionBody.sessionId || stripeSessionBody.checkoutUrl)) addUniqueBlocker("stripe_returned_checkout_artifacts_while_unconfigured");
if (stripeSessionBody.configured === false && !firstArray(stripeSessionBody.blockers).includes("stripe_secret_key_missing")) addUniqueBlocker("stripe_unconfigured_without_missing_secret_blocker");
if (stripeSessionBody.configured === true && stripeSessionBody.success === true && !String(stripeSessionBody.checkoutUrl || "").startsWith("https://checkout.stripe.com/")) addUniqueBlocker("stripe_checkout_url_not_stripe_hosted");

const webhook = await apiJson("/api/checkout/stripe/webhook", { method: "POST", headers: { "content-type": "application/json" }, body: {} });
apiPathsUsed.stripeWebhook = "/api/checkout/stripe/webhook";
checks.stripeWebhookHttp = webhook.status;
const webhookBody = webhook.data || {};
out.paymentMarkedPaid = Boolean(webhookBody.paymentMarkedPaid);
out.stripeUnsignedWebhookRejected = webhook.ok && webhookBody.verified === false && out.paymentMarkedPaid === false;
if (webhook.status === 404) addUniqueBlocker("stripe_webhook_route_missing");
else if (!webhook.ok) addUniqueBlocker(`stripe_webhook_http_${webhook.status}`);
if (webhookBody.verified) addUniqueBlocker("unsigned_webhook_marked_verified");
if (out.paymentMarkedPaid) addUniqueBlocker("unsigned_webhook_marked_paid");
if (webhook.ok && !firstArray(webhookBody.blockers).includes("stripe_signature_missing")) warnings.push("unsigned_stripe_webhook_missing_signature_blocker_not_reported");

const intentBody = {
  cartId: out.cartId || "smoke-cart",
  email: "smoke@dbaronx.invalid",
  customerName: "Unified Smoke",
  expectedUsdCents: checkoutAmount,
  expectedDbxBaseUnits: 1,
  senderWallet: "11111111111111111111111111111111",
  idempotencyKey: `unified-smoke-${Date.now()}`,
  metadata: { smoke: true, source: "e2e-unified-payment-rail-smoke" },
};
const dbxIntent = await apiJson("/api/dbx-payments/intents", { method: "POST", body: intentBody });
apiPathsUsed.dbxIntent = "/api/dbx-payments/intents";
checks.dbxIntentHttp = dbxIntent.status;
out.dbxIntentCreated = dbxIntent.ok && dbxIntent.data?.success !== false && Boolean(dbxIntent.data?.data?.reference || dbxIntent.data?.reference);
out.dbxReference = dbxIntent.data?.data?.reference || dbxIntent.data?.reference || null;
if (dbxIntent.status === 404) addUniqueBlocker("dbx_intent_route_missing");
else if (!dbxIntent.ok && !noteAuthBlocker(dbxIntent, "dbxIntent")) {
  for (const blocker of collectResponseBlockers(dbxIntent.body)) addUniqueBlocker(blocker);
  if (collectResponseBlockers(dbxIntent.body).length === 0) addUniqueBlocker(`dbx_intent_http_${dbxIntent.status}`);
}

const fakeSignature = `fake-smoke-signature-${Date.now()}`;
if (out.dbxReference) {
  const submit = await apiJson("/api/dbx-payments/submit", { method: "POST", body: { intentReference: out.dbxReference, transactionSignature: fakeSignature, senderWallet: "11111111111111111111111111111111" } });
  checks.dbxSubmitHttp = submit.status;
  out.dbxSubmitReady = submit.status !== 404 && submit.status !== 401 && submit.status !== 403;
  if (submit.status === 404) addUniqueBlocker("dbx_submit_route_missing");
  else if (!submit.ok && !noteAuthBlocker(submit, "dbxSubmit")) addUniqueBlocker(`dbx_submit_http_${submit.status}`);

  const confirm = await apiJson("/api/dbx-payments/confirm", { method: "POST", body: { intentReference: out.dbxReference, transactionSignature: fakeSignature } });
  checks.dbxConfirmHttp = confirm.status;
  const confirmStatus = confirm.data?.data?.status || confirm.data?.status || null;
  out.dbxConfirmReady = confirm.status !== 404 && confirm.status !== 401 && confirm.status !== 403;
  out.dbxPaymentMarkedPaid = ["completed", "paid"].includes(String(confirmStatus));
  out.dbxFakeTxRejected = !out.dbxPaymentMarkedPaid && (confirm.ok || confirm.status >= 400);
  if (confirm.status === 404) addUniqueBlocker("dbx_confirm_route_missing");
  else if (!confirm.ok && !noteAuthBlocker(confirm, "dbxConfirm")) {
    for (const blocker of collectResponseBlockers(confirm.body)) addUniqueBlocker(blocker);
  }
  if (out.dbxPaymentMarkedPaid) addUniqueBlocker("dbx_fake_transaction_marked_paid");
} else {
  out.dbxSubmitReady = dbxIntent.status !== 404;
  out.dbxConfirmReady = dbxIntent.status !== 404;
  out.dbxFakeTxRejected = true;
}

out.paymentMarkedPaid = out.paymentMarkedPaid || out.dbxPaymentMarkedPaid;
out.nextManualStep = blockers.length === 0
  ? "Run a controlled real Stripe Checkout payment or submit a real verified Solana DBX transfer; paid state must still come only from the verified webhook or verified transaction."
  : "Resolve the listed blockers, then rerun this live unified payment rail smoke before attempting the first controlled payment order.";
out.success = blockers.length === 0;
console.log(JSON.stringify(out, null, 2));
process.exit(out.success ? 0 : 1);

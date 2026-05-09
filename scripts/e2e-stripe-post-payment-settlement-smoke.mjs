#!/usr/bin/env node

const API_URL = (
  process.env.API_URL ||
  process.env.NESTJS_API_URL ||
  "https://dbaronx-api-unified.onrender.com"
).replace(/\/+$/, "");
const API_BASE_URL = API_URL.endsWith("/api") ? API_URL.slice(0, -4) : API_URL;
const INTERNAL_SERVICE_TOKEN = String(
  process.env.INTERNAL_SERVICE_TOKEN || "",
).trim();
const STRIPE_SESSION_ID = String(
  process.env.STRIPE_SESSION_ID || process.env.CHECKOUT_SESSION_ID || "",
).trim();
const CART_ID = String(
  process.env.CART_ID || process.env.MEDUSA_CART_ID || "",
).trim();
const ORDER_REF = String(
  process.env.ORDER_REF ||
    process.env.CHECKOUT_REF ||
    process.env.ORDER_INTENT_ID ||
    "",
).trim();
const CHECKOUT_REF = String(
  process.env.CHECKOUT_REF ||
    process.env.ORDER_REF ||
    process.env.ORDER_INTENT_ID ||
    "",
).trim();

const blockers = [];
const checks = {};
const responseSnippets = {};

function api(path) {
  return `${API_BASE_URL}${path}`;
}

function addBlocker(blocker) {
  if (blocker && !blockers.includes(blocker)) blockers.push(blocker);
}

function snippet(value) {
  const text =
    typeof value === "string" ? value : JSON.stringify(value ?? null);
  return text.length > 900 ? `${text.slice(0, 900)}…` : text;
}

function unwrap(body) {
  return body &&
    typeof body === "object" &&
    body.success === true &&
    body.data !== undefined
    ? body.data
    : body;
}

async function requestJson(label, url, init = {}) {
  try {
    const response = await fetch(url, init);
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
      data: unwrap(body),
      body,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    responseSnippets[label] = message;
    return { ok: false, status: 0, data: { message }, body: { message } };
  }
}

async function postApiWithFallback(
  label,
  canonicalPath,
  legacyPath,
  body,
  headers,
) {
  const init = { method: "POST", headers, body: JSON.stringify(body) };
  const canonical = await requestJson(
    `${label} ${canonicalPath}`,
    api(canonicalPath),
    init,
  );
  if (canonical.status !== 404)
    return { probe: canonical, path: canonicalPath };
  const legacy = await requestJson(
    `${label} ${legacyPath}`,
    api(legacyPath),
    init,
  );
  return { probe: legacy, path: legacyPath };
}

const out = {
  success: false,
  blockers,
  verifiedStripeEventReady: false,
  paymentRecordReady: false,
  economicEventVerified: false,
  medusaOrderCompletionReady: false,
  medusaOrderId: null,
  paymentMarkedPaid: false,
  orderSyncReady: false,
  duplicateWebhookSafe: false,
  settlementStatus: null,
  inputs: {
    stripeSessionIdPresent: Boolean(STRIPE_SESSION_ID),
    cartIdPresent: Boolean(CART_ID),
    orderRefPresent: Boolean(ORDER_REF),
    checkoutRefPresent: Boolean(CHECKOUT_REF),
    internalTokenPresent: Boolean(INTERNAL_SERVICE_TOKEN),
  },
  checks,
  responseSnippets,
};

if (!INTERNAL_SERVICE_TOKEN) addBlocker("internal_service_token_missing");
if (!STRIPE_SESSION_ID && !(CART_ID && (ORDER_REF || CHECKOUT_REF))) {
  addBlocker("stripe_session_id_or_cart_order_ref_required");
}

const headers = {
  "content-type": "application/json",
  ...(INTERNAL_SERVICE_TOKEN
    ? { "x-internal-token": INTERNAL_SERVICE_TOKEN }
    : {}),
};

if (blockers.length === 0) {
  const route = await postApiWithFallback(
    "order sync preview",
    "/api/checkout/stripe/order-sync-preview",
    "/api/v1/checkout/stripe/order-sync-preview",
    {
      cartId: CART_ID || "post-payment-cart-lookup-by-session",
      orderRef:
        ORDER_REF || CHECKOUT_REF || "post-payment-order-lookup-by-session",
      checkoutRef:
        CHECKOUT_REF || ORDER_REF || "post-payment-checkout-lookup-by-session",
      amount: Number(process.env.STRIPE_TEST_AMOUNT_MINOR || 100),
      currency: process.env.STRIPE_TEST_CURRENCY || "usd",
      successUrl: "https://dbaronx.com/checkout/success",
      cancelUrl: "https://dbaronx.com/checkout/cancel",
      sessionId: STRIPE_SESSION_ID || undefined,
    },
    headers,
  );

  checks.orderSyncPreviewHttp = route.probe.status;
  checks.orderSyncPreviewPath = route.path;
  const preview = route.probe.data || {};

  if ([401, 403].includes(route.probe.status))
    addBlocker("internal_token_present_but_rejected");
  else if (!route.probe.ok)
    addBlocker(
      route.probe.status === 404
        ? "order_sync_preview_route_missing"
        : `order_sync_preview_http_${route.probe.status}`,
    );

  out.verifiedStripeEventReady = preview.verifiedStripeEventReady === true;
  out.paymentRecordReady = preview.paymentRecordReady === true;
  out.economicEventVerified = preview.economicEventVerified === true;
  out.medusaOrderCompletionReady = preview.medusaOrderCompletionReady === true;
  out.medusaOrderId = preview.medusaOrderId || null;
  out.paymentMarkedPaid = preview.paymentMarkedPaid === true;
  out.orderSyncReady = preview.orderSyncReady === true;
  out.duplicateWebhookSafe = preview.duplicateWebhookSafe === true;
  out.settlementStatus = preview.settlementStatus || null;

  for (const blocker of Array.isArray(preview.blockers) ? preview.blockers : [])
    addBlocker(blocker);
}

if (out.paymentMarkedPaid)
  addBlocker("payment_marked_paid_without_dbx_intent_contract");
if (!out.paymentRecordReady) addBlocker("payment_record_lookup_pending");
if (!out.verifiedStripeEventReady) addBlocker("verified_stripe_event_missing");
if (!out.economicEventVerified) addBlocker("economic_event_verified_missing");
if (!out.medusaOrderCompletionReady)
  addBlocker("medusa_order_completion_pending_verified_webhook");

out.success = blockers.length === 0;
console.log(JSON.stringify(out, null, 2));
process.exit(out.success ? 0 : 1);

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
const blockerSources = {};
const checks = {};
const responseSnippets = {};

function api(path) {
  return `${API_BASE_URL}${path}`;
}

function addBlocker(blocker, source = "smoke") {
  if (blocker && !blockers.includes(blocker)) blockers.push(blocker);
  if (blocker) blockerSources[blocker] = blockerSources[blocker] || source;
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

async function getApiWithFallback(label, canonicalPath, legacyPath) {
  const canonical = await requestJson(
    `${label} ${canonicalPath}`,
    api(canonicalPath),
  );
  if (canonical.status !== 404)
    return { probe: canonical, path: canonicalPath };
  const legacy = await requestJson(`${label} ${legacyPath}`, api(legacyPath));
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
  settlementLookupPath: null,
  inputs: {
    stripeSessionIdPresent: Boolean(STRIPE_SESSION_ID),
    cartIdPresent: Boolean(CART_ID),
    orderRefPresent: Boolean(ORDER_REF),
    checkoutRefPresent: Boolean(CHECKOUT_REF),
    internalTokenPresent: Boolean(INTERNAL_SERVICE_TOKEN),
  },
  checks,
  blockerSources,
  responseSnippets,
};

if (!STRIPE_SESSION_ID && !(CART_ID && (ORDER_REF || CHECKOUT_REF))) {
  addBlocker("stripe_session_id_or_cart_order_ref_required", "smoke_inputs");
}

if (blockers.length === 0) {
  const query = new URLSearchParams();
  if (STRIPE_SESSION_ID) query.set("sessionId", STRIPE_SESSION_ID);
  if (CART_ID) query.set("cartId", CART_ID);
  if (ORDER_REF) query.set("orderRef", ORDER_REF);
  if (CHECKOUT_REF) query.set("checkoutRef", CHECKOUT_REF);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const route = await getApiWithFallback(
    "settlement status",
    `/api/checkout/stripe/settlement-status${suffix}`,
    `/api/v1/checkout/stripe/settlement-status${suffix}`,
  );

  checks.settlementStatusHttp = route.probe.status;
  checks.settlementStatusPath = route.path;
  out.settlementLookupPath = route.path;
  const preview = route.probe.data || {};

  if ([401, 403].includes(route.probe.status))
    addBlocker("settlement_status_route_requires_unexpected_auth", route.path);
  else if (!route.probe.ok)
    addBlocker(
      route.probe.status === 404
        ? "settlement_status_route_missing"
        : `settlement_status_http_${route.probe.status}`,
      route.path,
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
    addBlocker(blocker, route.path);
}

if (out.paymentMarkedPaid)
  checks.paymentMarkedPaidFromVerifiedStripeWebhookEvidence = true;
if (!out.paymentRecordReady)
  addBlocker("payment_record_lookup_pending", "settlement_status_result");
if (!out.verifiedStripeEventReady)
  addBlocker("verified_stripe_event_missing", "settlement_status_result");
if (!out.economicEventVerified)
  addBlocker("economic_event_verified_missing", "settlement_status_result");
if (!out.medusaOrderCompletionReady)
  addBlocker(
    out.blockers.includes(
      "medusa_cart_completion_requires_payment_provider_session",
    )
      ? "medusa_cart_completion_requires_payment_provider_session"
      : "medusa_order_completion_pending_verified_webhook",
    "settlement_status_result",
  );

out.success = blockers.length === 0;
console.log(JSON.stringify(out, null, 2));
process.exit(out.success ? 0 : 1);

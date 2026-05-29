#!/usr/bin/env node

const API_URL = (
  process.env.API_URL ||
  process.env.NESTJS_API_URL ||
  "https://dbaronx-api-unified-qo2j.onrender.com"
).replace(/\/+$/, "");
const API_BASE_URL = API_URL.endsWith("/api") ? API_URL.slice(0, -4) : API_URL;
const INTERNAL_SERVICE_TOKEN = String(
  process.env.INTERNAL_SERVICE_TOKEN || "",
).trim();
const CHECKOUT_SESSION_ID_INPUT = String(
  process.env.CHECKOUT_SESSION_ID || "",
).trim();
const STRIPE_SESSION_ID_INPUT = String(
  process.env.STRIPE_SESSION_ID || "",
).trim();
const STRIPE_EVENT_ID_INPUT = String(process.env.STRIPE_EVENT_ID || "").trim();
const PAYMENT_INTENT_ID_INPUT = String(
  process.env.PAYMENT_INTENT_ID || "",
).trim();
const CHARGE_ID_INPUT = String(process.env.CHARGE_ID || "").trim();
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

function classifyStripeLookupId(value) {
  const id = String(value || "").trim();
  if (!id) return "missing";
  if (/^cs_(test|live)_/.test(id)) return "checkout_session_id";
  if (/^evt_/.test(id)) return "stripe_event_id";
  if (/^pi_/.test(id)) return "payment_intent_id";
  if (/^(ch|py)_/.test(id)) return "charge_id";
  return "unknown";
}

function blockerForMisroutedSessionId(classification) {
  if (classification === "stripe_event_id")
    return "received_stripe_event_id_not_checkout_session_id";
  if (classification === "payment_intent_id")
    return "received_payment_intent_id_not_checkout_session_id";
  if (classification === "charge_id")
    return "received_charge_id_not_checkout_session_id";
  if (classification === "unknown") return "checkout_session_id_required";
  return null;
}

function lookupKey(name, value) {
  return { name, value, classification: classifyStripeLookupId(value) };
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

function internalInit(jsonBody) {
  return {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(INTERNAL_SERVICE_TOKEN ? { "x-internal-token": INTERNAL_SERVICE_TOKEN } : {}),
    },
    body: JSON.stringify(jsonBody || {}),
  };
}

async function postInternalApiWithFallback(label, canonicalPath, legacyPath, jsonBody) {
  const canonical = await requestJson(
    `${label} ${canonicalPath}`,
    api(canonicalPath),
    internalInit(jsonBody),
  );
  if (canonical.status !== 404)
    return { probe: canonical, path: canonicalPath };
  const legacy = await requestJson(
    `${label} ${legacyPath}`,
    api(legacyPath),
    internalInit(jsonBody),
  );
  return { probe: legacy, path: legacyPath };
}

async function getInternalApiWithFallback(label, canonicalPath, legacyPath) {
  const init = INTERNAL_SERVICE_TOKEN
    ? { headers: { "x-internal-token": INTERNAL_SERVICE_TOKEN } }
    : {};
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

const idClassification = {
  CHECKOUT_SESSION_ID: classifyStripeLookupId(CHECKOUT_SESSION_ID_INPUT),
  STRIPE_SESSION_ID: classifyStripeLookupId(STRIPE_SESSION_ID_INPUT),
  STRIPE_EVENT_ID: classifyStripeLookupId(STRIPE_EVENT_ID_INPUT),
  PAYMENT_INTENT_ID: classifyStripeLookupId(PAYMENT_INTENT_ID_INPUT),
  CHARGE_ID: classifyStripeLookupId(CHARGE_ID_INPUT),
};

const acceptedLookupKeys = [];
const rejectedLookupKeys = [];

function accept(name, value, queryParam, classification) {
  const cleaned = String(value || "").trim();
  if (!cleaned) return;
  acceptedLookupKeys.push({ name, queryParam, classification, value: cleaned });
}

function reject(name, value, expected, blocker) {
  const cleaned = String(value || "").trim();
  if (!cleaned) return;
  rejectedLookupKeys.push({
    name,
    classification: classifyStripeLookupId(cleaned),
    expected,
    blocker,
    value: cleaned,
  });
}

for (const key of [
  lookupKey("CHECKOUT_SESSION_ID", CHECKOUT_SESSION_ID_INPUT),
  lookupKey("STRIPE_SESSION_ID", STRIPE_SESSION_ID_INPUT),
]) {
  if (!key.value) continue;
  if (key.classification === "checkout_session_id") {
    accept(key.name, key.value, "sessionId", key.classification);
    continue;
  }
  const blocker = blockerForMisroutedSessionId(key.classification);
  reject(key.name, key.value, "cs_test_* or cs_live_*", blocker);
  if (blocker) addBlocker(blocker, "smoke_inputs");
  if (key.classification === "stripe_event_id")
    accept(key.name, key.value, "stripeEventId", key.classification);
  else if (key.classification === "payment_intent_id")
    accept(key.name, key.value, "paymentIntentId", key.classification);
  else if (key.classification === "charge_id")
    accept(key.name, key.value, "chargeId", key.classification);
}

if (STRIPE_EVENT_ID_INPUT)
  accept(
    "STRIPE_EVENT_ID",
    STRIPE_EVENT_ID_INPUT,
    "stripeEventId",
    idClassification.STRIPE_EVENT_ID,
  );
if (PAYMENT_INTENT_ID_INPUT)
  accept(
    "PAYMENT_INTENT_ID",
    PAYMENT_INTENT_ID_INPUT,
    "paymentIntentId",
    idClassification.PAYMENT_INTENT_ID,
  );
if (CHARGE_ID_INPUT)
  accept("CHARGE_ID", CHARGE_ID_INPUT, "chargeId", idClassification.CHARGE_ID);
if (CART_ID) accept("CART_ID", CART_ID, "cartId", "cart_id");
if (ORDER_REF) accept("ORDER_REF", ORDER_REF, "orderRef", "order_ref");
if (CHECKOUT_REF)
  accept("CHECKOUT_REF", CHECKOUT_REF, "checkoutRef", "checkout_ref");

const hasCheckoutSessionId = acceptedLookupKeys.some(
  (key) => key.queryParam === "sessionId",
);
const hasAnyAcceptedLookupKey = acceptedLookupKeys.length > 0;

if (!hasCheckoutSessionId && !hasAnyAcceptedLookupKey)
  addBlocker("checkout_session_id_required", "smoke_inputs");

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
  telegramOpsReady: false,
  settlementSafeToClaim: false,
  orderSyncPreviewPath: null,
  orderSyncPreviewHttp: null,
  orderSyncPreviewBlockers: [],
  settlementStorageReady: false,
  settlementStorageReadinessHttp: null,
  missingSettlementTables: [],
  migrationActionRequired: false,
  replayRequiredAfterMigration: false,
  settlementStatus: null,
  settlementLookupPath: null,
  durableLookupAttempted: false,
  durableLookupSource: null,
  matchedWebhookEventId: null,
  matchedCheckoutSessionId: null,
  matchedPaymentIntentId: null,
  matchedCartId: null,
  matchedOrderRef: null,
  matchedCheckoutRef: null,
  migrationTableAvailable: false,
  webhookEvidenceTableAvailable: false,
  inputs: {
    checkoutSessionIdPresent: Boolean(CHECKOUT_SESSION_ID_INPUT),
    stripeSessionIdPresent: Boolean(STRIPE_SESSION_ID_INPUT),
    stripeEventIdPresent: Boolean(STRIPE_EVENT_ID_INPUT),
    paymentIntentIdPresent: Boolean(PAYMENT_INTENT_ID_INPUT),
    chargeIdPresent: Boolean(CHARGE_ID_INPUT),
    cartIdPresent: Boolean(CART_ID),
    orderRefPresent: Boolean(ORDER_REF),
    checkoutRefPresent: Boolean(CHECKOUT_REF),
    internalTokenPresent: Boolean(INTERNAL_SERVICE_TOKEN),
  },
  idClassification,
  acceptedLookupKeys,
  rejectedLookupKeys,
  lookupWarnings: rejectedLookupKeys.map((key) => `${key.name}:${key.classification}:expected_${key.expected}`),
  lookupAdvice:
    "Use a Checkout Session ID (cs_test_* or cs_live_*) from the Stripe Checkout completion, or provide CART_ID plus ORDER_REF/CHECKOUT_REF from checkout metadata. evt_* is an event ID, pi_* is a PaymentIntent ID, and ch_*/py_* is a charge-like ID; these are diagnostic lookup keys, not sessionId values.",
  exactExpectedIdFormat: "cs_test_* or cs_live_*",
  migrationReplayInstruction:
    "Apply supabase/migrations/202605080001_stripe_verified_settlement_events.sql, redeploy/restart API, then create a fresh Stripe test checkout or replay checkout.session.completed.",
  checks,
  blockerSources,
  responseSnippets,
};

const storageRoute = await getInternalApiWithFallback(
  "settlement storage readiness",
  "/api/checkout/stripe/settlement-storage-readiness",
  "/api/v1/checkout/stripe/settlement-storage-readiness",
);
checks.settlementStorageReadinessHttp = storageRoute.probe.status;
checks.settlementStorageReadinessPath = storageRoute.path;
out.settlementStorageReadinessHttp = storageRoute.probe.status;
const storageReadiness = storageRoute.probe.data || {};
out.settlementStorageReady = storageReadiness.success === true;
out.missingSettlementTables = Array.isArray(storageReadiness.missingTables)
  ? storageReadiness.missingTables
  : [];
out.migrationActionRequired = out.missingSettlementTables.length > 0;
out.replayRequiredAfterMigration = out.migrationActionRequired;
checks.settlementStorageReady = out.settlementStorageReady;
checks.missingSettlementTables = out.missingSettlementTables;
checks.migrationActionRequired = out.migrationActionRequired;
checks.replayRequiredAfterMigration = out.replayRequiredAfterMigration;

if ([401, 403].includes(storageRoute.probe.status))
  addBlocker("settlement_storage_readiness_requires_internal_token", storageRoute.path);
else if (!storageRoute.probe.ok)
  addBlocker(
    storageRoute.probe.status === 404
      ? "settlement_storage_readiness_route_missing"
      : `settlement_storage_readiness_http_${storageRoute.probe.status}`,
    storageRoute.path,
  );

for (const blocker of Array.isArray(storageReadiness.blockers)
  ? storageReadiness.blockers
  : [])
  addBlocker(blocker, storageRoute.path);

if (out.migrationActionRequired) {
  addBlocker("stripe_settlement_migration_tables_unavailable", storageRoute.path);
  checks.migrationManualAction =
    "Apply supabase/migrations/202605080001_stripe_verified_settlement_events.sql, redeploy/restart API, then create a fresh Stripe test checkout or replay checkout.session.completed.";
}

if (hasAnyAcceptedLookupKey) {
  const query = new URLSearchParams();
  for (const key of acceptedLookupKeys) {
    if (!query.has(key.queryParam)) query.set(key.queryParam, key.value);
  }
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
  out.durableLookupAttempted = preview.durableLookupAttempted === true;
  out.durableLookupSource = preview.durableLookupSource || null;
  out.matchedWebhookEventId = preview.matchedWebhookEventId || null;
  out.matchedCheckoutSessionId = preview.matchedCheckoutSessionId || null;
  out.matchedPaymentIntentId = preview.matchedPaymentIntentId || null;
  out.matchedCartId = preview.matchedCartId || null;
  out.matchedOrderRef = preview.matchedOrderRef || null;
  out.matchedCheckoutRef = preview.matchedCheckoutRef || null;
  out.migrationTableAvailable = preview.migrationTableAvailable === true;
  out.webhookEvidenceTableAvailable =
    preview.webhookEvidenceTableAvailable === true;
  checks.durableLookupAttempted = out.durableLookupAttempted;
  checks.durableLookupSource = out.durableLookupSource;
  checks.migrationTableAvailable = out.migrationTableAvailable;
  checks.webhookEvidenceTableAvailable = out.webhookEvidenceTableAvailable;

  for (const blocker of Array.isArray(preview.blockers) ? preview.blockers : [])
    addBlocker(blocker, route.path);
}


if (hasAnyAcceptedLookupKey) {
  const sessionId = acceptedLookupKeys.find((key) => key.queryParam === "sessionId")?.value;
  const previewRoute = await postInternalApiWithFallback(
    "order sync preview",
    "/api/checkout/stripe/order-sync-preview",
    "/api/v1/checkout/stripe/order-sync-preview",
    {
      sessionId,
      checkoutSessionId: sessionId,
      stripeEventId: acceptedLookupKeys.find((key) => key.queryParam === "stripeEventId")?.value,
      paymentIntentId: acceptedLookupKeys.find((key) => key.queryParam === "paymentIntentId")?.value,
      cartId: CART_ID || acceptedLookupKeys.find((key) => key.queryParam === "cartId")?.value,
      orderRef: ORDER_REF || acceptedLookupKeys.find((key) => key.queryParam === "orderRef")?.value,
      checkoutRef: CHECKOUT_REF || acceptedLookupKeys.find((key) => key.queryParam === "checkoutRef")?.value,
    },
  );
  checks.orderSyncPreviewHttp = previewRoute.probe.status;
  checks.orderSyncPreviewPath = previewRoute.path;
  out.orderSyncPreviewHttp = previewRoute.probe.status;
  out.orderSyncPreviewPath = previewRoute.path;
  const preview = previewRoute.probe.data || {};
  out.orderSyncPreviewBlockers = Array.isArray(preview.blockers) ? preview.blockers : [];
  if ([401, 403].includes(previewRoute.probe.status))
    addBlocker(
      INTERNAL_SERVICE_TOKEN ? "internal_token_present_but_rejected" : "protected_route_requires_internal_token",
      previewRoute.path,
    );
  else if (!previewRoute.probe.ok)
    addBlocker(
      previewRoute.probe.status === 404
        ? "order_sync_preview_route_missing"
        : `order_sync_preview_http_${previewRoute.probe.status}`,
      previewRoute.path,
    );
  for (const blocker of out.orderSyncPreviewBlockers) addBlocker(blocker, previewRoute.path);
  out.orderSyncReady = out.orderSyncReady || (previewRoute.probe.ok && preview.orderSyncReady === true && out.orderSyncPreviewBlockers.length === 0);
  out.medusaOrderCompletionReady = out.medusaOrderCompletionReady || preview.medusaOrderCompletionReady === true;
  out.medusaOrderId = out.medusaOrderId || preview.medusaOrderId || null;
  out.duplicateWebhookSafe = out.duplicateWebhookSafe || preview.duplicateWebhookSafe === true;
  out.paymentRecordReady = out.paymentRecordReady || preview.paymentRecordReady === true;
  out.verifiedStripeEventReady = out.verifiedStripeEventReady || preview.verifiedStripeEventReady === true;
  out.economicEventVerified = out.economicEventVerified || preview.economicEventVerified === true;
  out.paymentMarkedPaid = out.paymentMarkedPaid || preview.paymentMarkedPaid === true;
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

out.settlementSafeToClaim = Boolean(
  out.verifiedStripeEventReady &&
    out.paymentRecordReady &&
    out.economicEventVerified &&
    out.medusaOrderCompletionReady &&
    out.orderSyncReady &&
    out.duplicateWebhookSafe &&
    out.paymentMarkedPaid,
);
out.telegramOpsReady = Boolean(out.settlementStorageReady && out.settlementLookupPath);
if (!out.duplicateWebhookSafe) addBlocker("duplicate_webhook_safety_unverified", "settlement_status_result");
if (!out.settlementSafeToClaim) addBlocker("settlement_proof_incomplete", "settlement_status_result");
out.success = blockers.length === 0 && out.settlementSafeToClaim === true;
out.nextManualStep = out.settlementSafeToClaim
  ? "Backend proof is complete: signed Stripe webhook evidence, payment record linkage, economic event persistence, duplicate webhook safety, and Medusa order sync are ready. Claim settled only from backend verified records."
  : out.migrationActionRequired
    ? out.migrationReplayInstruction
    : "Do not claim payment/order settled. Provide the correct cs_test_* Checkout Session ID after completing Stripe test Checkout and receiving a signed checkout.session.completed webhook, then rerun this smoke.";
console.log(JSON.stringify(out, null, 2));
process.exit(out.success ? 0 : 1);

#!/usr/bin/env node
import Stripe from "stripe";

const API_URL = (process.env.API_URL || process.env.NESTJS_API_URL || "https://dbaronx-api-unified.onrender.com").replace(/\/$/, "");
const WEB_BASE_URL = (process.env.WEB_BASE_URL || process.env.NEXT_PUBLIC_WEB_BASE_URL || "https://dbaronx.com").replace(/\/$/, "");
const TEST_SIGNING_SECRET = (process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_TEST_WEBHOOK_SECRET || "").trim();
const blockers = [];
const warnings = [];

function api(path) {
  const normalizedBase = API_URL.endsWith("/api") ? API_URL.slice(0, -4) : API_URL;
  return `${normalizedBase}${path}`;
}

function unwrap(body) {
  return body && typeof body === "object" && body.data && body.success === true ? body.data : body;
}

async function getJson(url, init = {}) {
  let response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    return { ok: false, status: 0, data: { message: error instanceof Error ? error.message : String(error) } };
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

async function postApiJson(canonicalPath, legacyV1Path, body, headers = { "content-type": "application/json" }) {
  const canonical = await getJson(api(canonicalPath), { method: "POST", headers, body });
  if (canonical.status !== 404 || !legacyV1Path) return { probe: canonical, pathUsed: canonicalPath };
  const legacy = await getJson(api(legacyV1Path), { method: "POST", headers, body });
  return { probe: legacy, pathUsed: legacyV1Path };
}

const out = {
  success: false,
  apiUrl: API_URL,
  checkoutSessionCreated: false,
  checkoutUrlPresent: false,
  webhookEndpointReady: false,
  unsignedWebhookRejected: false,
  webhookVerifiedPathReady: false,
  idempotencyStoreReady: false,
  economicEventReady: false,
  orderSyncReady: false,
  settlementStatus: "not_started",
  remainingSettlementBlockers: [],
  manualDashboardWebhookRequired: false,
  blockers,
  warnings,
  checks: {},
};

const readiness = await getJson(api("/api/checkout/stripe/readiness"));
out.checks.readinessHttp = readiness.status;
out.checks.readiness = readiness.data || {};
out.idempotencyStoreReady = readiness.data?.stripeEventIdempotencyReady === true;
out.economicEventReady = readiness.data?.economicEventPersistenceReady === true;
out.orderSyncReady = readiness.data?.orderSyncConfigured === true;
if (readiness.status === 404) blockers.push("stripe_readiness_route_missing");

const sessionBody = JSON.stringify({
  cartId: process.env.STRIPE_TEST_CART_ID || "stripe-first-test-cart",
  orderRef: process.env.STRIPE_TEST_ORDER_REF || `stripe-first-${Date.now()}`,
  customerRef: "first-stripe-test-transaction-smoke",
  amount: Number(process.env.STRIPE_TEST_AMOUNT || 100),
  currency: process.env.STRIPE_TEST_CURRENCY || "usd",
  successUrl: `${WEB_BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
  cancelUrl: `${WEB_BASE_URL}/checkout/cancel`,
  productName: "dBaronX first Stripe test transaction smoke",
});
const sessionResult = await postApiJson("/api/checkout/stripe/session", "/api/v1/checkout/stripe/session", sessionBody);
const session = sessionResult.probe.data || {};
out.checks.sessionHttp = sessionResult.probe.status;
out.checks.sessionBlockers = session.blockers || [];
out.checkoutSessionCreated = session.success === true && Boolean(session.sessionId);
out.checkoutUrlPresent = typeof session.checkoutUrl === "string" && session.checkoutUrl.startsWith("https://checkout.stripe.com/");
if (sessionResult.probe.status === 404) blockers.push("stripe_session_route_missing");
if (!sessionResult.probe.ok) blockers.push(`stripe_session_http_${sessionResult.probe.status}`);
if (session.configured === true && session.checkoutUrl && !out.checkoutUrlPresent) blockers.push("stripe_checkout_url_not_stripe_hosted");

const unsigned = await postApiJson("/api/checkout/stripe/webhook", "/api/v1/checkout/stripe/webhook", "{}");
const unsignedWebhook = unsigned.probe.data || {};
out.checks.unsignedWebhookHttp = unsigned.probe.status;
out.checks.unsignedWebhookBlockers = unsignedWebhook.blockers || [];
out.webhookEndpointReady = unsigned.probe.status !== 404;
out.unsignedWebhookRejected = unsigned.probe.ok && unsignedWebhook.verified === false && unsignedWebhook.paymentMarkedPaid === false;
if (unsigned.probe.status === 404) blockers.push("stripe_webhook_route_missing");
if (!unsigned.probe.ok) blockers.push(`stripe_webhook_http_${unsigned.probe.status}`);
if (unsignedWebhook.verified) blockers.push("unsigned_webhook_marked_verified");
if (unsignedWebhook.paymentMarkedPaid) blockers.push("unsigned_webhook_marked_paid");

if (TEST_SIGNING_SECRET) {
  const now = Math.floor(Date.now() / 1000);
  const event = {
    id: `evt_test_verified_${Date.now()}`,
    object: "event",
    api_version: "2025-09-30.clover",
    created: now,
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type: "checkout.session.completed",
    data: {
      object: {
        id: session.sessionId || `cs_test_fixture_${Date.now()}`,
        object: "checkout.session",
        amount_total: Number(process.env.STRIPE_TEST_AMOUNT || 100),
        amount_subtotal: Number(process.env.STRIPE_TEST_AMOUNT || 100),
        currency: process.env.STRIPE_TEST_CURRENCY || "usd",
        payment_intent: `pi_test_fixture_${Date.now()}`,
        metadata: {
          cartId: process.env.STRIPE_TEST_CART_ID || "stripe-first-test-cart",
          orderRef: process.env.STRIPE_TEST_ORDER_REF || "stripe-first-order-pending",
          source: "dbaronx",
        },
      },
    },
  };
  const payload = JSON.stringify(event);
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: TEST_SIGNING_SECRET });
  const verified = await postApiJson("/api/checkout/stripe/webhook", "/api/v1/checkout/stripe/webhook", payload, {
    "content-type": "application/json",
    "stripe-signature": signature,
  });
  const webhook = verified.probe.data || {};
  out.checks.verifiedWebhookHttp = verified.probe.status;
  out.checks.verifiedWebhookBlockers = webhook.blockers || [];
  out.webhookVerifiedPathReady = verified.probe.ok && webhook.verified === true && webhook.paymentMarkedPaid === false;
  out.idempotencyStoreReady = webhook.idempotencyRecorded === true;
  out.economicEventReady = webhook.economicEventReady === true;
  out.orderSyncReady = webhook.orderSyncReady === true;
  out.settlementStatus = webhook.settlementStatus || "unknown";
  out.remainingSettlementBlockers = webhook.blockers || [];
} else {
  out.manualDashboardWebhookRequired = true;
  out.webhookVerifiedPathReady = readiness.data?.verifiedWebhookSettlementReady === true;
  out.settlementStatus = "manual_dashboard_webhook_required";
  out.remainingSettlementBlockers = readiness.data?.blockers || ["stripe_test_webhook_secret_missing_for_local_signed_fixture"];
  warnings.push("Set STRIPE_WEBHOOK_SECRET locally for signed fixture smoke, or deliver checkout.session.completed from Stripe Dashboard.");
}

out.success = blockers.length === 0;
console.log(JSON.stringify(out, null, 2));
process.exit(out.success ? 0 : 1);

#!/usr/bin/env node

const API_URL = String(
  process.env.API_URL ||
    process.env.API_BASE_URL ||
    process.env.NESTJS_API_URL ||
    'https://dbaronx-api-unified-qo2j.onrender.com',
).replace(/\/+$/, '');
const API_BASE_URL = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;
const INTERNAL_SERVICE_TOKEN = String(process.env.INTERNAL_SERVICE_TOKEN || '').trim();
const SESSION_ID = String(process.env.CHECKOUT_SESSION_ID || process.env.STRIPE_SESSION_ID || '').trim();
const STRIPE_EVENT_ID = String(process.env.STRIPE_EVENT_ID || '').trim();
const PAYMENT_INTENT_ID = String(process.env.PAYMENT_INTENT_ID || process.env.STRIPE_PAYMENT_INTENT_ID || '').trim();
const blockers = [];
const warnings = [];

const headers = {
  'content-type': 'application/json',
  ...(INTERNAL_SERVICE_TOKEN ? { 'x-internal-token': INTERNAL_SERVICE_TOKEN } : {}),
};

const query = new URLSearchParams();
if (SESSION_ID) query.set('sessionId', SESSION_ID);
if (STRIPE_EVENT_ID) query.set('stripeEventId', STRIPE_EVENT_ID);
if (PAYMENT_INTENT_ID) query.set('paymentIntentId', PAYMENT_INTENT_ID);
const path = `/api/checkout/stripe/settlement-storage-readiness${query.size ? `?${query}` : ''}`;
const readiness = await getJson(`${API_BASE_URL}${path}`, headers);
const body = readiness.json?.data || readiness.json || {};

if (!INTERNAL_SERVICE_TOKEN) blockers.push('internal_service_token_missing');
if ([401, 403].includes(readiness.status)) blockers.push('internal_token_missing_or_rejected');
else if (!readiness.ok) blockers.push(`settlement_storage_readiness_http_${readiness.status}`);

for (const table of ['app_public.stripe_webhook_events', 'app_public.economic_events']) {
  if (Array.isArray(body.missingTables) && body.missingTables.includes(table)) {
    blockers.push(`${table.replace('app_public.', '')}_missing`);
  }
}
if (body.webhookEvidenceTableAvailable !== true) blockers.push('stripe_webhook_events_not_ready');
if (body.economicEventTableAvailable !== true) blockers.push('economic_events_not_ready');
if (SESSION_ID && body.verifiedStripeEventReady !== true) warnings.push('supplied_session_has_no_verified_stripe_event_yet');
if (SESSION_ID && body.economicEventReady !== true) warnings.push('supplied_session_has_no_verified_economic_event_yet');

const result = {
  success: blockers.length === 0,
  blockers,
  warnings,
  apiBaseUrl: API_BASE_URL,
  path,
  status: readiness.status,
  suppliedSessionId: SESSION_ID || null,
  paymentRecordReady: body.paymentRecordReady === true,
  verifiedStripeEventReady: body.verifiedStripeEventReady === true,
  economicEventReady: body.economicEventReady === true,
  duplicateWebhookSafe: body.duplicateWebhookSafe === true,
  orderSyncReady: body.orderSyncReady === true,
  settlementSafeToClaim: body.settlementSafeToClaim === true,
  requiredTables: body.requiredTables || [],
  missingTables: body.missingTables || [],
  response: body,
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);

async function getJson(url, headers) {
  try {
    const response = await fetch(url, { headers });
    const text = await response.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text.slice(0, 1000) }; }
    return { ok: response.ok, status: response.status, json };
  } catch (error) {
    return { ok: false, status: 0, json: { error: error instanceof Error ? error.message : String(error) } };
  }
}

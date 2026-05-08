#!/usr/bin/env node

const API_URL = (process.env.API_URL || process.env.NESTJS_API_URL || "https://dbaronx-api-unified.onrender.com").replace(/\/$/, "");
const blockers = [];
const responseSnippets = {};
const fetchErrors = [];

function api(path) {
  const base = API_URL.endsWith("/api") ? API_URL.slice(0, -4) : API_URL;
  return `${base}/api${path}`;
}

function unwrap(body) {
  return body && typeof body === "object" && body.success === true && body.data ? body.data : body;
}

function snippet(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? null);
  return text.length > 900 ? `${text.slice(0, 900)}…` : text;
}

async function json(label, url, init = {}) {
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
    return { ok: response.ok, status: response.status, data: unwrap(body) };
  } catch (error) {
    const payload = { endpoint: url, errorMessage: error instanceof Error ? error.message : String(error) };
    fetchErrors.push(payload);
    return { ok: false, status: 0, data: payload };
  }
}

function addBlocker(blocker) {
  if (blocker && !blockers.includes(blocker)) blockers.push(blocker);
}

const readiness = await json("economic readiness", api("/payments/economic-readiness"));
const readinessBody = readiness.data || {};
if (!readiness.ok) addBlocker(`economic_readiness_http_${readiness.status}`);
if (readinessBody.verifiedWebhookRequired !== true) addBlocker("verified_webhook_not_required");
if (readinessBody.unsignedWebhookCanMarkPaid !== false) addBlocker("unsigned_webhook_can_mark_paid");
if (readinessBody.frontendRedirectCanMarkPaid !== false) addBlocker("frontend_redirect_can_mark_paid");

const dryRun = await json("economic dry run", api("/payments/economic-events/dry-run"), {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ eventType: "checkout.session.completed", sessionId: "dry-run-session" }),
});
const dryRunBody = dryRun.data || {};
if (!dryRun.ok) addBlocker(`economic_event_dry_run_http_${dryRun.status}`);
if (dryRunBody.paymentMarkedPaid === true || dryRunBody.orderCompleted === true) addBlocker("dry_run_mutated_paid_or_order_state");

const out = {
  success: blockers.length === 0,
  blockers,
  economicReadinessReady: readiness.ok && (readinessBody.ready === true || readinessBody.success === true),
  dryRunReady: dryRun.ok && dryRunBody.dryRun === true,
  verifiedWebhookRequired: readinessBody.verifiedWebhookRequired === true && dryRunBody.verifiedWebhookRequired === true,
  fakeSettlementBlocked: readinessBody.fakeSettlementBlocked === true && dryRunBody.fakeSettlementBlocked === true,
  paymentMarkedPaid: Boolean(dryRunBody.paymentMarkedPaid),
  orderCompleted: Boolean(dryRunBody.orderCompleted),
  responseSnippets,
  fetchErrors,
};

console.log(JSON.stringify(out, null, 2));
process.exit(out.success ? 0 : 1);

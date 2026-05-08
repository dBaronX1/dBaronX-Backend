#!/usr/bin/env node

const API_URL = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");

async function fetchJson(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "content-type": "application/json",
        ...(options.headers || {}),
      },
    });
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text.slice(0, 500) };
    }
    return { ok: response.ok, status: response.status, body, text };
  } catch (error) {
    return { ok: false, status: 0, body: { error: error instanceof Error ? error.message : String(error) }, text: "" };
  }
}

async function firstHealthy(paths) {
  const attempts = [];
  for (const path of paths) {
    const result = await fetchJson(path);
    attempts.push({ path, status: result.status, body: result.body });
    if (result.ok && (result.body?.success === true || result.body?.status === "ok" || result.body?.status === "healthy")) {
      return { ready: true, path, attempts };
    }
  }
  return { ready: false, path: null, attempts };
}

function payload(body) {
  return body?.data && typeof body.data === "object" ? body.data : body;
}

function sampleEvent(overrides = {}) {
  const stamp = Date.now();
  return {
    eventType: "commerce.checkout.payment_requested",
    sourceModule: "commerce",
    sourceRef: `smoke-cart-${stamp}`,
    userId: "smoke-user",
    accountId: "smoke-account",
    currency: "usd",
    amountMinorUnits: 1234,
    assetType: "fiat",
    paymentRail: "stripe",
    direction: "debit",
    status: "requested",
    idempotencyKey: `economic-smoke-${stamp}`,
    metadata: {
      dryRun: true,
      secretToken: "must-not-echo",
    },
    ...overrides,
  };
}

async function main() {
  const blockers = [];
  const health = await firstHealthy(["/api/health", "/health"]);
  const readiness = await fetchJson("/api/payments/economic-readiness");
  const readinessPayload = payload(readiness.body);

  const result = {
    success: false,
    blockers,
    apiReady: health.ready,
    economicReadinessReady: readiness.ok && (readinessPayload?.success === true || readiness.body?.success === true),
    supportedModules: readinessPayload?.supportedModules || [],
    supportedPaymentRails: readinessPayload?.supportedPaymentRails || [],
    fakeSettledRejected: false,
    orderSyncReady: readinessPayload?.orderSyncReady === true,
    ledgerReady: readinessPayload?.ledgerReady === true,
    walletReady: readinessPayload?.walletReady === true,
    payoutReady: readinessPayload?.payoutReady === true,
  };

  if (!result.apiReady) blockers.push("api_health_unavailable");
  if (!result.economicReadinessReady) blockers.push(`economic_readiness_failed_${readiness.status}`);
  if (Array.isArray(readinessPayload?.blockers)) blockers.push(...readinessPayload.blockers);

  const dryRun = await fetchJson("/api/payments/economic-events/dry-run", {
    method: "POST",
    body: JSON.stringify(sampleEvent()),
  });

  if (dryRun.status === 404) {
    blockers.push("economic_event_dry_run_endpoint_missing");
  } else if (!dryRun.ok || dryRun.body?.success !== true) {
    blockers.push(`economic_event_dry_run_failed_${dryRun.status}`);
  }

  const fakeSettled = await fetchJson("/api/payments/economic-events/dry-run", {
    method: "POST",
    body: JSON.stringify(sampleEvent({
      status: "settled",
      idempotencyKey: `economic-smoke-fake-settled-${Date.now()}`,
      metadata: { dryRun: true },
    })),
  });

  result.fakeSettledRejected = fakeSettled.status >= 400 && JSON.stringify(fakeSettled.body || {}).includes("verifier_evidence_required_for_verified_or_settled_status");
  if (!result.fakeSettledRejected) blockers.push("fake_settled_event_was_not_rejected");

  result.success = result.apiReady && result.economicReadinessReady && dryRun.ok && result.fakeSettledRejected;
  console.log(JSON.stringify(result, null, 2));
  if (!result.success) process.exitCode = 1;
}

main().catch((error) => {
  console.error(JSON.stringify({ success: false, blockers: ["economic_event_smoke_exception"], error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exitCode = 1;
});

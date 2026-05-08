#!/usr/bin/env node

const API_URL = (process.env.API_URL || "http://localhost:3001").replace(/\/$/, "");

async function get(path) {
  try {
    const response = await fetch(`${API_URL}${path}`);
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 500) }; }
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    return { ok: false, status: 0, body: { error: error instanceof Error ? error.message : String(error) } };
  }
}

function payload(body) {
  return body?.data && typeof body.data === "object" ? body.data : body;
}

const health = await get("/api/health");
const economic = await get("/api/payments/economic-readiness");
const economicPayload = payload(economic.body);
const result = {
  success: health.ok && economic.ok,
  blockers: [
    ...(health.ok ? [] : [`api_health_failed_${health.status}`]),
    ...(economic.ok ? [] : [`economic_readiness_failed_${economic.status}`]),
  ],
  apiReady: health.ok,
  economicReadinessReady: economic.ok,
  supportedPaymentRails: economicPayload?.supportedPaymentRails || [],
};
console.log(JSON.stringify(result, null, 2));
if (!result.success) process.exitCode = 1;

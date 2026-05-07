#!/usr/bin/env node

const apiUrl = (
  process.env.API_URL || process.env.API_BASE_URL || "http://localhost:3001"
).replace(/\/$/, "");
const timeoutMs = Number(process.env.SUPPLIER_SMOKE_TIMEOUT_MS || 10000);

function withTimeout(promise, label) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error(`${label}_timeout`)),
    timeoutMs,
  );
  return promise(controller.signal).finally(() => clearTimeout(timer));
}

async function getJson(path) {
  const url = `${apiUrl}${path}`;
  const response = await withTimeout(
    (signal) =>
      fetch(url, {
        method: "GET",
        headers: { accept: "application/json" },
        signal,
      }),
    path,
  );
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { ok: response.ok, status: response.status, json, text };
}

function responseContainsKnownSecret(payloadText) {
  const secretValues = [
    process.env.CJ_ACCESS_TOKEN,
    process.env.ALIEXPRESS_APP_SECRET,
    process.env.STRIPE_SECRET_KEY,
    process.env.INTERNAL_SERVICE_TOKEN,
  ].filter((value) => typeof value === "string" && value.trim().length >= 8);

  return secretValues.some((secret) => payloadText.includes(secret));
}

const blockers = [];
let apiReady = false;
let readiness = null;
let secretLeakDetected = false;

try {
  const health = await getJson("/api/health");
  apiReady = health.ok && health.json?.success === true;
  secretLeakDetected = secretLeakDetected || responseContainsKnownSecret(health.text);
  if (!apiReady) {
    blockers.push(`api_health_unavailable_${health.status}`);
  }
} catch (error) {
  blockers.push(`api_health_error:${error instanceof Error ? error.message : String(error)}`);
}

try {
  const readinessPath = process.env.CJ_ACCESS_TOKEN
    ? "/api/suppliers/readiness?cjPreflight=1"
    : "/api/suppliers/readiness";
  const response = await getJson(readinessPath);
  readiness = response.json;
  secretLeakDetected = secretLeakDetected || responseContainsKnownSecret(response.text);

  if (!response.ok) {
    blockers.push(`supplier_readiness_http_${response.status}`);
  }

  if (Array.isArray(readiness?.blockers)) {
    blockers.push(...readiness.blockers);
  } else {
    blockers.push("supplier_readiness_payload_invalid");
  }
} catch (error) {
  blockers.push(`supplier_readiness_error:${error instanceof Error ? error.message : String(error)}`);
}

if (secretLeakDetected) {
  blockers.push("secret_leak_detected");
}

const uniqueBlockers = [...new Set(blockers)];
const output = {
  success: apiReady && uniqueBlockers.length === 0,
  blockers: uniqueBlockers,
  apiReady,
  cjConfigured: readiness?.cjConfigured === true,
  aliexpressConfigured: readiness?.aliexpressConfigured === true,
  supplierImportReady: readiness?.success === true,
  secretLeakDetected,
};

console.log(JSON.stringify(output, null, 2));
process.exit(output.success ? 0 : 1);

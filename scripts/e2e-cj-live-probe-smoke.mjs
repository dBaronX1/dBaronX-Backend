#!/usr/bin/env node

const API_URL = (process.env.API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
const INTERNAL_SERVICE_TOKEN = (process.env.INTERNAL_SERVICE_TOKEN || "").trim();
const CJ_ACCESS_TOKEN = (process.env.CJ_ACCESS_TOKEN || "").trim();
const CJ_TEST_PRODUCT_ID = (process.env.CJ_TEST_PRODUCT_ID || "").trim();
const CJ_TEST_SKU = (process.env.CJ_TEST_SKU || "").trim();
const ALIEXPRESS_APP_SECRET = (process.env.ALIEXPRESS_APP_SECRET || "").trim();

const result = {
  success: false,
  blockers: [],
  apiReady: false,
  cjConfigured: false,
  cjLiveProbeAttempted: false,
  cjLiveProbeOk: false,
  supplierImportReady: false,
  secretLeakDetected: false,
  sanitizedErrors: true,
};

function endpoint(path) {
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function authHeaders(extra = {}) {
  return {
    ...(INTERNAL_SERVICE_TOKEN ? { "x-internal-token": INTERNAL_SERVICE_TOKEN } : {}),
    "x-request-id": `cj-live-probe-smoke-${Date.now()}`,
    ...extra,
  };
}

function detectSecretLeak(payload) {
  const serialized = JSON.stringify(payload);
  const secrets = [CJ_ACCESS_TOKEN, ALIEXPRESS_APP_SECRET].filter((secret) => secret.length > 0);
  return secrets.some((secret) => serialized.includes(secret));
}

function collectUnsanitizedErrors(payload) {
  const serialized = JSON.stringify(payload).toLowerCase();
  const unsafeMarkers = ["cj-access-token:", "cj_access_token=", "access_token="];
  return unsafeMarkers.filter((marker) => serialized.includes(marker));
}

async function readJson(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (_error) {
    return { raw: text };
  }
}

async function requestJson(path, options = {}) {
  const response = await fetch(endpoint(path), {
    method: options.method || "GET",
    headers: options.headers || {},
    body: options.body,
  });

  return {
    ok: response.ok,
    status: response.status,
    body: await readJson(response),
  };
}

function importReadinessPayload() {
  return {
    ...(CJ_TEST_PRODUCT_ID ? { productId: CJ_TEST_PRODUCT_ID } : {}),
    ...(CJ_TEST_SKU ? { sku: CJ_TEST_SKU } : {}),
  };
}

try {
  const health = await requestJson("/api/health");
  result.apiReady = health.ok && health.body?.success === true;

  if (!result.apiReady) {
    result.blockers.push(`api_health_failed_${health.status}`);
  }

  const readiness = await requestJson("/api/suppliers/readiness", { headers: authHeaders() });

  if (!readiness.ok) {
    result.blockers.push(`supplier_readiness_failed_${readiness.status}`);
  } else {
    result.blockers.push(...(Array.isArray(readiness.body?.blockers) ? readiness.body.blockers : []));
    result.cjConfigured = readiness.body?.cjConfigured === true;
    result.cjLiveProbeAttempted = readiness.body?.cjLiveProbeAttempted === true;
    result.cjLiveProbeOk = readiness.body?.cjLiveProbeOk === true;
  }

  const payloadsForLeakCheck = { health: health.body, readiness: readiness.body };

  if (CJ_TEST_PRODUCT_ID || CJ_TEST_SKU) {
    const importReadiness = await requestJson("/api/v1/suppliers/cj/import-readiness", {
      method: "POST",
      headers: authHeaders({ "content-type": "application/json" }),
      body: JSON.stringify(importReadinessPayload()),
    });

    payloadsForLeakCheck.importReadiness = importReadiness.body;

    if (!importReadiness.ok) {
      result.blockers.push(`cj_import_readiness_failed_${importReadiness.status}`);
    } else {
      result.blockers.push(...(Array.isArray(importReadiness.body?.blockers) ? importReadiness.body.blockers : []));
      result.supplierImportReady = importReadiness.body?.supplierImportReady === true;
    }
  }

  result.secretLeakDetected = detectSecretLeak(payloadsForLeakCheck);
  const unsanitizedErrors = collectUnsanitizedErrors(payloadsForLeakCheck);
  result.sanitizedErrors = unsanitizedErrors.length === 0;

  if (result.secretLeakDetected) {
    result.blockers.push("secret_leak_detected");
  }

  if (!result.sanitizedErrors) {
    result.blockers.push("unsanitized_error_detected");
  }

  result.blockers = [...new Set(result.blockers)];
  result.success = result.apiReady && result.blockers.length === 0 && result.secretLeakDetected === false && result.sanitizedErrors === true;

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
} catch (error) {
  result.blockers.push("cj_live_probe_smoke_exception");
  result.error = error instanceof Error ? error.message : String(error);
  result.secretLeakDetected = detectSecretLeak(result);
  result.sanitizedErrors = collectUnsanitizedErrors(result).length === 0;
  console.log(JSON.stringify(result, null, 2));
  process.exit(1);
}

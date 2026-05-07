#!/usr/bin/env node

const API_URL = (process.env.API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
const INTERNAL_SERVICE_TOKEN = (process.env.INTERNAL_SERVICE_TOKEN || "").trim();
const CJ_ACCESS_TOKEN = (process.env.CJ_ACCESS_TOKEN || "").trim();
const ALIEXPRESS_APP_SECRET = (process.env.ALIEXPRESS_APP_SECRET || "").trim();

const result = {
  success: false,
  blockers: [],
  apiReady: false,
  cjConfigured: false,
  aliexpressConfigured: false,
  supplierImportReady: false,
  secretLeakDetected: false,
};

function endpoint(path) {
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function authHeaders() {
  return INTERNAL_SERVICE_TOKEN
    ? { "x-internal-token": INTERNAL_SERVICE_TOKEN, "x-request-id": `supplier-smoke-${Date.now()}` }
    : { "x-request-id": `supplier-smoke-${Date.now()}` };
}

function detectSecretLeak(payload) {
  const serialized = JSON.stringify(payload);
  const secrets = [CJ_ACCESS_TOKEN, ALIEXPRESS_APP_SECRET].filter((secret) => secret.length > 0);
  return secrets.some((secret) => serialized.includes(secret));
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

async function getJson(path, options = {}) {
  const response = await fetch(endpoint(path), {
    method: "GET",
    headers: options.headers || {},
  });

  return {
    ok: response.ok,
    status: response.status,
    body: await readJson(response),
  };
}

try {
  const health = await getJson("/api/health");
  result.apiReady = health.ok && health.body?.success === true;

  if (!result.apiReady) {
    result.blockers.push(`api_health_failed_${health.status}`);
  }

  const readiness = await getJson("/api/suppliers/readiness", { headers: authHeaders() });

  if (!readiness.ok) {
    result.blockers.push(`supplier_readiness_failed_${readiness.status}`);
  } else {
    result.blockers.push(...(Array.isArray(readiness.body?.blockers) ? readiness.body.blockers : []));
    result.cjConfigured = readiness.body?.cjConfigured === true;
    result.aliexpressConfigured = readiness.body?.aliexpressConfigured === true;
    result.supplierImportReady = readiness.body?.success === true;
  }

  result.secretLeakDetected = detectSecretLeak({ health: health.body, readiness: readiness.body });

  if (result.secretLeakDetected) {
    result.blockers.push("secret_leak_detected");
  }

  if (CJ_ACCESS_TOKEN) {
    const preflight = await getJson("/api/suppliers/cj/preflight", { headers: authHeaders() });

    if (!preflight.ok) {
      result.blockers.push(`cj_preflight_failed_${preflight.status}`);
    } else {
      result.blockers.push(...(Array.isArray(preflight.body?.blockers) ? preflight.body.blockers : []));
      result.cjConfigured = preflight.body?.cjConfigured === true;
      result.secretLeakDetected = result.secretLeakDetected || detectSecretLeak(preflight.body);
    }
  }

  result.blockers = [...new Set(result.blockers)];
  result.success = result.apiReady && result.blockers.length === 0 && result.secretLeakDetected === false;

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
} catch (error) {
  result.blockers.push("supplier_readiness_smoke_exception");
  result.error = error instanceof Error ? error.message : String(error);
  result.secretLeakDetected = detectSecretLeak(result);
  console.log(JSON.stringify(result, null, 2));
  process.exit(1);
}

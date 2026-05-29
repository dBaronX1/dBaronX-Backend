#!/usr/bin/env node

const API_URL = (process.env.API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "https://dbaronx-api-unified-qo2j.onrender.com").replace(/\/$/, "");
const INTERNAL_SERVICE_TOKEN = (process.env.INTERNAL_SERVICE_TOKEN || "").trim();
const CJ_ACCESS_TOKEN = (process.env.CJ_ACCESS_TOKEN || "").trim();
const ALIEXPRESS_APP_SECRET = (process.env.ALIEXPRESS_APP_SECRET || "").trim();

const HEALTH_PATHS = ["/api/health", "/health", "/api/system/runtime-status", "/api/system/compatibility"];
const SNIPPET_LIMIT = 700;

const result = {
  success: false,
  blockers: [],
  apiReady: false,
  apiHealthPathsTried: [],
  supplierReadinessHttp: null,
  cjPreflightHttp: null,
  cjConfigured: false,
  aliexpressConfigured: false,
  supplierImportReady: false,
  secretLeakDetected: false,
  responseSnippets: {},
  fetchErrors: [],
};

function endpoint(path) {
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function requestHeaders() {
  return {
    "x-request-id": `supplier-smoke-${Date.now()}`,
    ...(INTERNAL_SERVICE_TOKEN ? { "x-internal-token": INTERNAL_SERVICE_TOKEN } : {}),
  };
}

function snippet(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? null);
  return text.length > SNIPPET_LIMIT ? `${text.slice(0, SNIPPET_LIMIT)}…` : text;
}

function detectSecretLeak(payload) {
  const serialized = JSON.stringify(payload);
  const secrets = [CJ_ACCESS_TOKEN, ALIEXPRESS_APP_SECRET].filter((secret) => secret.length > 0);
  return secrets.some((secret) => serialized.includes(secret));
}

function normalizeFetchError(error, request) {
  return {
    endpoint: request.url,
    method: request.method || "GET",
    errorName: error instanceof Error ? error.name : "NonErrorThrown",
    errorMessage: error instanceof Error ? error.message : String(error),
    cause: error instanceof Error && error.cause ? String(error.cause) : null,
  };
}

async function readBody(response) {
  const text = await response.text();
  if (!text) return { body: {}, text: "" };

  try {
    return { body: JSON.parse(text), text };
  } catch (_error) {
    return { body: { raw: text }, text };
  }
}

async function fetchJson(path, options = {}) {
  const method = options.method || "GET";
  const url = endpoint(path);
  try {
    const response = await fetch(url, {
      method,
      headers: options.headers || {},
      body: options.body,
    });
    const { body, text } = await readBody(response);
    return { ok: response.ok, status: response.status, body, text, path, url, method };
  } catch (error) {
    const fetchError = normalizeFetchError(error, { url, method });
    result.fetchErrors.push(fetchError);
    return { ok: false, status: 0, body: { message: fetchError.errorMessage }, text: fetchError.errorMessage, path, url, method };
  }
}

async function probeHealth() {
  for (const path of HEALTH_PATHS) {
    const probe = await fetchJson(path, { headers: requestHeaders() });
    result.apiHealthPathsTried.push({ path, status: probe.status, ok: probe.ok });
    result.responseSnippets[path] = snippet(probe.text || probe.body);

    const bodyReady = probe.body?.success === true || probe.body?.status === "ok" || probe.body?.status === "healthy";
    if (probe.ok && bodyReady) {
      result.apiReady = true;
      return probe;
    }
  }

  const statuses = result.apiHealthPathsTried.map((entry) => `${entry.path}:${entry.status}`).join(",");
  result.blockers.push(`api_health_failed_${statuses || "no_paths_tried"}`);
  return null;
}

try {
  await probeHealth();

  const readiness = await fetchJson("/api/suppliers/readiness", { headers: requestHeaders() });
  result.supplierReadinessHttp = readiness.status;
  result.responseSnippets["/api/suppliers/readiness"] = snippet(readiness.text || readiness.body);

  if (!readiness.ok) {
    result.blockers.push(`supplier_readiness_failed_${readiness.status}`);
  } else {
    result.blockers.push(...(Array.isArray(readiness.body?.blockers) ? readiness.body.blockers : []));
    result.cjConfigured = readiness.body?.cjConfigured === true;
    result.aliexpressConfigured = readiness.body?.aliexpressConfigured === true;
    result.supplierImportReady = readiness.body?.success === true;
  }

  const preflight = await fetchJson("/api/suppliers/cj/preflight", { headers: requestHeaders() });
  result.cjPreflightHttp = preflight.status;
  result.responseSnippets["/api/suppliers/cj/preflight"] = snippet(preflight.text || preflight.body);

  if (!preflight.ok) {
    result.blockers.push(`cj_preflight_failed_${preflight.status}`);
  } else {
    result.blockers.push(...(Array.isArray(preflight.body?.blockers) ? preflight.body.blockers : []));
    result.cjConfigured = preflight.body?.cjConfigured === true;
    result.supplierImportReady = result.supplierImportReady && preflight.body?.success === true;
  }

  result.secretLeakDetected = detectSecretLeak({ responseSnippets: result.responseSnippets, readiness: readiness.body, preflight: preflight.body });
  if (result.secretLeakDetected) result.blockers.push("secret_leak_detected");

  result.blockers = [...new Set(result.blockers)];
  result.success = result.apiReady && result.blockers.length === 0 && result.secretLeakDetected === false;

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
} catch (error) {
  result.blockers.push("supplier_readiness_smoke_exception");
  result.fetchErrors.push({
    endpoint: API_URL,
    method: "SMOKE",
    errorName: error instanceof Error ? error.name : "NonErrorThrown",
    errorMessage: error instanceof Error ? error.message : String(error),
    cause: error instanceof Error && error.cause ? String(error.cause) : null,
  });
  result.secretLeakDetected = detectSecretLeak(result);
  console.log(JSON.stringify(result, null, 2));
  process.exit(1);
}

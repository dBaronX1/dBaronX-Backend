#!/usr/bin/env node

const API_URL = (process.env.API_URL || "http://localhost:3001").replace(/\/$/, "");
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || "";
const CJ_TEST_PRODUCT_ID = process.env.CJ_TEST_PRODUCT_ID || "";
const CJ_TEST_SKU = process.env.CJ_TEST_SKU || "";
const SECRET_PATTERNS = [process.env.CJ_ACCESS_TOKEN, process.env.CJ_REFRESH_TOKEN, INTERNAL_SERVICE_TOKEN]
  .filter((value) => value && value.length >= 8);

function unwrap(payload) {
  return payload && typeof payload === "object" && payload.data && typeof payload.data === "object" ? payload.data : payload;
}

function secretLeakDetected(value) {
  const serialized = JSON.stringify(value || {});
  return SECRET_PATTERNS.some((secret) => serialized.includes(secret));
}

function sanitizedErrors(...payloads) {
  return payloads.flatMap((payload) => {
    const data = unwrap(payload) || {};
    return [
      data.cjLiveProbeErrorMessageSanitized,
      data.cjLookupErrorMessageSanitized,
      data.message,
    ].filter(Boolean);
  });
}

async function fetchJson(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, options);
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { parseError: text.slice(0, 240) };
  }
  return { response, payload };
}

const readiness = await fetchJson("/api/suppliers/readiness", {
  headers: { accept: "application/json" },
});

let importReadiness = null;
const importBody = CJ_TEST_PRODUCT_ID
  ? { productId: CJ_TEST_PRODUCT_ID }
  : CJ_TEST_SKU
    ? { sku: CJ_TEST_SKU }
    : null;

if (importBody) {
  importReadiness = await fetchJson("/api/v1/suppliers/cj/import-readiness", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-internal-token": INTERNAL_SERVICE_TOKEN,
    },
    body: JSON.stringify(importBody),
  });
}

const readinessData = unwrap(readiness.payload) || {};
const importData = importReadiness ? unwrap(importReadiness.payload) || {} : {};
const blockers = [
  ...(readinessData.blockers || []),
  ...(importReadiness ? importData.blockers || [] : []),
];
const leaked = secretLeakDetected(readiness.payload) || secretLeakDetected(importReadiness?.payload);
const output = {
  success: readiness.response.ok && !leaked && (!importReadiness || importReadiness.response.ok),
  blockers: [...new Set(blockers)],
  cjConfigured: Boolean(readinessData.cjConfigured),
  cjLiveProbeAttempted: Boolean(readinessData.cjLiveProbeAttempted),
  cjLiveProbeOk: Boolean(readinessData.cjLiveProbeOk),
  supplierImportReady: Boolean(importData.supplierImportReady),
  secretLeakDetected: leaked,
  sanitizedErrors: sanitizedErrors(readiness.payload, importReadiness?.payload),
};

console.log(JSON.stringify(output, null, 2));
if (!output.success) process.exitCode = 1;

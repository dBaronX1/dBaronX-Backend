#!/usr/bin/env node
const requiredBaseUrl = "https://dbaronx-api-unified-qo2j.onrender.com";
const failures = [];
const assert = (condition, code) => { if (!condition) failures.push(code); };

function requireLiveGate() {
  assert(process.env.RUN_LIVE_SMOKE === "1", "RUN_LIVE_SMOKE_not_enabled");
  assert(process.env.API_BASE_URL === requiredBaseUrl, "API_BASE_URL_must_match_production_api");
  if (failures.length) finish();
  return process.env.API_BASE_URL.replace(/\/$/, "");
}

async function getJson(url) {
  const response = await fetch(url, { method: "GET", headers: { accept: "application/json" } });
  const text = await response.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { failures.push(`invalid_json_${url}`); }
  return { status: response.status, json, text };
}

function containsRawInternal(value) {
  const raw = JSON.stringify(value || {});
  return [["Medusa bridge", "request failed"].join(" "), "supabase_error", "database_error", "internal_service_error", "service_role_missing", "jwt_error", "unexpected_error", "failed_to_fetch", "TypeError", "NetworkError"].some((needle) => raw.includes(needle));
}

function finish() {
  if (failures.length) {
    console.error("Live API catalog contract smoke failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log("Live API catalog contract smoke passed.");
}

const baseUrl = requireLiveGate();
const readiness = await getJson(`${baseUrl}/api/catalog/readiness`);
assert(readiness.status < 500, "catalog_readiness_5xx");
assert(readiness.json && typeof readiness.json === "object", "catalog_readiness_missing_json");
assert(!containsRawInternal(readiness.json), "catalog_readiness_exposes_raw_internal_error");
assert("productCount" in (readiness.json || {}), "catalog_readiness_productCount_missing");
assert("blockers" in (readiness.json || {}), "catalog_readiness_blockers_missing");

const products = await getJson(`${baseUrl}/api/catalog/products?limit=50`);
assert(products.status < 500, "catalog_products_5xx");
assert(products.json && Array.isArray(products.json.products), "catalog_products_array_missing");
assert(!containsRawInternal(products.json), "catalog_products_exposes_raw_internal_error");
if (Number(readiness.json?.productCount || 0) > 0) {
  assert(Number(products.json?.count || products.json?.products?.length || 0) > 0, "catalog_products_empty_while_readiness_has_products");
}
for (const [index, product] of (products.json?.products || []).entries()) {
  assert(product.variantId, `catalog_product_${index}_variantId_missing`);
  assert(Number(product.priceMinor) > 0, `catalog_product_${index}_price_missing`);
  assert(product.thumbnail || (Array.isArray(product.images) && product.images.length > 0), `catalog_product_${index}_image_missing`);
}
finish();

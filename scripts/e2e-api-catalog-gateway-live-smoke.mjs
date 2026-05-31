#!/usr/bin/env node

const API_BASE_URL = (process.env.API_BASE_URL || process.env.NESTJS_BASE_URL || 'https://dbaronx-api-unified-qo2j.onrender.com').replace(/\/+$/, '');
const SHIRT_HANDLE = 'mens-cotton-linen-long-sleeve-casual-shirt';
const SUPPLIER_COST_PATTERN = /(supplier(price|cost)|shippingcost|shipping_cost|costminor|cost_minor|totalcost|total_cost|internal|secret|token|api[_-]?key|service[_-]?role|database[_-]?url)/i;

const blockers = [];

async function getJson(path) {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  let body;
  try {
    body = await response.json();
  } catch (error) {
    throw new Error(`${path} returned non-json status=${response.status}: ${error.message}`);
  }
  if (!response.ok) {
    throw new Error(`${path} returned status=${response.status}: ${JSON.stringify(body).slice(0, 500)}`);
  }
  return body;
}

function productsFrom(payload) {
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.data?.products)) return payload.data.products;
  if (payload?.product) return [payload.product];
  return [];
}

function scanForbiddenKeys(value, path = '$', hits = []) {
  if (!value || typeof value !== 'object') return hits;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForbiddenKeys(item, `${path}[${index}]`, hits));
    return hits;
  }
  for (const [key, nested] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (SUPPLIER_COST_PATTERN.test(key)) hits.push(nextPath);
    scanForbiddenKeys(nested, nextPath, hits);
  }
  return hits;
}

function hasPositivePrice(product) {
  return Number(product?.priceMinor) > 0;
}

function hasVariantId(product) {
  return typeof product?.variantId === 'string' && product.variantId.length > 0;
}

function isFirstCjProduct(product) {
  return product?.handle === SHIRT_HANDLE || (product?.supplier === 'cj' && product?.manualCurated === true && product?.buyable === true);
}

try {
  const readiness = await getJson('/api/catalog/readiness');
  if (readiness.medusaReachable !== true) blockers.push('medusaReachable_not_true');
  if (readiness.productsVisible !== true) blockers.push('productsVisible_not_true');
  if (readiness.firstCjProductVisible !== true) blockers.push('firstCjProductVisible_not_true');
  if (Array.isArray(readiness.blockers) && readiness.blockers.length > 0) blockers.push(`readiness_blockers_${readiness.blockers.join(',')}`);

  const productsPayload = await getJson('/api/catalog/products');
  const products = productsFrom(productsPayload);
  if (!products.length) blockers.push('products_endpoint_empty');
  if (!products.some(isFirstCjProduct)) blockers.push('first_cj_product_missing_from_products_endpoint');
  if (!products.some(hasVariantId)) blockers.push('no_product_has_variantId');
  if (!products.some(hasPositivePrice)) blockers.push('no_product_has_positive_priceMinor');

  const detailPayload = await getJson(`/api/catalog/products/${SHIRT_HANDLE}`);
  const detailProducts = productsFrom(detailPayload);
  if (!detailProducts.some((product) => product?.handle === SHIRT_HANDLE)) blockers.push('shirt_detail_handle_missing');
  if (!detailProducts.some(hasVariantId)) blockers.push('shirt_detail_missing_variantId');
  if (!detailProducts.some(hasPositivePrice)) blockers.push('shirt_detail_missing_positive_priceMinor');

  const forbiddenHits = scanForbiddenKeys({ readiness, productsPayload, detailPayload });
  if (forbiddenHits.length) blockers.push(`supplier_or_internal_cost_exposed:${[...new Set(forbiddenHits)].slice(0, 10).join(',')}`);

  const result = {
    success: blockers.length === 0,
    apiBaseUrl: API_BASE_URL,
    medusaReachable: readiness.medusaReachable === true,
    productsVisible: readiness.productsVisible === true,
    firstCjProductVisible: readiness.firstCjProductVisible === true,
    productCount: products.length,
    hasVariantId: products.some(hasVariantId) || detailProducts.some(hasVariantId),
    hasPositivePriceMinor: products.some(hasPositivePrice) || detailProducts.some(hasPositivePrice),
    supplierCostExposed: forbiddenHits.length > 0,
    blockers,
  };
  console.log(JSON.stringify(result, null, 2));
  process.exit(blockers.length ? 1 : 0);
} catch (error) {
  blockers.push(error.message || String(error));
  console.log(JSON.stringify({ success: false, apiBaseUrl: API_BASE_URL, blockers }, null, 2));
  process.exit(1);
}

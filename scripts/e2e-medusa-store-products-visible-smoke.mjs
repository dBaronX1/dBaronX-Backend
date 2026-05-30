#!/usr/bin/env node

const MEDUSA_BASE_URL = cleanBaseUrl(process.env.MEDUSA_BASE_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'https://dbaronx-medusa-xrwh.onrender.com');
const MEDUSA_PUBLISHABLE_KEY = clean(process.env.MEDUSA_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || process.env.PUBLIC_MEDUSA_PUBLISHABLE_KEY || '');
const EXPECTED_SHIRT_HANDLE = 'mens-cotton-linen-long-sleeve-casual-shirt';
const MIN_MANUAL_CJ_BUYABLE = Number(process.env.DBX_MIN_MANUAL_CJ_BUYABLE || 8);

const blockers = [];
const warnings = [];

if (!MEDUSA_PUBLISHABLE_KEY) blockers.push('MEDUSA_PUBLISHABLE_KEY_missing');
if (!MEDUSA_BASE_URL) blockers.push('MEDUSA_BASE_URL_missing');

let products = [];
let status = 0;
if (!blockers.length) {
  const url = new URL('/store/products', MEDUSA_BASE_URL);
  url.searchParams.set('limit', process.env.DBX_STORE_PRODUCTS_LIMIT || '100');
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
    },
  });
  status = response.status;
  const payload = await response.json().catch(() => null);
  if (!response.ok) blockers.push(`store_products_http_${response.status}`);
  products = extractProducts(payload);
}

if (products.length === 0) blockers.push('store_products_empty');

const productCandidates = products.map(productCandidate).filter(Boolean);
const buyableManualCjProducts = products.filter(isBuyableManualCjProduct);
const draftIncompleteProducts = products.filter(isDraftIncompleteProduct);
const shirt = products.find((product) => product.handle === EXPECTED_SHIRT_HANDLE);
const nonShirt = products.find((product) => product.handle && product.handle !== EXPECTED_SHIRT_HANDLE && isBuyableProduct(product));

if (!shirt) blockers.push('expected_shirt_handle_missing');
if (!nonShirt) blockers.push('non_shirt_buyable_product_missing');
if (buyableManualCjProducts.length > 0 && buyableManualCjProducts.length < MIN_MANUAL_CJ_BUYABLE) blockers.push(`manual_cj_buyable_count_lt_${MIN_MANUAL_CJ_BUYABLE}`);
if (buyableManualCjProducts.length === 0) warnings.push('manual_cj_metadata_not_available_or_no_buyable_manual_cj_products_detected');
if (draftIncompleteProducts.some(isBuyableManualCjProduct)) blockers.push('draft_incomplete_product_counted_buyable');

for (const candidate of productCandidates.filter((candidate) => candidate.buyable).slice(0, MIN_MANUAL_CJ_BUYABLE || 8)) {
  if (!candidate.imagePresent) blockers.push(`image_missing:${candidate.handle || candidate.id}`);
  if (!candidate.variantPresent) blockers.push(`variant_missing:${candidate.handle || candidate.id}`);
  if (!candidate.pricePresent) blockers.push(`price_missing:${candidate.handle || candidate.id}`);
  if (!candidate.supplierMetadataPresent) blockers.push(`supplier_metadata_missing:${candidate.handle || candidate.id}`);
  if (!candidate.sourceUrlPresent) blockers.push(`source_url_missing:${candidate.handle || candidate.id}`);
}

const out = {
  success: blockers.length === 0,
  medusaBaseUrl: MEDUSA_BASE_URL,
  status,
  productCount: products.length,
  buyableManualCjCount: buyableManualCjProducts.length,
  draftIncompleteCount: draftIncompleteProducts.length,
  shirtHandlePresent: Boolean(shirt),
  nonShirtBuyableHandle: nonShirt?.handle || null,
  productCandidates,
  blockers,
  warnings,
};
console.log(JSON.stringify(out, null, 2));
if (blockers.length) process.exit(1);

function clean(value) { return String(value || '').trim(); }
function cleanBaseUrl(value) { return clean(value).replace(/\/+$/, ''); }
function metadata(product) { return product?.metadata && typeof product.metadata === 'object' ? product.metadata : {}; }
function array(value) { return Array.isArray(value) ? value : []; }
function firstString(...values) { return values.find((value) => typeof value === 'string' && value.trim())?.trim() || ''; }
function extractProducts(payload) {
  const root = payload && typeof payload === 'object' ? payload : {};
  const nested = root.data && typeof root.data === 'object' ? root.data : root;
  for (const key of ['products', 'items', 'data']) if (Array.isArray(nested[key])) return nested[key].filter((item) => item && typeof item === 'object');
  return nested.product && typeof nested.product === 'object' ? [nested.product] : [];
}
function imagePresent(product) {
  return Boolean(firstString(product.thumbnail, product.image, product.image_url) || array(product.images).some((image) => firstString(image?.url, image)));
}
function variantPresent(product) { return array(product.variants).some((variant) => firstString(variant?.id)); }
function variantPricePresent(variant) {
  const calculated = variant?.calculated_price && typeof variant.calculated_price === 'object' ? variant.calculated_price : {};
  if (Number(calculated.calculated_amount || calculated.amount || 0) > 0) return true;
  return array(variant?.prices).some((price) => Number(price?.amount || 0) > 0);
}
function pricePresent(product) { return Number(product.priceMinor || product.price_minor || 0) > 0 || array(product.variants).some(variantPricePresent); }
function supplierMetadataPresent(product) {
  const m = metadata(product);
  return Boolean(firstString(product.supplier, product.supplierProductId, product.supplier_product_id, product.supplierSku, product.supplier_sku, m.supplier, m.supplierProductId, m.supplier_product_id, m.supplierSku, m.supplier_sku, m.source, m.sourceUrl, m.source_url));
}
function sourceUrlPresent(product) {
  const m = metadata(product);
  return /^https?:\/\//.test(firstString(product.sourceUrl, product.source_url, m.sourceUrl, m.source_url, m.externalUrl, m.external_url, m.cjProductUrl, m.cj_product_url));
}
function isDraftIncompleteProduct(product) {
  const m = metadata(product);
  return m.realSupplierProduct === false || ['draft_pending_verification', 'manual_draft_incomplete'].includes(String(m.supplierVerificationStatus || m.verificationStatus || '')) || product.status === 'draft';
}
function isBuyableManualCjProduct(product) {
  const m = metadata(product);
  return Boolean(
    m.demo === false &&
    m.realSupplierProduct === true &&
    (m.supplier === 'cj' || product.supplier === 'cj') &&
    m.manualCurated === true &&
    m.buyable === true &&
    m.supplierVerificationStatus === 'manual_verified_for_checkout' &&
    !isDraftIncompleteProduct(product) &&
    imagePresent(product) && variantPresent(product) && pricePresent(product)
  );
}
function isBuyableProduct(product) {
  return !isDraftIncompleteProduct(product) && imagePresent(product) && variantPresent(product) && pricePresent(product);
}
function productCandidate(product) {
  if (!product || typeof product !== 'object') return null;
  const m = metadata(product);
  return {
    id: firstString(product.id),
    handle: firstString(product.handle),
    title: firstString(product.title, product.name),
    status: firstString(product.status),
    buyable: isBuyableProduct(product),
    manualCjBuyable: isBuyableManualCjProduct(product),
    draftIncomplete: isDraftIncompleteProduct(product),
    imagePresent: imagePresent(product),
    variantPresent: variantPresent(product),
    pricePresent: pricePresent(product),
    supplierMetadataPresent: supplierMetadataPresent(product),
    sourceUrlPresent: sourceUrlPresent(product),
    supplier: firstString(product.supplier, m.supplier, m.source),
    supplierProductIdPresent: Boolean(firstString(product.supplierProductId, product.supplier_product_id, m.supplierProductId, m.supplier_product_id)),
    supplierSkuPresent: Boolean(firstString(product.supplierSku, product.supplier_sku, m.supplierSku, m.supplier_sku)),
  };
}

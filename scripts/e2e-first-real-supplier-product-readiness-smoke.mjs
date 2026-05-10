#!/usr/bin/env node
const MEDUSA_BASE_URL = normalizeBaseUrl(process.env.MEDUSA_BASE_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000');
const WEB_BASE_URL = normalizeBaseUrl(process.env.WEB_BASE_URL || process.env.NEXT_PUBLIC_WEB_BASE_URL || 'http://localhost:3000');
const MEDUSA_PUBLISHABLE_KEY = process.env.MEDUSA_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';
const DEFAULT_REGION_ID = process.env.MEDUSA_REGION_ID || '';

const blockers = [];
const responseSnippets = {};

const productsResponse = await getJson(`${MEDUSA_BASE_URL}/store/products?limit=20`, 'storeProducts', medusaHeaders());
if (!productsResponse.ok) addBlocker('medusa_store_api_unreachable');

const products = extractProducts(productsResponse.json);
const draftProduct = products.find((product) => isDraftSupplierProduct(product)) || null;
const verifiedProduct = products.find((product) => isVerifiedSupplierProduct(product)) || null;
const realProduct = verifiedProduct;
if (!verifiedProduct) addBlocker('verified_supplier_product_missing');

const draftMetadata = metadataOf(draftProduct);
const verifiedMetadata = metadataOf(verifiedProduct);
const supplierVerificationStatus = safeString(verifiedMetadata.supplierVerificationStatus || draftMetadata.supplierVerificationStatus || '');
const supplierVerificationBlockers = normalizeBlockers(verifiedMetadata.supplierVerificationBlockers || verifiedMetadata.blockers || draftMetadata.supplierVerificationBlockers || draftMetadata.blockers || []);
if (draftProduct && !verifiedProduct) addBlocker('draft_supplier_product_pending_verification');

const variant = firstVariant(realProduct);
const productId = realProduct?.id || null;
const variantId = variant?.id || null;
const handle = realProduct?.handle || null;
const title = realProduct?.title || realProduct?.name || null;
const metadata = metadataOf(realProduct);
const supplier = safeString(metadata.supplier || metadata.supplier_name || metadata.supplier_id || metadata.source || '');
const supplierProductIdPresent = Boolean(safeString(metadata.supplierProductId || metadata.supplier_product_id || metadata.cj_product_id || metadata.external_id));
const priceReady = Boolean(variant && hasPrice(variant));
const stockReady = Boolean(variant && hasAvailabilityProof(variant));
const productUrl = productUrlFor(realProduct);
const productUrlReady = Boolean(productUrl && handle);
const draftSupplierProductPresent = Boolean(draftProduct);
const verifiedSupplierProductPresent = Boolean(verifiedProduct);
const realSupplierProductPresent = verifiedSupplierProductPresent;
const telegramDiscoveryReady = Boolean(products.length > 0 && realProduct && !products.every(isDemoProduct));

if (!variantId) addBlocker('variant_missing');
if (!supplier) addBlocker('supplier_metadata_missing');
if (!supplierProductIdPresent) addBlocker('supplier_product_id_missing');
if (!priceReady) addBlocker('price_missing');
if (!stockReady) addBlocker('stock_or_availability_proof_missing');
if (!productUrlReady) addBlocker('product_url_missing');
if (!telegramDiscoveryReady) addBlocker('telegram_discovery_would_classify_all_products_demo');

const shipping = await verifyShippingOptionForCart(variantId);
if (!shipping.shippingOptionVisible) addBlocker(shipping.blocker || 'shipping_option_not_visible_for_cart');
const checkoutPathReady = Boolean(realSupplierProductPresent && variantId && priceReady && stockReady && productUrlReady && shipping.shippingOptionVisible);

const result = {
  success: blockers.length === 0,
  blockers,
  draftSupplierProductPresent,
  verifiedSupplierProductPresent,
  realSupplierProductPresent,
  supplierVerificationStatus: supplierVerificationStatus || null,
  supplierVerificationBlockers,
  productId,
  variantId,
  handle,
  title,
  supplier: supplier || null,
  supplierProductIdPresent,
  priceReady,
  stockReady,
  productUrlReady,
  checkoutPathReady,
  telegramDiscoveryReady,
  nextManualStep: nextManualStep(),
  responseSnippets,
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);

function normalizeBaseUrl(value) { return String(value || '').trim().replace(/\/+$/, ''); }
function addBlocker(blocker) { if (blocker && !blockers.includes(blocker)) blockers.push(blocker); }
function safeString(value) { return String(value || '').trim(); }
function metadataOf(product) { return product && typeof product.metadata === 'object' && product.metadata ? product.metadata : {}; }
function extractProducts(payload) {
  const data = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
  for (const key of ['products', 'items', 'data']) {
    if (Array.isArray(data?.[key])) return data[key].filter((item) => item && typeof item === 'object');
  }
  return [];
}
function firstVariant(product) { return Array.isArray(product?.variants) ? product.variants.find((v) => v && typeof v === 'object') || null : null; }
function isExplicitReal(product) {
  const metadata = metadataOf(product);
  return metadata.realSupplierProduct === true && metadata.demo === false && metadata.supplierVerificationStatus === 'verified_for_checkout';
}
function isDraftSupplierProduct(product) {
  const metadata = metadataOf(product);
  return Boolean(product && metadata.demo === false && metadata.realSupplierProduct === false && metadata.supplierVerificationStatus === 'draft_pending_verification' && hasSupplierSignal(product));
}
function isVerifiedSupplierProduct(product) {
  return Boolean(product && !isDemoProduct(product) && isExplicitReal(product) && hasSupplierSignal(product));
}
function normalizeBlockers(value) {
  if (Array.isArray(value)) return value.map((item) => safeString(item)).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
}
function isDemoProduct(product) {
  if (isExplicitReal(product)) return false;
  const metadata = metadataOf(product);
  if (metadata.demo === true || metadata.realSupplierProduct === false) return true;
  const values = [product?.title, product?.name, product?.handle, product?.id, metadata.source, metadata.supplier, metadata.supplier_name, metadata.environment, metadata.type];
  return /\b(demo|sample|mock|test product)\b/i.test(values.map((value) => String(value || '')).join(' '));
}
function hasSupplierSignal(product) {
  const metadata = metadataOf(product);
  const values = [metadata.supplier, metadata.supplier_name, metadata.supplier_id, metadata.source, metadata.supplierProductId, metadata.supplier_product_id, metadata.cj_product_id, metadata.external_id, metadata.supplierSku, metadata.supplier_sku, metadata.sourceUrl];
  return values.some((value) => safeString(value) && !/\bdemo\b/i.test(String(value)));
}
function isRealSupplierProduct(product) { return isVerifiedSupplierProduct(product); }
function hasPrice(variant) {
  const calculated = variant.calculated_price;
  if (calculated && typeof calculated === 'object') {
    const amount = calculated.calculated_amount ?? calculated.amount;
    if (Number(amount) > 0) return true;
  }
  return Array.isArray(variant.prices) && variant.prices.some((price) => Number(price?.amount) > 0);
}
function hasAvailabilityProof(variant) {
  if (variant.manage_inventory === false) return true;
  if (Number(variant.inventory_quantity) > 0) return true;
  if (Number(variant.stocked_quantity) > 0 || Number(variant.available_quantity) > 0) return true;
  return false;
}
function productUrlFor(product) {
  const ref = safeString(product?.handle || product?.id);
  return ref ? `${WEB_BASE_URL}/products/${encodeURIComponent(ref)}` : null;
}
function medusaHeaders(extra = {}) {
  const headers = { ...extra };
  if (MEDUSA_PUBLISHABLE_KEY) headers['x-publishable-api-key'] = MEDUSA_PUBLISHABLE_KEY;
  return { headers };
}
async function verifyShippingOptionForCart(currentVariantId) {
  if (!currentVariantId) return { shippingOptionVisible: false, blocker: 'variant_missing_for_cart_shipping_check' };
  const regions = await getJson(`${MEDUSA_BASE_URL}/store/regions?limit=20`, 'storeRegions', medusaHeaders());
  const regionId = DEFAULT_REGION_ID || regions.json?.regions?.[0]?.id || regions.json?.data?.regions?.[0]?.id || regions.json?.data?.[0]?.id || regions.json?.regions?.[0]?.id;
  if (!regionId) return { shippingOptionVisible: false, blocker: regions.ok ? 'region_missing_for_cart_shipping_check' : 'region_api_unreachable' };

  const cart = await postJson(`${MEDUSA_BASE_URL}/store/carts`, 'createCart', { region_id: regionId, items: [{ variant_id: currentVariantId, quantity: 1 }] });
  const cartId = cart.json?.cart?.id || cart.json?.data?.cart?.id || cart.json?.id || cart.json?.data?.id;
  if (!cart.ok || !cartId) return { shippingOptionVisible: false, blocker: 'cart_create_failed_for_shipping_check' };

  const options = await getJson(`${MEDUSA_BASE_URL}/store/shipping-options?cart_id=${encodeURIComponent(cartId)}`, 'shippingOptionsForCart', medusaHeaders());
  const list = Array.isArray(options.json?.shipping_options) ? options.json.shipping_options : Array.isArray(options.json?.data?.shipping_options) ? options.json.data.shipping_options : Array.isArray(options.json?.data) ? options.json.data : [];
  return { shippingOptionVisible: options.ok && list.length > 0, blocker: options.ok ? 'shipping_option_empty_for_cart' : 'shipping_option_api_unreachable' };
}
async function getJson(url, label, init = {}) {
  try {
    const response = await fetch(url, init);
    const text = await response.text();
    responseSnippets[label] = snippet(text);
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    return { ok: response.ok, status: response.status, json };
  } catch (error) {
    responseSnippets[label] = error.name;
    return { ok: false, status: 0, json: null };
  }
}
async function postJson(url, label, body) {
  try {
    const response = await fetch(url, { ...medusaHeaders({ 'content-type': 'application/json' }), method: 'POST', body: JSON.stringify(body) });
    const text = await response.text();
    responseSnippets[label] = snippet(text);
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    return { ok: response.ok, status: response.status, json };
  } catch (error) {
    responseSnippets[label] = error.name;
    return { ok: false, status: 0, json: null };
  }
}
function snippet(value) {
  let text = String(value || '');
  for (const key of ['MEDUSA_PUBLISHABLE_KEY', 'NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY']) {
    const secret = process.env[key];
    if (secret) text = text.replaceAll(secret, '<redacted>');
  }
  return text.length > 900 ? `${text.slice(0, 900)}…` : text;
}
function nextManualStep() {
  if (draftSupplierProductPresent && !verifiedSupplierProductPresent) return `Verify the draft supplier product before live checkout: add image URL, confirm stock quantity, shipping countries, and delivery estimate, then rerun the seed in publish mode.`;
  if (blockers.length) return `Resolve blockers before first real checkout: ${blockers.join(', ')}.`;
  return `Open ${productUrl}, add the item to cart, run Stripe test checkout, then proceed to live money only after signed webhook/order proof is verified.`;
}

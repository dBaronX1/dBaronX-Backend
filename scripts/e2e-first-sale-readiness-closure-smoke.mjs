#!/usr/bin/env node
const EXPECTED = {
  medusaBaseUrl: 'https://dbaronx-medusa-xrwh.onrender.com',
  apiBaseUrl: 'https://dbaronx-api-unified-qo2j.onrender.com',
  fastapiBaseUrl: 'https://dbaronx-fastapi-5ci9.onrender.com',
  botBaseUrl: 'https://dbaronx-telegram-bot.onrender.com',
  handle: 'mens-cotton-linen-long-sleeve-casual-shirt',
  supplier: 'cj',
  supplierProductId: '2408300732091605000',
  supplierSku: 'CJDS212420104DW',
};

const MEDUSA_BASE_URL = base(process.env.MEDUSA_BASE_URL || EXPECTED.medusaBaseUrl);
const API_BASE_URL = base(process.env.API_BASE_URL || EXPECTED.apiBaseUrl);
const FASTAPI_BASE_URL = base(process.env.FASTAPI_BASE_URL || EXPECTED.fastapiBaseUrl);
const BOT_BASE_URL = base(process.env.BOT_BASE_URL || EXPECTED.botBaseUrl);
const WEB_BASE_URL = base(process.env.WEB_BASE_URL || process.env.NEXT_PUBLIC_WEB_BASE_URL || '');
const MEDUSA_PUBLISHABLE_KEY = clean(process.env.MEDUSA_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || process.env.PUBLIC_MEDUSA_PUBLISHABLE_KEY);

const blockers = [];
const warnings = [];
const attemptedEndpoints = [];
const responseSnippets = {};
const addBlocker = (value) => { if (value && !blockers.includes(value)) blockers.push(value); };
const addWarning = (value) => { if (value && !warnings.includes(value)) warnings.push(value); };

if (MEDUSA_BASE_URL !== EXPECTED.medusaBaseUrl) addBlocker('medusa_live_url_incorrect');
if (API_BASE_URL !== EXPECTED.apiBaseUrl) addBlocker('api_live_url_incorrect');
if (FASTAPI_BASE_URL !== EXPECTED.fastapiBaseUrl) addBlocker('fastapi_live_url_incorrect');
if (BOT_BASE_URL !== EXPECTED.botBaseUrl) addBlocker('telegram_live_url_incorrect');
if (!MEDUSA_PUBLISHABLE_KEY) addBlocker('medusa_publishable_key_missing');

const productsUrl = `${MEDUSA_BASE_URL}/store/products?handle=${encodeURIComponent(EXPECTED.handle)}&limit=5`;
attemptedEndpoints.push(productsUrl);
const productsResponse = await getJson(productsUrl, 'medusaProductsByHandle', medusaHeaders());
if (!productsResponse.ok) addBlocker('medusa_store_products_endpoint_unreachable');
const products = extractProducts(productsResponse.json);
if (productsResponse.ok && products.length === 0) addBlocker('first_cj_product_not_seeded');
const product = products.find(isExpectedProduct) || products[0] || null;
if (!product) addBlocker('first_cj_product_missing');
if (product && !isExpectedProduct(product)) addBlocker('first_cj_product_identity_mismatch');

const metadata = metadataOf(product);
const variant = firstVariant(product);
const variantMetadata = metadataOf(variant);
const realSupplierProduct = metadata.realSupplierProduct === true;
const notDemo = metadata.demo === false && !isDemoProduct(product);
const variantExists = Boolean(variant?.id);
const priceExists = firstPriceAmount(variant) > 0;
const stockExists = stockReady(product, variant);
const imageReady = Boolean(clean(product?.thumbnail) || (Array.isArray(product?.images) && product.images.some((image) => clean(image?.url))));
const productUrl = WEB_BASE_URL ? `${WEB_BASE_URL}/products/${encodeURIComponent(EXPECTED.handle)}` : '';
const productUrlReady = Boolean(productUrl);
const telegramDiscoveryReady = Boolean(product && realSupplierProduct && notDemo && metadata.supplierVerificationStatus === 'verified_for_checkout' && supplierSignal(product));
const stripeCheckoutCandidateReady = Boolean(product && variantExists && priceExists && stockExists && realSupplierProduct && notDemo);

if (product && !realSupplierProduct) addBlocker('first_cj_product_real_supplier_flag_missing');
if (product && !notDemo) addBlocker('first_cj_product_demo_or_not_real');
if (!variantExists) addBlocker('variant_missing');
if (!priceExists) addBlocker('price_missing');
if (!stockExists) addBlocker('stock_missing');
if (!imageReady) addBlocker('image_missing');
if (!productUrlReady) addBlocker('product_url_missing');
if (!telegramDiscoveryReady) addBlocker('telegram_discovery_not_real');
if (!stripeCheckoutCandidateReady) addBlocker('stripe_checkout_product_variant_candidate_missing');

let shippingOptionVisible = false;
if (variant?.id) {
  const regionsUrl = `${MEDUSA_BASE_URL}/store/regions?limit=20`;
  attemptedEndpoints.push(regionsUrl);
  const regions = await getJson(regionsUrl, 'medusaRegions', medusaHeaders());
  const regionId = regions.json?.regions?.[0]?.id || regions.json?.data?.regions?.[0]?.id || regions.json?.data?.[0]?.id || null;
  if (!regionId) {
    addBlocker(regions.ok ? 'region_missing_for_shipping_option_check' : 'regions_endpoint_unreachable');
  } else {
    const cartUrl = `${MEDUSA_BASE_URL}/store/carts`;
    attemptedEndpoints.push(cartUrl);
    const cart = await postJson(cartUrl, 'createCart', { region_id: regionId, items: [{ variant_id: variant.id, quantity: 1 }] });
    const cartId = cart.json?.cart?.id || cart.json?.data?.cart?.id || cart.json?.id || cart.json?.data?.id || null;
    if (!cartId) {
      addBlocker('cart_create_failed_for_shipping_option_check');
    } else {
      const shippingUrl = `${MEDUSA_BASE_URL}/store/shipping-options?cart_id=${encodeURIComponent(cartId)}`;
      attemptedEndpoints.push(shippingUrl);
      const shipping = await getJson(shippingUrl, 'shippingOptions', medusaHeaders());
      const options = Array.isArray(shipping.json?.shipping_options) ? shipping.json.shipping_options : Array.isArray(shipping.json?.data?.shipping_options) ? shipping.json.data.shipping_options : [];
      shippingOptionVisible = shipping.ok && options.length > 0;
      if (!shippingOptionVisible) addBlocker(shipping.ok ? 'shipping_option_visible_missing' : 'shipping_options_endpoint_unreachable');
    }
  }
}

let rocketProductVisible = false;
let rocketEndpointFailure = null;
if (!WEB_BASE_URL) {
  addWarning('web_base_url_missing_rocket_visibility_not_checked');
  rocketEndpointFailure = 'WEB_BASE_URL_missing';
} else {
  for (const path of [`/api/store/products/${encodeURIComponent(EXPECTED.handle)}?limit=5`, `/api/store/products?handle=${encodeURIComponent(EXPECTED.handle)}&limit=5`, `/products/${encodeURIComponent(EXPECTED.handle)}`, '/products', '/shop']) {
    const url = `${WEB_BASE_URL}${path}`;
    attemptedEndpoints.push(url);
    const text = await getText(url, `rocket${path.replace(/[^a-z0-9]/gi, '_')}`);
    if (text.ok && text.text.includes(EXPECTED.handle)) {
      rocketProductVisible = true;
      break;
    }
    if (!text.ok) rocketEndpointFailure = `${url} status=${text.status}`;
  }
  if (!rocketProductVisible) addBlocker('rocket_product_visibility_missing');
}

const result = {
  success: blockers.length === 0,
  blockers,
  warnings,
  medusaBaseUrl: MEDUSA_BASE_URL,
  apiBaseUrl: API_BASE_URL,
  fastapiBaseUrl: FASTAPI_BASE_URL,
  botBaseUrl: BOT_BASE_URL,
  liveUrlsCorrect: MEDUSA_BASE_URL === EXPECTED.medusaBaseUrl && API_BASE_URL === EXPECTED.apiBaseUrl && FASTAPI_BASE_URL === EXPECTED.fastapiBaseUrl && BOT_BASE_URL === EXPECTED.botBaseUrl,
  firstCjProductExists: Boolean(product),
  realSupplierProduct,
  notDemo,
  productId: product?.id || null,
  variantId: variant?.id || null,
  handle: product?.handle || null,
  variantExists,
  priceExists,
  stockExists,
  imageReady,
  shippingOptionVisible,
  productUrlReady,
  productUrl,
  rocketProductVisible,
  rocketEndpointFailure,
  telegramDiscoveryReady,
  stripeCheckoutCandidateReady,
  attemptedEndpoints,
  responseSnippets,
  nextManualStep: blockers.length
    ? `Resolve exact blockers before first checkout test: ${blockers.join(', ')}.`
    : 'Proceed to Stripe checkout smoke with the verified CJ product/variant; Telegram remains guidance-only.',
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);

function base(value) { return String(value || '').trim().replace(/\/+$/, ''); }
function clean(value) { return String(value || '').trim(); }
function medusaHeaders() { return MEDUSA_PUBLISHABLE_KEY ? { headers: { accept: 'application/json', 'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY } } : { headers: { accept: 'application/json' } }; }
function metadataOf(item) { return item && typeof item.metadata === 'object' && item.metadata ? item.metadata : {}; }
function firstVariant(item) { return Array.isArray(item?.variants) ? item.variants.find((variant) => variant && typeof variant === 'object') || null : null; }
function supplierSignal(item) { const metadata = metadataOf(item); const variantMetadata = metadataOf(firstVariant(item)); return Boolean(clean(metadata.supplier || variantMetadata.supplier) || clean(metadata.supplierProductId || variantMetadata.supplierProductId) || clean(metadata.supplierSku || variantMetadata.supplierSku)); }
function isExpectedProduct(item) { const metadata = metadataOf(item); const variant = firstVariant(item); const variantMetadata = metadataOf(variant); return Boolean(clean(item?.handle) === EXPECTED.handle && clean(metadata.supplier || variantMetadata.supplier).toLowerCase() === EXPECTED.supplier && clean(metadata.supplierProductId || metadata.supplier_product_id || variantMetadata.supplierProductId || variantMetadata.supplier_product_id) === EXPECTED.supplierProductId && clean(metadata.supplierSku || metadata.supplier_sku || variantMetadata.supplierSku || variantMetadata.supplier_sku || variant?.sku) === EXPECTED.supplierSku); }
function isDemoProduct(item) { const metadata = metadataOf(item); if (metadata.realSupplierProduct === true && metadata.demo === false) return false; const joined = [item?.title, item?.handle, metadata.source, metadata.environment, metadata.type].map((value) => String(value || '')).join(' '); return metadata.demo === true || /\b(demo|sample|mock|test)\b/i.test(joined); }
function firstPriceAmount(variant) { if (!variant) return 0; const calculated = variant.calculated_price; if (calculated && typeof calculated === 'object') { const amount = Number(calculated.calculated_amount ?? calculated.amount ?? 0); if (Number.isSafeInteger(amount) && amount > 0) return amount; } if (Array.isArray(variant.prices)) { const price = variant.prices.find((item) => Number(item?.amount) > 0); if (price) return Number(price.amount); } return Number(variant.price || 0); }
function stockReady(product, variant) { if (!variant) return false; if (variant.manage_inventory === false) return true; return [product?.inventoryQuantity, variant.inventory_quantity, variant.stocked_quantity, variant.available_quantity].some((value) => Number(value) > 0); }
function extractProducts(payload) { const root = payload && typeof payload === 'object' ? payload : {}; const nested = root.data && typeof root.data === 'object' ? root.data : root; for (const key of ['products', 'items', 'data']) { if (Array.isArray(nested[key])) return nested[key].filter((item) => item && typeof item === 'object'); } return nested.product && typeof nested.product === 'object' ? [nested.product] : []; }
function redact(text) { let out = String(text || ''); for (const key of ['MEDUSA_PUBLISHABLE_KEY', 'NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY', 'PUBLIC_MEDUSA_PUBLISHABLE_KEY']) { const secret = process.env[key]; if (secret) out = out.replaceAll(secret, '<redacted>'); } return out.length > 700 ? `${out.slice(0, 700)}…` : out; }
async function getJson(url, label, init = {}) { try { const response = await fetch(url, { cache: 'no-store', ...(init || {}) }); const text = await response.text(); responseSnippets[label] = redact(text); let json = null; try { json = text ? JSON.parse(text) : null; } catch {} return { ok: response.ok, status: response.status, json }; } catch (error) { responseSnippets[label] = error.name; return { ok: false, status: 0, json: null }; } }
async function postJson(url, label, body) { return getJson(url, label, { ...medusaHeaders(), method: 'POST', body: JSON.stringify(body), headers: { ...(medusaHeaders().headers || {}), 'content-type': 'application/json' } }); }
async function getText(url, label) { try { const response = await fetch(url, { cache: 'no-store' }); const text = await response.text(); responseSnippets[label] = redact(text); return { ok: response.ok, status: response.status, text }; } catch (error) { responseSnippets[label] = error.name; return { ok: false, status: 0, text: '' }; } }

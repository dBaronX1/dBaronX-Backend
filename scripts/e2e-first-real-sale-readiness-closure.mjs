#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const EXPECTED_SUPPLIER = 'cj';
const EXPECTED_SUPPLIER_PRODUCT_ID = '2408300732091605000';
const EXPECTED_SUPPLIER_SKU = 'CJDS212420104DW';
const REQUIRED_SUPPLIER_BLOCKERS = [
  'supplier_cost_missing',
  'product_image_missing',
  'stock_unverified',
  'shipping_country_unverified',
  'delivery_estimate_unverified',
  'supplier_product_id_missing',
  'supplier_sku_missing',
  'source_url_missing',
  'price_missing',
];

const MEDUSA_BASE_URL = normalizeBaseUrl(
  process.env.MEDUSA_BASE_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000',
);
const WEB_BASE_URL = normalizeBaseUrl(
  process.env.WEB_BASE_URL || process.env.NEXT_PUBLIC_WEB_BASE_URL || 'http://localhost:3000',
);
const MEDUSA_PUBLISHABLE_KEY = process.env.MEDUSA_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';
const MEDUSA_REGION_ID = clean(process.env.MEDUSA_REGION_ID);
const FIRST_PRODUCT_HANDLE = clean(process.env.DBX_FIRST_PRODUCT_HANDLE || process.env.FIRST_PRODUCT_HANDLE);
const PRODUCTION_TARGET = isProductionTarget(MEDUSA_BASE_URL, WEB_BASE_URL);
const CAPTCHA_PRIMARY = normalizeCaptchaProvider(process.env.CAPTCHA_PRIMARY || process.env.CAPTCHA_PROVIDER || 'hcaptcha');
const CAPTCHA_FALLBACK = normalizeCaptchaProvider(process.env.CAPTCHA_FALLBACK || 'turnstile');
const hcaptchaConfigured = Boolean(clean(process.env.HCAPTCHA_SECRET));
const turnstileConfigured = Boolean(clean(process.env.TURNSTILE_SECRET_KEY || process.env.CLOUDFLARE_TURNSTILE_SECRET));
const captchaConfigured = Boolean(hcaptchaConfigured || turnstileConfigured);
const checkoutCaptchaRequired = truthy(process.env.CAPTCHA_REQUIRED_FOR_CHECKOUT);
const mfaImplemented = truthy(process.env.MFA_IMPLEMENTED) || truthy(process.env.TOTP_IMPLEMENTED);
const passkeyImplemented = truthy(process.env.PASSKEYS_IMPLEMENTED) || truthy(process.env.WEBAUTHN_IMPLEMENTED);
const mfaRoadmapReady = Boolean(process.env.MFA_REQUIRED_FOR_ADMIN === undefined || truthy(process.env.MFA_REQUIRED_FOR_ADMIN));
const passkeyRoadmapReady = process.env.PASSKEYS_ENABLED === undefined || !truthy(process.env.PASSKEYS_ENABLED) || passkeyImplemented;
const firstSaleSecurityReady = Boolean(captchaConfigured || !checkoutCaptchaRequired);

const blockers = [];
const warnings = [];
const checks = {};

const nodeRuntimeReady = isNode20Runtime();
if (!nodeRuntimeReady) addBlocker('NODE_RUNTIME_MUST_BE_20_X');

const redisProductionReady = !PRODUCTION_TARGET || Boolean(clean(process.env.REDIS_URL) || truthy(process.env.MEDUSA_REDIS_PRODUCTION_READY));
if (!redisProductionReady) addBlocker('MEDUSA_PRODUCTION_REDIS_REQUIRED');
if (!clean(process.env.REDIS_URL) && !truthy(process.env.MEDUSA_REDIS_PRODUCTION_READY)) {
  addWarning('REDIS_URL_NOT_CONFIRMED_FOR_MEDUSA_PRODUCTION_CACHE_AND_EVENT_BUS');
}

const sessionProductionReady = !PRODUCTION_TARGET || truthy(process.env.MEDUSA_PRODUCTION_SESSION_STORE_READY);
if (!sessionProductionReady) addBlocker('MEDUSA_PRODUCTION_SESSION_STORE_REQUIRED');
if (!truthy(process.env.MEDUSA_PRODUCTION_SESSION_STORE_READY)) {
  addWarning('MEDUSA_SESSION_STORE_PRODUCTION_SAFETY_NOT_CONFIRMED');
}

if (checkoutCaptchaRequired && !captchaConfigured) addBlocker('CAPTCHA_PROVIDER_REQUIRED');
if (!captchaConfigured) addWarning('CAPTCHA_PROVIDER_NOT_CONFIGURED_CHECKOUT_ONLY_ALLOWED_WHEN_OPTIONAL');
if (!turnstileConfigured && hcaptchaConfigured) addWarning('TURNSTILE_NOT_CONFIGURED_HCAPTCHA_FIRST_SALE_FALLBACK_ACTIVE');
if (!mfaImplemented || !passkeyImplemented) addWarning('MFA_PASSKEY_REQUIRED_FOR_ADMIN_PHASE_TWO');

const medusaReachability = await reachable(MEDUSA_BASE_URL, 'medusaBase');
if (!medusaReachability.ok) addBlocker('MEDUSA_BASE_URL_UNREACHABLE');
const webReachability = await reachable(WEB_BASE_URL, 'webBase');
if (!webReachability.ok) addBlocker('WEB_BASE_URL_UNREACHABLE');

const productsResponse = await getJson(`${MEDUSA_BASE_URL}/store/products?limit=50`, 'storeProducts', medusaHeaders());
if (!productsResponse.ok) addBlocker('MEDUSA_STORE_PRODUCTS_UNREACHABLE');
const products = extractProducts(productsResponse.json);
const firstProduct = selectFirstProduct(products);
if (!firstProduct) addBlocker('FIRST_REAL_SUPPLIER_PRODUCT_MISSING');

const variant = firstVariant(firstProduct);
const metadata = metadataOf(firstProduct);
const variantMetadata = metadataOf(variant);
const supplierBlockers = normalizeBlockers(metadata.supplierVerificationBlockers || metadata.blockers || variantMetadata.supplierVerificationBlockers || variantMetadata.blockers || []);
const requiredSupplierBlockersAbsent = REQUIRED_SUPPLIER_BLOCKERS.every((blocker) => !supplierBlockers.includes(blocker));
const realSupplierProduct = metadata.realSupplierProduct === true;
const demoProduct = isDemoProduct(firstProduct);
const supplier = clean(metadata.supplier || metadata.supplier_name || metadata.source || variantMetadata.supplier).toLowerCase();
const supplierProductId = clean(metadata.supplierProductId || metadata.supplier_product_id || metadata.cj_product_id || variantMetadata.supplierProductId || variantMetadata.supplier_product_id || variantMetadata.cj_product_id);
const supplierSku = clean(metadata.supplierSku || metadata.supplier_sku || variantMetadata.supplierSku || variantMetadata.supplier_sku || variant?.sku);
const sourceUrl = clean(metadata.sourceUrl || metadata.source_url || variantMetadata.sourceUrl || variantMetadata.source_url);
const imageUrl = clean(firstProduct?.thumbnail || firstProduct?.images?.[0]?.url || metadata.imageUrl || metadata.image_url || variantMetadata.imageUrl || variantMetadata.image_url);
const supplierCostAmount = Number(metadata.supplierCostAmount ?? metadata.supplierCostUsdMinor ?? variantMetadata.supplierCostAmount ?? variantMetadata.supplierCostUsdMinor ?? 0);
const supplierCostPresent = Number.isSafeInteger(supplierCostAmount) && supplierCostAmount > 0;
const shippingCountries = normalizeCountries(metadata.shippingCountries || metadata.shipping_countries || variantMetadata.shippingCountries || variantMetadata.shipping_countries);
const deliveryEstimate = clean(metadata.deliveryEstimate || metadata.delivery_estimate || variantMetadata.deliveryEstimate || variantMetadata.delivery_estimate);
const customerSafeDeliveryEstimate = Boolean(deliveryEstimate && !hasUnsafeCustomerText(deliveryEstimate));
const priceReady = Boolean(variant && hasPositivePrice(variant));
const stockQuantity = stockQuantityOf(variant);
const stockReady = stockQuantity > 0;
const sourceUrlReady = isSafeHttpUrl(sourceUrl);
const imageReady = isSafeHttpUrl(imageUrl);
const supportedShippingCountryReady = shippingCountries.length > 0;
const deliveryEstimateReady = customerSafeDeliveryEstimate;
const supplierReady = Boolean(
  !demoProduct &&
    realSupplierProduct &&
    requiredSupplierBlockersAbsent &&
    supplier === EXPECTED_SUPPLIER &&
    supplierProductId === EXPECTED_SUPPLIER_PRODUCT_ID &&
    supplierSku === EXPECTED_SUPPLIER_SKU &&
    supplierCostPresent &&
    sourceUrlReady &&
    imageReady &&
    supportedShippingCountryReady &&
    deliveryEstimateReady &&
    priceReady &&
    stockReady,
);

if (demoProduct) addBlocker('FIRST_PRODUCT_MUST_NOT_BE_DEMO');
if (!realSupplierProduct) addBlocker('FIRST_PRODUCT_REAL_SUPPLIER_PRODUCT_NOT_TRUE');
if (realSupplierProduct && !requiredSupplierBlockersAbsent) addBlocker('REAL_SUPPLIER_PRODUCT_HAS_SUPPLIER_BLOCKERS');
if (!requiredSupplierBlockersAbsent) addBlocker('SUPPLIER_VERIFICATION_BLOCKERS_REMAIN');
if (!supplierCostPresent) addBlocker('SUPPLIER_COST_MISSING_OR_NON_POSITIVE');
if (supplier !== EXPECTED_SUPPLIER) addBlocker('SUPPLIER_MUST_BE_CJ');
if (supplierProductId !== EXPECTED_SUPPLIER_PRODUCT_ID) addBlocker('SUPPLIER_PRODUCT_ID_MISMATCH');
if (supplierSku !== EXPECTED_SUPPLIER_SKU) addBlocker('SUPPLIER_SKU_MISMATCH');
if (!sourceUrlReady) addBlocker('SOURCE_URL_UNSAFE_OR_MISSING');
if (!imageReady) addBlocker('PRODUCT_IMAGE_URL_UNSAFE_OR_MISSING');
if (!stockReady) addBlocker('STOCK_QUANTITY_NOT_POSITIVE');
if (!supportedShippingCountryReady) addBlocker('SUPPORTED_SHIPPING_COUNTRY_MISSING');
if (!deliveryEstimateReady) addBlocker('DELIVERY_ESTIMATE_MISSING_OR_NOT_CUSTOMER_SAFE');
if (!priceReady) addBlocker('PRICE_MISSING_OR_NON_POSITIVE');

const productVisible = Boolean(firstProduct?.id && !demoProduct && (firstProduct.status === 'published' || firstProduct.status === undefined));
if (!productVisible) addBlocker('PUBLISHED_PRODUCT_NOT_VISIBLE_THROUGH_STORE_API');
const variantPurchasable = Boolean(variant?.id && priceReady && stockReady);
if (!variantPurchasable) addBlocker('VARIANT_NOT_PURCHASABLE');
const inventoryLevelReady = stockReady;
if (!inventoryLevelReady) addBlocker('INVENTORY_LEVEL_NOT_READY');

const cartProof = await verifyCartCheckoutPath(variant?.id || null);
if (!cartProof.shippingOptionsVisible) addBlocker(cartProof.shippingBlocker || 'SHIPPING_OPTIONS_NOT_VISIBLE_THROUGH_STORE_API');
if (!cartProof.cartCreated) addBlocker(cartProof.cartBlocker || 'CART_CREATE_FAILED');
if (!cartProof.lineItemAdded) addBlocker(cartProof.lineItemBlocker || 'ADD_TO_CART_FAILED');
if (cartProof.shippingSelectionSupported && !cartProof.shippingMethodSelected) addBlocker(cartProof.shippingSelectionBlocker || 'SHIPPING_METHOD_SELECTION_FAILED');
if (!cartProof.checkoutPathReady) addBlocker('CHECKOUT_PATH_BLOCKED_BEFORE_PAYMENT');

const productReady = Boolean(firstProduct && productVisible && !demoProduct && supplierReady);
const shippingReady = Boolean(supportedShippingCountryReady && cartProof.shippingOptionsVisible);
const cartReady = Boolean(cartProof.cartCreated && cartProof.lineItemAdded);
const checkoutPathReady = Boolean(productReady && cartReady && shippingReady && variantPurchasable && inventoryLevelReady && cartProof.checkoutPathReady);

const telegramOpsReady = await optionalTelegramOpsReady();
const stripeTestReady = optionalStripeTestReady();

const result = {
  success: blockers.length === 0,
  blockers,
  warnings,
  medusaBaseUrl: MEDUSA_BASE_URL,
  webBaseUrl: WEB_BASE_URL,
  productReady,
  cartReady,
  checkoutPathReady,
  captchaConfigured,
  captchaPrimary: CAPTCHA_PRIMARY,
  captchaFallback: CAPTCHA_FALLBACK,
  hcaptchaConfigured,
  turnstileConfigured,
  checkoutCaptchaRequired,
  firstSaleSecurityReady,
  mfaRoadmapReady,
  passkeyRoadmapReady,
  mfaImplemented,
  passkeyImplemented,
  supplierReady,
  shippingReady,
  stockReady,
  priceReady,
  imageReady,
  ...(telegramReadinessEnvSupplied() ? { telegramOpsReady } : {}),
  ...(stripeReadinessEnvSupplied() ? { stripeTestReady } : {}),
  nodeRuntimeReady,
  redisProductionReady,
  sessionProductionReady,
  product: {
    id: firstProduct?.id || null,
    handle: firstProduct?.handle || null,
    variantId: variant?.id || null,
    realSupplierProduct,
    supplier,
    supplierProductId,
    supplierSku,
    supplierCostPresent,
    supplierCostAmount: supplierCostPresent ? supplierCostAmount : null,
    sourceUrlReady,
    imageReady,
    stockQuantity,
    shippingCountries,
    deliveryEstimateReady,
    supplierVerificationBlockers: supplierBlockers,
  },
  checks,
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);

function normalizeCaptchaProvider(value) {
  const provider = clean(value).toLowerCase();
  return ['hcaptcha', 'turnstile', 'disabled'].includes(provider) ? provider : 'hcaptcha';
}

function selectFirstProduct(items) {
  const realItems = items.filter((product) => metadataOf(product).realSupplierProduct === true && !isDemoProduct(product));
  if (FIRST_PRODUCT_HANDLE) {
    return items.find((product) => clean(product?.handle) === FIRST_PRODUCT_HANDLE) || realItems[0] || null;
  }
  return realItems.find((product) => {
    const itemMetadata = metadataOf(product);
    const itemVariantMetadata = metadataOf(firstVariant(product));
    return (
      clean(itemMetadata.supplierProductId || itemMetadata.cj_product_id || itemVariantMetadata.supplierProductId) === EXPECTED_SUPPLIER_PRODUCT_ID &&
      clean(itemMetadata.supplierSku || itemMetadata.supplier_sku || itemVariantMetadata.supplierSku || firstVariant(product)?.sku) === EXPECTED_SUPPLIER_SKU
    );
  }) || realItems[0] || null;
}

async function verifyCartCheckoutPath(variantId) {
  const proof = {
    cartCreated: false,
    lineItemAdded: false,
    shippingOptionsVisible: false,
    shippingSelectionSupported: false,
    shippingMethodSelected: false,
    checkoutPathReady: false,
    cartId: null,
  };
  if (!variantId) {
    proof.cartBlocker = 'VARIANT_ID_MISSING_FOR_CART';
    return proof;
  }
  const regions = await getJson(`${MEDUSA_BASE_URL}/store/regions?limit=20`, 'storeRegions', medusaHeaders());
  const regionId = MEDUSA_REGION_ID || firstRegionId(regions.json);
  if (!regions.ok || !regionId) {
    proof.cartBlocker = regions.ok ? 'REGION_MISSING_FOR_CART' : 'REGION_API_UNREACHABLE';
    return proof;
  }
  const cart = await postJson(`${MEDUSA_BASE_URL}/store/carts`, 'createCart', { region_id: regionId });
  const cartId = cartIdOf(cart.json);
  proof.cartCreated = Boolean(cart.ok && cartId);
  proof.cartId = cartId || null;
  if (!proof.cartCreated) {
    proof.cartBlocker = 'CART_CREATE_FAILED';
    return proof;
  }
  const addLine = await postJson(`${MEDUSA_BASE_URL}/store/carts/${encodeURIComponent(cartId)}/line-items`, 'addLineItem', {
    variant_id: variantId,
    quantity: 1,
  });
  proof.lineItemAdded = Boolean(addLine.ok && cartIdOf(addLine.json));
  if (!proof.lineItemAdded) proof.lineItemBlocker = 'ADD_TO_CART_FAILED';

  const options = await getJson(`${MEDUSA_BASE_URL}/store/shipping-options?cart_id=${encodeURIComponent(cartId)}`, 'shippingOptionsForCart', medusaHeaders());
  const shippingOptions = extractShippingOptions(options.json);
  proof.shippingOptionsVisible = Boolean(options.ok && shippingOptions.length > 0);
  if (!proof.shippingOptionsVisible) proof.shippingBlocker = options.ok ? 'SHIPPING_OPTION_EMPTY_FOR_CART' : 'SHIPPING_OPTION_API_UNREACHABLE';

  const firstOption = shippingOptions[0] || null;
  if (firstOption?.id) {
    proof.shippingSelectionSupported = true;
    const selected = await postJson(`${MEDUSA_BASE_URL}/store/carts/${encodeURIComponent(cartId)}/shipping-methods`, 'selectShippingMethod', {
      option_id: firstOption.id,
    });
    proof.shippingMethodSelected = Boolean(selected.ok && cartIdOf(selected.json));
    if (!proof.shippingMethodSelected) {
      proof.shippingSelectionBlocker = selected.status === 404 || selected.status === 405 ? null : 'SHIPPING_METHOD_SELECTION_FAILED';
      if (!proof.shippingSelectionBlocker) {
        proof.shippingSelectionSupported = false;
        addWarning('STORE_API_SHIPPING_METHOD_SELECTION_ENDPOINT_NOT_AVAILABLE_IN_THIS_MEDUSA_VERSION');
      }
    }
  }
  proof.checkoutPathReady = Boolean(proof.cartCreated && proof.lineItemAdded && proof.shippingOptionsVisible && (!proof.shippingSelectionSupported || proof.shippingMethodSelected));
  return proof;
}

async function optionalTelegramOpsReady() {
  if (!telegramReadinessEnvSupplied()) return undefined;
  const run = spawnSync(process.execPath, ['scripts/e2e-first-transaction-with-telegram-ops-smoke.mjs'], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
    timeout: 120000,
  });
  const payload = parseLastJson(run.stdout);
  const ready = Boolean(run.status === 0 && payload?.success === true && (payload.telegramOpsReady === true || payload.botReady === true));
  checks.telegramOpsSmokeExitCode = run.status;
  if (!ready) addBlocker('TELEGRAM_OPS_READINESS_PROOF_REQUIRED');
  return ready;
}

function optionalStripeTestReady() {
  if (!stripeReadinessEnvSupplied()) return undefined;
  const sessionId = clean(process.env.CHECKOUT_SESSION_ID || process.env.STRIPE_CHECKOUT_SESSION_ID || process.env.STRIPE_TEST_CHECKOUT_SESSION_ID);
  const checkoutProof = truthy(process.env.STRIPE_TEST_CHECKOUT_PROOF) || sessionId.startsWith('cs_test_');
  const webhookProof = truthy(process.env.STRIPE_WEBHOOK_PROOF) || truthy(process.env.STRIPE_SIGNED_WEBHOOK_PROOF);
  const durableProof = truthy(process.env.DURABLE_ORDER_PAYMENT_PROOF) || truthy(process.env.STRIPE_DURABLE_ORDER_PAYMENT_PROOF);
  if (!checkoutProof) addBlocker('STRIPE_TEST_CHECKOUT_PROOF_REQUIRED');
  if (!webhookProof) addBlocker('STRIPE_SIGNED_WEBHOOK_PROOF_REQUIRED');
  if (!durableProof) addBlocker('DURABLE_ORDER_PAYMENT_RECORD_PROOF_REQUIRED');
  return Boolean(checkoutProof && webhookProof && durableProof);
}

function telegramReadinessEnvSupplied() {
  return ['BOT_BASE_URL', 'BOT_PUBLIC_BASE_URL', 'TELEGRAM_BOT_PUBLIC_BASE_URL', 'TELEGRAM_READINESS_REQUIRED'].some((name) => clean(process.env[name]));
}
function stripeReadinessEnvSupplied() {
  return ['STRIPE_TEST_CHECKOUT_PROOF', 'STRIPE_WEBHOOK_PROOF', 'STRIPE_SIGNED_WEBHOOK_PROOF', 'DURABLE_ORDER_PAYMENT_PROOF', 'STRIPE_DURABLE_ORDER_PAYMENT_PROOF', 'CHECKOUT_SESSION_ID', 'STRIPE_TEST_CHECKOUT_SESSION_ID', 'STRIPE_READINESS_REQUIRED'].some((name) => clean(process.env[name]));
}
function isNode20Runtime() {
  const [major] = process.versions.node.split('.').map(Number);
  return major === 20;
}
function isProductionTarget(...urls) {
  if (process.env.NODE_ENV === 'production' || truthy(process.env.FIRST_SALE_PRODUCTION_READINESS)) return true;
  return urls.some((url) => /^https:\/\//i.test(url) && !/localhost|127\.0\.0\.1|\.local/i.test(url));
}
function normalizeBaseUrl(value) { return String(value || '').trim().replace(/\/+$/, ''); }
function clean(value) { return String(value || '').trim(); }
function truthy(value) { return /^(1|true|yes|ready)$/i.test(clean(value)); }
function addBlocker(blocker) { if (blocker && !blockers.includes(blocker)) blockers.push(blocker); }
function addWarning(warning) { if (warning && !warnings.includes(warning)) warnings.push(warning); }
function medusaHeaders(extra = {}) {
  const headers = { ...extra };
  if (MEDUSA_PUBLISHABLE_KEY) headers['x-publishable-api-key'] = MEDUSA_PUBLISHABLE_KEY;
  return { headers };
}
async function reachable(baseUrl, label) {
  const health = await getText(`${baseUrl}/health`, `${label}Health`);
  if (health.ok) return health;
  return getText(baseUrl, label);
}
async function getText(url, label, init = {}) {
  try {
    const response = await fetch(url, init);
    await response.arrayBuffer();
    checks[label] = { ok: response.ok, status: response.status };
    return { ok: response.ok, status: response.status };
  } catch (error) {
    checks[label] = { ok: false, status: 0, error: error.name };
    return { ok: false, status: 0 };
  }
}
async function getJson(url, label, init = {}) {
  try {
    const response = await fetch(url, init);
    const text = await response.text();
    checks[label] = { ok: response.ok, status: response.status };
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    return { ok: response.ok, status: response.status, json };
  } catch (error) {
    checks[label] = { ok: false, status: 0, error: error.name };
    return { ok: false, status: 0, json: null };
  }
}
async function postJson(url, label, body) {
  try {
    const response = await fetch(url, {
      ...medusaHeaders({ 'content-type': 'application/json' }),
      method: 'POST',
      body: JSON.stringify(body),
    });
    const text = await response.text();
    checks[label] = { ok: response.ok, status: response.status };
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    return { ok: response.ok, status: response.status, json };
  } catch (error) {
    checks[label] = { ok: false, status: 0, error: error.name };
    return { ok: false, status: 0, json: null };
  }
}
function extractProducts(payload) {
  const data = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
  for (const key of ['products', 'items', 'data']) {
    if (Array.isArray(data?.[key])) return data[key].filter((item) => item && typeof item === 'object');
  }
  return [];
}
function extractShippingOptions(payload) {
  const candidates = [payload?.shipping_options, payload?.data?.shipping_options, payload?.data, payload?.shippingOptions];
  for (const candidate of candidates) if (Array.isArray(candidate)) return candidate;
  return [];
}
function firstRegionId(payload) {
  const candidates = [payload?.regions, payload?.data?.regions, payload?.data];
  for (const candidate of candidates) if (Array.isArray(candidate) && candidate[0]?.id) return candidate[0].id;
  return null;
}
function cartIdOf(payload) { return payload?.cart?.id || payload?.data?.cart?.id || payload?.id || payload?.data?.id || null; }
function firstVariant(product) { return Array.isArray(product?.variants) ? product.variants.find((item) => item && typeof item === 'object') || null : null; }
function metadataOf(item) { return item && typeof item.metadata === 'object' && item.metadata ? item.metadata : {}; }
function normalizeBlockers(value) {
  if (Array.isArray(value)) return value.map((item) => clean(item)).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
}
function normalizeCountries(value) {
  if (Array.isArray(value)) return value.map((item) => clean(item).toUpperCase()).filter(Boolean);
  return clean(value).split(',').map((item) => item.trim().toUpperCase()).filter(Boolean);
}
function isDemoProduct(product) {
  const itemMetadata = metadataOf(product);
  if (itemMetadata.demo === true || itemMetadata.realSupplierProduct === false) return true;
  if (itemMetadata.realSupplierProduct === true && itemMetadata.demo === false) return false;
  return /\b(demo|mock|sample|test)\b/i.test([product?.title, product?.handle, itemMetadata.source, itemMetadata.environment, itemMetadata.type].map(clean).join(' '));
}
function isSafeHttpUrl(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    if (url.username || url.password) return false;
    if (/token|secret|access[_-]?key|api[_-]?key|bearer/i.test(`${url.search} ${url.hash}`)) return false;
    return true;
  } catch {
    return false;
  }
}
function hasUnsafeCustomerText(value) { return /\b(tbd|todo|unknown|unconfirmed|placeholder|demo|mock|sample|test)\b/i.test(value); }
function hasPositivePrice(currentVariant) {
  const calculated = currentVariant?.calculated_price;
  if (calculated && typeof calculated === 'object' && Number(calculated.calculated_amount ?? calculated.amount) > 0) return true;
  return Array.isArray(currentVariant?.prices) && currentVariant.prices.some((price) => Number(price?.amount) > 0);
}
function stockQuantityOf(currentVariant) {
  if (!currentVariant) return 0;
  return Math.max(
    Number(currentVariant.inventory_quantity || 0),
    Number(currentVariant.stocked_quantity || 0),
    Number(currentVariant.available_quantity || 0),
    currentVariant.manage_inventory === false ? 1 : 0,
  );
}
function parseLastJson(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const start = raw.lastIndexOf('\n{');
  const candidate = start >= 0 ? raw.slice(start + 1) : raw;
  try { return JSON.parse(candidate); } catch { return null; }
}

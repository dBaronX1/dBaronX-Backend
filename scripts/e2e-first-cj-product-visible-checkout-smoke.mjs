#!/usr/bin/env node

const EXPECTED = Object.freeze({
  handle: 'mens-cotton-linen-long-sleeve-casual-shirt',
  title: "Men's Cotton Linen Long Sleeve Casual Shirt",
  supplier: 'cj',
  supplierProductId: '2408300732091605000',
  supplierSku: 'CJDS212420104DW',
  sourceUrl: 'https://cjdropshipping.com/product/new-mens-casual-blouse-cotton-linen-shirt-loose-tops-long-sleeve-tee-shirt-spring-autumn-casual-handsome-mens-shirts-p-2408300732091605000.html',
  imageHost: 'oss-cf.cjdropshipping.com',
  priceAmount: 1999,
  supplierCostAmount: 419,
  supplierCostCurrency: 'usd',
  stockQty: 32,
  deliveryEstimate: '7-15 business days',
});

const EXPECTED_MEDUSA_BASE_URL = 'https://dbaronx-medusa-xrwh.onrender.com';
const EXPECTED_API_BASE_URL = 'https://dbaronx-api-unified-qo2j.onrender.com';
const EXPECTED_FASTAPI_BASE_URL = 'https://dbaronx-fastapi-5ci9.onrender.com';
const EXPECTED_BOT_BASE_URL = 'https://dbaronx-telegram-bot.onrender.com';
const MEDUSA_BASE_URL = baseUrl(process.env.MEDUSA_BASE_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || EXPECTED_MEDUSA_BASE_URL);
const API_BASE_URL = baseUrl(process.env.API_BASE_URL || EXPECTED_API_BASE_URL);
const FASTAPI_BASE_URL = baseUrl(process.env.FASTAPI_BASE_URL || EXPECTED_FASTAPI_BASE_URL);
const BOT_BASE_URL = baseUrl(process.env.BOT_BASE_URL || EXPECTED_BOT_BASE_URL);
const WEB_BASE_URL = baseUrl(process.env.WEB_BASE_URL || process.env.NEXT_PUBLIC_WEB_BASE_URL || 'https://dbaronx.com');
const MEDUSA_PUBLISHABLE_KEY = clean(
  process.env.MEDUSA_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
    process.env.PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
    '',
);
const CHECK_LIVE = process.env.DBX_FIRST_CJ_VISIBLE_SMOKE_LIVE === 'true';
const blockers = [];
const warnings = [];
const responseSnippets = {};
if (MEDUSA_BASE_URL !== EXPECTED_MEDUSA_BASE_URL) blockers.push('medusa_live_url_incorrect');
if (API_BASE_URL !== EXPECTED_API_BASE_URL) blockers.push('api_live_url_incorrect');
if (FASTAPI_BASE_URL !== EXPECTED_FASTAPI_BASE_URL) blockers.push('fastapi_live_url_incorrect');
if (BOT_BASE_URL !== EXPECTED_BOT_BASE_URL) blockers.push('telegram_live_url_incorrect');

const telegramSource = await readTextFile('apps/telegram-bot/src/handlers/customer_handler.py');
const medusaSeedSource = await readTextFile('apps/medusa/src/scripts/seed-cj-first-shirt-product.ts');
const canonicalSeedSource = await readTextFile('apps/medusa/src/scripts/reseed-cj-first-product-canonical.ts');
const webGridSource = await readTextFile('apps/web/src/components/dbx/ProductViews.tsx');
const webStoreClientSource = await readTextFile('apps/web/src/lib/api/medusa-store-client.ts');

const staticContract = {
  seedRequiresConfirmation: /DBX_CONFIRM_CJ_FIRST_PRODUCT_SEED/.test(medusaSeedSource) && /!== "true"|!== 'true'/.test(medusaSeedSource),
  seedUsesPublishMode: /mode:\s*"publish"|mode:\s*'publish'/.test(medusaSeedSource) || /mode:\s*"publish"|mode:\s*'publish'/.test(canonicalSeedSource),
  seedContainsExactHandle: medusaSeedSource.includes(EXPECTED.handle) && canonicalSeedSource.includes(EXPECTED.handle),
  seedContainsExactSupplierProductId: medusaSeedSource.includes(EXPECTED.supplierProductId) && canonicalSeedSource.includes(EXPECTED.supplierProductId),
  seedContainsExactSupplierSku: medusaSeedSource.includes(EXPECTED.supplierSku) && canonicalSeedSource.includes(EXPECTED.supplierSku),
  seedOutputContractPresent: [
    'success',
    'mode',
    'productId',
    'variantId',
    'handle',
    'title',
    'supplier',
    'supplierProductId',
    'supplierSku',
    'sourceUrlPresent',
    'imageUrlPresent',
    'realSupplierProduct',
    'demo',
    'supplierVerificationStatus',
    'stockQty',
    'priceAmount',
    'supplierCostAmount',
    'supplierCostCurrency',
    'shippingCountries',
    'deliveryEstimate',
    'nextManualStep',
  ].every((field) => canonicalSeedSource.includes(field) || medusaSeedSource.includes(field)),
  webUsesCatalogFetch: /fetchMedusaStoreProducts|useStoreProducts|fetchRocketStoreProducts|\/api\/store\/products/.test(webGridSource + webStoreClientSource),
  webDoesNotHardcodeExpectedProduct: !webGridSource.includes(EXPECTED.supplierProductId) && !webGridSource.includes(EXPECTED.supplierSku),
  telegramClassifiesReal: /_is_verified_checkout_product/.test(telegramSource) && /realSupplierProduct/.test(telegramSource) && /verified_for_checkout/.test(telegramSource),
  telegramDoesNotExposeSupplierCost: !/supplierCost|supplier_cost|costMinor|cost_minor|supplierCostAmount|supplierCostUsdMinor/i.test(stripCommentsForCostCheck(telegramSource)),
};

for (const [key, value] of Object.entries(staticContract)) {
  if (!value) blockers.push(`static_${key}_failed`);
}

const unsafeTelegramWrites = findUnsafeTelegramWrites(telegramSource);
if (unsafeTelegramWrites.length) blockers.push('unsafe_telegram_write_detected');
const secretLeaks = findSecretLeakMarkers(`${medusaSeedSource}\n${canonicalSeedSource}\n${telegramSource}\n${webGridSource}\n${webStoreClientSource}`);
if (secretLeaks.length) blockers.push('secret_print_or_secret_literal_detected');

let product = null;
let variant = null;
let live = null;
if (CHECK_LIVE) {
  if (!MEDUSA_PUBLISHABLE_KEY) blockers.push('medusa_publishable_key_missing_for_live_check');
  const store = await getJson(`${MEDUSA_BASE_URL}/store/products?limit=100`, 'medusaStoreProducts', medusaHeaders());
  if (!store.ok && medusaDatabaseNotReady(store)) blockers.push('medusa_database_not_ready');
  const storeProducts = extractProducts(store.json);
  if (store.ok && storeProducts.length === 0) blockers.push('first_cj_product_not_seeded');
  const web = await getJson(`${WEB_BASE_URL}/api/store/products?limit=100`, 'rocketStoreProducts');
  const candidates = [...storeProducts, ...extractProducts(web.json)];
  product = candidates.find(isExactCjProduct) || candidates.find(isManualCuratedBuyableCjProduct) || candidates.find(isCheckoutCandidate) || null;
  variant = firstVariant(product);
  live = buildLiveReadiness(product, variant, store, web);
  for (const blocker of live.blockers) blockers.push(blocker);
} else {
  warnings.push('live_check_skipped_set_DBX_FIRST_CJ_VISIBLE_SMOKE_LIVE=true');
}

const result = {
  success: blockers.length === 0,
  blockers,
  warnings,
  exactCjProductPresent: CHECK_LIVE ? Boolean(product && isExactCjProduct(product)) : null,
  manualCuratedCjProductSelected: CHECK_LIVE ? Boolean(product && isManualCuratedBuyableCjProduct(product)) : null,
  metadataContractStaticPresent: staticContract.seedContainsExactHandle && staticContract.seedContainsExactSupplierProductId && staticContract.seedContainsExactSupplierSku && staticContract.seedOutputContractPresent,
  productIsNotDemo: CHECK_LIVE ? isNotDemo(product) : null,
  realSupplierProduct: CHECK_LIVE ? metadataOf(product).realSupplierProduct === true : null,
  productImageExists: CHECK_LIVE ? hasImage(product) : null,
  productPriceExists: CHECK_LIVE ? firstPriceAmount(variant, product) > 0 : null,
  productVariantExists: CHECK_LIVE ? Boolean(variant?.id) : null,
  productStockInventoryExists: CHECK_LIVE ? hasStock(product, variant) : null,
  publicProductUrl: `${WEB_BASE_URL}/products/${clean(product?.handle || EXPECTED.handle)}`,
  publicProductUrlReady: Boolean(WEB_BASE_URL && EXPECTED.handle),
  checkoutPathCanIdentifyVariant: CHECK_LIVE ? Boolean(variant?.id && clean(product?.handle)) : null,
  telegramDiscoveryClassifiesReal: staticContract.telegramClassifiesReal,
  noUnsafeTelegramWrites: unsafeTelegramWrites.length === 0,
  noSecretsPrinted: secretLeaks.length === 0,
  unsafeTelegramWrites,
  secretLeakMarkers: secretLeaks,
  attemptedEndpoints: CHECK_LIVE ? [`${MEDUSA_BASE_URL}/store/products?limit=100`, `${WEB_BASE_URL}/api/store/products?limit=100`] : [],
  responseSnippets,
  nextManualStep: blockers.length
    ? `Resolve blockers before checkout testing: ${blockers.join(', ')}.`
    : CHECK_LIVE
      ? `Open Rocket /products and /products/${clean(product?.handle || EXPECTED.handle)}, then run the Stripe test checkout smoke.`
      : 'Static checks passed. Rerun with DBX_FIRST_CJ_VISIBLE_SMOKE_LIVE=true plus deployed MEDUSA/WEB URLs and publishable key for runtime visibility proof.',
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);

function buildLiveReadiness(currentProduct, currentVariant, store, web) {
  const liveBlockers = [];
  if (!store.ok) liveBlockers.push('medusa_store_product_endpoint_unreachable');
  if (!web.ok) liveBlockers.push('rocket_store_product_endpoint_unreachable');
  if (!currentProduct) liveBlockers.push('first_cj_product_missing_from_public_catalog');
  if (currentProduct && !isExactCjProduct(currentProduct) && !isManualCuratedBuyableCjProduct(currentProduct)) liveBlockers.push('first_cj_product_metadata_mismatch');
  if (!isNotDemo(currentProduct)) liveBlockers.push('first_cj_product_demo_or_not_real');
  if (metadataOf(currentProduct).realSupplierProduct !== true) liveBlockers.push('first_cj_product_real_supplier_flag_missing');
  if (!hasImage(currentProduct)) liveBlockers.push('first_cj_product_image_missing');
  if (!currentVariant?.id) liveBlockers.push('first_cj_product_variant_missing');
  if (firstPriceAmount(currentVariant, product) <= 0) liveBlockers.push('first_cj_product_price_missing');
  if (!hasStock(currentProduct, currentVariant)) liveBlockers.push('first_cj_product_stock_inventory_missing');
  return { blockers: liveBlockers };
}

function isCheckoutCandidate(product) { const variant = firstVariant(product); return Boolean(product && isNotDemo(product) && supplierSignal(product) && hasImage(product) && variant?.id && firstPriceAmount(variant, product) > 0 && hasStock(product, variant)); }
function isManualCuratedBuyableCjProduct(product) { const metadata = metadataOf(product); const variantMetadata = metadataOf(firstVariant(product)); return Boolean(isCheckoutCandidate(product) && clean(metadata.supplier || variantMetadata.supplier).toLowerCase() === 'cj' && metadata.manualCurated === true && metadata.buyable === true && ['manual_verified_for_checkout', 'verified_for_checkout'].includes(metadata.supplierVerificationStatus)); }
function isExactCjProduct(product) {
  const metadata = metadataOf(product);
  const variantMetadata = metadataOf(firstVariant(product));
  const supplierProductSignal = clean(metadata.supplierProductId || metadata.supplier_product_id || variantMetadata.supplierProductId || variantMetadata.supplier_product_id || metadata.productUrl || metadata.sourceUrl);
  const skuSignal = clean(metadata.supplierSku || metadata.supplier_sku || variantMetadata.supplierSku || variantMetadata.supplier_sku || firstVariant(product)?.sku);
  return Boolean(product && clean(product.handle) === EXPECTED.handle && (!clean(metadata.supplier || variantMetadata.supplier) || clean(metadata.supplier || variantMetadata.supplier).toLowerCase() === EXPECTED.supplier) && (!supplierProductSignal || supplierProductSignal.includes(EXPECTED.supplierProductId) || supplierProductSignal === EXPECTED.supplierSku) && (!skuSignal || skuSignal === EXPECTED.supplierSku));
}

function isNotDemo(product) {
  const metadata = metadataOf(product);
  return Boolean(product && metadata.demo === false && ['verified_for_checkout', 'manual_verified_for_checkout'].includes(metadata.supplierVerificationStatus));
}

function hasImage(product) {
  const metadata = metadataOf(product);
  return Boolean(clean(product?.thumbnail) || clean(product?.image) || clean(product?.image_url) || clean(metadata.imageUrl) || clean(metadata.image_url) || (Array.isArray(product?.images) && product.images.some((image) => clean(image?.url))));
}

function hasStock(product, variant) {
  if (!variant) return false;
  if (variant.manage_inventory === false) return true;
  const metadata = metadataOf(product);
  const variantMetadata = metadataOf(variant);
  return [product?.inventoryQuantity, product?.inventory_quantity, metadata.stockQty, metadata.inventory, metadata.inventoryQuantity, variant.inventory_quantity, variant.stocked_quantity, variant.available_quantity, variantMetadata.stockQty, variantMetadata.inventory].some((value) => Number(value) > 0);
}

function firstPriceAmount(variant, product = null) {
  if (!variant && !product) return 0;
  const calculated = variant?.calculated_price;
  if (calculated && typeof calculated === 'object') {
    const nested = calculated.calculated_price && typeof calculated.calculated_price === 'object' ? calculated.calculated_price : {};
    const priceObj = calculated.price && typeof calculated.price === 'object' ? calculated.price : {};
    const amount = Number(calculated.calculated_amount ?? calculated.amount ?? calculated.original_amount ?? nested.amount ?? priceObj.amount ?? 0);
    if (Number.isFinite(amount) && amount > 0) return amount;
  }
  if (Array.isArray(variant?.prices)) {
    const price = variant.prices.find((item) => Number(item?.amount) > 0);
    const amount = Number(price?.amount || 0);
    if (Number.isFinite(amount) && amount > 0) return amount;
  }
  if (Number(variant?.price) > 0) return Number(variant.price);
  if (Number(product?.priceMinor) > 0) return Number(product.priceMinor);
  return Number(product?.price || 0);
}

function firstVariant(product) {
  return Array.isArray(product?.variants) ? product.variants.find((item) => item && typeof item === 'object') || null : null;
}

function metadataOf(item) {
  return item && typeof item.metadata === 'object' && item.metadata ? item.metadata : {};
}

function extractProducts(payload) {
  const root = payload && typeof payload === 'object' ? payload : {};
  const nested = root.data && typeof root.data === 'object' ? root.data : root;
  for (const key of ['products', 'items', 'data']) {
    if (Array.isArray(nested[key])) return nested[key].filter((item) => item && typeof item === 'object');
  }
  return nested.product && typeof nested.product === 'object' ? [nested.product] : [];
}

function medusaHeaders(extra = {}) {
  return MEDUSA_PUBLISHABLE_KEY ? { ...extra, 'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY } : extra;
}

async function getJson(url, label, init = {}) {
  try {
    const response = await fetch(url, { headers: { accept: 'application/json', ...(init.headers || init) }, cache: 'no-store' });
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

async function readTextFile(path) {
  const { readFile } = await import('node:fs/promises');
  return readFile(path, 'utf8');
}

function findUnsafeTelegramWrites(source) {
  const unsafe = [];
  const patterns = [
    /_api_(post|put|patch|delete)\s*\(/i,
    /self\.http\.(post|put|patch|delete)\s*\(/i,
    /method\s*[:=]\s*["']POST["']/i,
    /api\/checkout\/stripe\/session/i,
    /api\/orders\/.+(fulfill|paid|complete)/i,
    /api\/(wallet|payouts|supplier).+(credit|approve|import|write)/i,
  ];
  for (const [index, line] of source.split('\n').entries()) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || (trimmed.startsWith('"') && /cannot|never|does not|must not/i.test(trimmed))) continue;
    if (patterns.some((pattern) => pattern.test(trimmed))) unsafe.push(`${index + 1}:${trimmed.slice(0, 160)}`);
  }
  return unsafe;
}

function findSecretLeakMarkers(source) {
  const markers = [];
  for (const [index, line] of source.split('\n').entries()) {
    if (/(DATABASE_URL|CJ_ACCESS_TOKEN|CJ_API_KEY|TELEGRAM_BOT_TOKEN|STRIPE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY)\s*=\s*['\"][^'\"]+/i.test(line)) {
      markers.push(`${index + 1}:${line.trim().slice(0, 160)}`);
    }
  }
  return markers;
}

function stripCommentsForCostCheck(source) {
  return source
    .split('\n')
    .filter((line) => !line.trim().startsWith('#'))
    .join('\n');
}

function medusaDatabaseNotReady(response) {
  const text = `${response?.text || ''} ${JSON.stringify(response?.json || {})}`;
  return /relation .* does not exist|missing .*table|tax_provider|payment_provider|fulfillment_provider|shipping_option|sales_channel|stock_location|database.*schema/i.test(text);
}

function snippet(value) {
  let text = String(value || '');
  for (const key of ['MEDUSA_PUBLISHABLE_KEY', 'NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY', 'PUBLIC_MEDUSA_PUBLISHABLE_KEY']) {
    const secret = process.env[key];
    if (secret) text = text.replaceAll(secret, '<redacted>');
  }
  return text.length > 900 ? `${text.slice(0, 900)}…` : text;
}

function baseUrl(value) {
  return clean(value).replace(/\/+$/, '');
}

function clean(value) {
  return String(value || '').trim();
}

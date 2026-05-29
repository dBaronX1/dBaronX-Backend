#!/usr/bin/env node
const EXPECTED_CJ_HANDLE = 'mens-cotton-linen-long-sleeve-casual-shirt';
const EXPECTED_CJ_SUPPLIER = 'cj';
const EXPECTED_CJ_SUPPLIER_PRODUCT_ID = '2408300732091605000';
const EXPECTED_CJ_SUPPLIER_SKU = 'CJDS212420104DW';
const EXPECTED_CJ_SOURCE_URL = 'https://cjdropshipping.com/product/new-mens-casual-blouse-cotton-linen-shirt-loose-tops-long-sleeve-tee-shirt-spring-autumn-casual-handsome-mens-shirts-p-2408300732091605000.html';
const EXPECTED_CJ_PRICE_USD_MINOR = 1999;

const MEDUSA_BASE_URL = normalizeBaseUrl(
  process.env.MEDUSA_BASE_URL ||
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
    'https://dbaronx-medusa-xrwh.onrender.com',
);
const WEB_BASE_URL = normalizeBaseUrl(
  process.env.WEB_BASE_URL ||
    process.env.NEXT_PUBLIC_WEB_BASE_URL ||
    'http://localhost:3000',
);
const API_BASE_URL = normalizeBaseUrl(process.env.API_BASE_URL || 'https://dbaronx-api-unified-qo2j.onrender.com');
const FASTAPI_BASE_URL = normalizeBaseUrl(process.env.FASTAPI_BASE_URL || 'https://dbaronx-fastapi-5ci9.onrender.com');
const BOT_BASE_URL = normalizeBaseUrl(process.env.BOT_BASE_URL || 'https://dbaronx-telegram-bot.onrender.com');
const EXPECTED_MEDUSA_BASE_URL = 'https://dbaronx-medusa-xrwh.onrender.com';
const EXPECTED_API_BASE_URL = 'https://dbaronx-api-unified-qo2j.onrender.com';
const EXPECTED_FASTAPI_BASE_URL = 'https://dbaronx-fastapi-5ci9.onrender.com';
const EXPECTED_BOT_BASE_URL = 'https://dbaronx-telegram-bot.onrender.com';
const MEDUSA_PUBLISHABLE_KEY =
  process.env.MEDUSA_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  process.env.PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  '';
const DEFAULT_REGION_ID = process.env.MEDUSA_REGION_ID || '';
const EXPECTED_CANONICAL_SALES_CHANNEL_ID = process.env.MEDUSA_CANONICAL_SALES_CHANNEL_ID || process.env.MEDUSA_SALES_CHANNEL_ID || '';
const EXPECT_SUPPLIER = safeString(
  process.env.EXPECT_SUPPLIER || '',
).toLowerCase();

const blockers = [];
const responseSnippets = {};
if (!safeString(MEDUSA_PUBLISHABLE_KEY)) addBlocker('medusa_publishable_key_missing');
if (isPreviewOnlyPublishableKey(MEDUSA_PUBLISHABLE_KEY))
  addBlocker('medusa_publishable_key_preview_only_full_key_required');

const productsResponse = await getJson(
  `${MEDUSA_BASE_URL}/store/products?limit=100`,
  'storeProducts',
  medusaHeaders(),
);
if (!productsResponse.ok && !isPublishableKeyError(productsResponse)) addBlocker('medusa_store_api_unreachable');
if (isPublishableKeyError(productsResponse)) addBlocker('medusa_publishable_key_invalid');

const handleResponse = await getJson(
  `${MEDUSA_BASE_URL}/store/products?handle=${encodeURIComponent(EXPECTED_CJ_HANDLE)}&limit=5`,
  'storeProductsByExpectedHandle',
  medusaHeaders(),
);

const medusaFailureMode = classifyMedusaFailure(productsResponse, handleResponse);
if (medusaFailureMode === 'medusa_schema_missing') {
  addBlocker('medusa_schema_missing');
  addBlocker('medusa_database_not_ready');
}
if (medusaFailureMode === 'medusa_unreachable') addBlocker('medusa_unreachable');
if (medusaFailureMode === 'medusa_publishable_key_invalid') addBlocker('medusa_publishable_key_invalid');
if (medusaFailureMode === 'medusa_publishable_key_not_linked_to_sales_channel') addBlocker('medusa_publishable_key_not_linked_to_sales_channel');

const launchCommerceStoreApiGreen = Boolean(productsResponse.ok);

const products = uniqueProducts([
  ...extractProducts(productsResponse.json),
  ...extractProducts(handleResponse.json),
]);
const productCount = extractProducts(productsResponse.json).length;
if (productCount === 0 && productsResponse.ok) addBlocker('first_cj_product_not_seeded');
const draftProduct =
  products.find((product) => isDraftSupplierProduct(product)) || null;
const exactCjProduct = selectExactCjProduct(products);
const verifiedProduct =
  (exactCjProduct && isVerifiedSupplierProduct(exactCjProduct)
    ? exactCjProduct
    : null) || products.find((product) => isExactVerifiedCjProduct(product)) || null;
const realProduct = verifiedProduct;
const verifiedSupplierProductPresent = Boolean(verifiedProduct);
const exactCjProductPresent = Boolean(exactCjProduct);
const demoProducts = products.filter((product) => isOldDemoProduct(product));
const demoProductsPresent = demoProducts.length > 0;
if (!verifiedProduct) addBlocker('real_supplier_product_missing');
if (!exactCjProductPresent) addBlocker('real_supplier_product_missing');

const draftMetadata = metadataOf(draftProduct);
const verifiedMetadata = metadataOf(verifiedProduct);
const supplierVerificationStatus = safeString(
  verifiedMetadata.supplierVerificationStatus ||
    draftMetadata.supplierVerificationStatus ||
    '',
);
const supplierVerificationBlockers = normalizeBlockers(
  verifiedMetadata.supplierVerificationBlockers ||
    verifiedMetadata.blockers ||
    draftMetadata.supplierVerificationBlockers ||
    draftMetadata.blockers ||
    [],
);
if (draftProduct && !verifiedProduct)
  addBlocker('draft_supplier_product_pending_verification');

const variant = firstVariant(realProduct);
const productId = realProduct?.id || null;
const variantId = variant?.id || null;
const handle = realProduct?.handle || null;
const title = realProduct?.title || realProduct?.name || null;
const metadata = metadataOf(realProduct);
const variantMetadata = metadataOf(variant);
const supplier = safeString(
  metadata.supplier ||
    metadata.supplier_name ||
    metadata.supplier_id ||
    metadata.source ||
    variantMetadata.supplier ||
    '',
);
const supplierProductId = safeString(
  metadata.supplierProductId ||
    metadata.supplier_product_id ||
    metadata.cj_product_id ||
    metadata.external_id ||
    variantMetadata.supplierProductId ||
    variantMetadata.supplier_product_id ||
    variantMetadata.cj_product_id ||
    variantMetadata.external_id,
);
const supplierSku = safeString(
  metadata.supplierSku ||
    metadata.supplier_sku ||
    variantMetadata.supplierSku ||
    variantMetadata.supplier_sku ||
    variant?.sku,
);
const sourceUrl = safeString(
  metadata.sourceUrl ||
    metadata.source_url ||
    variantMetadata.sourceUrl ||
    variantMetadata.source_url,
);
const supplierCostAmount = Number(
  metadata.supplierCostAmount ??
    metadata.supplierCostUsdMinor ??
    variantMetadata.supplierCostAmount ??
    variantMetadata.supplierCostUsdMinor ??
    0,
);
const supplierCostPresent =
  Number.isSafeInteger(supplierCostAmount) && supplierCostAmount > 0;
const supplierProductIdPresent = Boolean(supplierProductId);
const supplierSkuPresent = Boolean(supplierSku);
const sourceUrlPresent = Boolean(sourceUrl);
const sourceUrlValid = isHttpUrl(sourceUrl);
const variantReady = Boolean(variantId && supplierSkuPresent);
const sellingPriceAmount = variant ? firstPriceAmount(variant) : 0;
const priceReady = sellingPriceAmount === EXPECTED_CJ_PRICE_USD_MINOR;
const stockReady = Boolean(variant && hasAvailabilityProof(variant));
const productImageReady = Boolean(realProduct && hasProductImage(realProduct));
const productUrl = productUrlFor(realProduct);
const productUrlChecked = productUrl || null;
const productUrlReady = Boolean(productUrl && handle);
const realSupplierProductPresent = Boolean(realProduct);
const expectedSupplierReady =
  (!EXPECT_SUPPLIER || supplier.toLowerCase() === EXPECT_SUPPLIER) &&
  (!supplier || supplier.toLowerCase() === EXPECTED_CJ_SUPPLIER);
const sourceUrlMatchesExpected = sourceUrl === EXPECTED_CJ_SOURCE_URL;
const supplierProductIdMatchesExpected =
  supplierProductId === EXPECTED_CJ_SUPPLIER_PRODUCT_ID;
const supplierSkuMatchesExpected = supplierSku === EXPECTED_CJ_SUPPLIER_SKU;
const telegramDiscoveryReady = Boolean(
  realProduct && telegramWouldClassifyReal(realProduct),
);

if (!variantReady) addBlocker('variant_missing_or_supplier_sku_missing');
if (!supplier) addBlocker('supplier_metadata_missing');
if (EXPECT_SUPPLIER && !expectedSupplierReady)
  addBlocker(`supplier_mismatch_expected_${EXPECT_SUPPLIER}`);
if (EXPECT_SUPPLIER === 'cj' && !supplierCostPresent)
  addBlocker('supplier_cost_missing');
if (supplier && supplier.toLowerCase() !== EXPECTED_CJ_SUPPLIER)
  addBlocker('exact_cj_supplier_mismatch');
if (!supplierProductIdMatchesExpected) addBlocker('exact_cj_supplier_product_id_missing_or_mismatch');
if (!supplierSkuMatchesExpected) addBlocker('exact_cj_supplier_sku_missing_or_mismatch');
if (sourceUrlPresent && !sourceUrlMatchesExpected)
  addBlocker('exact_cj_source_url_mismatch');
if (!supplierProductIdPresent) addBlocker('supplier_product_id_missing');
if (!supplierSkuPresent) addBlocker('supplier_sku_missing');
if (!sourceUrlPresent) addBlocker('source_url_missing');
if (sourceUrlPresent && !sourceUrlValid)
  addBlocker('source_url_not_http_or_https');
if (!priceReady) addBlocker(sellingPriceAmount > 0 ? 'price_mismatch_expected_1999_usd_minor' : 'price_missing');
if (!stockReady) addBlocker('stock_or_availability_proof_missing');
if (!productImageReady) addBlocker('product_image_missing');
if (!productUrlReady) addBlocker('product_url_missing');
if (!telegramDiscoveryReady)
  addBlocker('telegram_discovery_would_not_classify_product_real');

const productPage = productUrlReady
  ? await getText(productUrl, 'webProductPage')
  : { ok: false, status: 0, text: '' };
const productUrlExists = Boolean(productUrlReady && productPage.ok);
const storefrontCheckoutGuidanceReady = Boolean(
  productUrlExists &&
    /Stripe-hosted checkout|Add-to-cart|checkout path/i.test(productPage.text || ''),
);
if (!productUrlExists) addBlocker('web_product_url_unreachable');
if (productUrlExists && !storefrontCheckoutGuidanceReady)
  addBlocker('web_product_checkout_guidance_missing');

const shipping = await verifyShippingOptionForCart(variantId);
const canonicalSalesChannelId = EXPECTED_CANONICAL_SALES_CHANNEL_ID || shipping.cartSalesChannelId || null;
const cartSalesChannelId = shipping.cartSalesChannelId || null;
const productSalesChannelIds = salesChannelIdsFrom(realProduct);
const publishableKeySalesChannelIds = cartSalesChannelId ? [cartSalesChannelId] : [];
const stockLocationSalesChannelIds = [];
if (EXPECTED_CANONICAL_SALES_CHANNEL_ID && cartSalesChannelId && cartSalesChannelId !== EXPECTED_CANONICAL_SALES_CHANNEL_ID) {
  addBlocker('sales_channel_mismatch');
}
if (productSalesChannelIds.length && canonicalSalesChannelId && !productSalesChannelIds.includes(canonicalSalesChannelId)) {
  addBlocker('sales_channel_link_missing');
}
if (!shipping.shippingOptionVisible)
  addBlocker(shipping.blocker === 'shipping_option_empty_for_cart' ? 'shipping_option_store_visibility_missing' : shipping.blocker || 'shipping_option_store_visibility_missing');
const checkoutPathReady = Boolean(
  realSupplierProductPresent &&
  expectedSupplierReady &&
  supplierCostPresent &&
  supplierProductIdPresent &&
  supplierSkuPresent &&
  sourceUrlPresent &&
  sourceUrlValid &&
  variantReady &&
  priceReady &&
  stockReady &&
  productImageReady &&
  productUrlExists &&
  storefrontCheckoutGuidanceReady &&
  shipping.shippingOptionVisible,
);

const result = {
  success: blockers.length === 0,
  blockers,
  medusaBaseUrl: MEDUSA_BASE_URL,
  apiBaseUrl: API_BASE_URL,
  fastapiBaseUrl: FASTAPI_BASE_URL,
  botBaseUrl: BOT_BASE_URL,
  liveUrlsCorrect: MEDUSA_BASE_URL === EXPECTED_MEDUSA_BASE_URL && API_BASE_URL === EXPECTED_API_BASE_URL && FASTAPI_BASE_URL === EXPECTED_FASTAPI_BASE_URL && BOT_BASE_URL === EXPECTED_BOT_BASE_URL,
  productCount,
  medusaFailureMode,
  canonicalSalesChannelId,
  cartSalesChannelId,
  publishableKeySalesChannelIds,
  productSalesChannelIds,
  stockLocationSalesChannelIds,
  schemaReadinessInterpretation: medusaFailureMode === 'medusa_schema_missing' ? 'Run Medusa db:prepare against MEDUSA_DATABASE_URL before product readiness; this is not a product-missing failure.' : null,
  launchCommerceStoreApiGreen,
  expectedSupplier: EXPECT_SUPPLIER || null,
  expectedSupplierReady,
  verifiedSupplierProductPresent,
  realSupplierProductPresent,
  exactCjProductPresent,
  demoProductsPresent,
  supplierVerificationStatus: supplierVerificationStatus || null,
  supplierVerificationBlockers,
  productId,
  variantId,
  handle,
  title,
  supplier: supplier || null,
  supplierCostPresent,
  supplierProductIdMatchesExpected,
  supplierSkuMatchesExpected,
  sourceUrlMatchesExpected,
  supplierCostAmount: supplierCostPresent ? supplierCostAmount : null,
  sellingPriceAmount: sellingPriceAmount > 0 ? sellingPriceAmount : null,
  expectedSellingPriceAmount: EXPECTED_CJ_PRICE_USD_MINOR,
  supplierProductIdPresent,
  supplierSkuPresent,
  sourceUrlPresent,
  sourceUrlValid,
  variantReady,
  priceReady,
  stockReady,
  productImageReady,
  shippingOptionVisible: shipping.shippingOptionVisible,
  productUrl: productUrlChecked,
  productUrlChecked,
  productUrlReady: productUrlExists,
  productUrlExists,
  storefrontCheckoutGuidanceReady,
  checkoutPathReady,
  telegramDiscoveryReady,
  telegramDiscoveryExpectation:
    'Telegram /products and /product mens-cotton-linen-long-sleeve-casual-shirt should show the verified CJ shirt as customer-safe, not DEMO or supplier draft, and should only guide users to web checkout.',
  nextManualStep: nextManualStep(),
  responseSnippets,
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);

function normalizeBaseUrl(value) {
  return String(value || '')
    .trim()
    .replace(/\/+$/, '');
}
function addBlocker(blocker) {
  if (blocker && !blockers.includes(blocker)) blockers.push(blocker);
}
function classifyMedusaFailure(...responses) {
  const text = Object.values(responseSnippets).join(' ');
  if (/valid publishable key is required|publishable key/i.test(text)) return 'medusa_publishable_key_invalid';
  if (/sales channel|not linked|not_allowed/i.test(text)) return 'medusa_publishable_key_not_linked_to_sales_channel';
  if (/relation .* does not exist|missing .*table|currency|region_country|payment_provider|tax_provider|fulfillment_provider|database.*schema/i.test(text)) {
    return 'medusa_schema_missing';
  }
  if (responses.some((response) => response.status === 0 || response.status >= 500)) return 'medusa_unreachable';
  return null;
}
function isPublishableKeyError(response) {
  const text = `${response?.text || ''} ${JSON.stringify(response?.json || {})}`;
  return /valid publishable key is required|publishable key/i.test(text);
}
function safeString(value) {
  return String(value || '').trim();
}
function isPreviewOnlyPublishableKey(value) {
  const key = safeString(value);
  return Boolean(key && (/…/.test(key) || /\.\.\./.test(key)));
}
function metadataOf(item) {
  return item && typeof item.metadata === 'object' && item.metadata
    ? item.metadata
    : {};
}
function uniqueProducts(items) {
  const seen = new Set();
  const unique = [];
  for (const item of items) {
    const key = item?.id || `${item?.handle || ''}:${item?.title || ''}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique;
}
function extractProducts(payload) {
  const data =
    payload?.data && typeof payload.data === 'object' ? payload.data : payload;
  for (const key of ['products', 'items', 'data']) {
    if (Array.isArray(data?.[key]))
      return data[key].filter((item) => item && typeof item === 'object');
  }
  return [];
}
function firstVariant(product) {
  return Array.isArray(product?.variants)
    ? product.variants.find((v) => v && typeof v === 'object') || null
    : null;
}
function isExplicitReal(product) {
  const metadata = metadataOf(product);
  return (
    metadata.realSupplierProduct === true &&
    metadata.demo === false &&
    metadata.supplierVerificationStatus === 'verified_for_checkout'
  );
}
function isDraftSupplierProduct(product) {
  const metadata = metadataOf(product);
  return Boolean(
    product &&
    metadata.demo === false &&
    metadata.realSupplierProduct === false &&
    metadata.supplierVerificationStatus === 'draft_pending_verification' &&
    hasSupplierSignal(product),
  );
}
function isVerifiedSupplierProduct(product) {
  return Boolean(
    product &&
    !isDemoProduct(product) &&
    isExplicitReal(product) &&
    hasSupplierSignal(product),
  );
}
function selectExactCjProduct(items) {
  return items.find((product) => isExactCjProduct(product)) || null;
}
function isExactVerifiedCjProduct(product) {
  return Boolean(isVerifiedSupplierProduct(product) && isExactCjProduct(product));
}
function isExactCjProduct(product) {
  return Boolean(
    product &&
      cleanHandle(product) === EXPECTED_CJ_HANDLE &&
      supplierProductIdOf(product) === EXPECTED_CJ_SUPPLIER_PRODUCT_ID &&
      supplierSkuOf(product) === EXPECTED_CJ_SUPPLIER_SKU,
  );
}
function cleanHandle(product) {
  return safeString(product?.handle);
}
function supplierProductIdOf(product) {
  const metadata = metadataOf(product);
  const variantMetadata = metadataOf(firstVariant(product));
  return safeString(
    metadata.supplierProductId ||
      metadata.supplier_product_id ||
      metadata.cj_product_id ||
      metadata.external_id ||
      variantMetadata.supplierProductId ||
      variantMetadata.supplier_product_id ||
      variantMetadata.cj_product_id ||
      variantMetadata.external_id,
  );
}
function supplierSkuOf(product) {
  const metadata = metadataOf(product);
  const variant = firstVariant(product);
  const variantMetadata = metadataOf(variant);
  return safeString(
    metadata.supplierSku ||
      metadata.supplier_sku ||
      variantMetadata.supplierSku ||
      variantMetadata.supplier_sku ||
      variant?.sku,
  );
}
function isOldDemoProduct(product) {
  const metadata = metadataOf(product);
  const values = [product?.title, product?.name, product?.handle, metadata.source, metadata.environment, metadata.type];
  return Boolean(
    product &&
      !isExplicitReal(product) &&
      (metadata.demo === true || /\b(demo|sample|mock|test)\b/i.test(values.map((value) => String(value || '')).join(' '))),
  );
}
function normalizeBlockers(value) {
  if (Array.isArray(value))
    return value.map((item) => safeString(item)).filter(Boolean);
  if (typeof value === 'string' && value.trim())
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  return [];
}
function isDemoProduct(product) {
  if (isExplicitReal(product)) return false;
  const metadata = metadataOf(product);
  if (metadata.demo === true) return true;
  const values = [
    product?.title,
    product?.name,
    product?.handle,
    product?.id,
    metadata.source,
    metadata.supplier,
    metadata.supplier_name,
    metadata.environment,
    metadata.type,
  ];
  return /\b(demo|sample|mock|test)\b/i.test(
    values.map((value) => String(value || '')).join(' '),
  );
}
function hasSupplierSignal(product) {
  const metadata = metadataOf(product);
  const variantMetadata = metadataOf(firstVariant(product));
  const values = [
    metadata.supplier,
    metadata.supplier_name,
    metadata.supplier_id,
    metadata.source,
    metadata.supplierProductId,
    metadata.supplier_product_id,
    metadata.cj_product_id,
    metadata.external_id,
    metadata.supplierSku,
    metadata.supplier_sku,
    metadata.sourceUrl,
    variantMetadata.supplier,
    variantMetadata.supplierProductId,
    variantMetadata.supplierSku,
    variantMetadata.sourceUrl,
  ];
  return values.some(
    (value) => safeString(value) && !/\bdemo\b/i.test(String(value)),
  );
}
function isRealSupplierProduct(product) {
  return Boolean(
    product &&
    !isDemoProduct(product) &&
    isExplicitReal(product) &&
    hasSupplierSignal(product),
  );
}
function telegramWouldClassifyReal(product) {
  return Boolean(
    !isDemoProduct(product) &&
    hasSupplierSignal(product) &&
    isExplicitReal(product),
  );
}
function firstPriceAmount(variant) {
  const calculated = variant.calculated_price;
  if (calculated && typeof calculated === 'object') {
    const amount = Number(calculated.calculated_amount ?? calculated.amount);
    if (Number.isSafeInteger(amount) && amount > 0) return amount;
  }
  if (Array.isArray(variant.prices)) {
    const price = variant.prices.find((item) => Number(item?.amount) > 0);
    const amount = Number(price?.amount || 0);
    if (Number.isSafeInteger(amount) && amount > 0) return amount;
  }
  return 0;
}
function hasProductImage(product) {
  if (safeString(product?.thumbnail)) return true;
  return Array.isArray(product?.images) && product.images.some((image) => safeString(image?.url));
}
function hasAvailabilityProof(variant) {
  if (variant.manage_inventory === false) return true;
  if (Number(variant.inventory_quantity) > 0) return true;
  if (
    Number(variant.stocked_quantity) > 0 ||
    Number(variant.available_quantity) > 0
  )
    return true;
  return false;
}
function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}
function productUrlFor(product) {
  const ref = safeString(product?.handle || product?.id);
  return ref ? `${WEB_BASE_URL}/products/${encodeURIComponent(ref)}` : null;
}
function medusaHeaders(extra = {}) {
  const headers = { ...extra };
  if (MEDUSA_PUBLISHABLE_KEY)
    headers['x-publishable-api-key'] = MEDUSA_PUBLISHABLE_KEY;
  return { headers };
}
async function verifyShippingOptionForCart(currentVariantId) {
  if (!currentVariantId)
    return {
      shippingOptionVisible: false,
      blocker: 'variant_missing_for_cart_shipping_check',
      cartSalesChannelId: null,
    };
  const regions = await getJson(
    `${MEDUSA_BASE_URL}/store/regions?limit=20`,
    'storeRegions',
    medusaHeaders(),
  );
  const regionId =
    DEFAULT_REGION_ID ||
    regions.json?.regions?.[0]?.id ||
    regions.json?.data?.regions?.[0]?.id ||
    regions.json?.data?.[0]?.id ||
    regions.json?.regions?.[0]?.id;
  if (!regionId)
    return {
      shippingOptionVisible: false,
      blocker: regions.ok
        ? 'region_missing_for_cart_shipping_check'
        : 'region_api_unreachable',
      cartSalesChannelId: null,
    };

  const cart = await postJson(`${MEDUSA_BASE_URL}/store/carts`, 'createCart', {
    region_id: regionId,
    items: [{ variant_id: currentVariantId, quantity: 1 }],
  });
  const cartId =
    cart.json?.cart?.id ||
    cart.json?.data?.cart?.id ||
    cart.json?.id ||
    cart.json?.data?.id;
  if (!cart.ok || !cartId)
    return {
      shippingOptionVisible: false,
      blocker: 'cart_create_failed_for_shipping_check',
      cartSalesChannelId: null,
    };

  const options = await getJson(
    `${MEDUSA_BASE_URL}/store/shipping-options?cart_id=${encodeURIComponent(cartId)}`,
    'shippingOptionsForCart',
    medusaHeaders(),
  );
  const list = Array.isArray(options.json?.shipping_options)
    ? options.json.shipping_options
    : Array.isArray(options.json?.data?.shipping_options)
      ? options.json.data.shipping_options
      : Array.isArray(options.json?.data)
        ? options.json.data
        : [];
  const createdCart = cart.json?.cart || cart.json?.data?.cart || cart.json?.data || cart.json || {};
  return {
    shippingOptionVisible: options.ok && list.length > 0,
    blocker: options.ok
      ? 'shipping_option_empty_for_cart'
      : 'shipping_option_api_unreachable',
    cartSalesChannelId: createdCart.sales_channel_id || null,
  };
}
async function getJson(url, label, init = {}) {
  try {
    const response = await fetch(url, init);
    const text = await response.text();
    responseSnippets[label] = snippet(text);
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { ok: response.ok, status: response.status, json };
  } catch (error) {
    responseSnippets[label] = error.name;
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
    responseSnippets[label] = snippet(text);
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { ok: response.ok, status: response.status, json };
  } catch (error) {
    responseSnippets[label] = error.name;
    return { ok: false, status: 0, json: null };
  }
}
async function getText(url, label) {
  try {
    const response = await fetch(url, { method: 'GET' });
    const text = await response.text();
    responseSnippets[label] = snippet(text);
    return { ok: response.ok, status: response.status, text };
  } catch (error) {
    responseSnippets[label] = error.name;
    return { ok: false, status: 0, text: '' };
  }
}
function snippet(value) {
  let text = String(value || '');
  for (const key of [
    'MEDUSA_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY',
    'PUBLIC_MEDUSA_PUBLISHABLE_KEY',
  ]) {
    const secret = process.env[key];
    if (secret) text = text.replaceAll(secret, '<redacted>');
  }
  return text.length > 900 ? `${text.slice(0, 900)}…` : text;
}
function nextManualStep() {
  if (blockers.includes('medusa_publishable_key_missing'))
    return 'Set MEDUSA_PUBLISHABLE_KEY/NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY/PUBLIC_MEDUSA_PUBLISHABLE_KEY from the fresh Medusa DB publishable key linked to the default sales channel; do not reuse the deleted DB key.';
  if (blockers.includes('medusa_publishable_key_preview_only_full_key_required'))
    return 'The configured publishable key is preview-only. Run DBX_CONFIRM_PRINT_MEDUSA_PUBLISHABLE_KEY=true pnpm --filter @dbaronx/medusa run publishable-key:print, then update MEDUSA_PUBLISHABLE_KEY/NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY/PUBLIC_MEDUSA_PUBLISHABLE_KEY with the full token.';
  if (blockers.includes('medusa_publishable_key_invalid') || blockers.includes('medusa_publishable_key_not_linked_to_sales_channel'))
    return 'Run launch-commerce:ensure, print the new fresh-DB publishable key with explicit confirmation, update deployment env, and rerun readiness.';
  if (blockers.includes('launch_commerce_missing'))
    return 'Run pnpm --filter @dbaronx/medusa run launch-commerce:ensure after db:prepare before product readiness.';
  if (medusaFailureMode === 'medusa_schema_missing')
    return 'Run the Medusa First Product Seed Action DB preflight against MEDUSA_DATABASE_URL and migrate the real Medusa database before checking product readiness; do not use the API Supabase DATABASE_URL.';
  if (medusaFailureMode === 'medusa_unreachable')
    return 'Start Medusa and verify it can reach the migrated database before checking product readiness.';
  if (draftProduct && !verifiedProduct)
    return `Verify the draft supplier product before live checkout: add image URL, confirm stock quantity, shipping countries, and delivery estimate, then rerun the seed in publish mode.`;
  if (launchCommerceStoreApiGreen && (blockers.includes('first_cj_product_not_seeded') || blockers.includes('real_supplier_product_missing')))
    return 'Launch-commerce Store API is green and the verified CJ shirt is missing. Run DBX_CONFIRM_CJ_FIRST_PRODUCT_SEED=true pnpm --filter @dbaronx/medusa run first-product:seed:cj-shirt as a GitHub Action, Render one-off job, or Render shell command; do not put the seed in the Render Web Service start command. Then rerun this readiness smoke.';
  if (blockers.length)
    return `Resolve blockers before first real checkout: ${blockers.join(', ')}.`;
  return `Open ${productUrl}, add the item to cart, run Stripe test checkout, then proceed to live money only after signed webhook/order proof is verified.`;
}

function salesChannelIdsFrom(product) {
  return Array.isArray(product?.sales_channels)
    ? product.sales_channels.map((channel) => safeString(channel?.id)).filter(Boolean)
    : [];
}

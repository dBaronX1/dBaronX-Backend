#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const HANDLER_PATH = 'apps/telegram-bot/src/handlers/customer_handler.py';
const HTTP_PATH = 'apps/telegram-bot/src/shared/http/http_client.py';
const SETTINGS_PATH = 'apps/telegram-bot/src/core/settings.py';
const EXPECTED_SHIRT_HANDLE = 'mens-cotton-linen-long-sleeve-casual-shirt';
const MEDUSA_BASE_URL = cleanBaseUrl(process.env.MEDUSA_BASE_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'https://dbaronx-medusa-xrwh.onrender.com');
const MEDUSA_PUBLISHABLE_KEY = clean(process.env.MEDUSA_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || process.env.PUBLIC_MEDUSA_PUBLISHABLE_KEY || '');

const blockers = [];
const warnings = [];
const handler = await readFile(HANDLER_PATH, 'utf8');
const httpClient = await readFile(HTTP_PATH, 'utf8');
const settings = await readFile(SETTINGS_PATH, 'utf8');

assert(/command == "products"/.test(handler), 'telegram_products_command_missing');
assert(/command == "product"/.test(handler), 'telegram_product_command_missing');
assert(/params=\{"limit": 20\}/.test(handler), 'telegram_products_catalog_limit_not_multi_product');
assert(!/\[:1\]|limit"\s*:\s*1\}\)/.test(handler.split('async def _products_text')[1]?.split('async def _product_text')[0] || ''), 'telegram_products_limited_to_one');
assert(handler.includes(EXPECTED_SHIRT_HANDLE) === false, 'telegram_hardcodes_only_expected_shirt');
assert(/Telegram does not create carts, create checkout sessions, mark paid, or mark fulfilled/.test(handler), 'telegram_read_only_checkout_copy_missing');
assert(/Payment status is never treated as paid unless backend proof explicitly says paid/.test(handler), 'telegram_payment_proof_rule_missing');
assert(/Order status is never treated as fulfilled unless backend proof explicitly says fulfilled/.test(handler), 'telegram_fulfillment_proof_rule_missing');
assert(/MEDUSA_PUBLISHABLE_KEY/.test(settings) && /x-publishable-api-key/.test(handler) && /extra_headers/.test(httpClient), 'telegram_medusa_publishable_key_header_missing');
assert(!/supplierCost|supplier_cost|costMinor|cost_minor|supplierCostAmount|supplierCostUsdMinor/i.test(stripComments(handler)), 'telegram_supplier_cost_exposure_detected');
assert(!/\.post\(|\.put\(|\.patch\(|\.delete\(/.test(handler), 'telegram_customer_handler_write_method_detected');
assert(!/payment_status\s*[:=]\s*["']paid|fulfillment_status\s*[:=]\s*["']fulfilled|mark_paid|mark_fulfilled/i.test(handler), 'telegram_fake_paid_or_fulfilled_write_detected');

let live = null;
if (MEDUSA_PUBLISHABLE_KEY) {
  const url = new URL('/store/products', MEDUSA_BASE_URL);
  url.searchParams.set('limit', '100');
  const response = await fetch(url, { headers: { accept: 'application/json', 'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY } });
  const payload = await response.json().catch(() => null);
  const products = extractProducts(payload);
  const visible = products.filter(isVerifiedCheckoutProduct);
  const shirt = visible.find((product) => product.handle === EXPECTED_SHIRT_HANDLE);
  const nonShirt = visible.find((product) => product.handle && product.handle !== EXPECTED_SHIRT_HANDLE);
  if (!response.ok) blockers.push(`medusa_store_products_http_${response.status}`);
  if (visible.length < 2) blockers.push('telegram_live_catalog_not_multiple_products');
  if (!shirt) blockers.push('telegram_live_shirt_handle_missing');
  if (!nonShirt) blockers.push('telegram_live_non_shirt_handle_missing');
  live = {
    status: response.status,
    visibleCount: visible.length,
    shirtHandleWorks: Boolean(shirt),
    nonShirtHandle: nonShirt?.handle || null,
    sampleHandles: visible.slice(0, 8).map((product) => product.handle || product.id).filter(Boolean),
  };
} else {
  warnings.push('MEDUSA_PUBLISHABLE_KEY_missing_live_medusa_assertions_skipped');
}

const out = { success: blockers.length === 0, staticChecks: 'passed', live, blockers, warnings };
console.log(JSON.stringify(out, null, 2));
if (blockers.length) process.exit(1);

function assert(condition, blocker) { if (!condition) blockers.push(blocker); }
function clean(value) { return String(value || '').trim(); }
function cleanBaseUrl(value) { return clean(value).replace(/\/+$/, ''); }
function stripComments(source) { return source.replace(/#.*$/gm, ''); }
function metadata(product) { return product?.metadata && typeof product.metadata === 'object' ? product.metadata : {}; }
function extractProducts(payload) {
  const root = payload && typeof payload === 'object' ? payload : {};
  const nested = root.data && typeof root.data === 'object' ? root.data : root;
  for (const key of ['products', 'items', 'data']) if (Array.isArray(nested[key])) return nested[key].filter((item) => item && typeof item === 'object');
  return nested.product && typeof nested.product === 'object' ? [nested.product] : [];
}
function isVerifiedCheckoutProduct(product) {
  const m = metadata(product);
  return m.demo === false && m.realSupplierProduct === true && (m.supplierVerificationStatus === 'verified_for_checkout' || m.supplierVerificationStatus === 'manual_verified_for_checkout') && (m.buyable !== false);
}

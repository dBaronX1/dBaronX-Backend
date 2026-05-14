#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const cjHandle = 'mens-cotton-linen-long-sleeve-casual-shirt';
const requiredEnv = [
  'NEXT_PUBLIC_API_BASE_URL',
  'NEXT_PUBLIC_NESTJS_BASE_URL',
  'NEXT_PUBLIC_FASTAPI_BASE_URL',
  'NEXT_PUBLIC_MEDUSA_BACKEND_URL',
  'NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLIC_KEY',
  'NEXT_PUBLIC_SITE_URL',
];

const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(repoRoot, rel));
}

function record(condition, message) {
  if (!condition) failures.push(message);
}

function collectFiles(dir) {
  const absolute = path.join(repoRoot, dir);
  if (!fs.existsSync(absolute)) return [];
  const entries = fs.readdirSync(absolute, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectFiles(rel);
    return /\.(tsx?|jsx?|mjs|cjs)$/.test(entry.name) ? [rel] : [];
  });
}

const missingEnv = requiredEnv.filter((name) => !process.env[name]);
record(missingEnv.length === 0, `Missing required public env: ${missingEnv.join(', ')}`);

const backendUrl = (process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || '').replace(/\/+$/, '');
const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';
if (backendUrl && publishableKey) {
  const url = new URL(`${backendUrl}/store/products`);
  url.searchParams.set('handle', cjHandle);
  url.searchParams.set('limit', '5');
  try {
    const response = await fetch(url, { headers: { 'x-publishable-api-key': publishableKey } });
    const payload = await response.json().catch(() => null);
    const products = extractProducts(payload);
    const product = products.find((item) => item?.handle === cjHandle);
    record(response.ok, `Store product request failed with HTTP ${response.status}`);
    record(Boolean(product), `CJ product ${cjHandle} was not returned by the Store API`);
    if (product) {
      const variant = Array.isArray(product.variants) ? product.variants[0] : null;
      record(product.title === 'Mens Cotton Linen Long Sleeve Casual Shirt' || Boolean(product.title), 'CJ product title is not visible');
      record(Boolean(product.thumbnail || product.images?.[0]?.url), 'CJ product thumbnail is not visible');
      record(Boolean(variant?.id), 'CJ product variant id is not visible');
      record(priceText(product) === '19.99 USD', `CJ product price was not 19.99 USD, got ${priceText(product)}`);
    }
  } catch (error) {
    failures.push(`Store product request errored: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const routeFiles = [
  'apps/web/src/app/home/page.tsx',
  'apps/web/src/app/shop/page.tsx',
  'apps/web/src/app/(platform)/products/page.tsx',
  'apps/web/src/app/(platform)/products/[handle]/page.tsx',
];
const productFiles = [
  'apps/web/src/components/dbx/StaticPages.tsx',
  'apps/web/src/components/dbx/ProductViews.tsx',
  'apps/web/src/lib/store-products.ts',
  'apps/web/src/lib/hooks/useMedusaProducts.ts',
  'apps/web/src/lib/api/medusa-store-client.ts',
];
for (const file of [...routeFiles, ...productFiles]) record(exists(file), `Expected source file missing: ${file}`);
const productSource = productFiles.filter(exists).map(read).join('\n');
record(productSource.includes('useMedusaProducts') || productSource.includes('fetchMedusaStoreProducts'), 'Product source does not use the live product hook/client');
record(productSource.includes('productPrimaryVariantId'), 'Product cards do not use the visible variant id');
record(read('apps/web/src/components/dbx/StaticPages.tsx').includes('<DbxProductGrid />'), 'Home page does not render the live product grid');
record(read('apps/web/src/components/dbx/ProductViews.tsx').includes('reason ?'), 'Product grid does not expose a branded safe fallback path');

const customerFiles = [
  ...collectFiles('apps/web/src/app/home'),
  ...collectFiles('apps/web/src/app/shop'),
  ...collectFiles('apps/web/src/app/login'),
  ...collectFiles('apps/web/src/app/register'),
  ...collectFiles('apps/web/src/app/account'),
  ...collectFiles('apps/web/src/app/profile'),
  ...collectFiles('apps/web/src/components/dbx'),
  ...collectFiles('apps/web/src/components/auth'),
];
const forbiddenCustomerText = [
  'Rocket production UI',
  'runtime auth',
  'production UI',
  'medusa_store_env_missing',
  'Products are syncing',
  'Unhandled Runtime Error',
  'Stack trace',
];
for (const file of customerFiles) {
  const source = read(file);
  for (const forbidden of forbiddenCustomerText) {
    record(!source.includes(forbidden), `${file} contains customer-facing/internal text: ${forbidden}`);
  }
}

if (failures.length > 0) {
  console.error('[rocket-product-visibility-smoke] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[rocket-product-visibility-smoke] PASS');

function extractProducts(data) {
  const payload = data && typeof data === 'object' ? data : {};
  const nested = payload.data && typeof payload.data === 'object' ? payload.data : payload;
  for (const key of ['products', 'items', 'data']) {
    if (Array.isArray(nested[key])) return nested[key].filter((item) => item && typeof item === 'object');
  }
  return nested.product && typeof nested.product === 'object' ? [nested.product] : [];
}

function priceText(product) {
  const variant = Array.isArray(product?.variants) ? product.variants[0] : null;
  const calculated = variant?.calculated_price;
  if (calculated && typeof calculated === 'object') {
    const amount = Number(calculated.calculated_amount ?? calculated.amount);
    const currency = String(calculated.currency_code ?? calculated.currency ?? 'usd');
    if (amount > 0) return formatAmount(amount, currency);
  }
  const price = Array.isArray(variant?.prices) ? variant.prices.find((item) => Number(item?.amount) > 0) : null;
  return price ? formatAmount(Number(price.amount), String(price.currency_code || 'usd')) : '';
}

function formatAmount(amount, currency) {
  const normalized = amount > 0 && amount < 1000 && !Number.isInteger(amount) ? amount : amount / 100;
  return `${normalized.toFixed(2)} ${currency.toUpperCase()}`;
}

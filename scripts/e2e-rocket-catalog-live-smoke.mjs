#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const WEB_BASE_URL = (process.env.WEB_BASE_URL || process.env.NEXT_PUBLIC_WEB_BASE_URL || 'https://dbaronx.com').replace(/\/+$/, '');
const blockers = [];
const warnings = [];
const files = {
  productViews: await readFile('apps/web/src/components/dbx/ProductViews.tsx', 'utf8'),
  serverClient: await readFile('apps/web/src/lib/store-products-server.ts', 'utf8'),
  route: await readFile('apps/web/src/app/api/store/products/store-products-response.ts', 'utf8'),
};
const source = Object.values(files).join('\n');
assert(/fetchRocketStoreProducts|fetchServerStoreProducts|storeProductsResponse/.test(source), 'rocket_real_catalog_fetch_missing');
assert(/\/store\/products/.test(source), 'rocket_medusa_store_api_path_missing');
assert(!/mens-cotton-linen-long-sleeve-casual-shirt/.test(files.productViews), 'rocket_product_view_hardcodes_one_shirt');
assert(/productPrimaryImage/.test(files.productViews) && /<Image/.test(files.productViews), 'rocket_product_images_not_preserved');
assert(/productPrimaryVariantId/.test(files.productViews) && /variant=/.test(files.productViews), 'rocket_cart_buy_uses_variant_data_missing');
assert(/\/cart\?variant=/.test(files.productViews) && /\/checkout\?variant=/.test(files.productViews), 'rocket_add_to_cart_buy_now_variant_links_missing');

let live = null;
if (process.env.DBX_ROCKET_LIVE_SMOKE === 'true') {
  for (const path of ['/api/store/products?limit=20', '/shop', '/products']) {
    const response = await fetch(`${WEB_BASE_URL}${path}`, { headers: { accept: path.startsWith('/api') ? 'application/json' : 'text/html' } });
    const text = await response.text();
    if (!response.ok) blockers.push(`rocket_live_${path}_http_${response.status}`);
    if (path.startsWith('/api')) {
      const payload = JSON.parse(text || '{}');
      const products = extractProducts(payload);
      if (!products.length) blockers.push('rocket_live_api_products_empty');
      if (!products.some((product) => product.image || product.thumbnail || product.image_url || (Array.isArray(product.images) && product.images.length))) blockers.push('rocket_live_product_images_missing');
      live = { ...(live || {}), apiProductCount: products.length, sampleHandles: products.slice(0, 8).map((product) => product.handle || product.id).filter(Boolean) };
    } else if (!/data-product-handle|dBaronX products|Shop/.test(text)) {
      blockers.push(`rocket_live_${path}_catalog_markup_missing`);
    }
  }
} else {
  warnings.push('DBX_ROCKET_LIVE_SMOKE_not_true_live_web_assertions_skipped');
}
console.log(JSON.stringify({ success: blockers.length === 0, staticChecks: 'passed', live, blockers, warnings }, null, 2));
if (blockers.length) process.exit(1);

function assert(condition, blocker) { if (!condition) blockers.push(blocker); }
function extractProducts(payload) {
  const root = payload && typeof payload === 'object' ? payload : {};
  const nested = root.data && typeof root.data === 'object' ? root.data : root;
  for (const key of ['products', 'items', 'data']) if (Array.isArray(nested[key])) return nested[key].filter((item) => item && typeof item === 'object');
  return nested.product && typeof nested.product === 'object' ? [nested.product] : [];
}

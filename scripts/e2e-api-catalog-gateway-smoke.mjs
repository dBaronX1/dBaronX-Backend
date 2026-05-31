#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const files = {
  controller: await readFile('apps/api/src/modules/catalog/catalog.controller.ts', 'utf8'),
  service: await readFile('apps/api/src/modules/catalog/catalog.service.ts', 'utf8'),
  module: await readFile('apps/api/src/modules/catalog/catalog.module.ts', 'utf8'),
  platform: await readFile('apps/api/src/modules/platform/platform.module.ts', 'utf8'),
};
const blockers = [];
for (const route of ['@Get("products")', '@Get("products/:handle")', '@Get("readiness")']) {
  if (!files.controller.includes(route)) blockers.push(`missing_catalog_route_${route}`);
}
if (!files.service.includes('MedusaHttpService') || !files.service.includes('/store/products') || !files.service.includes('"store"')) blockers.push('catalog_does_not_call_medusa_store_internally');
for (const field of ['priceMinor', 'currencyCode', 'variantId', 'productId', 'inStock', 'inventoryStatus', 'supplier', 'realSupplierProduct', 'manualCurated', 'buyable', 'deliveryEstimate', 'sourceUrl', 'metadataPublic']) {
  if (!files.service.includes(field)) blockers.push(`missing_public_field_${field}`);
}
for (const secret of ['supplierPrice', 'supplierCost', 'shippingCost', 'MEDUSA_PUBLISHABLE_KEY', 'STRIPE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL', 'CJ_ACCESS_TOKEN', 'CJ_API_KEY']) {
  const exposedReturn = new RegExp(`${secret}['\"]?\\s*:`).test(files.service);
  if (exposedReturn) blockers.push(`catalog_exposes_${secret}`);
}
for (const readiness of ['medusaReachable', 'publishableKeyConfigured', 'productsVisible', 'productCount', 'firstCjProductVisible', 'manualCuratedBuyableCount', 'blockers']) {
  if (!files.service.includes(readiness)) blockers.push(`readiness_missing_${readiness}`);
}
if (!files.platform.includes('CatalogModule')) blockers.push('catalog_module_not_mounted');
console.log(JSON.stringify({ success: blockers.length === 0, blockers }, null, 2));
process.exit(blockers.length ? 1 : 0);

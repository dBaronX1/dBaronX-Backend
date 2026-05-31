#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const files = {
  env: await readFile('apps/web/src/lib/env.ts', 'utf8'),
  client: await readFile('apps/web/src/lib/api/medusa-store-client.ts', 'utf8'),
  server: await readFile('apps/web/src/lib/store-products-server.ts', 'utf8'),
  proxy: await readFile('apps/web/src/app/api/store/products/store-products-response.ts', 'utf8'),
  checkout: await readFile('apps/web/src/lib/checkout/stripe.ts', 'utf8'),
};
const blockers = [];
if (!files.env.includes('NEXT_PUBLIC_API_BASE_URL')) blockers.push('next_public_api_base_url_not_required');
if (/NEXT_PUBLIC_MEDUSA_(BASE_URL|BACKEND_URL|PUBLISHABLE_KEY)/.test(files.env)) blockers.push('public_medusa_env_still_exposed');
if (!files.client.includes('/api/catalog/products')) blockers.push('browser_catalog_not_pointed_at_api_catalog');
if (!files.server.includes('/api/catalog/products')) blockers.push('server_catalog_not_pointed_at_api_catalog');
if (!files.proxy.includes('nestApiRequest') || !files.proxy.includes('apiCatalogPath')) blockers.push('store_products_proxy_not_using_nest_api');
for (const source of [files.client, files.server, files.proxy, files.checkout]) {
  if (/\/store\/products/.test(source) && /MEDUSA|Medusa Store API|x-publishable-api-key/.test(source)) blockers.push('rocket_direct_medusa_store_dependency_present');
}
if (/NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY/.test(Object.values(files).join('\n'))) blockers.push('rocket_public_medusa_publishable_key_dependency_present');
console.log(JSON.stringify({ success: blockers.length === 0, blockers }, null, 2));
process.exit(blockers.length ? 1 : 0);

#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
const blockers = [];
const route = await readFile('apps/web/src/app/api/store/products/store-products-response.ts', 'utf8');
const routeEntry = await readFile('apps/web/src/app/api/store/products/route.ts', 'utf8');
const env = await readFile('apps/web/src/lib/env.ts', 'utf8');
const server = await readFile('apps/web/src/lib/store-products-server.ts', 'utf8');
const grid = await readFile('apps/web/src/components/dbx/ProductViews.tsx', 'utf8');
if (!route.includes('/store/products')) blockers.push('route_not_calling_medusa_store_products');
if (!route.includes('x-publishable-api-key')) blockers.push('publishable_key_header_missing');
if (!route.includes('success: handle ? Boolean(product) : true')) blockers.push('stable_success_json_missing');
if (!routeEntry.includes('category_id')) blockers.push('category_filter_forwarding_missing');
if (!env.includes('NEXT_PUBLIC_MEDUSA_BASE_URL') || !server.includes('NEXT_PUBLIC_MEDUSA_BASE_URL')) blockers.push('medusa_base_url_env_alias_missing');
for (const marker of ['productDisplayPrice', 'productPrimaryImage', 'Add to Cart', 'Buy Now', '/products/']) if (!grid.includes(marker)) blockers.push(`product_card_marker_missing_${marker}`);
if (/mens-cotton-linen-long-sleeve-casual-shirt/.test(grid)) blockers.push('product_grid_hardcodes_first_shirt');
if (/TypeError/.test(route)) blockers.push('route_exposes_typeerror');
console.log(JSON.stringify({ success: blockers.length === 0, blockers }, null, 2));
process.exit(blockers.length ? 1 : 0);

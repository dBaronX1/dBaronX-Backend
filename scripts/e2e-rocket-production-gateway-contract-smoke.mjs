#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const blockers = [];
const read = (path) => readFile(path, 'utf8').catch(() => '');

const files = {
  env: await read('apps/web/src/lib/env.ts'),
  publicApiClient: await read('apps/web/src/lib/api/dbx-api-client.ts'),
  medusaStoreClient: await read('apps/web/src/lib/api/medusa-store-client.ts'),
  serverProducts: await read('apps/web/src/lib/store-products-server.ts'),
  storeProxy: await read('apps/web/src/app/api/store/products/store-products-response.ts'),
  checkout: await read('apps/web/src/lib/checkout/stripe.ts'),
  checkoutPanel: await read('apps/web/src/components/dbx/StripeCheckoutPanel.tsx'),
  profile: await read('apps/web/src/components/dbx/CustomerAccountPanel.tsx'),
  aiStoriesProxy: await read('apps/web/src/app/api/ai-stories/route.ts'),
};

const requiredPages = {
  products: 'apps/web/src/app/(platform)/products/page.tsx',
  productDetail: 'apps/web/src/app/(platform)/products/[handle]/page.tsx',
  shop: 'apps/web/src/app/shop/page.tsx',
  cart: 'apps/web/src/app/cart/page.tsx',
  checkout: 'apps/web/src/app/checkout/page.tsx',
};
for (const [name, path] of Object.entries(requiredPages)) {
  if (!existsSync(path)) blockers.push(`missing_${name}_page`);
}

if (!files.env.includes('NEXT_PUBLIC_API_BASE_URL')) blockers.push('next_public_api_base_url_not_defined');
if (!files.publicApiClient.includes('NEXT_PUBLIC_API_BASE_URL') && !files.checkout.includes('NEXT_PUBLIC_API_BASE_URL')) blockers.push('rocket_api_client_not_using_next_public_api_base_url');
if (/NEXT_PUBLIC_MEDUSA_(BASE_URL|BACKEND_URL|PUBLISHABLE_KEY)/.test(files.env)) blockers.push('rocket_env_requires_next_public_medusa_runtime');

for (const [name, source] of Object.entries({ medusaStoreClient: files.medusaStoreClient, serverProducts: files.serverProducts, storeProxy: files.storeProxy })) {
  if (!source.includes('/api/catalog/products') && !source.includes('apiCatalogPath')) blockers.push(`${name}_does_not_target_api_catalog_products`);
  if (/x-publishable-api-key|NEXT_PUBLIC_MEDUSA|MEDUSA_PUBLISHABLE_KEY|MEDUSA_BASE_URL/.test(source)) blockers.push(`${name}_contains_direct_medusa_runtime_dependency`);
}

const browserSources = [
  files.env,
  files.publicApiClient,
  files.medusaStoreClient,
  files.serverProducts,
  files.checkout,
  files.checkoutPanel,
  files.profile,
].join('\n');
for (const secret of [
  'MEDUSA_PUBLISHABLE_KEY',
  'MEDUSA_BASE_URL',
  'STRIPE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'INTERNAL_SERVICE_TOKEN',
  'DATABASE_URL',
  'CJ_ACCESS_TOKEN',
  'CJ_API_KEY',
]) {
  if (browserSources.includes(secret)) blockers.push(`rocket_browser_source_exposes_${secret}`);
}
if (/x-publishable-api-key/.test(browserSources)) blockers.push('rocket_browser_source_contains_publishable_key_header');
if (/mens-cotton-linen-long-sleeve-casual-shirt/.test(browserSources)) blockers.push('rocket_browser_source_hardcodes_shirt_fallback');

if (!files.checkout.includes('/api/checkout/session')) blockers.push('checkout_not_targeting_nestjs_checkout_session');
for (const field of ['productId', 'variantId', 'priceMinor', 'quantity']) {
  if (!files.checkoutPanel.includes(field)) blockers.push(`checkout_payload_missing_${field}`);
}

for (const raw of ['email_verified', 'phone_verified', 'source', 'sub']) {
  if (new RegExp(`\\b${raw}\\b`).test(files.profile)) blockers.push(`profile_raw_metadata_${raw}_rendered`);
}
if (/Additional Info/i.test(files.profile)) blockers.push('profile_additional_info_section_present');
for (const option of ['Male', 'Female', 'Prefer not to say', 'He', 'She']) {
  if (!files.profile.includes(option)) blockers.push(`profile_missing_option_${option.toLowerCase().replaceAll(/[^a-z]+/g, '_')}`);
}
if (!files.profile.includes('type="file"') || !files.profile.includes('image/jpeg,image/jpg,image/png,image/webp')) blockers.push('profile_photo_picker_contract_missing');
for (const label of ['Country', 'Phone code', 'Language']) {
  if (!files.profile.includes(`label="${label}"`)) blockers.push(`profile_missing_single_line_${label.toLowerCase().replaceAll(' ', '_')}`);
}

if (!files.aiStoriesProxy.includes('/api/v1/ai-stories/generate')) blockers.push('ai_stories_proxy_not_targeting_nestjs_generate');
if (/api\.openai\.com|anthropic\.com|generativelanguage\.googleapis|OPENAI_API_KEY|ANTHROPIC_API_KEY|GEMINI_API_KEY/.test(files.aiStoriesProxy)) blockers.push('ai_stories_proxy_calls_provider_directly');
for (const code of ['validation_failed', 'provider_failed', 'fastapi_route_missing', 'fastapi_unavailable', 'rate_limited']) {
  if (!files.aiStoriesProxy.includes(code)) blockers.push(`ai_stories_missing_safe_error_code_${code}`);
}

console.log(JSON.stringify({ success: blockers.length === 0, blockers }, null, 2));
process.exit(blockers.length ? 1 : 0);

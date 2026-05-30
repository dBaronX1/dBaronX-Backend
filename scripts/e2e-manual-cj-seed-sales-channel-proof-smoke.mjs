#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SEED_PATH = 'apps/medusa/src/scripts/seed-manual-cj-curated-products.ts';
const DATA_PATH = 'apps/medusa/src/scripts/data/manual-cj-curated-products.ts';
const ROCKET_DIR = 'apps/web/src';
const seedSource = readFileSync(SEED_PATH, 'utf8');
const dataSource = readFileSync(DATA_PATH, 'utf8');
const rocketSource = readTree(ROCKET_DIR);
const blockers = [];
const warnings = [];

const requiredArtifactFields = [
  'success',
  'totalSeeded',
  'totalUpdated',
  'totalSkipped',
  'totalBlocked',
  'salesChannelId',
  'salesChannelSource',
  'publishableKeyTitleUsed',
  'salesChannelLinked',
  'storeApiProofReady',
  'storeApiProofSkippedReason',
  'warnings',
  'blockers',
  'nextManualStep',
];

for (const field of requiredArtifactFields) {
  if (!seedSource.includes(field)) blockers.push(`seed_artifact_missing_${field}`);
}

if (!seedSource.includes('dBaronX Live Storefront Publishable Key')) blockers.push('live_publishable_key_title_not_supported');
if (!seedSource.includes('STOREFRONT_KEY_TITLE = KEY_TITLE') && !seedSource.includes('dBaronX Storefront Publishable Key')) blockers.push('storefront_publishable_key_title_not_supported');
if (!/PUBLISHABLE_KEY_TITLES\s*=\s*\[\s*LIVE_STOREFRONT_KEY_TITLE,\s*STOREFRONT_KEY_TITLE,?\s*\]/.test(seedSource)) blockers.push('live_key_not_preferred_before_default_key');
if (!seedSource.includes('live_publishable_key_title')) blockers.push('live_publishable_key_source_missing');
if (!seedSource.includes('live_storefront_publishable_key')) blockers.push('storefront_publishable_key_source_missing');

if (!seedSource.includes('CANONICAL_ONLY_BLOCKERS')) blockers.push('canonical_only_blocker_filter_missing');
if (!/CANONICAL_ONLY_BLOCKERS[\s\S]*first_cj_product_not_linked_to_canonical_sales_channel/.test(seedSource)) blockers.push('canonical_first_cj_blocker_not_demoted');
if (!seedSource.includes('canonical_sales_channel_differs_from_live_publishable_key_channel')) blockers.push('canonical_mismatch_warning_missing');
if (!/pushUnique\(\s*warnings,\s*"canonical_sales_channel_differs_from_live_publishable_key_channel"/.test(seedSource)) blockers.push('canonical_mismatch_not_emitted_as_warning');
if (/pushUnique\(\s*blockers,\s*"canonical_sales_channel_differs_from_live_publishable_key_channel"/.test(seedSource)) blockers.push('canonical_mismatch_emitted_as_blocker');
if (!/liveSalesChannelResolved\s*&&\s*CANONICAL_ONLY_BLOCKERS\.has\(blocker\)[\s\S]*pushUnique\(warnings, blocker\)/.test(seedSource)) blockers.push('canonical_only_blockers_not_demoted_when_live_channel_resolved');

if (!seedSource.includes('live_storefront_publishable_key_sales_channel_missing')) blockers.push('missing_live_sales_channel_fatal_blocker');
if (!/if \(!liveSalesChannel\.salesChannelId\)[\s\S]*live_storefront_publishable_key_sales_channel_missing/.test(seedSource)) blockers.push('no_sales_channel_missing_not_fatal');
if (!seedSource.includes('live_sales_channel_link_missing_after_seed')) blockers.push('internal_sales_channel_link_proof_missing');
if (!/const salesChannelLinked = buyableProducts\.every/.test(seedSource)) blockers.push('all_buyable_products_link_check_missing');

if (!seedSource.includes('MEDUSA_PUBLISHABLE_KEY')) blockers.push('store_api_publishable_key_env_not_checked');
if (!seedSource.includes('/store/products?handle=')) blockers.push('store_api_products_visibility_check_missing');
if (!seedSource.includes('x-publishable-api-key')) blockers.push('store_api_publishable_key_header_missing');
if (!seedSource.includes('publishable_key_not_available_to_seed_runtime')) blockers.push('missing_publishable_key_skip_reason_missing');
if (!/storeApiProof\.blocker[\s\S]*pushUnique\(blockers, storeApiProof\.blocker\)/.test(seedSource)) blockers.push('store_api_visibility_failure_not_fatal');
if (!/storeApiProof\.storeApiProofSkippedReason\s*===\s*"publishable_key_not_available_to_seed_runtime"/.test(seedSource)) blockers.push('missing_publishable_key_skip_not_success_eligible');

if (!/const success =[\s\S]*blockers\.length === 0[\s\S]*totalBlocked === 0[\s\S]*salesChannelLinked[\s\S]*hasSeededOrUpdatedProducts/.test(seedSource)) blockers.push('success_logic_does_not_separate_warnings_from_fatal_blockers');
if (/const success =\s*blockers\.length === 0 && totalBlocked === 0;/.test(seedSource)) blockers.push('old_overly_strict_success_logic_still_present');

const products = parseProducts(dataSource);
const draftProducts = products.filter((product) => product.buyable === false);
if (draftProducts.length !== 1) blockers.push(`draft_product_count_expected_1_actual_${draftProducts.length}`);
const draft = draftProducts[0];
if (!draft || draft.action === 'published') blockers.push('draft_product_not_retained_as_non_buyable');
if (draft && (!draft.blockers.includes('missing_image') || !draft.blockers.includes('missing_inventory'))) blockers.push('draft_blockers_not_preserved');
if (!/for \(const draft of draftProducts\)[\s\S]*action: "skipped"/.test(seedSource)) blockers.push('draft_products_not_skipped_by_seed');

if (/tags\s*:/.test(seedSource.match(/function\s+productInput[\s\S]*?\n}\n\nfunction\s+validateBuyable/)?.[0] || '')) blockers.push('medusa_tag_associations_used_in_product_input');
if (/cjdropshipping\.com\/api|CJ_ACCESS_TOKEN|CJ_API_KEY|axios\.get\(/.test(seedSource)) blockers.push('cj_api_call_or_secret_used');
if (/fetch\([^\n]*(cjdropshipping|cj)/i.test(seedSource)) blockers.push('cj_fetch_call_used');

for (const product of products) {
  for (const signal of [product.sku, product.productUrl].filter(Boolean)) {
    if (rocketSource.includes(signal)) blockers.push(`rocket_hardcoded_product_signal_${product.sku}`);
  }
}

const secretLeakMarkers = findSecretLeaks(seedSource);
if (secretLeakMarkers.length) blockers.push('secret_value_print_or_assignment_detected');

const result = {
  success: blockers.length === 0,
  blockers,
  warnings,
  canonicalMismatchWarningReady: !blockers.includes('canonical_mismatch_warning_missing'),
  livePublishableKeyChannelAccepted: !blockers.includes('canonical_only_blockers_not_demoted_when_live_channel_resolved'),
  fatalWhenNoLiveSalesChannel: !blockers.includes('missing_live_sales_channel_fatal_blocker'),
  draftProductsSkipped: !blockers.includes('draft_products_not_skipped_by_seed'),
  noMedusaTagAssociations: !blockers.includes('medusa_tag_associations_used_in_product_input'),
  noCjApiCalls: !blockers.includes('cj_api_call_or_secret_used') && !blockers.includes('cj_fetch_call_used'),
  noRocketHardcoding: !blockers.some((blocker) => blocker.startsWith('rocket_hardcoded_product_signal_')),
  noSecretsPrinted: secretLeakMarkers.length === 0,
  nextManualStep: blockers.length
    ? `Resolve manual CJ sales-channel proof smoke blockers: ${blockers.join(', ')}.`
    : 'Manual CJ sales-channel proof static checks passed; live publishable-key sales-channel proof can succeed despite canonical fallback mismatch warnings.',
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);

function readTree(root) {
  let output = '';
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) output += readTree(path);
    if (stat.isFile()) output += `\n${readFileSync(path, 'utf8')}`;
  }
  return output;
}

function parseProducts(source) {
  const parsed = [];
  for (const match of source.matchAll(/\{\n([\s\S]*?)\n  \},/g)) {
    const block = match[1];
    if (!/sku:/.test(block)) continue;
    parsed.push({
      sku: stringField(block, 'sku'),
      productUrl: stringField(block, 'productUrl'),
      buyable: booleanField(block, 'buyable', block.includes('...BUYABLE_DEFAULTS') ? true : undefined),
      blockers: arrayField(block, 'blockers'),
    });
  }
  return parsed;
}

function stringField(block, key) {
  return block.match(new RegExp(`${key}:\\s*"([^"]*)"`))?.[1] || '';
}

function booleanField(block, key, fallback) {
  const match = block.match(new RegExp(`${key}:\\s*(true|false)`))?.[1];
  if (!match) return fallback;
  return match === 'true';
}

function arrayField(block, key) {
  const inner = block.match(new RegExp(`${key}:\\s*\\[([\\s\\S]*?)\\]`))?.[1] || '';
  return Array.from(inner.matchAll(/"([^"]+)"/g)).map((match) => match[1]);
}

function findSecretLeaks(source) {
  const names = [
    'DATABASE_URL',
    'MEDUSA_DATABASE_URL',
    'MEDUSA_PUBLISHABLE_KEY',
    'JWT_SECRET',
    'COOKIE_SECRET',
    'CJ_ACCESS_TOKEN',
    'CJ_API_KEY',
    'STRIPE_SECRET_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  const leaks = [];
  for (const [index, line] of source.split('\n').entries()) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;
    for (const name of names) {
      if (new RegExp(`${name}\\s*=\\s*['\"][^'\"]+`, 'i').test(trimmed)) leaks.push(`${index + 1}:${name}`);
      if (/console\.log|console\.error/.test(trimmed) && trimmed.includes(name) && !trimmed.includes('not_available')) leaks.push(`${index + 1}:${name}`);
    }
  }
  return leaks;
}

#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DATA_PATH = 'apps/medusa/src/scripts/data/manual-cj-curated-products.ts';
const SEED_PATH = 'apps/medusa/src/scripts/seed-manual-cj-curated-products.ts';
const WORKFLOW_PATH = '.github/workflows/medusa-manual-cj-curated-products.yml';
const ROCKET_DIR = 'apps/web/src';
const SECRET_NAMES = [
  'DATABASE_URL',
  'MEDUSA_DATABASE_URL',
  'CJ_ACCESS_TOKEN',
  'CJ_API_KEY',
  'JWT_SECRET',
  'COOKIE_SECRET',
  'STRIPE_SECRET_KEY',
  'MEDUSA_PUBLISHABLE_KEY',
];

const blockers = [];
const warnings = [];
const dataSource = read(DATA_PATH);
const seedSource = read(SEED_PATH);
const workflowSource = read(WORKFLOW_PATH);
const rocketSource = readTree(ROCKET_DIR);
const products = parseProducts(dataSource);
const buyableProducts = products.filter((product) => product.buyable === true);
const draftProducts = products.filter((product) => product.buyable === false);
const draft = draftProducts[0] || null;

if (products.length !== 9) blockers.push(`manual_curated_product_count_expected_9_actual_${products.length}`);
if (buyableProducts.length !== 8) blockers.push(`buyable_product_count_expected_8_actual_${buyableProducts.length}`);
if (draftProducts.length !== 1) blockers.push(`draft_product_count_expected_1_actual_${draftProducts.length}`);

for (const product of buyableProducts) {
  if (!product.title) blockers.push(`buyable_${product.sku || product.handle}_missing_title`);
  if (!product.sku) blockers.push(`buyable_${product.handle || product.title}_missing_sku`);
  if (!isHttpUrl(product.productUrl)) blockers.push(`buyable_${product.sku}_missing_product_url`);
  if (!isHttpUrl(product.imageUrl)) blockers.push(`buyable_${product.sku}_missing_image_url`);
  if (!(Number(product.inventory) > 0)) blockers.push(`buyable_${product.sku}_inventory_not_positive`);
  if (Number(product.shippingCostMinorUsd) < 0) blockers.push(`buyable_${product.sku}_shipping_cost_negative`);
  if (!(Number(product.sellingPriceMinorUsd) > Number(product.totalCostMinorUsd))) blockers.push(`buyable_${product.sku}_selling_price_not_above_total_cost`);
  if (!product.deliveryEstimate) blockers.push(`buyable_${product.sku}_missing_delivery_estimate`);
  if (product.supplierVerificationStatus !== 'manual_verified_for_checkout') blockers.push(`buyable_${product.sku}_not_manual_verified_for_checkout`);
  if (product.supplier !== 'cj') blockers.push(`buyable_${product.sku}_supplier_not_cj`);
  if (product.realSupplierProduct !== true || product.demo !== false || product.manualCurated !== true) blockers.push(`buyable_${product.sku}_metadata_flags_invalid`);
}

const requiredDraftBlockers = [
  'missing_image',
  'missing_inventory',
  'missing_supplier_price',
  'missing_shipping_cost',
  'missing_selling_price',
];
if (!buyableProducts.some((product) => product.sku === 'CJDS212420104DW' && product.handle === 'mens-cotton-linen-long-sleeve-casual-shirt')) blockers.push('first_seed_long_sleeve_product_missing_from_manual_curated_set');
if (buyableProducts.filter((product) => product.sku !== 'CJDS212420104DW').length !== 7) blockers.push('original_7_buyable_products_not_intact');

if (!draft) {
  blockers.push('draft_product_missing');
} else {
  if (draft.supplierVerificationStatus !== 'manual_draft_incomplete') blockers.push('draft_product_status_not_incomplete');
  for (const blocker of requiredDraftBlockers) {
    if (!draft.blockers.includes(blocker)) blockers.push(`draft_product_blocker_missing_${blocker}`);
  }
}

if (!/name:\s*Medusa Manual CJ Curated Products/.test(workflowSource)) blockers.push('workflow_name_missing');
if (!/confirmSeed:[\s\S]*type:\s*choice[\s\S]*default:\s*"false"/.test(workflowSource)) blockers.push('workflow_confirm_seed_input_invalid');
if (!/dryRun:[\s\S]*type:\s*choice[\s\S]*default:\s*"true"/.test(workflowSource)) blockers.push('workflow_dry_run_input_invalid');
if (!/includeDrafts:[\s\S]*type:\s*choice[\s\S]*default:\s*"false"/.test(workflowSource)) blockers.push('workflow_include_drafts_input_invalid');
if (!/MEDUSA_DATABASE_URL:\s*\$\{\{\s*secrets\.MEDUSA_DATABASE_URL\s*\}\}/.test(workflowSource)) blockers.push('workflow_medusa_database_secret_missing');
if (!/DATABASE_URL:\s*\$\{\{\s*secrets\.MEDUSA_DATABASE_URL\s*\}\}/.test(workflowSource)) blockers.push('workflow_database_url_not_set_from_medusa_secret');
if (/secrets\.DATABASE_URL/.test(workflowSource)) blockers.push('workflow_uses_generic_database_url_secret');
if (!/e2e-medusa-database-contract-smoke\.mjs/.test(workflowSource)) blockers.push('workflow_db_contract_preflight_missing');
if (!/confirm_seed_required/.test(workflowSource)) blockers.push('workflow_confirm_seed_required_guard_missing');
if (!/upload-artifact@v4/.test(workflowSource)) blockers.push('workflow_artifact_upload_missing');

if (!seedSource.includes('DBX_CONFIRM_MANUAL_CJ_CURATED_SEED') || !/!==\s*"true"/.test(seedSource)) blockers.push('seed_confirmation_guard_missing');
if (/cjdropshipping\.com\/api|CJ_ACCESS_TOKEN|CJ_API_KEY|axios\.get\(|fetch\(/.test(seedSource)) blockers.push('seed_appears_to_call_cj_api_or_use_cj_secret');
if (!seedSource.includes('DRY_RUN')) blockers.push('seed_dry_run_support_missing');
if (!seedSource.includes('manualCjCuratedProducts')) blockers.push('seed_data_module_import_missing');
if (/tags:\s*\[/.test(seedSource)) blockers.push('seed_product_input_still_passes_tags_array');
if (/id:\s*undefined/.test(seedSource)) blockers.push('seed_contains_undefined_tag_id_literal');
if (!seedSource.includes('TAG_MODE') || !seedSource.includes('metadata_only')) blockers.push('seed_tag_mode_metadata_only_missing');
if (!/function\s+definedTagIds[\s\S]*filter/.test(seedSource)) blockers.push('seed_undefined_tag_id_filter_missing');
if (!seedSource.includes('LIVE_STOREFRONT_KEY_TITLE') || !seedSource.includes('dBaronX Live Storefront Publishable Key')) blockers.push('seed_live_storefront_key_title_preference_missing');
if (!seedSource.includes('salesChannelSource')) blockers.push('seed_sales_channel_source_output_missing');
if (!seedSource.includes('productResults')) blockers.push('seed_product_results_output_missing');

for (const product of products) {
  const hardcodedSignals = [product.sku, product.productUrl].filter(Boolean);
  for (const signal of hardcodedSignals) {
    if (rocketSource.includes(signal)) blockers.push(`rocket_hardcoded_product_signal_${product.sku}`);
  }
}

const secretPrintLeaks = findSecretPrintLeaks(`${seedSource}\n${workflowSource}`);
if (secretPrintLeaks.length) blockers.push('secret_value_print_or_assignment_detected');

const result = {
  success: blockers.length === 0,
  blockers,
  warnings,
  totalProducts: products.length,
  buyableCount: buyableProducts.length,
  draftCount: draftProducts.length,
  workflowPath: WORKFLOW_PATH,
  seedRequiresConfirmation: !blockers.includes('seed_confirmation_guard_missing'),
  workflowUsesMedusaDatabaseUrlOnly: !blockers.includes('workflow_uses_generic_database_url_secret'),
  noRocketProductHardcoding: !blockers.some((blocker) => blocker.startsWith('rocket_hardcoded_product_signal_')),
  noSecretValuesPrinted: secretPrintLeaks.length === 0,
  nextManualStep: blockers.length
    ? `Resolve manual curated smoke blockers: ${blockers.join(', ')}.`
    : 'Static manual curated CJ seed checks passed. Run the GitHub workflow first with confirmSeed=true, dryRun=true, includeDrafts=false.',
};
console.log(JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);

function read(path) {
  return readFileSync(path, 'utf8');
}

function readTree(root) {
  let out = '';
  for (const entry of readdirSync(root)) {
    const full = join(root, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out += readTree(full);
    else if (/\.(tsx?|jsx?|json|css|md)$/.test(entry)) out += `\n/* ${full} */\n${read(full)}`;
  }
  return out;
}

function parseProducts(source) {
  const arrayStart = source.indexOf('export const manualCjCuratedProducts');
  const parsed = [];
  const objectMatches = source.slice(arrayStart).matchAll(/\{\n([\s\S]*?)\n  \},/g);
  for (const match of objectMatches) {
    const block = match[1];
    if (!/sku:/.test(block)) continue;
    parsed.push({
      sku: stringField(block, 'sku'),
      title: stringField(block, 'title'),
      handle: stringField(block, 'handle'),
      productUrl: stringField(block, 'productUrl'),
      imageUrl: stringField(block, 'imageUrl'),
      videoUrl: stringField(block, 'videoUrl'),
      label: stringField(block, 'label'),
      category: stringField(block, 'category'),
      inventory: numberField(block, 'inventory'),
      supplierPriceMinorUsd: numberField(block, 'supplierPriceMinorUsd'),
      shippingCostMinorUsd: numberField(block, 'shippingCostMinorUsd'),
      totalCostMinorUsd: numberField(block, 'totalCostMinorUsd'),
      sellingPriceMinorUsd: numberField(block, 'sellingPriceMinorUsd'),
      shippingWarehouse: stringField(block, 'shippingWarehouse') || (block.includes('...BUYABLE_DEFAULTS') ? 'china' : ''),
      shippingDestination: stringField(block, 'shippingDestination') || (block.includes('...BUYABLE_DEFAULTS') ? 'U.A.E' : ''),
      shippingCountries: arrayField(block, 'shippingCountries').length ? arrayField(block, 'shippingCountries') : (block.includes('...BUYABLE_DEFAULTS') ? ['AE'] : []),
      deliveryEstimate: stringField(block, 'deliveryEstimate') || (block.includes('...BUYABLE_DEFAULTS') ? '12-15 days' : ''),
      supplier: stringField(block, 'supplier') || (block.includes('...BUYABLE_DEFAULTS') ? 'cj' : ''),
      realSupplierProduct: booleanField(block, 'realSupplierProduct', block.includes('...BUYABLE_DEFAULTS') ? true : undefined),
      demo: booleanField(block, 'demo', block.includes('...BUYABLE_DEFAULTS') ? false : undefined),
      manualCurated: booleanField(block, 'manualCurated', block.includes('...BUYABLE_DEFAULTS') ? true : undefined),
      supplierVerificationStatus: stringField(block, 'supplierVerificationStatus') || (block.includes('...BUYABLE_DEFAULTS') ? 'manual_verified_for_checkout' : ''),
      buyable: booleanField(block, 'buyable', block.includes('...BUYABLE_DEFAULTS') ? true : undefined),
      blockers: arrayField(block, 'blockers'),
    });
  }
  return parsed;
}

function stringField(block, key) {
  const re = new RegExp(`${key}:\\s*"([^"]*)"`);
  return block.match(re)?.[1] || '';
}

function numberField(block, key) {
  const re = new RegExp(`${key}:\\s*(\\d+)`);
  return Number(block.match(re)?.[1] || 0);
}

function booleanField(block, key, fallback) {
  const re = new RegExp(`${key}:\\s*(true|false)`);
  const match = block.match(re)?.[1];
  if (!match) return fallback;
  return match === 'true';
}

function arrayField(block, key) {
  const re = new RegExp(`${key}:\\s*\\[([\\s\\S]*?)\\]`);
  const inner = block.match(re)?.[1] || '';
  return Array.from(inner.matchAll(/"([^"]+)"/g)).map((match) => match[1]);
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function findSecretPrintLeaks(source) {
  const leaks = [];
  for (const [index, line] of source.split('\n').entries()) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
    for (const name of SECRET_NAMES) {
      const assignment = new RegExp(`${name}\\s*=\\s*['\"][^'\"]+`, 'i');
      if (assignment.test(trimmed) && !trimmed.includes('secrets.MEDUSA_DATABASE_URL')) leaks.push(`${index + 1}:${trimmed.slice(0, 160)}`);
      if (/console\.log|echo|cat/.test(trimmed) && trimmed.includes(`$${name}`)) leaks.push(`${index + 1}:${trimmed.slice(0, 160)}`);
    }
  }
  return leaks;
}

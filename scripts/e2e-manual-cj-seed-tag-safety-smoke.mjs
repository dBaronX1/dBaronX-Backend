#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const SEED_PATH = 'apps/medusa/src/scripts/seed-manual-cj-curated-products.ts';
const seedSource = readFileSync(SEED_PATH, 'utf8');
const blockers = [];

if (/tags:\s*\[\s*\{\s*id:\s*undefined\s*\}\s*\]/.test(seedSource)) {
  blockers.push('seed_contains_tags_array_with_undefined_id');
}
if (/id:\s*undefined/.test(seedSource)) {
  blockers.push('seed_contains_undefined_id_literal');
}
if (!/function\s+definedTagIds[\s\S]*\.filter\(\(id\): id is string => typeof id === "string" && id\.length > 0\)/.test(seedSource)) {
  blockers.push('seed_does_not_filter_undefined_tag_ids');
}
const productInputBody = seedSource.match(/function\s+productInput[\s\S]*?\n}\n\nfunction\s+validateBuyable/)?.[0] || '';
if (/tags\s*:/.test(productInputBody)) {
  blockers.push('product_creation_input_depends_on_tags');
}
if (!seedSource.includes('const TAG_MODE = "metadata_only"') || !seedSource.includes('tagMode: TAG_MODE')) {
  blockers.push('real_seed_output_or_metadata_missing_tagMode');
}
if (!seedSource.includes('productResults') || !seedSource.includes('salesChannelSource')) {
  blockers.push('seed_artifact_missing_required_runtime_fields');
}

const result = {
  success: blockers.length === 0,
  blockers,
  tagMode: seedSource.includes('const TAG_MODE = "metadata_only"') ? 'metadata_only' : null,
  productCreationDependsOnTags: /tags\s*:/.test(productInputBody),
  nextManualStep: blockers.length
    ? `Resolve manual CJ tag-safety blockers: ${blockers.join(', ')}.`
    : 'Manual CJ seed tag-safety checks passed; product creation omits Medusa tag associations and records tagMode metadata.',
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);

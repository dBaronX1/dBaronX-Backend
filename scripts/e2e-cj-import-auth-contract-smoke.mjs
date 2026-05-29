#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const importerPath = 'apps/api/src/modules/suppliers/cj-import/cj-product-import.service.ts';
const adapterPath = 'apps/api/src/modules/suppliers/adapters/cj/cj-supplier-adapter.service.ts';
const operatorPath = 'apps/api/src/scripts/cj-operator-onboard-products.ts';
const workflowPath = '.github/workflows/cj-operator-onboarding.yml';

const importer = readFileSync(importerPath, 'utf8');
const adapter = readFileSync(adapterPath, 'utf8');
const operator = readFileSync(operatorPath, 'utf8');
const workflow = readFileSync(workflowPath, 'utf8');
const combined = `${importer}\n${adapter}\n${operator}\n${workflow}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const runImportStart = importer.indexOf('async runImport(');
assert(runImportStart >= 0, 'runImport missing');
const runImportEnd = importer.indexOf('async listRuns()', runImportStart);
const runImport = importer.slice(runImportStart, runImportEnd > runImportStart ? runImportEnd : undefined);
assert(runImport.includes('await this.assertImportUsesPreviewCredentialContract()'), 'import must preflight the same CJ credential contract as preview before staging');
assert(runImport.includes('const fetched = await this.cjAdapter.fetchProducts(category, capped)'), 'import must fetch with the same adapter product-list path as preview');
assert(!runImport.includes('CJ_API_KEY'), 'runImport must not require CJ_API_KEY when CJ_ACCESS_TOKEN is present');
assert(!runImport.includes('approve(') && !runImport.includes('publishApproved') && !runImport.includes('Medusa'), 'import must not approve, publish, or sync to Medusa');
assert(runImport.includes('.from("cj_product_import_items")') || runImport.includes(".from('cj_product_import_items')"), 'import must stage into app_private.cj_product_import_items');
assert(runImport.includes('approval_status: "pending_admin_approval"') || importer.includes('approval_status: "pending_admin_approval"'), 'imported products must remain pending admin approval');
assert(runImport.includes('response_mapping_empty') || importer.includes('response_mapping_empty'), 'empty product mapping must produce an exact blocker');

const authContractStart = importer.indexOf('private async assertImportUsesPreviewCredentialContract()');
assert(authContractStart >= 0, 'import auth contract guard missing');
const authContractEnd = importer.indexOf('private normalize(', authContractStart);
const authContract = importer.slice(authContractStart, authContractEnd > authContractStart ? authContractEnd : undefined);
assert(authContract.includes('requiredRuntimeCredential !== "CJ_ACCESS_TOKEN"'), 'import must require CJ_ACCESS_TOKEN runtime contract');
assert(authContract.includes('runtimeCredentialSource !== "CJ_ACCESS_TOKEN"'), 'import must use CJ_ACCESS_TOKEN runtime credential source');
assert(authContract.includes('adapterCredentialSource !== "CJ_ACCESS_TOKEN"'), 'import must use same adapter credential source as preview');
assert(authContract.includes('cjAuthMode !== "cj_access_token_header"'), 'import must use CJ-Access-Token header auth mode');
assert(authContract.includes('cj_import_auth_contract_mismatch'), 'code-level auth precheck mismatch must map to cj_import_auth_contract_mismatch');
assert(authContract.includes('cj_auth_failed_401'), 'CJ 401 auth failures must map to cj_auth_failed_401');
assert(authContract.includes('invalid_or_expired_cj_access_token'), 'invalid/expired CJ access token failures must be explicit');
assert(!authContract.includes('CJ_API_KEY'), 'import auth guard must not require CJ_API_KEY');

assert(adapter.includes('acceptedCredentialEnvNames: ["CJ_ACCESS_TOKEN"]'), 'adapter accepted runtime credential names must be CJ_ACCESS_TOKEN only');
assert(adapter.includes('const accessToken = this.getConfigValue("CJ_ACCESS_TOKEN")'), 'adapter must resolve CJ_ACCESS_TOKEN');
const resolver = adapter.slice(adapter.indexOf('private resolveRuntimeCredential()'), adapter.indexOf('private resolveBaseUrl()'));
assert(!resolver.includes('CJ_API_KEY'), 'adapter runtime resolver must not use CJ_API_KEY for product-list/import fetch');
assert(adapter.includes('headers: { "CJ-Access-Token": credential }'), 'adapter import fetch must use CJ-Access-Token header');
assert(adapter.includes('return "cj_auth_failed_401"'), 'live credential probe must classify 401 as cj_auth_failed_401');
assert(adapter.includes('return "invalid_or_expired_cj_access_token"'), 'live credential probe must classify invalid token distinctly');

assert(operator.includes('cjDiagnostics.cjAccessTokenPresent || cjDiagnostics.cjApiKeyPresent'), 'missingSecrets must remain empty when either CJ env var is present');
assert(operator.includes('["CJ_ACCESS_TOKEN_or_CJ_API_KEY"]'), 'operator missingSecrets fallback must not require CJ_API_KEY separately');
assert(operator.includes('cj_import_auth_contract_mismatch'), 'operator must surface auth contract mismatch blocker');
assert(operator.includes('invalid_or_expired_cj_access_token'), 'operator must surface invalid/expired CJ access token blocker');
assert(operator.includes('supabase_service_role_key_invalid_for_cj_import_staging'), 'operator must distinguish Supabase API key errors from CJ_API_KEY');
for (const blocker of ['validation_rejected_all_products', 'duplicate_all_items', 'staging_insert_failed', 'response_mapping_empty', 'missing_required_product_fields']) {
  assert(operator.includes(blocker), `operator must preserve exact zero-staged import blocker: ${blocker}`);
}
assert(!/BadRequestException\([`'"]Invalid API key[`'"]\)/.test(importer), 'generic Invalid API key must not be thrown from import path');
assert(!operator.includes('invalid_or_expired_cj_credential'), 'operator must not use generic CJ credential blocker for import auth');

for (const forbidden of [
  'echo $CJ_ACCESS_TOKEN',
  'echo ${CJ_ACCESS_TOKEN}',
  'echo $CJ_API_KEY',
  'echo ${CJ_API_KEY}',
  'CJ_ACCESS_TOKEN=',
  'CJ_API_KEY=',
  'printenv',
  'env |',
]) {
  assert(!combined.includes(forbidden), `token/key print risk: ${forbidden}`);
}

console.log(JSON.stringify({ success: true, smoke: 'cj-import-auth-contract', importerPath, adapterPath, operatorPath, workflowPath }));

#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/cj-operator-onboarding.yml', 'utf8');
const adapter = readFileSync('apps/api/src/modules/suppliers/adapters/cj/cj-supplier-adapter.service.ts', 'utf8');
const operator = readFileSync('apps/api/src/scripts/cj-operator-onboard-products.ts', 'utf8');
const importer = readFileSync('apps/api/src/modules/suppliers/cj-import/cj-product-import.service.ts', 'utf8');
const combined = `${workflow}\n${adapter}\n${operator}\n${importer}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const runStepStart = workflow.indexOf('name: Run CJ operator and capture JSON output');
assert(runStepStart >= 0, 'operator run step missing');
const runStepEnd = workflow.indexOf('- name: Validate operator output contract', runStepStart);
const runStep = workflow.slice(runStepStart, runStepEnd > runStepStart ? runStepEnd : undefined);

assert(runStep.includes('CJ_ACCESS_TOKEN: ${{ secrets.CJ_ACCESS_TOKEN }}'), 'CJ_ACCESS_TOKEN is not mapped into operator run step');
assert(runStep.includes('CJ_API_KEY: ${{ secrets.CJ_API_KEY }}'), 'CJ_API_KEY is not mapped into operator run step');
assert(!/if:\s*.*CJ_ACCESS_TOKEN/.test(runStep), 'operator step condition appears to strip CJ_ACCESS_TOKEN');

const runtimeResolverStart = adapter.indexOf('private resolveRuntimeCredential()');
assert(runtimeResolverStart >= 0, 'runtime credential resolver missing');
const runtimeResolverEnd = adapter.indexOf('private resolveBaseUrl()', runtimeResolverStart);
const runtimeResolver = adapter.slice(runtimeResolverStart, runtimeResolverEnd > runtimeResolverStart ? runtimeResolverEnd : undefined);
assert(runtimeResolver.includes('const accessToken = this.getConfigValue("CJ_ACCESS_TOKEN")'), 'runtime CJ_ACCESS_TOKEN lookup missing');
assert(adapter.includes('this.getConfigValue("CJ_API_KEY")'), 'CJ_API_KEY presence lookup missing');
assert(!runtimeResolver.includes('CJ_API_KEY'), 'CJ_API_KEY must not be considered by the runtime product-list credential resolver');
assert(!adapter.includes('if (apiKey) return { source: "CJ_API_KEY"'), 'CJ_API_KEY must not be used as a direct product-list token');

assert(operator.includes("return cjDiagnostics.cjAccessTokenPresent || cjDiagnostics.cjApiKeyPresent ? [] : ['CJ_ACCESS_TOKEN_or_CJ_API_KEY'];"), 'missingSecrets must only be emitted when both CJ env vars are absent');
assert(adapter.includes('throw new BadRequestException("cj_auth_failed_401")'), 'adapter must map CJ 401 to cj_auth_failed_401');
assert(operator.includes("'invalid_or_expired_cj_credential'"), 'operator must report invalid_or_expired_cj_credential for CJ 401');
assert(operator.includes('Regenerate CJ_ACCESS_TOKEN in CJ dashboard/API authorization and update GitHub Actions secret. Do not paste token.'), 'CJ 401 nextAction is missing');
assert(combined.includes('runtimeCredentialSource'), 'runtimeCredentialSource diagnostic missing');
assert(combined.includes('cjAuthMode'), 'cjAuthMode diagnostic missing');
assert(combined.includes('requiredRuntimeCredential'), 'requiredRuntimeCredential diagnostic missing');
assert(combined.includes('cjEndpointPath'), 'cjEndpointPath diagnostic missing');
assert(combined.includes('cjApiVersion'), 'cjApiVersion diagnostic missing');
assert(combined.includes('cjAuthHeaderNamePresent'), 'cjAuthHeaderNamePresent diagnostic missing');
assert(combined.includes('cjRequestMethod'), 'cjRequestMethod diagnostic missing');

for (const forbidden of [
  'echo $CJ_ACCESS_TOKEN',
  'echo ${CJ_ACCESS_TOKEN}',
  'echo $CJ_API_KEY',
  'echo ${CJ_API_KEY}',
  'printenv',
  'env |',
]) {
  assert(!combined.includes(forbidden), `secret print risk: ${forbidden}`);
}

assert(adapter.includes('https://developers.cjdropshipping.com/api2.0'), 'CJ API 2.0 default base URL missing');
assert(adapter.includes('return "/v1/product/list";'), 'CJ product list endpoint path missing');
assert(adapter.includes('"CJ-Access-Token"'), 'CJ access token header missing');

console.log(JSON.stringify({ success: true, smoke: 'cj-auth-contract' }));

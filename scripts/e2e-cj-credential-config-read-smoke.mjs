import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

function must(condition, message) {
  if (!condition) throw new Error(message);
}

function includesAll(text, values, label) {
  for (const value of values) must(text.includes(value), `${label} missing ${value}`);
}

const workflow = readFileSync('.github/workflows/cj-operator-onboarding.yml', 'utf8');
includesAll(workflow, [
  'CJ_ACCESS_TOKEN: ${{ secrets.CJ_ACCESS_TOKEN }}',
  'CJ_API_KEY: ${{ secrets.CJ_API_KEY }}',
  'CJ_ACCESS_TOKEN_or_CJ_API_KEY',
], 'workflow');

const adapter = readFileSync('apps/api/src/modules/suppliers/adapters/cj/cj-supplier-adapter.service.ts', 'utf8');
includesAll(adapter, [
  'this.getConfigValue("CJ_ACCESS_TOKEN")',
  'this.getConfigValue("CJ_API_KEY")',
  'adapterCredentialSource: "CJ_ACCESS_TOKEN" | "CJ_API_KEY" | null',
  'acceptedCredentialEnvNames: ["CJ_ACCESS_TOKEN", "CJ_API_KEY"]',
  'process.env[key]',
], 'adapter');
must(!adapter.includes('cj_access_token_missing'), 'adapter should not require only CJ_ACCESS_TOKEN');
must(!adapter.includes('cj_base_url_missing'), 'adapter should not require explicit CJ_API_BASE_URL');

const moduleSource = readFileSync('apps/api/src/scripts/cj-operator.module.ts', 'utf8');
includesAll(moduleSource, ['ConfigModule.forRoot', 'isGlobal: true', 'CjOperatorModule'], 'operator module');
for (const forbidden of ['AppModule', 'Wallet', 'Payout', 'Ads', 'Telegram', 'AiStories', 'Stripe', 'Paystack']) {
  must(!moduleSource.includes(forbidden), `operator module imports unrelated ${forbidden}`);
}

const operator = readFileSync('apps/api/src/scripts/cj-operator-onboard-products.ts', 'utf8');
includesAll(operator, [
  'safeCjDiagnostics',
  'CJ_ACCESS_TOKEN_or_CJ_API_KEY',
  'cj_credential_config_mismatch',
  'credentialBlocker',
  "? [credentialError ? credentialBlocker : 'operator_run_failed']",
  'sanitizeStack',
], 'operator script');
must(!operator.includes("runStarted\n        ? ['operator_bootstrap_failed']"), 'run failures must not be classified as bootstrap failures');

const distScript = 'apps/api/dist/scripts/cj-operator-onboard-products.js';
if (existsSync(distScript)) {
  const tempDir = mkdtempSync(join(tmpdir(), 'cj-credential-config-'));
  const outputPath = join(tempDir, 'cj-output.json');
  const run = spawnSync('node', [distScript], {
    env: {
      ...process.env,
      CJ_OPERATOR_MODE: 'preview',
      CJ_OPERATOR_DRY_RUN: 'true',
      CJ_OPERATOR_CATEGORY: 'electronics',
      CJ_OPERATOR_LIMIT_PER_CATEGORY: '1',
      CJ_OPERATOR_OUTPUT_PATH: outputPath,
      DATABASE_URL: '',
      SUPABASE_URL: 'http://localhost:54321',
      SUPABASE_SERVICE_ROLE_KEY: 'credential-smoke-service-role',
      CJ_ACCESS_TOKEN: '',
      CJ_API_KEY: '',
      CJ_API_BASE_URL: '',
    },
    encoding: 'utf8',
  });

  must(existsSync(outputPath), 'operator did not write credential smoke output');
  const payload = JSON.parse(readFileSync(outputPath, 'utf8'));
  const stdout = run.stdout || '';
  const merged = `${stdout}\n${run.stderr || ''}\n${JSON.stringify(payload)}`;

  must(stdout.includes('operatorBootstrapComplete=true'), 'operator did not complete bootstrap');
  must((payload.blockers || []).includes('cj_credentials_missing'), 'missing CJ credential blocker absent');
  must(!(payload.blockers || []).includes('operator_bootstrap_failed'), 'run-time credential failure classified as bootstrap failure');
  must(JSON.stringify(payload.missingSecrets || []) === JSON.stringify(['CJ_ACCESS_TOKEN_or_CJ_API_KEY']), 'missingSecrets must align with adapter credential aliases');

  const diagnostics = payload.cjDiagnostics || {};
  for (const key of [
    'cjAccessTokenPresent',
    'cjApiKeyPresent',
    'cjCredentialConfigured',
    'cjApiBaseUrlConfigured',
    'workflowCredentialPrecheckPresent',
    'adapterCredentialPrecheckMismatch',
  ]) {
    must(typeof diagnostics[key] === 'boolean', `diagnostic ${key} must be boolean`);
  }
  must(Array.isArray(diagnostics.acceptedCredentialEnvNames), 'acceptedCredentialEnvNames must be an array of env names');
  must(diagnostics.acceptedCredentialEnvNames.join(',') === 'CJ_ACCESS_TOKEN,CJ_API_KEY', 'acceptedCredentialEnvNames mismatch');
  must(diagnostics.adapterCredentialSource === null || diagnostics.adapterCredentialSource === 'CJ_ACCESS_TOKEN' || diagnostics.adapterCredentialSource === 'CJ_API_KEY', 'adapterCredentialSource must be safe enum/null');

  for (const marker of ['CJ_ACCESS_TOKEN=', 'CJ_API_KEY=', 'DATABASE_URL=', 'SUPABASE_SERVICE_ROLE_KEY=', 'MEDUSA_ADMIN_API_KEY=']) {
    must(!merged.includes(marker), `credential value print risk: ${marker}`);
  }
}

console.log(JSON.stringify({ success: true, smoke: 'cj-credential-config-read' }));

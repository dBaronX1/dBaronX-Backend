import { readFileSync, existsSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const source = readFileSync('apps/api/src/scripts/cj-operator-onboard-products.ts', 'utf8');
if (!source.includes('CjOperatorModule')) throw new Error('operator script must use CjOperatorModule');
if (source.includes('AppModule')) throw new Error('operator script must not bootstrap AppModule directly');
if (!source.includes('CJ_OPERATOR_BOOTSTRAP_TIMEOUT_MS')) throw new Error('missing bootstrap timeout env usage');
for (const key of ['moduleName', 'bootstrapStarted', 'bootstrapComplete', 'bootstrapDurationMs', 'usedLightweightModule', 'timeoutMs']) {
  if (!source.includes(key)) throw new Error(`missing bootstrapDiagnostics key: ${key}`);
}

const moduleSource = readFileSync('apps/api/src/scripts/cj-operator.module.ts', 'utf8');
for (const banned of ['PlatformModule', 'SystemModule', 'DbxPaymentsModule', 'WalletModule']) {
  if (moduleSource.includes(banned)) throw new Error(`lightweight operator module should not import ${banned}`);
}

const distScript = 'apps/api/dist/scripts/cj-operator-onboard-products.js';
if (!existsSync(distScript)) throw new Error(`dist script missing at ${distScript}`);
const tempDir = mkdtempSync(join(tmpdir(), 'cj-operator-lightweight-'));
const outputPath = join(tempDir, 'out.json');
const run = spawnSync('node', [distScript], {
  env: { ...process.env, CJ_OPERATOR_MODE: 'preview', CJ_OPERATOR_DRY_RUN: 'true', CJ_OPERATOR_OUTPUT_PATH: outputPath, CJ_OPERATOR_BOOTSTRAP_TIMEOUT_MS: '1', SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '', CJ_ACCESS_TOKEN: '', CJ_API_BASE_URL: '' },
  encoding: 'utf8',
});
const payload = JSON.parse(readFileSync(outputPath, 'utf8'));
if (!payload.bootstrapDiagnostics || typeof payload.bootstrapDiagnostics !== 'object') throw new Error('missing bootstrapDiagnostics in output');
if (!['operator_bootstrap_timeout', 'operator_bootstrap_failed'].some((b) => (payload.blockers || []).includes(b))) throw new Error('expected controlled bootstrap blocker');
const merged = `${run.stdout || ''}\n${run.stderr || ''}`;
for (const marker of ['CJ_ACCESS_TOKEN=', 'CJ_API_KEY=', 'SUPABASE_SERVICE_ROLE_KEY=', 'MEDUSA_ADMIN_API_KEY=']) {
  if (merged.includes(marker)) throw new Error(`secret leakage detected: ${marker}`);
}
console.log(JSON.stringify({ success: true, smoke: 'cj-operator-lightweight-bootstrap', exitCode: run.status }));

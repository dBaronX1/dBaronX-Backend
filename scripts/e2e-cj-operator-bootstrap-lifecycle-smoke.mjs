import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const distScript = 'apps/api/dist/scripts/cj-operator-onboard-products.js';
if (!existsSync(distScript)) throw new Error(`dist script missing at ${distScript}`);

const tempDir = mkdtempSync(join(tmpdir(), 'cj-operator-bootstrap-'));
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
    SUPABASE_URL: '',
    SUPABASE_SERVICE_ROLE_KEY: '',
    CJ_ACCESS_TOKEN: '',
    CJ_API_KEY: '',
  },
  encoding: 'utf8',
});
if (!existsSync(outputPath)) throw new Error('operator did not write output file');
const payload = JSON.parse(readFileSync(outputPath, 'utf8'));

const stdout = `${run.stdout || ''}`;
const merged = `${stdout}\n${run.stderr || ''}`;
if (!stdout.includes('operatorEntrypointReached=true')) throw new Error('missing entrypoint marker');
if (!stdout.includes('operatorBootstrapStarting=true')) throw new Error('missing bootstrap-start marker');
if (!stdout.includes('operatorFinalOutputWritten=true')) throw new Error('missing final-output marker');

const blockerSet = new Set(Array.isArray(payload.blockers) ? payload.blockers : []);
if (blockerSet.has('operator_bootstrap_incomplete')) throw new Error('operator_bootstrap_incomplete should not be final blocker for controlled run');

const allowedPreNest = blockerSet.has('github_secret_missing') || blockerSet.has('cj_credentials_missing') || blockerSet.has('operator_bootstrap_failed') || blockerSet.has('operator_bootstrap_timeout');
const sawBootstrapComplete = stdout.includes('operatorBootstrapComplete=true');
const sawRunStart = stdout.includes('operatorRunStarting=true');
if (!sawBootstrapComplete && !allowedPreNest) {
  throw new Error('missing bootstrap-complete marker without acceptable config blocker');
}
if (sawBootstrapComplete && !sawRunStart) {
  throw new Error('missing run-start marker after bootstrap-complete');
}

for (const k of ['success','mode','dryRun','requestedLimitPerCategory','totalCategories','categoryResults','blockers','medusaSyncBlockers','missingSecrets','dbDiagnostics','cjDiagnostics','medusaDiagnostics','bootstrapDiagnostics','errorName','errorMessage','errorStackPreview','nextAction']) {
  if (!(k in payload)) throw new Error(`missing hardened field: ${k}`);
}
for (const marker of ['CJ_ACCESS_TOKEN=', 'CJ_API_KEY=', 'SUPABASE_SERVICE_ROLE_KEY=']) {
  if (merged.includes(marker)) throw new Error(`secret leakage detected: ${marker}`);
}

console.log(JSON.stringify({ success: true, smoke: 'cj-operator-bootstrap-lifecycle', exitCode: run.status }));

if (payload.errorName === 'OperatorExitedBeforeFinalOutput') throw new Error('unexpected vague exit failure for controlled lifecycle');

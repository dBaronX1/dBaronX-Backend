import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';

execFileSync('pnpm', ['--filter', 'dbaronx-api', 'build'], { stdio: 'inherit' });
const distScript = 'apps/api/dist/scripts/cj-operator-onboard-products.js';
if (!existsSync(distScript)) throw new Error(`dist script missing at ${distScript}`);

const tempDir = mkdtempSync(join(tmpdir(), 'cj-operator-compiled-'));
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
if (!existsSync(outputPath)) throw new Error('compiled operator did not write output file');
const payload = JSON.parse(readFileSync(outputPath, 'utf8'));
for (const k of ['success','mode','dryRun','requestedLimitPerCategory','totalCategories','categoryResults','blockers','medusaSyncBlockers','missingSecrets','dbDiagnostics','cjDiagnostics','medusaDiagnostics','errorName','errorMessage','errorStackPreview','nextAction']) {
  if (!(k in payload)) throw new Error(`missing key: ${k}`);
}
if ((payload.blockers || []).includes('operator_output_empty')) throw new Error('blocker operator_output_empty should not occur');
const stdout = run.stdout || '';
if (!stdout.includes('operatorEntrypointReached=true')) throw new Error('missing entrypoint diagnostic stdout marker');
const merged = `${stdout}\n${run.stderr || ''}`;
for (const marker of ['CJ_ACCESS_TOKEN=', 'CJ_API_KEY=', 'SUPABASE_SERVICE_ROLE_KEY=']) {
  if (merged.includes(marker)) throw new Error(`secret leakage detected: ${marker}`);
}
console.log(JSON.stringify({ success: true, smoke: 'cj-operator-compiled-output', exitCode: run.status }));

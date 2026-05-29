#!/usr/bin/env node

import fs from 'node:fs';

const workflowPath = '.github/workflows/medusa-publishable-key.yml';
const medusaPackagePath = 'apps/medusa/package.json';
const rootPackagePath = 'package.json';
const docsPath = 'docs/live-stripe-supplier-checkout.md';
const scriptPath = 'apps/medusa/src/scripts/ensure-publishable-key.ts';

const failures = [];
const pass = (name, value) => {
  if (!value) failures.push(name);
};
const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const workflow = read(workflowPath);
const medusaPackage = JSON.parse(read(medusaPackagePath));
const rootPackage = JSON.parse(read(rootPackagePath));
const docs = read(docsPath);
const script = read(scriptPath);
const allManagedText = [workflow, docs, script].join('\n');

pass('workflow_exists', fs.existsSync(workflowPath));
pass('workflow_dispatch_exists', /workflow_dispatch:\s*\n/.test(workflow));
pass('workflow_uses_medusa_database_url_secret', /MEDUSA_DATABASE_URL:\s*\$\{\{\s*secrets\.MEDUSA_DATABASE_URL\s*\}\}/.test(workflow));
pass('workflow_sets_database_url_from_medusa_database_url', /DATABASE_URL:\s*\$\{\{\s*secrets\.MEDUSA_DATABASE_URL\s*\}\}/.test(workflow));
pass('workflow_does_not_use_generic_database_secret', !/secrets\.DATABASE_URL/.test(workflow));
pass('workflow_has_list_mode', /-\s*list\b/.test(workflow));
pass('workflow_has_ensure_mode', /-\s*ensure\b/.test(workflow));
pass('workflow_has_confirm_create_gate', /confirmCreate/.test(workflow) && /DBX_CONFIRM_CREATE_PUBLISHABLE_KEY/.test(workflow));
pass('workflow_runs_db_contract_preflight', /e2e-medusa-database-contract-smoke\.mjs/.test(workflow));

const installStepIndex = workflow.indexOf('name: Install dependencies');
const dbPreflightStepIndex = workflow.indexOf('name: Run Medusa DB contract preflight');
pass('workflow_installs_before_db_contract_preflight', installStepIndex >= 0 && dbPreflightStepIndex > installStepIndex && workflow.slice(installStepIndex, dbPreflightStepIndex).includes('pnpm install --frozen-lockfile'));
pass('workflow_runs_package_script', /pnpm --filter @dbaronx\/medusa run publishable-key:ensure/.test(workflow));
pass('output_artifact_path_exists_in_workflow', /artifacts\/medusa-publishable-key-output\.json/.test(workflow));
pass('workflow_uploads_artifact', /actions\/upload-artifact@v4/.test(workflow) && /medusa-publishable-key-output/.test(workflow));
pass('medusa_package_script_exists', medusaPackage.scripts?.['publishable-key:ensure'] === 'pnpm exec medusa exec ./src/scripts/ensure-publishable-key.ts');
pass('root_package_script_exists', rootPackage.scripts?.['medusa:publishable-key:ensure'] === 'pnpm --filter @dbaronx/medusa run publishable-key:ensure');
pass('script_has_required_title', /dBaronX Storefront Publishable Key/.test(script));
pass('script_writes_artifact_without_logging_full_token', /MEDUSA_PUBLISHABLE_KEY_OUTPUT_PATH/.test(script) && /publishableKeyToken/.test(script) && /console\.error/.test(script));
pass('docs_mention_x_publishable_api_key', /x-publishable-api-key/.test(docs));
pass('docs_mentions_workflow', /Medusa Publishable Key/.test(docs));

const hardcodedSecretPatterns = [
  /MEDUSA_PUBLISHABLE_KEY\s*=\s*['\"]?(?!<|\$|\s|$)[A-Za-z0-9_\-]{12,}/,
  /NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY\s*=\s*['\"]?(?!<|\$|\s|$)[A-Za-z0-9_\-]{12,}/,
  /MEDUSA_DATABASE_URL\s*=\s*['\"]?(?!<|\$|\s|$)[^\s'\"]{12,}/,
  /DATABASE_URL\s*=\s*['\"]?(?!<|\$|\s|$)[^\s'\"]{12,}/,
  /JWT_SECRET\s*=\s*['\"]?(?!<|\$|\s|$)[A-Za-z0-9_\-]{12,}/,
  /COOKIE_SECRET\s*=\s*['\"]?(?!<|\$|\s|$)[A-Za-z0-9_\-]{12,}/,
];
pass('no_secret_values_hardcoded', hardcodedSecretPatterns.every((pattern) => !pattern.test(allManagedText)));

const result = {
  success: failures.length === 0,
  workflowPath,
  artifactPath: 'artifacts/medusa-publishable-key-output.json',
  failures,
  nextManualStep: failures.length
    ? 'Fix the Medusa publishable-key workflow contract failures above.'
    : 'Run the Medusa Publishable Key workflow with mode=list first, then mode=ensure and confirmCreate=true only if no linked key exists.',
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);

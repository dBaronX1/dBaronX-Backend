import fs from 'node:fs';

const workflow = '.github/workflows/cj-operator-onboarding.yml';
if (!fs.existsSync(workflow)) throw new Error('workflow missing');
const yaml = fs.readFileSync(workflow, 'utf8');

const must = [
  'name: CJ Operator Onboarding',
  'workflow_dispatch:',
  'mode:',
  '- readiness',
  '- onboard-category',
  '- onboard-batch',
  'node apps/api/dist/scripts/cj-operator-onboard-products.js',
  'CJ_OPERATOR_READINESS_EXIT_ZERO',
  'DBX_CONFIRM_CJ_OPERATOR_ONBOARDING',
  "inputs.mode == 'onboard-category' || inputs.mode == 'onboard-batch'",
];
for (const key of must) if (!yaml.includes(key)) throw new Error(`missing ${key}`);

const forbidden = [
  'ts-node',
  'echo $DATABASE_URL',
  'echo $SUPABASE_SERVICE_ROLE_KEY',
  'echo $CJ_ACCESS_TOKEN',
  'echo $CJ_API_KEY',
  'printenv',
];
for (const key of forbidden) if (yaml.includes(key)) throw new Error(`forbidden ${key}`);

const docsPath = 'docs/cj-operator-render-operations.md';
if (!fs.existsSync(docsPath)) throw new Error('docs file missing');
const docs = fs.readFileSync(docsPath, 'utf8');
if (!docs.includes('Do **not** use the CJ operator as the Render API web service Start Command.')) {
  throw new Error('missing start command warning in docs');
}

console.log('ok cj operator github actions smoke');

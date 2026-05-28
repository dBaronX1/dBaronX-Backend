import { readFileSync } from 'node:fs';
const yaml = readFileSync('.github/workflows/cj-operator-onboarding.yml','utf8');
for (const key of [
  'CJ_OPERATOR_DRY_RUN',
  'CJ_OPERATOR_MODE',
  'CJ_OPERATOR_CATEGORY',
  'CJ_OPERATOR_LIMIT_PER_CATEGORY',
  'github_secret_missing',
  'operator_not_invoked',
  'operator_exception',
  'totalMedusaSynced',
  'medusaDiagnostics',
  'medusaSyncBlockers',
  'errorName',
  'errorMessage',
  'errorStackPreview',
  'operatorStarted=true',
  'distScriptPresent=',
  'if-no-files-found: error',
  'totalFetched',
]) if(!yaml.includes(key)) throw new Error(`missing ${key}`);
console.log(JSON.stringify({success:true,smoke:'cj-operator-github-actions'}));

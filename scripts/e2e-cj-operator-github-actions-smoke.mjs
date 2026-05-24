import fs from 'node:fs';
const workflow = '.github/workflows/cj-operator-onboarding.yml';
const yaml = fs.readFileSync(workflow, 'utf8');
for (const key of ['categorySet:','- all','- custom','targetPerCategory:','default: \'50\'','labelRotationLimit:','default: \'3\'','electronics,fashion,home-living,beauty,sports,automotive,agriculture,tech,finance','CJ_OPERATOR_TARGET_PER_CATEGORY','CJ_OPERATOR_LABEL_ROTATION_LIMIT','CJ_OPERATOR_CATEGORY_SET']) if(!yaml.includes(key)) throw new Error(`missing ${key}`);
for (const key of ['echo $DATABASE_URL','echo $SUPABASE_SERVICE_ROLE_KEY','echo $CJ_ACCESS_TOKEN','echo $CJ_API_KEY','printenv']) if (yaml.includes(key)) throw new Error(`forbidden ${key}`);
if (yaml.includes('with: { version: 9 }')) throw new Error('pnpm version mismatch: workflow pins version 9');
for (const key of ['mkdir -p artifacts','tee artifacts/cj-operator-output.json','if-no-files-found: warn','if: always()','set -o pipefail','operator_exit_code=0','operatorExitCode=','GITHUB_OUTPUT','Show safe operator JSON preview','Workflow summary','Download artifact for JSON details','CJ_OPERATOR_READINESS_EXIT_ZERO']) if(!yaml.includes(key)) throw new Error(`missing ${key}`);
for (const key of ['printenv','env |','set |']) if (yaml.includes(key)) throw new Error(`forbidden env dump ${key}`);
console.log('ok cj operator github actions smoke');

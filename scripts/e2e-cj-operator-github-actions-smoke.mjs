import fs from 'node:fs';
const yaml = fs.readFileSync('.github/workflows/cj-operator-onboarding.yml', 'utf8');
for (const key of ['CJ_OPERATOR_DRY_RUN','CJ_OPERATOR_MODE','CJ_OPERATOR_CATEGORY','CJ_OPERATOR_LIMIT_PER_CATEGORY','github_secret_missing','operator_output_empty','if-no-files-found: error']) if(!yaml.includes(key)) throw new Error(`missing ${key}`);
console.log('ok cj operator github actions smoke');

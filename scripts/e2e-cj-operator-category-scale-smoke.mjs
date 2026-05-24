import fs from 'node:fs';
const op=fs.readFileSync('apps/api/src/scripts/cj-operator-onboard-products.ts','utf8');
for (const key of ['DEFAULT_TARGET_PER_CATEGORY = 50','DEFAULT_LABEL_ROTATION_LIMIT = 3','CJ_OPERATOR_CATEGORY_SET','targetPerCategory','labelRotationLimit','categoryLabelSummary','regulated_finance_risk','duplicateSkipped','restrictedSkipped']) if(!op.includes(key)) throw new Error(`missing ${key}`);
for (const cat of ['electronics','fashion','home-living','beauty','sports','automotive','agriculture','tech','finance']) if(!op.includes(cat)) throw new Error(`category not referenced: ${cat}`);
console.log('ok cj operator category scale smoke');

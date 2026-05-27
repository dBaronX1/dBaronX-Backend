import { readFileSync } from 'node:fs';
const op = readFileSync('apps/api/src/scripts/cj-operator-onboard-products.ts','utf8');
const categories = readFileSync('apps/api/src/modules/suppliers/cj-import/cj-product-categories.ts','utf8');
for (const k of ['DEFAULT_LIMIT_PER_CATEGORY = 50','requestedLimitPerCategory','categoryResults','duplicateCount','restrictedRejectedCount','totalFetched','partialReason']) if(!op.includes(k)) throw new Error(`missing ${k}`);
for (const c of ['electronics','fashion','home-living','beauty','sports','automotive','agriculture','tech','finance']) if(!categories.includes(c)) throw new Error(`missing category ${c}`);
console.log(JSON.stringify({success:true,smoke:'cj-operator-category-scale'}));

import fs from 'node:fs';
const op=fs.readFileSync('apps/api/src/scripts/cj-operator-onboard-products.ts','utf8');
for (const k of ['DEFAULT_LIMIT_PER_CATEGORY = 50','requestedLimitPerCategory','categoryResults','duplicateCount','restrictedRejectedCount']) if(!op.includes(k)) throw new Error(`missing ${k}`);
for (const c of ['electronics','fashion','home-living','beauty','sports','automotive','agriculture','tech','finance']) if(!op.includes(c)) throw new Error(`missing category ${c}`);
console.log('ok cj operator category scale smoke');

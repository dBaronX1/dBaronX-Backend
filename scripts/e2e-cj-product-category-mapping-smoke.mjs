import fs from 'node:fs';
const p='apps/api/src/modules/suppliers/cj-import/cj-product-categories.ts';
const txt=fs.readFileSync(p,'utf8');
for (const slug of ['all','electronics','fashion','home-living','beauty','sports','automotive','agriculture','tech','finance']) if(!txt.includes(slug)) throw new Error(`missing ${slug}`);
console.log('ok category mapping smoke');

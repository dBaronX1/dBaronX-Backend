import { readFileSync } from 'node:fs';
const txt = readFileSync('apps/api/src/modules/suppliers/cj-import/cj-product-categories.ts','utf8');
for (const slug of ['electronics','fashion','home-living','beauty','sports','automotive','agriculture','tech','finance']) if(!txt.includes(slug)) throw new Error(`missing ${slug}`);
if(!txt.includes('CJ_OPERATOR_ALL_CATEGORY_SET')) throw new Error('missing all category set constant');
console.log(JSON.stringify({success:true,smoke:'cj-product-category-mapping'}));

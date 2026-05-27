import { readFileSync } from 'node:fs';
const txt = readFileSync('apps/api/src/modules/suppliers/cj-import/cj-product-import.service.ts','utf8');
if (txt.includes('mockProducts(')) throw new Error('mockProducts should not be used');
if (!txt.includes('fetchProducts(')) throw new Error('real CJ fetch path missing');
console.log(JSON.stringify({success:true,smoke:'cj-real-api-no-mock-import'}));

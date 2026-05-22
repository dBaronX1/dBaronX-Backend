import fs from 'node:fs';
const p='apps/api/src/modules/suppliers/cj-import/cj-product-import.controller.ts';
if(!fs.existsSync(p)) throw new Error('missing controller');
const txt=fs.readFileSync(p,'utf8');
for (const e of ['import-preview','import-run','publish-approved']) if(!txt.includes(e)) throw new Error(`missing ${e}`);
console.log('ok cj automated import smoke');

import fs from 'node:fs';
const script = fs.readFileSync('apps/api/src/scripts/cj-operator-onboard-products.ts','utf8');
if (!script.includes('CJ_OPERATOR_OUTPUT_PATH')) throw new Error('missing output path support');
if (!script.includes('operator_exception')) throw new Error('missing operator_exception contract');
if (!script.includes('writeFileSync')) throw new Error('script does not write artifact itself');
console.log('ok');

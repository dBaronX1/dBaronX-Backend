import fs from 'node:fs';
const file = fs.readFileSync('apps/api/src/scripts/cj-operator-onboard-products.ts','utf8');
for (const token of ['full-safe','totalMedusaSynced','medusaDiagnostics','publish-approved']) {
  if (!file.includes(token)) throw new Error(`missing ${token}`);
}
if (file.includes('mockProducts')) throw new Error('mockProducts should not appear');
console.log('ok');

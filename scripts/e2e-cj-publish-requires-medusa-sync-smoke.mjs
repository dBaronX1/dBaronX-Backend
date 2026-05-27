import fs from 'node:fs';
const file = fs.readFileSync('apps/api/src/modules/suppliers/cj-import/cj-product-publish.service.ts','utf8');
for (const token of ['medusa_sync_not_configured','MEDUSA_BASE_URL','MEDUSA_URL','MEDUSA_ADMIN_API_KEY','MEDUSA_API_KEY','medusaSynced']) {
  if (!file.includes(token)) throw new Error(`missing ${token}`);
}
console.log('ok');

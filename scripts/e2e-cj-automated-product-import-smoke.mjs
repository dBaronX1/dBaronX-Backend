import fs from 'node:fs';
const p='apps/api/src/modules/suppliers/cj-import/cj-product-import.controller.ts';
const clientPath='apps/telegram-bot/src/services/nestjs_client.py';
if(!fs.existsSync(p)) throw new Error('missing controller');
const txt=fs.readFileSync(p,'utf8');
const client=fs.readFileSync(clientPath,'utf8');

if (txt.includes('@Controller("api/admin/cj/products")')) throw new Error('controller base path must not include api/admin/cj/products');
if (!txt.includes('@Controller("admin/cj/products")')) throw new Error('controller base path must be admin/cj/products');
if (!txt.includes('@UseGuards(InternalAuthGuard)')) throw new Error('InternalAuthGuard missing');

const expectedRuntimeRoutes = [
  '/api/admin/cj/products/import-preview',
  '/api/admin/cj/products/import-run',
  '/api/admin/cj/products/import-runs',
  '/api/admin/cj/products/import-items',
  '/api/admin/cj/products/import-items/:id/approve',
  '/api/admin/cj/products/import-items/:id/reject',
  '/api/admin/cj/products/publish-approved',
];

for (const e of ['import-preview','import-run','import-runs','import-items','publish-approved']) {
  if(!txt.includes(e)) throw new Error(`missing controller endpoint: ${e}`);
}

const telegramPaths = [
  '/api/admin/cj/products/import-preview',
  '/api/admin/cj/products/import-run',
  '/api/admin/cj/products/import-runs',
  '/api/admin/cj/products/import-items',
  '/api/admin/cj/products/import-items/${item_id}/approve',
  '/api/admin/cj/products/import-items/${item_id}/reject',
  '/api/admin/cj/products/publish-approved',
];
for (const path of telegramPaths) {
  const normalized = path.replace('${item_id}', '{item_id}');
  if (!client.includes(normalized)) throw new Error(`telegram client missing path: ${normalized}`);
}

const duplicatePrefix = '/api/' + 'api/admin/cj/products';
if (txt.includes(duplicatePrefix) || client.includes(duplicatePrefix)) {
  throw new Error('forbidden duplicate api prefix route found');
}

if (expectedRuntimeRoutes.length !== 7) throw new Error('expected runtime routes list incomplete');

console.log('ok cj automated import smoke');

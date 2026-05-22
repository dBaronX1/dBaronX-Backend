import fs from 'node:fs';

const router = fs.readFileSync('apps/telegram-bot/src/app/router.py', 'utf8');
const handler = fs.readFileSync('apps/telegram-bot/src/handlers/cj_import_admin_handler.py', 'utf8');
const client = fs.readFileSync('apps/telegram-bot/src/services/nestjs_client.py', 'utf8');
const guard = fs.readFileSync('apps/telegram-bot/src/shared/security/admin_guard.py', 'utf8');
const settings = fs.readFileSync('apps/telegram-bot/src/core/settings.py', 'utf8');

const requiredCommands = [
  'cj_import_preview',
  'cj_import_run',
  'cj_import_status',
  'cj_import_approve',
  'cj_import_reject',
  'cj_publish_approved',
];
for (const cmd of requiredCommands) {
  if (!router.includes(`CommandHandler("${cmd}"`)) throw new Error(`missing router registration: ${cmd}`);
}

if (!handler.includes('require_admin(update, context)')) throw new Error('admin-only guard missing in handler');
if (!guard.includes('SAFE_UNAUTHORIZED_MESSAGE')) throw new Error('safe unauthorized message missing');
if (!settings.includes('TELEGRAM_ALLOWED_ADMIN_IDS')) throw new Error('admin ids env missing');
if (!settings.includes('INTERNAL_SERVICE_TOKEN')) throw new Error('internal token env missing');

const endpointPaths = [
  '/api/admin/cj/products/import-preview',
  '/api/admin/cj/products/import-run',
  '/api/admin/cj/products/import-runs',
  '/api/admin/cj/products/import-items',
  '/api/admin/cj/products/import-items/{item_id}/approve',
  '/api/admin/cj/products/import-items/{item_id}/reject',
  '/api/admin/cj/products/publish-approved',
];
for (const path of endpointPaths) {
  const needle = path.replace('{item_id}', '${item_id}');
  if (!client.includes(needle)) throw new Error(`missing endpoint path: ${path}`);
}

if (!handler.includes('CJ import command failed. Check API deployment, internal token, and migration status.')) {
  throw new Error('safe admin diagnostic missing');
}

const forbiddenMutations = ['mark paid', 'fulfill', 'wallet', 'payout'];
for (const phrase of forbiddenMutations) {
  if (handler.toLowerCase().includes(phrase)) throw new Error(`unexpected mutation phrase in CJ handler: ${phrase}`);
}

console.log('ok telegram cj import admin smoke');

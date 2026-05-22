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

const endpointSuffixes = [
  '/admin/cj/products/import-preview',
  '/admin/cj/products/import-run',
  '/admin/cj/products/import-runs',
  '/admin/cj/products/import-items',
  '/admin/cj/products/import-items/{item_id}/approve',
  '/admin/cj/products/import-items/{item_id}/reject',
  '/admin/cj/products/publish-approved',
];
for (const suffix of endpointSuffixes) {
  const pyNeedle = suffix.replace('{item_id}', '{item_id}');
  if (!client.includes(pyNeedle)) throw new Error(`missing endpoint suffix: ${suffix}`);
}

if (!client.includes('def _normalize_api_path_config')) throw new Error('api base normalization helper missing');
if (!client.includes('api_base_had_api_suffix')) throw new Error('api suffix diagnostic flag missing');
if (!handler.includes('endpointPath:')) throw new Error('endpoint path diagnostic missing');
if (!handler.includes('apiBaseHadApiSuffix:')) throw new Error('api suffix diagnostic missing');
if (!handler.includes('next action: Check Telegram API_BASE_URL; use host root without /api or rely on normalized client.')) {
  throw new Error('next action diagnostic missing');
}

const normalize = (raw) => {
  let baseUrl = (raw || '').replace(/\/+$/, '');
  const lowered = baseUrl.toLowerCase();
  const apiSuffix = '/api';
  const hasApiSuffix = lowered.endsWith(apiSuffix);
  if (hasApiSuffix) baseUrl = baseUrl.slice(0, -apiSuffix.length);
  return { baseUrl: baseUrl.replace(/\/+$/, ''), hasApiSuffix };
};
const endpoint = (suffix) => '/api' + (suffix.startsWith('/') ? suffix : ('/' + suffix));
const root = normalize('https://dbaronx-api-unified.onrender.com');
const withApi = normalize('https://dbaronx-api-unified.onrender.com/api');

if (root.baseUrl !== 'https://dbaronx-api-unified.onrender.com' || root.hasApiSuffix !== false) {
  throw new Error('root base normalization failed');
}
if (withApi.baseUrl !== 'https://dbaronx-api-unified.onrender.com' || withApi.hasApiSuffix !== true) {
  throw new Error('api-suffix base normalization failed');
}
if (`${root.baseUrl}${endpoint('/admin/cj/products/import-preview')}` !== 'https://dbaronx-api-unified.onrender.com/api/admin/cj/products/import-preview') {
  throw new Error('root base endpoint join failed');
}
if (`${withApi.baseUrl}${endpoint('/admin/cj/products/import-preview')}` !== 'https://dbaronx-api-unified.onrender.com/api/admin/cj/products/import-preview') {
  throw new Error('api suffix endpoint join failed');
}
if (`${withApi.baseUrl}${endpoint('/admin/cj/products/import-preview')}`.includes('/api/api/')) {
  throw new Error('double /api detected');
}

const forbiddenMutations = ['mark paid', 'fulfill', 'wallet', 'payout'];
for (const phrase of forbiddenMutations) {
  if (handler.toLowerCase().includes(phrase)) throw new Error(`unexpected mutation phrase in CJ handler: ${phrase}`);
}

if (handler.includes('INTERNAL_SERVICE_TOKEN')) {
  throw new Error('handler should not include internal token in diagnostics');
}

console.log('ok telegram cj import admin smoke');

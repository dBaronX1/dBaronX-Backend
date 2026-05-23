import fs from 'node:fs';

const router = fs.readFileSync('apps/telegram-bot/src/app/router.py', 'utf8');
const handler = fs.readFileSync('apps/telegram-bot/src/handlers/cj_import_admin_handler.py', 'utf8');
const client = fs.readFileSync('apps/telegram-bot/src/services/nestjs_client.py', 'utf8');
const guard = fs.readFileSync('apps/telegram-bot/src/shared/security/admin_guard.py', 'utf8');
const settings = fs.readFileSync('apps/telegram-bot/src/core/settings.py', 'utf8');
const http = fs.readFileSync('apps/telegram-bot/src/shared/http/http_client.py', 'utf8');

const requiredCommands = [
  'cj_import_preview',
  'cj_import_run',
  'cj_import_status',
  'cj_import_approve',
  'cj_import_reject',
  'cj_publish_approved',
  'api_probe_cj_import',
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
  '/admin/cj/products/auth-diagnostics',
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
if (!handler.includes('apiHost:')) throw new Error('api host diagnostic missing');
if (!handler.includes('internalTokenConfigured:')) throw new Error('internal token configured diagnostic missing');
if (!handler.includes('xInternalTokenHeaderPrepared:')) throw new Error('x-internal-token header diagnostic missing');
if (!handler.includes('bearerHeaderPrepared:')) throw new Error('bearer header diagnostic missing');
if (!handler.includes('internalTokenSource:')) throw new Error('internal token source diagnostic missing');
if (!handler.includes('apiExpectedTokenSource:')) throw new Error('api expected token source diagnostic missing');
if (!handler.includes('apiConfiguredAliases:')) throw new Error('api configured aliases diagnostic missing');
if (!handler.includes('apiAliasConflictPossible:')) throw new Error('api alias conflict diagnostic missing');
if (!handler.includes('apiDiagnosticsMode:')) throw new Error('api diagnostics mode missing');
if (!handler.includes('apiDiagnosticsPreservedBy:')) throw new Error('api diagnosticsPreservedBy missing');
if (!handler.includes('apiGuardClass:')) throw new Error('api guard class missing');
if (!handler.includes('apiExceptionClass:')) throw new Error('api exception class missing');
if (!handler.includes('apiGuardDiagnosticsMissing:')) throw new Error('api guard diagnostics missing flag missing');
if (!handler.includes('_extract_api_diagnostics')) throw new Error('missing robust diagnostics extractor');
if (!handler.includes('API 401 body still lacks diagnostics; inspect AllExceptionsFilter and InternalAuthGuard payload.')) throw new Error('missing explicit missing-diagnostics next action');
if (!handler.includes('apiResponseKeys:')) throw new Error('missing apiResponseKeys debug shape');
if (!handler.includes('apiDetailsKeys:')) throw new Error('missing apiDetailsKeys debug shape');
if (!handler.includes('apiErrorKeys:')) throw new Error('missing apiErrorKeys debug shape');
if (!handler.includes('apiBaseHadApiSuffix:')) throw new Error('api suffix diagnostic missing');
if (!handler.includes('Check Telegram API_BASE_URL host points to dbaronx-api-unified service root.')) {
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
if (!http.includes('"response": payload')) throw new Error('http client must preserve raw non-2xx payload');
if (!http.includes('"diagnostics": diagnostics')) throw new Error('http client must preserve parsed diagnostics');
if (!http.includes('for nested_key in ("data", "error", "details", "response")')) throw new Error('http client nested diagnostics fallback missing');
if (handler.includes('TELEGRAM_BOT_TOKEN') || handler.includes('CJ_ACCESS_TOKEN')) {
  throw new Error('handler should not include secret tokens in diagnostics');
}

console.log('ok telegram cj import admin smoke');

if (!client.includes('cj_auth_diagnostics')) throw new Error('missing auth diagnostics client method');
if (!handler.includes('cj_auth_diagnostics')) throw new Error('probe does not call auth diagnostics first');

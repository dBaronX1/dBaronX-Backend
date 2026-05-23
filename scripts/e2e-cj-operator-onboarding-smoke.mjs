import fs from 'node:fs';
import cp from 'node:child_process';

const p='apps/api/src/scripts/cj-operator-onboard-products.ts';
if(!fs.existsSync(p)) throw new Error('operator script missing');
const txt=fs.readFileSync(p,'utf8');

const must=[
  'DBX_CONFIRM_CJ_OPERATOR_ONBOARDING',
  'operator_confirmation_missing',
  "'onboard-batch'",
  'CJ_OPERATOR_CATEGORIES',
  'HARD_MAX_PER_CATEGORY = 100',
  'NestFactory.createApplicationContext(AppModule',
  'await app.close()',
  'migration_missing',
  'cj_credentials_missing',
  'validationOk',
  'pending_admin_approval',
  'publishApproved()',
];
for(const k of must){ if(!txt.includes(k)) throw new Error(`missing ${k}`); }

if(txt.includes('create(')) throw new Error('must not start HTTP server');
if(/telegram/i.test(txt)) throw new Error('must not use Telegram');
if(/internal_service_token/i.test(txt)) throw new Error('must not use HTTP internal token');
if(/cost_minor\s*:/i.test(txt) && /storefront/i.test(txt)) throw new Error('must not publish supplier cost to storefront');
if(/auto-order|aut[o]?order/i.test(txt)) throw new Error('must not enable live CJ auto-order');
if(/fake stock|fake shipping|fake payment|fake fulfillment|fake tracking/i.test(txt)) throw new Error('must not fake operational data');

const changed=cp.execSync('git diff --name-only',{encoding:'utf8'}).trim().split('\n').filter(Boolean);
if(changed.some((f)=>f.startsWith('apps/api/src/modules/payments/'))) throw new Error('payments files touched');
if(changed.some((f)=>f.startsWith('apps/telegram-bot/src/'))) throw new Error('telegram files touched');

console.log('ok cj operator onboarding smoke');

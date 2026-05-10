#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const registryPath = join(root, 'apps/telegram-bot/src/services/command_registry.py');
const envPath = join(root, 'apps/telegram-bot/.env.example');
const guardPath = join(root, 'apps/telegram-bot/src/shared/security/admin_guard.py');
const httpPath = join(root, 'apps/telegram-bot/src/shared/http/http_client.py');
const controlHandlerPath = join(root, 'apps/telegram-bot/src/handlers/control_surface_handler.py');

const requiredCommands = [
  'start','help','status','health','runtime','launch','routes','env_check',
  'commerce_status','medusa_status','shipping_status','catalog_status','orders_status',
  'payments_status','stripe_status','stripe_first_tx_status','stripe_storage','stripe_settlement','dbx_status','dbx_payment','economic_status',
  'suppliers_status','cj_status','cj_import_ready','aliexpress_status',
  'ads_status','watch_status','affiliate_status','payouts_status','wallet_status',
  'ai_status','ai_stories_status','story_campaigns_status',
  'dreams_status','rewards_status','subscriptions_status','airdrop_status','giftcards_status','ebooks_status','idcard_status'
];

const blockers = [];
const registry = existsSync(registryPath) ? readFileSync(registryPath, 'utf8') : '';
const envExample = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
const guard = existsSync(guardPath) ? readFileSync(guardPath, 'utf8') : '';
const http = existsSync(httpPath) ? readFileSync(httpPath, 'utf8') : '';
const control = existsSync(controlHandlerPath) ? readFileSync(controlHandlerPath, 'utf8') : '';

if (!registry) blockers.push('command_registry_missing');
const missingCommands = requiredCommands.filter((command) => !registry.includes(`"${command}"`));
if (missingCommands.length) blockers.push('required_commands_missing');

const placeholderSecrets = ['TELEGRAM_BOT_TOKEN','TELEGRAM_WEBHOOK_SECRET','INTERNAL_SERVICE_TOKEN'];
for (const key of placeholderSecrets) {
  const match = envExample.match(new RegExp(`^${key}=(.*)$`, 'm'));
  if (!match) blockers.push(`${key}_missing_from_env_example`);
  if (match && /[A-Za-z0-9]/.test(match[1] || '')) blockers.push(`${key}_env_example_not_placeholder_only`);
}
for (const key of ['TELEGRAM_ALLOWED_ADMIN_IDS','TELEGRAM_ADMIN_ROLES','TELEGRAM_BOT_PUBLIC_BASE_URL','API_BASE_URL','FASTAPI_BASE_URL','MEDUSA_BASE_URL']) {
  if (!envExample.match(new RegExp(`^${key}=`, 'm'))) blockers.push(`${key}_missing_from_env_example`);
}

const unauthorizedPathExists = guard.includes('SAFE_UNAUTHORIZED_MESSAGE') && guard.includes('require_role') && guard.includes('unauthorized');
if (!unauthorizedPathExists) blockers.push('unauthorized_command_path_missing');

const clientSanitizesSecrets = http.includes('sanitize_value') && http.includes('SECRET_WORDS') && http.includes('[redacted]') && !http.includes('logger.warning("backend_request_failed %s", exc)');
if (!clientSanitizesSecrets) blockers.push('api_client_secret_sanitization_missing');

const unsafeClaimPattern = /(Payout Settled|Payout Approved|mark paid|marked paid|rewarded|fulfilled)/i;
const unsafeClaimDetected = unsafeClaimPattern.test(control) || unsafeClaimPattern.test(readFileSync(join(root, 'apps/telegram-bot/src/handlers/payouts_handler.py'), 'utf8'));
if (unsafeClaimDetected) blockers.push('unsafe_command_claim_detected');

const build = spawnSync('python', ['-m', 'compileall', 'apps/telegram-bot/src'], { cwd: root, encoding: 'utf8' });
const buildReady = build.status === 0;
if (!buildReady) blockers.push('bot_compile_failed');

const commandCount = (registry.match(/CommandSpec\(/g) || []).length;
const protectedCommands = (registry.match(/protected_read/g) || []).length;
const ecosystemCoverage = {
  system: requiredCommands.filter((c) => ['start','help','status','health','runtime','launch','routes','env_check'].includes(c)).every((c) => registry.includes(`"${c}"`)),
  commerce: ['commerce_status','medusa_status','shipping_status','catalog_status','orders_status'].every((c) => registry.includes(`"${c}"`)),
  payments: ['payments_status','stripe_status','stripe_first_tx_status','stripe_storage','stripe_settlement','dbx_status','dbx_payment','economic_status'].every((c) => registry.includes(`"${c}"`)),
  suppliers: ['suppliers_status','cj_status','cj_import_ready','aliexpress_status'].every((c) => registry.includes(`"${c}"`)),
  engagement: ['ads_status','watch_status','affiliate_status','payouts_status','wallet_status'].every((c) => registry.includes(`"${c}"`)),
  ai: ['ai_status','ai_stories_status','story_campaigns_status'].every((c) => registry.includes(`"${c}"`)),
  planned: ['dreams_status','rewards_status','subscriptions_status','airdrop_status','giftcards_status','ebooks_status','idcard_status'].every((c) => registry.includes(`"${c}"`)),
};

const result = {
  success: blockers.length === 0,
  blockers,
  commandCount,
  protectedCommands,
  ecosystemCoverage,
  secretLeakDetected: blockers.some((b) => b.includes('env_example_not_placeholder_only')),
  missingCommands,
  buildReady,
};
console.log(JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);

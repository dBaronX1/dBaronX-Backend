#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const timeoutMs = Number.parseInt(process.env.TELEGRAM_LIVE_SMOKE_TIMEOUT_MS || '12000', 10);
const botBaseUrl = normalizeBaseUrl(process.env.BOT_BASE_URL || process.env.BOT_PUBLIC_BASE_URL || process.env.TELEGRAM_BOT_PUBLIC_BASE_URL || process.env.TELEGRAM_BOT_BASE_URL || '');
const botPublicBaseUrl = normalizeBaseUrl(process.env.BOT_PUBLIC_BASE_URL || process.env.TELEGRAM_BOT_PUBLIC_BASE_URL || botBaseUrl || '');
const apiBaseUrl = normalizeBaseUrl(process.env.API_BASE_URL || process.env.API_URL || process.env.NESTJS_BASE_URL || process.env.NESTJS_API_URL || '');
const fastapiBaseUrl = normalizeBaseUrl(process.env.FASTAPI_BASE_URL || process.env.FASTAPI_URL || '');
const medusaBaseUrl = normalizeBaseUrl(process.env.MEDUSA_BASE_URL || process.env.MEDUSA_URL || process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || '');
const expectedWebhookUrl = botPublicBaseUrl ? `${botPublicBaseUrl}/webhook/telegram` : null;

const secretKeys = [
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_WEBHOOK_SECRET',
  'INTERNAL_SERVICE_TOKEN',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'CJ_ACCESS_TOKEN',
];
const configuredSecretValues = secretKeys
  .map((key) => [key, process.env[key] || ''])
  .filter(([, value]) => value && value.length >= 8);

const blockers = [];
const observedPayloads = [];

const commandRegistrySmoke = spawnSync('node', ['scripts/e2e-telegram-bot-command-contract-smoke.mjs'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  timeout: timeoutMs,
});
if (commandRegistrySmoke.status !== 0) addBlocker('command_registry_smoke_failed');
observedPayloads.push(commandRegistrySmoke.stdout || '', commandRegistrySmoke.stderr || '');

const customerContractSmoke = spawnSync('node', ['scripts/e2e-telegram-customer-bot-contract-smoke.mjs'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  timeout: timeoutMs,
});
if (customerContractSmoke.status !== 0) addBlocker('customer_bot_contract_smoke_failed');
observedPayloads.push(customerContractSmoke.stdout || '', customerContractSmoke.stderr || '');

const botHealth = botBaseUrl ? await fetchJson(`${botBaseUrl}/health`) : missing('BOT_BASE_URL_missing');
const botReadyResult = botBaseUrl ? await fetchJson(`${botBaseUrl}/ready`) : missing('BOT_BASE_URL_missing');
const attemptedBotPaths = [
  { path: '/health', status: botHealth.status },
  { path: '/ready', status: botReadyResult.status },
];
observedPayloads.push(botHealth.raw, botReadyResult.raw);

if (!botBaseUrl) addBlocker('BOT_BASE_URL_missing');
const botHealthReady = Boolean(botHealth.ok && botHealth.status >= 200 && botHealth.status < 500 && botHealth.json);
if (!botHealthReady && botBaseUrl) addBlocker('bot_health_unreachable');

const healthBlockers = normalizeBlockers(botHealth.json?.blockers || botHealth.json?.data?.blockers || []);
const readyBlockers = normalizeBlockers(botReadyResult.json?.blockers || botReadyResult.json?.data?.blockers || []);
const unsafeBlockers = [...healthBlockers, ...readyBlockers].filter((blocker) => !isSafeBlocker(blocker));
if (unsafeBlockers.length) addBlocker('unsafe_startup_blocker_payload');

const botReady = Boolean(botReadyResult.ok && botReadyResult.status >= 200 && botReadyResult.status < 300 && botReadyResult.json?.success === true);
if (!botReady && botBaseUrl) addBlocker('bot_ready_failed');
for (const blocker of readyBlockers) addBlocker(blocker);

const webhookResults = botBaseUrl
  ? await Promise.all([
      probeWebhook(`${botBaseUrl}/webhook/telegram`),
      probeWebhook(`${botBaseUrl}/webhook`),
    ])
  : [missing('BOT_BASE_URL_missing'), missing('BOT_BASE_URL_missing')];
observedPayloads.push(...webhookResults.map((result) => result.raw));
attemptedBotPaths.push(
  { path: '/webhook/telegram', status: webhookResults[0].status },
  { path: '/webhook', status: webhookResults[1].status },
);
const webhookEndpointReady = webhookResults.every((result) => result.exists);
if (!webhookEndpointReady && botBaseUrl) addBlocker('webhook_endpoint_missing');

const apiAttempt = apiBaseUrl
  ? await attemptPaths(apiBaseUrl, ['/health', '/api/health'])
  : { reachable: Boolean(botReadyResult.json?.apiBaseUrlPresent), attempts: [] };
const apiReachable = apiAttempt.reachable;
if (!apiReachable) addBlocker(apiBaseUrl ? 'api_unreachable' : 'API_BASE_URL_missing');

const fastapiAttempt = fastapiBaseUrl
  ? await attemptPaths(fastapiBaseUrl, ['/health'])
  : { reachable: Boolean(botReadyResult.json?.fastapiBaseUrlPresent), attempts: [] };
const fastapiReachable = fastapiAttempt.reachable;
if (!fastapiReachable) addBlocker(fastapiBaseUrl ? 'fastapi_unreachable' : 'FASTAPI_BASE_URL_missing');

const medusaAttempt = medusaBaseUrl
  ? await attemptPaths(medusaBaseUrl, ['/health', '/store/products?limit=1'])
  : { reachable: Boolean(botReadyResult.json?.medusaBaseUrlPresent), attempts: [] };
const medusaReachable = medusaAttempt.reachable;
if (!medusaReachable) addBlocker(medusaBaseUrl ? 'medusa_unreachable' : 'MEDUSA_BASE_URL_missing');

const adminGuardConfigured = Boolean(botReadyResult.json?.adminGuardConfigured || hasConfiguredList(process.env.TELEGRAM_ALLOWED_ADMIN_IDS || process.env.TELEGRAM_ADMIN_IDS || ''));
const telegramTokenConfigured = Boolean(botReadyResult.json?.telegramRuntimeStarted || process.env.TELEGRAM_BOT_TOKEN);
const webhookSecretConfigured = Boolean(botReadyResult.json?.telegramWebhookSecretPresent || process.env.TELEGRAM_WEBHOOK_SECRET);
const internalTokenConfigured = Boolean(botReadyResult.json?.internalTokenPresent || process.env.INTERNAL_SERVICE_TOKEN);
const botPublicBaseUrlConfigured = Boolean(botReadyResult.json?.botPublicBaseUrlPresent || botPublicBaseUrl);

if (!adminGuardConfigured) addBlocker('TELEGRAM_ALLOWED_ADMIN_IDS_missing');
if (!telegramTokenConfigured) addBlocker('TELEGRAM_BOT_TOKEN_missing');
if (!webhookSecretConfigured) addBlocker('TELEGRAM_WEBHOOK_SECRET_missing');
if (!internalTokenConfigured) addBlocker('INTERNAL_SERVICE_TOKEN_missing');
if (!botPublicBaseUrlConfigured) addBlocker('BOT_PUBLIC_BASE_URL_missing');

const secretLeakDetected = detectSecretLeak(observedPayloads.join('\n'));
if (secretLeakDetected) addBlocker('secret_leak_detected');

const uniqueBlockers = [...new Set(blockers)];
const result = {
  success: uniqueBlockers.length === 0,
  blockers: uniqueBlockers,
  botHealthReady,
  botReady,
  webhookEndpointReady,
  apiReachable,
  fastapiReachable,
  medusaReachable,
  adminGuardConfigured,
  telegramTokenConfigured,
  webhookSecretConfigured,
  internalTokenConfigured,
  botPublicBaseUrlConfigured,
  expectedWebhookUrl,
  attemptedApiPaths: apiAttempt.attempts,
  attemptedBotPaths,
  attemptedMedusaPaths: medusaAttempt.attempts,
  attemptedFastapiPaths: fastapiAttempt.attempts,
  secretLeakDetected,
  nextManualStep: nextManualStep(uniqueBlockers),
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);

function normalizeBaseUrl(value) { return String(value || '').trim().replace(/\/+$/, ''); }
function addBlocker(blocker) { if (blocker && !blockers.includes(blocker)) blockers.push(blocker); }
function hasConfiguredList(raw) { return String(raw || '').split(',').map((part) => part.trim()).filter(Boolean).length > 0; }
function missing(blocker) { return { ok: false, status: 0, json: null, raw: JSON.stringify({ blockers: [blocker] }), exists: false }; }

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    return { ok: response.ok, status: response.status, json, raw: sanitize(text), exists: response.status !== 404 };
  } catch (error) {
    return { ok: false, status: 0, json: null, raw: JSON.stringify({ error: error.name }), exists: false };
  } finally {
    clearTimeout(timeout);
  }
}

async function probeWebhook(url) {
  const headers = { 'content-type': 'application/json', 'x-dbx-webhook-probe': 'true' };
  if (process.env.TELEGRAM_WEBHOOK_SECRET) headers['x-telegram-bot-api-secret-token'] = process.env.TELEGRAM_WEBHOOK_SECRET;
  const result = await fetchJson(url, { method: 'POST', headers, body: JSON.stringify({ probe: true }) });
  return { ...result, exists: result.status !== 404 && result.status !== 405 && result.status !== 0 };
}

async function attemptPaths(baseUrl, paths) {
  const results = await Promise.all(paths.map((path) => fetchJson(`${baseUrl}${path}`)));
  observedPayloads.push(...results.map((result) => result.raw));
  const attempts = paths.map((path, index) => ({ path, status: results[index].status }));
  return {
    reachable: results.some((result) => result.status >= 200 && result.status < 300),
    attempts,
  };
}

function normalizeBlockers(value) {
  const values = Array.isArray(value) ? value : [value];
  return values.map((blocker) => String(blocker || '')).filter(Boolean);
}

function isSafeBlocker(blocker) {
  if (blocker.length > 120) return false;
  if (/https?:\/\//i.test(blocker)) return false;
  if (/[A-Za-z0-9_]*=(?!missing|configured|true|false)[^\s]+/.test(blocker)) return false;
  return /^[A-Za-z0-9_.:-]+$/.test(blocker);
}

function sanitize(value) {
  let text = String(value || '');
  for (const [, secret] of configuredSecretValues) text = text.replaceAll(secret, '<redacted>');
  return text
    .replace(/bot[0-9]{6,12}:[A-Za-z0-9_-]{20,}/g, 'bot<redacted>')
    .replace(/\b[0-9]{6,12}:[A-Za-z0-9_-]{20,}\b/g, '<telegram-token-redacted>')
    .replace(/\bsk_(test|live)_[A-Za-z0-9]{12,}\b/g, 'sk_$1_<redacted>')
    .replace(/\bwhsec_[A-Za-z0-9]{12,}\b/g, 'whsec_<redacted>');
}

function detectSecretLeak(payload) {
  for (const [, value] of configuredSecretValues) if (value && payload.includes(value)) return true;
  const dangerousPatterns = [
    /\b[0-9]{6,12}:[A-Za-z0-9_-]{20,}\b/,
    /\bsk_(test|live)_[A-Za-z0-9]{12,}\b/,
    /\bwhsec_[A-Za-z0-9]{12,}\b/,
    /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/,
  ];
  return dangerousPatterns.some((pattern) => pattern.test(payload));
}

function nextManualStep(currentBlockers) {
  if (currentBlockers.includes('BOT_BASE_URL_missing')) return 'Set BOT_BASE_URL, BOT_PUBLIC_BASE_URL, or TELEGRAM_BOT_PUBLIC_BASE_URL to the deployed Telegram bot public base URL and rerun this smoke.';
  if (currentBlockers.includes('TELEGRAM_BOT_TOKEN_missing')) return 'Rotate any exposed Telegram token in BotFather, configure TELEGRAM_BOT_TOKEN in the runtime secret store, redeploy, then rerun.';
  if (currentBlockers.includes('TELEGRAM_WEBHOOK_SECRET_missing')) return 'Configure TELEGRAM_WEBHOOK_SECRET and register it with Telegram setWebhook secret_token.';
  if (currentBlockers.includes('TELEGRAM_ALLOWED_ADMIN_IDS_missing')) return 'Set TELEGRAM_ALLOWED_ADMIN_IDS to comma-separated numeric Telegram user IDs.';
  if (currentBlockers.includes('bot_ready_failed')) return 'Inspect BOT_BASE_URL /ready blockers, fix runtime env, redeploy, then register webhook.';
  if (currentBlockers.includes('webhook_endpoint_missing')) return 'Confirm the deployed bot exposes POST /webhook/telegram and POST /webhook.';
  if (currentBlockers.length) return 'Resolve listed blockers, redeploy if needed, then rerun live readiness smoke.';
  return 'Register or verify Telegram webhook with scripts/telegram-set-webhook.mjs and scripts/telegram-webhook-info.mjs, then execute /status from an allowed Telegram admin.';
}

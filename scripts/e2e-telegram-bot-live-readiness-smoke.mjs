#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const timeoutMs = Number.parseInt(process.env.TELEGRAM_LIVE_SMOKE_TIMEOUT_MS || '12000', 10);
const botBaseUrl = normalizeBaseUrl(process.env.BOT_BASE_URL || process.env.TELEGRAM_BOT_BASE_URL || process.env.BOT_PUBLIC_BASE_URL || process.env.TELEGRAM_BOT_PUBLIC_BASE_URL || '');
const apiBaseUrl = normalizeBaseUrl(process.env.API_BASE_URL || process.env.NESTJS_BASE_URL || '');
const fastapiBaseUrl = normalizeBaseUrl(process.env.FASTAPI_BASE_URL || '');
const medusaBaseUrl = normalizeBaseUrl(process.env.MEDUSA_BASE_URL || '');

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
if (commandRegistrySmoke.status !== 0) {
  blockers.push('command_registry_smoke_failed');
}
observedPayloads.push(commandRegistrySmoke.stdout || '', commandRegistrySmoke.stderr || '');

const botHealth = botBaseUrl ? await fetchJson(`${botBaseUrl}/health`) : missing('BOT_BASE_URL_missing');
const botReadyResult = botBaseUrl ? await fetchJson(`${botBaseUrl}/ready`) : missing('BOT_BASE_URL_missing');
observedPayloads.push(botHealth.raw, botReadyResult.raw);

if (!botBaseUrl) blockers.push('BOT_BASE_URL_missing');
const botHealthReady = Boolean(botHealth.ok && botHealth.status >= 200 && botHealth.status < 500 && botHealth.json);
if (!botHealthReady && botBaseUrl) blockers.push('bot_health_unreachable');

const healthBlockers = normalizeBlockers(botHealth.json?.blockers || botHealth.json?.data?.blockers || []);
const unsafeHealthBlockers = healthBlockers.filter((blocker) => !isSafeBlocker(blocker));
if (unsafeHealthBlockers.length) blockers.push('unsafe_startup_blocker_payload');

const botReady = Boolean(botReadyResult.ok && botReadyResult.status >= 200 && botReadyResult.status < 300);
if (!botReady && botBaseUrl) blockers.push('bot_ready_failed');

const webhookResults = botBaseUrl
  ? await Promise.all([
      probeWebhook(`${botBaseUrl}/webhook/telegram`),
      probeWebhook(`${botBaseUrl}/webhook`),
    ])
  : [missing('BOT_BASE_URL_missing'), missing('BOT_BASE_URL_missing')];
observedPayloads.push(...webhookResults.map((result) => result.raw));
const webhookEndpointReady = webhookResults.every((result) => result.exists);
if (!webhookEndpointReady && botBaseUrl) blockers.push('webhook_endpoint_missing');

const apiReachable = apiBaseUrl ? await reachableAny(apiBaseUrl, ['/health', '/api/health']) : false;
if (!apiReachable) blockers.push(apiBaseUrl ? 'api_unreachable' : 'API_BASE_URL_missing');

let fastapiReachable = null;
if (fastapiBaseUrl) {
  fastapiReachable = await reachableAny(fastapiBaseUrl, ['/health']);
  if (!fastapiReachable) blockers.push('fastapi_unreachable');
}

const medusaReachable = medusaBaseUrl ? await reachableAny(medusaBaseUrl, ['/health']) : false;
if (!medusaReachable) blockers.push(medusaBaseUrl ? 'medusa_unreachable' : 'MEDUSA_BASE_URL_missing');

const adminGuardConfigured = hasConfiguredList(process.env.TELEGRAM_ALLOWED_ADMIN_IDS || process.env.TELEGRAM_ADMIN_IDS || '');
const telegramTokenConfigured = Boolean(process.env.TELEGRAM_BOT_TOKEN);
const webhookSecretConfigured = Boolean(process.env.TELEGRAM_WEBHOOK_SECRET);
const internalTokenConfigured = Boolean(process.env.INTERNAL_SERVICE_TOKEN);

if (!adminGuardConfigured) blockers.push('TELEGRAM_ALLOWED_ADMIN_IDS_missing');
if (!telegramTokenConfigured) blockers.push('TELEGRAM_BOT_TOKEN_missing');
if (!webhookSecretConfigured) blockers.push('TELEGRAM_WEBHOOK_SECRET_missing');
if (!internalTokenConfigured) blockers.push('INTERNAL_SERVICE_TOKEN_missing');

const secretLeakDetected = detectSecretLeak(observedPayloads.join('\n'));
if (secretLeakDetected) blockers.push('secret_leak_detected');

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
  secretLeakDetected,
  nextManualStep: nextManualStep(uniqueBlockers),
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);

function normalizeBaseUrl(value) {
  return (value || '').trim().replace(/\/+$/, '');
}

function hasConfiguredList(raw) {
  return raw.split(',').map((part) => part.trim()).filter(Boolean).length > 0;
}

function missing(blocker) {
  return { ok: false, status: 0, json: null, raw: JSON.stringify({ blockers: [blocker] }), exists: false };
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { ok: response.ok, status: response.status, json, raw: text, exists: response.status !== 404 };
  } catch (error) {
    return { ok: false, status: 0, json: null, raw: JSON.stringify({ error: error.name }), exists: false };
  } finally {
    clearTimeout(timeout);
  }
}

async function probeWebhook(url) {
  const headers = { 'content-type': 'application/json' };
  if (process.env.TELEGRAM_WEBHOOK_SECRET) {
    headers['x-telegram-bot-api-secret-token'] = process.env.TELEGRAM_WEBHOOK_SECRET;
  }
  const result = await fetchJson(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ update_id: 0 }),
  });
  return {
    ...result,
    exists: result.status !== 404 && result.status !== 405 && result.status !== 0,
  };
}

async function reachableAny(baseUrl, paths) {
  const results = await Promise.all(paths.map((path) => fetchJson(`${baseUrl}${path}`)));
  observedPayloads.push(...results.map((result) => result.raw));
  return results.some((result) => result.status >= 200 && result.status < 500 && result.status !== 404);
}

function normalizeBlockers(value) {
  const blockers = Array.isArray(value) ? value : [value];
  return blockers.map((blocker) => String(blocker || '')).filter(Boolean);
}

function isSafeBlocker(blocker) {
  if (blocker.length > 120) return false;
  if (/https?:\/\//i.test(blocker)) return false;
  if (/[A-Za-z0-9_]*=(?!missing|configured|true|false)[^\s]+/.test(blocker)) return false;
  return /^[A-Za-z0-9_.:-]+$/.test(blocker);
}

function detectSecretLeak(payload) {
  for (const [, value] of configuredSecretValues) {
    if (value && payload.includes(value)) return true;
  }
  const dangerousPatterns = [
    /\b[0-9]{6,12}:[A-Za-z0-9_-]{20,}\b/,
    /\bsk_(test|live)_[A-Za-z0-9]{12,}\b/,
    /\bwhsec_[A-Za-z0-9]{12,}\b/,
    /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/,
  ];
  return dangerousPatterns.some((pattern) => pattern.test(payload));
}

function nextManualStep(currentBlockers) {
  if (currentBlockers.includes('BOT_BASE_URL_missing')) return 'Set BOT_BASE_URL to the deployed Telegram bot public base URL and rerun this smoke.';
  if (currentBlockers.includes('TELEGRAM_BOT_TOKEN_missing')) return 'Configure TELEGRAM_BOT_TOKEN in the runtime environment without committing it.';
  if (currentBlockers.includes('TELEGRAM_WEBHOOK_SECRET_missing')) return 'Configure TELEGRAM_WEBHOOK_SECRET and register it with Telegram setWebhook secret_token.';
  if (currentBlockers.includes('TELEGRAM_ALLOWED_ADMIN_IDS_missing')) return 'Set TELEGRAM_ALLOWED_ADMIN_IDS to comma-separated numeric Telegram user IDs.';
  if (currentBlockers.includes('bot_ready_failed')) return 'Inspect BOT_BASE_URL /health blockers, fix runtime env, redeploy, then register webhook.';
  if (currentBlockers.includes('webhook_endpoint_missing')) return 'Confirm the deployed bot exposes POST /webhook/telegram and POST /webhook.';
  if (currentBlockers.length) return 'Resolve listed blockers, redeploy if needed, then rerun live readiness smoke.';
  return 'Register or verify Telegram webhook with scripts/telegram-set-webhook.mjs and scripts/telegram-webhook-info.mjs, then execute an admin-only command from an allowed Telegram user.';
}

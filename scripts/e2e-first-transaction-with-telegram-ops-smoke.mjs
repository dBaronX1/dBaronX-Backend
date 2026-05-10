#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const API_URL = normalizeBaseUrl(process.env.API_URL || process.env.NESTJS_API_URL || process.env.API_BASE_URL || 'https://dbaronx-api-unified.onrender.com');
const API_BASE_URL = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;
const BOT_BASE_URL = normalizeBaseUrl(process.env.BOT_BASE_URL || process.env.TELEGRAM_BOT_BASE_URL || process.env.BOT_PUBLIC_BASE_URL || process.env.TELEGRAM_BOT_PUBLIC_BASE_URL || '');
const MEDUSA_URL = normalizeBaseUrl(process.env.MEDUSA_URL || process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || process.env.MEDUSA_BASE_URL || 'https://dbaronx-medusa.onrender.com');
const MEDUSA_KEY = String(process.env.MEDUSA_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '').trim();
const INTERNAL_SERVICE_TOKEN = String(process.env.INTERNAL_SERVICE_TOKEN || '').trim();
const timeoutMs = Number.parseInt(process.env.FIRST_TRANSACTION_OPS_SMOKE_TIMEOUT_MS || '180000', 10);
const blockers = [];
const responseSnippets = {};

const first = runJson('first stripe transaction smoke', 'node', ['scripts/e2e-first-stripe-test-transaction-smoke.mjs'], timeoutMs);
const firstPayload = first.json || {};
for (const blocker of array(firstPayload.checkoutBlockers)) addBlocker(blocker);
if (!firstPayload.checkoutSafeToOpen) addBlocker('checkout_not_safe_to_open');
if (firstPayload.stripeSessionModeDetected === 'live' && process.env.ALLOW_LIVE_STRIPE_SMOKE !== 'true') addBlocker('stripe_live_mode_blocked_for_controlled_smoke');

const apiHealth = await getJson(`${API_BASE_URL}/api/health`, 'api health');
const stripeReadiness = await getJson(`${API_BASE_URL}/api/checkout/stripe/readiness`, 'stripe readiness');
const storage = await getJson(`${API_BASE_URL}/api/checkout/stripe/settlement-storage-readiness`, 'settlement storage', internalHeaders());
const medusaStore = await getJson(`${MEDUSA_URL}/store/products?limit=1`, 'medusa store products', medusaHeaders());
let botReadiness = null;
if (BOT_BASE_URL) {
  botReadiness = runJson('telegram bot live readiness', 'node', ['scripts/e2e-telegram-bot-live-readiness-smoke.mjs'], 30000).json;
  if (!botReadiness?.success) addBlocker('telegram_ops_readiness_failed');
}

if (!(apiHealth.ok && apiHealth.status < 500)) addBlocker('api_readiness_failed');
if (!(stripeReadiness.ok && stripeReadiness.status < 500)) addBlocker('stripe_readiness_failed');
if (!storage.ok) addBlocker(storage.status === 401 || storage.status === 403 ? 'settlement_storage_requires_internal_token' : 'settlement_storage_unreachable');
if (!medusaStore.ok) addBlocker('medusa_store_api_unreachable');

const stripeSessionModeDetected = firstPayload.stripeSessionModeDetected || modeFromSession(firstPayload.sessionId);
const checkoutSafeToOpen = Boolean(firstPayload.checkoutSafeToOpen && stripeSessionModeDetected === 'test');
const settlementStorageReady = storage.json?.success === true || storage.json?.data?.success === true;
const telegramBotReachable = BOT_BASE_URL ? Boolean(botReadiness?.botHealthReady || botReadiness?.botReady || botReadiness?.success) : false;
const telegramOpsReady = BOT_BASE_URL ? Boolean(botReadiness?.success && firstPayload.telegramOpsReady !== false) : false;
const settlementSafeToClaim = Boolean(firstPayload.settlementSafeToClaim === true);

const result = {
  success: blockers.length === 0 && checkoutSafeToOpen === true,
  blockers,
  checkoutReady: Boolean(firstPayload.checkoutSessionCreated && firstPayload.stripeHostedCheckoutUrl),
  checkoutSafeToOpen,
  stripeSessionModeDetected,
  stripeSessionId: firstPayload.sessionId || null,
  checkoutUrl: checkoutSafeToOpen ? firstPayload.checkoutUrl || null : null,
  settlementStorageReady,
  settlementSafeToClaim,
  telegramBotReachable,
  telegramOpsReady,
  medusaReady: Boolean(firstPayload.medusaReady || medusaStore.ok),
  apiReady: Boolean(firstPayload.apiReady || apiHealth.ok),
  checks: {
    firstStripeSmokeExitCode: first.status,
    apiHealthStatus: apiHealth.status,
    stripeReadinessStatus: stripeReadiness.status,
    settlementStorageStatus: storage.status,
    medusaStoreProductsStatus: medusaStore.status,
    botConfigured: Boolean(BOT_BASE_URL),
  },
  responseSnippets,
  nextManualStep: checkoutSafeToOpen
    ? 'Open only the cs_test_* checkoutUrl shown here, pay with a Stripe test card, ensure the signed Stripe Dashboard test webhook posts checkout.session.completed to /api/checkout/stripe/webhook, then run the post-payment settlement smoke with CHECKOUT_SESSION_ID.'
    : nextManualStep(firstPayload, BOT_BASE_URL),
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);

function normalizeBaseUrl(value) { return String(value || '').trim().replace(/\/+$/, ''); }
function array(value) { return Array.isArray(value) ? value : []; }
function addBlocker(blocker) { if (blocker && !blockers.includes(blocker)) blockers.push(blocker); }
function modeFromSession(id) {
  if (String(id || '').startsWith('cs_test_')) return 'test';
  if (String(id || '').startsWith('cs_live_')) return 'live';
  return id ? 'unknown' : 'missing';
}
function internalHeaders() { return INTERNAL_SERVICE_TOKEN ? { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN } } : {}; }
function medusaHeaders() { return MEDUSA_KEY ? { headers: { 'x-publishable-api-key': MEDUSA_KEY } } : {}; }
function runJson(label, command, args, timeout) {
  const run = spawnSync(command, args, { cwd: process.cwd(), encoding: 'utf8', timeout, env: process.env });
  responseSnippets[label] = snippet(`${run.stdout || ''}${run.stderr || ''}`);
  return { status: run.status, json: parseLastJson(run.stdout), error: run.error?.name || null };
}
function parseLastJson(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const start = raw.lastIndexOf('\n{');
  const candidate = start >= 0 ? raw.slice(start + 1) : raw;
  try { return JSON.parse(candidate); } catch { return null; }
}
async function getJson(url, label, init = {}) {
  try {
    const response = await fetch(url, init);
    const text = await response.text();
    responseSnippets[label] = snippet(text);
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    return { ok: response.ok, status: response.status, json };
  } catch (error) {
    responseSnippets[label] = error.name;
    return { ok: false, status: 0, json: null };
  }
}
function snippet(value) {
  const text = String(value || '');
  return text.length > 900 ? `${text.slice(0, 900)}…` : text;
}
function nextManualStep(firstPayload, botConfigured) {
  if (firstPayload?.stripeSessionModeDetected === 'live') return 'Do not open the live Checkout Session for this controlled smoke. Switch Stripe env to test keys and rerun.';
  if (!botConfigured) return 'Set BOT_BASE_URL or TELEGRAM_BOT_PUBLIC_BASE_URL for Telegram ops proof, then rerun after checkout blockers are clear.';
  return firstPayload?.nextManualStep || 'Resolve listed blockers before opening Stripe Checkout.';
}

#!/usr/bin/env node
const token = process.env.TELEGRAM_BOT_TOKEN || '';
const publicBaseUrl = normalizeBaseUrl(process.env.BOT_PUBLIC_BASE_URL || process.env.TELEGRAM_BOT_PUBLIC_BASE_URL || process.env.BOT_BASE_URL || '');
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || '';
const blockers = [];

if (!token) blockers.push('TELEGRAM_BOT_TOKEN_missing');
if (!publicBaseUrl) blockers.push('BOT_PUBLIC_BASE_URL_missing');
if (!webhookSecret) blockers.push('TELEGRAM_WEBHOOK_SECRET_missing');

const webhookUrl = publicBaseUrl ? `${publicBaseUrl}/webhook/telegram` : null;

if (blockers.length) {
  printResult({
    success: false,
    blockers,
    webhookUrl,
    telegramEndpoint: 'https://api.telegram.org/bot<redacted>/setWebhook',
    nextManualStep: nextManualStep(blockers),
  });
  process.exit(1);
}

const response = await telegramApi('setWebhook', {
  url: webhookUrl,
  secret_token: webhookSecret,
  allowed_updates: ['message', 'callback_query'],
  drop_pending_updates: false,
});

printResult({
  success: Boolean(response.ok && response.payload?.ok),
  blockers: response.ok && response.payload?.ok ? [] : ['telegram_setWebhook_failed'],
  webhookUrl,
  telegramEndpoint: 'https://api.telegram.org/bot<redacted>/setWebhook',
  telegramResult: sanitizeTelegramPayload(response.payload),
  nextManualStep: response.ok && response.payload?.ok
    ? 'Run node scripts/telegram-webhook-info.mjs and confirm urlMatchesExpectedWebhookUrl=true, then run node scripts/e2e-telegram-bot-live-readiness-smoke.mjs.'
    : 'Resolve Telegram setWebhook error, rotate TELEGRAM_BOT_TOKEN if it was ever exposed, and retry without printing token-bearing URLs.',
});
process.exit(response.ok && response.payload?.ok ? 0 : 1);

function normalizeBaseUrl(value) {
  return (value || '').trim().replace(/\/+$/, '');
}

async function telegramApi(method, body) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({ ok: false, description: 'invalid_json_response' }));
    return { ok: response.ok, payload };
  } catch (error) {
    return { ok: false, payload: { ok: false, description: error.name } };
  }
}

function sanitizeTelegramPayload(payload) {
  let serialized = JSON.stringify(payload || {});
  if (token) serialized = serialized.replaceAll(token, '<redacted>');
  if (webhookSecret) serialized = serialized.replaceAll(webhookSecret, '<redacted>');
  serialized = serialized.replace(/bot[0-9]{6,12}:[A-Za-z0-9_-]{20,}/g, 'bot<redacted>');
  return JSON.parse(serialized);
}

function printResult(result) {
  console.log(JSON.stringify(result, null, 2));
}

function nextManualStep(currentBlockers) {
  if (currentBlockers.includes('BOT_PUBLIC_BASE_URL_missing')) return 'Set BOT_PUBLIC_BASE_URL or TELEGRAM_BOT_PUBLIC_BASE_URL to the bot public HTTPS origin, then rerun this helper.';
  if (currentBlockers.includes('TELEGRAM_BOT_TOKEN_missing')) return 'Rotate any exposed token in BotFather if needed, then set TELEGRAM_BOT_TOKEN in your shell/secret store without printing it.';
  if (currentBlockers.includes('TELEGRAM_WEBHOOK_SECRET_missing')) return 'Set a high-entropy TELEGRAM_WEBHOOK_SECRET; this helper passes it as Telegram secret_token.';
  return 'Resolve listed blockers, then rerun node scripts/telegram-set-webhook.mjs.';
}

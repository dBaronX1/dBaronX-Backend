#!/usr/bin/env node
const token = process.env.TELEGRAM_BOT_TOKEN || '';
const publicBaseUrl = normalizeBaseUrl(process.env.BOT_PUBLIC_BASE_URL || process.env.TELEGRAM_BOT_PUBLIC_BASE_URL || '');
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || '';
const blockers = [];

if (!token) blockers.push('TELEGRAM_BOT_TOKEN_missing');
if (!publicBaseUrl) blockers.push('BOT_PUBLIC_BASE_URL_missing');
if (!webhookSecret) blockers.push('TELEGRAM_WEBHOOK_SECRET_missing');

const webhookUrl = publicBaseUrl ? `${publicBaseUrl}/webhook/telegram` : null;

if (blockers.length) {
  printResult({ success: false, blockers, webhookUrl, telegramEndpoint: 'https://api.telegram.org/bot<redacted>/setWebhook' });
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
  return JSON.parse(JSON.stringify(payload || {}).replaceAll(token, '<redacted>').replaceAll(webhookSecret, '<redacted>'));
}

function printResult(result) {
  console.log(JSON.stringify(result, null, 2));
}

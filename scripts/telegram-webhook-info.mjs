#!/usr/bin/env node
const token = process.env.TELEGRAM_BOT_TOKEN || '';
const blockers = [];

if (!token) blockers.push('TELEGRAM_BOT_TOKEN_missing');

if (blockers.length) {
  console.log(JSON.stringify({
    success: false,
    blockers,
    telegramEndpoint: 'https://api.telegram.org/bot<redacted>/getWebhookInfo',
  }, null, 2));
  process.exit(1);
}

const response = await telegramApi('getWebhookInfo');
const result = {
  success: Boolean(response.ok && response.payload?.ok),
  blockers: response.ok && response.payload?.ok ? [] : ['telegram_getWebhookInfo_failed'],
  telegramEndpoint: 'https://api.telegram.org/bot<redacted>/getWebhookInfo',
  webhookInfo: sanitizeTelegramPayload(response.payload?.result || response.payload),
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);

async function telegramApi(method) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`);
    const payload = await response.json().catch(() => ({ ok: false, description: 'invalid_json_response' }));
    return { ok: response.ok, payload };
  } catch (error) {
    return { ok: false, payload: { ok: false, description: error.name } };
  }
}

function sanitizeTelegramPayload(payload) {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || '';
  let serialized = JSON.stringify(payload || {});
  serialized = serialized.replaceAll(token, '<redacted>');
  if (webhookSecret) serialized = serialized.replaceAll(webhookSecret, '<redacted>');
  serialized = serialized.replace(/bot[0-9]{6,12}:[A-Za-z0-9_-]{20,}/g, 'bot<redacted>');
  return JSON.parse(serialized);
}

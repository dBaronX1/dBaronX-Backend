#!/usr/bin/env node

const apiBaseUrl = (process.env.NESTJS_API_URL || process.env.API_URL || "http://localhost:4000").replace(/\/$/, "");
const endpoint = `${apiBaseUrl}/api/v1/payments/orchestration/preflight`;

const payload = {
  orderId: process.env.PREFLIGHT_ORDER_ID || `preflight-${Date.now()}`,
  accountId: process.env.PREFLIGHT_ACCOUNT_ID || "sandbox-account",
  ip: process.env.PREFLIGHT_IP || "127.0.0.1",
  amount: Number(process.env.PREFLIGHT_AMOUNT || 10.5),
  currency: (process.env.PREFLIGHT_CURRENCY || "USD").toUpperCase(),
  failedPayments24h: 0,
  attemptsLast1h: 1,
  distinctCardsLast24h: 1,
  distinctAccountsFromIp24h: 1,
  accountAgeDays: 30,
  emailVerified: true,
  phoneVerified: true,
  completedOrders: 1,
  successfulWatches30d: 1,
  deniedWatches30d: 0,
  affiliatePayoutRejections180d: 0,
  chargebacks365d: 0,
  policyFlags180d: 0,
  deviceCount30d: 1,
};

const result = { success: false, endpoint, mode: "sandbox", paidMarked: false, blocker: null };

try {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", "x-db-source": "e2e-payment-preflight-smoke" },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  let json = {};
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }

  if (!response.ok) {
    result.blocker = `payment_preflight_http_${response.status}`;
  } else if (json?.paymentPreflight?.approved === false || json?.decision?.approved === false) {
    result.blocker = "payment_preflight_denied";
  }

  result.success = response.ok;
  console.log(JSON.stringify({ ...result, response: json }, null, 2));
  process.exit(result.success ? 0 : 1);
} catch (error) {
  console.log(JSON.stringify({ ...result, blocker: "payment_preflight_unreachable", error: String(error) }, null, 2));
  process.exit(1);
}

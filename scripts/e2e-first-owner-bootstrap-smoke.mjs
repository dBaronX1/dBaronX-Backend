#!/usr/bin/env node
const API_BASE_URL = (process.env.API_BASE_URL || "http://localhost:3001").replace(/\/+$/, "");
const TOKEN = process.env.DBX_OWNER_BOOTSTRAP_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || "";
const ENABLED = process.env.DBX_ENABLE_FIRST_OWNER_BOOTSTRAP === "true";
const OWNER_USER_ID = process.env.DBX_OWNER_SUPABASE_USER_ID || "";
const blockers = [];
let healthReachable = false;
let blockedWithoutToken = false;
let enableGateReady = true;
let response = null;

try {
  const health = await fetch(`${API_BASE_URL}/health`);
  healthReachable = health.ok;
} catch {
  blockers.push("api_health_unreachable");
}

try {
  const denied = await fetch(`${API_BASE_URL}/api/bootstrap/first-owner`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
  blockedWithoutToken = [401, 403, 503].includes(denied.status);
} catch {}
if (!blockedWithoutToken) blockers.push("bootstrap_not_blocked_without_token");

if (!ENABLED) enableGateReady = false;
if (ENABLED && TOKEN && OWNER_USER_ID) {
  const res = await fetch(`${API_BASE_URL}/api/bootstrap/first-owner`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ userId: OWNER_USER_ID, email: process.env.DBX_OWNER_EMAIL || "owner@example.com", displayName: process.env.DBX_OWNER_DISPLAY_NAME || "dBaronX Owner", telegramUserId: process.env.DBX_OWNER_TELEGRAM_USER_ID || "1838800389" }),
  });
  response = await safeJson(res);
  if (!res.ok) blockers.push("bootstrap_request_failed_with_token");
} else {
  blockers.push("manual_owner_bootstrap_env_not_configured_for_live_rpc");
}

const requiredKeys = ["platformUserId", "firstUserNumber", "ownerReferenceId", "referralCode", "referralLink", "initiationCode", "initiationLink", "walletId", "affiliateAccountId"];
for (const key of requiredKeys) if (response && !response[key]) blockers.push(`missing_${key}`);
const serialized = JSON.stringify(response || {});
const secretLeakDetected = [TOKEN, process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.DATABASE_URL].filter(Boolean).some((secret) => serialized.includes(secret));
if (secretLeakDetected) blockers.push("secret_leak_detected");
const result = { success: blockers.length === 0, blockers, apiHealthReachable: healthReachable, blockedWithoutToken, enableGateReady, requiredEnvEnabled: ENABLED, returned: response, noFakeWalletCredit: response ? response.fakeWalletCreditCreated === false : null, noFakeReferralEarning: response ? response.fakeReferralEarningCreated === false : null, secretLeakDetected, nextManualStep: blockers.length ? "Run this smoke with deployed API URL, bootstrap enabled, token, and owner Supabase user id after signup." : "Record the first-owner links securely, then disable DBX_ENABLE_FIRST_OWNER_BOOTSTRAP." };
console.log(JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);

async function safeJson(res) { try { return await res.json(); } catch { return null; } }

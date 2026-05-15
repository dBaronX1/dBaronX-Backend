#!/usr/bin/env node

const API_BASE_URL = (process.env.API_BASE_URL || "http://localhost:3001").replace(/\/+$/, "");
const TOKEN = process.env.DBX_OWNER_BOOTSTRAP_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || "";
const ENABLED = process.env.DBX_ENABLE_FIRST_OWNER_BOOTSTRAP === "true";
const OWNER_USER_ID = process.env.DBX_OWNER_SUPABASE_USER_ID || "";
const OWNER_EMAIL = process.env.DBX_OWNER_EMAIL || "owner@example.com";
const OWNER_DISPLAY_NAME = process.env.DBX_OWNER_DISPLAY_NAME || "dBaronX Owner";
const OWNER_TELEGRAM_USER_ID = process.env.DBX_OWNER_TELEGRAM_USER_ID || "1838800389";
const TOKEN_HEADER = (process.env.DBX_OWNER_BOOTSTRAP_HEADER || "authorization").toLowerCase();

const canonicalRoute = "/api/bootstrap/first-owner";
const legacyRoute = "/api/api/bootstrap/first-owner";
const blockers = [];

let healthReachable = false;
let getProbe = null;
let missingTokenProbe = null;
let legacyProbe = null;
let validTokenProbe = null;
let response = null;

const ownerPayload = {
  userId: OWNER_USER_ID || "c0d9c557-15a9-4cc9-933c-99634fefeda1",
  email: OWNER_EMAIL,
  displayName: OWNER_DISPLAY_NAME,
  telegramUserId: OWNER_TELEGRAM_USER_ID,
};

try {
  const health = await fetch(`${API_BASE_URL}/health`);
  healthReachable = health.ok;
} catch {
  blockers.push("api_health_unreachable");
}

getProbe = await request("GET", canonicalRoute);
if (getProbe.ok) blockers.push("get_bootstrap_route_treated_as_success");
if (getProbe.status === 0) blockers.push("get_bootstrap_route_unreachable");

missingTokenProbe = await request("POST", canonicalRoute, ownerPayload);
const postRouteExists = missingTokenProbe.status !== 404 && missingTokenProbe.status !== 0;
if (!postRouteExists) blockers.push("canonical_post_bootstrap_route_not_ready");

const missingTokenRejected = [401, 403].includes(missingTokenProbe.status);
if (!missingTokenRejected) blockers.push("bootstrap_not_protected_without_token");

const disabledFlagDetected =
  codeOf(missingTokenProbe) === "bootstrap_disabled" ||
  (!ENABLED && [403, 423].includes(missingTokenProbe.status));
if (!ENABLED && !disabledFlagDetected) blockers.push("disabled_flag_not_detected");

legacyProbe = await request("POST", legacyRoute, ownerPayload);
const legacyDoubleApiRouteDetected = legacyProbe.status !== 404;
if (legacyDoubleApiRouteDetected) blockers.push("legacy_double_api_route_detected");

if (ENABLED && TOKEN && OWNER_USER_ID) {
  validTokenProbe = await request("POST", canonicalRoute, ownerPayload, tokenHeaders(TOKEN));
  response = unwrapData(validTokenProbe.body);
  if (!validTokenProbe.ok) blockers.push("bootstrap_request_failed_with_valid_token");
} else {
  blockers.push("manual_owner_bootstrap_env_not_configured_for_live_rpc");
}

const requiredKeys = [
  "platformUserId",
  "firstUserNumber",
  "ownerReferenceId",
  "referralCode",
  "referralLinkPath",
  "initiationCode",
  "initiationLinkPath",
  "walletId",
  "affiliateAccountId",
];
for (const key of requiredKeys) {
  if (response && !response[key]) blockers.push(`missing_${key}`);
}

const serialized = JSON.stringify({
  getProbe,
  missingTokenProbe,
  legacyProbe,
  validTokenProbe: sanitizeProbe(validTokenProbe),
  response,
});
const secretLeakDetected = [
  TOKEN,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  process.env.DATABASE_URL,
  process.env.JWT_SECRET,
]
  .filter(Boolean)
  .some((secret) => serialized.includes(secret));
if (secretLeakDetected) blockers.push("secret_leak_detected");

const result = {
  success: blockers.length === 0,
  blockers,
  apiHealthReachable: healthReachable,
  canonicalRoute,
  getNotTreatedAsSuccess: !getProbe.ok,
  postRouteExists,
  disabledFlagDetected,
  missingTokenRejected,
  validTokenRpcAttempted: Boolean(ENABLED && TOKEN && OWNER_USER_ID),
  legacyDoubleApiRouteDetected,
  requiredEnvEnabled: ENABLED,
  tokenHeaderMode:
    TOKEN_HEADER === "x-owner-bootstrap-token"
      ? "x-owner-bootstrap-token"
      : "authorization-bearer",
  statuses: {
    get: getProbe.status,
    postWithoutToken: missingTokenProbe.status,
    postLegacyDoubleApi: legacyProbe.status,
    postWithValidToken: validTokenProbe?.status ?? null,
  },
  codes: {
    postWithoutToken: codeOf(missingTokenProbe),
    postWithValidToken: codeOf(validTokenProbe),
  },
  returned: response,
  noFakeWalletCredit: response ? response.fakeWalletCreditCreated === false : null,
  noFakeReferralEarning: response ? response.fakeReferralEarningCreated === false : null,
  secretLeakDetected,
  nextManualStep: blockers.length
    ? "Run this smoke against the deployed API with /api/bootstrap/first-owner, bootstrap enabled, a rotated token, and the owner Supabase user id."
    : "Record the first-owner links securely, then immediately set DBX_ENABLE_FIRST_OWNER_BOOTSTRAP=false.",
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);

function tokenHeaders(token) {
  if (TOKEN_HEADER === "x-owner-bootstrap-token") {
    return { "x-owner-bootstrap-token": token };
  }

  return { authorization: `Bearer ${token}` };
}

async function request(method, path, body, headers = {}) {
  try {
    const init = {
      method,
      headers: { "content-type": "application/json", ...headers },
    };
    if (body !== undefined && method !== "GET") {
      init.body = JSON.stringify(body);
    }

    const res = await fetch(`${API_BASE_URL}${path}`, init);
    return { ok: res.ok, status: res.status, body: await safeJson(res) };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: { error: error?.message || String(error) },
    };
  }
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function unwrapData(body) {
  if (body && typeof body === "object" && body.success === true && body.data) {
    return body.data;
  }

  return body;
}

function codeOf(probe) {
  const body = probe?.body;
  if (!body || typeof body !== "object") return null;
  if (typeof body.code === "string") return body.code;
  if (body.error && typeof body.error === "object" && typeof body.error.code === "string") {
    return body.error.code;
  }
  return null;
}

function sanitizeProbe(probe) {
  if (!probe) return null;
  return {
    ok: probe.ok,
    status: probe.status,
    body: probe.body,
  };
}

#!/usr/bin/env node

const API_BASE_URL = (process.env.API_BASE_URL || "https://dbaronx-api-unified-qo2j.onrender.com").replace(/\/+$/, "");
const TOKEN = process.env.DBX_OWNER_BOOTSTRAP_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || "";
const ENABLED = process.env.DBX_ENABLE_FIRST_OWNER_BOOTSTRAP === "true";
const OWNER_USER_ID = process.env.DBX_OWNER_SUPABASE_USER_ID || "c0d9c557-15a9-4cc9-933c-99634fefeda1";
const OWNER_EMAIL = process.env.DBX_OWNER_EMAIL || "owner@domain.com";
const OWNER_DISPLAY_NAME = process.env.DBX_OWNER_DISPLAY_NAME || "Daniel Owusu Anane";
const OWNER_TELEGRAM_USER_ID = process.env.DBX_OWNER_TELEGRAM_USER_ID || "1838800389";
const TOKEN_HEADER = (process.env.DBX_OWNER_BOOTSTRAP_HEADER || "authorization").toLowerCase();
const EXPECT_DISABLED = process.env.DBX_EXPECT_BOOTSTRAP_DISABLED === "true" || !ENABLED;

const canonicalRoute = "/api/bootstrap/first-owner";
const legacyRoute = "/api/api/bootstrap/first-owner";
const ownerPayload = {
  userId: OWNER_USER_ID,
  email: OWNER_EMAIL,
  displayName: OWNER_DISPLAY_NAME,
  telegramUserId: OWNER_TELEGRAM_USER_ID,
};

const blockers = [];
const healthProbe = await request("GET", "/health");
const getProbe = await request("GET", canonicalRoute);
const missingTokenProbe = await request("POST", canonicalRoute, ownerPayload);
const invalidTokenProbe = await request("POST", canonicalRoute, ownerPayload, tokenHeaders("invalid-live-readiness-token"));
const legacyProbe = await request("POST", legacyRoute, ownerPayload);

const canonicalRouteReady = missingTokenProbe.status !== 404 && missingTokenProbe.status !== 0;
const legacyDoubleApiRouteDetected = legacyProbe.status !== 404;
const protectedWithoutToken = [401, 403].includes(missingTokenProbe.status) &&
  codeMatches(missingTokenProbe, ["missing_owner_bootstrap_token", "bootstrap_disabled"]);
const invalidTokenRejected = [401, 403].includes(invalidTokenProbe.status) &&
  codeMatches(invalidTokenProbe, ["invalid_owner_bootstrap_token", "bootstrap_disabled"]);
const disabledFlagRespected = EXPECT_DISABLED
  ? missingTokenProbe.status === 403 && codeMatches(missingTokenProbe, ["bootstrap_disabled"])
  : missingTokenProbe.status !== 403 || !codeMatches(missingTokenProbe, ["bootstrap_disabled"]);

if (!healthProbe.ok) blockers.push("api_health_unreachable");
if (getProbe.ok) blockers.push("get_bootstrap_route_treated_as_success");
if (!canonicalRouteReady) blockers.push("canonical_route_not_ready");
if (legacyDoubleApiRouteDetected) blockers.push("legacy_double_api_route_detected");
if (!protectedWithoutToken) blockers.push("missing_token_not_rejected_with_expected_code");
if (!invalidTokenRejected) blockers.push("invalid_token_not_rejected_with_expected_code");
if (!disabledFlagRespected) blockers.push("disabled_flag_not_respected");

let firstRunProbe = null;
let secondRunProbe = null;
let firstRun = null;
let secondRun = null;
let validTokenAccepted = false;
let idempotentSecondRun = false;

if (ENABLED && TOKEN) {
  firstRunProbe = await request("POST", canonicalRoute, ownerPayload, tokenHeaders(TOKEN));
  firstRun = unwrapData(firstRunProbe.body);
  validTokenAccepted = firstRunProbe.ok && hasRequiredBootstrapFields(firstRun);

  if (!firstRunProbe.ok) {
    const code = codeOf(firstRunProbe);
    if (code === "first_owner_bootstrap_rpc_blocked" || code === "first_owner_bootstrap_incomplete") {
      blockers.push(code);
      addBlockersFromProbe(firstRunProbe, blockers);
    } else {
      blockers.push("valid_token_not_accepted");
    }
  } else if (!validTokenAccepted) {
    blockers.push("valid_token_response_missing_required_fields");
  }

  secondRunProbe = await request("POST", canonicalRoute, ownerPayload, tokenHeaders(TOKEN));
  secondRun = unwrapData(secondRunProbe.body);
  idempotentSecondRun = secondRunProbe.ok && sameBootstrapIdentity(firstRun, secondRun);

  if (!idempotentSecondRun) blockers.push("idempotent_second_run_failed");
} else {
  blockers.push("live_valid_token_not_configured");
}

const returned = firstRun || secondRun || null;
const serialized = JSON.stringify({
  healthProbe,
  getProbe,
  missingTokenProbe,
  invalidTokenProbe,
  legacyProbe,
  firstRunProbe: sanitizeProbe(firstRunProbe),
  secondRunProbe: sanitizeProbe(secondRunProbe),
  returned,
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
  canonicalRouteReady,
  legacyDoubleApiRouteDetected,
  protectedWithoutToken,
  disabledFlagRespected,
  validTokenAccepted,
  idempotentSecondRun,
  platformUserId: stringOf(returned?.platformUserId),
  firstUserNumber: returned?.firstUserNumber ?? null,
  ownerReferenceId: stringOf(returned?.ownerReferenceId),
  referralCode: stringOf(returned?.referralCode),
  referralLinkPath: stringOf(returned?.referralLinkPath),
  initiationCode: stringOf(returned?.initiationCode),
  initiationLinkPath: stringOf(returned?.initiationLinkPath),
  walletId: stringOf(returned?.walletId),
  affiliateAccountId: stringOf(returned?.affiliateAccountId),
  nextManualStep: blockers.length
    ? "Resolve blockers, deploy migrations/API, enable DBX_ENABLE_FIRST_OWNER_BOOTSTRAP=true with a rotated token, and rerun this smoke."
    : "Record the returned owner/referral/initiation identifiers securely, then immediately set DBX_ENABLE_FIRST_OWNER_BOOTSTRAP=false and redeploy/restart.",
  probes: {
    healthStatus: healthProbe.status,
    canonicalGetStatus: getProbe.status,
    missingTokenStatus: missingTokenProbe.status,
    missingTokenCode: codeOf(missingTokenProbe),
    invalidTokenStatus: invalidTokenProbe.status,
    invalidTokenCode: codeOf(invalidTokenProbe),
    legacyDoubleApiStatus: legacyProbe.status,
    validTokenStatus: firstRunProbe?.status ?? null,
    validTokenCode: codeOf(firstRunProbe),
    secondRunStatus: secondRunProbe?.status ?? null,
    secondRunCode: codeOf(secondRunProbe),
  },
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

function codeMatches(probe, codes) {
  return codes.includes(codeOf(probe));
}

function addBlockersFromProbe(probe, target) {
  const details = probe?.body?.details;
  const nested = details && typeof details === "object" ? details.blockers : null;
  const direct = probe?.body?.blockers;
  for (const item of [direct, nested]) {
    if (Array.isArray(item)) {
      for (const blocker of item) target.push(String(blocker));
    }
  }
}

function hasRequiredBootstrapFields(value) {
  return [
    "platformUserId",
    "firstUserNumber",
    "ownerReferenceId",
    "referralCode",
    "referralLinkPath",
    "initiationCode",
    "initiationLinkPath",
    "walletId",
    "affiliateAccountId",
  ].every((key) => Boolean(value?.[key]));
}

function sameBootstrapIdentity(first, second) {
  if (!hasRequiredBootstrapFields(first) || !hasRequiredBootstrapFields(second)) return false;
  return [
    "platformUserId",
    "firstUserNumber",
    "ownerReferenceId",
    "referralCode",
    "referralLinkPath",
    "initiationCode",
    "initiationLinkPath",
    "walletId",
    "affiliateAccountId",
  ].every((key) => String(first[key]) === String(second[key]));
}

function sanitizeProbe(probe) {
  if (!probe) return null;
  return {
    ok: probe.ok,
    status: probe.status,
    body: probe.body,
  };
}

function stringOf(value) {
  return value === undefined || value === null ? null : String(value);
}

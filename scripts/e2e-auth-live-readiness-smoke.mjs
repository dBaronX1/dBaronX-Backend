#!/usr/bin/env node
const API_BASE_URL = (process.env.API_BASE_URL || "https://dbaronx-api-unified-qo2j.onrender.com").replace(/\/+$/, "");
const RUN_LIVE_SMOKE = process.env.RUN_LIVE_SMOKE === "1";
const CREATE_USER = process.env.DBX_CREATE_TEST_USER === "true";

function uniqueEmail(email) {
  if (!email) return `dbx-auth-smoke+${Date.now()}@example.com`;
  const [local, domain] = email.split("@");
  if (!domain || local.includes("+")) return email;
  return `${local}+${Date.now()}@${domain}`;
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { parseError: true }; }
  return { response, payload };
}

function redactBlockers(blockers) {
  return Array.isArray(blockers) ? blockers.map((blocker) => String(blocker)) : [];
}

function readinessNextAction(summary) {
  if (!summary.authReadinessRouteLive) return "Deploy the NestJS API branch that mounts AuthModule and exposes /api/auth/readiness.";
  if (!summary.supabaseConfigured) return "Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and JWT_SECRET on the NestJS API service, then redeploy.";
  if (!summary.authProviderReachable) return "Check the Supabase project URL/service role and API egress from the NestJS service.";
  if (!summary.profilePersistenceReady) return "Create or repair the app_public profiles/user_profiles table used by the API auth gateway.";
  return "Auth readiness is live. If desired, set DBX_CREATE_TEST_USER=true with TEST_AUTH_PASSWORD to run register/login/me.";
}

if (!RUN_LIVE_SMOKE) {
  console.log(JSON.stringify({
    authReadinessRouteLive: false,
    supabaseConfigured: false,
    authProviderReachable: false,
    profilePersistenceReady: false,
    blockers: ["live_smoke_skipped"],
    nextAction: "Set RUN_LIVE_SMOKE=1 and API_BASE_URL to call the deployed NestJS API readiness route.",
  }, null, 2));
  process.exit(0);
}

const readiness = await fetchJson(`${API_BASE_URL}/api/auth/readiness`, { headers: { accept: "application/json" } });
const payload = readiness.payload && typeof readiness.payload === "object" ? readiness.payload : {};
const summary = {
  authReadinessRouteLive: readiness.response.status !== 404 && typeof payload.success === "boolean",
  supabaseConfigured: Boolean(payload.supabaseConfigured),
  authProviderReachable: Boolean(payload.authProviderReachable),
  profilePersistenceReady: Boolean(payload.profilePersistenceReady),
  blockers: redactBlockers(payload.blockers),
  nextAction: "",
};

if (CREATE_USER) {
  const password = process.env.TEST_AUTH_PASSWORD || "";
  const email = uniqueEmail(process.env.TEST_AUTH_EMAIL || "");
  if (!password || password.length < 8) throw new Error("TEST_AUTH_PASSWORD is required and must not be printed");

  const register = await fetchJson(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ email, password, confirmPassword: password, fullName: "DBX Auth Smoke" }),
  });
  summary.testUserRegister = register.response.ok && register.payload?.success === true;

  const login = await fetchJson(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ email, password }),
  });
  summary.testUserLogin = login.response.ok && login.payload?.success === true;

  const token = login.payload?.session?.accessToken || register.payload?.session?.accessToken;
  if (token) {
    const me = await fetchJson(`${API_BASE_URL}/api/auth/me`, { headers: { accept: "application/json", authorization: `Bearer ${token}` } });
    summary.testUserMe = me.response.ok && me.payload?.success === true;
  } else {
    summary.testUserMe = false;
  }
}

summary.nextAction = readinessNextAction(summary);
console.log(JSON.stringify(summary, null, 2));
if (!summary.authReadinessRouteLive) process.exit(1);

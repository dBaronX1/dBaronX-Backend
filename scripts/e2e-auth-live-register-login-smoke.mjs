#!/usr/bin/env node
const REQUIRED_BASE_URL = "https://dbaronx-api-unified-qo2j.onrender.com";
const RUN_LIVE_SMOKE = process.env.RUN_LIVE_SMOKE === "1";
const ALLOW_CREATE = process.env.DBX_ALLOW_AUTH_CREATE_SMOKE === "true";
const API_BASE_URL = String(process.env.API_BASE_URL || "").replace(/\/+$/, "");
const failures = [];

function assert(pass, message) {
  if (!pass) failures.push(message);
}

function finishSkipped() {
  console.log(JSON.stringify({ success: true, skipped: true, blockers: ["live_smoke_skipped"], nextAction: "Set RUN_LIVE_SMOKE=1 and API_BASE_URL=https://dbaronx-api-unified-qo2j.onrender.com to run live auth checks." }, null, 2));
}

async function fetchJson(path, init) {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { parseError: true };
  }
  return { response, payload };
}

function uniqueEmail() {
  const configured = process.env.DBX_AUTH_SMOKE_EMAIL;
  if (!configured) return `dbx-auth-smoke+${Date.now()}@example.com`;
  const [local, domain] = configured.split("@");
  if (!domain) return `dbx-auth-smoke+${Date.now()}@example.com`;
  return `${local.replace(/\+.*/, "")}+${Date.now()}@${domain}`;
}

if (!RUN_LIVE_SMOKE) {
  finishSkipped();
  process.exit(0);
}

assert(API_BASE_URL === REQUIRED_BASE_URL, "API_BASE_URL_must_match_production_api");
if (!ALLOW_CREATE) {
  console.log(JSON.stringify({ success: true, skipped: true, blockers: ["auth_create_smoke_not_allowed"], nextAction: "Set DBX_ALLOW_AUTH_CREATE_SMOKE=true plus DBX_AUTH_SMOKE_PASSWORD to create a temporary live auth smoke user. Passwords and tokens are never printed." }, null, 2));
  process.exit(failures.length ? 1 : 0);
}

const password = String(process.env.DBX_AUTH_SMOKE_PASSWORD || "");
assert(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password), "DBX_AUTH_SMOKE_PASSWORD_required_strong");
if (failures.length) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const email = uniqueEmail();
const summary = { success: false, register: false, login: false, me: false, blockers: [] };
try {
  const register = await fetchJson("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ email, password, confirmPassword: password, fullName: "DBX Auth Smoke" }),
  });
  summary.register = register.response.ok && register.payload?.success === true && Boolean(register.payload?.session?.accessToken || register.payload?.accessToken);
  if (!summary.register) summary.blockers.push(`register_contract_failed_${register.response.status}`);

  const login = await fetchJson("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const token = login.payload?.session?.accessToken || login.payload?.accessToken || login.payload?.token;
  summary.login = login.response.ok && login.payload?.success === true && Boolean(token) && Boolean(login.payload?.user?.id);
  if (!summary.login) summary.blockers.push(`login_contract_failed_${login.response.status}`);

  if (token) {
    const me = await fetchJson("/api/auth/me", { headers: { accept: "application/json", authorization: `Bearer ${token}` } });
    summary.me = me.response.ok && me.payload?.success === true && Boolean(me.payload?.user?.id) && !me.payload?.user?.app_metadata && !me.payload?.user?.user_metadata;
    if (!summary.me) summary.blockers.push(`me_contract_failed_${me.response.status}`);
  }
  summary.success = summary.register && summary.login && summary.me;
} catch {
  summary.blockers.push("network_or_live_auth_smoke_failed");
}

console.log(JSON.stringify(summary, null, 2));
process.exit(summary.success ? 0 : 1);

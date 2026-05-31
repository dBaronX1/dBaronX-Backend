#!/usr/bin/env node
const API_BASE_URL = (process.env.API_BASE_URL || "https://dbaronx-api-unified-qo2j.onrender.com").replace(/\/+$/, "");
const WEB_BASE_URL = (process.env.WEB_BASE_URL || "https://dbaronx.com").replace(/\/+$/, "");
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

if (!RUN_LIVE_SMOKE) {
  console.log("ok - live smoke skipped; set RUN_LIVE_SMOKE=1 to call deployed URLs");
  process.exit(0);
}

const summary = { apiBaseUrl: API_BASE_URL, webBaseUrl: WEB_BASE_URL, readiness: false, webReachable: false, createdTestUser: false, login: false, me: false };
const readiness = await fetchJson(`${API_BASE_URL}/api/auth/readiness`, { headers: { accept: "application/json" } });
summary.readiness = readiness.response.status < 500 && typeof readiness.payload === "object";
const web = await fetch(WEB_BASE_URL, { headers: { accept: "text/html" } });
summary.webReachable = web.ok;

if (CREATE_USER) {
  const password = process.env.TEST_AUTH_PASSWORD || "";
  const email = uniqueEmail(process.env.TEST_AUTH_EMAIL || "");
  if (!password || password.length < 8) throw new Error("TEST_AUTH_PASSWORD is required and must not be printed");
  const register = await fetchJson(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ email, password, confirmPassword: password, fullName: "DBX Auth Smoke" }),
  });
  summary.createdTestUser = register.response.ok && register.payload.success === true;
  const login = await fetchJson(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ email, password }),
  });
  summary.login = login.response.ok && login.payload.success === true;
  const token = login.payload?.session?.accessToken || register.payload?.session?.accessToken;
  if (token) {
    const me = await fetchJson(`${API_BASE_URL}/api/auth/me`, { headers: { accept: "application/json", authorization: `Bearer ${token}` } });
    summary.me = me.response.ok && me.payload.success === true;
  }
}

console.log(JSON.stringify(summary, null, 2));
if (!summary.readiness || !summary.webReachable) process.exit(1);

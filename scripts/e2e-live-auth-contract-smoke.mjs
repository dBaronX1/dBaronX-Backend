#!/usr/bin/env node
const requiredBaseUrl = "https://dbaronx-api-unified-qo2j.onrender.com";
const failures = [];
const assert = (condition, code) => { if (!condition) failures.push(code); };
function finish() { if (failures.length) { console.error("Live auth contract smoke failed:"); for (const failure of failures) console.error(`- ${failure}`); process.exit(1); } console.log("Live auth contract smoke passed."); }
assert(process.env.RUN_LIVE_SMOKE === "1", "RUN_LIVE_SMOKE_not_enabled");
assert(process.env.API_BASE_URL === requiredBaseUrl, "API_BASE_URL_must_match_production_api");
if (failures.length) finish();
const baseUrl = process.env.API_BASE_URL.replace(/\/$/, "");
const readinessResponse = await fetch(`${baseUrl}/api/auth/readiness`, { headers: { accept: "application/json" } });
const readiness = await readinessResponse.json().catch(() => null);
assert(readinessResponse.status < 500, "auth_readiness_5xx");
assert(readiness && typeof readiness === "object", "auth_readiness_missing_json");
assert(readiness?.authUserCreationDiagnosticAvailable === true, "auth_user_creation_diagnostic_flag_missing");
assert("blockers" in readiness, "auth_readiness_blockers_missing");
if (process.env.DBX_ALLOW_AUTH_CREATE_SMOKE === "true") {
  assert(process.env.DBX_AUTH_SMOKE_EMAIL && process.env.DBX_AUTH_SMOKE_PASSWORD, "auth_create_smoke_requires_explicit_email_and_password_env");
}
finish();

#!/usr/bin/env node
const requiredBaseUrl = "https://dbaronx-api-unified-qo2j.onrender.com";
const failures = [];
const assert = (condition, code) => { if (!condition) failures.push(code); };
function finish() { if (failures.length) { console.error("Live checkout contract smoke failed:"); for (const failure of failures) console.error(`- ${failure}`); process.exit(1); } console.log("Live checkout contract smoke passed."); }
assert(process.env.RUN_LIVE_SMOKE === "1", "RUN_LIVE_SMOKE_not_enabled");
assert(process.env.API_BASE_URL === requiredBaseUrl, "API_BASE_URL_must_match_production_api");
if (failures.length) finish();
const baseUrl = process.env.API_BASE_URL.replace(/\/$/, "");
const readinessResponse = await fetch(`${baseUrl}/api/checkout/readiness`, { headers: { accept: "application/json" } });
const readiness = await readinessResponse.json().catch(() => null);
assert(readinessResponse.status < 500, "checkout_readiness_5xx");
assert(readiness && typeof readiness === "object", "checkout_readiness_missing_json");
assert(readiness?.multiLineCheckoutSupported === true, "checkout_multiline_support_missing");
assert("stripeConfigured" in readiness, "checkout_stripe_configured_flag_missing");
assert("paystackConfigured" in readiness, "checkout_paystack_configured_flag_missing");
if (process.env.DBX_ALLOW_PAYMENT_SESSION_SMOKE === "true") {
  console.warn("Payment session smoke is intentionally not auto-created without an explicit audited payload fixture.");
}
finish();

#!/usr/bin/env node
const requiredBaseUrl = "https://dbaronx-api-unified-qo2j.onrender.com";
const failures = [];
const assert = (condition, code) => { if (!condition) failures.push(code); };
function finish() { if (failures.length) { console.error("Live AI Stories contract smoke failed:"); for (const failure of failures) console.error(`- ${failure}`); process.exit(1); } console.log("Live AI Stories contract smoke passed."); }
assert(process.env.RUN_LIVE_SMOKE === "1", "RUN_LIVE_SMOKE_not_enabled");
assert(process.env.API_BASE_URL === requiredBaseUrl, "API_BASE_URL_must_match_production_api");
if (failures.length) finish();
const baseUrl = process.env.API_BASE_URL.replace(/\/$/, "");
const readinessResponse = await fetch(`${baseUrl}/api/v1/ai-stories/readiness`, { headers: { accept: "application/json" } });
const readiness = await readinessResponse.json().catch(() => null);
assert(readinessResponse.status < 500, "ai_stories_readiness_5xx");
assert(readiness && typeof readiness === "object", "ai_stories_readiness_missing_json");
assert(JSON.stringify(readiness).includes("fastapi") || JSON.stringify(readiness).includes("provider") || "success" in readiness, "ai_stories_readiness_unrecognized_shape");
if (process.env.DBX_ALLOW_AI_GENERATION_SMOKE === "true") {
  const prompt = process.env.DBX_AI_GENERATION_SMOKE_PROMPT || "Write a short premium commerce story for dBaronX.";
  const response = await fetch(`${baseUrl}/api/v1/ai-stories/generate`, { method: "POST", headers: { accept: "application/json", "content-type": "application/json" }, body: JSON.stringify({ prompt, tone: "premium", length: "short", source: "live_smoke" }) });
  const result = await response.json().catch(() => null);
  assert(response.status < 500, "ai_generation_5xx");
  assert(result && typeof result === "object", "ai_generation_missing_json");
}
finish();

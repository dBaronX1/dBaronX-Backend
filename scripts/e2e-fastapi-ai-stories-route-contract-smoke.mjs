#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const blockers = [];
const route = await readFile("apps/services-fastapi/src/app/api/routes/ai_generation.py", "utf8");
const service = await readFile("apps/services-fastapi/src/app/services/story_generation_service.py", "utf8");
const provider = await readFile("apps/services-fastapi/src/app/services/ai_provider_service.py", "utf8");
const nest = await readFile("apps/api/src/modules/ai-stories/ai-stories-generation.service.ts", "utf8");

for (const marker of ["/stories/readiness", "/stories/generate", "providerConfigured", "generationEndpointReady", "providersDetected", "providerOrder", "blockers", "success"]) {
  if (!route.includes(marker)) blockers.push(`fastapi_route_missing_${marker}`);
}
for (const key of ["GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "AI_PROVIDER_ORDER"]) {
  if (!provider.includes(key)) blockers.push(`provider_key_detection_missing_${key}`);
}
if (!route.includes('"ai_provider_missing"')) blockers.push("readiness_missing_safe_provider_blocker_code");
if (!service.includes('code="ai_provider_missing"')) blockers.push("generation_missing_safe_provider_error_code");
if (!service.includes('all_ai_providers_failed')) blockers.push("generation_missing_all_providers_failed_code");
if (!provider.includes('def provider_order')) blockers.push("provider_order_override_missing");
if (!nest.includes("/ai/stories/readiness") || !nest.includes("/ai/stories/generate")) blockers.push("nestjs_not_calling_fastapi_ai_stories_routes");
if (!nest.includes('blockers.push("fastapi_route_missing")')) blockers.push("nestjs_readiness_404_not_fastapi_route_missing");
const secretValuePattern = /(GEMINI_API_KEY|GOOGLE_API_KEY|GOOGLE_GENERATIVE_AI_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY)\s*=\s*["'][A-Za-z0-9][^"']+["']/;
if (secretValuePattern.test(`${route}\n${service}\n${provider}\n${nest}`)) blockers.push("ai_provider_secret_literal_detected");

console.log(JSON.stringify({ success: blockers.length === 0, blockers }, null, 2));
process.exit(blockers.length ? 1 : 0);

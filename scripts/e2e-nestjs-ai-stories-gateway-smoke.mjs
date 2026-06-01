#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const blockers = [];
const service = await readFile("apps/api/src/modules/ai-stories/ai-stories-generation.service.ts", "utf8");
const controller = await readFile("apps/api/src/modules/ai-stories/ai-stories-generation.controller.ts", "utf8");

if (!controller.includes('@Controller({ path: "ai-stories", version: "1" })')) {
  blockers.push("nestjs_ai_stories_v1_controller_missing");
}
if (!controller.includes('@Get("readiness")')) blockers.push("nestjs_readiness_controller_route_missing");
if (!controller.includes('@Post("generate")')) blockers.push("nestjs_generate_controller_route_missing");
if (!service.includes('/ai/stories/readiness')) blockers.push("nestjs_not_calling_fastapi_ai_stories_readiness");
if (!service.includes('/ai/stories/generate')) blockers.push("nestjs_not_calling_fastapi_ai_stories_generate");
if (!service.includes('blockers.push("fastapi_route_missing")')) blockers.push("nestjs_404_not_mapped_to_fastapi_route_missing");
if (!service.includes('blockers.push("fastapi_unavailable")')) blockers.push("nestjs_unreachable_not_mapped_to_fastapi_unavailable");
if (!service.includes('blockers.push("ai_provider_missing")')) blockers.push("nestjs_no_provider_not_mapped_to_ai_provider_missing");
if (!service.includes('"all_ai_providers_failed"')) blockers.push("nestjs_all_provider_failures_not_safe_mapped");
if (/OPENAI_API_KEY|ANTHROPIC_API_KEY|GEMINI_API_KEY|GOOGLE_API_KEY|GOOGLE_GENERATIVE_AI_API_KEY/.test(service)) {
  blockers.push("nestjs_gateway_must_not_read_provider_keys");
}

console.log(JSON.stringify({ success: blockers.length === 0, blockers }, null, 2));
process.exit(blockers.length ? 1 : 0);

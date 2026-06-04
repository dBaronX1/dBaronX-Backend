#!/usr/bin/env node
import { read, assert } from "./e2e-production-lock-helpers.mjs";
const fastapiGeneration = read(
  "apps/services-fastapi/src/app/api/routes/ai_generation.py",
);
const fastapiStories = read(
  "apps/services-fastapi/src/app/api/routes/ai_stories.py",
);
const provider = read(
  "apps/services-fastapi/src/app/services/ai_provider_service.py",
);
const nestController = read(
  "apps/api/src/modules/ai-stories/ai-stories-generation.controller.ts",
);
const nestService = read(
  "apps/api/src/modules/ai-stories/ai-stories-generation.service.ts",
);
assert(
  fastapiGeneration.includes('"/stories/readiness"'),
  "FastAPI /ai/stories/readiness route missing",
);
assert(
  fastapiGeneration.includes('"/stories/generate"'),
  "FastAPI /ai/stories/generate route missing",
);
assert(
  fastapiStories.includes('@router.get("/readiness")'),
  "FastAPI compatibility AI stories readiness route missing",
);
assert(
  nestController.includes('@Get("readiness")') &&
    nestController.includes('@Post("generate")'),
  "NestJS AI Stories readiness/generate routes missing",
);
assert(
  nestService.includes("/ai/stories/readiness") &&
    nestService.includes("/ai/stories/generate"),
  "NestJS must call FASTAPI_BASE_URL /ai/stories readiness/generate first",
);
for (const key of [
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "AI_PROVIDER_ORDER",
])
  assert(provider.includes(key), `provider env support missing ${key}`);
assert(
  provider.includes('"gemini,openai,anthropic"'),
  "default provider order must be gemini,openai,anthropic",
);
for (const marker of [
  "providerConfigured",
  "generationEndpointReady",
  "fastapiReachable",
  "blockers",
])
  assert(nestService.includes(marker), `readiness missing ${marker}`);
assert(
  nestService.includes(
    "Story generation is temporarily unavailable. Please try again.",
  ),
  "customer-safe AI failure message missing",
);
console.log("AI Stories production readiness lock smoke passed");

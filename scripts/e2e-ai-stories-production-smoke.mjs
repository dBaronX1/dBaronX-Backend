#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));
const assert = (condition, message) => { if (!condition) failures.push(message); };

const apiController = read("apps/api/src/modules/ai-stories/ai-stories-generation.controller.ts");
const apiService = read("apps/api/src/modules/ai-stories/ai-stories-generation.service.ts");
const fastapiRoute = read("apps/services-fastapi/src/app/api/routes/ai_generation.py");
const fastapiProvider = read("apps/services-fastapi/src/app/services/ai_provider_service.py");
const fastapiStory = read("apps/services-fastapi/src/app/services/story_generation_service.py");
const rocketRoute = read("apps/web/src/app/api/ai-stories/route.ts");
const rocketPanel = read("apps/web/src/components/dbx/AiStoryGeneratorPanel.tsx");
const migration = read("supabase/migrations/202605150001_ai_stories_generation_contract_alignment.sql");

assert(apiController.includes('@Controller({ path: "ai-stories", version: "1" })'), "NestJS ai-stories v1 controller is missing.");
assert(apiController.includes('@Post("generate")'), "NestJS POST generate route is missing.");
assert(apiController.includes('@Get("readiness")'), "NestJS readiness route is missing.");
assert(apiService.includes("FASTAPI_BASE_URL"), "NestJS gateway must use FASTAPI_BASE_URL.");
assert(apiService.includes("/ai/stories/generate"), "NestJS gateway must call FastAPI /ai/stories/generate.");
assert(apiService.includes("fastapi_unavailable") && apiService.includes("ai_provider_missing") && apiService.includes("persistence_failed"), "NestJS safe error codes are incomplete.");

assert(fastapiRoute.includes('"/stories/generate"'), "FastAPI /ai/stories/generate route is missing.");
assert(fastapiRoute.includes('"/stories/readiness"'), "FastAPI /ai/stories/readiness route is missing.");
assert(/AI_PROVIDER_ORDER", "gemini,openai,anthropic"/.test(fastapiProvider) && /for provider in \("gemini", "openai", "anthropic"\)/.test(fastapiProvider), "Provider fallback order must be Gemini, OpenAI, Anthropic.");
assert(fastapiProvider.includes("GOOGLE_GENERATIVE_AI_API_KEY"), "FastAPI must accept GOOGLE_GENERATIVE_AI_API_KEY alias.");
assert(fastapiProvider.includes("gemini-2.5-flash") && fastapiProvider.includes("claude-sonnet-4-20250514"), "FastAPI story providers must default to current production-capable Gemini and Claude models unless env overrides them.");
assert(fastapiStory.includes("insert_ai_story") && fastapiStory.includes("persistence_failed"), "FastAPI story generation must persist and surface persistence warnings.");
assert(fastapiStory.includes("ai_provider_missing") && fastapiStory.includes("ai_provider_failed"), "FastAPI provider errors must be exact and safe.");

assert(rocketRoute.includes("NEXT_PUBLIC_API_BASE_URL"), "Rocket route must use API base URL.");
assert(rocketRoute.includes("/api/v1/ai-stories/generate"), "Rocket route must call NestJS, not FastAPI/provider directly.");
assert(!/api\.openai\.com|generativelanguage\.googleapis\.com|api\.anthropic\.com/.test(rocketRoute + rocketPanel), "Frontend must not call AI providers directly.");

for (const concept of ["Starlight Children", "The Last Dragon", "The Solar Forest", "Quantum Dreams", "Midnight Protocol", "The Merchant’s Secret"]) {
  assert(rocketPanel.includes(concept), `Placeholder concept missing: ${concept}`);
}
assert(rocketPanel.includes("Retry generation"), "Rocket UI must expose retry button.");
assert(rocketPanel.includes("data.content"), "Rocket UI must render generated story content from response.");
assert(rocketPanel.includes("errorMessages"), "Rocket UI must map safe error codes.");

for (const key of ["OPENAI_API_KEY", "GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY", "ANTHROPIC_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "INTERNAL_SERVICE_TOKEN"]) {
  const frontendRefs = ["apps/web/src/app", "apps/web/src/components", "apps/web/src/lib"]
    .flatMap((dir) => fs.existsSync(path.join(root, dir)) ? walk(path.join(root, dir)) : [])
    .filter((file) => /\.(?:ts|tsx|js|jsx|mjs)$/.test(file))
    .filter((file) => !file.endsWith("apps/web/src/app/api/ai-stories/route.ts"))
    .filter((file) => fs.readFileSync(file, "utf8").includes(key));
  assert(frontendRefs.length === 0, `${key} referenced in browser frontend files: ${frontendRefs.map((f) => path.relative(root, f)).join(", ")}`);
}

assert(migration.includes("concept_id") && migration.includes("word_count") && migration.includes("audience"), "Supabase migration must include production story columns.");
assert(exists("docs/ai-stories-production-runbook.md"), "AI Stories production runbook is missing.");

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", "dist", "build"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

if (failures.length) {
  console.error("AI Stories production smoke failures:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("AI Stories production smoke passed.");

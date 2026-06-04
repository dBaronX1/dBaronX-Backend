#!/usr/bin/env node
import { read, assert } from "./e2e-production-lock-helpers.mjs";
const nest = read(
  "apps/api/src/modules/ai-stories/ai-stories-generation.service.ts",
);
const fastapiStoryService = read(
  "apps/services-fastapi/src/app/services/story_generation_service.py",
);
const provider = read(
  "apps/services-fastapi/src/app/services/ai_provider_service.py",
);
assert(
  /record\.content \|\| record\.story \|\| record\.text/.test(nest),
  "NestJS must unwrap direct content/story/text fields",
);
assert(
  /nestedData\.content[\s\S]*nestedData\.story[\s\S]*nestedData\.text/.test(
    nest,
  ),
  "NestJS must unwrap data.content/data.story/data.text envelope fields",
);
assert(
  nest.includes("if (!content)") && nest.includes("emptyContent"),
  "NestJS must reject empty provider output instead of faking stories",
);
assert(
  !/Once upon a time|placeholder story|mock story|demo story/i.test(
    nest + fastapiStoryService,
  ),
  "fake/placeholder story generation detected",
);
assert(
  fastapiStoryService.includes("ai_provider_missing") &&
    fastapiStoryService.includes("all_ai_providers_failed"),
  "FastAPI generation must return safe provider failure codes",
);
assert(
  provider.includes("available_providers") &&
    provider.includes("providers_attempted"),
  "provider fallback attempts must be real and diagnosable",
);
assert(
  !/error\.message|str\(exc\)[\s\S]{0,120}return/.test(nest),
  "NestJS public response must not expose raw provider error messages",
);
assert(
  nest.includes("safeDiagnostics") && nest.includes("safeMessage"),
  "NestJS must sanitize provider diagnostics and messages",
);
console.log("AI Stories generation contract lock smoke passed");

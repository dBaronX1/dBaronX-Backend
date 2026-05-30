#!/usr/bin/env python3
from __future__ import annotations

import pathlib
import re
import sys

root = pathlib.Path.cwd()
failures: list[str] = []

def read(path: str) -> str:
    return (root / path).read_text()

def check(condition: bool, message: str) -> None:
    if not condition:
        failures.append(message)

route = read("apps/services-fastapi/src/app/api/routes/ai_generation.py")
provider = read("apps/services-fastapi/src/app/services/ai_provider_service.py")
story = read("apps/services-fastapi/src/app/services/story_generation_service.py")
schema = read("apps/services-fastapi/src/app/schemas/ai_generation.py")

check('"/stories/generate"' in route, "FastAPI /ai/stories/generate route registration missing")
check('"/stories/readiness"' in route, "FastAPI /ai/stories/readiness route registration missing")
check(re.search(r'providers\.append\("gemini"\).*providers\.append\("openai"\).*providers\.append\("anthropic"\)', provider, re.S) is not None, "Provider order is not Gemini/OpenAI/Anthropic")
check("GOOGLE_GENERATIVE_AI_API_KEY" in provider, "Gemini alias GOOGLE_GENERATIVE_AI_API_KEY missing")
check("providerConfigured" in route and "fallbackOrder" in route, "Readiness must include provider booleans and fallback order")
check("ai_provider_missing" in story and "ai_provider_failed" in story, "Provider error codes missing")
check("insert_ai_story" in story and "persistence_failed" in story, "Persistence warning path missing")
check("concept_id" in schema and "length" in schema and "audience" in schema, "Request schema missing production fields")
check("OPENAI_API_KEY" not in route and "SUPABASE_SERVICE_ROLE_KEY" not in route, "Route should not print or expose secrets")

if failures:
    print("FastAPI AI Stories smoke failures:", file=sys.stderr)
    for failure in failures:
        print(f"- {failure}", file=sys.stderr)
    sys.exit(1)

print("FastAPI AI Stories smoke passed.")

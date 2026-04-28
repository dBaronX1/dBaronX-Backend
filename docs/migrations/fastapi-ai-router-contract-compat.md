# FastAPI AI Router Contract Compatibility Migration

## Scope
- Target: `apps/services-fastapi`
- Focus: recover useful legacy AI router compatibility behaviors without replacing the modular FastAPI architecture.
- Non-goals: no structural replacement of `main.py`, `api_router.py`, startup flow, or modular route mount strategy.

## Source reference status
Requested source reference path was checked:
- `.dbx-source/FastAPI/ai_router.py`

In this checkout, that file/path is not present, so compatibility decisions were derived from current in-repo AI route contracts and common legacy request conventions already used across DBX migrations.

## Implemented compatibility

### 1) Legacy path aliases under existing `/ai` route module
Inside `app.api.routes.ai_generation` the canonical routes remain unchanged:
- `POST /ai/stories/generate`
- `POST /ai/stories/continue`
- `POST /ai/stories/rewrite`

Added legacy aliases that map to the same service methods:
- `POST /ai/generate`
- `POST /ai/continue`
- `POST /ai/rewrite`

This preserves canonical behavior while allowing older clients to continue using shorter legacy route paths.

### 2) Request payload field compatibility
Inside `app.schemas.ai_generation` request models now accept legacy key variants via validation aliases, while preserving canonical schema names internally.

Examples:
- `userId` -> `user_id`
- `requestId`/`idempotencyKey` -> `request_id`
- `title`/`titleHint` -> `title_hint`
- `maxTokens`/`max_tokens` -> `max_output_tokens`
- `provider`/`providerHint` -> `provider_hint`
- `safeMode` -> `safe_mode`
- continuation/rewrite payload aliases for `storyId`, `existingContent`, `sourceContent`, `rewriteGoal`, `preservePlot`

This keeps the stronger canonical service flow intact while reducing client breakage from legacy request shapes.

## Provider safety and startup behavior
- No provider key assumptions were added.
- No forced provider initialization changes were introduced.
- Optional AI provider behavior remains non-crashing when provider keys are absent.

## Validation run
- `python -m compileall apps/services-fastapi/src`
- `INTERNAL_SERVICE_TOKEN=local-dev-internal-token PYTHONPATH=apps/services-fastapi/src python -m uvicorn main:app --host 127.0.0.1 --port 8099` (startup verification)
- `git ls-files .dbx-source`

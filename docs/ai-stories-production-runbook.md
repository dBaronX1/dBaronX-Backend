# AI Stories Production Generation Runbook

## Production path

1. Rocket customer UI renders `/ai-stories`, `/ai-stories/create`, or `/ai-story-generator`.
2. Browser submits `POST /api/ai-stories` to the Rocket server route.
3. Rocket server route forwards to NestJS `POST /api/v1/ai-stories/generate` using `NEXT_PUBLIC_API_BASE_URL` / `API_BASE_URL`.
4. NestJS validates the request and calls FastAPI `POST /ai/stories/generate` using server-side `FASTAPI_BASE_URL`.
5. FastAPI tries providers in this order: Gemini, OpenAI, Anthropic.
6. FastAPI writes generated story records to Supabase `app_public.ai_stories`; NestJS performs a second safe persistence attempt only if FastAPI returns generated content with `saved: false`.

## Required environment variables

### Rocket

- `NEXT_PUBLIC_API_BASE_URL=https://dbaronx-api-unified-qo2j.onrender.com`
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` only for auth/session lookup.

Rocket must not contain `OPENAI_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or `INTERNAL_SERVICE_TOKEN`.

### NestJS API

- `FASTAPI_BASE_URL=https://dbaronx-fastapi-5ci9.onrender.com`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INTERNAL_SERVICE_TOKEN` when FastAPI internal auth is enabled.

### FastAPI

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INTERNAL_SERVICE_TOKEN` when required by deployment.
- At least one AI provider key:
  - `GEMINI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY`
  - `OPENAI_API_KEY`
  - `ANTHROPIC_API_KEY`

## API response shape

Successful generation returns:

```json
{
  "success": true,
  "storyId": "uuid",
  "title": "Starlight Children",
  "content": "Generated story text...",
  "provider": "gemini",
  "model": "gemini-1.5-pro",
  "wordCount": 1000,
  "estimatedReadingMinutes": 5,
  "saved": true,
  "fallbackUsed": false,
  "warnings": []
}
```

Safe failures return:

```json
{
  "success": false,
  "code": "ai_provider_missing",
  "message": "AI story generation is not configured yet. Please contact support.",
  "diagnostics": {
    "providerConfigured": { "gemini": false, "openai": false, "anthropic": false },
    "blockers": ["No Gemini, OpenAI, or Anthropic API key is configured on FastAPI."]
  }
}
```

## Starlight Children manual test

Use the Rocket AI Stories page and select **Starlight Children**. Submit the default prompt with `Medium (~1000 words)` and tone `Whimsical, warm, hopeful`. Expected result: a visible generated story, provider/model metadata in the response, and `saved: true` after Supabase persistence.

## Readiness checks

- NestJS: `GET https://dbaronx-api-unified-qo2j.onrender.com/api/v1/ai-stories/readiness`
- FastAPI: `GET https://dbaronx-fastapi-5ci9.onrender.com/ai/stories/readiness`

## Smoke commands

```bash
node scripts/e2e-ai-stories-production-smoke.mjs
python scripts/e2e-fastapi-ai-stories-smoke.py
```

## Deployment order

1. Apply Supabase migration `202605150001_ai_stories_generation_contract_alignment.sql`.
2. Deploy FastAPI.
3. Deploy NestJS API.
4. Deploy Rocket web.
5. Run readiness endpoints and the Starlight Children manual test.

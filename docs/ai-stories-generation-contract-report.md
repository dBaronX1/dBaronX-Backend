# AI Stories Generation Contract Report

## Canonical customer-facing path

Rocket-local `POST /api/ai-stories` is the canonical customer-facing generation endpoint for the immediate fix. Rocket UI already targets this endpoint, it can run server-side with AI provider keys kept secret, and it avoids exposing NestJS `InternalAuthGuard` tokens to the browser.

Rocket browser code must not call Nest internal AI-story endpoints directly and must never receive `INTERNAL_SERVICE_TOKEN`, Supabase service-role keys, or AI provider API keys.

## Required Rocket API contract

`src/app/api/ai-stories/route.ts` should accept this request body:

- `prompt` required
- `title` optional
- `genre` optional
- `length` optional
- `tone` optional
- `language` optional
- `isSeries` optional
- `is_series` optional

The route must normalize `isSeries` and `is_series`, validate `prompt`, derive the authenticated user from Supabase server-side session/cookies, and avoid trusting arbitrary `user_id` from the request body. Guest generation may return non-persistent generated content, but it must not write invalid placeholder values such as `anonymous` into a UUID `user_id` column.

Successful responses should use this normalized shape:

```json
{
  "success": true,
  "provider": "anthropic|openai|gemini|configured-provider",
  "content": "generated story text",
  "story": {
    "id": "uuid",
    "title": "title",
    "content": "generated story text",
    "genre": "genre",
    "status": "ready|draft",
    "created_at": "timestamp"
  },
  "saved": true
}
```

When persistence is unavailable or unauthenticated guest persistence is unsupported, `story` should be `null` and `saved` should be `false` if generation itself safely succeeds. Public error responses must be customer-safe and must not include raw Supabase or provider `error.message` content.

## Required Rocket page behavior

The Rocket pages at `/ai-stories`, `/ai-stories/create`, and `/ai-story-generator` should all submit the same normalized body shape to `POST /api/ai-stories`. They should read generated story text from `data.content`, read saved metadata from `data.story`, and never render an object-valued `data.story` as React text.

The `/ai-story-generator` page must not send `user_id: "anonymous"`. Authenticated pages should rely on server/session identity. If a manual save path remains, it should be disabled unless the generation response has `saved === false`, so the UI does not double-save stories already persisted by the API route.

## Supabase schema and auth behavior

The ecosystem Supabase migration history uses `app_public.ai_stories` as the application table. Existing FastAPI story persistence code writes `ai_stories`, `ai_story_generation_jobs`, and `ai_story_moderation_logs` through Supabase REST. The REST client path is unqualified (`/rest/v1/{table}`), so production must expose/configure the intended schema consistently, or the persistence boundary must explicitly select `app_public` where supported.

The alignment migration adds missing columns required by the inspected story persistence code and adds the missing `app_public.ai_story_generation_jobs` and `app_public.ai_story_moderation_logs` tables. These additions are idempotent and additive.

Rocket diagnostics for the fixed route should include:

- `aiStoriesTableReachable`
- `schemaNameUsed`
- `serviceRoleConfigured`
- `authUserDetected`
- `saved`

These diagnostics should be server/operator diagnostics, not raw customer-facing errors.

## FastAPI route findings

The inspected FastAPI generation route is declared as `APIRouter(prefix="/ai-stories")` with `POST /generate`. The central FastAPI router mounts that module with an additional prefix of `/stories`. Because the app includes the central router without another `/api/v1` prefix in `app_factory.py`, the actual mounted generation path is:

`POST /stories/ai-stories/generate`

The route manifest also records the same `/stories` mount prefix. This is a route-shape mismatch, not a Rocket dependency for the immediate fix. A later safe cleanup should choose one canonical FastAPI route family, for example `POST /ai-stories/generate` or `POST /stories/generate`, then maintain a compatibility alias for existing clients before removing the double-prefixed shape.

## Required environment variables

Rocket generation requires exactly one configured AI provider path, depending on provider selection:

- `ANTHROPIC_API_KEY` for Anthropic generation
- `OPENAI_API_KEY` for OpenAI generation
- `GEMINI_API_KEY` or the existing Rocket Gemini variable name for Gemini generation

Rocket persistence requires:

- `NEXT_PUBLIC_SUPABASE_URL` or server-side Supabase URL variable used by Rocket
- Supabase anon/public key only for auth/session reads where appropriate
- `SUPABASE_SERVICE_ROLE_KEY` for privileged server-side persistence writes

Never expose `SUPABASE_SERVICE_ROLE_KEY`, `INTERNAL_SERVICE_TOKEN`, or AI provider API keys to browser code. If service-role configuration is missing, Rocket should return a structured persistence blocker while allowing non-persistent generation only when generation can safely complete without pretending the story was saved.

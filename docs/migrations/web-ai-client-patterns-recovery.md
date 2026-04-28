# Web AI Client Patterns Recovery (Migration Task 3)

## Scope
- Target: `apps/web`
- Goal: recover safe legacy-style client fallback patterns without importing `.dbx-source` at runtime and without moving provider keys into browser code.

## Source inspection status
Requested legacy source snapshot paths were not present in this repository checkout:
- `unify/local-cross-repo-reconciliation-source`
- `.dbx-source/dbaronx-frontend/src/lib/ai/chatCompletion.ts`
- `.dbx-source/dbaronx-frontend/src/lib/ai/aiClient.ts`
- `.dbx-source/dbaronx-frontend/src/lib/hooks/useChat.ts`

Because those files were unavailable locally, migration was performed by applying the same class of fallback behavior to the existing web API client abstraction.

## Existing `apps/web` AI surface observed
- AI stories frontend data access is through backend API calls (`internalApiRequest`) via:
  - `apps/web/src/lib/ai-stories/ai-stories-api.ts`
  - `apps/web/src/lib/platform/platform-api.ts` (`getAiStoriesAdminDashboard`)
- No browser-side direct provider SDK calls or AI provider key usage were found in `apps/web`.

## Migration decisions
1. **Keep provider interactions server-side**
   - No direct OpenAI/Anthropic/etc browser client added.
   - No AI provider key envs introduced to public runtime.

2. **Port legacy-like fallback behavior into the shared client layer**
   - Extended `internalApiRequest` to support ordered base URL fallback candidates and retry across candidates for network errors and upstream `5xx` responses.
   - Added explicit options to tune behavior:
     - `baseUrls?: string[]`
     - `allowBaseUrlFallback?: boolean`

3. **Expand safe base URL resolution for compatibility**
   - Candidate resolution now supports multiple existing env keys and de-duplicates them:
     - `NEXT_PUBLIC_API_BASE_URL`
     - `NEXT_PUBLIC_NESTJS_BASE_URL`
     - `NEXT_PUBLIC_API_URL`
     - `NEXT_PUBLIC_NEST_API_URL`
     - `NEST_API_URL` (server-only path)

## Why this maps to legacy patterns safely
Legacy AI client stacks commonly used provider/client fallback to preserve UX continuity during upstream failures. In `apps/web`, AI content is already backend-driven, so the equivalent safe recovery is to harden backend endpoint selection and request retries in the web client abstraction, while keeping provider orchestration on the server.

## Validation commands
- `pnpm --filter dbaronx-web typecheck`
- `pnpm --filter dbaronx-web build`

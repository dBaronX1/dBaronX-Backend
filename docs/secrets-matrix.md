# dBaronX Secrets Matrix

`R` = required, `O` = optional, `P` = platform-injected.

| Variable | web | api | services-fastapi | medusa | telegram-bot | Notes |
|---|---:|---:|---:|---:|---:|---|
| NODE_ENV | O | R | O | O | O | Runtime mode |
| APP_ENV / ENVIRONMENT | O | O | R | O | O | App environment naming differs by app |
| INTERNAL_SERVICE_TOKEN | O | R | R | O | R | Must match across internal callers |
| SUPABASE_URL | O | R | R | O | O | Shared data backend |
| SUPABASE_SERVICE_ROLE_KEY | O | R | R | O | O | Server-only secret |
| FASTAPI_BASE_URL | O | R | O | O | R | API + bot dependency |
| MEDUSA_BASE_URL | O | R | O | O | O | API commerce adapter |
| MEDUSA_ADMIN_API_KEY | O | O | O | O | O | Needed for privileged Medusa actions |
| DATABASE_URL | O | O | O | R | O | Medusa primary DB |
| REDIS_URL | O | O | O | O | O | Optional caching/event bus |
| JWT_SECRET | O | O | R | O | O | FastAPI auth/signature guard |
| TELEGRAM_BOT_TOKEN | O | O | O | O | R | Telegram control surface token |
| OPENAI_API_KEY | O | O | O | O | O | FastAPI optional provider |
| ANTHROPIC_API_KEY | O | O | O | O | O | FastAPI optional provider |
| GEMINI_API_KEY | O | O | O | O | O | FastAPI optional provider |
| STRIPE_SECRET_KEY | O | O | O | O | O | API optional payments integration |
| RENDER_* | O | O | P | O | O | Injected by Render runtime |

## Rotation policy (recommended)

1. Rotate platform/provider keys quarterly.
2. Rotate `INTERNAL_SERVICE_TOKEN` in coordinated deployment across API, FastAPI, Telegram.
3. Rotate Supabase service role key with maintenance window and immediate redeploy.
4. Never expose server secrets in `NEXT_PUBLIC_*` variables.

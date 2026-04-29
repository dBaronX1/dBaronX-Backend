# Staging Deployment Smoke Plan

## Objective
Validate that all dBaronX services boot successfully in staging and expose expected health responses **without changing business logic**.

## Deployment order
1. **`apps/medusa`** (commerce backend dependency)
2. **`apps/api`** (NestJS economic brain; depends on Medusa/FastAPI URLs)
3. **`apps/services-fastapi`** (intelligence/risk/AI service)
4. **`apps/web`** (Next.js frontend; depends on API URL)
5. **`apps/telegram-bot`** (control surface; depends on API/FastAPI URLs)

## Build/start commands by service

### `apps/web`
- Build: `pnpm --filter dbaronx-web build`
- Start: `pnpm --filter dbaronx-web start`

### `apps/api`
- Build: `pnpm --filter dbaronx-api build`
- Start: `pnpm --filter dbaronx-api start`

### `apps/services-fastapi`
- Build/install: `pip install -e .`
- Start: `PYTHONPATH=src python -m uvicorn src.main:app --host 0.0.0.0 --port $PORT`

### `apps/telegram-bot`
- Build/install: `pip install -r requirements.txt`
- Start: `python -m src.main`

### `apps/medusa`
- Build: `pnpm --filter @dbaronx/medusa build`
- Start: `pnpm --filter @dbaronx/medusa start`

## Required environment variables (minimum)

### API (`apps/api`)
- `NODE_ENV`
- `PORT`
- `APP_URL`
- `FRONTEND_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MEDUSA_BASE_URL`
- `FASTAPI_BASE_URL`
- `INTERNAL_SERVICE_TOKEN`

### FastAPI (`apps/services-fastapi`)
- `APP_ENV`
- `PORT`
- `FRONTEND_URL`
- `NESTJS_BASE_URL`
- `INTERNAL_SERVICE_TOKEN`
- `JWT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Medusa (`apps/medusa`)
- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `STORE_CORS`
- `ADMIN_CORS`
- `AUTH_CORS`
- `JWT_SECRET`
- `COOKIE_SECRET`

### Telegram bot (`apps/telegram-bot`)
- `ENVIRONMENT`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_ADMIN_IDS`
- `NESTJS_BASE_URL`
- `FASTAPI_BASE_URL`
- `INTERNAL_SERVICE_TOKEN`

### Web (`apps/web`)
- Vercel project/environment variables needed by the Next.js app (must be set in staging before promoting).

## Health endpoints and expected smoke responses

- API: `GET {API_BASE_URL}/health`
  - Expected: HTTP `200` with JSON payload indicating healthy status.
- FastAPI: `GET {FASTAPI_BASE_URL}/health`
  - Expected: HTTP `200` with JSON payload indicating healthy status.
- FastAPI readiness: `GET {FASTAPI_BASE_URL}/ready`
  - Expected: HTTP `200` with readiness payload.
- Medusa: `GET {MEDUSA_BASE_URL}/health`
  - Expected: HTTP `200` with healthy status payload.

Use `scripts/smoke-check-services.mjs` to run URL-based checks after deploy.

## Rollback instruction
1. Revert staging service(s) to last known-good deploy in hosting provider dashboard.
2. Repoint dependent service env vars (`*_BASE_URL`) back to last known-good URLs.
3. Re-run smoke checks to confirm all health endpoints return successful responses.
4. Halt production promotion until failing staging service is remediated.

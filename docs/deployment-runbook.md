# dBaronX Deployment Runbook (Unified Repo)

This runbook defines deployment responsibilities **without changing app business logic**.

## 1) Service ownership contract

- `apps/web`: customer-facing frontend (Next.js on Vercel)
- `apps/api`: NestJS economic brain (Render Web Service)
- `apps/services-fastapi`: intelligence/risk/AI (Render Web Service)
- `apps/medusa`: commerce-only backend (Render Web Service)
- `apps/telegram-bot`: operator/admin control surface (Render Background Worker)

## 2) Pre-deploy checklist

1. Validate env contracts:
   ```bash
   node scripts/check-env-contracts.mjs
   ```
2. Verify each app has a populated `.env` from its `.env.example`.
3. Confirm inter-service URLs are reachable:
   - API -> FastAPI
   - API -> Medusa
   - Telegram -> API + FastAPI
   - Web -> API
4. Confirm shared secret alignment:
   - `INTERNAL_SERVICE_TOKEN` must match across API/FastAPI/Telegram.

## 3) Deploy order

1. `apps/medusa` (commerce backend contract)
2. `apps/services-fastapi` (intelligence contract)
3. `apps/api` (orchestration/economic brain)
4. `apps/telegram-bot` (control surface worker)
5. `apps/web` (frontend)

Reason: frontend should be last to avoid routing users before backend contracts are live.

## 4) Platform targets

### Render
Use `infra/render/render.yaml` as first-pass IaC draft for:
- `dbaronx-api`
- `dbaronx-fastapi`
- `dbaronx-medusa`
- `dbaronx-telegram-bot`

### Vercel
Use `infra/vercel/vercel.json` for `apps/web` build/runtime settings.

### Fly (archived)
Legacy Fly config is retained as reference only at `infra/fly/medusa.fly.toml`.

## 5) Runtime smoke checks

- API: `GET /health`
- FastAPI: `GET /health` and `GET /ready`
- Medusa: `GET /health`
- Telegram bot: process starts, webhook/auth checks pass
- Web: load homepage and one API-backed page

## 6) Rollback guidance

- Vercel: redeploy previous successful web build.
- Render: rollback to previous deployment per service.
- If inter-service token mismatch occurs, revert all related services to previous shared secret set.

## 7) Known contract invariants

- `apps/web` remains frontend only.
- `apps/api` remains NestJS economic brain.
- `apps/services-fastapi` remains intelligence/risk/AI.
- `apps/medusa` remains commerce-only.
- `apps/telegram-bot` remains control surface.

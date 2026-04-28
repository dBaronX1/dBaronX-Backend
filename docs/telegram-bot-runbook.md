# Telegram Bot Runbook

## Scope
This runbook covers `apps/telegram-bot` as the Telegram control/distribution surface. The bot must remain webhook-based and delegate business logic to NestJS/FastAPI.

## Runtime model
- Entrypoint: `apps/telegram-bot/src/main.py`.
- Health endpoint: `GET /health`.
- Readiness endpoint: `GET /ready` (returns 503 until Telegram runtime is initialized).
- Webhook endpoint: `POST /webhook/telegram`.
- Webhook security: optional header check via `x-telegram-bot-api-secret-token`.

## Start commands
From repository root:

```bash
python -m compileall apps/telegram-bot/src
python -m src.main
```

Or from `apps/telegram-bot/package.json` scripts:

```bash
npm --prefix apps/telegram-bot run build
npm --prefix apps/telegram-bot run start
```

## Required environment variables
- `TELEGRAM_BOT_TOKEN`
- `NESTJS_BASE_URL`
- `FASTAPI_BASE_URL`
- `INTERNAL_SERVICE_TOKEN`

## Recommended environment variables
- `TELEGRAM_WEBHOOK_SECRET`
- `ENABLE_WEBHOOK_SIGNATURE_CHECK=true` in production
- `TELEGRAM_ADMIN_IDS`
- `REQUEST_TIMEOUT_SECONDS`
- `MAX_WEBHOOK_BODY_BYTES`

## Operational checks
1. Compile check:
   ```bash
   python -m compileall apps/telegram-bot/src
   ```
2. Import check (no server bind):
   ```bash
   PYTHONPATH=apps/telegram-bot/src python -c "import main"
   ```
3. Health/readiness probe:
   - `GET /health` should return metadata and `telegramRuntimeStarted`.
   - `GET /ready` should return `200` only after startup succeeds.
4. Webhook probe:
   - Send a Telegram update payload to `POST /webhook/telegram`.
   - If signature check is enabled, include correct `x-telegram-bot-api-secret-token`.

## Hardening notes
- Bot does **not** own business logic; handlers call NestJS/FastAPI via internal clients.
- Internal API calls must send `x-internal-token` and caller metadata headers.
- Keep all secrets in environment variables only.
- Reject oversized webhook payloads and malformed JSON payloads.

## Common blockers
- Missing `TELEGRAM_BOT_TOKEN` prevents startup.
- Invalid backend URLs or `INTERNAL_SERVICE_TOKEN` break command handlers that proxy to APIs.
- Misconfigured webhook secret causes `401 invalid webhook secret`.

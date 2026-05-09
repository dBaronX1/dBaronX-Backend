# dBaronX Telegram Bot Control Surface

The Telegram bot is the mobile-first control, alerting, admin command, and operational diagnostics surface for dBaronX. It does **not** duplicate economic/business logic:

- NestJS API remains the payment, wallet, supplier, payout, commerce, and economic-event brain.
- FastAPI remains the intelligence/risk/AI verification surface.
- Medusa remains the commerce engine.
- Supabase remains persistence through approved backend services.
- Telegram never stores or displays secrets.

## Runtime architecture

The bot preserves the existing FastAPI + `python-telegram-bot` webhook architecture:

- HTTP service: `apps/telegram-bot/src/main.py`
- Telegram webhook endpoints: `POST /webhook/telegram` and compatibility `POST /webhook`
- Health endpoints: `GET /health` and `GET /ready`
- Handler registration: `apps/telegram-bot/src/app/router.py`
- Central command registry: `apps/telegram-bot/src/services/command_registry.py`
- Resilient backend HTTP client: `apps/telegram-bot/src/shared/http/http_client.py`

The container binds to `0.0.0.0` and reads `PORT` from the runtime environment.

## Required environment variables

Set these in Render/Fly or the active deployment platform. Values below are names only; never commit real values.

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_ALLOWED_ADMIN_IDS=
TELEGRAM_ADMIN_ROLES=
TELEGRAM_BOT_PUBLIC_BASE_URL=
BOT_PUBLIC_BASE_URL=
API_BASE_URL=
FASTAPI_BASE_URL=
MEDUSA_BASE_URL=
INTERNAL_SERVICE_TOKEN=
BOT_ENV=production
```

Recommended production URLs:

- `API_BASE_URL=https://dbaronx-api-unified.onrender.com`
- `MEDUSA_BASE_URL=https://dbaronx-medusa.onrender.com`
- `FASTAPI_BASE_URL=<current FastAPI URL>`

`TELEGRAM_ADMIN_ROLES` is optional and accepts comma-separated `telegramUserId:ROLE` entries, where role is one of `OWNER`, `ADMIN`, `OPS`, or `VIEWER`. If omitted, every ID in `TELEGRAM_ALLOWED_ADMIN_IDS` is treated as `OWNER`.

## Webhook setup

1. Deploy the bot with the env vars above.
2. Confirm `GET /health` reports no startup blockers.
3. Confirm `GET /ready` is green after the Telegram runtime starts.
4. Register the Telegram webhook to `https://<bot-public-host>/webhook/telegram`.
5. Use `TELEGRAM_WEBHOOK_SECRET` as Telegram's `secret_token` so Telegram sends `x-telegram-bot-api-secret-token`.
6. Keep `ENABLE_WEBHOOK_SIGNATURE_CHECK=true` in production.

### Safe helper scripts

Use the repository helper when possible so the bot token is never printed:

```bash
export TELEGRAM_BOT_TOKEN
export TELEGRAM_WEBHOOK_SECRET
BOT_PUBLIC_BASE_URL=https://<bot-public-host> node scripts/telegram-set-webhook.mjs
node scripts/telegram-webhook-info.mjs
```

`BOT_PUBLIC_BASE_URL` may be replaced with `TELEGRAM_BOT_PUBLIC_BASE_URL`. The helper sends Telegram the webhook URL `https://<bot-public-host>/webhook/telegram` and the `secret_token` value, but it prints only `https://api.telegram.org/bot<redacted>/...` for Telegram API calls.

### Raw Telegram API commands

If a manual setup is required, use these exact URL formats. Do not paste the bot token into logs, tickets, screenshots, or committed files.

Set the webhook:

```bash
curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://<bot-public-host>/webhook/telegram","secret_token":"'"${TELEGRAM_WEBHOOK_SECRET}"'","allowed_updates":["message","callback_query"],"drop_pending_updates":false}'
```

Delete the webhook:

```bash
curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook" \
  -H "Content-Type: application/json" \
  -d '{"drop_pending_updates":false}'
```

Inspect webhook info:

```bash
curl -sS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

`TELEGRAM_WEBHOOK_SECRET` must be a high-entropy value stored only in the runtime secret store. Telegram stores it during `setWebhook` and includes the same value in the `x-telegram-bot-api-secret-token` header on webhook deliveries. The bot rejects webhook requests when `ENABLE_WEBHOOK_SIGNATURE_CHECK=true` and the header does not match.

## Admin authorization

Only Telegram user IDs listed in `TELEGRAM_ALLOWED_ADMIN_IDS` are allowed. Unauthorized users receive a safe denial message. The bot logs only audit-safe data: command name, hashed Telegram user ID, timestamp, and result.

To get a numeric Telegram user ID safely:

1. In Telegram, send a message to `@userinfobot`, `@RawDataBot`, or another trusted ID utility bot and copy only the numeric `id` field.
2. Alternatively, temporarily inspect a sanitized Telegram update in a private development environment and copy `message.from.id`. Do not log message text, bot tokens, webhook secrets, or production customer data.
3. Store the IDs as a comma-separated runtime secret, for example `TELEGRAM_ALLOWED_ADMIN_IDS=123456789,987654321`.
4. Optionally set explicit roles with `TELEGRAM_ADMIN_ROLES=123456789:OWNER,987654321:OPS`. IDs without an explicit role default to `OWNER`.
5. Redeploy the bot and run `node scripts/e2e-telegram-bot-live-readiness-smoke.mjs` with `BOT_BASE_URL`, backend base URLs, and boolean-checkable secrets in the environment.

The bot never echoes:

- Telegram bot tokens
- webhook secrets
- internal service tokens
- Supabase service role keys
- Stripe keys/webhook secrets
- CJ/AliExpress credentials
- signed URLs or credential-bearing headers

## Command list

### System/readiness

- `/start`
- `/help`
- `/status`
- `/health`
- `/runtime`
- `/launch`
- `/routes`
- `/env_check`

### Commerce

- `/commerce_status`
- `/medusa_status`
- `/shipping_status`
- `/catalog_status`
- `/orders_status`

### Payments

- `/payments_status`
- `/stripe_status`
- `/stripe_storage`
- `/stripe_settlement <cs_test_or_cs_live_session_id>`
- `/dbx_status`
- `/dbx_payment <reference>`
- `/economic_status`

### Suppliers

- `/suppliers_status`
- `/cj_status`
- `/cj_import_ready <supplierProductId> <supplierSku>`
- `/aliexpress_status`

### Watch, ads, affiliate, payouts, wallet

- `/ads_status`
- `/watch_status`
- `/affiliate_status`
- `/payouts_status`
- `/wallet_status`

### AI Stories

- `/ai_status`
- `/ai_stories_status`
- `/story_campaigns_status`

### Planned/partial modules

- `/dreams_status`
- `/rewards_status`
- `/subscriptions_status`
- `/airdrop_status`
- `/giftcards_status`
- `/ebooks_status`
- `/idcard_status`

### Debug

- `/debug_status` returns raw normalized JSON and is admin-only.

## Backend endpoints called

The bot calls backend readiness/orchestration endpoints rather than duplicating logic:

- NestJS API:
  - `GET /api/health`
  - `GET /api/system/runtime-status`
  - `GET /api/system/runtime-contract`
  - `GET /api/system/deployment-readiness`
  - `GET /api/system/controller-registry`
  - `GET /api/payments/readiness`
  - `GET /api/payments/economic-readiness`
  - `GET /api/checkout/stripe/readiness`
  - `GET /api/checkout/stripe/settlement-storage-readiness`
  - `GET /api/checkout/stripe/settlement-status?sessionId=...`
  - `GET /api/dbx-payments/:reference`
  - `GET /api/suppliers/readiness`
  - `GET /api/suppliers/cj/preflight`
  - `POST /api/suppliers/cj/import-readiness`
  - module dashboards/status endpoints when present
- FastAPI:
  - `GET /health`
- Medusa:
  - `GET /health`

If a module does not yet expose a safe status endpoint, the bot returns `endpoint_not_available_yet` or `planned_or_partial` with the next backend endpoint needed. It does not invent success.

## Payment safety rules

Telegram must never mark paid, completed, rewarded, fulfilled, or settled. It may only display backend-returned readiness and proof.

### Stripe settlement rules

- Telegram never bypasses signed Stripe webhook verification.
- `/stripe_storage` uses the internal token and reports settlement table readiness.
- `/stripe_settlement` checks backend settlement proof by checkout session ID.
- If storage tables are missing, next action is: apply Supabase migration, restart API, replay `checkout.session.completed`.
- The bot does not claim a payment is settled unless the backend returns verified settlement proof.

### DBX verification rules

- DBX payment verification remains backend-only.
- Telegram never fakes DBX verification.
- `/dbx_payment <reference>` displays backend proof and status only.
- If DBX token mint is missing, configure `DBX_TOKEN_MINT` server-side and restart the API.

## Supplier rules

- No automatic massive imports from Telegram.
- `/cj_import_ready` requires explicit `supplierProductId` and `supplierSku`.
- Telegram only calls backend import readiness; it does not import real products in this phase.
- No AliExpress scraping from Telegram.

## Unsafe actions intentionally blocked

These actions are intentionally not available from Telegram in this phase:

- approve payouts
- settle payouts
- credit wallets
- settle payments
- mark orders fulfilled
- mark payments paid/completed
- import real supplier products directly
- bypass Stripe webhook verification

Existing legacy payout write commands now return a blocked-action message rather than calling write endpoints.

## Deployment commands

```bash
pnpm --filter dbaronx-api build
pnpm --filter dbaronx-web build
pnpm --filter @dbaronx/medusa build
pnpm --filter @dbaronx/medusa typecheck
python -m compileall apps/services-fastapi/src apps/telegram-bot/src || true
node --check scripts/e2e-telegram-bot-command-contract-smoke.mjs
node scripts/e2e-telegram-bot-command-contract-smoke.mjs
node --check scripts/e2e-telegram-bot-live-readiness-smoke.mjs
BOT_BASE_URL=https://<bot-public-host> API_BASE_URL=https://<api-host> MEDUSA_BASE_URL=https://<medusa-host> node scripts/e2e-telegram-bot-live-readiness-smoke.mjs
node --check scripts/telegram-set-webhook.mjs
node --check scripts/telegram-webhook-info.mjs
```

## Remaining gaps before full admin operations

- Add backend read-only status endpoints for planned/partial modules before exposing richer Telegram diagnostics.
- Add backend-approved preview endpoints for any future operational write before Telegram can call it.
- Keep payout approval, settlement, wallet crediting, fulfillment, and supplier import workflows outside Telegram until backend proof/audit policies are complete.

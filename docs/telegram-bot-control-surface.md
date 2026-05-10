# Telegram bot control surface and customer transaction path

## Live deployment port contract

Canonical Telegram bot port is **8080**.

- Fly `apps/telegram-bot/fly.toml` sets `[env] PORT = "8080"`.
- Fly `apps/telegram-bot/fly.toml` sets `[http_service].internal_port = 8080`.
- Docker exposes `8080` and starts Uvicorn with `--host 0.0.0.0 --port ${PORT:-8080}`.
- FastAPI health check path is `GET /health`.
- Readiness remains available at `GET /ready`.
- Telegram webhook path is `POST /webhook/telegram`; compatibility path `POST /webhook` remains available.

Expected public webhook URL:

```text
https://<bot-host>/webhook/telegram
```

Fly deploy command:

```bash
fly deploy --config apps/telegram-bot/fly.toml --app dbaronx-telegram-bot
```

Webhook set command after deploy and token rotation:

```bash
TELEGRAM_BOT_PUBLIC_BASE_URL=https://<bot-host> \
TELEGRAM_WEBHOOK_URL=https://<bot-host>/webhook/telegram \
node scripts/telegram-set-webhook.mjs
```

If a Telegram token appeared in logs, rotate it immediately in BotFather, replace only the runtime secret value, redeploy the bot, and re-register the webhook. Never paste token values into logs, docs, shell history, screenshots, issue comments, or smoke output.

## Deployment order after every fix

1. NestJS API
2. Medusa
3. Telegram bot
4. Web frontend
5. FastAPI only if changed

## Role split

The bot is not admin-only. Public customer commands are available to non-admin Telegram users. Admin/ops commands remain protected by `TELEGRAM_ALLOWED_ADMIN_IDS`, optional `TELEGRAM_ADMIN_USERNAMES`, optional `TELEGRAM_ADMIN_CHAT_IDS`, and optional `TELEGRAM_ADMIN_ROLES`.

### Public customer commands

- `/start`
- `/help`
- `/shop`
- `/products`
- `/product <handle_or_id>`
- `/cart_help`
- `/checkout_help`
- `/order_status <order_or_email_or_reference>`
- `/payment_status <checkout_session_or_order_ref>`
- `/support`
- `/contact_support`

Customer commands are read-only and public-safe. They may read public storefront/API status, return product/storefront links, and explain checkout/support steps. They must not expose admin readiness, internal tokens, route manifests, startup blockers, secret flags, payout queues, supplier admin data, or backend internals.

If a public product/status endpoint is missing, the bot returns a useful storefront/support fallback and a blocker such as `endpoint_not_available_yet`; it does not invent a successful product, payment, or fulfillment state.

### Protected admin/ops commands preserved

- `/status`
- `/payments_status`
- `/stripe_storage`
- `/stripe_first_tx_status`
- `/stripe_settlement`
- `/medusa_status`
- `/commerce_status`
- `/suppliers_status`
- `/dbx_status`
- `/watch_status`
- `/affiliate_status`
- `/ai_stories_status`

Additional protected diagnostics remain available for authorized operators, including `/commands`, `/health`, `/runtime`, `/launch`, `/routes`, `/env_check`, supplier readiness commands, wallet/payout read-only status commands, and AI/system readiness commands.

## 48-hour first real customer transaction path

Operational goal: produce one real customer/user transaction with proof, not broad ecosystem expansion.

Required path:

1. Publish/import one approved real supplier product through the backend/admin workflow, not Telegram.
2. Confirm Medusa/storefront can list the product through `/products` or the storefront product page.
3. Open the product page/customer bot product link.
4. Create Stripe Checkout only through the verified storefront/API checkout path.
5. Complete Stripe payment in the intended mode.
6. Verify signed Stripe webhook proof for `checkout.session.completed`.
7. Verify payment/order record proof in the backend.
8. Verify Telegram customer visibility with `/payment_status <checkout_session_or_order_ref>` and `/order_status <order_or_email_or_reference>`.
9. Verify Telegram admin visibility with `/stripe_settlement <checkout_session_id>`, `/payments_status`, and `/commerce_status`.

Safety rules:

- `/payment_status` must never claim paid unless backend proof explicitly says paid.
- `/order_status` must never claim fulfilled unless backend proof explicitly says fulfilled.
- Telegram does not open a live money override, mark payments paid, mark orders fulfilled, credit wallets/rewards, approve payouts, settle payouts, or import supplier products.

## Unsafe actions intentionally blocked

Telegram must not provide these actions:

- payout approval
- payout settlement
- wallet crediting
- reward crediting
- order fulfillment
- fake paid state
- fake fulfilled state
- supplier import mutation
- live money override

Legacy payout write commands return a blocked-action message instead of calling write endpoints.

## Validation and smoke commands

Local/static checks:

```bash
node --check scripts/e2e-telegram-bot-live-readiness-smoke.mjs
node --check scripts/e2e-telegram-customer-bot-contract-smoke.mjs
node scripts/e2e-telegram-customer-bot-contract-smoke.mjs
```

Live readiness smoke:

```bash
BOT_BASE_URL=https://<bot-host> \
API_BASE_URL=https://<api-host> \
MEDUSA_BASE_URL=https://<medusa-host> \
node scripts/e2e-telegram-bot-live-readiness-smoke.mjs
```

The live readiness smoke accepts `API_BASE_URL` or `API_URL`, `MEDUSA_BASE_URL` or `MEDUSA_URL`, and `BOT_BASE_URL`, `BOT_PUBLIC_BASE_URL`, or `TELEGRAM_BOT_PUBLIC_BASE_URL`. It prints attempted API, bot, FastAPI, and Medusa paths with HTTP statuses. It does not require `TELEGRAM_BOT_TOKEN` in the local shell when deployed `/ready` confirms the Telegram runtime is configured server-side. It redacts known token/key shapes and configured secret values.

First transaction combined smoke:

```bash
BOT_BASE_URL=https://<bot-host> \
API_BASE_URL=https://<api-host> \
MEDUSA_BASE_URL=https://<medusa-host> \
MEDUSA_PUBLISHABLE_KEY= \
INTERNAL_SERVICE_TOKEN= \
node scripts/e2e-first-transaction-with-telegram-ops-smoke.mjs
```

Do not print the actual publishable/internal secret values in logs or tickets.

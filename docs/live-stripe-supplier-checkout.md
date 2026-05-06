# Live Stripe + Supplier Checkout (dbaronx.com)

## DNS map
- web: https://dbaronx.com
- api: https://api.dbaronx.com
- commerce (Medusa): https://commerce.dbaronx.com
- fastapi: https://fastapi.dbaronx.com

## Env vars
- NEXT_PUBLIC_API_BASE_URL=https://api.dbaronx.com
- NESTJS_API_URL=https://api.dbaronx.com
- NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://commerce.dbaronx.com
- NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
- NEXT_PUBLIC_FASTAPI_BASE_URL=https://fastapi.dbaronx.com
- INTERNAL_SERVICE_TOKEN (server-only)
- STRIPE_PUBLIC_KEY (browser-safe)
- STRIPE_SECRET_KEY (server-only)
- STRIPE_WEBHOOK_SECRET (server-only)
- CJ_ACCESS_KEY/CJ_SECRET (backend-only)
- ALIEXPRESS_APP_KEY/ALIEXPRESS_APP_SECRET (backend-only if approved)

## One-time Render/Fly setup
1. Run `pnpm --filter @dbaronx/medusa commerce:ensure`.
2. Run `pnpm --filter @dbaronx/medusa channel:stock:ensure` once (fixes sales-channel stock location blocker).
3. Re-run smoke script and verify line-item/shipping path.

## Stripe setup
1. Configure Stripe keys/webhook secret in API.
2. Point webhook to `POST /v1/checkout/stripe/webhook`.
3. Never mark paid from browser redirects; rely on verified webhook only.
4. `POST /v1/checkout/stripe/session` is currently a test-readiness preflight path (reachability + config checks), not a fake payment completion path.

## CJ setup
1. Add CJ credentials in API secrets.
2. Keep `SUPPLIER_LIVE_MODE=false` for dry runs.
3. Validate product import mapping (cost -> margin -> retail) before live orders.

## AliExpress limitations
- Interface-only foundation currently.
- Manual fulfillment fallback required unless official API credentials/approval exist.
- No scraping or fake automation claims.

## First controlled purchase checklist
- Medusa product/variant/cart path green.
- Stripe session endpoint is reachable in test mode from web -> API.
- Webhook route verifies Stripe signatures and does not auto-mark paid by redirect.
- Supplier adapter dry-run emits expected metadata.
- Telegram receives checkout created/completed alerts in test mode.

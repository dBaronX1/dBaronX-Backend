# DBX Token Checkout Runtime Contract

## Live unified payment rail smoke

Run the DBX compatibility smoke through the unified rail smoke:

```bash
MEDUSA_URL=https://dbaronx-medusa.onrender.com \
API_URL=https://dbaronx-api-unified.onrender.com \
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<publishable-key> \
API_BEARER_TOKEN=<authorized-smoke-jwt-if-needed> \
node scripts/e2e-unified-payment-rail-smoke.mjs
```

Compatibility entrypoint:

```bash
MEDUSA_URL=https://dbaronx-medusa.onrender.com \
API_URL=https://dbaronx-api-unified.onrender.com \
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<publishable-key> \
API_BEARER_TOKEN=<authorized-smoke-jwt-if-needed> \
node scripts/e2e-dbx-token-checkout-readiness-smoke.mjs
```

## Public env for smoke/runtime discovery

- `API_URL` / `NESTJS_API_URL`: NestJS API base URL.
- `MEDUSA_URL` / `MEDUSA_BACKEND_URL`: Medusa store API base URL.
- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` / `MEDUSA_PUBLISHABLE_KEY`: publishable Medusa key.
- `WEB_BASE_URL` / `NEXT_PUBLIC_WEB_BASE_URL`: redirect URL base used in smoke payloads.

## Server-only env required for DBX live mode

Do not expose or commit real values.

```dotenv
DBX_PAYMENT_ADDRESS=
DBX_TOKEN_MINT=
SOLANA_RPC_URL=
DBX_SOLANA_RPC_URL=
FASTAPI_BASE_URL=
INTERNAL_SERVICE_TOKEN=
MEDUSA_BASE_URL=
MEDUSA_ADMIN_API_KEY=
JWT_SECRET=
```

Supported compatibility aliases:

- `DBX_TREASURY_WALLET` or `DBX_TREASURY_ADDRESS` may provide the DBX payment address.
- `DBX_MINT_ADDRESS` may provide the DBX token mint.
- `MEDUSA_BACKEND_URL` may provide the Medusa base URL.
- `MEDUSA_ADMIN_TOKEN` may provide the Medusa admin token.

## Readiness endpoint behavior

`GET /api/payments/readiness` is public because it returns only booleans, blocker codes, `safeMode`, and `timestamp`; it never returns secrets. Expected fields:

```json
{
  "stripeConfigured": true,
  "stripeWebhookConfigured": true,
  "dbxPaymentAddressPresent": true,
  "solanaRpcConfigured": true,
  "dbxTokenMintPresent": true,
  "fastapiVerifierConfigured": true,
  "orderSyncConfigured": true,
  "blockers": [],
  "safeMode": false,
  "timestamp": "2026-05-08T00:00:00.000Z"
}
```

## DBX route/auth contract

Protected DBX routes:

- `POST /api/dbx-payments/intents`
- `POST /api/dbx-payments/submit`
- `POST /api/dbx-payments/confirm`
- `POST /api/dbx-payments/:reference/retry-order-sync`
- `GET /api/dbx-payments/:reference`

The smoke sends `Authorization: Bearer <API_BEARER_TOKEN>` when configured. If a protected route returns 401/403 and no token was supplied, the smoke reports `authorized_smoke_jwt_missing` instead of making the route public.

## Runtime blocker behavior

- Missing `SOLANA_RPC_URL`/`DBX_SOLANA_RPC_URL` returns `solana_rpc_not_configured`.
- Missing `DBX_TOKEN_MINT`/`DBX_MINT_ADDRESS` returns `dbx_token_mint_missing`.
- Missing `DBX_PAYMENT_ADDRESS`/treasury alias returns `dbx_payment_address_missing`.
- Missing FastAPI verifier env returns `fastapi_verifier_not_configured`.
- Missing order-sync env returns `order_sync_not_configured` in readiness and leaves verified payments in a pending-order-sync state rather than faking settlement.

## Acceptable blockers and first controlled order gate

Acceptable before live mode only:

- `order_sync_not_configured` while settlement is intentionally disabled.
- `payment_confirmed_order_sync_pending` / verified-pending-order-sync states after a real verified transaction when Medusa sync needs operator retry.

Must be fixed before the first controlled payment order:

- `authorized_smoke_jwt_missing`
- `dbx_payment_address_missing`
- `solana_rpc_not_configured`
- `dbx_token_mint_missing`
- `fastapi_verifier_not_configured`
- Medusa cart, line-item, and shipping blockers

## No-fake-paid-state rule

Fake transaction submit/confirm attempts must never mark paid. DBX paid/completed state is allowed only after the server verifies the Solana transaction through the configured verifier and then performs idempotent order sync. Frontend redirects, copied signatures that do not verify, or local smoke placeholders are not proof of payment.

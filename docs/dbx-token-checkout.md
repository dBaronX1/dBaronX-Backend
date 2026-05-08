# DBX token checkout readiness

DBX token checkout is a server-verified payment rail. NestJS owns intent creation, transaction submission, confirmation, and order-sync orchestration. FastAPI supports fraud/risk/on-chain verification. Medusa remains the commerce/order engine only.

## Canonical routes

- `POST /api/dbx-payments/intents`
- `POST /api/dbx-payments/submit`
- `POST /api/dbx-payments/confirm`
- `POST /api/dbx-payments/:reference/retry-order-sync`
- `GET /api/dbx-payments/:reference`
- `GET /api/payments/readiness`

## Server-only env checklist

Configure these on the NestJS/API and verification services only. Do not commit or expose real values.

```dotenv
STRIPE_SECRET_KEY = <server-only Stripe test secret>
STRIPE_WEBHOOK_SECRET = <server-only Stripe webhook secret>
SOLANA_RPC_URL = <server-only Solana RPC>
DBX_SOLANA_RPC_URL = <optional fallback>
DBX_TOKEN_MINT = <DBX token mint>
FASTAPI_BASE_URL = <FastAPI service URL>
INTERNAL_SERVICE_TOKEN = <server-only internal token>
SUPABASE_SERVICE_ROLE_KEY = <server-only Supabase service role>
```

## Public env checklist

Only browser-safe public values belong in the web app:

```dotenv
NEXT_PUBLIC_DBX_SOLANA_PAYMENT_ADDRESS=<public receiver address>
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=<Stripe test public key>
NEXT_PUBLIC_MEDUSA_BACKEND_URL=<Medusa URL>
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<Medusa publishable key>
```

Never request, store, log, or transmit wallet private keys, seed phrases, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CJ_ACCESS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, or `INTERNAL_SERVICE_TOKEN` from frontend code.

## Unified smoke command

Run the unified payment rail smoke before the first controlled DBX payment order:

```bash
MEDUSA_URL=https://dbaronx-medusa.onrender.com \
API_URL=https://dbaronx-api-unified.onrender.com \
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<publishable-key> \
API_BEARER_TOKEN=<authorized-smoke-jwt-if-dbx-routes-require-auth> \
node scripts/e2e-unified-payment-rail-smoke.mjs
```

Compatibility command:

```bash
node scripts/e2e-dbx-token-checkout-readiness-smoke.mjs
```

## Expected safe blocked output

A blocked environment must be explicit and safe. It may report missing configuration, auth, RPC, or order-sync blockers, but it must not fake paid state:

```json
{
  "success": false,
  "blockers": [
    "solana_rpc_not_configured",
    "order_sync_not_configured"
  ],
  "dbxReady": true,
  "dbxIntentCreated": true,
  "dbxFakeTxRejected": true,
  "dbxPaymentMarkedPaid": false,
  "paymentMarkedPaid": false
}
```

If Solana RPC is not configured, confirmation must surface `solana_rpc_not_configured` or an equivalent verifier configuration blocker. If Solana RPC is configured, a fake transaction signature must still be rejected or held in a non-paid verification state.

## Expected green output

A green readiness run has this shape:

```json
{
  "success": true,
  "blockers": [],
  "apiReady": true,
  "medusaReady": true,
  "cartReady": true,
  "lineItemAdded": true,
  "shippingOptionReady": true,
  "dbxReady": true,
  "dbxIntentCreated": true,
  "dbxSubmitReady": true,
  "dbxFakeTxRejected": true,
  "dbxConfirmReady": true,
  "dbxPaymentMarkedPaid": false,
  "paymentMarkedPaid": false,
  "orderSyncReady": true
}
```

## DBX real transaction manual step

After green readiness:

1. Create a DBX payment intent for a real cart/order reference.
2. Send the exact expected DBX token amount to `NEXT_PUBLIC_DBX_SOLANA_PAYMENT_ADDRESS` using a wallet the customer controls.
3. Submit the real transaction signature to `POST /api/dbx-payments/submit`.
4. Confirm through `POST /api/dbx-payments/confirm`.
5. Verify the server-side Solana check confirms the token mint, receiver, amount, sender when required, expiry, and intent reference before any paid/order-sync transition.
6. Retry order sync only through `POST /api/dbx-payments/:reference/retry-order-sync` for verified intents that are pending order sync.

## No fake paid-state rule

DBX `submit` records a candidate transaction only; it is not proof of payment. DBX `confirm` must use server-side Solana verification. Frontend redirects, wallet UI success screens, fake transaction signatures, and client assertions must never mark payment or order state paid.

Stripe follows the same boundary: paid state can only happen after a verified Stripe webhook. The unified smoke intentionally probes unsigned Stripe webhook safety and fake DBX transaction safety in one contract.

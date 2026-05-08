# DBX Solana Token Checkout Contract

DBX token checkout is a server-verified Solana SPL-token payment option. It is designed to sit beside Stripe and Paystack without moving payment authority into the frontend or into Medusa.

## Roles and boundaries

- **NestJS API** is the payment/economic brain. It creates DBX payment intents, owns state transitions, enforces idempotency, and initiates commerce sync only after server-side verification.
- **FastAPI** is the fraud/risk/intelligence verifier. NestJS calls FastAPI's internal DBX verification route, which reads Solana RPC transaction status and parsed transfer details.
- **Medusa** remains the commerce/order engine. It must not be the source of truth for DBX payment verification.
- **Frontend** displays instructions, QR/address data, and pending/confirmed/failed states. It must never mark an order paid from client-side wallet confirmation alone.

## Environment contract

### Frontend-safe

```bash
NEXT_PUBLIC_DBX_SOLANA_PAYMENT_ADDRESS=<public Solana receiving address>
```

This address is safe to render in checkout and QR codes. It must be the same receiver address used by the NestJS DBX intent response.

### Server-only

```bash
SOLANA_RPC_URL=<server-only Solana RPC URL>
DBX_TOKEN_MINT=<DBX SPL-token mint>
INTERNAL_SERVICE_TOKEN=<NestJS-to-FastAPI shared internal token>
SUPABASE_SERVICE_ROLE_KEY=<server-only Supabase service role key>
FASTAPI_BASE_URL=<internal FastAPI base URL>
```

Never expose private keys, seed phrases, service-role keys, or internal tokens to the frontend.

## Route contract

All routes are mounted under the API prefix, normally `/api`.

### Create intent

`POST /api/dbx-payments/intents`

Request requires a commerce reference (`cartId` or `orderRef`), customer identity fields, fiat amount, and expected DBX base-unit amount.

Example request:

```json
{
  "cartId": "cart_123",
  "email": "buyer@example.com",
  "customerName": "Buyer Example",
  "expectedUsdCents": 2499,
  "currency": "USD",
  "expectedDbxBaseUnits": "24990000000",
  "idempotencyKey": "cart_123:dbx:v1"
}
```

Response returns `status: "pending"`, a `reference`, `dbxPaymentAddress`, `expiresAt`, and Solana payment instructions. Intent creation never marks payment paid.

### Submit transaction signature

`POST /api/dbx-payments/submit`

Request accepts either `transactionSignature` or `txHash`.

```json
{
  "intentReference": "DBX-...",
  "transactionSignature": "<solana-signature>"
}
```

The API validates the Solana signature shape, attaches it to the intent, and returns `verificationStatus: "verification_pending"`. Client submit alone never marks the payment confirmed or paid.

### Confirm payment

`POST /api/dbx-payments/confirm`

Request accepts the same signature fields as submit. Confirmation is server-side only. NestJS locks by intent reference, re-checks expiry and idempotency, then asks FastAPI to verify:

- Solana transaction exists and is confirmed/finalized.
- Transaction did not fail on-chain.
- Receiver address matches `dbxPaymentAddress`.
- Token mint matches `DBX_TOKEN_MINT`/`DBX_MINT_ADDRESS`.
- Transferred amount is at least the expected DBX base-unit amount.
- Optional sender wallet matches when present.

If `SOLANA_RPC_URL`/`DBX_SOLANA_RPC_URL` is missing, confirmation returns the explicit blocker `solana_rpc_not_configured`; it must not fake success.

### Retry order sync

`POST /api/dbx-payments/:reference/retry-order-sync`

Allowed only after a verified payment is waiting for Medusa order sync. If durable Medusa completion is not available, the status remains `verified_pending_order_sync` and the UI should show `payment_confirmed_order_sync_pending`.

### Get payment status

`GET /api/dbx-payments/:reference`

Returns intent status, transaction signature if submitted, expiry, verification timestamps, and failure reason. The frontend should poll this route for pending states.

## Frontend checkout options

Checkout should present these options without coupling one provider to another:

1. **Stripe** — hosted/card checkout through existing Stripe checkout session routes.
2. **Paystack** — regional card/bank option when configured.
3. **DBX token** — Solana SPL-token transfer to the DBX payment address from the intent response.

## DBX frontend flow

1. Create a DBX intent from the cart/order.
2. Render DBX amount, token mint, receiver address, reference, and expiry.
3. Generate a QR code from the receiver address/payment instructions.
4. User sends DBX from their wallet.
5. User pastes/submits the Solana transaction signature.
6. Frontend calls submit and displays `verification_pending`.
7. Frontend calls confirm or polls status.
8. Only server-confirmed states may show success:
   - `pending`: waiting for wallet transfer/signature.
   - `submitted`: signature received, verification pending.
   - `verified_pending_order_sync`: payment verified, Medusa order sync pending.
   - `completed`: payment verified and order sync completed.
   - `failed`/`expired`: show failure and recovery instructions.

## No frontend-paid rule

Wallet UI success, browser-side chain reads, or a pasted signature are not enough to mark an order paid. Only the NestJS confirmation route may transition DBX payment state after FastAPI/Solana verification.

## Smoke

Run:

```bash
node scripts/e2e-dbx-token-checkout-readiness-smoke.mjs
```

Expected output is JSON with:

- `success`
- `blockers`
- `apiReady`
- `dbxIntentReady`
- `dbxSubmitReady`
- `dbxConfirmReady`
- `fakeTxRejected`
- `paymentMarkedPaid`
- `orderSyncReady`
- `dbxPaymentAddressPresent`
- `solanaRpcConfigured`
- `nextManualStep`

A safe pre-production result may include explicit blockers such as `solana_rpc_not_configured` or `payment_confirmed_order_sync_pending`; fake transactions must never produce paid state.

## Ownership, security, and token-governance references

DBX token checkout must be operated with the repository-level control documents in place:

- [Ownership policy](./OWNERSHIP.md) defines source-of-truth repository, contractor/IP, AI-output, and backup expectations.
- [Security model](./SECURITY_MODEL.md) defines token-attacker, payment-attacker, insider, secret-management, audit-log, 2FA, and incident-response controls.
- [Trade secrets policy](./TRADE_SECRETS.md) reinforces that DBX private keys, seed phrases, treasury procedures, anti-fraud rules, and deployment controls must not be committed or shared in chat.
- [Production control plan](./PRODUCTION_CONTROL.md) defines account ownership, protected branches, CODEOWNERS review, release tagging, and rollback expectations.
- [DBX token governance controls](./TOKEN_GOVERNANCE.md) define multisig treasury, mint/freeze authority decision logging, allocation controls, airdrop anti-sybil requirements, and the no-private-key-in-repo/chat rule.
- [Security policy](../SECURITY.md) defines private vulnerability reporting and secret-leak response.

These references do not change DBX checkout behavior. They preserve the existing server-verified Solana payment contract and no-frontend-paid rule.

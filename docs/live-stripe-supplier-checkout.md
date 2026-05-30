# Live Stripe + Supplier Checkout

> Final first-transaction operator pack: see [docs/first-transaction-final-operator-pack.md](./first-transaction-final-operator-pack.md) for the canonical Render/Fly release commands, safe publishable-key retrieval, CJ shirt seed cycle, smoke sequence, and stop/go checklist.

## DNS map

- api: `https://dbaronx-api-unified-qo2j.onrender.com`
- commerce (Medusa): `https://dbaronx-medusa-xrwh.onrender.com`
- fastapi: `https://dbaronx-fastapi-5ci9.onrender.com`
- telegram bot: `https://dbaronx-telegram-bot.onrender.com`
- web storefront: set `WEB_BASE_URL` / `NEXT_PUBLIC_WEB_BASE_URL` to the current storefront deployment; do not use `https://dbaronx.com` unless DNS has been confirmed.


## Fresh Medusa DB prerequisite

If the exposed Render Postgres database was deleted/replaced, the old Medusa publishable key is invalid. The Medusa Render Web Service Start Command must remain server-only:

```bash
pnpm --filter @dbaronx/medusa run start
```

Run Medusa migrations, launch commerce prerequisites, and the first controlled CJ shirt seed as explicit jobs only: the `Medusa First Product Seed` GitHub Action, a Render one-off job, or Render shell command. Do **not** use any seed/import/migration command as the Render Web Service Start Command; Render can time out with `No open ports detected` if startup does not bind the HTTP port quickly.

The seed workflow requires `MEDUSA_DATABASE_URL` to be the real Medusa Postgres database URL. Do not point it at the API/NestJS Supabase `DATABASE_URL`, which owns CJ staging/import/audit/business tables. In Medusa-only workflows, both `DATABASE_URL` and `MEDUSA_DATABASE_URL` are intentionally sourced from the GitHub secret `MEDUSA_DATABASE_URL`; this does not conflict with the API/NestJS Supabase `DATABASE_URL` unless a Medusa workflow lets `DATABASE_URL` remain generic or falls back to `secrets.DATABASE_URL`. If this workflow uses a GitHub Environment, update the Environment secret too. If the Action reports missing `tax_provider`, `payment_provider`, `fulfillment_provider`, or related Medusa tables, the job is using the wrong database or Medusa migrations have not been applied to the Medusa database. If the DB contract smoke reports SQLSTATE `28000` as `medusa_database_auth_failed`, Postgres rejected the `MEDUSA_DATABASE_URL` credentials; re-copy the full current Render Postgres External Database URL using the Render copy button, update the GitHub repository secret `MEDUSA_DATABASE_URL` and any GitHub Environment secret `MEDUSA_DATABASE_URL` (especially Production), and do not retry the publishable-key or seed workflow with the API Supabase `DATABASE_URL`.

```bash
DBX_CONFIRM_CJ_FIRST_PRODUCT_SEED=true pnpm --filter @dbaronx/medusa run first-product:seed:cj-shirt
```

Normal Render Medusa Start Command:

```bash
pnpm --filter @dbaronx/medusa run start
```

Medusa Store API routes require a current publishable API key in the `x-publishable-api-key` header. An old publishable key can stop working after a Medusa database replacement because the key and sales-channel links live in the Medusa database, not in the codebase.

When Medusa Admin UI `/app` is unavailable, the safest path is to run the **Medusa Publishable Key** GitHub Actions workflow instead of relying on the Admin UI:

1. Run **Medusa Publishable Key** with `mode=list` to check for an existing non-revoked publishable key linked to the current/default sales channel.
2. If the list run reports no linked key, rerun **Medusa Publishable Key** with `mode=ensure` and `confirmCreate=true` to create `dBaronX Storefront Publishable Key` and link it to the sales channel used by products.
3. Download `artifacts/medusa-publishable-key-output.json` from the workflow artifact. If a new key was created, the full token is available only in that artifact; store it immediately and never paste it publicly.
4. Set the key where needed:
   - GitHub Actions: `MEDUSA_PUBLISHABLE_KEY`
   - Rocket/Web env: `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`
   - Local checks: `MEDUSA_PUBLISHABLE_KEY`

After storing the key, test Store API access without exposing the value:

```bash
curl -H "x-publishable-api-key: <key>" https://dbaronx-medusa-xrwh.onrender.com/store/regions
```

The legacy manual fallback is `DBX_CONFIRM_PRINT_MEDUSA_PUBLISHABLE_KEY=true pnpm --filter @dbaronx/medusa run publishable-key:print`, but prefer the workflow because it does not require Medusa Admin UI `/app` and writes the one-time full token only to the private artifact. Medusa Admin `/app` may be unavailable because the admin build is disabled, and `/` or `/app` returning `Cannot GET` is not a Store API blocker. Do not use a deleted/old DB key. Then run the one controlled CJ shirt seed through the `Medusa First Product Seed` GitHub Action, a Render one-off job, or Render shell command. Keep the normal command above in the Web Service and run the smokes with the new key before sending a customer to checkout.


## Manual curated CJ product batch

Use **Medusa Manual CJ Curated Products** when the operator has manually verified a small CJ product list and needs real customer-buyable catalog items while automatic CJ onboarding continues separately. This path does not call the CJ API and does not add products to Rocket directly; it writes buyable products to Medusa only when `MEDUSA_DATABASE_URL` points to the Medusa database and the workflow confirmation is explicit.

Recommended first run:

```text
confirmSeed=true
dryRun=true
includeDrafts=false
```

Actual seed run after reviewing the dry-run artifact:

```text
confirmSeed=true
dryRun=false
includeDrafts=false
```

The batch contains seven buyable `manual_verified_for_checkout` CJ products and one incomplete draft humidifier. The draft remains non-buyable until image, inventory, supplier price, shipping cost, total cost, and selling price are completed. Supplier cost and shipping cost stay in Medusa internal metadata and must not be shown by Rocket or Telegram customer flows. Automatic CJ onboarding remains separate: preview → import → approve-safe → publish-approved/full-safe, one category at a time after cooldown when rate-limited.

## Render environment checklist

### NestJS/API Render service only

Set these only on the API service. Do not expose them to the browser and do not commit real values.

```dotenv
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
INTERNAL_SERVICE_TOKEN=
CJ_ACCESS_TOKEN=
CJ_API_BASE_URL=https://developers.cjdropshipping.com/api2.0
```

- `STRIPE_SECRET_KEY` must be a Stripe **test** secret key (`sk_test_*`) for the first controlled checkout. It is the only key used by NestJS to create hosted Checkout Sessions.
- `STRIPE_WEBHOOK_SECRET` must be the Stripe Dashboard signing secret (`whsec_*`) copied from the **same Stripe test-mode webhook endpoint** used for the controlled checkout; a webhook destination ID (`we_*`) is not a signing secret. Do not mix live and test keys or webhook secrets.
- `INTERNAL_SERVICE_TOKEN` is server-only and is used by internal readiness/order preview probes.
- `CJ_ACCESS_TOKEN` is optional for the Stripe-only smoke but required for CJ supplier live probe readiness.
- `CJ_API_BASE_URL` should remain `https://developers.cjdropshipping.com/api2.0`.

### Web Render service / browser-safe values

Set these on the web service with public/test values only. The first controlled checkout must use a `pk_test_*` publishable key that belongs to the same Stripe account/mode as the API `sk_test_*` secret key.

```dotenv
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=
NEXT_PUBLIC_API_BASE_URL=https://dbaronx-api-unified-qo2j.onrender.com
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://dbaronx-medusa-xrwh.onrender.com
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=
```

The web app must never receive `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CJ_ACCESS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, or the internal service token.

## Stripe mode and controlled-test guard

`NODE_ENV=production` does **not** determine whether Stripe creates test-mode or live-mode Checkout Sessions. Stripe mode is determined by the configured key prefixes:

- `sk_test_*` creates test-mode Checkout Sessions such as `cs_test_*`.
- `sk_live_*` creates live-mode Checkout Sessions such as `cs_live_*`.
- Any other secret-key prefix is treated as `unknown` and must be corrected before relying on the result.

The first controlled Stripe checkout requires all Stripe values to be test-mode values from the same Stripe environment: `STRIPE_SECRET_KEY` set to a test-mode `sk_test_*` value on the API service, `NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_*` on the web service, and `STRIPE_WEBHOOK_SECRET` set to the matching test-mode `whsec_*` value from the matching test-mode webhook endpoint. Do not mix `sk_live_*`, `pk_test_*`, or a live `whsec_*` in one controlled test run. If a controlled test request asks for `checkoutMode: "test"` while the API has an `sk_live_*` secret key, the API must block Checkout Session creation with `stripe_live_key_used_for_test_checkout` and must not return a `checkoutUrl` or `sessionId`.

Live checkout is still supported for future production use, but it must be explicitly requested with `checkoutMode: "live"` and the API environment must set `ALLOW_LIVE_STRIPE_CHECKOUT` to `true`. Without that explicit allowance, readiness reports `stripe_live_key_present_without_live_checkout_allowance` when an `sk_live_*` key is present.

Never use a Stripe test card on a `cs_live_*` session. A smoke output containing `cs_live_*` is a blocker for the controlled test and must be fixed by replacing Render API/Web Stripe keys with `sk_test_*` / `pk_test_*`, redeploying, and rerunning the smoke.

## Stripe Dashboard webhook setup

1. Open Stripe Dashboard with **Test mode** enabled for the controlled test.
2. Go to **Developers → Webhooks → Add endpoint**.
3. Enter the exact dBaronX API endpoint URL: `https://dbaronx-api-unified-qo2j.onrender.com/api/checkout/stripe/webhook`.
4. Select `checkout.session.completed`.
5. Save the endpoint and copy the `whsec_*` signing secret from that same test webhook endpoint into the API service as `STRIPE_WEBHOOK_SECRET`.
6. Do not use the webhook destination ID (`we_*`) as `STRIPE_WEBHOOK_SECRET`; `we_*` identifies the destination, while `whsec_*` verifies signatures.
7. Do not use the Supabase project URL as the direct Stripe webhook URL unless an explicit Supabase Edge Function relay is intentionally built, deployed, and documented. The canonical direct webhook destination is `https://dbaronx-api-unified-qo2j.onrender.com/api/checkout/stripe/webhook`.
8. Redeploy/restart the API service so the env var is loaded.
9. Keep test-mode and live-mode webhook endpoints/secrets separate.

The NestJS endpoint verifies the raw body and `stripe-signature` header with `Stripe.webhooks.constructEvent(payload, sigHeader, STRIPE_WEBHOOK_SECRET)`. Unsigned, missing-secret, or invalid-signature calls must return `verified: false`, `paymentMarkedPaid: false`, and no paid/order settlement.

## Checkout flow contract

- NestJS remains the payment/economic brain and calls `stripe.checkout.sessions.create(...)`.
- Medusa remains the commerce engine for products, regions, carts, line items, and shipping options.
- FastAPI remains the intelligence/risk layer and is not allowed to mark Stripe payments paid.
- NestJS returns `sessionId` and `checkoutUrl` only after the Stripe API succeeds.
- If `STRIPE_SECRET_KEY` is missing, NestJS returns `stripe_secret_key_missing` with `checkoutUrl: null` and `sessionId: null`.
- Browser redirects are not trusted as payment proof.
- Paid/settled state can only be attached after a verified Stripe webhook event.
- Verified `checkout.session.completed` writes durable signed-webhook payment evidence to `app_public.stripe_webhook_events`, persists a verified `commerce.checkout.payment_verified` economic event, and only reports `paymentMarkedPaid: true` from the settlement lookup after that signed webhook evidence exists. Browser redirects never mark paid state.

## Canonical live API route paths

Use the unversioned Render route contract below unless route discovery proves a deployed service still needs a legacy `/api/v1` fallback:

- `GET /api/suppliers/readiness`
- `GET /api/suppliers/cj/preflight`
- `POST /api/suppliers/cj/import-readiness`
- `GET /api/payments/readiness`
- `GET /api/payments/economic-readiness`
- `POST /api/checkout/stripe/session`
- `POST /api/checkout/stripe/webhook`
- `POST /api/checkout/stripe/order-sync-preview`
- `POST /api/payments/economic-events/dry-run`

The first Stripe smoke must call those canonical `/api` routes first. It may try a legacy `/api/v1` path only after the canonical route returns `404`, and its JSON output records the exact route in `apiRoutesUsed`, `stripeRoutesUsed`, and `economicRoutesUsed`.

API readiness no longer depends on `GET /api/health` alone. The smoke records `apiHealthPathsTried` for `GET /api/health`, `GET /health`, `GET /api/payments/readiness`, `GET /api/system/runtime-contract`, and `GET /api/system/deployment-readiness`, then treats the API as ready when any known readiness endpoint returns `200`.

Medusa shipping visibility uses the Store API with the publishable key present when configured:

1. `POST /store/carts/:cart_id` with a minimal US `shipping_address` (`country_code: "us"`) so region/service-zone rules can be evaluated.
2. `GET /store/shipping-options?cart_id=:cart_id` with `x-publishable-api-key` when available.
3. `POST /store/carts/:cart_id/shipping-methods` with `{ "option_id": "so_..." }` only after a real option is returned.
4. `GET /store/carts/:cart_id` to capture cart shipping totals.

The smoke does not mark `shippingOptionReady` unless Medusa returns a real shipping option ID. If Medusa returns zero options, the result remains the real blocker `shipping_option_store_visibility_missing` rather than a fabricated shipping success.

Stripe order-sync preview authorization is reported without exposing the token. Both the first Stripe smoke and unified payment rail smoke emit `smokeContractVersion`/`scriptVersion` as `2026-05-09.internal-token-preview-v1` plus `internalTokenPresent`, `internalAuthHeaderUsed`, `internalTokenAccepted`, `orderSyncPreviewAuthorized`, `orderSyncPreviewStatus`, and `orderSyncPreviewBlockers`. The only internal-token transport is the canonical `x-internal-token: <INTERNAL_SERVICE_TOKEN>` header; the scripts never send the token in a body, query string, `Authorization`, or any alternate header. A `401` or `403` with `INTERNAL_SERVICE_TOKEN` present reports `internal_token_present_but_rejected`; the same status without a token reports `protected_route_requires_internal_token`. `orderSyncReady` remains false unless the protected preview succeeds and proves durable order-sync prerequisites with no preview blockers; preview never marks a payment paid or completes an order.

The Medusa shipping ensure scripts now prove the same Store API visibility inputs that the Store route uses: target sales channel `sc_01KQNM6EQZ19Y1BCSRVF9XV61H`, its linked stock location/fulfillment set, `enabled_in_store: true`, `is_return: false`, and the US smoke address (`country_code: "us"`). If the target shipping option is not returned by that fulfillment context, the ensure output reports `shipping_option_store_visibility_unverified:<reason>` instead of claiming Store API visibility. The Stripe smoke creates the cart with the target sales channel first so `GET /store/shipping-options?cart_id=:cart_id` evaluates the dBaronX stock location fulfillment set.

If `MEDUSA_PUBLISHABLE_KEY` or `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` is still `<MEDUSA_PUBLISHABLE_KEY>` or contains angle brackets, the smoke reports `medusa_publishable_key_placeholder_not_replaced`. If the value starts with or contains Stripe key material such as `pk_test_`, `pk_live_`, `sk_test_`, `sk_live_`, or `whsec_`, the smoke reports `medusa_publishable_key_looks_like_stripe_key`. If Medusa responds with `A valid publishable key is required`, the smoke reports `medusa_publishable_key_invalid` and the operator must run `launch-commerce:ensure`, retrieve the new fresh-DB publishable key linked to the default sales channel with the explicit print command, and update Render; a key from the deleted DB remains invalid. If only a preview such as `pk_…` is configured, the first-product readiness smoke reports `medusa_publishable_key_preview_only_full_key_required`. The key is never printed; the only key diagnostics are `medusaPublishableKeyPresent`, `medusaPublishableKeySource`, `medusaPublishableKeyShape`, and `medusaPublishableKeyRejectedByStoreApi`.

PowerShell live smoke environment:

```powershell
$env:API_URL="https://dbaronx-api-unified-qo2j.onrender.com"
$env:MEDUSA_URL="https://dbaronx-medusa-xrwh.onrender.com"
$env:MEDUSA_PUBLISHABLE_KEY="<publishable-key>"
$env:NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY="<publishable-key>"
$env:INTERNAL_SERVICE_TOKEN = "<internal-service-token>"
```

PowerShell live smoke commands:

```powershell
node scripts/e2e-supplier-readiness-smoke.mjs
node scripts/e2e-stripe-checkout-session-smoke.mjs
node scripts/e2e-stripe-controlled-order-smoke.mjs
```

## Stripe Checkout metadata contract

The Checkout Session and PaymentIntent metadata include the safe mapping fields below when available:

```json
{
  "cartId": "cart_...",
  "orderRef": "stripe-controlled-...",
  "checkoutRef": "stripe-controlled-...",
  "customerRef": "controlled-live-smoke",
  "userId": "",
  "productId": "prod_...",
  "variantId": "variant_...",
  "supplierRefs": "",
  "orderIntentId": "",
  "source": "dbaronx",
  "mode": "test"
}
```

This metadata is for reconciliation only. It is not proof of payment, and it must not mark an order paid without a verified Stripe event.

## Smoke commands

Controlled Render test smoke:

```bash
MEDUSA_URL=https://dbaronx-medusa-xrwh.onrender.com \
API_URL=https://dbaronx-api-unified-qo2j.onrender.com \
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY= \
INTERNAL_SERVICE_TOKEN= \
node scripts/e2e-live-stripe-controlled-checkout-smoke.mjs
```

Local services:

```bash
MEDUSA_URL=http://localhost:9000 \
API_URL=http://localhost:3001 \
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY= \
INTERNAL_SERVICE_TOKEN= \
node scripts/e2e-live-stripe-controlled-checkout-smoke.mjs
```

First controlled transaction proof smoke:

```bash
MEDUSA_URL=https://dbaronx-medusa-xrwh.onrender.com \
API_URL=https://dbaronx-api-unified-qo2j.onrender.com \
WEB_BASE_URL=<current-web-storefront-url> \
INTERNAL_SERVICE_TOKEN= \
node scripts/e2e-first-stripe-test-transaction-smoke.mjs
```

Compatibility smoke:

```bash
node scripts/e2e-stripe-checkout-session-smoke.mjs
```

## Expected controlled success JSON

```json
{
  "success": true,
  "blockers": [],
  "medusaReady": true,
  "apiReady": true,
  "productId": "prod_...",
  "variantId": "variant_...",
  "regionId": "reg_...",
  "cartId": "cart_...",
  "lineItemAdded": true,
  "shippingOptionReady": true,
  "shippingAttachedToCart": true,
  "stripeEndpointReady": true,
  "checkoutSessionCreated": true,
  "sessionIdPresent": true,
  "checkoutUrlPresent": true,
  "stripeSessionModeDetected": "test",
  "stripeSessionModeAllowed": true,
  "stripeWebhookUrlExpected": "https://dbaronx-api-unified-qo2j.onrender.com/api/checkout/stripe/webhook",
  "webhookEndpointReady": true,
  "unsignedWebhookRejected": true,
  "paymentMarkedPaid": false,
  "orderSyncReady": false,
  "smokeContractVersion": "2026-05-09.internal-token-preview-v1",
  "scriptVersion": "2026-05-09.internal-token-preview-v1",
  "internalAuthHeaderUsed": "x-internal-token",
  "nextManualStep": "Checkout test URL is safe to open for Stripe test-card validation, but do not treat order as settled until signed webhook and order sync prove completion."
}
```

`orderSyncReady` remains `false` until durable DBX payment-record lookup and Medusa order completion settlement are connected. That is intentional: the smoke proves the mapping boundary and prevents fake paid/order-complete state.

## First controlled manual Stripe test checkout and post-payment settlement proof

1. Run the first Stripe smoke and save its `cartId`, `orderRef`, `checkoutRef`, `sessionId`, and `checkoutUrl`:

   ```bash
   MEDUSA_URL=https://dbaronx-medusa-xrwh.onrender.com \
   API_URL=https://dbaronx-api-unified-qo2j.onrender.com \
   WEB_BASE_URL=<current-web-storefront-url> \
   INTERNAL_SERVICE_TOKEN= \
   node scripts/e2e-first-stripe-test-transaction-smoke.mjs
   ```

2. Confirm the smoke returns `checkoutSessionCreated: true`, `checkoutUrlPresent: true`, `stripeSecretKeyMode: "test"`, a `cs_test_*` session ID, `shippingOptionReady: true`, `unsignedWebhookRejected: true`, `paymentMarkedPaid: false`, and no checkout blockers.
3. Open only the returned `cs_test_*` Stripe hosted `checkoutUrl`. If the session is `cs_live_*`, stop and reconfigure test-mode Stripe secrets.
4. Pay with Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC, and a valid billing ZIP.
5. Open Stripe Dashboard with **Test mode** enabled, then go to **Developers → Webhooks → the configured endpoint** and confirm a `checkout.session.completed` delivery reached `POST /api/checkout/stripe/webhook`. The API must reject unsigned webhook calls and must only write paid evidence after Stripe signature verification succeeds.
6. Run the post-payment settlement smoke against the read-only settlement lookup endpoint:

   ```bash
   API_URL=https://dbaronx-api-unified-qo2j.onrender.com \
   STRIPE_SESSION_ID=cs_test_... \
   CART_ID=cart_... \
   ORDER_REF=stripe-controlled-... \
   CHECKOUT_REF=stripe-controlled-... \
   node scripts/e2e-stripe-post-payment-settlement-smoke.mjs
   ```

   `CHECKOUT_SESSION_ID` may be used instead of `STRIPE_SESSION_ID`. If only the session ID is available, the smoke can still look up settlement by `STRIPE_SESSION_ID`; if the session ID is unavailable, provide any durable local key that was stored from the signed webhook evidence, including `CART_ID`, `ORDER_REF`, `CHECKOUT_REF`, `PAYMENT_INTENT_ID`, or `STRIPE_EVENT_ID`. Supplying multiple keys is preferred because the response reports exactly which key matched.

   Stripe lookup ID meanings are strict:
   - `cs_test_*` is the correct controlled test Checkout Session ID for `STRIPE_SESSION_ID`, `CHECKOUT_SESSION_ID`, or the settlement-status `sessionId` query parameter; production live-mode sessions use `cs_live_*`.
   - `evt_*` is a Stripe Event ID, not a Checkout Session ID. Pass it as `STRIPE_EVENT_ID` or `stripeEventId` for diagnostic durable-record lookup.
   - `pi_*` is a Stripe Payment Intent ID. Pass it as `PAYMENT_INTENT_ID` or `paymentIntentId` when the Checkout Session ID is unavailable.
   - `ch_*` or `py_*` is a charge-like ID. Pass it as `CHARGE_ID` or `chargeId`; it is only useful if the API already stored that charge ID in safe local metadata/payment evidence.
   - Cart/order/checkout refs from Checkout metadata can also be used: pass `CART_ID`, `ORDER_REF`, and/or `CHECKOUT_REF`. Metadata refs are lookup keys only; they do not prove payment without signed `checkout.session.completed` evidence.

   Wrong ID types in `STRIPE_SESSION_ID` or `CHECKOUT_SESSION_ID` are never silently treated as a Checkout Session. The smoke emits `idClassification`, `acceptedLookupKeys`, `rejectedLookupKeys`, `lookupAdvice`, and `exactExpectedIdFormat: "cs_test_* or cs_live_*"`. Misrouted values produce explicit blockers such as `received_stripe_event_id_not_checkout_session_id`, `received_payment_intent_id_not_checkout_session_id`, `received_charge_id_not_checkout_session_id`, and `checkout_session_id_required`. Settlement-status then performs durable local lookup only against signed-webhook evidence and reports `durableLookupAttempted`, `durableLookupSource`, `matchedWebhookEventId`, `matchedCheckoutSessionId`, `matchedPaymentIntentId`, `matchedCartId`, `matchedOrderRef`, `matchedCheckoutRef`, `migrationTableAvailable`, and `webhookEvidenceTableAvailable` so the first settlement proof shows exactly which local evidence row was matched.

   Example post-payment lookup commands:

   ```bash
   API_URL=https://dbaronx-api-unified-qo2j.onrender.com \
   STRIPE_SESSION_ID=cs_test_... \
   node scripts/e2e-stripe-post-payment-settlement-smoke.mjs
   ```

   ```bash
   API_URL=https://dbaronx-api-unified-qo2j.onrender.com \
   STRIPE_EVENT_ID=evt_... \
   node scripts/e2e-stripe-post-payment-settlement-smoke.mjs
   ```

   ```bash
   API_URL=https://dbaronx-api-unified-qo2j.onrender.com \
   PAYMENT_INTENT_ID=pi_... \
   node scripts/e2e-stripe-post-payment-settlement-smoke.mjs
   ```

   ```bash
   API_URL=https://dbaronx-api-unified-qo2j.onrender.com \
   CHARGE_ID=ch_... \
   node scripts/e2e-stripe-post-payment-settlement-smoke.mjs
   ```

   ```bash
   API_URL=https://dbaronx-api-unified-qo2j.onrender.com \
   CART_ID=cart_... \
   ORDER_REF=stripe-controlled-... \
   CHECKOUT_REF=stripe-controlled-... \
   node scripts/e2e-stripe-post-payment-settlement-smoke.mjs
   ```

7. Interpret blockers from `blockerSources`:
   - No blockers means signed webhook evidence, the durable Stripe payment record, the verified economic event, duplicate webhook idempotency, and Medusa order completion are all ready.
   - `payment_record_lookup_pending` or `verified_stripe_event_missing` means Stripe has not delivered a valid signed `checkout.session.completed` webhook to the API yet, or the webhook persistence migration/env is missing.
   - `economic_event_verified_missing` means the signed webhook record exists but the verified economic event was not persisted.
   - `medusa_cart_completion_requires_payment_provider_session` means the signed Stripe payment is proven, but Medusa cart completion still requires a real Medusa payment provider/session setup; do not fake a Medusa order ID.
   - `medusa_order_completion_pending_verified_webhook` means no Medusa order completion was confirmed yet.

The settlement lookup endpoint is `GET /api/checkout/stripe/settlement-status` and accepts `sessionId`, `stripeEventId`, `paymentIntentId`, `chargeId`, `cartId`, `orderRef`, and `checkoutRef`. Lookup priority is `sessionId`, then cart/order/checkout refs, then `paymentIntentId`, then `stripeEventId`, then `chargeId` only when safely stored in local metadata/payment evidence. It returns only booleans, statuses, blockers, and a Medusa order ID when Medusa actually returns one; it never returns raw Stripe secrets, webhook secrets, Supabase service keys, or internal tokens.

The settlement storage readiness endpoint is `GET /api/checkout/stripe/settlement-storage-readiness`. It is internal-token protected; send `x-internal-token: <INTERNAL_SERVICE_TOKEN>` and never expose that token to the browser. The response is public-safe diagnostics only: `success`, `blockers`, `migrationTableAvailable`, `webhookEvidenceTableAvailable`, `idempotencyTableAvailable`, `paymentRecordTableAvailable`, `economicEventTableAvailable`, `requiredTables`, `missingTables`, `schemaNameUsed`, `supabaseConfigured`, `serviceRoleConfigured`, and `timestamp`. The required Supabase tables are exactly `app_public.stripe_webhook_events` for signed Stripe webhook/idempotency/payment-record evidence and `app_public.economic_events` for verified DBX economic events.

### Supabase settlement migration verification and manual SQL action

Before repeating paid Stripe tests, prove storage readiness from an operator shell:

```bash
API_URL=https://dbaronx-api-unified-qo2j.onrender.com \
INTERNAL_SERVICE_TOKEN= \
node scripts/e2e-stripe-post-payment-settlement-smoke.mjs
```

If the smoke reports `settlementStorageReady: false`, `migrationActionRequired: true`, or non-empty `missingSettlementTables`, perform the SQL migration manually:

1. Open the Supabase project that backs the API deployment.
2. Go to **SQL Editor → New query**.
3. Open this repository file: `supabase/migrations/202605080001_stripe_verified_settlement_events.sql`.
4. Paste the entire file into the SQL Editor without adding secrets or replacing placeholders with keys.
5. Click **Run** and confirm the transaction completes successfully.
6. Redeploy or restart the API service so schema-cache-dependent clients start cleanly.
7. Rerun the post-payment smoke. The readiness response should show `missingTables: []`, `migrationTableAvailable: true`, `webhookEvidenceTableAvailable: true`, `idempotencyTableAvailable: true`, `paymentRecordTableAvailable: true`, and `economicEventTableAvailable: true` before another payment proof is attempted.

If tables are missing, the required action is: **Apply `supabase/migrations/202605080001_stripe_verified_settlement_events.sql`, redeploy/restart API, then create a fresh Stripe test checkout or replay `checkout.session.completed`.** Old completed payments may not appear in settlement lookup because the signed webhook could not be persisted before the migration existed. Browser redirect history is not enough; settlement proof requires a signed Stripe webhook delivery that the API verifies and stores after storage is ready.

### Stripe `checkout.session.completed` replay after migration

Use replay only after the Supabase storage readiness endpoint reports no missing tables:

1. Open Stripe Dashboard with **Test mode** enabled for a `cs_test_*` proof.
2. Navigate to **Developers → Events**.
3. Search for the completed Checkout Session or event. Use the saved `cs_test_*` session ID, `pi_*` payment intent ID, or the original `evt_*` event ID if you have it.
4. Open the `checkout.session.completed` event.
5. Use Stripe Dashboard's replay/resend control for the event, choose the webhook endpoint configured as `https://dbaronx-api-unified-qo2j.onrender.com/api/checkout/stripe/webhook`, and send it again.
6. Confirm the endpoint delivery returns HTTP 2xx.
7. Rerun:

```bash
API_URL=https://dbaronx-api-unified-qo2j.onrender.com \
INTERNAL_SERVICE_TOKEN= \
STRIPE_SESSION_ID=cs_test_... \
CART_ID=cart_... \
ORDER_REF=stripe-controlled-... \
CHECKOUT_REF=stripe-controlled-... \
node scripts/e2e-stripe-post-payment-settlement-smoke.mjs
```

A fresh checkout is also valid after migration. Do not mark paid from the frontend success redirect, do not mark paid from an unsigned webhook, and do not mark paid while the storage readiness endpoint reports missing tables. `paymentMarkedPaid` can become `true` only when the API has verified the Stripe signature for `checkout.session.completed`, persisted the durable row in `app_public.stripe_webhook_events`, and stored the matching verified economic event in `app_public.economic_events`. This signed evidence requirement protects against forged client redirects, replay ambiguity before idempotency storage exists, and double-settlement.

## Remaining steps before live mode

- Complete and document real Medusa payment-provider/session setup if settlement reports `medusa_cart_completion_requires_payment_provider_session`.
- Add replay/refund/cancel operational procedures and monitoring.
- Run a controlled refund and supplier dry-run after the first test payment.
- Switch to Stripe live keys only after controlled test order, supplier dry run, refund path, monitoring, and live webhook endpoint approval.

## CJ supplier live probe and first product import-readiness

API-service-only Render env vars for this phase:

```dotenv
CJ_API_BASE_URL=https://developers.cjdropshipping.com/api2.0
CJ_ACCESS_TOKEN=
INTERNAL_SERVICE_TOKEN=
CJ_TEST_PRODUCT_ID=
CJ_TEST_SKU=
```

CJ secrets are never frontend values: do not add `CJ_ACCESS_TOKEN` to the web service, do not prefix it with `NEXT_PUBLIC_`, and do not log or return it from API responses. CJ access tokens expire (CJ documents access tokens as 15-day credentials); rotate/refresh the token through CJ's official authentication flow, update the API Render env var, redeploy, and re-run the smoke when readiness reports `cj_token_invalid_or_expired`.

Supplier readiness now performs a safe CJ read-only live probe against `GET /api2.0/v1/product/getCategory` when both `CJ_ACCESS_TOKEN` and `CJ_API_BASE_URL` are configured. The response reports sanitized probe fields and blockers only.

First product import-readiness remains explicit and non-mutating. Send one approved CJ `productId` or `sku` to `POST /api/suppliers/cj/import-readiness`; the endpoint normalizes supplier fields, keeps `medusaSeeded: false`, and never auto-imports a bulk catalog.

CJ smoke commands:

```bash
API_URL=https://dbaronx-api-unified-qo2j.onrender.com node scripts/e2e-supplier-readiness-smoke.mjs
```

```bash
API_URL=https://dbaronx-api-unified-qo2j.onrender.com \
INTERNAL_SERVICE_TOKEN=... \
CJ_TEST_PRODUCT_ID=... \
node scripts/e2e-cj-live-probe-smoke.mjs
```

Use `CJ_TEST_SKU` instead of `CJ_TEST_PRODUCT_ID` when validating a SKU. AliExpress remains disabled until official approval is granted; do not configure AliExpress credentials or scrape AliExpress as a substitute for approved API access.

## Remaining steps before live mode

- Configure API `STRIPE_SECRET_KEY` to an `sk_test_*` value and `STRIPE_WEBHOOK_SECRET` to the matching `whsec_*` signing secret from the same test webhook endpoint in Render, and configure web `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` to a `pk_test_*` value.
- Run the controlled order smoke and confirm a hosted Stripe Checkout URL is returned.
- Complete one Stripe hosted Checkout test payment and verify the Dashboard delivery for `checkout.session.completed`.
- Replace the idempotency placeholder with durable storage for Stripe event IDs before marking anything paid.
- Attach verified Stripe sessions/payment intents to DBX payment records and the corresponding Medusa cart/order intent.
- Implement idempotent order/payment settlement from verified webhooks only.
- Add refund/cancel/replay operational procedures and monitoring.
- Switch to live Stripe keys only after the controlled test order, supplier dry run, refund path, monitoring, and live webhook endpoint are approved.

## Supplier credential readiness addendum

Supplier credentials are part of the controlled supplier checkout path but must remain separate from browser checkout configuration. Store supplier credentials on the **Render API/NestJS service** only:

```dotenv
CJ_ACCESS_TOKEN=
CJ_API_BASE_URL=https://developers.cjdropshipping.com/api2.0
CJ_TEST_PRODUCT_ID=
CJ_TEST_SKU=
ALIEXPRESS_APP_KEY=
ALIEXPRESS_APP_SECRET=
ALIEXPRESS_API_BASE_URL=
INTERNAL_SERVICE_TOKEN=
```

Do not store `CJ_ACCESS_TOKEN`, `ALIEXPRESS_APP_SECRET`, or any supplier private key on the web service, in frontend code, or in `NEXT_PUBLIC_` variables. CJ tokens can expire or be rotated by CJ; update the Render API env value and redeploy before expiry or immediately after revocation/suspected exposure. `CJ_TEST_PRODUCT_ID` and `CJ_TEST_SKU` are smoke-test placeholders only and are not secrets.

### CJ setup

1. Open CJ Dropshipping.
2. Go to **My CJ → Authorization → API → API Key**.
3. Save the API key/access token as `CJ_ACCESS_TOKEN` on the Render API service.
4. Save `CJ_API_BASE_URL=https://developers.cjdropshipping.com/api2.0` on the Render API service.
5. Redeploy the API service and run the supplier readiness smoke.
6. The API live probe uses only the read-only official CJ v2.0 endpoint `GET https://developers.cjdropshipping.com/api2.0/v1/product/list?pageNum=1&pageSize=1` with `CJ-Access-Token: <server-env-token>`. The token is never returned, logged, or sent to the frontend.

### AliExpress setup

1. Open the AliExpress Open Platform.
2. Go to **Open Platform → App Management → Create App**.
3. Submit the app and wait for approval.
4. After approval, open the app **Overview** and copy **App Key** and **App Secret**.
5. Save `ALIEXPRESS_APP_KEY`, `ALIEXPRESS_APP_SECRET`, and the approved official `ALIEXPRESS_API_BASE_URL` on the Render API service only.

AliExpress remains disabled until the approved app key and app secret are present. The system must not scrape AliExpress or use unofficial APIs.

### Supplier readiness smoke

```bash
API_URL=https://dbaronx-api-unified-qo2j.onrender.com \
INTERNAL_SERVICE_TOKEN= \
node scripts/e2e-supplier-readiness-smoke.mjs
```

CJ live probe and optional first explicit product import-readiness smoke:

```bash
API_URL=https://dbaronx-api-unified-qo2j.onrender.com \
INTERNAL_SERVICE_TOKEN= \
CJ_TEST_PRODUCT_ID= \
CJ_TEST_SKU= \
node scripts/e2e-cj-live-probe-smoke.mjs
```

The supplier readiness endpoint is `GET /api/suppliers/readiness`. It reports safe booleans and blockers without returning raw supplier secrets. Missing CJ env returns `cj_access_token_missing` or `cj_base_url_missing`; invalid/expired tokens return `cj_token_invalid_or_expired`; rate limits return `cj_rate_limited`; network/timeouts return `cj_live_probe_unreachable`. A successful CJ probe sets `cjConfigured: true` and removes the old no-live-probe blocker.

For the first CJ product test, set `CJ_TEST_PRODUCT_ID` or `CJ_TEST_SKU` and call `POST /api/suppliers/cj/import-readiness` with explicit product metadata. The boundary normalizes CJ product metadata, requires minimum economics and shipping fields before `supplierImportReady: true`, does not create a Medusa product automatically, and must not bulk auto-import the CJ catalog.

## DBX token checkout readiness addendum

DBX Solana token checkout now has an explicit route contract alongside the live Stripe and supplier checkout readiness flow:

- `POST /api/dbx-payments/intents` creates a pending DBX payment intent for a `cartId` or `orderRef`, returns the public DBX receiver address, expected base-unit amount, expiry, and idempotency reference, and never marks payment paid.
- `POST /api/dbx-payments/submit` accepts `transactionSignature`/`txHash`, validates Solana signature shape, attaches it to the DBX intent, and returns verification-pending state only.
- `POST /api/dbx-payments/confirm` requires server-side Solana/FastAPI verification before any confirmed transition. If `SOLANA_RPC_URL` is missing, the explicit blocker is `solana_rpc_not_configured`.
- `POST /api/dbx-payments/:reference/retry-order-sync` is reserved for verified payments whose Medusa order sync is pending.
- `GET /api/dbx-payments/:reference` exposes frontend-safe status for polling.

Stripe remains the card-checkout path and supplier readiness remains independent. DBX does not weaken Stripe/Medusa behavior: Medusa order payment state is not trusted from frontend wallet confirmation, and DBX order completion is only attempted after server-side transaction verification.

Frontend checkout should show Stripe, Paystack, and DBX as separate payment options. The DBX option must render `NEXT_PUBLIC_DBX_SOLANA_PAYMENT_ADDRESS`, a QR/address instruction, transaction signature submission, and pending/confirmed/failed UI states. The UI must not implement a frontend-paid state.

DBX readiness smoke:

```bash
node scripts/e2e-dbx-token-checkout-readiness-smoke.mjs
```

The smoke confirms API health, pending intent creation, invalid/fake transaction rejection, no fake paid state, and explicit order-sync/Solana RPC blockers.

## First Stripe checkout URL unblocker smoke

Run this smoke before opening any hosted Checkout URL:

```powershell
$env:API_URL = "https://dbaronx-api-unified-qo2j.onrender.com"
$env:MEDUSA_URL = "https://dbaronx-medusa-xrwh.onrender.com"
$env:NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = "<publishable-key>"
$env:INTERNAL_SERVICE_TOKEN = "<internal-service-token>"
node scripts/e2e-first-stripe-test-transaction-smoke.mjs
```

Route contract used by the smoke:

- API readiness is trusted when any one of these returns HTTP 200: `GET /api/health`, `GET /health`, `GET /api/payments/readiness`, `GET /api/system/runtime-contract`, or `GET /api/system/deployment-readiness`. Missing `/api/health` alone is not a blocker when a trusted readiness endpoint returns 200.
- Payment readiness uses `GET /api/payments/readiness` first and only falls back to `GET /api/v1/payments/readiness` after a canonical 404.
- Economic readiness uses `GET /api/payments/economic-readiness` first and only falls back to `GET /api/v1/payments/economic-readiness` after a canonical 404.
- Stripe session creation uses `POST /api/checkout/stripe/session` first and only falls back to `POST /api/v1/checkout/stripe/session` after a canonical 404.
- Unsigned webhook safety uses `POST /api/checkout/stripe/webhook` first and only falls back to `POST /api/v1/checkout/stripe/webhook` after a canonical 404.
- Order sync preview uses `POST /api/checkout/stripe/order-sync-preview` first and only falls back to `POST /api/v1/checkout/stripe/order-sync-preview` after a canonical 404. This route is protected by the API internal-token contract and must send `INTERNAL_SERVICE_TOKEN` in the canonical `x-internal-token` header; it does not accept the internal token through a request body or query string, and smoke output only reports whether the token/header was present, accepted, and which sanitized status/blockers came back.
- Economic dry run uses `POST /api/payments/economic-events/dry-run` first and only falls back to `POST /api/v1/payments/economic-events/dry-run` after a canonical 404.

`POST /api/checkout/stripe/session` is a public-safe customer checkout route. It uses the existing NestJS `@Public()` metadata so guest buyers can start hosted Stripe Checkout, while the global DTO validation pipe, request size middleware, and rate limit guard still apply. The route may create a real Stripe Checkout Session through `stripe.checkout.sessions.create(...)`, but it must not expose secrets, mark an order paid, complete an order, or mutate settlement state. Admin, order mutation, settlement, DBX confirmation, and webhook-paid-state routes remain protected by their existing safety rules.

Shipping option visibility is required before the smoke can report checkout readiness. The Medusa Store API sequence is:

1. Create or reuse a cart in region `reg_01KQSEKK6A9T86NJ0AG05XPK3H`.
2. Add a real line item.
3. Set a minimal US shipping address with `POST /store/carts/{cart_id}` and body:

```json
{
  "email": "first-stripe-smoke@example.com",
  "shipping_address": {
    "first_name": "First",
    "last_name": "StripeSmoke",
    "address_1": "101 Test Street",
    "city": "New York",
    "province": "NY",
    "postal_code": "10001",
    "country_code": "us"
  }
}
```

4. Fetch cart-scoped Medusa v2 options with `GET /store/shipping-options?cart_id={cart_id}` and include `x-publishable-api-key` when the store requires a publishable key.

The smoke must keep `shippingOptionReady: false` when the Store API returns no real `shipping_options` and must report `shipping_option_store_visibility_missing`; it must never fake `dBaronX Standard Delivery` readiness. When Stripe test checkout artifacts exist but this blocker remains, `nextManualStep` tells the operator not to open checkout until the Store API returns a real shipping option.

Only open `checkoutUrl` when the smoke reports all of the following: `stripeSecretKeyMode: "test"`, no checkout blockers, `shippingOptionReady: true`, `checkoutSessionCreated: true`, `checkoutUrl` begins with `https://checkout.stripe.com/`, `unsignedWebhookRejected: true`, `paymentMarkedPaid: false`, and `sessionId` begins with `cs_test_`. If a Medusa publishable-key blocker appears, replace the Medusa key with the real Medusa publishable API key from Medusa, not Stripe, before opening any checkout URL. Blockers must be empty except for explicitly documented non-live settlement blockers that do not fake paid/order state. Use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC, and any postal code. Frontend redirect success is only a browser navigation result; it is not proof of payment and must not mark an order paid. Paid/order settlement may move only from a signed, verified Stripe webhook and the durable settlement path.

## Controlled Stripe test-mode guard (May 2026)

Controlled first-transaction smokes must create Stripe **test-mode** Checkout Sessions. A valid controlled test session has a `sessionId` beginning with `cs_test_`; only that mode may be used with Stripe test cards such as `4242 4242 4242 4242`.

A `sessionId` beginning with `cs_live_` is live-money mode. Do **not** open or pay a `cs_live_*` Checkout URL for test-card validation. If the first Stripe smoke returns `stripeSessionModeDetected: "live"`, the smoke reports `stripe_live_session_returned_for_test_smoke` and the manual step is: “Do not open/pay this live session for test-card validation. Configure `STRIPE_SECRET_KEY` to a test-mode `sk_test_*` value and `STRIPE_WEBHOOK_SECRET` from a test webhook endpoint, redeploy, and rerun.”

The API also rejects a request with `checkoutMode: "test"` when the configured Stripe key is detected as live mode, returning the blocker `stripe_live_key_used_for_test_checkout`. Legitimate live checkout remains supported for explicit `checkoutMode: "live"`; `ALLOW_LIVE_STRIPE_CHECKOUT_FOR_SMOKE=true` is only an explicit smoke override and must not be used for controlled test-card validation.

## Shipping option Store API visibility requirement

The first Stripe smoke only reports `shippingOptionReady: true` when `GET /store/shipping-options?cart_id=<cart_id>` returns at least one real shipping option ID after a US shipping address is set on the cart. It preserves the exact Store API sequence: `POST /store/carts`, `POST /store/carts/:id/line-items`, `POST /store/carts/:id` with a US shipping address, `GET /store/shipping-options?cart_id=:cart_id`, `POST /store/carts/:id/shipping-methods` when an option exists, and `GET /store/carts/:id`. If Medusa readiness/`commerce:ensure` indicates Store API shipping visibility is expected but the Store API returns HTTP 200 with an empty `shipping_options` array, the blocker is `shipping_option_store_visibility_mismatch` in addition to `shipping_option_store_visibility_missing`.

Run the Medusa repair/diagnostic before rerunning controlled checkout smoke:

```bash
pnpm --filter @dbaronx/medusa shipping:visibility:diagnose
```

The diagnostic verifies/repairs the US service zone, fulfillment provider linkage, stock location/sales-channel coverage, shipping profile, flat USD shipping-option price, and removes shipping-option rules that block Store API context visibility.

## Ownership and security control references

This checkout runbook must be operated with the repository-level ownership and security controls in place:

- [Ownership policy](./OWNERSHIP.md) defines source-of-truth repository, domain, copyright, contractor/IP, AI-output, and backup expectations.
- [Security model](./SECURITY_MODEL.md) defines threat-model, secret-management, environment-separation, WAF, audit-log, 2FA, backup, and incident-response controls.
- [Trade secrets policy](./TRADE_SECRETS.md) reinforces that Stripe secrets, supplier tokens, pricing, anti-fraud rules, and deployment controls must not be committed or shared in chat.
- [Production control plan](./PRODUCTION_CONTROL.md) defines account ownership, GitHub controls, CODEOWNERS, release tagging, and rollback expectations.
- [Security policy](../SECURITY.md) defines private vulnerability reporting and secret-leak response.

These references do not change Stripe, supplier, or settlement behavior. They add operational controls around the existing no-fake-paid-state and signed-webhook requirements.

## Signed webhook payment record and post-payment order-sync verification

The canonical Stripe webhook URL for both the API implementation and Stripe Dashboard test endpoint is:

```text
https://dbaronx-api-unified-qo2j.onrender.com/api/checkout/stripe/webhook
```

### Stripe Dashboard test webhook setup

1. Open Stripe Dashboard with **Test mode** enabled.
2. Navigate to **Developers → Webhooks → Add endpoint**.
3. Use exactly `https://dbaronx-api-unified-qo2j.onrender.com/api/checkout/stripe/webhook` as the endpoint URL.
4. Select only `checkout.session.completed` for this phase.
5. Save the endpoint and copy the endpoint signing secret that begins with `whsec_`.
6. Set that value as `STRIPE_WEBHOOK_SECRET` on the NestJS/API Render service only, then redeploy the API.
7. Do not put `STRIPE_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `INTERNAL_SERVICE_TOKEN`, or `SUPABASE_SERVICE_ROLE_KEY` in the web app or docs with real values.

### Manual test-card steps

1. Run the first Stripe smoke and confirm `checkoutBlockers: []`, `stripeSecretKeyMode: "test"`, `checkoutSessionCreated: true`, `stripeHostedCheckoutUrl: true`, `unsignedWebhookRejected: true`, and `paymentMarkedPaid: false`.
2. Open the returned Stripe hosted Checkout URL only when the session ID starts with `cs_test_`.
3. Pay with Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC, and any postal code.
4. Wait for Stripe Dashboard to show a delivered `checkout.session.completed` event to the canonical webhook URL.
5. Rerun post-payment verification with the returned session/cart/order references.

### Post-payment verification command

Use either the dedicated post-payment smoke or rerun the first smoke with the paid Stripe session ID:

```bash
STRIPE_SESSION_ID=cs_test_... \
CART_ID=cart_... \
ORDER_REF=... \
INTERNAL_SERVICE_TOKEN=... \
node scripts/e2e-stripe-post-payment-settlement-smoke.mjs
```

Alternative:

```bash
STRIPE_SESSION_ID=cs_test_... \
INTERNAL_SERVICE_TOKEN=... \
node scripts/e2e-first-stripe-test-transaction-smoke.mjs
```

### What counts as success

A signed `checkout.session.completed` webhook must be verified with `Stripe.webhooks.constructEvent(rawBody, stripeSignatureHeader, STRIPE_WEBHOOK_SECRET)`. Only after that verification may NestJS persist durable payment evidence in `app_public.stripe_webhook_events` with the Stripe event/session/payment-intent IDs, cart/order/checkout references, amount, currency, `verification_status: "verified"`, settlement status, idempotency key, and safe metadata. Settlement lookup is deterministic and local: it does not call Stripe, it tries session ID, cart/order ref, cart/checkout ref, cart ID, order ref, checkout ref, payment intent ID, Stripe event ID, and stored charge metadata in that order, and it reports the matched durable row diagnostics. Duplicate Stripe event IDs are treated as idempotent duplicates and must return `duplicate: true` without creating a second economic event or attempting double settlement.

The post-payment smoke should report:

- `verifiedStripeEventReady: true`
- `paymentRecordReady: true`
- `economicEventVerified: true`
- `paymentMarkedPaid: true` only after signed durable webhook evidence includes amount and currency
- `duplicateWebhookSafe: true`
- `durableLookupAttempted: true`
- `durableLookupSource` set to the matching local key, such as `sessionId`, `cartId+orderRef`, `cartId+checkoutRef`, `cartId`, `orderRef`, `checkoutRef`, `paymentIntentId`, or `stripeEventId`
- `matchedWebhookEventId` plus any stored matched checkout session, payment intent, cart, order, and checkout refs
- `migrationTableAvailable: true` and `webhookEvidenceTableAvailable: true`

`medusaOrderCompletionReady: true`, `medusaOrderId`, and `orderSyncReady: true` are required before claiming Medusa order completion. If Medusa Store API completion requires a payment-provider/payment-session setup that is not yet present on the cart, the safe blocker is `medusa_cart_completion_requires_payment_provider_session`; this is not a paid-state substitute.

### Live-money blockers

Do not enable live Stripe money mode until all of these are true in test mode:

- Signed webhook delivery is green and unsigned webhook calls remain rejected.
- Durable Stripe payment evidence exists for the paid `cs_test_*` session.
- The economic event `commerce.checkout.payment_verified` is persisted with verifier evidence.
- Duplicate Stripe event delivery is idempotent and does not double-settle.
- Medusa order/cart completion produces a real Medusa order ID or another durable sync proof.
- No secrets are exposed in web env, logs, smoke output, docs, or committed files.

## First controlled Stripe test transaction

- Use Stripe test keys only; the controlled smoke may open Checkout only when `stripeSessionModeDetected` is `test`, `stripeSessionModeAllowed=true`, `checkoutSafeToOpen=true`, and the session ID starts with `cs_test_`.
- A `cs_live_*` session is blocked for controlled smoke unless `ALLOW_LIVE_STRIPE_SMOKE=true`; do not use that override for the first test transaction.
- Telegram is read-only/proof-only for payment settlement. Use `/stripe_first_tx_status`, `/stripe_storage`, `/stripe_settlement <cs_test_or_cs_live_session_id>`, `/payments_status`, `/medusa_status`, and `/commerce_status` for visibility only.
- If `TELEGRAM_BOT_TOKEN` appears in logs, rotate it immediately, redeploy the bot with the new token, and re-register the webhook at `https://dbaronx-telegram-bot.onrender.com/webhook/telegram`.
- Configure `BOT_PUBLIC_BASE_URL` or `TELEGRAM_BOT_PUBLIC_BASE_URL` to the public bot origin; the webhook path remains `/webhook/telegram`. Configure `TELEGRAM_ALLOWED_ADMIN_IDS` as comma-separated numeric Telegram user IDs before using protected ops commands.
- Claim payment/order settled only when signed Stripe webhook evidence, verified Stripe event storage, economic event persistence, payment record linkage, duplicate webhook safety, and Medusa order sync proof are all returned by backend proof endpoints.

## Telegram ops continuity for the first controlled transaction

Telegram readiness is required for production-control confidence but does not control whether a test-mode Stripe Checkout URL is safe to open. `checkoutSafeToOpen` remains governed by the Stripe/Medusa/API smoke result and requires a `cs_test_*` session. `telegramOpsReady` requires the bot `/ready` contract to report success plus configured admin guard, webhook secret, internal token, bot public URL, API, FastAPI, Medusa, webhook endpoint compatibility, and no secret leak detection.

Run these commands from a private terminal with shell tracing disabled. Never print token-bearing Telegram URLs:

```bash
set +x
BOT_PUBLIC_BASE_URL=https://dbaronx-telegram-bot.onrender.com \
TELEGRAM_BOT_TOKEN= \
TELEGRAM_WEBHOOK_SECRET= \
node scripts/telegram-set-webhook.mjs

BOT_PUBLIC_BASE_URL=https://dbaronx-telegram-bot.onrender.com \
TELEGRAM_BOT_TOKEN= \
node scripts/telegram-webhook-info.mjs

BOT_BASE_URL=https://dbaronx-telegram-bot.onrender.com \
API_BASE_URL=https://dbaronx-api-unified-qo2j.onrender.com \
FASTAPI_BASE_URL=https://dbaronx-fastapi-5ci9.onrender.com \
MEDUSA_BASE_URL=https://dbaronx-medusa-xrwh.onrender.com \
node scripts/e2e-telegram-bot-live-readiness-smoke.mjs

BOT_BASE_URL=https://dbaronx-telegram-bot.onrender.com \
API_BASE_URL=https://dbaronx-api-unified-qo2j.onrender.com \
FASTAPI_BASE_URL=https://dbaronx-fastapi-5ci9.onrender.com \
MEDUSA_BASE_URL=https://dbaronx-medusa-xrwh.onrender.com \
INTERNAL_SERVICE_TOKEN= \
node scripts/e2e-first-transaction-with-telegram-ops-smoke.mjs
```

The Telegram commands verified for first-transaction continuity are `/status`, `/payments_status`, `/stripe_storage`, `/stripe_first_tx_status`, `/stripe_settlement <session>`, `/medusa_status`, and `/commerce_status`. They are read-only/proof-only and must not mark paid, settle orders, approve payouts, credit wallets, fulfill orders, import suppliers, fake paid state, fake reward state, or override live money safety.

## Telegram customer discovery to Stripe checkout handoff

The Telegram customer bot is now a read-only discovery and guidance surface for the first real checkout path. It does not create checkout sessions directly and it does not write money, fulfillment, wallet, payout, or supplier-import state.

Customer path:

1. `/shop` returns the storefront URL, product listing URL, `/products` instruction, and support path.
2. `/products` reads public products from Medusa Store API and returns up to five Telegram-readable entries with title, public price when available, availability hint, and product URL.
3. `/product <handle_or_id>` looks up the product by public Store API ID/path or handle-filtered listing and returns the product URL/checkout URL for the web storefront.
4. Customer opens the web product page, uses the web cart, and pays through Stripe-hosted checkout.
5. Backend accepts payment proof only from signed Stripe webhook evidence.
6. `/payment_status <checkout_session_or_order_ref>` reads the backend settlement-status endpoint and returns only `pending_verification`, `paid_verified`, `not_found`, or `support_required` to customers.
7. `/order_status <order_or_email_or_reference>` returns public-safe support guidance when no safe public fulfillment proof exists.

First-real-transaction blocker behavior:

- Demo/sample/mock products are labeled `DEMO`.
- If only demo products are visible, or no product exposes a public supplier/source signal, Telegram returns `real_supplier_product_missing`.
- Telegram never fakes supplier availability, paid state, or fulfilled state to make the flow look ready.

Run the static customer journey smoke before manual customer testing:

```bash
node scripts/e2e-telegram-customer-first-checkout-journey-smoke.mjs
```

Proceed to a real customer only after the smoke passes and a non-DEMO supplier product is visible through Medusa and the web storefront.

## First real supplier product readiness path

This path is intentionally single-product and controlled. It does **not** bulk-import a supplier catalog, scrape supplier sites, or let Telegram mutate supplier, order, wallet, payout, payment, or fulfillment state.

### CJ draft and publish metadata contract

The first supplier product flow has two explicit modes:

- `DBX_FIRST_PRODUCT_MODE=draft` stores an incomplete CJ product for review. It is **not** live-checkout ready. Metadata must include `supplier: "cj"`, `supplierProductId`, `supplierSku`, `sourceUrl`, `realSupplierProduct: false`, `demo: false`, `supplierVerificationStatus: "draft_pending_verification"`, and blockers such as `product_image_missing`, `stock_unverified`, `shipping_country_unverified`, and `delivery_estimate_unverified`.
- `DBX_FIRST_PRODUCT_MODE=publish` is the only mode that can mark a product live-checkout ready. It requires image URL, stock quantity greater than zero, shipping countries, and a delivery estimate, then writes `realSupplierProduct: true`, `demo: false`, and `supplierVerificationStatus: "verified_for_checkout"`.

Shared supplier provenance metadata:

- `metadata.supplier`: public-safe supplier name or supplier identifier, for the first CJ product this is `cj`.
- `metadata.supplierProductId`: supplier's real product ID/reference.
- `metadata.supplierSku`: supplier SKU for the selected sellable variant.
- `metadata.sourceUrl`: verified supplier/source product URL.
- `metadata.supplierCostAmount`: supplier product cost in USD minor units for margin/readiness review.
- `metadata.supplierCostCurrency`: `usd`.
- `metadata.supplierCostUsdMinor`: backward-compatible supplier product cost alias in USD minor units.
- `metadata.shippingCountries`: confirmed shipping destination countries; required for publish.
- `metadata.deliveryEstimate`: confirmed delivery estimate; required for publish.

A product missing supplier/source fields, image, stock proof, shipping country, or delivery estimate is not first-transaction ready. A demo/sample/mock/test product must remain a demo product and must not be upgraded by metadata alone.

### Manual first real product checklist

Before inviting the first real customer to pay real money:

- [ ] Choose one approved real supplier product; do not bulk import.
- [ ] Confirm the supplier source URL is legitimate and still reachable.
- [ ] Confirm customer price, supplier cost, fees, taxes, shipping, and target margin.
- [ ] Confirm stock/availability from the supplier for the exact SKU/variant.
- [ ] Confirm the first shipping destination and shipping option are supported.
- [ ] Seed/publish the product with the controlled first-product seed script.
- [ ] Verify the Medusa Store API lists the non-demo product.
- [ ] Verify Telegram `/products` and `/product <handle_or_id>` do not label that product `DEMO` and show safe supplier metadata plus product URL.
- [ ] Verify the storefront product URL opens and can add the item to cart.
- [ ] Run Stripe test checkout first.
- [ ] Move to live money only after signed Stripe webhook proof and durable order/payment records are verified.

### Job-only seed for selected CJ shirt

Use the `Medusa First Product Seed` GitHub Action for the controlled first product seed. Required inputs for a real run are `confirmSeed=true`, `dryRun=false`, and `runMigrations=false` unless the operator explicitly wants the workflow to run Medusa migrations after the preflight reports missing Medusa tables. The Action sets both `DATABASE_URL` and `MEDUSA_DATABASE_URL` from the `MEDUSA_DATABASE_URL` secret and never prints the URL. If this workflow uses a GitHub Environment, update the Environment secret too.

A Render one-off job or shell may run the same command after `MEDUSA_DATABASE_URL` is confirmed to target the Medusa database:

```bash
DBX_CONFIRM_CJ_FIRST_PRODUCT_SEED=true pnpm --filter @dbaronx/medusa run first-product:seed:cj-shirt
```

The Medusa Web Service Start Command stays:

```bash
pnpm --filter @dbaronx/medusa run start
```

This profile is intentionally narrow: it requires `DBX_CONFIRM_CJ_FIRST_PRODUCT_SEED=true`, uses publish mode, seeds only `mens-cotton-linen-long-sleeve-casual-shirt`, does not scrape CJ, does not bulk import, does not expose secrets, and refuses to relabel unrelated products under the same handle.

### Controlled seed command

Set the required environment values from a manually approved supplier product, then run:

```bash
# Draft/review mode for the selected CJ product when image, stock, shipping, or delivery is unverified.
DBX_FIRST_PRODUCT_MODE=draft \
DBX_FIRST_PRODUCT_TITLE="Men's Cotton Linen Long Sleeve Casual Shirt" \
DBX_FIRST_PRODUCT_HANDLE="mens-cotton-linen-long-sleeve-casual-shirt" \
DBX_FIRST_PRODUCT_DESCRIPTION="CJ supplier draft pending image, stock, shipping country, and delivery estimate verification." \
DBX_FIRST_PRODUCT_PRICE_USD_MINOR="1999" \
DBX_FIRST_PRODUCT_COST_USD_MINOR="419" \
DBX_FIRST_PRODUCT_SUPPLIER="cj" \
DBX_FIRST_PRODUCT_SUPPLIER_PRODUCT_ID="2408300732091605000" \
DBX_FIRST_PRODUCT_SUPPLIER_SKU="CJDS212420104DW" \
DBX_FIRST_PRODUCT_SOURCE_URL="https://cjdropshipping.com/product/new-mens-casual-blouse-cotton-linen-shirt-loose-tops-long-sleeve-tee-shirt-spring-autumn-casual-handsome-mens-shirts-p-2408300732091605000.html" \
pnpm first-product:seed

# Publish mode only after all verification fields are confirmed.
DBX_FIRST_PRODUCT_MODE=publish \
DBX_FIRST_PRODUCT_TITLE="Men's Cotton Linen Long Sleeve Casual Shirt" \
DBX_FIRST_PRODUCT_HANDLE="mens-cotton-linen-long-sleeve-casual-shirt" \
DBX_FIRST_PRODUCT_DESCRIPTION="<customer-safe product description>" \
DBX_FIRST_PRODUCT_PRICE_USD_MINOR="1999" \
DBX_FIRST_PRODUCT_COST_USD_MINOR="419" \
DBX_FIRST_PRODUCT_SUPPLIER="cj" \
DBX_FIRST_PRODUCT_SUPPLIER_PRODUCT_ID="2408300732091605000" \
DBX_FIRST_PRODUCT_SUPPLIER_SKU="CJDS212420104DW" \
DBX_FIRST_PRODUCT_SOURCE_URL="https://cjdropshipping.com/product/new-mens-casual-blouse-cotton-linen-shirt-loose-tops-long-sleeve-tee-shirt-spring-autumn-casual-handsome-mens-shirts-p-2408300732091605000.html" \
DBX_FIRST_PRODUCT_IMAGE_URL="https://oss-cf.cjdropshipping.com/product/2024/08/30/07/ada82fd9-6efb-4629-86e8-1112d16a7a35.jpg?x-oss-process=image%2Fformat%2Cwebp" \
DBX_FIRST_PRODUCT_STOCK_QTY="32" \
DBX_FIRST_PRODUCT_SHIPPING_COUNTRIES="US" \
DBX_FIRST_PRODUCT_DELIVERY_ESTIMATE="7-15 business days" \
pnpm first-product:seed
```

The seed script refuses missing supplier/product/source fields, non-positive customer price, invalid URLs, credential-bearing URLs, and demo/sample/mock/test markers. `DBX_FIRST_PRODUCT_COST_USD_MINOR` is required as a positive integer in publish mode and missing/invalid publish cost fails with `DBX_FIRST_PRODUCT_COST_USD_MINOR_REQUIRED`; draft mode stores `supplier_cost_missing` with the other blockers instead of pretending the product is checkout-ready. Publish mode additionally refuses missing image, stock quantity less than one, missing shipping countries, and missing delivery estimate.

### Readiness smoke command

After Medusa is running and the product is published, run:

```bash
MEDUSA_BASE_URL=https://dbaronx-medusa-xrwh.onrender.com \
MEDUSA_PUBLISHABLE_KEY=<publishable key if required> \
WEB_BASE_URL=https://<web-host> \
pnpm first-product:readiness
```

The smoke verifies Store API reachability, a non-demo real supplier product, supplier metadata, price, variant, stock/availability proof, product URL, shipping option visibility for a cart, and Telegram discovery readiness. If it reports `real_supplier_product_missing`, do not proceed to a real customer transaction.

## Manual CJ first-product checklist

Use this checklist for the first manually selected CJ product. Do not bulk import CJ catalog data, do not scrape CJ pages, and do not mark demo products as real.

Required CJ/manual inputs:

- [ ] CJ product title: `<approved customer-safe title; must not contain demo/mock/sample/test>`
- [ ] CJ product ID: `<CJ supplier product ID>`
- [ ] CJ SKU: `<CJ variant/SKU selected for the first transaction>`
- [ ] CJ source URL: `<https://... or http://... CJ/public supplier product URL>`
- [ ] Product image URL: `<https://... or http://... image URL>`
- [ ] Supplier cost: `<USD minor units used for DBX_FIRST_PRODUCT_COST_USD_MINOR; selected CJ product public cost is 419>`
- [ ] Selling price: `<USD minor units used for DBX_FIRST_PRODUCT_PRICE_USD_MINOR; use 1999 or another operator-approved margin-safe price>`
- [ ] Stock quantity: `<positive quantity confirmed from CJ/manual supplier review>`
- [ ] Shipping country: `<country used to confirm Medusa shipping option visibility>`
- [ ] Margin note: `<internal margin reviewed in NestJS/business process; do not expose supplier cost in Telegram>`

Metadata contract created on both product metadata and variant metadata where Medusa supports it:

```json
{
  "supplier": "cj",
  "supplierProductId": "<DBX_FIRST_PRODUCT_SUPPLIER_PRODUCT_ID>",
  "supplierSku": "<DBX_FIRST_PRODUCT_SUPPLIER_SKU>",
  "sourceUrl": "<DBX_FIRST_PRODUCT_SOURCE_URL>",
  "supplierCostAmount": 419,
  "supplierCostCurrency": "usd",
  "realSupplierProduct": true,
  "demo": false
}
```

Seed command:

```bash
DBX_FIRST_PRODUCT_TITLE='<CJ product title>' \
DBX_FIRST_PRODUCT_HANDLE='<customer-safe-handle>' \
DBX_FIRST_PRODUCT_DESCRIPTION='<customer-safe description>' \
DBX_FIRST_PRODUCT_PRICE_USD_MINOR='1999' \
DBX_FIRST_PRODUCT_COST_USD_MINOR='419' \
DBX_FIRST_PRODUCT_SUPPLIER='cj' \
DBX_FIRST_PRODUCT_SUPPLIER_PRODUCT_ID='2408300732091605000' \
DBX_FIRST_PRODUCT_SUPPLIER_SKU='CJDS212420104DW' \
DBX_FIRST_PRODUCT_SOURCE_URL='https://cjdropshipping.com/product/new-mens-casual-blouse-cotton-linen-shirt-loose-tops-long-sleeve-tee-shirt-spring-autumn-casual-handsome-mens-shirts-p-2408300732091605000.html' \
DBX_FIRST_PRODUCT_IMAGE_URL='<https://...>' \
DBX_FIRST_PRODUCT_STOCK_QTY='<positive stock quantity>' \
pnpm first-product:seed
```

Readiness command:

```bash
EXPECT_SUPPLIER=cj \
MEDUSA_BASE_URL=https://dbaronx-medusa-xrwh.onrender.com \
WEB_BASE_URL=<current-web-storefront-url> \
MEDUSA_PUBLISHABLE_KEY='<publishable key if required>' \
pnpm first-product:readiness
```

Telegram test commands:

```text
/shop
/products
/product <handle_or_id>
/checkout_help
/payment_status <checkout_session_or_order_ref>
/order_status <order_or_email_or_reference>
/support
```

Telegram remains read-only during this process: it may display customer-safe CJ supplier hints, product/storefront URLs, and checkout guidance, but it must not create carts or checkout sessions, mark paid, mark fulfilled, credit wallets/rewards, approve payouts, or mutate supplier imports.

## Final first-sale readiness closure

The first real customer must not be invited until the final closure smoke returns `success: true` with no blockers. This is stricter than the first-product smoke: it verifies deployed Medusa and web reachability, the selected CJ product metadata contract, Store API product visibility, positive price and stock signals, cart creation, add-to-cart, visible shipping options, optional shipping-method selection, Node runtime, Redis production readiness, session-store production readiness, and optional Telegram/Stripe proof flags without printing secrets.

### Final first-sale env contract

Required for the selected CJ product before publish:

```bash
DBX_FIRST_PRODUCT_MODE=publish
DBX_FIRST_PRODUCT_TITLE='<customer-safe product title>'
DBX_FIRST_PRODUCT_HANDLE='<customer-safe product handle>'
DBX_FIRST_PRODUCT_DESCRIPTION='<customer-safe product description>'
DBX_FIRST_PRODUCT_PRICE_USD_MINOR='1999'
DBX_FIRST_PRODUCT_COST_USD_MINOR='419'
DBX_FIRST_PRODUCT_SUPPLIER='cj'
DBX_FIRST_PRODUCT_SUPPLIER_PRODUCT_ID='2408300732091605000'
DBX_FIRST_PRODUCT_SUPPLIER_SKU='CJDS212420104DW'
DBX_FIRST_PRODUCT_SOURCE_URL='https://cjdropshipping.com/product/new-mens-casual-blouse-cotton-linen-shirt-loose-tops-long-sleeve-tee-shirt-spring-autumn-casual-handsome-mens-shirts-p-2408300732091605000.html'
DBX_FIRST_PRODUCT_IMAGE_URL='<approved https product image url with no credential query/hash>'
DBX_FIRST_PRODUCT_STOCK_QTY='<confirmed positive CJ/manual stock quantity>'
DBX_FIRST_PRODUCT_SHIPPING_COUNTRIES='US'
DBX_FIRST_PRODUCT_DELIVERY_ESTIMATE='<confirmed customer-safe delivery estimate>'
```

The selected product must remain `supplier=cj`, `supplierProductId=2408300732091605000`, and `supplierSku=CJDS212420104DW`. Do not mark any demo/sample/mock/test product as real, and do not set `realSupplierProduct=true` unless supplier cost, image, stock, supported shipping country, delivery estimate, source URL, supplier product ID, supplier SKU, price, and metadata validation are all present and valid.

### Final seed command for the selected CJ product

```bash
DBX_FIRST_PRODUCT_MODE=publish \
DBX_FIRST_PRODUCT_TITLE="Men's Cotton Linen Long Sleeve Casual Shirt" \
DBX_FIRST_PRODUCT_HANDLE="mens-cotton-linen-long-sleeve-casual-shirt" \
DBX_FIRST_PRODUCT_DESCRIPTION="<customer-safe product description>" \
DBX_FIRST_PRODUCT_PRICE_USD_MINOR="1999" \
DBX_FIRST_PRODUCT_COST_USD_MINOR="419" \
DBX_FIRST_PRODUCT_SUPPLIER="cj" \
DBX_FIRST_PRODUCT_SUPPLIER_PRODUCT_ID="2408300732091605000" \
DBX_FIRST_PRODUCT_SUPPLIER_SKU="CJDS212420104DW" \
DBX_FIRST_PRODUCT_SOURCE_URL="https://cjdropshipping.com/product/new-mens-casual-blouse-cotton-linen-shirt-loose-tops-long-sleeve-tee-shirt-spring-autumn-casual-handsome-mens-shirts-p-2408300732091605000.html" \
DBX_FIRST_PRODUCT_IMAGE_URL="https://oss-cf.cjdropshipping.com/product/2024/08/30/07/ada82fd9-6efb-4629-86e8-1112d16a7a35.jpg?x-oss-process=image%2Fformat%2Cwebp" \
DBX_FIRST_PRODUCT_STOCK_QTY="32" \
DBX_FIRST_PRODUCT_SHIPPING_COUNTRIES="US" \
DBX_FIRST_PRODUCT_DELIVERY_ESTIMATE="7-15 business days" \
pnpm first-product:seed
```

### Final deployed readiness command

Use Node 20 locally and on Render. The repo has `.nvmrc=20.19.0`, root and Medusa `engines.node >=20 <21`, and Render `NODE_VERSION=20.19.0`. On Windows, run `nvm install 20.19.0 && nvm use 20.19.0` before validation; do not use Node 24 for Medusa production builds.

```bash
FIRST_SALE_PRODUCTION_READINESS=true \
EXPECT_SUPPLIER=cj \
MEDUSA_BASE_URL=https://dbaronx-medusa-xrwh.onrender.com \
WEB_BASE_URL=<current-web-storefront-url> \
MEDUSA_PUBLISHABLE_KEY='<publishable key if required>' \
REDIS_URL='<Render Redis/Key Value internal URL or equivalent>' \
MEDUSA_PRODUCTION_SESSION_STORE_READY='<true only after a production-safe Medusa session store is configured/proven>' \
pnpm first-sale:readiness
```

Optional proof flags may be supplied only after evidence exists:

```bash
TELEGRAM_READINESS_REQUIRED=true \
BOT_PUBLIC_BASE_URL='<deployed Telegram bot public base URL>' \
STRIPE_TEST_CHECKOUT_PROOF=true \
STRIPE_SIGNED_WEBHOOK_PROOF=true \
DURABLE_ORDER_PAYMENT_PROOF=true \
pnpm first-sale:readiness
```

### Stripe, webhook, order, and Telegram proof requirements

- Stripe test checkout proof: complete a `cs_test_*` Checkout Session for the seeded product and confirm the checkout path was not blocked before payment.
- Signed webhook proof: confirm the Stripe Dashboard test webhook posts a valid signed `checkout.session.completed` event to the deployed webhook endpoint.
- Durable order/payment proof: confirm the durable order/payment record exists after webhook processing and can be read by the API/status path.
- Telegram customer journey proof: run the Telegram customer first-checkout journey smoke against deployed URLs and confirm `/products`, `/product <handle_or_id>`, `/checkout_help`, `/payment_status`, and `/order_status` remain customer-safe and read-only.

### No-go conditions before a real customer

Do not send a real customer if any final closure blocker remains, including `NODE_RUNTIME_MUST_BE_20_X`, `MEDUSA_PRODUCTION_REDIS_REQUIRED`, `MEDUSA_PRODUCTION_SESSION_STORE_REQUIRED`, product image missing/unsafe, stock not positive, shipping country missing, delivery estimate missing/unsafe, cart/add-to-cart failure, shipping option invisibility, Stripe test checkout proof missing, signed webhook proof missing, durable order/payment proof missing, or Telegram ops proof missing when Telegram is part of the launch path.

Redis is already supported by `apps/medusa/medusa-config.ts` through `REDIS_URL` for Medusa cache and event bus. Local/dev may still use Medusa fallback behavior, but production readiness must not treat fake Redis as safe. The current Medusa session-store warning is not safely fixed here without deeper Medusa session integration; therefore final production readiness explicitly blocks on `MEDUSA_PRODUCTION_SESSION_STORE_REQUIRED` until a production-safe session store is configured and proven.

## First controlled sale security ladder

The first controlled sale uses the dBaronX risk-based ladder without delaying a normal buyer checkout:

- **Low-risk buyer checkout:** invisible or low-friction bot protection when available; CAPTCHA is optional unless `CAPTCHA_REQUIRED_FOR_CHECKOUT=true`.
- **Medium-risk watch/ad reward confirmation:** CAPTCHA is required by default with `CAPTCHA_REQUIRED_FOR_WATCH_REWARD=true` because reward abuse creates direct economic exposure.
- **High-risk admin, seller, supplier, advertiser, payout, wallet, DBX token, crowdfunding, and destructive actions:** existing admin/internal controls remain required now; MFA/passkey step-up is phase-two and must not be claimed production-ready until real TOTP/passkey implementation, config, and tests exist.
- **Critical actions after first sale:** passkey plus authenticator/TOTP plus risk review is the target phase-two posture.

### CAPTCHA provider contract

FastAPI is the server-side verification brain for CAPTCHA/risk checks. hCaptcha remains supported and can carry the first sale by itself. Cloudflare Turnstile is optional primary bot protection when configured.

Use these environment variables without committing real secrets:

```bash
HCAPTCHA_SECRET=
TURNSTILE_SECRET_KEY=
TURNSTILE_SITE_KEY=
CAPTCHA_PRIMARY=hcaptcha      # hcaptcha or turnstile
CAPTCHA_FALLBACK=turnstile    # turnstile or hcaptcha
CAPTCHA_REQUIRED_FOR_CHECKOUT=false
CAPTCHA_REQUIRED_FOR_WATCH_REWARD=true
MFA_REQUIRED_FOR_ADMIN=true
PASSKEYS_ENABLED=false
```

If `TURNSTILE_SECRET_KEY` is missing, first sale must still proceed when `HCAPTCHA_SECRET` is configured. If `HCAPTCHA_SECRET` is configured and Turnstile is not, hCaptcha is the active first-sale provider/fallback. Do not force both providers on every normal user action.

### Required before first sale

- Keep the selected CJ product seeding path intact for supplier product `2408300732091605000` / SKU `CJDS212420104DW`.
- Keep hCaptcha configured in the FastAPI environment, or leave checkout CAPTCHA optional with `CAPTCHA_REQUIRED_FOR_CHECKOUT=false` for the controlled buyer checkout.
- Keep Stripe checkout and signed webhook proof as the source of truth for payment state.
- Keep Telegram money, fulfillment, payout, wallet, reward, and supplier mutation actions read-only or blocked unless protected by existing admin/internal controls.

### No-go conditions

- `CAPTCHA_REQUIRED_FOR_CHECKOUT=true` while neither `HCAPTCHA_SECRET` nor `TURNSTILE_SECRET_KEY` is configured.
- Any buyer checkout flow that requires passkeys/TOTP before the first controlled sale.
- Any claim that passkeys/TOTP are production-ready without real implementation, environment configuration, and tests.
- Any Medusa change that moves dBaronX economic/risk business logic into commerce-only code.

### Phase two after first sale

After the first controlled sale, implement and test real MFA/passkey step-up for admin, seller, supplier, advertiser, payout, wallet, DBX token, crowdfunding, and destructive actions. Until that work exists, readiness output must warn with `MFA_PASSKEY_REQUIRED_FOR_ADMIN_PHASE_TWO` rather than pretending the controls are complete.

## Render-safe one-command CJ first-shirt seed closure

Use this closure for the selected first CJ product only:

- title: `Men's Cotton Linen Long Sleeve Casual Shirt`
- handle: `mens-cotton-linen-long-sleeve-casual-shirt`
- supplier product ID: `2408300732091605000`
- supplier SKU: `CJDS212420104DW`
- selling price: `1999` USD minor units
- supplier cost: `419` USD minor units
- stock quantity: `32`
- shipping country: `US`
- delivery estimate: `7-15 business days`

Do **not** seed this product from a laptop by copying Render's internal `DATABASE_URL`. Render internal database hostnames are only reachable from Render private networking, and copying them into a local terminal also increases secret-exposure risk. Run the seed inside the Render Medusa service process by temporarily changing that service's Start Command.

Print the exact operator commands without secrets:

```bash
pnpm first-product:render-seed-command
```

Render Web Services must bind an HTTP port quickly during deploy. Seed/import commands must therefore remain job-only and must not be embedded in the Web Service Start Command. Run the first-shirt seed through `Medusa First Product Seed`, Render one-off job, or Render shell, then keep this normal server-only command:

```bash
pnpm --filter @dbaronx/medusa run start
```

Readiness command after restoring the normal start command and redeploying/restarting Medusa:

```bash
EXPECT_SUPPLIER=cj MEDUSA_BASE_URL=https://dbaronx-medusa-xrwh.onrender.com API_BASE_URL=https://dbaronx-api-unified-qo2j.onrender.com FASTAPI_BASE_URL=https://dbaronx-fastapi-5ci9.onrender.com BOT_BASE_URL=https://dbaronx-telegram-bot.onrender.com WEB_BASE_URL=<current-web-storefront-url> pnpm first-product:readiness
```

The seed confirmation JSON must include `success`, `mode`, `productId`, `variantId`, `handle`, `title`, `supplier`, `supplierProductId`, `supplierSku`, `sourceUrlPresent`, `imageUrlPresent`, `realSupplierProduct`, `demo`, `supplierVerificationStatus`, `stockQty`, `priceAmount`, `supplierCostAmount`, `supplierCostCurrency`, `shippingCountries`, `deliveryEstimate`, and `nextManualStep`. Treat missing IDs, missing image/source booleans, `demo: true`, `realSupplierProduct: false`, or any non-`verified_for_checkout` publish result as a blocker for customer checkout.

After seed readiness passes, run first transaction smokes in this order:

1. `pnpm first-product:readiness`
2. `pnpm first-product:visible-checkout` (static) or `DBX_FIRST_CJ_VISIBLE_SMOKE_LIVE=true EXPECT_SUPPLIER=cj MEDUSA_BASE_URL=https://dbaronx-medusa-xrwh.onrender.com WEB_BASE_URL=<current-web-storefront-url> MEDUSA_PUBLISHABLE_KEY='<full publishable key>' pnpm first-product:visible-checkout` (runtime)
3. `pnpm first-sale:readiness`
4. `node scripts/e2e-telegram-customer-first-checkout-journey-smoke.mjs`
5. `node scripts/e2e-first-transaction-with-telegram-ops-smoke.mjs`
6. `node scripts/e2e-first-stripe-test-transaction-smoke.mjs`

If a database URL, CJ access token, Telegram token, Stripe secret, Supabase service role key, or any other production secret was pasted into a local shell, ticket, chat, or log while attempting the seed, rotate that credential before inviting a real customer to checkout.

## Post-seed CJ product verification checklist

After the job-only first product seed and normal Medusa restart, verify the exact first product through the Store API and storefront before sending any buyer to checkout:

1. Run `EXPECT_SUPPLIER=cj MEDUSA_BASE_URL=https://dbaronx-medusa-xrwh.onrender.com API_BASE_URL=https://dbaronx-api-unified-qo2j.onrender.com FASTAPI_BASE_URL=https://dbaronx-fastapi-5ci9.onrender.com BOT_BASE_URL=https://dbaronx-telegram-bot.onrender.com WEB_BASE_URL=<current-web-storefront-url> pnpm first-product:readiness`.
2. Confirm the JSON includes `success: true`, `blockers: []`, `realSupplierProductPresent: true`, `verifiedSupplierProductPresent: true`, `supplier: "cj"`, `supplierProductIdPresent: true`, `supplierSkuPresent: true`, `supplierCostPresent: true`, `sourceUrlPresent: true`, `priceReady: true`, `stockReady: true`, `productUrlReady: true`, `checkoutPathReady: true`, `telegramDiscoveryReady: true`, and a concrete `nextManualStep`.
3. Confirm the exact Store API product handle is `mens-cotton-linen-long-sleeve-casual-shirt`, supplier product ID is `2408300732091605000`, supplier SKU is `CJDS212420104DW`, supplier cost currency is `usd`, sale price is `1999` USD minor units, and the image is present.
4. Confirm the product is **not** demo metadata, is `realSupplierProduct: true`, and has `supplierVerificationStatus: "verified_for_checkout"`.
5. Confirm the Store API can create a cart with the selected variant and returns at least one shipping option for the checkout cart. Do not fake stock or shipping readiness.


### Rocket URLs to check after the seed

Open these customer-facing Rocket routes after the normal Medusa start command has been restored and the web app has been deployed:

- `<current-web-storefront-url>/shop` — should show products from the public catalog path and an honest empty state with the attempted endpoint if the catalog is unavailable.
- `<current-web-storefront-url>/products` — should show `Men's Cotton Linen Long Sleeve Casual Shirt` with image, title, price, delivery estimate, and a product link when Medusa returns the seeded product.
- `<current-web-storefront-url>/products/mens-cotton-linen-long-sleeve-casual-shirt` — should preserve existing add-to-cart / checkout guidance and link to the backend-owned checkout/session path; Rocket must not create fake payments or mark orders paid.

CJ bulk automation continues separately with rate-limit-safe small previews (`category=fashion`, `limitPerCategory=5`, `dryRun=true`). Do not wait for bulk automation before validating this controlled Medusa-seeded shirt, and do not treat bulk-preview data as customer-buyable until it is separately verified and seeded/published.

## First Stripe test checkout checklist

Use Stripe test mode before live money:

1. Run the controlled first Stripe smoke with deployed URLs and the internal token available only in the shell/runtime environment, never pasted into docs or chat:

   ```bash
   MEDUSA_URL=https://dbaronx-medusa-xrwh.onrender.com \
   API_URL=https://dbaronx-api-unified-qo2j.onrender.com \
   WEB_BASE_URL=<current-web-storefront-url> \
   node scripts/e2e-first-stripe-test-transaction-smoke.mjs
   ```

2. Confirm the smoke creates the checkout session only through `/api/checkout/stripe/session` or `/api/v1/checkout/stripe/session`, returns a `https://checkout.stripe.com/` URL, detects a `cs_test_*` session, proves the signed webhook route is reachable, and confirms unsigned webhook attempts are rejected.
3. Open the Stripe-hosted test checkout URL and pay with Stripe test-card credentials only.
4. Run `node scripts/e2e-stripe-post-payment-settlement-smoke.mjs` with the returned checkout/session/order reference to verify signed webhook settlement handling and durable payment/order lookup.
5. Do not mark paid, fulfill, credit wallets, or approve payouts from Telegram, Medusa metadata, browser state, or manual database edits. Payment is proven only by signed Stripe webhook evidence and durable backend records.

## Deployment order before first live buyer

1. Deploy Medusa with the server-only start command `pnpm --filter @dbaronx/medusa run start`; run the selected CJ seed only through the `Medusa First Product Seed` GitHub Action or a Render one-off job/shell.
2. Deploy Web so `/products` and `/products/mens-cotton-linen-long-sleeve-casual-shirt` resolve to the Store API-backed storefront surfaces.
3. Deploy NestJS/API with Stripe checkout session and signed webhook routes configured.
4. Deploy Telegram bot after customer-discovery docs/commands match the storefront route.
5. Run first-product readiness, first-sale readiness, Telegram journey smoke, first-transaction-with-ops smoke, first Stripe test transaction smoke, and post-payment settlement smoke.
6. Rotate the Medusa database password before live money if an old `DATABASE_URL` was exposed in a local shell, ticket, chat, logs, or screenshots during seed attempts.

## Controlled verified CJ product batch (no bulk sync)

Use this path only for **2–4 manually verified CJ products**. Do not bulk import, scrape, or call CJ API from seed scripts.

### How to choose extra CJ products

- Pick products with stable listing pages (`sourceUrl`) and accessible images.
- Confirm supplier is CJ and capture `supplierProductId` + `supplierSku` exactly.
- Avoid restricted/sensitive categories until legal/compliance review is complete.

### Product verification checklist

- Required fields: `title`, `handle`, `description`, `priceMinor`, `costMinor`, `supplier=cj`, `supplierProductId`, `supplierSku`, `sourceUrl`, `imageUrl`, `stockQty>0`, `shippingCountries`, `deliveryEstimate`.
- No demo words in customer-facing content: `demo`, `mock`, `sample`, `test`.
- Metadata must be set exactly:
  - `realSupplierProduct: true`
  - `demo: false`
  - `supplierVerificationStatus: verified_for_checkout`
  - `supplierVerificationBlockers: []`

### Cost / price / margin check

- Validate cost in USD minor units (`supplierCostAmount` / `costMinor`).
- Validate selling price in USD minor units (`priceMinor`).
- Reject negative/zero cost or price; verify target margin before publish.

### Stock / shipping check

- Require positive stock quantity proof before seed.
- Require shipping countries and delivery estimate before seed.
- Keep Telegram wording as guidance only; do not promise fulfillment beyond verified data.

### Seed command

```bash
DBX_CONFIRM_CJ_PRODUCT_BATCH_SEED=true pnpm first-products:seed:cj-batch
```

### Readiness command

```bash
pnpm first-products:readiness
```

### Warning

Bulk CJ sync is **not enabled** yet. Manual controlled verification remains mandatory.

## CJ onboarding + Telegram approval controls
- Product onboarding now follows file-batch validation and explicit admin approval before publish.
- Fulfillment admin routes: POST /api/admin/fulfillment/tasks/:id/approve-cj and /disapprove-cj (InternalAuthGuard).
- Dry-run remains default for CJ ordering. Live placement requires DBX_ENABLE_CJ_AUTO_ORDER=true and DBX_CONFIRM_CJ_ORDER_PLACEMENT=true plus admin approval record.
- Keep refunds/voids manual unless a real payment refund endpoint succeeds.

## Medusa Web Service start command policy (no startup seeding)

The Medusa Render Web Service Start Command must only start the HTTP server so Render can detect the open port quickly:

```bash
pnpm --filter @dbaronx/medusa run start
```

Run shipping/commerce readiness checks as explicit jobs after deployment, not in the Web Service Start Command.

Seed/import scripts are job-only. The first known CJ product seed must run through the `Medusa First Product Seed` GitHub Action, a Render one-off job, or Render shell command, not the Web Service Start Command:

```bash
DBX_CONFIRM_CJ_FIRST_PRODUCT_SEED=true pnpm --filter @dbaronx/medusa run first-product:seed:cj-shirt
```

This lets first-product visibility and checkout testing proceed while bulk CJ onboarding continues through the safe operator workflow. The next safe CJ automation run is:

```text
mode=preview
category=fashion
limitPerCategory=5
dryRun=true
```

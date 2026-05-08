# Live Stripe + Supplier Checkout (dbaronx.com)

## DNS map
- web: `https://dbaronx.com`
- api: `https://dbaronx-api-unified.onrender.com`
- commerce (Medusa): `https://dbaronx-medusa.onrender.com`
- fastapi: configured separately as the intelligence/risk layer; it is not part of Stripe settlement.

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

- `STRIPE_SECRET_KEY` must be a Stripe **test** secret key for the first controlled checkout. It is the only key used by NestJS to create hosted Checkout Sessions.
- `STRIPE_WEBHOOK_SECRET` must be the Stripe Dashboard signing secret for `POST /api/checkout/stripe/webhook`.
- `INTERNAL_SERVICE_TOKEN` is server-only and is used by internal readiness/order preview probes.
- `CJ_ACCESS_TOKEN` is optional for the Stripe-only smoke but required for CJ supplier live probe readiness.
- `CJ_API_BASE_URL` should remain `https://developers.cjdropshipping.com/api2.0`.

### Web Render service / browser-safe values
Set these on the web service with public/test values only.

```dotenv
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=
NEXT_PUBLIC_API_BASE_URL=https://dbaronx-api-unified.onrender.com
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://dbaronx-medusa.onrender.com
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=
```

The web app must never receive `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CJ_ACCESS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, or the internal service token.

## Stripe Dashboard webhook setup
1. Open Stripe Dashboard with **Test mode** enabled.
2. Go to **Developers → Webhooks → Add endpoint**.
3. Enter `https://dbaronx-api-unified.onrender.com/api/checkout/stripe/webhook`.
4. Select `checkout.session.completed`.
5. Save the endpoint and copy the signing secret into the API service as `STRIPE_WEBHOOK_SECRET`.
6. Redeploy/restart the API service so the env var is loaded.
7. Keep test-mode and live-mode webhook endpoints/secrets separate.

The NestJS endpoint verifies the raw body and `stripe-signature` header with `Stripe.webhooks.constructEvent(payload, sigHeader, STRIPE_WEBHOOK_SECRET)`. Unsigned, missing-secret, or invalid-signature calls must return `verified: false`, `paymentMarkedPaid: false`, and no paid/order settlement.

## Checkout flow contract
- NestJS remains the payment/economic brain and calls `stripe.checkout.sessions.create(...)`.
- Medusa remains the commerce engine for products, regions, carts, line items, and shipping options.
- FastAPI remains the intelligence/risk layer and is not allowed to mark Stripe payments paid.
- NestJS returns `sessionId` and `checkoutUrl` only after the Stripe API succeeds.
- If `STRIPE_SECRET_KEY` is missing, NestJS returns `stripe_secret_key_missing` with `checkoutUrl: null` and `sessionId: null`.
- Browser redirects are not trusted as payment proof.
- Paid/settled state can only be attached after a verified Stripe webhook event.
- Verified `checkout.session.completed` currently returns `paymentMarkedPaid: false` with `settlement_pending` until durable order/payment settlement is connected.


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

PowerShell live smoke environment:

```powershell
$env:API_URL="https://dbaronx-api-unified.onrender.com"
$env:MEDUSA_URL="https://dbaronx-medusa.onrender.com"
$env:MEDUSA_PUBLISHABLE_KEY="<publishable-key>"
$env:NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY="<publishable-key>"
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
MEDUSA_URL=https://dbaronx-medusa.onrender.com \
API_URL=https://dbaronx-api-unified.onrender.com \
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
  "webhookEndpointReady": true,
  "unsignedWebhookRejected": true,
  "paymentMarkedPaid": false,
  "orderSyncReady": false,
  "nextManualStep": "Open https://checkout.stripe.com/... only when sessionId starts with cs_test_; complete Stripe Checkout with test card 4242 4242 4242 4242; verify checkout.session.completed reaches https://dbaronx-api-unified.onrender.com/api/checkout/stripe/webhook."
}
```

`orderSyncReady` remains `false` until durable DBX payment-record lookup and Medusa order completion settlement are connected. That is intentional: the smoke proves the mapping boundary and prevents fake paid/order-complete state.

## First controlled manual Stripe test checkout
1. Confirm the smoke returns `checkoutSessionCreated: true`, `checkoutUrlPresent: true`, `unsignedWebhookRejected: true`, and `paymentMarkedPaid: false`.
2. Open the returned Stripe hosted `checkoutUrl`.
3. Only for `cs_test_*` sessions, use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC, and a valid billing ZIP. For `cs_live_*`, stop and reconfigure test-mode Stripe secrets.
4. After the hosted checkout succeeds, open Stripe Dashboard → Developers → Webhooks → the configured endpoint.
5. Confirm a `checkout.session.completed` delivery reached `POST /api/checkout/stripe/webhook`.
6. Confirm the API response for the verified event is `verified: true`, `paymentMarkedPaid: false`, and includes `settlement_pending` until durable settlement is implemented.

## Remaining steps before live mode
- Replace webhook idempotency placeholder logging with durable event-id storage before any paid-state mutation.
- Attach verified Stripe sessions/payment intents to DBX payment records and the corresponding Medusa cart/order intent.
- Implement idempotent order/payment settlement from verified webhooks only.
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
API_URL=https://dbaronx-api-unified.onrender.com node scripts/e2e-supplier-readiness-smoke.mjs
```

```bash
API_URL=https://dbaronx-api-unified.onrender.com \
INTERNAL_SERVICE_TOKEN=... \
CJ_TEST_PRODUCT_ID=... \
node scripts/e2e-cj-live-probe-smoke.mjs
```

Use `CJ_TEST_SKU` instead of `CJ_TEST_PRODUCT_ID` when validating a SKU. AliExpress remains disabled until official approval is granted; do not configure AliExpress credentials or scrape AliExpress as a substitute for approved API access.

## Remaining steps before live mode
- Configure API `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` with test-mode Stripe values in Render.
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
API_URL=https://dbaronx-api-unified.onrender.com \
INTERNAL_SERVICE_TOKEN= \
node scripts/e2e-supplier-readiness-smoke.mjs
```

CJ live probe and optional first explicit product import-readiness smoke:

```bash
API_URL=https://dbaronx-api-unified.onrender.com \
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

```bash
API_URL=https://dbaronx-api-unified.onrender.com \
MEDUSA_URL=https://dbaronx-medusa.onrender.com \
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<publishable-key> \
node scripts/e2e-first-stripe-test-transaction-smoke.mjs
```

Route contract used by the smoke:

- API readiness is trusted when any one of these returns HTTP 200: `GET /api/health`, `GET /health`, `GET /api/payments/readiness`, `GET /api/system/runtime-contract`, or `GET /api/system/deployment-readiness`. Missing `/api/health` alone is not a blocker when a trusted readiness endpoint returns 200.
- Payment readiness uses `GET /api/payments/readiness` first and only falls back to `GET /api/v1/payments/readiness` after a canonical 404.
- Economic readiness uses `GET /api/payments/economic-readiness` first and only falls back to `GET /api/v1/payments/economic-readiness` after a canonical 404.
- Stripe session creation uses `POST /api/checkout/stripe/session` first and only falls back to `POST /api/v1/checkout/stripe/session` after a canonical 404.
- Unsigned webhook safety uses `POST /api/checkout/stripe/webhook` first and only falls back to `POST /api/v1/checkout/stripe/webhook` after a canonical 404.
- Order sync preview uses `POST /api/checkout/stripe/order-sync-preview` first and only falls back to `POST /api/v1/checkout/stripe/order-sync-preview` after a canonical 404.
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

The smoke must keep `shippingOptionReady: false` when the Store API returns no real `shipping_options` and must report `shipping_option_store_visibility_missing`; it must never fake `dBaronX Standard Delivery` readiness.

Only open `checkoutUrl` when the smoke reports all of the following: no checkout blockers, `checkoutSessionCreated: true`, `checkoutUrl` begins with `https://checkout.stripe.com/`, `unsignedWebhookRejected: true`, `paymentMarkedPaid: false`, and `sessionId` begins with `cs_test_`. Use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC, and any postal code. Frontend redirect success is only a browser navigation result; it is not proof of payment and must not mark an order paid. Paid/order settlement may move only from a signed, verified Stripe webhook and the durable settlement path.

## Controlled Stripe test-mode guard (May 2026)

Controlled first-transaction smokes must create Stripe **test-mode** Checkout Sessions. A valid controlled test session has a `sessionId` beginning with `cs_test_`; only that mode may be used with Stripe test cards such as `4242 4242 4242 4242`.

A `sessionId` beginning with `cs_live_` is live-money mode. Do **not** open or pay a `cs_live_*` Checkout URL for test-card validation. If the first Stripe smoke returns `stripeSessionModeDetected: "live"`, the smoke reports `stripe_live_session_returned_for_test_smoke` and the manual step is: “Do not open/pay this live session for test-card validation. Configure `STRIPE_SECRET_KEY=sk_test_...` and `STRIPE_WEBHOOK_SECRET` from a test webhook endpoint, redeploy, and rerun.”

The API also rejects a request with `checkoutMode: "test"` when the configured Stripe key is detected as live mode, returning the blocker `stripe_live_key_used_for_test_checkout`. Legitimate live checkout remains supported for explicit `checkoutMode: "live"`; `ALLOW_LIVE_STRIPE_CHECKOUT_FOR_SMOKE=true` is only an explicit smoke override and must not be used for controlled test-card validation.

## Shipping option Store API visibility requirement

The first Stripe smoke only reports `shippingOptionReady: true` when `GET /store/shipping-options?cart_id=<cart_id>` returns at least one real shipping option ID after a US shipping address is set on the cart. If Medusa returns HTTP 200 with an empty `shipping_options` array, the blocker is `shipping_option_store_visibility_missing`.

Run the Medusa repair/diagnostic before rerunning controlled checkout smoke:

```bash
pnpm --filter @dbaronx/medusa shipping:visibility:diagnose
```

The diagnostic verifies/repairs the US service zone, fulfillment provider linkage, stock location/sales-channel coverage, shipping profile, flat USD shipping-option price, and removes shipping-option rules that block Store API context visibility.

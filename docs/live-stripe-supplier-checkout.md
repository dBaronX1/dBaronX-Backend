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

- `STRIPE_SECRET_KEY` must be a Stripe **test** secret key (`sk_test_*`) for the first controlled checkout. It is the only key used by NestJS to create hosted Checkout Sessions.
- `STRIPE_WEBHOOK_SECRET` must be the Stripe Dashboard signing secret (`whsec_*`) copied from the **same Stripe test-mode webhook endpoint** used for the controlled checkout; a webhook destination ID (`we_*`) is not a signing secret. Do not mix live and test keys or webhook secrets.
- `INTERNAL_SERVICE_TOKEN` is server-only and is used by internal readiness/order preview probes.
- `CJ_ACCESS_TOKEN` is optional for the Stripe-only smoke but required for CJ supplier live probe readiness.
- `CJ_API_BASE_URL` should remain `https://developers.cjdropshipping.com/api2.0`.

### Web Render service / browser-safe values
Set these on the web service with public/test values only. The first controlled checkout must use a `pk_test_*` publishable key that belongs to the same Stripe account/mode as the API `sk_test_*` secret key.

```dotenv
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=
NEXT_PUBLIC_API_BASE_URL=https://dbaronx-api-unified.onrender.com
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://dbaronx-medusa.onrender.com
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=
```

The web app must never receive `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CJ_ACCESS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, or the internal service token.

## Stripe mode and controlled-test guard

`NODE_ENV=production` does **not** determine whether Stripe creates test-mode or live-mode Checkout Sessions. Stripe mode is determined by the configured key prefixes:

- `sk_test_*` creates test-mode Checkout Sessions such as `cs_test_*`.
- `sk_live_*` creates live-mode Checkout Sessions such as `cs_live_*`.
- Any other secret-key prefix is treated as `unknown` and must be corrected before relying on the result.

The first controlled Stripe checkout requires all Stripe values to be test-mode values from the same Stripe environment: `STRIPE_SECRET_KEY=sk_test_*` on the API service, `NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_*` on the web service, and `STRIPE_WEBHOOK_SECRET=whsec_*` from the matching test-mode webhook endpoint. Do not mix `sk_live_*`, `pk_test_*`, or a live `whsec_*` in one controlled test run. If a controlled test request asks for `checkoutMode: "test"` while the API has an `sk_live_*` secret key, the API must block Checkout Session creation with `stripe_live_key_used_for_test_checkout` and must not return a `checkoutUrl` or `sessionId`.

Live checkout is still supported for future production use, but it must be explicitly requested with `checkoutMode: "live"` and the API environment must set `ALLOW_LIVE_STRIPE_CHECKOUT` to `true`. Without that explicit allowance, readiness reports `stripe_live_key_present_without_live_checkout_allowance` when an `sk_live_*` key is present.

Never use a Stripe test card on a `cs_live_*` session. A smoke output containing `cs_live_*` is a blocker for the controlled test and must be fixed by replacing Render API/Web Stripe keys with `sk_test_*` / `pk_test_*`, redeploying, and rerunning the smoke.

## Stripe Dashboard webhook setup
1. Open Stripe Dashboard with **Test mode** enabled for the controlled test.
2. Go to **Developers → Webhooks → Add endpoint**.
3. Enter the exact dBaronX API endpoint URL: `https://dbaronx-api-unified.onrender.com/api/checkout/stripe/webhook`.
4. Select `checkout.session.completed`.
5. Save the endpoint and copy the `whsec_*` signing secret from that same test webhook endpoint into the API service as `STRIPE_WEBHOOK_SECRET`.
6. Do not use the webhook destination ID (`we_*`) as `STRIPE_WEBHOOK_SECRET`; `we_*` identifies the destination, while `whsec_*` verifies signatures.
7. Do not use the Supabase project URL as the direct Stripe webhook URL unless an explicit Supabase Edge Function relay is intentionally built, deployed, and documented. The canonical direct webhook destination is `https://dbaronx-api-unified.onrender.com/api/checkout/stripe/webhook`.
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

If `MEDUSA_PUBLISHABLE_KEY` or `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` is still `<MEDUSA_PUBLISHABLE_KEY>` or contains angle brackets, the smoke reports `medusa_publishable_key_placeholder_not_replaced`. If the value starts with or contains Stripe key material such as `pk_test_`, `pk_live_`, `sk_test_`, `sk_live_`, or `whsec_`, the smoke reports `medusa_publishable_key_looks_like_stripe_key`. If Medusa responds with `A valid publishable key is required`, the smoke reports `medusa_publishable_key_invalid`. The key is never printed; the only key diagnostics are `medusaPublishableKeyPresent`, `medusaPublishableKeySource`, `medusaPublishableKeyShape`, and `medusaPublishableKeyRejectedByStoreApi`.

PowerShell live smoke environment:

```powershell
$env:API_URL="https://dbaronx-api-unified.onrender.com"
$env:MEDUSA_URL="https://dbaronx-medusa.onrender.com"
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

First controlled transaction proof smoke:

```bash
MEDUSA_URL=https://dbaronx-medusa.onrender.com \
API_URL=https://dbaronx-api-unified.onrender.com \
WEB_BASE_URL=https://dbaronx.com \
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
  "stripeWebhookUrlExpected": "https://dbaronx-api-unified.onrender.com/api/checkout/stripe/webhook",
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
   MEDUSA_URL=https://dbaronx-medusa.onrender.com \
   API_URL=https://dbaronx-api-unified.onrender.com \
   WEB_BASE_URL=https://dbaronx.com \
   INTERNAL_SERVICE_TOKEN= \
   node scripts/e2e-first-stripe-test-transaction-smoke.mjs
   ```

2. Confirm the smoke returns `checkoutSessionCreated: true`, `checkoutUrlPresent: true`, `stripeSecretKeyMode: "test"`, a `cs_test_*` session ID, `shippingOptionReady: true`, `unsignedWebhookRejected: true`, `paymentMarkedPaid: false`, and no checkout blockers.
3. Open only the returned `cs_test_*` Stripe hosted `checkoutUrl`. If the session is `cs_live_*`, stop and reconfigure test-mode Stripe secrets.
4. Pay with Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC, and a valid billing ZIP.
5. Open Stripe Dashboard with **Test mode** enabled, then go to **Developers → Webhooks → the configured endpoint** and confirm a `checkout.session.completed` delivery reached `POST /api/checkout/stripe/webhook`. The API must reject unsigned webhook calls and must only write paid evidence after Stripe signature verification succeeds.
6. Run the post-payment settlement smoke against the read-only settlement lookup endpoint:

   ```bash
   API_URL=https://dbaronx-api-unified.onrender.com \
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
   API_URL=https://dbaronx-api-unified.onrender.com \
   STRIPE_SESSION_ID=cs_test_... \
   node scripts/e2e-stripe-post-payment-settlement-smoke.mjs
   ```

   ```bash
   API_URL=https://dbaronx-api-unified.onrender.com \
   STRIPE_EVENT_ID=evt_... \
   node scripts/e2e-stripe-post-payment-settlement-smoke.mjs
   ```

   ```bash
   API_URL=https://dbaronx-api-unified.onrender.com \
   PAYMENT_INTENT_ID=pi_... \
   node scripts/e2e-stripe-post-payment-settlement-smoke.mjs
   ```

   ```bash
   API_URL=https://dbaronx-api-unified.onrender.com \
   CHARGE_ID=ch_... \
   node scripts/e2e-stripe-post-payment-settlement-smoke.mjs
   ```

   ```bash
   API_URL=https://dbaronx-api-unified.onrender.com \
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

```powershell
$env:API_URL = "https://dbaronx-api-unified.onrender.com"
$env:MEDUSA_URL = "https://dbaronx-medusa.onrender.com"
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

A `sessionId` beginning with `cs_live_` is live-money mode. Do **not** open or pay a `cs_live_*` Checkout URL for test-card validation. If the first Stripe smoke returns `stripeSessionModeDetected: "live"`, the smoke reports `stripe_live_session_returned_for_test_smoke` and the manual step is: “Do not open/pay this live session for test-card validation. Configure `STRIPE_SECRET_KEY=sk_test_...` and `STRIPE_WEBHOOK_SECRET` from a test webhook endpoint, redeploy, and rerun.”

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
https://dbaronx-api-unified.onrender.com/api/checkout/stripe/webhook
```

### Stripe Dashboard test webhook setup

1. Open Stripe Dashboard with **Test mode** enabled.
2. Navigate to **Developers → Webhooks → Add endpoint**.
3. Use exactly `https://dbaronx-api-unified.onrender.com/api/checkout/stripe/webhook` as the endpoint URL.
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

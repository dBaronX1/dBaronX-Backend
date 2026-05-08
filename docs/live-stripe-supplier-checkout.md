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
- `POST /api/checkout/stripe/session`
- `POST /api/checkout/stripe/webhook`

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
  "nextManualStep": "Open https://checkout.stripe.com/... and complete Stripe Checkout with test card 4242 4242 4242 4242; verify checkout.session.completed reaches https://dbaronx-api-unified.onrender.com/api/checkout/stripe/webhook."
}
```

`orderSyncReady` remains `false` until durable DBX payment-record lookup and Medusa order completion settlement are connected. That is intentional: the smoke proves the mapping boundary and prevents fake paid/order-complete state.

## First controlled manual Stripe test checkout
1. Confirm the smoke returns `checkoutSessionCreated: true`, `checkoutUrlPresent: true`, `unsignedWebhookRejected: true`, and `paymentMarkedPaid: false`.
2. Open the returned Stripe hosted `checkoutUrl`.
3. Use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC, and a valid billing ZIP.
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

## Live unified payment rail smoke

Canonical Render command:

```bash
MEDUSA_URL=https://dbaronx-medusa.onrender.com \
API_URL=https://dbaronx-api-unified.onrender.com \
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<publishable-key> \
API_BEARER_TOKEN=<authorized-smoke-jwt-if-needed> \
node scripts/e2e-unified-payment-rail-smoke.mjs
```

Public/client-safe env used by the smoke:

- `MEDUSA_URL` / `MEDUSA_BACKEND_URL`: Medusa store API base URL.
- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` / `MEDUSA_PUBLISHABLE_KEY`: Medusa publishable key for store products, regions, carts, line items, and shipping options.
- `API_URL` / `NESTJS_API_URL`: NestJS API base URL.
- `WEB_BASE_URL` / `NEXT_PUBLIC_WEB_BASE_URL`: redirect base used only for Stripe Checkout success/cancel URLs.

Server-only env required on the API before a controlled Stripe payment:

- `STRIPE_SECRET_KEY`: required for `POST /api/checkout/stripe/session`; missing returns `stripe_secret_key_missing`, `checkoutUrl: null`, and `sessionId: null`.
- `STRIPE_WEBHOOK_SECRET`: required for verified `POST /api/checkout/stripe/webhook`; missing returns `stripe_webhook_secret_missing` and does not mark paid.
- `JWT_SECRET`: required by protected payment mutation routes when `API_BEARER_TOKEN` is used.
- Order sync env such as `MEDUSA_BASE_URL`/`MEDUSA_BACKEND_URL` and `MEDUSA_ADMIN_API_KEY`/`MEDUSA_ADMIN_TOKEN` is required before settlement can complete an order.

Route/auth contract:

- Public safe diagnostics: `GET /api/health`, `GET /api/payments/readiness`, and unsigned/Stripe-signed `POST /api/checkout/stripe/webhook`.
- Protected mutation routes: `POST /api/checkout/stripe/session`, `POST /api/checkout/stripe/order-sync-preview`, and all `POST /api/dbx-payments/...` mutation routes. The smoke sends `Authorization: Bearer <API_BEARER_TOKEN>` when `API_BEARER_TOKEN` is present and reports `authorized_smoke_jwt_missing` when a protected live smoke cannot run without one.

Acceptable blockers before live mode but not before the first controlled payment/order:

- `stripe_event_idempotency_storage_pending`, `settlement_pending`, or `order_sync_not_configured` can be acceptable only before any paid-state mutation is enabled.
- `stripe_secret_key_missing`, `stripe_webhook_secret_missing`, `authorized_smoke_jwt_missing`, and any Medusa cart/line-item/shipping blockers must be fixed before the first controlled Stripe payment.

No-fake-paid-state rule:

- Frontend redirects, unsigned webhooks, fake session IDs, and fake transaction signatures must never mark a payment or order paid.
- Paid state is allowed only after a verified Stripe webhook or verified Solana transaction, with idempotent server-side settlement.

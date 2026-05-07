# Live Stripe + Supplier Checkout (dbaronx.com)

## DNS map
- web: `https://dbaronx.com`
- api: `https://api.dbaronx.com`
- commerce (Medusa): `https://commerce.dbaronx.com`
- fastapi: `https://fastapi.dbaronx.com`

## Required Render environment variables

### NestJS/API Render service only
Set these on the API service. Do not expose them to the browser and do not commit real values.

```dotenv
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PAYSTACK_SECRET_KEY=
INTERNAL_SERVICE_TOKEN=
```

- `STRIPE_SECRET_KEY` creates real Stripe Checkout Sessions from the NestJS payment/business brain. Use `sk_test_...` for controlled test orders and only switch to `sk_live_...` after live-mode approval.
- `STRIPE_WEBHOOK_SECRET` verifies Stripe webhook signatures before any payment/order settlement code is allowed to run.
- `PAYSTACK_SECRET_KEY` remains server-only for Paystack and is unrelated to Stripe Checkout.
- `INTERNAL_SERVICE_TOKEN` remains server-only for internal service calls.

### Web Render service / browser-safe values
Set these on the web service with public/test values only.

```dotenv
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_MEDUSA_BACKEND_URL=
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=
```

- `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` must be the Stripe publishable key matching the mode of `STRIPE_SECRET_KEY` during the test/live phase.
- `NEXT_PUBLIC_API_BASE_URL` should be `https://api.dbaronx.com` on production Render.
- `NEXT_PUBLIC_MEDUSA_BACKEND_URL` should be `https://commerce.dbaronx.com` on production Render.
- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` is the browser-safe Medusa Store API key.

## Stripe webhook URL
Configure the Stripe Dashboard webhook endpoint in **test mode** first:

```text
POST https://api.dbaronx.com/api/v1/checkout/stripe/webhook
```

Required event for the controlled test milestone:

```text
checkout.session.completed
```

The NestJS endpoint reads the raw request body and verifies the `stripe-signature` header with `Stripe.webhooks.constructEvent(payload, sigHeader, STRIPE_WEBHOOK_SECRET)`. Unsigned probes, missing webhook secrets, and invalid signatures must return `verified: false`, `paymentMarkedPaid: false`, and no paid/order settlement.

## Stripe Dashboard webhook setup
1. Open Stripe Dashboard with **Test mode** enabled.
2. Go to **Developers → Webhooks → Add endpoint**.
3. Enter `https://api.dbaronx.com/api/v1/checkout/stripe/webhook`.
4. Select `checkout.session.completed`.
5. Save the endpoint and copy its signing secret into the API service as `STRIPE_WEBHOOK_SECRET`.
6. Redeploy/restart the API service so the env var is loaded.
7. Keep the test webhook endpoint separate from any future live-mode endpoint and secret.

## Checkout flow contract
- The web app calls NestJS to create Checkout Sessions; it never uses `STRIPE_SECRET_KEY`.
- NestJS creates sessions with `stripe.checkout.sessions.create(...)` using `STRIPE_SECRET_KEY` from server env only.
- NestJS accepts safe cart/order/customer metadata and passes `cartId`, `userId`, `orderRef`, `customerRef`, `supplierRefs`, and `orderIntentId` to Stripe metadata when available.
- Amounts are sent to Stripe as real minor-unit amounts supplied by the backend smoke/cart flow.
- NestJS returns `checkoutUrl` and `sessionId` only after the Stripe API succeeds.
- If `STRIPE_SECRET_KEY` is missing, NestJS returns `stripe_secret_key_missing` with `checkoutUrl: null` and `sessionId: null`.
- Browser redirects are not trusted as payment proof.
- Paid/settled state remains protected until a verified Stripe webhook is received.
- The current verified `checkout.session.completed` handler records the event through an idempotency placeholder interface and returns `paymentMarkedPaid: false` with `settlement_pending` until durable order/payment sync is attached.

## Smoke commands

Local services:

```bash
MEDUSA_URL=http://localhost:9000 \
API_URL=http://localhost:3001 \
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<local-publishable-key> \
node scripts/e2e-stripe-controlled-order-smoke.mjs
```

Render test services:

```bash
MEDUSA_URL=https://commerce.dbaronx.com \
API_URL=https://api.dbaronx.com \
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<render-publishable-key> \
node scripts/e2e-stripe-controlled-order-smoke.mjs
```

The legacy command remains a wrapper around the controlled smoke:

```bash
node scripts/e2e-stripe-checkout-session-smoke.mjs
```

## Success JSON examples

### API env-blocked but safe
This is acceptable before `STRIPE_SECRET_KEY` is configured because it proves no fake checkout artifacts or paid state are created.

```json
{
  "success": true,
  "blockers": [],
  "medusaReady": true,
  "cartId": "cart_...",
  "lineItemAdded": true,
  "shippingOptionReady": true,
  "stripeEndpointReady": true,
  "checkoutSessionCreated": false,
  "sessionIdPresent": false,
  "checkoutUrlPresent": false,
  "webhookEndpointReady": true,
  "unsignedWebhookRejected": true,
  "paymentMarkedPaid": false,
  "warnings": ["stripe_secret_key_missing_on_api_server"]
}
```

### Controlled Stripe test checkout ready
This requires API `STRIPE_SECRET_KEY` to be configured with a Stripe test secret key.

```json
{
  "success": true,
  "blockers": [],
  "medusaReady": true,
  "cartId": "cart_...",
  "lineItemAdded": true,
  "shippingOptionReady": true,
  "stripeEndpointReady": true,
  "checkoutSessionCreated": true,
  "sessionIdPresent": true,
  "checkoutUrlPresent": true,
  "webhookEndpointReady": true,
  "unsignedWebhookRejected": true,
  "paymentMarkedPaid": false
}
```

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
API_URL=https://api.dbaronx.com \
INTERNAL_SERVICE_TOKEN= \
node scripts/e2e-supplier-readiness-smoke.mjs
```

CJ live probe and optional first explicit product import-readiness smoke:

```bash
API_URL=https://api.dbaronx.com \
INTERNAL_SERVICE_TOKEN= \
CJ_TEST_PRODUCT_ID= \
CJ_TEST_SKU= \
node scripts/e2e-cj-live-probe-smoke.mjs
```

The supplier readiness endpoint is `GET /api/suppliers/readiness`. It reports safe booleans and blockers without returning raw supplier secrets. Missing CJ env returns `cj_access_token_missing` or `cj_base_url_missing`; invalid/expired tokens return `cj_token_invalid_or_expired`; rate limits return `cj_rate_limited`; network/timeouts return `cj_live_probe_unreachable`. A successful CJ probe sets `cjConfigured: true` and removes the old no-live-probe blocker.

For the first CJ product test, set `CJ_TEST_PRODUCT_ID` or `CJ_TEST_SKU` and call `POST /api/v1/suppliers/cj/import-readiness` with explicit product metadata. The boundary normalizes CJ product metadata, requires minimum economics and shipping fields before `supplierImportReady: true`, does not create a Medusa product automatically, and must not bulk auto-import the CJ catalog.

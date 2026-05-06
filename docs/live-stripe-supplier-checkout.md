# Live Stripe + Supplier Checkout (dbaronx.com)

## DNS map
- web: `https://dbaronx.com`
- api: `https://api.dbaronx.com`
- commerce (Medusa): `https://commerce.dbaronx.com`
- fastapi: `https://fastapi.dbaronx.com`

## Required Render API environment variables
Set these only on the NestJS/API Render service unless marked browser-safe:

- `STRIPE_SECRET_KEY=<server-only Render env>` — required for real Stripe Checkout Session creation. Use a Stripe **test-mode** secret key for the controlled test order milestone.
- `STRIPE_WEBHOOK_SECRET=<server-only Render env>` — required for verified webhook handling from Stripe.
- `NEXT_PUBLIC_STRIPE_PUBLIC_KEY=<STRIPE_TEST_PUBLIC_KEY>` — browser-safe publishable test key for the web app.
- `NEXT_PUBLIC_API_BASE_URL=https://api.dbaronx.com` — browser-safe API base URL for the web app.
- `NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://commerce.dbaronx.com` — browser-safe Medusa Store API base URL.
- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<Medusa publishable key>` — browser-safe Medusa Store API key.
- `INTERNAL_SERVICE_TOKEN=<server-only Render env>` — existing internal API token; do not expose to the browser.

Keep these server secrets as Render placeholders or secret values only. Do not commit real values:

```dotenv
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PAYSTACK_SECRET_KEY=
```

## Stripe webhook URL
Configure the Stripe test-mode webhook endpoint to call:

```text
POST https://api.dbaronx.com/api/v1/checkout/stripe/webhook
```

The NestJS endpoint verifies the `stripe-signature` header with `STRIPE_WEBHOOK_SECRET`. Unsigned local probes and invalid signatures must return `paymentMarkedPaid: false` and must not create paid state.

## Local smoke commands
Run the smoke against local services:

```bash
MEDUSA_URL=http://localhost:9000 \
API_URL=http://localhost:3001 \
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<local-publishable-key> \
node scripts/e2e-stripe-checkout-session-smoke.mjs
```

Run the smoke against Render test services:

```bash
MEDUSA_URL=https://commerce.dbaronx.com \
API_URL=https://api.dbaronx.com \
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<render-publishable-key> \
node scripts/e2e-stripe-checkout-session-smoke.mjs
```

## What success looks like
A successful readiness smoke shows:

- Medusa Store API product retrieval returns HTTP 200 and at least one product variant.
- Cart creation returns a real Medusa cart ID.
- Line-item add returns a successful Store API response.
- Shipping options are available for the cart.
- NestJS `POST /api/v1/checkout/stripe/session` is reachable.
- If `STRIPE_SECRET_KEY` is configured on the API server, the Stripe response contains a real `sessionId` and a `checkoutUrl` hosted by `https://checkout.stripe.com/`.
- If `STRIPE_SECRET_KEY` is missing, the response is explicitly env-blocked with `stripe_secret_key_missing` and contains no checkout URL or session ID.
- NestJS `POST /api/v1/checkout/stripe/webhook` exists.
- Unsigned webhook probes are not verified and return `paymentMarkedPaid: false`.

## Stripe checkout flow contract
- The web app asks NestJS to create a Checkout Session; it does not call Stripe with a secret key.
- NestJS creates Checkout Sessions with `stripe.checkout.sessions.create(...)` using `STRIPE_SECRET_KEY` from server env only.
- NestJS returns `checkoutUrl` and `sessionId` only after the Stripe API call succeeds.
- Browser redirects are not trusted as payment proof.
- Paid/settled state is reserved for verified Stripe webhook events only.
- The current `checkout.session.completed` handler verifies the event and prepares an idempotent settlement hook path; it intentionally does not fake paid state before the durable order/payment sync is attached.

## What remains before real payment/live mode
- Add the durable NestJS order/payment sync that consumes verified `checkout.session.completed` events idempotently.
- Attach the verified Stripe session/payment intent to the corresponding Medusa cart/order intent and DBX payment record.
- Add operational replay/idempotency storage for Stripe event IDs before live mode.
- Run a controlled Stripe test order through the hosted Checkout URL and verify the webhook delivery in Stripe Dashboard.
- Switch from Stripe test keys to live keys only after the controlled test order, supplier dry-run validation, refund path, and monitoring are complete.

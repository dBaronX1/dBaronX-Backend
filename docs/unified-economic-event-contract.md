# Unified economic event contract

NestJS remains the economic/payment brain. Medusa remains the commerce/order engine, and FastAPI remains the risk/intelligence layer.

## Stripe payment verification event

Verified Stripe Checkout settlement emits the canonical economic event only after `Stripe.webhooks.constructEvent(...)` verifies the webhook signature:

```json
{
  "eventType": "commerce.checkout.payment_verified",
  "sourceModule": "commerce",
  "paymentRail": "stripe",
  "status": "verified",
  "direction": "credit",
  "metadata": {
    "verifierEvidence": {
      "verifier": "stripe",
      "reference": "<stripe_event_id_or_payment_intent>",
      "verifiedAt": "<event_timestamp_or_now>"
    }
  }
}
```

`direction: credit` is used because the commerce module is recording verified inbound checkout value. Customer/wallet debits remain a separate ledger concern and must not be inferred from an unsigned browser redirect.

## Verification lifecycle

1. Checkout Session creation returns a real Stripe-hosted Checkout URL only.
2. Browser redirects never mark paid.
3. Webhook payload and `stripe-signature` are verified with `Stripe.webhooks.constructEvent(...)`.
4. Missing/invalid signatures return `verified: false` and `paymentMarkedPaid: false`.
5. `checkout.session.completed` extracts session id, payment intent id, amount, currency, and cart/order metadata.
6. Stripe event id is persisted as the durable idempotency key.
7. The economic event is validated and persisted.
8. Medusa order sync readiness is evaluated from the Stripe metadata.

## Idempotency requirement

`app_public.stripe_webhook_events.event_id` is the idempotency boundary. The same Stripe event id must not be processed twice. A duplicate verified event is safe and returns `already_processed` without creating another economic event.

If the idempotency store is missing or unhealthy, responses include `stripe_event_idempotency_store_not_configured` or `stripe_event_idempotency_store_unhealthy`, and the API must not claim final settlement.

## Persistence and pending states

Economic events persist to `app_public.economic_events` with a unique `idempotency_key`. If persistence is absent, the webhook returns `economic_event_persistence_pending`.

Order-sync readiness is intentionally conservative:

- `payment_verified_order_sync_pending` means the Stripe payment is verified but a real Medusa order was not found or is not ready yet.
- `order_sync_not_configured` means Medusa admin URL/token configuration is missing.
- `ledger_persistence_not_configured` means Supabase/order ledger persistence is unavailable.

## State definitions

- **checkout-ready**: real Stripe Checkout Session URL can be created.
- **payment-verified**: signed Stripe webhook is verified, Stripe event id is recorded, and the economic event contract is satisfied or returns an explicit persistence blocker.
- **order-settled**: payment verification, economic event persistence, Medusa order sync, and ledger persistence are all durable.

The system must never mark paid from fake settlement, frontend redirect, unsigned webhook, invalid signature, or missing persistence.

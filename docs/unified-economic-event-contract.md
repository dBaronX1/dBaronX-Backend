# Unified Economic Event Contract

The dBaronX economic event contract keeps payment evidence separate from paid/order mutation.

## Routes

- `GET /api/payments/economic-readiness` returns public-safe readiness for the economic event safety path.
- `POST /api/payments/economic-events/dry-run` validates the event envelope without mutating paid or order state.

## Stripe payment authority

- Stripe paid state must come from a verified Stripe webhook signature only.
- Frontend success redirects are navigation events only and must not mark orders paid.
- Unsigned, missing-secret, or invalid-signature webhook probes must return `paymentMarkedPaid: false`.
- Dry-run economic events must return `paymentMarkedPaid: false` and `orderCompleted: false`.

## Pending durable order sync

If durable order sync is incomplete, API responses must surface blockers such as `order_sync_not_configured`, `payment_verified_order_sync_pending`, or `settlement_pending`. Do not substitute fake paid state or fake Medusa order completion for durable verified-webhook settlement.

# CJ Fulfillment Automation Roadmap

## Phase 1 (Manual-safe)
Payment proof (signed Stripe webhook) → customer order record → manual fulfillment task queued → admin places CJ order manually → admin adds tracking.

## Phase 2 (Assisted)
- CJ shipping quote retrieval.
- Address validation pre-check.
- Admin confirmation gate before supplier order placement.

## Phase 3 (Automated)
Enable CJ order API placement only after all gates pass:
- fraud/risk pass
- stock pass
- address pass
- idempotency guard
- retry queue
- manual exception queue for failed/ambiguous orders

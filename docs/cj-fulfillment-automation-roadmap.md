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

## Additive CJ approval safety contract (2026-05-22)

- Manual fulfillment baseline remains source-of-truth and unchanged.
- New admin-only approval endpoints are additive and InternalAuthGuard-protected.
- Default CJ behavior is dry-run only.
- Live placement requires all hard gates:
  - `DBX_ENABLE_CJ_AUTO_ORDER=true`
  - `DBX_CONFIRM_CJ_ORDER_PLACEMENT=true`
  - paid_verified proof
  - admin approval record
  - complete shipping details
  - supplier cj + supplierProductId + supplierSku + quantity > 0
  - no existing `cj_order_id`
  - idempotency key
  - stock/shipping pass or explicit override logged
- Telegram callbacks are **not complete** in this patch: `telegram_callback_not_wired`.
- When wiring callbacks, enforce admin id verification with `TELEGRAM_ALLOWED_ADMIN_IDS` and owner `1838800389`.

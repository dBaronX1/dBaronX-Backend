# CJ Fulfillment Automation Roadmap

## Product onboarding pipeline (file-based first)
- Source: controlled JSON batch (no per-product env vars).
- Status lifecycle: `draft_imported` → `validation_failed|pending_admin_approval` → `approved_for_medusa` → `published_to_medusa|rejected`.
- Validation gates before publish: supplier=`cj`, supplierProductId present, supplierSku present, price and inventory metadata present, shipping-readiness evidence present.
- Admin approval required before any Medusa visibility change.

## Fulfillment approval model
- Verified Stripe webhook creates/updates customer order plus manual fulfillment task.
- Telegram/admin alert references fulfillment task and safe order summary.
- Approval route: `POST /api/admin/fulfillment/tasks/:id/approve-cj` (InternalAuthGuard protected).
- Disapprove/hold route: `POST /api/admin/fulfillment/tasks/:id/disapprove-cj` with reason in:
  `fraud_risk|address_issue|stock_issue|shipping_cost_issue|customer_request|manual_review`.

## CJ automation safety (dry-run first)
- Default mode is dry-run/operator-assisted.
- Live placement must require all gates:
  - `DBX_ENABLE_CJ_AUTO_ORDER=true`
  - `DBX_CONFIRM_CJ_ORDER_PLACEMENT=true`
  - explicit admin approval record
- Never mark shipped/fulfilled/delivered without CJ tracking evidence.
- Failures move to manual exception/hold workflow.
- Idempotency key must be `fulfillment_task_id + order_id`; duplicate CJ order creation is blocked.

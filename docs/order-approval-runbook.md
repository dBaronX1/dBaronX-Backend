# dBaronX Order Approval Runbook

This runbook is for the owner/admin order approval path after a hosted test checkout completes and the signed payment webhook verifies the payment.

## Prerequisites

- Use the backend API base URL for the deployed API.
- Keep the internal token secret. Do not paste it in customer chat or browser code.
- A hosted Stripe test payment means the customer completed the hosted payment page in test mode. It is not a fulfillment signal by itself.
- The signed Stripe webhook is the proof step that changes an order from `pending_verification` to `paid_verified`.

## PowerShell variables

```powershell
$ApiBase = "https://dbaronx-api-unified-qo2j.onrender.com"
$InternalToken = $env:DBX_INTERNAL_SERVICE_TOKEN
$Reference = "dbx_cart_1780390224222"
$TaskId = "replace-with-fulfillment-task-id"
```

## Check admin fulfillment readiness

```powershell
Invoke-RestMethod -Method Get `
  -Uri "$ApiBase/api/admin/fulfillment/readiness" `
  -Headers @{ "x-internal-token" = $InternalToken }
```

## List owner/admin fulfillment tasks

```powershell
Invoke-RestMethod -Method Get `
  -Uri "$ApiBase/api/admin/fulfillment/tasks" `
  -Headers @{ "x-internal-token" = $InternalToken }
```

## Inspect customer order by reference

```powershell
Invoke-RestMethod -Method Get `
  -Uri "$ApiBase/api/order/status/$Reference"
```

## Inspect payment status by reference

```powershell
Invoke-RestMethod -Method Get `
  -Uri "$ApiBase/api/payment/status/$Reference"
```

Expected after checkout redirect but before webhook verification:

- `paymentStatus` is `pending_verification`.
- `clearPurchasedCartItems` is `false`.
- Owner must not place supplier orders yet.

Expected after the signed webhook verifies the hosted payment:

- `paymentStatus` is `paid_verified`.
- `orderStatus` is ready for manual fulfillment review.
- `clearPurchasedCartItems` is `true` for the purchased selected line items.
- A fulfillment task appears for owner/admin handling.

## Mark supplier order placed

Only run this after `paymentStatus` is `paid_verified`.

```powershell
Invoke-RestMethod -Method Post `
  -Uri "$ApiBase/api/admin/fulfillment/tasks/$TaskId/mark-placed" `
  -Headers @{ "x-internal-token" = $InternalToken }
```

This records that the owner placed the supplier order. It does **not** mark the customer order shipped or delivered.

## Add tracking proof

Use a tracking number, tracking URL, or both.

```powershell
$Body = @{ trackingNumber = "TRACKING-NUMBER-HERE"; trackingUrl = "https://tracking.example/replace" } | ConvertTo-Json
Invoke-RestMethod -Method Post `
  -Uri "$ApiBase/api/admin/fulfillment/tasks/$TaskId/add-tracking" `
  -Headers @{ "x-internal-token" = $InternalToken; "Content-Type" = "application/json" } `
  -Body $Body
```

Adding tracking does **not** mark the order delivered. Delivery remains a later proof/action step.

## Owner manual responsibilities

1. Confirm the order shows `paid_verified` from the backend status route.
2. Review line items, shipping details, and fraud/support notes.
3. Place the supplier order manually or through an approved admin workflow.
4. Add tracking proof when available.
5. Do not mark shipped or delivered without real tracking/fulfillment proof.

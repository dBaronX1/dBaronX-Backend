# CJ Product Sync Safe Plan

## Goal

Build an operator-controlled CJ product sync path that helps dBaronX source real products without pushing unverified supplier data directly to the live storefront.

## Non-negotiables

- No live bulk import to the customer storefront.
- No fake stock, shipping, cost, price, paid status, fulfilled status, shipped status, or settlement.
- No scraping. Use the CJ API and approved supplier-provided assets only.
- No automatic publish to Medusa until a human marks the product `verified_for_checkout`.

## Safe CJ API Pull

1. Pull product candidates from the CJ API using approved credentials and request-scoped pagination.
2. Store every pulled product as a supplier draft, not as a published storefront product.
3. Keep raw supplier payloads in an operator-only storage table/bucket with access controls.
4. Normalize only the fields needed for review: supplier product ID, SKU, title, images, category, cost, variants, shipping origin/destination support, stock quantity, and estimated delivery.

## Draft Import Only

Imported CJ products must enter a `supplier_product_drafts` workflow with one of these statuses:

- `pulled_from_cj`
- `needs_review`
- `needs_margin_check`
- `needs_stock_shipping_check`
- `approved_for_medusa_draft`
- `verified_for_checkout`
- `rejected`

Only `verified_for_checkout` products may be published to Medusa sales channels.

## Verification Fields

Each draft must include and display these review fields before approval:

- `supplier = cj`
- `supplierProductId`
- `supplierSku`
- `title`
- `variantId` / supplier variant mapping
- `costMinor`
- `priceMinor`
- `currency`
- `grossMarginMinor`
- `grossMarginPercent`
- `stockQty`
- `stockCheckedAt`
- `shippingCountry`
- `shippingMethod`
- `deliveryEstimate`
- `shippingCheckedAt`
- `imageUrls`
- `sourcePayloadChecksum`
- `reviewedBy`
- `reviewedAt`
- `verified_for_checkout`

## Margin Calculation

Margin must be calculated from real cost and intended sell price:

```text
grossMarginMinor = priceMinor - costMinor
grossMarginPercent = grossMarginMinor / priceMinor
```

A product fails review when `priceMinor <= costMinor`, shipping cost is unknown, or margin does not meet the operator-approved threshold after expected payment and fulfillment costs.

## Stock and Shipping Validation

Before approval:

1. Confirm stock quantity through CJ API immediately before review.
2. Confirm shipping destination support for the target country.
3. Confirm delivery estimate and shipping method.
4. Store the check timestamps.
5. Reject or hold products with unknown stock, unavailable destination shipping, missing delivery estimates, or inconsistent supplier SKU/variant data.

## Manual Approval

A dBaronX operator must approve products in two steps:

1. Approve as a Medusa draft only after product identity, images, cost, and margin are reviewed.
2. Publish to Medusa only after stock and shipping are rechecked and `verified_for_checkout` is true.

## Publish to Medusa

Publishing must:

- Create or update a Medusa draft first.
- Attach supplier metadata to the Medusa product and variant.
- Assign the correct sales channel only after `verified_for_checkout`.
- Preserve the stable Medusa publishable key model; never generate a publishable key per product or session.
- Keep products unpublished if any required verification field is missing.

## First Transaction Priority

Until the first real transaction path is green, keep this as documentation and operator workflow design. Do not build automatic live bulk import behavior into the storefront path.

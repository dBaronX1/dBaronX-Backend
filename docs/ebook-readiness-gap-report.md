# eBook Readiness Gap Report

## Launch decision

**Do not launch eBook sales, exports, or downloads yet.** The current implementation is concept-level only and does not contain the durable commerce, entitlement, storage, and download controls required for a revenue-safe customer product.

## Current state

- eBook is at a product-concept/readiness stage, not an operational customer delivery flow.
- No verified end-to-end purchase-to-entitlement-to-download path is present in the inspected ecosystem code.
- No Rocket implementation should fake exports, downloads, purchases, credits, or entitlement status to make the surface appear complete.

## Required gaps before launch

1. **Export pipeline**
   - Add a real server-side export job pipeline for supported formats such as PDF, EPUB, or other approved assets.
   - Store export status and immutable source inputs so failed exports can be retried safely.
   - Do not generate placeholder files or customer-facing fake downloads.

2. **Storage pipeline**
   - Persist generated eBook artifacts in approved private storage.
   - Add metadata for owner, source story/book id, format, checksum, storage key, creation time, and expiration/rotation policy.
   - Keep generated assets private by default.

3. **Download authorization**
   - Serve downloads through short-lived signed URLs or an authenticated proxy route.
   - Verify the requester has an active entitlement before issuing any download link.
   - Avoid exposing raw bucket paths or service credentials to the browser.

4. **Entitlement model**
   - Create a durable entitlement table keyed by user, product/book, order/payment evidence, status, and timestamps.
   - Entitlements must be granted only after verified payment evidence, not from client redirects.
   - Support refund/revocation states before launch.

5. **Payment evidence**
   - Wire eBook purchase completion to signed payment webhook evidence.
   - Never mark an eBook as purchased from unsigned browser state.
   - Ensure idempotency for duplicate payment webhooks.

6. **Customer-safe errors and supportability**
   - Return safe public errors to customers.
   - Keep internal storage/export/payment diagnostics in server logs or protected operator endpoints.

## Minimum launch checklist

- [ ] Verified payment webhook grants eBook entitlement exactly once.
- [ ] Entitlement check gates every download.
- [ ] Private storage contains real generated artifacts with checksums.
- [ ] Expired/revoked entitlements cannot download.
- [ ] Download route never exposes service-role credentials.
- [ ] Browser UI does not claim an eBook is downloadable unless the backend confirms entitlement and artifact readiness.
- [ ] Operator runbook documents failed export retry and customer support recovery.

## Recommendation

Keep eBook disabled or marked as coming soon until the full export, storage, download, entitlement, and payment pipeline is implemented and smoke-tested end to end.

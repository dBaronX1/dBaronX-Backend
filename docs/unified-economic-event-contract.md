# Unified economic event contract

NestJS is the dBaronX economic brain. Commerce, ads, AI Stories, watch-to-earn, affiliate, wallet, rewards, subscriptions, dreams/crowdfunding, and payout workflows request economic actions through one payment/ledger contract instead of implementing independent settlement logic per module.

## Boundary rules

- Medusa remains the commerce engine only: catalog, cart, checkout surface, fulfillment state, and order records.
- Stripe, Paystack, DBX, wallet, and internal movements are payment rails; they do not define module settlement policy.
- FastAPI remains the fraud, risk, and intelligence verifier used before verified or settled states can be accepted.
- The NestJS payment/ledger layer is the only place that may settle events, release holds, complete refunds, or mark payouts ready.
- Module-specific business logic can request events, but it must not fake paid, reward, payout, or settlement state.

## Canonical event shape

Every economic event contains `eventId`, `eventType`, `sourceModule`, `sourceRef`, optional `userId`/`accountId`, normalized `currency`, positive integer `amountMinorUnits`, `assetType`, `paymentRail`, `direction`, `status`, `idempotencyKey`, sanitized `metadata`, and `createdAt`.

`verified` and `settled` events require verifier evidence in `metadata.verifierEvidence` with a verifier, reference, and verified timestamp. Without that evidence, the contract rejects the event.

## Readiness

Use:

```bash
node scripts/e2e-economic-event-contract-smoke.mjs
```

The readiness endpoint is:

```http
GET /api/payments/economic-readiness
```

It reports supported modules, canonical event types, supported rails, ledger/wallet/order-sync readiness, payout contract status, safe mode, blockers, and timestamp.

## Contract scope for this phase

This phase adds the settlement contract, readiness surface, dry-run validation, and smoke coverage only. It intentionally does not implement live payout settlement or live reward settlement.

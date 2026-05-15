# Watch-to-Earn Readiness Gap Report

## Launch decision

**Do not launch Watch-to-Earn rewards yet.** The inspected state is not revenue-safe because public ad/watch routes, atomic reward settlement, wallet crediting, and captcha wiring are incomplete or mismatched.

## Current state

- Rocket-facing Watch-to-Earn calls reference public ad/watch behavior that is not fully backed by safe production routes.
- Reward crediting is not atomically wired to wallet ledger updates.
- hCaptcha naming and wiring must be fixed before any reward-bearing public launch.
- No code should fake ad views, rewards, wallet credits, purchases, or payout eligibility.

## Required gaps before launch

1. **Public ad/watch route surface**
   - Add audited public routes for ad inventory, watch start, heartbeat, confirm/complete, and stats.
   - Required route categories:
     - inventory lookup
     - watch session start
     - heartbeat/progress reporting
     - completion confirmation
     - user/operator stats
   - All public routes must return customer-safe errors only.

2. **Session integrity**
   - Create durable watch sessions with server-generated ids.
   - Bind sessions to user, campaign/ad, device/session metadata, start time, expiry, and fraud/risk state.
   - Reject duplicate, expired, or impossible watch progress.

3. **Atomic reward + wallet credit**
   - Reward confirmation and wallet ledger credit must be one atomic server-side operation.
   - Use idempotency keys so retries cannot double-credit.
   - Store economic evidence for every reward decision.
   - Do not credit wallet balances from browser-only confirmation.

4. **Fraud and abuse controls**
   - Add rate limits and anomaly checks for repeated sessions, impossible heartbeats, duplicated devices, and bot-like completion timing.
   - Keep reward decisions explainable to operators without leaking internals to customers.

5. **hCaptcha wiring**
   - Normalize hCaptcha environment names for browser site key and server secret.
   - Ensure only the public site key is exposed to the browser.
   - Verify server-side captcha responses before reward-bearing actions.

6. **Revenue safety**
   - Campaign budget, advertiser charge, reward liability, and wallet credit must reconcile.
   - Do not mark campaigns as deliverable or rewards as payable without durable settlement evidence.

## Minimum launch checklist

- [ ] Public inventory/start/heartbeat/confirm/stats routes exist and are documented.
- [ ] hCaptcha site key and secret names are correct and environment-specific.
- [ ] Server validates captcha before reward-bearing route actions.
- [ ] Watch completion creates exactly one reward decision.
- [ ] Reward decision and wallet ledger credit commit atomically.
- [ ] Duplicate confirms are idempotent and cannot double-credit.
- [ ] Fraud/risk checks can block suspicious sessions before crediting.
- [ ] Operator reports reconcile ad delivery, reward liability, and wallet ledger entries.

## Recommendation

Keep Watch-to-Earn rewards disabled until public watch routes, hCaptcha verification, fraud controls, and atomic wallet settlement are implemented and validated. A non-reward preview mode may be considered only if it clearly avoids credits, payouts, advertiser charges, and customer claims of earned funds.

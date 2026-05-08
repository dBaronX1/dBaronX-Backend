# dBaronX Security Model

This document defines the production security model for dBaronX. It complements the payment, supplier, wallet, payout, economic-event, and token-specific runbooks without changing their runtime behavior.

## Threat model

### Hackers

- Attempt account takeover, dependency compromise, API exploitation, route probing, SSRF, command injection, SQL injection, XSS, and cloud credential theft.
- Controls: protected branches, dependency review, secret scanning, WAF rules, least-privilege credentials, audit logs, rate limiting, and incident response.

### Fraudsters

- Attempt fake purchases, chargebacks, refund abuse, stolen-card use, affiliate abuse, supplier-order manipulation, and account farms.
- Controls: server-side payment verification, order state idempotency, supplier readiness checks, economic event logs, risk scoring, and manual review queues.

### Insiders

- Attempt unauthorized access to customer data, treasury funds, supplier margins, secrets, production dashboards, or payout controls.
- Controls: named accounts, least privilege, 2FA, access reviews, audit logs, separation of duties, and offboarding checklists.

### Suppliers

- Attempt price manipulation, fulfillment misrepresentation, delayed shipment hiding, data misuse, or unauthorized substitution.
- Controls: supplier contracts, supplier readiness probes, order audit trails, payout holds, and documented escalation paths.

### Fake users

- Attempt sign-up farms, coupon abuse, referral abuse, review manipulation, affiliate abuse, and payout farming.
- Controls: rate limits, device/account signals, anti-sybil checks, email/phone verification where appropriate, and economic-event anomaly detection.

### Watch-to-earn abusers

- Attempt bot watching, multi-account farming, replayed watch events, scripted reward claims, and traffic laundering.
- Controls: server-side event validation, session anomaly detection, reward caps, delayed settlement, fraud scoring, and private anti-abuse rules.

### Payment attackers

- Attempt unsigned webhooks, replayed webhook events, forged paid states, client-side success spoofing, mode confusion between test/live keys, and checkout amount manipulation.
- Controls: signed Stripe webhook verification, no browser-paid rule, idempotent settlement, amount/currency validation, explicit live-checkout gates, and payment readiness checks.

### Token attackers

- Attempt fake Solana signatures, wrong-mint transfers, wrong-recipient transfers, underpayment, replayed transactions, treasury key theft, malicious airdrop farming, and mint/freeze authority compromise.
- Controls: server-side Solana verification, configured mint checks, multisig treasury, key isolation, airdrop anti-sybil rules, and token governance logs.

## Secret management

- Secrets must live only in approved secret stores such as Render, Fly, Supabase, Stripe, Cloudflare, GitHub Actions secrets, or the relevant wallet/key-management system.
- Real values for private keys, seed phrases, service-role keys, Stripe secret keys, webhook secrets, internal tokens, and supplier API tokens must never be committed or pasted into chat.
- Secret rotation is required after any suspected exposure, contractor offboarding, device compromise, or accidental commit.
- Template files may contain empty placeholders only.

## Environment separation

- Development, staging, controlled test, and production environments must use separate credentials, databases, Stripe keys, webhook secrets, token wallets, supplier tokens, and domain/DNS records.
- Test-mode Stripe resources must not be mixed with live-mode production checkout.
- Production-only service-role keys must not be available to frontend builds or local demo environments.

## Cloudflare and WAF plan

- Production domains should route through Cloudflare or an equivalent WAF/CDN layer controlled by the owner.
- Baseline WAF policy should include managed rules, bot controls where appropriate, rate limiting for auth/payment/supplier endpoints, geo/IP controls when justified, and alerting for spikes.
- DNS, SSL/TLS, caching, page rules, and firewall changes must be documented in production runbooks.

## Rate limiting

- Public API routes must have route-appropriate rate limits, especially auth, checkout, webhook-adjacent probes, supplier previews, affiliate actions, watch-to-earn events, wallet actions, and payout requests.
- Internal routes must require authentication or internal tokens and should not rely on obscurity.
- Rate-limit bypasses must be explicitly approved and documented.

## Audit logs

- Security-sensitive actions must emit audit logs where practical: admin login, role changes, payment settlement, webhook verification failure, payout action, supplier order action, wallet update, treasury action, and production configuration change.
- Logs must avoid storing raw secrets, full private keys, seed phrases, or unnecessary payment data.
- Production logs should be retained long enough to investigate fraud, incidents, and disputes.

## Admin access

- Admin access must use named accounts, least privilege, strong passwords, 2FA, and prompt removal for departed users.
- Shared admin accounts are prohibited for GitHub, Render, Fly, Supabase, Stripe, Cloudflare, domain registrars, wallets, and payment processors.
- Emergency access must be documented and reviewed after use.

## 2FA requirements

- 2FA is required for GitHub, email, domain registrar, Cloudflare, Render, Fly, Supabase, Stripe, wallet custody tools, and any account with production or treasury authority.
- Hardware security keys are preferred for owner and administrator accounts.
- Recovery codes must be stored in an encrypted owner-controlled password manager or vault.

## Backups

- Backups must cover code, databases, storage, deployment configuration, DNS configuration, supplier configuration, and token governance records.
- Backup restore tests must be performed periodically in non-production environments.
- Backup access must follow least privilege and be removed during offboarding.

## Incident response

1. Triage the report or alert and assign an incident owner.
2. Preserve logs, request IDs, webhook event IDs, transaction signatures, deployment IDs, and relevant timestamps.
3. Contain the issue by disabling compromised keys, rotating secrets, pausing risky routes, applying WAF rules, or revoking access.
4. Fix the root cause without weakening payment, supplier, wallet, payout, token, or economic-event integrity.
5. Validate the fix with targeted tests and production-safe smoke checks.
6. Notify affected parties when required by law, contract, payment processor rules, or platform policy.
7. Record a post-incident review with timeline, impact, remediation, and prevention tasks.

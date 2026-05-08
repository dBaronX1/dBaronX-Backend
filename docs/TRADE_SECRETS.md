# dBaronX Trade Secrets Policy

This document identifies confidential operational knowledge that must remain private. It is a practical control document and does not replace legal advice or signed confidentiality agreements.

## Information that must remain private

- Production credentials, private keys, seed phrases, webhook secrets, service-role keys, supplier tokens, internal service tokens, and payout credentials.
- Supplier contracts, supplier account details, negotiated prices, margin strategy, product sourcing logic, and fulfillment escalation playbooks.
- Anti-fraud rules, risk thresholds, watch-to-earn abuse signals, affiliate-abuse detections, and payout hold logic.
- Customer data, order data, payment metadata, internal incident reports, and unreleased roadmap details.
- DBX treasury configuration, custody design, mint/freeze authority decisions before publication, and airdrop eligibility logic.

## No-secret-in-chat rule

- Do not paste real secrets, private keys, seed phrases, service-role keys, supplier tokens, webhook secrets, internal tokens, customer data, or private incident details into chat tools.
- Use placeholders in documentation and support messages.
- If a secret is pasted into chat, treat it as exposed: rotate it, revoke the old value, and document the response.

## Supplier contracts and pricing secrecy

- Supplier contracts, negotiated price sheets, fulfillment thresholds, and margin calculations must be stored only in approved owner-controlled systems.
- Contractors and suppliers may receive only the information needed for their assigned work.
- Public documentation may describe supplier readiness at a high level but must not reveal confidential rates or contract terms.

## Anti-fraud rule secrecy

- Fraud-control logic should be documented internally at an appropriate abstraction level without exposing exact bypassable thresholds in public channels.
- Public user-facing messages should explain policy outcomes without revealing the precise signals needed to evade detection.
- Fraud rule changes must be reviewed with production impact, false-positive risk, and payout/payment safety in mind.

## DBX treasury and private key secrecy

- DBX treasury private keys, seed phrases, hardware-wallet recovery materials, multisig signer details, and custody recovery procedures must never be committed or shared in chat.
- Public wallet addresses may be documented only when intentionally published for receiving, transparency, or token-governance purposes.
- Treasury operations must use approved custody, multisig, and audit procedures.

## Deployment control secrecy

- Render, Fly, Supabase, Cloudflare, Stripe, GitHub, registrar, and wallet admin access must remain limited to authorized named accounts.
- Deployment tokens, API keys, recovery codes, and owner email access are production-control secrets.
- Screenshots, logs, and support tickets must be reviewed for accidental secret exposure before sharing.

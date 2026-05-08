# DBX Token Governance Controls

This document defines the operational controls for DBX token custody, mint authority, treasury, allocations, and airdrops. It does not publish secrets or private wallet material.

## DBX token ownership controls

- Token configuration, mint address, treasury wallets, custody tools, and governance decisions must be controlled by the authorized dBaronX owner or owning entity.
- Public token metadata must be intentionally published and verified before user-facing production flows rely on it.
- Changes to token mint, receiver wallets, treasury wallets, or checkout verification rules require pull-request review and production release notes.

## Multisig treasury

- Treasury funds should be controlled by a multisig or custody system rather than a single hot wallet.
- Signers must use named, authorized accounts and secure hardware-backed key storage where possible.
- Signer changes, threshold changes, emergency recovery, and large transfers must be logged.

## Mint and freeze authority decision log

Maintain a private owner-controlled decision log for:

- Current mint authority holder or revocation state.
- Current freeze authority holder or revocation state.
- Rationale for keeping, transferring, or revoking each authority.
- Date, approver, transaction signature, and verification evidence for each authority change.

## Locked and team allocation

- Team, advisor, treasury, ecosystem, liquidity, and reserve allocations must be documented before broad token distribution.
- Lockups, vesting, unlock schedules, and transfer restrictions must be reviewed for legal, market, and community impact.
- Allocation records must be retained in an owner-controlled system and summarized publicly only when intentionally approved.

## Airdrop anti-sybil requirements

- Airdrops must include anti-sybil controls before distribution, such as eligibility windows, wallet/account uniqueness checks, abuse scoring, rate limits, manual review, and exclusion lists where appropriate.
- Exact anti-abuse thresholds must remain private to avoid enabling evasion.
- Airdrop claims must be auditable and reversible only when the published rules and applicable law allow it.

## No private key in repo or chat rule

- DBX private keys, treasury seed phrases, hardware-wallet recovery phrases, and signer recovery materials must never be committed, logged, or pasted into chat.
- Repository docs may use placeholders only.
- Any suspected exposure requires immediate rotation or authority transfer, incident documentation, and verification that the old secret can no longer move funds or control the token.

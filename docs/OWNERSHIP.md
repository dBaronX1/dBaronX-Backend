# dBaronX Ownership Policy

This document records the ownership controls required for the dBaronX ecosystem. It is a control document, not a transfer of legal rights. Final legal registration, trademark filings, and contractor agreements must be completed by the authorized dBaronX owner or counsel.

## Code ownership

- The dBaronX source code, configuration templates, deployment scripts, documentation, and operational runbooks are controlled by the authorized dBaronX owner or owning entity.
- Contributors may only merge work after the work is intentionally contributed to dBaronX under an approved contributor, employment, or contractor agreement.
- No contributor may copy proprietary third-party code into this repository unless the license permits commercial use and redistribution under the repository's intended operating model.

## GitHub ownership

- The production source of truth must live in the authorized dBaronX GitHub organization or approved owner account.
- Repository administrator rights must be limited to trusted owners with enforced two-factor authentication.
- Maintainer access must use named GitHub accounts; shared accounts are prohibited.
- CODEOWNERS must identify the required maintainer review path before protected branches accept production changes.

## Domain ownership

- dBaronX production domains must be registered to the authorized owner or owning entity, not to contractors, vendors, or temporary operators.
- Registrar access must require strong authentication and recovery contacts controlled by the owner.
- DNS changes for production domains must be made only through the approved Cloudflare or registrar account.

## Trademark plan

- The owner should maintain a decision log for dBaronX brand, logo, slogans, product names, and token marks.
- Trademark clearance and filing decisions should be handled by qualified counsel before large-scale advertising or exchange/token promotion.
- Brand assets used by suppliers, affiliates, contractors, or advertising partners must require written approval.

## Copyright notices

- Copyright notices in code, docs, websites, app stores, and generated materials should identify the authorized dBaronX owner or owning entity.
- New files should avoid personal copyright claims by contractors unless the contract expressly requires them and assigns rights to dBaronX.
- Third-party notices and license files must be preserved when required by upstream licenses.

## Contractor and IP assignment rule

- Contractors, vendors, and agencies must sign IP assignment and confidentiality terms before receiving repository, deployment, supplier, treasury, or customer-data access.
- Contracts must assign all deliverables, inventions, workflows, prompts, scripts, documentation, and derivative works created for dBaronX to the authorized dBaronX owner or entity.
- Access must be removed immediately when a contractor engagement ends.

## AI-tool output ownership caution

- AI-assisted output must be reviewed before use for license contamination, copied proprietary text, leaked secrets, unsafe security advice, and incorrect business logic.
- Do not paste real secrets, customer data, supplier confidential information, private keys, seed phrases, or undisclosed anti-fraud rules into AI tools.
- AI-generated code is not automatically production-ready; maintainers must review, test, and commit it through the normal repository controls.

## Source-of-truth repository policy

- The GitHub repository is the source of truth for production code, documentation, infrastructure templates, scripts, and release history.
- Manual dashboard changes in Render, Fly, Supabase, Stripe, Cloudflare, or token tooling must be reflected in repository docs or runbooks when they affect production behavior.
- Local-only patches, chat-only instructions, or uncommitted scripts are not production authority.

## Backup policy

- The owner must maintain recoverable backups of the GitHub repository, production database data, storage buckets, deployment configuration, domain/DNS configuration, and token governance records.
- Backups must be encrypted, access-controlled, and periodically restored in a non-production environment to prove recoverability.
- Backup credentials must not be stored in the repository or shared in chat.

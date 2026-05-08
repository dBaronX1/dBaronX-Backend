# dBaronX Production Control Plan

This document defines the account, repository, release, and rollback controls required before and during production operation.

## Required account ownership

The authorized dBaronX owner or owning entity must control these accounts:

- GitHub organization or owner account for source code.
- Domain registrar account for dBaronX domains.
- Cloudflare account for DNS, WAF, and CDN configuration.
- Render account for API and commerce services.
- Fly account for web application services.
- Supabase account for databases, auth, storage, and service-role credentials.
- Stripe account for checkout, webhook signing secrets, refunds, disputes, and reporting.
- Supplier platform accounts such as CJ Dropshipping.
- Wallet custody, multisig, and token-governance accounts for DBX.

## GitHub organization controls

- Enforce 2FA for every organization member.
- Use named accounts only; shared accounts are prohibited.
- Grant least-privilege roles and review membership regularly.
- Require CODEOWNERS review for protected branch changes.
- Enable secret scanning and dependency alerts where available.

## Render, Fly, Supabase, and Cloudflare controls

- Production services must be owned by the authorized dBaronX account or entity.
- Contractors may receive limited access only for defined tasks and must be removed at offboarding.
- Environment variables must be entered through platform secret/configuration systems and never committed.
- Dashboard changes that affect routing, security, deployment, scaling, databases, or payment behavior must be reflected in repository runbooks.

## Branch protection

- Protect the main production branch before launch.
- Require pull-request review, status checks, and CODEOWNERS approval for production-impacting files.
- Block force pushes and direct pushes to protected production branches.
- Require up-to-date branches before merge when supported by the platform.

## Signed commits

- Owners and maintainers should use signed commits for production branches.
- Release commits and tags should be signed where operationally feasible.
- Unsigned emergency commits must be documented in the incident or release log.

## CODEOWNERS

- `.github/CODEOWNERS` defines the default maintainer review requirement.
- The placeholder owner must be replaced with the authorized dBaronX GitHub username or team before branch protection relies on CODEOWNERS.
- CODEOWNERS must not contain private email addresses unless intentionally approved for public repository metadata.

## Release tagging

- Production releases should be tagged with a clear version or date-based tag.
- Each release note should identify major changes, migrations, required environment variables, rollback considerations, and smoke-test results.
- Payment, supplier, wallet, payout, token, and economic-event changes require explicit mention in release notes.

## Rollback plan

1. Identify the failing release, service, route, or configuration change.
2. Preserve logs, deployment IDs, database migration status, payment event IDs, and customer impact notes.
3. Roll back application deployments to the last known-good image/commit when safe.
4. Avoid rolling back database migrations blindly; use forward fixes or documented migration rollback steps.
5. Keep payment and token settlement integrity intact; never fake paid state to complete rollback.
6. Rerun health, payment readiness, supplier readiness, economic readiness, and relevant smoke checks.
7. Document root cause and permanent fix before re-releasing.

# Supabase Migration Reconciliation Report

Date: 2026-04-28  
Branch: `migration/supabase-migrations-reconciliation`

## Scope
This report audits Supabase assets currently present in the unified repository and attempts to reconcile them against the requested legacy source locations:

- `unify/local-cross-repo-reconciliation-source`
- `.dbx-source/dbaronx-frontend/supabase/migrations`
- `.dbx-source/dbaronx-frontend/supabase/functions`

## 1) Existing unified Supabase assets

### Existing migrations in `supabase/migrations`
- `202604250001_dbx_crypto_payments.sql`

### Existing functions in `supabase/functions`
- None present.

### Existing database objects introduced by current unified migration
The existing migration defines:
- Schema: `app_public`
- Tables:
  - `app_public.dbx_crypto_payment_intents`
  - `app_public.dbx_crypto_payment_verifications`
  - `app_public.dbx_crypto_payment_events`
- Indexes for reference/status/user/cart/signature and FK lookups.
- Trigger function: `app_public.set_updated_at()`
- Update trigger: `trg_dbx_crypto_payment_intents_updated_at`
- RLS enablement + service role policies for all three tables.

## 2) Legacy migrations/functions found

### Attempted legacy source inspection
Result: **No legacy source files were available in this working tree** at the specified paths.

Checked paths:
- `unify/local-cross-repo-reconciliation-source` (not present)
- `.dbx-source/dbaronx-frontend/supabase/migrations` (not present)
- `.dbx-source/dbaronx-frontend/supabase/functions` (not present)

Because the legacy sources are missing locally, there is no reliable basis to reconcile additional tables/functions into this branch.

## 3) Tables/functions likely already covered
Based on the current unified assets, crypto-payment intent lifecycle support appears covered for:
- Intent creation and status progression storage.
- Verification event tracking.
- Payment event audit trail.
- `updated_at` trigger behavior.
- RLS service-role-only management access.

## 4) Missing candidate tables/features
Unable to determine from legacy parity due to missing source materials. Candidate gaps cannot be asserted safely without the referenced legacy folders.

## 5) Unsafe/destructive SQL patterns identified (must not be run in reconciliation)
The reconciliation policy for this branch excludes destructive statements in newly added SQL, including:
- `drop table ...`
- `drop column ...`
- `drop index ...`
- `drop trigger ...`
- `drop policy ...`
- `drop function ...`

Note: Existing unified migration `202604250001_dbx_crypto_payments.sql` includes `drop trigger if exists` and `drop policy if exists` statements. These were **not modified** in this reconciliation branch.

## 6) Recommended safe next SQL files

### Recommended-to-run SQL
- **None added in this branch**.
- Rationale: legacy reference assets were unavailable; adding schema changes without source parity would risk inaccurate reconciliation.

### Legacy-reference-only SQL
- None imported; legacy source unavailable in repository.

## 7) Reconciliation outcome
- Reconciliation documentation created.
- No schema-changing SQL added due to missing legacy reference inputs.
- No runtime imports or references to `.dbx-source` were added.

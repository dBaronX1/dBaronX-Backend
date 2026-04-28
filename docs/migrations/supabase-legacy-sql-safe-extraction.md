# Supabase Legacy SQL Safe Extraction

Date: 2026-04-28  
Branch: `migration/supabase-legacy-sql-safe-extraction`

## Scope
Requested source references:

- `unify/local-cross-repo-reconciliation-source`
- `.dbx-source/dbaronx-frontend/supabase/migrations`
- `.dbx-source/dbaronx-frontend/supabase/functions`

Target output location:

- `supabase/migrations/reconciled/`

## Source inspection result
The requested legacy source directories were not present in this repository checkout during this run.

Checked paths and outcomes:

- `unify/local-cross-repo-reconciliation-source` → not present
- `.dbx-source/dbaronx-frontend/supabase/migrations` → not present
- `.dbx-source/dbaronx-frontend/supabase/functions` → not present

Because no legacy SQL/function files were available, no schema changes could be safely extracted from legacy into reconciled migrations.

## Safe SQL extracted
Created:

- `supabase/migrations/reconciled/202604280001_supabase_legacy_safe_extraction.sql`

Contents:

- No-op transaction only (`begin; commit;`)
- No DDL/DML applied

Rationale:

- Preserve an auditable reconciliation checkpoint while avoiding speculative schema changes.

## Unsafe legacy SQL excluded
No legacy SQL files were available to import. However, the following statement categories remain explicitly excluded from this reconciliation flow:

- `drop table ...`
- `drop column ...`
- `drop index ...`
- `drop trigger ...`
- `drop policy ...`
- `drop function ...`

## DO NOT RUN (unsafe legacy reference patterns)
If found in legacy files, the following are **reference-only** and must not be run as part of safe reconciliation migrations:

```sql
-- DO NOT RUN IN SAFE RECONCILIATION
-- destructive operations
DROP TABLE ...;
ALTER TABLE ... DROP COLUMN ...;
DROP INDEX ...;
DROP TRIGGER ... ON ...;
DROP POLICY ... ON ...;
DROP FUNCTION ...(...);
```

## .dbx-source tracking status
Verification command:

```bash
git ls-files .dbx-source
```

Expected/observed result:

- No output (no `.dbx-source` files tracked in Git)

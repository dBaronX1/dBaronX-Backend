# Reconciled Supabase migrations

This folder is reserved for **safe, idempotent reconciliation SQL** once legacy Supabase source migrations/functions are available for comparison.

Current status:
- `202604280001_supabase_legacy_safe_extraction.sql` added as an auditable no-op checkpoint because legacy source paths were unavailable in this working tree.
- See `docs/migrations/supabase-legacy-sql-safe-extraction.md` for extraction details and excluded unsafe SQL patterns.

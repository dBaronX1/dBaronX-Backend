# API Legacy Reference/Transaction ID Compatibility Layer

## Scope
This migration adds a compatibility layer inside `apps/api` to better handle legacy public reference/transaction ID formats while preserving existing stronger ID generation utilities and module orchestration.

## Source inspection
The requested source reference file below was not present in this repository workspace at migration time:

- `unify/local-cross-repo-reconciliation-source/.dbx-source/dbaronx-NestJS/src/common/utils/generate-public-reference.ts`

Because the file was unavailable, this migration uses existing in-repo behavior as baseline and adds only safe compatibility improvements.

## Changes made

### 1) Unified public reference helper for HTTP logs/errors
A shared utility was added at `apps/api/src/shared/utils/public-reference.util.ts`.

Behavior:
- Preserves existing `ref_<suffix>` public reference shape.
- Derives references from request IDs in one place.
- Adds normalization support for common legacy variants like `REF-abc123` / `ref:abc123` to canonical `ref_abc123`.

Adoption:
- `LoggingInterceptor` now uses this helper.
- `AllExceptionsFilter` now uses this helper.

This removes duplicate local implementations while preserving output compatibility.

### 2) DBX payment reference compatibility lookup
`DbxPaymentReferenceService` was strengthened to:
- Keep using the strong shared generator (`IdUtil.reference`).
- Produce lookup candidates from a provided reference.
- Normalize legacy/variant DBX references such as:
  - lowercase prefix/entropy
  - compact separator variants (`DBX_20260428_abcd...`, `DBX:20260428:abcd...`)

`DbxPaymentService` now attempts compatibility lookup candidates before failing not found for:
- `getIntent`
- `submitPayment`
- `retryOrderSync`
- `confirmPayment` locking now uses normalized reference input so equivalent legacy variants converge to the same lock key.

This increases compatibility for legacy reference formats without replacing existing modules/orchestrators.

## Non-goals respected
- No runtime imports from `.dbx-source`.
- No replacements of existing modules/orchestrators.
- No changes to `apps/web`, `apps/services-fastapi`, `apps/telegram-bot`, `apps/medusa`.

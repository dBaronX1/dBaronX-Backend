# API Common Filter/Interceptor Compatibility Migration

## Scope
- Target: `apps/api`
- Focus: additive compatibility hardening for shared exception-filter and logging-interceptor behavior.
- Canonical architecture remains the unified API (`apps/api/src/shared/*`) and was not replaced.

## Source Files Inspected

### Current unified API
- `apps/api/src/shared/filters/all-exceptions.filter.ts`
- `apps/api/src/shared/interceptors/logging.interceptor.ts`
- `apps/api/src/shared/middleware/request-logger.middleware.ts`
- `apps/api/src/shared/interceptors/request-context.interceptor.ts`
- `apps/api/src/shared/middleware/request-id.middleware.ts`

### Requested legacy reference paths
- `.dbx-source/dbaronx-NestJS/src/common/filters/http-exception.filter.ts`
- `.dbx-source/dbaronx-NestJS/src/common/interceptors/logging.interceptor.ts`

Legacy reference files were not present in this checkout, so no direct code import or copy was possible. Compatibility work was based on requested behavior themes only (normalization, correlation/reference fields, request method/path/status logging, and redaction), while preserving stronger existing unified behavior.

## Behavior Recovered (Additive)
1. **Public correlation/reference fields in error responses**
   - Added `correlationId` (alias of request id) and stable `reference` (`ref_*`) to exception responses.
   - Added same fields in exception log payloads to improve support/debug traceability.

2. **Safe details redaction in normalized HTTP exception payloads**
   - When `HttpException` exposes structured `details/errors/meta`, those objects are now recursively redacted via `SecurityUtil.redactObject` before being returned/logged.

3. **Logging interceptor correlation parity and safer error metadata**
   - Logging interceptor now resolves `requestId` from header or request context.
   - Added `correlationId` and `reference` fields to request lifecycle logs.
   - Error status extraction now prioritizes `HttpException#getStatus()`.
   - Added redacted `errorMeta` (for object-based HTTP exception responses) to error log entries.

## Behavior Intentionally Not Migrated
- No runtime imports from `.dbx-source`.
- No wholesale replacement of `main.ts`, `app.module.ts`, modules, guards, middleware, filters, or interceptor stack order.
- No duplicate competing filter/interceptor classes were introduced.
- No weakening of existing timeout/cache/response-transform/request-context/security patterns.

## Why Unified API Remains Canonical
- Existing `apps/api` already has stronger layered controls (request id middleware, request context interceptor, global exception filter, global logging interceptor, and additional middleware/guards/interceptors).
- Migration was constrained to additive compatibility enhancements within current shared components, preserving established architecture and build/typecheck health.

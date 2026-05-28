# CJ Operator Render Operations (API-safe)

## Critical rule

Do **not** use the CJ operator as the Render API web service Start Command.

If you set the web service Start Command to `CJ_OPERATOR_MODE=readiness ...` or import/onboarding modes, the process exits without starting an HTTP server, so the deploy is marked failed.

Restore the API web start command to the normal API server start command (`pnpm --filter dbaronx-api start`, which runs `node dist/main.js` in `apps/api`, or equivalent NestJS HTTP start command).

## Approved execution paths

Use CJ operator only as a one-off command:

1. GitHub Actions manual workflow (`CJ Operator Onboarding`) — **recommended**
2. Render Shell (optional fallback, not required)
3. Render Job (repeatable scheduled/manual ops)
4. Local secure operator shell with production DB credentials
5. Dedicated one-off worker service (if Shell/Job is unavailable)

Never use the API web service Start Command for readiness/import/onboarding/publish.

## Use compiled JavaScript in production

Do not use `ts-node` on Render for production operator runs.

Use compiled script:

`node apps/api/dist/scripts/cj-operator-onboard-products.js`

## Post-deploy readiness diagnostics command

```bash
CJ_OPERATOR_MODE=readiness \
CJ_OPERATOR_READINESS_EXIT_ZERO=true \
node apps/api/dist/scripts/cj-operator-onboard-products.js
```

## Onboarding without Telegram/internal-auth dependency

```bash
DBX_CONFIRM_CJ_OPERATOR_ONBOARDING=true \
CJ_OPERATOR_MODE=onboard-batch \
CJ_OPERATOR_CATEGORIES=fashion \
CJ_OPERATOR_LIMIT_PER_CATEGORY=20 \
node apps/api/dist/scripts/cj-operator-onboard-products.js
```

The CJ operator script is a Nest application context task and does not depend on Telegram bot runtime or internal-auth HTTP calls.


## Readiness JSON interpretation contract

Readiness output must include, at minimum:

- `success`
- `blockers`
- `dbDiagnostics.databaseConnected`
- `dbDiagnostics.migrationReady`
- `dbDiagnostics.checkerSource` with value `database_url_pg_client_to_regclass`
- `dbDiagnostics.databaseUrlPresent`
- `dbDiagnostics.supabaseUrlPresent`
- `dbDiagnostics.supabaseServiceRolePresent`
- `dbDiagnostics.requiredTables`
- `dbDiagnostics.connectionFailureKind` when connection fails
- `dbDiagnostics.recommendedAction`
- `dbDiagnostics.secretLeakDetected` with value `false`

The direct database readiness check is the source of truth for migration state. It uses the Node Postgres client against `DATABASE_URL` and fully-qualified `to_regclass(...)` checks for `app_private.cj_product_import_runs`, `app_private.cj_product_import_items`, `app_public.storefront_products`, and `app_private.fulfillment_tasks`. It must not depend on Supabase REST schema exposure.

For GitHub Actions, prefer the Supabase pooler / IPv4-compatible connection string for `DATABASE_URL` if the direct database host resolves to IPv6 or fails with network-unreachable errors. Keep rotated credentials current after any password rotation.

Do not print secrets in readiness output. Never include:

- `DATABASE_URL` or any `postgres://` / `postgresql://` URL
- DB username
- DB host, including the Supabase project host
- DB password or query parameters containing secrets
- full environment dumps
- Supabase service-role key
- CJ access token/key
- internal service token

If a database URL, password, or service credential is pasted into logs, chat, issues, screenshots, or artifacts, treat it as leaked: rotate the database password/credential immediately, update GitHub Actions secrets, and rerun readiness with the pooler / IPv4-compatible URL.


## GitHub Actions manual workflow (recommended)

Render Shell is optional and not required for onboarding.

Required GitHub repository secrets for `CJ Operator Onboarding`:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CJ_ACCESS_TOKEN` or `CJ_API_KEY`

How to run:

1. Go to **Actions** → **CJ Operator Onboarding** → **Run workflow**.
2. For readiness: set `mode=readiness`, keep defaults, run.
3. For fashion onboarding: set `mode=onboard-category`, `category=fashion`, optional limit, run.
4. For batch onboarding: set `mode=onboard-batch`, set `categories` CSV and limit, run.

Safety notes:

- Readiness mode only reports readiness; it does not import/approve/publish.
- Onboarding modes require explicit confirmation env in workflow and run via compiled JS.
- Do not paste secrets into chat, issues, or workflow logs.
- Do not replace the API Start Command with the operator command.

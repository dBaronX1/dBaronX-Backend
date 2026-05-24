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
- `legacyBlockers`
- `dbDiagnostics.databaseName`
- `dbDiagnostics.databaseUser`
- `dbDiagnostics.dbConnectionReady`
- `dbDiagnostics.dbDiagnosticAvailable`
- `dbDiagnostics.dbConnectionSource`
- `dbDiagnostics.requiredTables`
- `dbDiagnostics.missingTables`
- `dbDiagnostics.safeDbErrorClass` (present when database connection/diagnostics fail)

Do not print secrets in readiness output. Never include:

- `DATABASE_URL`
- DB host
- DB password
- full environment dumps
- Supabase service-role key
- CJ access token/key
- internal service token


## GitHub Actions manual workflow (recommended)

Render Shell is optional and not required for onboarding.

Required GitHub Secrets:

- `DATABASE_URL`
- `SUPABASE_URL` (if your app context requires it)
- `SUPABASE_SERVICE_ROLE_KEY` (if your app context requires it)
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

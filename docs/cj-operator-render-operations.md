# CJ Operator Render Operations (API-safe)

## Critical rule

Do **not** use the CJ operator as the Render API web service Start Command.

If you set the web service Start Command to `CJ_OPERATOR_MODE=readiness ...` or import/onboarding modes, the process exits without starting an HTTP server, so the deploy is marked failed.

Restore the API web start command to the normal API server start command (`node apps/api/dist/main.js` or the existing service start command that launches NestJS HTTP).

## Approved execution paths

Use CJ operator only as a one-off command:

1. Render Shell (preferred for manual runs)
2. Render Job (preferred for repeatable scheduled/manual ops)
3. Local secure operator shell with production DB credentials
4. Dedicated one-off worker service (if Shell/Job is unavailable)

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

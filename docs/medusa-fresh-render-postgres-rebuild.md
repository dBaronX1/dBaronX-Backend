# Fresh Render Postgres Medusa rebuild

The old exposed Render Postgres database was deleted and replaced. Treat the new Render Postgres database as a fresh Medusa schema rebuild: product/order data from the old database is gone unless it was separately backed up.

## Required Render environment change

Set the Medusa service `DATABASE_URL` to the new Render **Internal Database URL** in Render environment variables only. Never paste the URL into chat, docs, commits, logs, screenshots, or shell output.

Keep the existing Medusa secrets (`JWT_SECRET`, `COOKIE_SECRET`) configured. Rotate any database password that was exposed.

## Do not seed before migrations

A fresh database has no Medusa core tables. Run official Medusa migrations first; do not hand-create Medusa internal tables and do not run shipping/product scripts before schema readiness passes.

## Normal migration-first start command

```bash
pnpm --filter @dbaronx/medusa run db:prepare && pnpm --filter @dbaronx/medusa run launch-commerce:ensure && pnpm --filter @dbaronx/medusa start
```

## Fresh database preparation command

```bash
pnpm --filter @dbaronx/medusa run db:prepare:fresh
```

`db:prepare:fresh` does not drop, reset, or seed anything. It runs official migrations and verifies core tables.

## Verify core tables

```bash
pnpm --filter @dbaronx/medusa run db:health
```

The readiness contract includes `success`, `blockers`, `databaseReachable`, `missingTables`, `existingTables`, `migrationLikelyRequired`, and `nextManualStep`.

## One-cycle first CJ product seed after DB is green

Use this only once after DB prep, shipping, and commerce readiness pass:

```bash
DBX_CONFIRM_CJ_FIRST_PRODUCT_SEED=true pnpm --filter @dbaronx/medusa run db:prepare && pnpm --filter @dbaronx/medusa run launch-commerce:ensure && pnpm --filter @dbaronx/medusa run first-product:seed:cj-shirt && pnpm --filter @dbaronx/medusa start
```

After the seed completes, restore the normal start command:

```bash
pnpm --filter @dbaronx/medusa run db:prepare && pnpm --filter @dbaronx/medusa run launch-commerce:ensure && pnpm --filter @dbaronx/medusa start
```

## Readiness smokes

```bash
pnpm --filter @dbaronx/medusa run first-product:readiness
node scripts/e2e-telegram-customer-first-checkout-journey-smoke.mjs
node scripts/e2e-first-transaction-with-telegram-ops-smoke.mjs
```

If the first-product readiness smoke reports `medusa_schema_missing`, run `db:prepare` before investigating product data.


## Fresh DB launch commerce and publishable key

After deleting the exposed Render Postgres database, the old `MEDUSA_PUBLISHABLE_KEY` belongs to the deleted database and must be treated as invalid. Run `launch-commerce:ensure` immediately after `db:prepare`; it creates or repairs the US region, default sales channel, publishable API key link, shipping profile, stock location, fulfillment set, US service zone, manual fulfillment provider link, and Store API-visible standard delivery option.

The ensure output prints only `publishableApiKeyTokenPreview`. Copy the full new publishable key token from Medusa Admin/API key details for the fresh database, then update both `MEDUSA_PUBLISHABLE_KEY` and `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` in Render before running customer checkout readiness. Do not reuse the key from the deleted DB.

Run readiness with the new key:

```bash
MEDUSA_BASE_URL=https://dbaronx-medusa.onrender.com \
MEDUSA_PUBLISHABLE_KEY=<new-fresh-db-publishable-key> \
pnpm --filter @dbaronx/medusa run first-product:readiness
```

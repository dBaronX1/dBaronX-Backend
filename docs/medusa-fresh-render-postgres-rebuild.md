# Fresh Render Postgres Medusa rebuild

> Final first-transaction operator pack: see [docs/first-transaction-final-operator-pack.md](./first-transaction-final-operator-pack.md) for the canonical Render/Fly release commands, safe publishable-key retrieval, CJ shirt seed cycle, smoke sequence, and stop/go checklist.

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


## Store API, Admin `/app`, and publishable key retrieval

Medusa Admin at `/app` may return `Cannot GET /app` when the admin build is disabled. The root path `/` may also return `Cannot GET /`. Neither response is a Store API failure. Store API readiness is proven through `/store/products`, `/store/regions`, and cart/shipping endpoints using the fresh DB publishable key.

`launch-commerce:ensure` intentionally prints only `publishableApiKeyTokenPreview`. To intentionally retrieve the full frontend Store API key from the fresh database, run the operator-only command below. It refuses to print the token unless explicit confirmation is set and it never prints `DATABASE_URL` or backend secrets.

```bash
DBX_CONFIRM_PRINT_MEDUSA_PUBLISHABLE_KEY=true pnpm --filter @dbaronx/medusa run publishable-key:print
```

Copy `publishableApiKeyToken` from the JSON output into all deployed frontend/Store API key env vars:

- `MEDUSA_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`
- `PUBLIC_MEDUSA_PUBLISHABLE_KEY`

After those env vars are updated and `launch-commerce:ensure` is green, run exactly one controlled CJ shirt seed cycle:

```bash
DBX_CONFIRM_CJ_FIRST_PRODUCT_SEED=true pnpm --filter @dbaronx/medusa run first-product:seed:cj-shirt
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

The ensure output prints only `publishableApiKeyTokenPreview`. Retrieve the full token with `DBX_CONFIRM_PRINT_MEDUSA_PUBLISHABLE_KEY=true pnpm --filter @dbaronx/medusa run publishable-key:print`, then update `MEDUSA_PUBLISHABLE_KEY`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, and `PUBLIC_MEDUSA_PUBLISHABLE_KEY` in Render before running customer checkout readiness. Do not reuse the key from the deleted DB.

Run readiness with the new key:

```bash
MEDUSA_BASE_URL=https://dbaronx-medusa-xrwh.onrender.com \
MEDUSA_PUBLISHABLE_KEY=<new-fresh-db-publishable-key> \
pnpm --filter @dbaronx/medusa run first-product:readiness
```

# Medusa database readiness

The Render failure that reported missing `currency`, `tax_provider`, `payment_provider`, `notification_provider`, `region_country`, and `fulfillment_provider` tables is a Medusa schema/bootstrap ordering problem. `shipping:ensure`, `commerce:ensure`, and product seed scripts must not run until official Medusa migrations have created core commerce tables.

## Required migration-first command

Run Medusa DB preparation before any ensure or seed command:

```bash
pnpm --filter @dbaronx/medusa run db:prepare
```

`db:prepare` runs the official Medusa v2 migration command and then checks core table readiness. It is idempotent and safe for already-migrated databases.

## Required Render Medusa start command

```bash
pnpm --filter @dbaronx/medusa run db:prepare && pnpm --filter @dbaronx/medusa run launch-commerce:ensure && pnpm --filter @dbaronx/medusa start
```

Do not prepend product seed commands to the normal start command. Seed only during an explicit one-cycle operator action after `db:prepare` and `launch-commerce:ensure` pass.

## Database URL safety

- Set `DATABASE_URL` only in the Medusa Render service environment.
- Do not commit, paste, echo, screenshot, or log `DATABASE_URL`.
- Do not use a local Render internal database URL from a different environment.
- Use an external DB URL locally only for a short emergency maintenance session, then remove it from shell history/environment.
- If any `DATABASE_URL` was exposed, rotate the database password or replace the database before deploy.

## Health output

`pnpm --filter @dbaronx/medusa run db:health` prints JSON with:

- `success`
- `blockers`
- `databaseReachable`
- `missingTables`
- `existingTables`
- `migrationLikelyRequired`
- `nextManualStep`


## Fresh DB commerce primitives

For a newly replaced Render Postgres database, migrations only create Medusa core schema. They do not recreate dBaronX launch commerce primitives or the publishable key/sales-channel link. Run:

```bash
pnpm --filter @dbaronx/medusa run db:prepare && pnpm --filter @dbaronx/medusa run launch-commerce:ensure
```

`launch-commerce:ensure` is idempotent and discovers current IDs by stable names/metadata instead of the IDs from the deleted DB. It separates infrastructure readiness from product checkout readiness through the `commerce:ensure` output fields `infrastructureReady`, `productReady`, and `checkoutReady`.

After the fresh DB ensure succeeds, retrieve the full new publishable key from Medusa Admin/API key details and update Render `MEDUSA_PUBLISHABLE_KEY`/`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`. Store API readiness failures now distinguish `medusa_publishable_key_missing`, `medusa_publishable_key_invalid`, `medusa_publishable_key_not_linked_to_sales_channel`, `launch_commerce_missing`, and `real_supplier_product_missing`.

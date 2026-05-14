# Medusa database readiness

Medusa is commerce-only for dBaronX. Supabase stores dBaronX application, intelligence, wallet, event, audit, and support data. **Do not create Medusa core tables in Supabase.** Medusa core commerce tables must be created and repaired only by Medusa migrations and Medusa scripts.

## Required command order

Run these commands against the Medusa service/database, not in Supabase:

```bash
pnpm --filter @dbaronx/medusa run db:prepare
pnpm --filter @dbaronx/medusa run launch-commerce:ensure
DBX_CONFIRM_CJ_FIRST_PRODUCT_SEED=true pnpm --filter @dbaronx/medusa run first-product:reseed:canonical
```

`db:prepare` runs the official Medusa migration path and validates that Medusa-owned core commerce schema is present. It is idempotent for an already migrated Medusa database.

`launch-commerce:ensure` is the dBaronX readiness script for commerce primitives that live in Medusa. It must run after Medusa migrations and before product checkout is opened.

`first-product:reseed:canonical` is an explicit operator action for the canonical CJ first product. It must not be embedded permanently in the normal start command.

## Required Render Medusa start command

Use this for the normal Medusa Render start command after one-cycle product reseed is complete:

```bash
pnpm --filter @dbaronx/medusa run db:prepare && pnpm --filter @dbaronx/medusa run launch-commerce:ensure && pnpm --filter @dbaronx/medusa start
```

Do not prepend product seed commands to the normal start command. Seed only during an explicit one-cycle operator action after `db:prepare` and `launch-commerce:ensure` pass.

## What Medusa owns

Medusa owns and must create/repair the core commerce data for:

- Region.
- Sales channel.
- Publishable key and sales-channel linkage.
- Shipping profile.
- Fulfillment set.
- Service zone.
- Stock location.
- Inventory item.
- Inventory level.
- Shipping option.
- CJ product.
- Product variant.
- Price.
- Product image.
- Product metadata.
- Store API product visibility.
- Store API shipping visibility.

Supabase may store dBaronX-owned application references such as checkout/economic events and Medusa order sync jobs, but it must not own Medusa product, cart, order, payment, inventory, fulfillment, or shipping schema.

## Readiness behavior by command

### `db:prepare`

Expected responsibility:

- Apply official Medusa migrations.
- Verify core table readiness for Medusa modules.
- Report missing Medusa tables as blockers instead of asking operators to hand-write Supabase SQL.

### `launch-commerce:ensure`

Expected responsibility:

- Create or repair the launch region.
- Create or repair the sales channel.
- Create or repair the publishable key and link it to the sales channel.
- Create or repair shipping profile, fulfillment set, service zone, stock location, shipping option, inventory item, and inventory level.
- Confirm Store API product and shipping visibility using the configured publishable key.
- Return blockers if product or checkout readiness is incomplete.

### `first-product:reseed:canonical`

Expected responsibility:

- Seed/reseed the canonical CJ product with verified supplier metadata.
- Ensure the variant exists and is priced.
- Ensure product image and product metadata are present.
- Ensure inventory and shipping data allow controlled Store API checkout.
- Keep the product path real; do not fake paid, fulfilled, shipped, settled, or completed states.

## Database URL safety

- Set the Medusa database URL only in the Medusa Render service environment.
- Do not commit, paste, echo, screenshot, or log database URLs.
- Do not use a local Render internal database URL from a different environment.
- Use an external DB URL locally only for a short emergency maintenance session, then remove it from shell history/environment.
- If any database URL was exposed, rotate the database password or replace the database before deploy.

## Health output

`pnpm --filter @dbaronx/medusa run db:health` prints JSON with readiness fields such as:

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
pnpm --filter @dbaronx/medusa run db:prepare
pnpm --filter @dbaronx/medusa run launch-commerce:ensure
```

`launch-commerce:ensure` is idempotent and discovers current IDs by stable names/metadata instead of IDs from a deleted DB. It separates infrastructure readiness from product checkout readiness through output fields such as `infrastructureReady`, `productReady`, and `checkoutReady`.

After the fresh DB ensure succeeds, retrieve the full new publishable key through the confirmed operator path and update Medusa/API/Web/Bot runtime environments. Store API readiness failures must distinguish a missing, invalid, stale, or unlinked publishable key from missing product/shipping primitives.

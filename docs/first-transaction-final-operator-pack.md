# First Transaction Final Operator Pack

This pack is the repo-level source of truth for the final controlled first-sale release path. It separates Render Medusa commands, Fly build-only image pushes, actual Fly releases, and local readiness smokes so operators do not depend on scattered chat history.

## Current status

- Medusa fresh-DB migration path is fixed.
- `pnpm --filter @dbaronx/medusa run launch-commerce:ensure` is expected to be green before checkout is opened.
- Store API products and regions must be checked with the fresh-DB publishable key.
- Medusa Admin `/app` is not required for the first sale while the admin build is disabled.
- Medusa `/` returning `Cannot GET` is not a Store API failure; use `/store/products` and `/store/regions` with the publishable key for commerce readiness.
- Telegram and FastAPI images may have been pushed with `--build-only --push`, but that does not prove a Fly runtime release.
- The first controlled product remains the CJ shirt:
  - title: `Men's Cotton Linen Long Sleeve Casual Shirt`
  - handle: `mens-cotton-linen-long-sleeve-casual-shirt`
  - supplier: `cj`
  - supplier product ID: `2408300732091605000`
  - supplier SKU: `CJDS212420104DW`
  - cost minor units: `419`
  - selling price minor units: `1999`
  - stock quantity: `32`
  - shipping country: `US`
  - delivery estimate: `7-15 business days`

## Generate the safe command pack

Run the repo helper whenever an operator needs the final release commands:

```bash
pnpm first-transaction:commands
```

The helper prints placeholders and commands only. It must not print database URLs, Stripe secrets, Supabase service role keys, Telegram bot tokens, CJ access tokens, or internal service tokens.

## Medusa Render commands

### Normal Render start command

Use this as the normal Medusa Render start command:

```bash
pnpm --filter @dbaronx/medusa run db:prepare && pnpm --filter @dbaronx/medusa run launch-commerce:ensure && pnpm --filter @dbaronx/medusa start
```

### Confirm launch-commerce green

Before first checkout, Medusa commerce must pass:

```bash
pnpm --filter @dbaronx/medusa run launch-commerce:ensure
```

A green result must show no blockers and Store API product/region accessibility with the correct fresh key.

## Retrieve the full Medusa publishable key

Only this explicit confirmed operator command may print the full Medusa publishable Store API key:

```bash
DBX_CONFIRM_PRINT_MEDUSA_PUBLISHABLE_KEY=true pnpm --filter @dbaronx/medusa run publishable-key:print
```

Expected output fields are:

- `success`
- `blockers`
- `publishableApiKeyId`
- `publishableApiKeyToken`
- `publishableApiKeyTokenPreview`
- `salesChannelId`
- `linked`
- `storeProductsAccessible`
- `storeRegionsAccessible`
- `nextManualStep`

The current known preview is `pk_4c008…2451`; the preview is not enough for runtime env configuration. Copy only the full `publishableApiKeyToken` from the confirmed command.

## Update env vars after key print

Update the services that need Store API access with the full fresh token:

```dotenv
MEDUSA_PUBLISHABLE_KEY=<publishableApiKeyToken from confirmed print command>
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<publishableApiKeyToken from confirmed print command>
PUBLIC_MEDUSA_PUBLISHABLE_KEY=<publishableApiKeyToken from confirmed print command>
```

Do not print, paste into docs, or commit real secret values for database, Stripe, Supabase service role, Telegram, CJ, or internal service credentials.

## Seed the first CJ shirt

Use this temporary Render Medusa start command for exactly one deploy/seed/start cycle:

```bash
DBX_CONFIRM_CJ_FIRST_PRODUCT_SEED=true pnpm --filter @dbaronx/medusa run db:prepare && pnpm --filter @dbaronx/medusa run launch-commerce:ensure && pnpm --filter @dbaronx/medusa run first-product:seed:cj-shirt && pnpm --filter @dbaronx/medusa start
```

After that seed succeeds once, restore the normal Render start command:

```bash
pnpm --filter @dbaronx/medusa run db:prepare && pnpm --filter @dbaronx/medusa run launch-commerce:ensure && pnpm --filter @dbaronx/medusa start
```

## Fly release commands

### Build-only image push is not a release

These scripts intentionally use `--build-only --push`. They build and push images, but they do not perform a full Fly release and must not be treated as deployed runtime proof:

```bash
pnpm deploy:fly:telegram:build-only
pnpm deploy:fly:fastapi:build-only
pnpm deploy:fly:web:build-only
```

### Actual Fly releases

Use these repo-level scripts for actual Fly runtime releases:

```bash
pnpm deploy:fly:telegram
pnpm deploy:fly:fastapi
pnpm deploy:fly:web
```

Release both runtime support services together with:

```bash
pnpm deploy:fly:runtime-services
```

The scripts target the known apps and config files:

- Telegram: `dbaronx-telegram-bot`, `apps/telegram-bot/fly.toml`
- FastAPI: `dbaronx-fastapi`, `apps/services-fastapi/fly.toml`
- Web: `dbaronx-web`, `apps/web/fly.toml`

## Exact smoke sequence

After Render env updates and actual Fly releases, run:

```bash
pnpm runtime:fly:readiness
```

Then run product and checkout smokes:

```bash
EXPECT_SUPPLIER=cj MEDUSA_BASE_URL=https://dbaronx-medusa.onrender.com WEB_BASE_URL=https://dbaronx.com pnpm first-product:readiness
node scripts/e2e-telegram-customer-first-checkout-journey-smoke.mjs
node scripts/e2e-first-stripe-test-transaction-smoke.mjs
node scripts/e2e-first-transaction-with-telegram-ops-smoke.mjs
```

Or run the bundled first-transaction smoke sequence:

```bash
pnpm release:first-transaction:smokes
```

## Stop/go checklist

### Stop if any item is true

- Any readiness smoke reports blockers.
- Only `--build-only --push` has been run and actual Fly release status is unknown.
- Telegram, FastAPI, or Web reports `image_built_only`, `release_status_unknown`, or `runtime_unreachable`.
- The Medusa publishable key is missing, preview-only, stale from the deleted database, invalid, or not linked to the sales channel.
- Store API products or regions are inaccessible with the fresh publishable key.
- The CJ shirt is missing, not exact, not stocked, missing supplier metadata, missing product URL, or not priced at `1999` minor units.
- Stripe creates a `cs_live_*` session during the controlled first transaction smoke.
- Signed Stripe webhook settlement proof is not available after the controlled test payment.
- Telegram customer/ops guardrails are not green.

### Go only when all items are true

- Medusa launch-commerce is green with no blockers.
- The full fresh publishable key is configured in the relevant Medusa/API/Web/Bot environments.
- The first CJ shirt is seeded exactly once and the normal Medusa Render start command has been restored.
- Actual Fly releases completed for Telegram, FastAPI, and Web.
- `pnpm runtime:fly:readiness` reports all three runtimes ready.
- Product readiness and first-transaction smokes are green.
- Controlled Stripe checkout is `cs_test_*`, paid with a test card, and the signed webhook evidence is verified before claiming settlement.

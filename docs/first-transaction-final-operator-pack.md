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


## Customer auth locations

Customer signup and login live in the Fly Web/Rocket storefront, backed by Supabase Auth. Fly Web is the canonical production frontend; Rocket.new remains the design/source generator for the polished storefront and auth UI.

- Production signup URL: `/register`
- Compatibility signup URL: `/signup` redirects to `/register` and preserves `ref`, `invite`, `init`, and `next`.
- Production login URL: `/login`
- Compatibility login URL: `/signin` redirects to `/login` and preserves `ref`, `invite`, `init`, and `next`.
- Auth callback URL: `/auth/callback`
- Onboarding URL after signup: `/onboarding` by default, or a valid local `next` path.
- Customer dashboard URL after login: `/dashboard` by default, or a valid local `next` path.

Medusa `/app` is not customer login. Medusa `/app` may also be unavailable in production because the Medusa admin build is disabled for the commerce-only first-sale path. Customer identity belongs to the Web/Rocket app plus Supabase Auth; Medusa remains commerce-only and must not be used as the customer account surface.

### Fly Web public auth/runtime env

Required Fly Web public envs for the production customer frontend are:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_MEDUSA_BACKEND_URL=
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

Next.js embeds `NEXT_PUBLIC_*` values into browser bundles at build time. If Fly secrets are set after an image is built, the server can have the runtime values while the browser bundle still contains empty build-time values. Fly Web therefore provides `/api/public-config` as a runtime-safe fallback for public values only: `supabaseUrl`, `supabaseAnonKey`, `apiBaseUrl`, `medusaBackendUrl`, `medusaPublishableKey`, and `siteUrl`. No customer should ever see environment variable names or raw config instructions in the UI.

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

Do not use a temporary Render Medusa Web Service start command for seeding. Run the seed as the `Medusa First Product Seed` GitHub Action, a Render one-off job, or a Render shell command:

```bash
DBX_CONFIRM_CJ_FIRST_PRODUCT_SEED=true pnpm --filter @dbaronx/medusa run first-product:seed:cj-shirt
```

Keep the normal Render start command server-only:

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
EXPECT_SUPPLIER=cj MEDUSA_BASE_URL=https://dbaronx-medusa-xrwh.onrender.com WEB_BASE_URL=<current-web-storefront-url> pnpm first-product:readiness
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

## Supabase Auth checklist before first customer transaction

- Enable the Supabase Email provider.
- Decide whether **Confirm Email** is enabled before the first live customer registers.
- Set Supabase Auth **Site URL** to `https://dbaronx.com`.
- Add these Supabase Auth redirect URLs:
  - `https://dbaronx.com/auth/callback`
  - `https://www.dbaronx.com/auth/callback`
  - `https://dbaronx-web.fly.dev/auth/callback`
- Configure custom SMTP for production email reliability; otherwise confirmation email delivery can become a first-transaction blocker.
- Check spam and promotions during live signup tests.
- Never expose the Supabase service role key to Web. Web receives only Supabase public URL and anon key through build-time public env or `/api/public-config`.
- First-owner bootstrap/referral/invitation creation remains separate and must run only after the real Supabase user exists.

## Complete database pack operator order

The complete Supabase + Medusa readiness pack adds one Supabase-owned application migration and keeps Medusa core commerce schema out of Supabase.

### Supabase SQL to run

Run this exact SQL file in the Supabase SQL editor, or apply it through the approved migration runner after all earlier migrations:

```text
supabase/migrations/202605140001_complete_dbaronx_application_schema.sql
```

The file is idempotent and additive. It creates/repairs dBaronX-owned `app_public` application tables, RLS policies, updated-at triggers, and service-role RPC helpers. It does not create Medusa core commerce tables.

### Do not run this in Supabase

Do not create or repair Medusa core tables in Supabase. Do not paste Medusa product/cart/order/payment/inventory/fulfillment/shipping SQL into Supabase. Medusa commerce schema belongs to Medusa migrations and Medusa scripts only.

### Render Medusa commands to run

Run the Medusa readiness commands on Render in this order:

```bash
pnpm --filter @dbaronx/medusa run db:prepare
pnpm --filter @dbaronx/medusa run launch-commerce:ensure
DBX_CONFIRM_CJ_FIRST_PRODUCT_SEED=true pnpm --filter @dbaronx/medusa run first-product:reseed:canonical
```

After the canonical CJ first product has been reseeded once and Store API visibility is green, restore the normal Medusa start command:

```bash
pnpm --filter @dbaronx/medusa run db:prepare && pnpm --filter @dbaronx/medusa run launch-commerce:ensure && pnpm --filter @dbaronx/medusa start
```

### First live transaction blocker policy

Do not proceed to a live customer transaction until all of the following are true:

- Supabase migration `202605140001_complete_dbaronx_application_schema.sql` has run successfully.
- Stripe webhook events and economic events are durable in Supabase after a controlled test checkout.
- Medusa `db:prepare` and `launch-commerce:ensure` are green.
- The CJ product, variant, image, metadata, price, stock, inventory level, shipping option, Store API product visibility, and Store API shipping visibility are green.
- Telegram, FastAPI, NestJS API, and Web smokes pass with no production blockers.

# CJ to Supabase Product Sync

`scripts/sync-cj-products-to-supabase.mjs` is a server-side-only sync entry point for moving CJ catalog records into `app_public.storefront_products`.

## Required env vars

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
CJ_ACCESS_TOKEN=... # or CJ_API_KEY=...
```

For local/manual import while CJ API credentials are finalized:

```bash
CJ_SYNC_INPUT_FILE=path/to/products.json
```

## Optional env vars

```bash
CJ_API_BASE_URL=https://developers.cjdropshipping.com/api2.0
CJ_SYNC_QUERY=shirt
CJ_SYNC_CATEGORY_ID=...
CJ_SYNC_LIMIT=50
CJ_SYNC_DRY_RUN=true
CJ_SYNC_AUTO_VERIFY=false
CJ_SYNC_MIN_MARGIN_PERCENT=30
CJ_SYNC_DEFAULT_CURRENCY=usd
CJ_SYNC_REQUESTED_BY=operator-name
```

## Dry run

```bash
CJ_SYNC_DRY_RUN=true CJ_SYNC_INPUT_FILE=./cj-products.json node scripts/sync-cj-products-to-supabase.mjs
```

Dry run validates normalization and output shape without writing products or sessions.

## Sync run

```bash
SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
CJ_ACCESS_TOKEN=... \
CJ_SYNC_QUERY=shirt \
CJ_SYNC_LIMIT=50 \
node scripts/sync-cj-products-to-supabase.mjs
```

The script:

- creates a row in `app_public.supplier_sync_sessions`
- fetches from CJ API or reads `CJ_SYNC_INPUT_FILE`
- normalizes product fields and images
- stores raw CJ payload in `cj_raw`
- upserts by `(supplier, supplier_product_id)`
- defaults products to `verification_status = 'draft'`, `active = false`, and `checkout_enabled = false`
- prints a JSON result with blockers and next manual steps

## Verification rules

By default, synced products are not auto-published. `CJ_SYNC_AUTO_VERIFY=true` can only verify rows when minimum safe fields pass, including title, image, price, and a real Medusa variant for checkout. Products without a Medusa variant do not receive checkout.

Do not auto-publish unverified supplier products because public pages must not imply fake stock, fake prices, fake shipping, or fake checkout readiness.

## Approving products

Approve only after manual or admin review:

```sql
update app_public.storefront_products
set verification_status = 'verified',
    active = true,
    checkout_enabled = (medusa_variant_id is not null),
    updated_at = now()
where supplier = 'cj'
  and supplier_product_id = '<real-cj-product-id>';
```

If a product is display-ready but has no checkout variant, set `active = true`, `verification_status = 'verified'`, and keep `checkout_enabled = false`.

## How products become visible on Rocket

Rocket queries `app_public.storefront_products` with anon-safe RLS. Only `active = true` and `verification_status = 'verified'` rows are visible. CJ raw data and supplier costs are not selected by Rocket public helpers or public API endpoints.

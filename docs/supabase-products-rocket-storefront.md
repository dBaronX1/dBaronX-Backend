# Supabase Products as the Rocket Storefront Source

Supabase is now the immediate display source for Rocket storefront products. Rocket reads `app_public.storefront_products` with the public anon key and only renders rows where `active = true` and `verification_status = 'verified'`.

Medusa remains the commerce and checkout source. A product can appear in Rocket without checkout if it is verified for display, but checkout is enabled only when a real `medusa_variant_id` is present and `checkout_enabled = true`.

## Display flow

1. CJ or manual supplier data is synced into `app_public.storefront_products`.
2. Operators review price, images, supplier identity, shipping, stock signals, and Medusa variant linkage.
3. Operators approve public display by setting `verification_status = 'verified'` and `active = true`.
4. Rocket `/home`, `/shop`, `/products`, and `/products/[handle]` load the verified Supabase products automatically.
5. Rocket shows `Unavailable for checkout` when `checkout_enabled` is false or `medusa_variant_id` is missing.

## Required Rocket env vars

Browser-safe only:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Optional fallback/enrichment:

```bash
NEXT_PUBLIC_MEDUSA_BACKEND_URL=...
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=...
MEDUSA_BACKEND_URL=...
MEDUSA_PUBLISHABLE_KEY=...
```

Do not expose Supabase service-role keys, CJ tokens, Stripe secrets, Medusa admin tokens, internal tokens, or database URLs to Rocket browser code.

## SQL deployment

Run this migration in Supabase SQL editor or through your migration runner:

```bash
supabase/migrations/202605180001_supabase_storefront_products_cj_sync.sql
```

The migration creates:

- `app_public.storefront_products`
- `app_public.supplier_sync_sessions`
- public read RLS for active verified products only
- service-role write policies for sync/admin processes
- indexes and safety constraints

## Manual verification flow

After syncing products, review rows in `app_public.storefront_products`.

Approve display only after verification:

```sql
update app_public.storefront_products
set verification_status = 'verified',
    active = true,
    checkout_enabled = (medusa_variant_id is not null),
    updated_at = now()
where supplier = 'cj'
  and supplier_product_id = '<real-cj-product-id>';
```

If no real Medusa variant exists, leave `checkout_enabled = false`. Rocket will display the product but will not show a fake checkout button.

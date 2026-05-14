# dBaronX launch product and auth checklist

## Environment confirmation

Confirm the web deployment has these values configured before building:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_MEDUSA_BACKEND_URL`
- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`

Because `NEXT_PUBLIC_*` values are compiled into the browser bundle, rebuild and redeploy the web app after any of these values change.

## Product visibility browser checks

1. Visit `/api/store/products` and confirm it returns JSON with `success: true` and a products array.
2. Visit `/home` and confirm the Men's Cotton Linen Long Sleeve Casual Shirt appears with image, price, and product link.
3. Visit `/shop` and confirm the same product appears.
4. Visit `/products` and confirm the same product appears.
5. Visit `/products/mens-cotton-linen-long-sleeve-casual-shirt` and confirm the product detail page shows the same live product.
6. Open the product link from a card and confirm the URL includes the primary variant query when the variant is returned.

## Supabase Auth browser checks

1. Visit `/register`.
2. Register a user with full name, email, password, confirm password, and an optional referral code.
3. Confirm a new Supabase Auth user is created with user metadata for `full_name`, `display_name`, `referral_code` when provided, and `source=rocket_web`.
4. Visit `/login` and sign in with email/password.
5. Confirm login redirects to `/account` unless a safe `next` path is provided.
6. Open `/account` or `/profile` and confirm name, email, referral/reference details, profile edit, delete-account support link, and sign-out controls are visible.
7. Edit the displayed profile name and confirm the Supabase Auth user metadata updates.
8. Sign out and confirm the browser returns to `/home`.

## Optional storefront cache mirror

Do not migrate commerce source-of-truth data to Supabase. Medusa remains the commerce source of truth for products, variants, pricing, carts, checkout, orders, fulfillment, and settlement.

If a storefront display fallback is needed later, use an application-owned cache table only, for example:

```sql
create schema if not exists app_public;

create table if not exists app_public.storefront_product_cache (
  product_id text primary key,
  handle text not null unique,
  title text not null,
  thumbnail text,
  price_amount integer,
  currency_code text,
  primary_variant_id text,
  metadata jsonb not null default '{}'::jsonb,
  cached_at timestamptz not null default now()
);
```

Rules for this cache:

- It is only a storefront display mirror.
- It is only read after the live commerce product endpoint fails.
- It must be clearly marked internally as cache data.
- It must not create carts or orders.
- Checkout must continue through the Medusa/Stripe path.
- Do not create Medusa core commerce tables manually in Supabase.

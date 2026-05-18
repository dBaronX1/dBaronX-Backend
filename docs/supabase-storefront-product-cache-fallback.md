# Supabase storefront product cache fallback

This is an optional **display/cache fallback only** for Rocket storefront product visibility.
Medusa remains the commerce source of truth for product routes, variants, carts, checkout, Stripe payment, order, fulfillment, shipment, reward, wallet, and settlement state.

## Runtime behavior

- Rocket `/api/store/products` tries Medusa Store API first.
- Supabase cache is read only when Medusa is unreachable, returns a non-OK response, or returns no visible products for the requested list/handle.
- Cached rows are public-safe storefront display data.
- Checkout still requires a Medusa variant/cart/Stripe flow.
- If a cache row does not mirror `default_variant_id`, Rocket shows the product as currently unavailable for checkout and does not create an order from fallback data.

## Required env variables

Use only public Supabase browser-safe variables for this cache reader:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Do not expose service-role keys, database URLs, Stripe secrets, CJ tokens, Telegram tokens, internal service tokens, or Medusa admin tokens to browser code.

## Optional SQL

Run manually in Supabase if you choose to enable the cache. Do not run this from application code.

```sql
create schema if not exists app_public;

create table if not exists app_public.storefront_product_cache (
  id uuid primary key default gen_random_uuid(),
  medusa_product_id text unique,
  handle text unique not null,
  title text not null,
  description text,
  thumbnail text,
  image_url text,
  price_minor integer,
  currency_code text default 'usd',
  default_variant_id text,
  supplier text,
  supplier_product_id text,
  supplier_sku text,
  delivery_estimate text,
  metadata jsonb default '{}'::jsonb,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table app_public.storefront_product_cache enable row level security;

create policy "active storefront cache is public-readable"
  on app_public.storefront_product_cache
  for select
  to public, authenticated
  using (active = true);

create policy "service role can manage storefront cache"
  on app_public.storefront_product_cache
  for all
  to service_role
  using (true)
  with check (true);

create or replace function app_public.touch_storefront_product_cache_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger storefront_product_cache_updated_at
before update on app_public.storefront_product_cache
for each row
execute function app_public.touch_storefront_product_cache_updated_at();
```

## Data safety notes

Keep `metadata` public-safe. Do not place internal IDs, supplier secrets, access tokens, webhook secrets, admin tokens, database URLs, service-role keys, payment secrets, customer PII, stock truth, order state, fulfillment state, wallet state, rewards state, or settlement state in this cache.

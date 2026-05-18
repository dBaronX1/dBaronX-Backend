-- Supabase storefront products for Rocket display and CJ supplier sync.
-- Idempotent: safe to rerun in Supabase SQL editor or migration runner.

create schema if not exists app_public;
create extension if not exists pgcrypto;

grant usage on schema app_public to anon, authenticated, service_role;

create or replace function app_public.dbx_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists app_public.storefront_products (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'manual',
  supplier text,
  supplier_product_id text,
  supplier_sku text,
  medusa_product_id text,
  medusa_variant_id text,
  handle text unique not null,
  title text not null,
  description text,
  short_description text,
  thumbnail text,
  image_url text,
  images jsonb not null default '[]'::jsonb,
  price_minor integer,
  compare_at_price_minor integer,
  cost_minor integer,
  currency_code text not null default 'usd',
  inventory_quantity integer,
  stock_status text not null default 'unknown',
  delivery_estimate text,
  shipping_country text,
  category text,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  cj_raw jsonb not null default '{}'::jsonb,
  verification_status text not null default 'draft',
  active boolean not null default false,
  checkout_enabled boolean not null default false,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table app_public.storefront_products
  add column if not exists source text not null default 'manual',
  add column if not exists supplier text,
  add column if not exists supplier_product_id text,
  add column if not exists supplier_sku text,
  add column if not exists medusa_product_id text,
  add column if not exists medusa_variant_id text,
  add column if not exists handle text,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists short_description text,
  add column if not exists thumbnail text,
  add column if not exists image_url text,
  add column if not exists images jsonb not null default '[]'::jsonb,
  add column if not exists price_minor integer,
  add column if not exists compare_at_price_minor integer,
  add column if not exists cost_minor integer,
  add column if not exists currency_code text not null default 'usd',
  add column if not exists inventory_quantity integer,
  add column if not exists stock_status text not null default 'unknown',
  add column if not exists delivery_estimate text,
  add column if not exists shipping_country text,
  add column if not exists category text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists cj_raw jsonb not null default '{}'::jsonb,
  add column if not exists verification_status text not null default 'draft',
  add column if not exists active boolean not null default false,
  add column if not exists checkout_enabled boolean not null default false,
  add column if not exists synced_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'storefront_products_verification_status_check'
  ) then
    alter table app_public.storefront_products
      add constraint storefront_products_verification_status_check
      check (verification_status in ('draft', 'pending_review', 'verified', 'rejected'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'storefront_products_stock_status_check'
  ) then
    alter table app_public.storefront_products
      add constraint storefront_products_stock_status_check
      check (stock_status in ('unknown', 'in_stock', 'out_of_stock', 'limited'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'storefront_products_price_minor_check'
  ) then
    alter table app_public.storefront_products
      add constraint storefront_products_price_minor_check
      check (price_minor is null or price_minor >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'storefront_products_cost_minor_check'
  ) then
    alter table app_public.storefront_products
      add constraint storefront_products_cost_minor_check
      check (cost_minor is null or cost_minor >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'storefront_products_supplier_product_unique'
  ) then
    alter table app_public.storefront_products
      add constraint storefront_products_supplier_product_unique
      unique (supplier, supplier_product_id);
  end if;
end $$;

create unique index if not exists storefront_products_handle_idx on app_public.storefront_products(handle);
create index if not exists storefront_products_active_idx on app_public.storefront_products(active);
create index if not exists storefront_products_supplier_product_idx on app_public.storefront_products(supplier, supplier_product_id);
create index if not exists storefront_products_verification_status_idx on app_public.storefront_products(verification_status);
create index if not exists storefront_products_synced_at_idx on app_public.storefront_products(synced_at);

drop trigger if exists storefront_products_set_updated_at on app_public.storefront_products;
create trigger storefront_products_set_updated_at
before update on app_public.storefront_products
for each row execute function app_public.dbx_set_updated_at();

create table if not exists app_public.supplier_sync_sessions (
  id uuid primary key default gen_random_uuid(),
  supplier text not null,
  status text not null default 'started',
  source text,
  requested_by text,
  total_seen integer default 0,
  total_upserted integer default 0,
  total_verified integer default 0,
  total_rejected integer default 0,
  blockers jsonb not null default '[]'::jsonb,
  started_at timestamptz default now(),
  finished_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

alter table app_public.supplier_sync_sessions
  add column if not exists supplier text not null default 'unknown',
  add column if not exists status text not null default 'started',
  add column if not exists source text,
  add column if not exists requested_by text,
  add column if not exists total_seen integer default 0,
  add column if not exists total_upserted integer default 0,
  add column if not exists total_verified integer default 0,
  add column if not exists total_rejected integer default 0,
  add column if not exists blockers jsonb not null default '[]'::jsonb,
  add column if not exists started_at timestamptz default now(),
  add column if not exists finished_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table app_public.storefront_products enable row level security;
alter table app_public.supplier_sync_sessions enable row level security;

drop policy if exists storefront_products_public_verified_select on app_public.storefront_products;
create policy storefront_products_public_verified_select
on app_public.storefront_products
for select
to anon, authenticated
using (active = true and verification_status = 'verified');

drop policy if exists storefront_products_service_role_all on app_public.storefront_products;
create policy storefront_products_service_role_all
on app_public.storefront_products
for all
to service_role
using (true)
with check (true);

drop policy if exists supplier_sync_sessions_service_role_all on app_public.supplier_sync_sessions;
create policy supplier_sync_sessions_service_role_all
on app_public.supplier_sync_sessions
for all
to service_role
using (true)
with check (true);

grant select on app_public.storefront_products to anon, authenticated;
grant all on app_public.storefront_products to service_role;
grant all on app_public.supplier_sync_sessions to service_role;
revoke insert, update, delete on app_public.storefront_products from anon, authenticated;
revoke all on app_public.supplier_sync_sessions from anon, authenticated;

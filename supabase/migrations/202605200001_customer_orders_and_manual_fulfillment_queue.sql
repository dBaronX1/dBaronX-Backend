begin;

create schema if not exists app_public;
create schema if not exists app_private;
create extension if not exists pgcrypto;

create table if not exists app_public.customer_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text not null,
  checkout_ref text,
  stripe_session_id text,
  stripe_payment_intent_id text,
  payment_status text not null default 'pending',
  order_status text not null default 'created',
  fulfillment_status text not null default 'not_started',
  product_handle text,
  product_title text,
  amount_minor integer,
  currency text,
  supplier text,
  supplier_product_id text,
  supplier_sku text,
  shipping_name text,
  shipping_address jsonb not null default '{}'::jsonb,
  tracking_number text,
  tracking_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table app_public.customer_orders
  add column if not exists user_id uuid,
  add column if not exists email text,
  add column if not exists checkout_ref text,
  add column if not exists stripe_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists payment_status text not null default 'pending',
  add column if not exists order_status text not null default 'created',
  add column if not exists fulfillment_status text not null default 'not_started',
  add column if not exists product_handle text,
  add column if not exists product_title text,
  add column if not exists amount_minor integer,
  add column if not exists currency text,
  add column if not exists supplier text,
  add column if not exists supplier_product_id text,
  add column if not exists supplier_sku text,
  add column if not exists shipping_name text,
  add column if not exists shipping_address jsonb not null default '{}'::jsonb,
  add column if not exists tracking_number text,
  add column if not exists tracking_url text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_customer_orders_checkout_ref_unique on app_public.customer_orders(checkout_ref) where checkout_ref is not null;
create unique index if not exists idx_customer_orders_stripe_session_id_unique on app_public.customer_orders(stripe_session_id) where stripe_session_id is not null;
create index if not exists idx_customer_orders_user_id on app_public.customer_orders(user_id);
create index if not exists idx_customer_orders_email on app_public.customer_orders(lower(email));

create table if not exists app_private.fulfillment_tasks (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references app_public.customer_orders(id) on delete cascade,
  supplier text,
  supplier_product_id text,
  supplier_sku text,
  status text not null default 'queued_manual_review',
  assigned_to text,
  manual_required boolean not null default true,
  automation_eligible boolean not null default false,
  blockers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table app_private.fulfillment_tasks
  add column if not exists order_id uuid,
  add column if not exists supplier text,
  add column if not exists supplier_product_id text,
  add column if not exists supplier_sku text,
  add column if not exists status text not null default 'queued_manual_review',
  add column if not exists assigned_to text,
  add column if not exists manual_required boolean not null default true,
  add column if not exists automation_eligible boolean not null default false,
  add column if not exists blockers jsonb not null default '[]'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table app_private.fulfillment_tasks
  drop constraint if exists fulfillment_tasks_order_id_fkey,
  add constraint fulfillment_tasks_order_id_fkey foreign key(order_id) references app_public.customer_orders(id) on delete cascade;

create unique index if not exists idx_fulfillment_tasks_order_id_unique on app_private.fulfillment_tasks(order_id);
create index if not exists idx_fulfillment_tasks_status on app_private.fulfillment_tasks(status);

alter table app_public.customer_orders enable row level security;
alter table app_private.fulfillment_tasks enable row level security;

drop policy if exists "service role manages customer orders" on app_public.customer_orders;
create policy "service role manages customer orders" on app_public.customer_orders
for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "customer reads own orders" on app_public.customer_orders;
create policy "customer reads own orders" on app_public.customer_orders
for select using (auth.uid() = user_id);

drop policy if exists "service role manages fulfillment tasks" on app_private.fulfillment_tasks;
create policy "service role manages fulfillment tasks" on app_private.fulfillment_tasks
for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

commit;

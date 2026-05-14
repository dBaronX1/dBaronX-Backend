begin;

create schema if not exists app_public;
create extension if not exists pgcrypto;

create table if not exists app_public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text unique not null,
  event_type text not null,
  checkout_session_id text,
  payment_intent_id text,
  charge_id text,
  amount_total integer,
  currency text,
  livemode boolean default false,
  verified boolean not null default false,
  processed boolean not null default false,
  duplicate boolean not null default false,
  idempotency_key text,
  raw_event jsonb not null default '{}'::jsonb,
  metadata jsonb default '{}'::jsonb,
  blockers text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  event_id text,
  session_id text,
  stripe_session_id text,
  stripe_payment_intent_id text,
  cart_id text,
  order_ref text,
  checkout_ref text,
  amount_minor_units integer,
  verification_status text not null default 'verified',
  settlement_status text not null default 'payment_verified_order_sync_pending',
  raw_metadata_safe jsonb not null default '{}'::jsonb,
  medusa_order_id text,
  order_sync_status text not null default 'pending',
  received_at timestamptz not null default now()
);

alter table app_public.stripe_webhook_events
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists stripe_event_id text,
  add column if not exists event_type text,
  add column if not exists checkout_session_id text,
  add column if not exists payment_intent_id text,
  add column if not exists charge_id text,
  add column if not exists amount_total integer,
  add column if not exists currency text,
  add column if not exists livemode boolean default false,
  add column if not exists verified boolean not null default false,
  add column if not exists processed boolean not null default false,
  add column if not exists duplicate boolean not null default false,
  add column if not exists idempotency_key text,
  add column if not exists raw_event jsonb not null default '{}'::jsonb,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists blockers text[] default '{}',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now(),
  add column if not exists event_id text,
  add column if not exists session_id text,
  add column if not exists stripe_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists cart_id text,
  add column if not exists order_ref text,
  add column if not exists checkout_ref text,
  add column if not exists amount_minor_units integer,
  add column if not exists verification_status text not null default 'verified',
  add column if not exists settlement_status text not null default 'payment_verified_order_sync_pending',
  add column if not exists raw_metadata_safe jsonb not null default '{}'::jsonb,
  add column if not exists medusa_order_id text,
  add column if not exists order_sync_status text not null default 'pending',
  add column if not exists received_at timestamptz not null default now();

update app_public.stripe_webhook_events
set
  id = coalesce(id, gen_random_uuid()),
  stripe_event_id = coalesce(stripe_event_id, event_id),
  checkout_session_id = coalesce(checkout_session_id, stripe_session_id, session_id),
  payment_intent_id = coalesce(payment_intent_id, stripe_payment_intent_id),
  amount_total = coalesce(amount_total, amount_minor_units),
  verified = coalesce(verified, verification_status = 'verified'),
  idempotency_key = coalesce(idempotency_key, stripe_event_id, event_id),
  raw_event = coalesce(nullif(raw_event, '{}'::jsonb), jsonb_build_object('metadata', raw_metadata_safe)),
  metadata = coalesce(nullif(metadata, '{}'::jsonb), raw_metadata_safe, '{}'::jsonb),
  updated_at = coalesce(updated_at, created_at, now()),
  received_at = coalesce(received_at, created_at, now())
where id is null
   or stripe_event_id is null
   or checkout_session_id is null
   or payment_intent_id is null
   or amount_total is null
   or idempotency_key is null
   or raw_event = '{}'::jsonb
   or metadata = '{}'::jsonb;

alter table app_public.stripe_webhook_events
  alter column id set not null,
  alter column stripe_event_id set not null,
  alter column event_type set not null,
  alter column raw_event set not null,
  alter column verified set not null,
  alter column processed set not null,
  alter column duplicate set not null;

alter table app_public.stripe_webhook_events drop constraint if exists stripe_webhook_events_pkey;
alter table app_public.stripe_webhook_events add primary key (id);

create unique index if not exists idx_stripe_webhook_events_stripe_event_id
  on app_public.stripe_webhook_events(stripe_event_id);
create index if not exists idx_stripe_webhook_events_checkout_session_id
  on app_public.stripe_webhook_events(checkout_session_id);
create index if not exists idx_stripe_webhook_events_event_type
  on app_public.stripe_webhook_events(event_type);

create table if not exists app_public.economic_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  source text not null,
  source_event_id text,
  checkout_session_id text,
  cart_id text,
  order_ref text,
  user_id text,
  product_id text,
  variant_id text,
  amount integer,
  currency text,
  status text not null default 'pending',
  verified boolean not null default false,
  payload jsonb default '{}'::jsonb,
  blockers text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  source_module text,
  payment_rail text,
  direction text,
  reference_id text,
  idempotency_key text unique,
  metadata jsonb not null default '{}'::jsonb
);

alter table app_public.economic_events
  add column if not exists source text,
  add column if not exists source_event_id text,
  add column if not exists checkout_session_id text,
  add column if not exists cart_id text,
  add column if not exists order_ref text,
  add column if not exists user_id text,
  add column if not exists product_id text,
  add column if not exists variant_id text,
  add column if not exists verified boolean not null default false,
  add column if not exists payload jsonb default '{}'::jsonb,
  add column if not exists blockers text[] default '{}',
  add column if not exists updated_at timestamptz default now(),
  add column if not exists source_module text,
  add column if not exists payment_rail text,
  add column if not exists direction text,
  add column if not exists reference_id text,
  add column if not exists idempotency_key text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table app_public.economic_events drop constraint if exists economic_events_status_check;
alter table app_public.economic_events drop constraint if exists economic_events_direction_check;
alter table app_public.economic_events drop constraint if exists economic_events_amount_check;

update app_public.economic_events
set
  source = coalesce(source, payment_rail, 'stripe'),
  source_event_id = coalesce(source_event_id, idempotency_key),
  checkout_session_id = coalesce(checkout_session_id, metadata->>'checkoutSessionId', metadata->>'stripeSessionId'),
  cart_id = coalesce(cart_id, metadata->>'cartId'),
  order_ref = coalesce(order_ref, metadata->>'orderRef'),
  user_id = coalesce(user_id, metadata->>'userId'),
  product_id = coalesce(product_id, metadata->>'productId'),
  variant_id = coalesce(variant_id, metadata->>'variantId'),
  verified = coalesce(verified, status in ('verified', 'settled')),
  payload = coalesce(nullif(payload, '{}'::jsonb), metadata, '{}'::jsonb),
  updated_at = coalesce(updated_at, created_at, now())
where source is null
   or source_event_id is null
   or checkout_session_id is null
   or payload = '{}'::jsonb;

alter table app_public.economic_events
  alter column source set not null,
  alter column status set default 'pending',
  alter column verified set not null;

create index if not exists idx_economic_events_source_event_id
  on app_public.economic_events(source_event_id);
create index if not exists idx_economic_events_checkout_session_id
  on app_public.economic_events(checkout_session_id);
create index if not exists idx_economic_events_event_type
  on app_public.economic_events(event_type);
create index if not exists idx_economic_events_status
  on app_public.economic_events(status);

alter table app_public.stripe_webhook_events enable row level security;
alter table app_public.economic_events enable row level security;

drop policy if exists "service role manages stripe webhook events" on app_public.stripe_webhook_events;
create policy "service role manages stripe webhook events"
on app_public.stripe_webhook_events
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service role manages economic events" on app_public.economic_events;
create policy "service role manages economic events"
on app_public.economic_events
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

commit;

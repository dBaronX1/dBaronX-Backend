begin;

create schema if not exists app_public;

create table if not exists app_public.stripe_webhook_events (
  event_id text primary key,
  stripe_event_id text,
  event_type text not null,
  session_id text null,
  stripe_session_id text null,
  payment_intent_id text null,
  stripe_payment_intent_id text null,
  cart_id text null,
  order_ref text null,
  checkout_ref text null,
  amount_minor_units integer null,
  currency text null,
  verification_status text not null default 'verified',
  settlement_status text not null default 'payment_verified_order_sync_pending',
  idempotency_key text,
  raw_metadata_safe jsonb not null default '{}'::jsonb,
  medusa_order_id text null,
  order_sync_status text not null default 'pending',
  livemode boolean not null default false,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table app_public.stripe_webhook_events
  add column if not exists stripe_event_id text,
  add column if not exists stripe_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists cart_id text,
  add column if not exists order_ref text,
  add column if not exists checkout_ref text,
  add column if not exists amount_minor_units integer,
  add column if not exists currency text,
  add column if not exists verification_status text not null default 'verified',
  add column if not exists settlement_status text not null default 'payment_verified_order_sync_pending',
  add column if not exists idempotency_key text,
  add column if not exists raw_metadata_safe jsonb not null default '{}'::jsonb,
  add column if not exists medusa_order_id text,
  add column if not exists order_sync_status text not null default 'pending',
  add column if not exists updated_at timestamptz not null default now();

update app_public.stripe_webhook_events
set
  stripe_event_id = coalesce(stripe_event_id, event_id),
  stripe_session_id = coalesce(stripe_session_id, session_id),
  stripe_payment_intent_id = coalesce(stripe_payment_intent_id, payment_intent_id),
  idempotency_key = coalesce(idempotency_key, event_id),
  updated_at = coalesce(updated_at, created_at, now())
where stripe_event_id is null
  or stripe_session_id is null
  or stripe_payment_intent_id is null
  or idempotency_key is null;

create index if not exists idx_stripe_webhook_events_session_id
  on app_public.stripe_webhook_events(session_id);

create index if not exists idx_stripe_webhook_events_payment_intent_id
  on app_public.stripe_webhook_events(payment_intent_id);

create unique index if not exists idx_stripe_webhook_events_stripe_event_id
  on app_public.stripe_webhook_events(stripe_event_id);

create unique index if not exists idx_stripe_webhook_events_idempotency_key
  on app_public.stripe_webhook_events(idempotency_key);

create index if not exists idx_stripe_webhook_events_stripe_session_id
  on app_public.stripe_webhook_events(stripe_session_id);

create index if not exists idx_stripe_webhook_events_stripe_payment_intent_id
  on app_public.stripe_webhook_events(stripe_payment_intent_id);

create index if not exists idx_stripe_webhook_events_cart_id
  on app_public.stripe_webhook_events(cart_id);

create index if not exists idx_stripe_webhook_events_order_ref
  on app_public.stripe_webhook_events(order_ref);

create index if not exists idx_stripe_webhook_events_checkout_ref
  on app_public.stripe_webhook_events(checkout_ref);

create index if not exists idx_stripe_webhook_events_cart_order
  on app_public.stripe_webhook_events(cart_id, order_ref);

create index if not exists idx_stripe_webhook_events_cart_checkout
  on app_public.stripe_webhook_events(cart_id, checkout_ref);

create index if not exists idx_stripe_webhook_events_settlement_status
  on app_public.stripe_webhook_events(settlement_status);

create table if not exists app_public.economic_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  source_module text not null,
  payment_rail text not null,
  status text not null check (status in ('pending', 'verified', 'settled', 'failed')),
  direction text not null check (direction in ('credit', 'debit')),
  amount integer not null check (amount > 0),
  currency text not null,
  reference_id text not null,
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_economic_events_type
  on app_public.economic_events(event_type);

create index if not exists idx_economic_events_reference
  on app_public.economic_events(reference_id);

create index if not exists idx_economic_events_payment_rail
  on app_public.economic_events(payment_rail);

alter table app_public.stripe_webhook_events enable row level security;
alter table app_public.economic_events enable row level security;

drop policy if exists "service role manages stripe webhook events"
on app_public.stripe_webhook_events;

create policy "service role manages stripe webhook events"
on app_public.stripe_webhook_events
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service role manages economic events"
on app_public.economic_events;

create policy "service role manages economic events"
on app_public.economic_events
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

commit;

begin;

create schema if not exists app_public;

create table if not exists app_public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  session_id text null,
  payment_intent_id text null,
  livemode boolean not null default false,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_stripe_webhook_events_session_id
  on app_public.stripe_webhook_events(session_id);

create index if not exists idx_stripe_webhook_events_payment_intent_id
  on app_public.stripe_webhook_events(payment_intent_id);

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

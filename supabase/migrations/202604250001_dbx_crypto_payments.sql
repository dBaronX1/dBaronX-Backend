begin;

create schema if not exists app_public;

create table if not exists app_public.dbx_crypto_payment_intents (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  user_id uuid null,
  email text not null,
  customer_name text not null,
  cart_id text not null,
  medusa_order_id text null,
  expected_usd_cents integer not null check (expected_usd_cents > 0),
  expected_dbx_base_units numeric(40, 0) not null check (expected_dbx_base_units > 0),
  dbx_mint text not null,
  treasury_wallet text not null,
  sender_wallet text null,
  transaction_signature text null unique,
  status text not null default 'pending' check (
    status in (
      'pending',
      'submitted',
      'verified',
      'verified_pending_order_sync',
      'completed',
      'expired',
      'failed'
    )
  ),
  expires_at timestamptz not null,
  verified_at timestamptz null,
  completed_at timestamptz null,
  failure_reason text null,
  idempotency_key text null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_public.dbx_crypto_payment_verifications (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null references app_public.dbx_crypto_payment_intents(id) on delete cascade,
  reference text not null,
  transaction_signature text not null,
  status text not null check (status in ('passed', 'failed')),
  reason text null,
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists app_public.dbx_crypto_payment_events (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null references app_public.dbx_crypto_payment_intents(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_dbx_payment_intents_reference
  on app_public.dbx_crypto_payment_intents(reference);

create index if not exists idx_dbx_payment_intents_status
  on app_public.dbx_crypto_payment_intents(status);

create index if not exists idx_dbx_payment_intents_user_id
  on app_public.dbx_crypto_payment_intents(user_id);

create index if not exists idx_dbx_payment_intents_cart_id
  on app_public.dbx_crypto_payment_intents(cart_id);

create index if not exists idx_dbx_payment_intents_signature
  on app_public.dbx_crypto_payment_intents(transaction_signature);

create index if not exists idx_dbx_payment_verifications_intent_id
  on app_public.dbx_crypto_payment_verifications(intent_id);

create index if not exists idx_dbx_payment_events_intent_id
  on app_public.dbx_crypto_payment_events(intent_id);

create or replace function app_public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_dbx_crypto_payment_intents_updated_at
on app_public.dbx_crypto_payment_intents;

create trigger trg_dbx_crypto_payment_intents_updated_at
before update on app_public.dbx_crypto_payment_intents
for each row
execute function app_public.set_updated_at();

alter table app_public.dbx_crypto_payment_intents enable row level security;
alter table app_public.dbx_crypto_payment_verifications enable row level security;
alter table app_public.dbx_crypto_payment_events enable row level security;

drop policy if exists "service role manages dbx payment intents"
on app_public.dbx_crypto_payment_intents;

create policy "service role manages dbx payment intents"
on app_public.dbx_crypto_payment_intents
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service role manages dbx payment verifications"
on app_public.dbx_crypto_payment_verifications;

create policy "service role manages dbx payment verifications"
on app_public.dbx_crypto_payment_verifications
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service role manages dbx payment events"
on app_public.dbx_crypto_payment_events;

create policy "service role manages dbx payment events"
on app_public.dbx_crypto_payment_events
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

commit;
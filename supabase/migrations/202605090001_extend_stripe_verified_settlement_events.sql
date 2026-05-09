begin;

create schema if not exists app_public;

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

create unique index if not exists idx_stripe_webhook_events_stripe_event_id
  on app_public.stripe_webhook_events(stripe_event_id);

create unique index if not exists idx_stripe_webhook_events_idempotency_key
  on app_public.stripe_webhook_events(idempotency_key);

create index if not exists idx_stripe_webhook_events_stripe_session_id
  on app_public.stripe_webhook_events(stripe_session_id);

create index if not exists idx_stripe_webhook_events_cart_order
  on app_public.stripe_webhook_events(cart_id, order_ref);

create index if not exists idx_stripe_webhook_events_cart_checkout
  on app_public.stripe_webhook_events(cart_id, checkout_ref);

create index if not exists idx_stripe_webhook_events_settlement_status
  on app_public.stripe_webhook_events(settlement_status);

commit;

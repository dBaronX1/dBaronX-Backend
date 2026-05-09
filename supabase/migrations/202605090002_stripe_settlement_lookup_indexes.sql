begin;

create schema if not exists app_public;

create index if not exists idx_stripe_webhook_events_cart_id
  on app_public.stripe_webhook_events(cart_id);

create index if not exists idx_stripe_webhook_events_order_ref
  on app_public.stripe_webhook_events(order_ref);

create index if not exists idx_stripe_webhook_events_checkout_ref
  on app_public.stripe_webhook_events(checkout_ref);

create index if not exists idx_stripe_webhook_events_stripe_payment_intent_id
  on app_public.stripe_webhook_events(stripe_payment_intent_id);

commit;

begin;

alter table app_public.customer_orders
  add column if not exists cart_id text,
  add column if not exists line_items jsonb not null default '[]'::jsonb,
  add column if not exists purchased_line_item_keys jsonb not null default '[]'::jsonb;

create index if not exists idx_customer_orders_cart_id on app_public.customer_orders(cart_id);

commit;

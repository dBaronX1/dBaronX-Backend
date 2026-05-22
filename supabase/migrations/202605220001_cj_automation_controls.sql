-- idempotent CJ automation approval/order state columns
alter table if exists app_private.fulfillment_tasks
  add column if not exists admin_approved_at timestamptz,
  add column if not exists admin_override boolean not null default false,
  add column if not exists disapprove_reason text,
  add column if not exists disapprove_note text,
  add column if not exists cj_order_id text,
  add column if not exists cj_order_ref text,
  add column if not exists cj_freight_minor bigint,
  add column if not exists idempotency_key text;

create unique index if not exists fulfillment_tasks_cj_order_id_uq
  on app_private.fulfillment_tasks (cj_order_id)
  where cj_order_id is not null;

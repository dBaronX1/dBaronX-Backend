alter table app_private.fulfillment_tasks
  add column if not exists admin_approved_at timestamptz,
  add column if not exists admin_approved_by text,
  add column if not exists admin_disapproved_at timestamptz,
  add column if not exists disapprove_reason text,
  add column if not exists disapprove_note text,
  add column if not exists cj_order_id text,
  add column if not exists cj_order_status text,
  add column if not exists idempotency_key text,
  add column if not exists automation_attempted_at timestamptz,
  add column if not exists automation_error text,
  add column if not exists manual_exception_reason text;

create schema if not exists app_private;

create table if not exists app_private.cj_product_import_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'cj',
  mode text not null,
  status text not null,
  requested_by text null,
  category_slug text null,
  import_limit int not null default 50,
  imported_count int not null default 0,
  accepted_count int not null default 0,
  rejected_count int not null default 0,
  blockers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_private.cj_product_import_items (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid references app_private.cj_product_import_runs(id) on delete cascade,
  supplier text not null default 'cj',
  supplier_product_id text not null,
  supplier_sku text null,
  cj_payload jsonb not null default '{}'::jsonb,
  title text not null,
  handle text not null,
  description text null,
  source_url text null,
  image_url text null,
  category text not null default 'All',
  category_slug text not null default 'all',
  price_minor int null,
  cost_minor int null,
  stock_qty int null,
  shipping_countries text[] not null default array[]::text[],
  delivery_estimate text null,
  validation_status text not null default 'pending_validation',
  approval_status text not null default 'pending_admin_approval',
  publish_status text not null default 'not_published',
  blockers jsonb not null default '[]'::jsonb,
  medusa_product_id text null,
  medusa_variant_id text null,
  storefront_product_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cj_import_runs_created_at
  on app_private.cj_product_import_runs (created_at desc);
create index if not exists idx_cj_import_runs_status
  on app_private.cj_product_import_runs (status);
create index if not exists idx_cj_import_items_run_id
  on app_private.cj_product_import_items (import_run_id);
create index if not exists idx_cj_import_items_publish_status
  on app_private.cj_product_import_items (publish_status);
create index if not exists idx_cj_import_items_validation_approval
  on app_private.cj_product_import_items (validation_status, approval_status);
create unique index if not exists ux_cj_import_items_supplier_product_sku
  on app_private.cj_product_import_items (supplier, supplier_product_id, coalesce(supplier_sku, ''));

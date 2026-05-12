-- dBaronX platform foundation: Supabase business/auth data tables.
-- Safe additive migration: creates missing tables, indexes, triggers, RLS policies, and first-owner bootstrap RPC.
create extension if not exists pgcrypto;

create or replace function public.dbx_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.dbx_generate_reference_id(prefix text)
returns text
language sql
stable
as $$
  select upper(regexp_replace(coalesce(nullif(prefix, ''), 'DBX'), '[^a-zA-Z0-9]', '', 'g')) || '-' || upper(substr(encode(gen_random_bytes(9), 'hex'), 1, 18));
$$;

create or replace function public.dbx_generate_referral_code()
returns text
language sql
stable
as $$
  select 'DBX-' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 10));
$$;

create or replace function public.dbx_generate_initiation_code()
returns text
language sql
stable
as $$
  select 'INIT-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 12));
$$;

create table if not exists public.dbx_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  display_name text,
  telegram_user_id text,
  status text not null default 'active',
  role text not null default 'user',
  is_first_platform_user boolean not null default false,
  first_user_number integer,
  owner_reference_id text,
  reference_id text,
  code text,
  external_id text,
  referral_code text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint dbx_profiles_user_id_key unique (user_id),
  constraint dbx_profiles_owner_reference_id_key unique (owner_reference_id),
  constraint dbx_profiles_referral_code_key unique (referral_code)
);

create table if not exists public.dbx_user_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_user_sessions_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_onboarding_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_owner_bootstrap_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_first_user_registry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  first_user_number integer,
  owner_first_user_code text,
  owner_reference_id text,
  constraint dbx_first_user_registry_first_user_number_key unique (first_user_number),
  constraint dbx_first_user_registry_owner_first_user_code_key unique (owner_first_user_code),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_referral_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  referral_code text,
  constraint dbx_referral_codes_referral_code_key unique (referral_code),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_referral_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  referral_code text,
  link_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_referral_clicks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_referral_attributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_referral_earnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  amount_minor bigint not null default 0,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_invitation_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_initiation_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  initiation_code text,
  link_path text,
  constraint dbx_initiation_links_initiation_code_key unique (initiation_code),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  currency text not null default 'USD',
  available_minor bigint not null default 0,
  pending_minor bigint not null default 0,
  lifetime_earned_minor bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  amount_minor bigint not null default 0,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  amount_minor bigint not null default 0,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_payout_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_payout_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_affiliate_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  affiliate_code text,
  constraint dbx_affiliate_accounts_affiliate_code_key unique (affiliate_code),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_affiliate_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_affiliate_conversions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  amount_minor bigint not null default 0,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_advertisers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_ad_creatives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_watch_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_watch_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_watch_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_fraud_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_commerce_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_commerce_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_commerce_order_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_payment_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  amount_minor bigint not null default 0,
  currency text not null default 'USD',
  provider text,
  provider_payment_id text,
  constraint dbx_payment_records_provider_payment_id_key unique (provider, provider_payment_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_supplier_product_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_email_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_login_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_vpn_proxy_risk_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_compliance_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_platform_bootstrap (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  bootstrap_key text not null,
  enabled boolean not null default false,
  constraint dbx_platform_bootstrap_bootstrap_key_key unique (bootstrap_key),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_stripe_events (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  stripe_event_id text,
  constraint dbx_stripe_events_stripe_event_id_key unique (stripe_event_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_supplier_products (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  supplier text,
  supplier_sku text,
  handle text,
  verification_status text not null default 'draft_pending_verification',
  real_supplier_product boolean not null default false,
  constraint dbx_supplier_products_supplier_sku_key unique (supplier, supplier_sku),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_product_seed_audit (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_country_access_rules (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dbx_product_restriction_rules (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'active',
  reference_id text,
  code text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

-- Common additive indexes.
create index if not exists dbx_profiles_status_idx on public.dbx_profiles (status);
create index if not exists dbx_profiles_created_at_idx on public.dbx_profiles (created_at desc);
create index if not exists dbx_profiles_user_id_idx on public.dbx_profiles (user_id);
create index if not exists dbx_profiles_reference_id_idx on public.dbx_profiles (reference_id) where reference_id is not null;
create index if not exists dbx_profiles_code_idx on public.dbx_profiles (code) where code is not null;
create index if not exists dbx_profiles_external_id_idx on public.dbx_profiles (external_id) where external_id is not null;
drop trigger if exists dbx_profiles_set_updated_at on public.dbx_profiles;
create trigger dbx_profiles_set_updated_at before update on public.dbx_profiles for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_user_identities_status_idx on public.dbx_user_identities (status);
create index if not exists dbx_user_identities_created_at_idx on public.dbx_user_identities (created_at desc);
create index if not exists dbx_user_identities_user_id_idx on public.dbx_user_identities (user_id);
create index if not exists dbx_user_identities_reference_id_idx on public.dbx_user_identities (reference_id) where reference_id is not null;
create index if not exists dbx_user_identities_code_idx on public.dbx_user_identities (code) where code is not null;
create index if not exists dbx_user_identities_external_id_idx on public.dbx_user_identities (external_id) where external_id is not null;
drop trigger if exists dbx_user_identities_set_updated_at on public.dbx_user_identities;
create trigger dbx_user_identities_set_updated_at before update on public.dbx_user_identities for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_user_sessions_audit_status_idx on public.dbx_user_sessions_audit (status);
create index if not exists dbx_user_sessions_audit_created_at_idx on public.dbx_user_sessions_audit (created_at desc);
create index if not exists dbx_user_sessions_audit_user_id_idx on public.dbx_user_sessions_audit (user_id);
create index if not exists dbx_user_sessions_audit_reference_id_idx on public.dbx_user_sessions_audit (reference_id) where reference_id is not null;
create index if not exists dbx_user_sessions_audit_code_idx on public.dbx_user_sessions_audit (code) where code is not null;
create index if not exists dbx_user_sessions_audit_external_id_idx on public.dbx_user_sessions_audit (external_id) where external_id is not null;
drop trigger if exists dbx_user_sessions_audit_set_updated_at on public.dbx_user_sessions_audit;
create trigger dbx_user_sessions_audit_set_updated_at before update on public.dbx_user_sessions_audit for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_onboarding_states_status_idx on public.dbx_onboarding_states (status);
create index if not exists dbx_onboarding_states_created_at_idx on public.dbx_onboarding_states (created_at desc);
create index if not exists dbx_onboarding_states_user_id_idx on public.dbx_onboarding_states (user_id);
create index if not exists dbx_onboarding_states_reference_id_idx on public.dbx_onboarding_states (reference_id) where reference_id is not null;
create index if not exists dbx_onboarding_states_code_idx on public.dbx_onboarding_states (code) where code is not null;
create index if not exists dbx_onboarding_states_external_id_idx on public.dbx_onboarding_states (external_id) where external_id is not null;
drop trigger if exists dbx_onboarding_states_set_updated_at on public.dbx_onboarding_states;
create trigger dbx_onboarding_states_set_updated_at before update on public.dbx_onboarding_states for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_owner_bootstrap_claims_status_idx on public.dbx_owner_bootstrap_claims (status);
create index if not exists dbx_owner_bootstrap_claims_created_at_idx on public.dbx_owner_bootstrap_claims (created_at desc);
create index if not exists dbx_owner_bootstrap_claims_user_id_idx on public.dbx_owner_bootstrap_claims (user_id);
create index if not exists dbx_owner_bootstrap_claims_reference_id_idx on public.dbx_owner_bootstrap_claims (reference_id) where reference_id is not null;
create index if not exists dbx_owner_bootstrap_claims_code_idx on public.dbx_owner_bootstrap_claims (code) where code is not null;
create index if not exists dbx_owner_bootstrap_claims_external_id_idx on public.dbx_owner_bootstrap_claims (external_id) where external_id is not null;
drop trigger if exists dbx_owner_bootstrap_claims_set_updated_at on public.dbx_owner_bootstrap_claims;
create trigger dbx_owner_bootstrap_claims_set_updated_at before update on public.dbx_owner_bootstrap_claims for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_first_user_registry_status_idx on public.dbx_first_user_registry (status);
create index if not exists dbx_first_user_registry_created_at_idx on public.dbx_first_user_registry (created_at desc);
create index if not exists dbx_first_user_registry_user_id_idx on public.dbx_first_user_registry (user_id);
create index if not exists dbx_first_user_registry_reference_id_idx on public.dbx_first_user_registry (reference_id) where reference_id is not null;
create index if not exists dbx_first_user_registry_code_idx on public.dbx_first_user_registry (code) where code is not null;
create index if not exists dbx_first_user_registry_external_id_idx on public.dbx_first_user_registry (external_id) where external_id is not null;
drop trigger if exists dbx_first_user_registry_set_updated_at on public.dbx_first_user_registry;
create trigger dbx_first_user_registry_set_updated_at before update on public.dbx_first_user_registry for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_referral_codes_status_idx on public.dbx_referral_codes (status);
create index if not exists dbx_referral_codes_created_at_idx on public.dbx_referral_codes (created_at desc);
create index if not exists dbx_referral_codes_user_id_idx on public.dbx_referral_codes (user_id);
create index if not exists dbx_referral_codes_reference_id_idx on public.dbx_referral_codes (reference_id) where reference_id is not null;
create index if not exists dbx_referral_codes_code_idx on public.dbx_referral_codes (code) where code is not null;
create index if not exists dbx_referral_codes_external_id_idx on public.dbx_referral_codes (external_id) where external_id is not null;
drop trigger if exists dbx_referral_codes_set_updated_at on public.dbx_referral_codes;
create trigger dbx_referral_codes_set_updated_at before update on public.dbx_referral_codes for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_referral_links_status_idx on public.dbx_referral_links (status);
create index if not exists dbx_referral_links_created_at_idx on public.dbx_referral_links (created_at desc);
create index if not exists dbx_referral_links_user_id_idx on public.dbx_referral_links (user_id);
create index if not exists dbx_referral_links_reference_id_idx on public.dbx_referral_links (reference_id) where reference_id is not null;
create index if not exists dbx_referral_links_code_idx on public.dbx_referral_links (code) where code is not null;
create index if not exists dbx_referral_links_external_id_idx on public.dbx_referral_links (external_id) where external_id is not null;
drop trigger if exists dbx_referral_links_set_updated_at on public.dbx_referral_links;
create trigger dbx_referral_links_set_updated_at before update on public.dbx_referral_links for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_referral_clicks_status_idx on public.dbx_referral_clicks (status);
create index if not exists dbx_referral_clicks_created_at_idx on public.dbx_referral_clicks (created_at desc);
create index if not exists dbx_referral_clicks_user_id_idx on public.dbx_referral_clicks (user_id);
create index if not exists dbx_referral_clicks_reference_id_idx on public.dbx_referral_clicks (reference_id) where reference_id is not null;
create index if not exists dbx_referral_clicks_code_idx on public.dbx_referral_clicks (code) where code is not null;
create index if not exists dbx_referral_clicks_external_id_idx on public.dbx_referral_clicks (external_id) where external_id is not null;
drop trigger if exists dbx_referral_clicks_set_updated_at on public.dbx_referral_clicks;
create trigger dbx_referral_clicks_set_updated_at before update on public.dbx_referral_clicks for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_referral_attributions_status_idx on public.dbx_referral_attributions (status);
create index if not exists dbx_referral_attributions_created_at_idx on public.dbx_referral_attributions (created_at desc);
create index if not exists dbx_referral_attributions_user_id_idx on public.dbx_referral_attributions (user_id);
create index if not exists dbx_referral_attributions_reference_id_idx on public.dbx_referral_attributions (reference_id) where reference_id is not null;
create index if not exists dbx_referral_attributions_code_idx on public.dbx_referral_attributions (code) where code is not null;
create index if not exists dbx_referral_attributions_external_id_idx on public.dbx_referral_attributions (external_id) where external_id is not null;
drop trigger if exists dbx_referral_attributions_set_updated_at on public.dbx_referral_attributions;
create trigger dbx_referral_attributions_set_updated_at before update on public.dbx_referral_attributions for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_referral_earnings_status_idx on public.dbx_referral_earnings (status);
create index if not exists dbx_referral_earnings_created_at_idx on public.dbx_referral_earnings (created_at desc);
create index if not exists dbx_referral_earnings_user_id_idx on public.dbx_referral_earnings (user_id);
create index if not exists dbx_referral_earnings_reference_id_idx on public.dbx_referral_earnings (reference_id) where reference_id is not null;
create index if not exists dbx_referral_earnings_code_idx on public.dbx_referral_earnings (code) where code is not null;
create index if not exists dbx_referral_earnings_external_id_idx on public.dbx_referral_earnings (external_id) where external_id is not null;
drop trigger if exists dbx_referral_earnings_set_updated_at on public.dbx_referral_earnings;
create trigger dbx_referral_earnings_set_updated_at before update on public.dbx_referral_earnings for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_invitation_links_status_idx on public.dbx_invitation_links (status);
create index if not exists dbx_invitation_links_created_at_idx on public.dbx_invitation_links (created_at desc);
create index if not exists dbx_invitation_links_user_id_idx on public.dbx_invitation_links (user_id);
create index if not exists dbx_invitation_links_reference_id_idx on public.dbx_invitation_links (reference_id) where reference_id is not null;
create index if not exists dbx_invitation_links_code_idx on public.dbx_invitation_links (code) where code is not null;
create index if not exists dbx_invitation_links_external_id_idx on public.dbx_invitation_links (external_id) where external_id is not null;
drop trigger if exists dbx_invitation_links_set_updated_at on public.dbx_invitation_links;
create trigger dbx_invitation_links_set_updated_at before update on public.dbx_invitation_links for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_initiation_links_status_idx on public.dbx_initiation_links (status);
create index if not exists dbx_initiation_links_created_at_idx on public.dbx_initiation_links (created_at desc);
create index if not exists dbx_initiation_links_user_id_idx on public.dbx_initiation_links (user_id);
create index if not exists dbx_initiation_links_reference_id_idx on public.dbx_initiation_links (reference_id) where reference_id is not null;
create index if not exists dbx_initiation_links_code_idx on public.dbx_initiation_links (code) where code is not null;
create index if not exists dbx_initiation_links_external_id_idx on public.dbx_initiation_links (external_id) where external_id is not null;
drop trigger if exists dbx_initiation_links_set_updated_at on public.dbx_initiation_links;
create trigger dbx_initiation_links_set_updated_at before update on public.dbx_initiation_links for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_wallets_status_idx on public.dbx_wallets (status);
create index if not exists dbx_wallets_created_at_idx on public.dbx_wallets (created_at desc);
create index if not exists dbx_wallets_user_id_idx on public.dbx_wallets (user_id);
create index if not exists dbx_wallets_reference_id_idx on public.dbx_wallets (reference_id) where reference_id is not null;
create index if not exists dbx_wallets_code_idx on public.dbx_wallets (code) where code is not null;
create index if not exists dbx_wallets_external_id_idx on public.dbx_wallets (external_id) where external_id is not null;
drop trigger if exists dbx_wallets_set_updated_at on public.dbx_wallets;
create trigger dbx_wallets_set_updated_at before update on public.dbx_wallets for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_ledger_entries_status_idx on public.dbx_ledger_entries (status);
create index if not exists dbx_ledger_entries_created_at_idx on public.dbx_ledger_entries (created_at desc);
create index if not exists dbx_ledger_entries_user_id_idx on public.dbx_ledger_entries (user_id);
create index if not exists dbx_ledger_entries_reference_id_idx on public.dbx_ledger_entries (reference_id) where reference_id is not null;
create index if not exists dbx_ledger_entries_code_idx on public.dbx_ledger_entries (code) where code is not null;
create index if not exists dbx_ledger_entries_external_id_idx on public.dbx_ledger_entries (external_id) where external_id is not null;
drop trigger if exists dbx_ledger_entries_set_updated_at on public.dbx_ledger_entries;
create trigger dbx_ledger_entries_set_updated_at before update on public.dbx_ledger_entries for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_wallet_transactions_status_idx on public.dbx_wallet_transactions (status);
create index if not exists dbx_wallet_transactions_created_at_idx on public.dbx_wallet_transactions (created_at desc);
create index if not exists dbx_wallet_transactions_user_id_idx on public.dbx_wallet_transactions (user_id);
create index if not exists dbx_wallet_transactions_reference_id_idx on public.dbx_wallet_transactions (reference_id) where reference_id is not null;
create index if not exists dbx_wallet_transactions_code_idx on public.dbx_wallet_transactions (code) where code is not null;
create index if not exists dbx_wallet_transactions_external_id_idx on public.dbx_wallet_transactions (external_id) where external_id is not null;
drop trigger if exists dbx_wallet_transactions_set_updated_at on public.dbx_wallet_transactions;
create trigger dbx_wallet_transactions_set_updated_at before update on public.dbx_wallet_transactions for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_payout_accounts_status_idx on public.dbx_payout_accounts (status);
create index if not exists dbx_payout_accounts_created_at_idx on public.dbx_payout_accounts (created_at desc);
create index if not exists dbx_payout_accounts_user_id_idx on public.dbx_payout_accounts (user_id);
create index if not exists dbx_payout_accounts_reference_id_idx on public.dbx_payout_accounts (reference_id) where reference_id is not null;
create index if not exists dbx_payout_accounts_code_idx on public.dbx_payout_accounts (code) where code is not null;
create index if not exists dbx_payout_accounts_external_id_idx on public.dbx_payout_accounts (external_id) where external_id is not null;
drop trigger if exists dbx_payout_accounts_set_updated_at on public.dbx_payout_accounts;
create trigger dbx_payout_accounts_set_updated_at before update on public.dbx_payout_accounts for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_payout_requests_status_idx on public.dbx_payout_requests (status);
create index if not exists dbx_payout_requests_created_at_idx on public.dbx_payout_requests (created_at desc);
create index if not exists dbx_payout_requests_user_id_idx on public.dbx_payout_requests (user_id);
create index if not exists dbx_payout_requests_reference_id_idx on public.dbx_payout_requests (reference_id) where reference_id is not null;
create index if not exists dbx_payout_requests_code_idx on public.dbx_payout_requests (code) where code is not null;
create index if not exists dbx_payout_requests_external_id_idx on public.dbx_payout_requests (external_id) where external_id is not null;
drop trigger if exists dbx_payout_requests_set_updated_at on public.dbx_payout_requests;
create trigger dbx_payout_requests_set_updated_at before update on public.dbx_payout_requests for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_affiliate_accounts_status_idx on public.dbx_affiliate_accounts (status);
create index if not exists dbx_affiliate_accounts_created_at_idx on public.dbx_affiliate_accounts (created_at desc);
create index if not exists dbx_affiliate_accounts_user_id_idx on public.dbx_affiliate_accounts (user_id);
create index if not exists dbx_affiliate_accounts_reference_id_idx on public.dbx_affiliate_accounts (reference_id) where reference_id is not null;
create index if not exists dbx_affiliate_accounts_code_idx on public.dbx_affiliate_accounts (code) where code is not null;
create index if not exists dbx_affiliate_accounts_external_id_idx on public.dbx_affiliate_accounts (external_id) where external_id is not null;
drop trigger if exists dbx_affiliate_accounts_set_updated_at on public.dbx_affiliate_accounts;
create trigger dbx_affiliate_accounts_set_updated_at before update on public.dbx_affiliate_accounts for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_affiliate_campaigns_status_idx on public.dbx_affiliate_campaigns (status);
create index if not exists dbx_affiliate_campaigns_created_at_idx on public.dbx_affiliate_campaigns (created_at desc);
create index if not exists dbx_affiliate_campaigns_user_id_idx on public.dbx_affiliate_campaigns (user_id);
create index if not exists dbx_affiliate_campaigns_reference_id_idx on public.dbx_affiliate_campaigns (reference_id) where reference_id is not null;
create index if not exists dbx_affiliate_campaigns_code_idx on public.dbx_affiliate_campaigns (code) where code is not null;
create index if not exists dbx_affiliate_campaigns_external_id_idx on public.dbx_affiliate_campaigns (external_id) where external_id is not null;
drop trigger if exists dbx_affiliate_campaigns_set_updated_at on public.dbx_affiliate_campaigns;
create trigger dbx_affiliate_campaigns_set_updated_at before update on public.dbx_affiliate_campaigns for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_affiliate_conversions_status_idx on public.dbx_affiliate_conversions (status);
create index if not exists dbx_affiliate_conversions_created_at_idx on public.dbx_affiliate_conversions (created_at desc);
create index if not exists dbx_affiliate_conversions_user_id_idx on public.dbx_affiliate_conversions (user_id);
create index if not exists dbx_affiliate_conversions_reference_id_idx on public.dbx_affiliate_conversions (reference_id) where reference_id is not null;
create index if not exists dbx_affiliate_conversions_code_idx on public.dbx_affiliate_conversions (code) where code is not null;
create index if not exists dbx_affiliate_conversions_external_id_idx on public.dbx_affiliate_conversions (external_id) where external_id is not null;
drop trigger if exists dbx_affiliate_conversions_set_updated_at on public.dbx_affiliate_conversions;
create trigger dbx_affiliate_conversions_set_updated_at before update on public.dbx_affiliate_conversions for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_affiliate_commissions_status_idx on public.dbx_affiliate_commissions (status);
create index if not exists dbx_affiliate_commissions_created_at_idx on public.dbx_affiliate_commissions (created_at desc);
create index if not exists dbx_affiliate_commissions_user_id_idx on public.dbx_affiliate_commissions (user_id);
create index if not exists dbx_affiliate_commissions_reference_id_idx on public.dbx_affiliate_commissions (reference_id) where reference_id is not null;
create index if not exists dbx_affiliate_commissions_code_idx on public.dbx_affiliate_commissions (code) where code is not null;
create index if not exists dbx_affiliate_commissions_external_id_idx on public.dbx_affiliate_commissions (external_id) where external_id is not null;
drop trigger if exists dbx_affiliate_commissions_set_updated_at on public.dbx_affiliate_commissions;
create trigger dbx_affiliate_commissions_set_updated_at before update on public.dbx_affiliate_commissions for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_advertisers_status_idx on public.dbx_advertisers (status);
create index if not exists dbx_advertisers_created_at_idx on public.dbx_advertisers (created_at desc);
create index if not exists dbx_advertisers_user_id_idx on public.dbx_advertisers (user_id);
create index if not exists dbx_advertisers_reference_id_idx on public.dbx_advertisers (reference_id) where reference_id is not null;
create index if not exists dbx_advertisers_code_idx on public.dbx_advertisers (code) where code is not null;
create index if not exists dbx_advertisers_external_id_idx on public.dbx_advertisers (external_id) where external_id is not null;
drop trigger if exists dbx_advertisers_set_updated_at on public.dbx_advertisers;
create trigger dbx_advertisers_set_updated_at before update on public.dbx_advertisers for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_ad_campaigns_status_idx on public.dbx_ad_campaigns (status);
create index if not exists dbx_ad_campaigns_created_at_idx on public.dbx_ad_campaigns (created_at desc);
create index if not exists dbx_ad_campaigns_user_id_idx on public.dbx_ad_campaigns (user_id);
create index if not exists dbx_ad_campaigns_reference_id_idx on public.dbx_ad_campaigns (reference_id) where reference_id is not null;
create index if not exists dbx_ad_campaigns_code_idx on public.dbx_ad_campaigns (code) where code is not null;
create index if not exists dbx_ad_campaigns_external_id_idx on public.dbx_ad_campaigns (external_id) where external_id is not null;
drop trigger if exists dbx_ad_campaigns_set_updated_at on public.dbx_ad_campaigns;
create trigger dbx_ad_campaigns_set_updated_at before update on public.dbx_ad_campaigns for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_ad_creatives_status_idx on public.dbx_ad_creatives (status);
create index if not exists dbx_ad_creatives_created_at_idx on public.dbx_ad_creatives (created_at desc);
create index if not exists dbx_ad_creatives_user_id_idx on public.dbx_ad_creatives (user_id);
create index if not exists dbx_ad_creatives_reference_id_idx on public.dbx_ad_creatives (reference_id) where reference_id is not null;
create index if not exists dbx_ad_creatives_code_idx on public.dbx_ad_creatives (code) where code is not null;
create index if not exists dbx_ad_creatives_external_id_idx on public.dbx_ad_creatives (external_id) where external_id is not null;
drop trigger if exists dbx_ad_creatives_set_updated_at on public.dbx_ad_creatives;
create trigger dbx_ad_creatives_set_updated_at before update on public.dbx_ad_creatives for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_watch_sessions_status_idx on public.dbx_watch_sessions (status);
create index if not exists dbx_watch_sessions_created_at_idx on public.dbx_watch_sessions (created_at desc);
create index if not exists dbx_watch_sessions_user_id_idx on public.dbx_watch_sessions (user_id);
create index if not exists dbx_watch_sessions_reference_id_idx on public.dbx_watch_sessions (reference_id) where reference_id is not null;
create index if not exists dbx_watch_sessions_code_idx on public.dbx_watch_sessions (code) where code is not null;
create index if not exists dbx_watch_sessions_external_id_idx on public.dbx_watch_sessions (external_id) where external_id is not null;
drop trigger if exists dbx_watch_sessions_set_updated_at on public.dbx_watch_sessions;
create trigger dbx_watch_sessions_set_updated_at before update on public.dbx_watch_sessions for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_watch_events_status_idx on public.dbx_watch_events (status);
create index if not exists dbx_watch_events_created_at_idx on public.dbx_watch_events (created_at desc);
create index if not exists dbx_watch_events_user_id_idx on public.dbx_watch_events (user_id);
create index if not exists dbx_watch_events_reference_id_idx on public.dbx_watch_events (reference_id) where reference_id is not null;
create index if not exists dbx_watch_events_code_idx on public.dbx_watch_events (code) where code is not null;
create index if not exists dbx_watch_events_external_id_idx on public.dbx_watch_events (external_id) where external_id is not null;
drop trigger if exists dbx_watch_events_set_updated_at on public.dbx_watch_events;
create trigger dbx_watch_events_set_updated_at before update on public.dbx_watch_events for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_watch_rewards_status_idx on public.dbx_watch_rewards (status);
create index if not exists dbx_watch_rewards_created_at_idx on public.dbx_watch_rewards (created_at desc);
create index if not exists dbx_watch_rewards_user_id_idx on public.dbx_watch_rewards (user_id);
create index if not exists dbx_watch_rewards_reference_id_idx on public.dbx_watch_rewards (reference_id) where reference_id is not null;
create index if not exists dbx_watch_rewards_code_idx on public.dbx_watch_rewards (code) where code is not null;
create index if not exists dbx_watch_rewards_external_id_idx on public.dbx_watch_rewards (external_id) where external_id is not null;
drop trigger if exists dbx_watch_rewards_set_updated_at on public.dbx_watch_rewards;
create trigger dbx_watch_rewards_set_updated_at before update on public.dbx_watch_rewards for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_fraud_signals_status_idx on public.dbx_fraud_signals (status);
create index if not exists dbx_fraud_signals_created_at_idx on public.dbx_fraud_signals (created_at desc);
create index if not exists dbx_fraud_signals_user_id_idx on public.dbx_fraud_signals (user_id);
create index if not exists dbx_fraud_signals_reference_id_idx on public.dbx_fraud_signals (reference_id) where reference_id is not null;
create index if not exists dbx_fraud_signals_code_idx on public.dbx_fraud_signals (code) where code is not null;
create index if not exists dbx_fraud_signals_external_id_idx on public.dbx_fraud_signals (external_id) where external_id is not null;
drop trigger if exists dbx_fraud_signals_set_updated_at on public.dbx_fraud_signals;
create trigger dbx_fraud_signals_set_updated_at before update on public.dbx_fraud_signals for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_commerce_customers_status_idx on public.dbx_commerce_customers (status);
create index if not exists dbx_commerce_customers_created_at_idx on public.dbx_commerce_customers (created_at desc);
create index if not exists dbx_commerce_customers_user_id_idx on public.dbx_commerce_customers (user_id);
create index if not exists dbx_commerce_customers_reference_id_idx on public.dbx_commerce_customers (reference_id) where reference_id is not null;
create index if not exists dbx_commerce_customers_code_idx on public.dbx_commerce_customers (code) where code is not null;
create index if not exists dbx_commerce_customers_external_id_idx on public.dbx_commerce_customers (external_id) where external_id is not null;
drop trigger if exists dbx_commerce_customers_set_updated_at on public.dbx_commerce_customers;
create trigger dbx_commerce_customers_set_updated_at before update on public.dbx_commerce_customers for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_commerce_orders_status_idx on public.dbx_commerce_orders (status);
create index if not exists dbx_commerce_orders_created_at_idx on public.dbx_commerce_orders (created_at desc);
create index if not exists dbx_commerce_orders_user_id_idx on public.dbx_commerce_orders (user_id);
create index if not exists dbx_commerce_orders_reference_id_idx on public.dbx_commerce_orders (reference_id) where reference_id is not null;
create index if not exists dbx_commerce_orders_code_idx on public.dbx_commerce_orders (code) where code is not null;
create index if not exists dbx_commerce_orders_external_id_idx on public.dbx_commerce_orders (external_id) where external_id is not null;
drop trigger if exists dbx_commerce_orders_set_updated_at on public.dbx_commerce_orders;
create trigger dbx_commerce_orders_set_updated_at before update on public.dbx_commerce_orders for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_commerce_order_items_status_idx on public.dbx_commerce_order_items (status);
create index if not exists dbx_commerce_order_items_created_at_idx on public.dbx_commerce_order_items (created_at desc);
create index if not exists dbx_commerce_order_items_user_id_idx on public.dbx_commerce_order_items (user_id);
create index if not exists dbx_commerce_order_items_reference_id_idx on public.dbx_commerce_order_items (reference_id) where reference_id is not null;
create index if not exists dbx_commerce_order_items_code_idx on public.dbx_commerce_order_items (code) where code is not null;
create index if not exists dbx_commerce_order_items_external_id_idx on public.dbx_commerce_order_items (external_id) where external_id is not null;
drop trigger if exists dbx_commerce_order_items_set_updated_at on public.dbx_commerce_order_items;
create trigger dbx_commerce_order_items_set_updated_at before update on public.dbx_commerce_order_items for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_payment_records_status_idx on public.dbx_payment_records (status);
create index if not exists dbx_payment_records_created_at_idx on public.dbx_payment_records (created_at desc);
create index if not exists dbx_payment_records_user_id_idx on public.dbx_payment_records (user_id);
create index if not exists dbx_payment_records_reference_id_idx on public.dbx_payment_records (reference_id) where reference_id is not null;
create index if not exists dbx_payment_records_code_idx on public.dbx_payment_records (code) where code is not null;
create index if not exists dbx_payment_records_external_id_idx on public.dbx_payment_records (external_id) where external_id is not null;
drop trigger if exists dbx_payment_records_set_updated_at on public.dbx_payment_records;
create trigger dbx_payment_records_set_updated_at before update on public.dbx_payment_records for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_supplier_product_verifications_status_idx on public.dbx_supplier_product_verifications (status);
create index if not exists dbx_supplier_product_verifications_created_at_idx on public.dbx_supplier_product_verifications (created_at desc);
create index if not exists dbx_supplier_product_verifications_user_id_idx on public.dbx_supplier_product_verifications (user_id);
create index if not exists dbx_supplier_product_verifications_reference_id_idx on public.dbx_supplier_product_verifications (reference_id) where reference_id is not null;
create index if not exists dbx_supplier_product_verifications_code_idx on public.dbx_supplier_product_verifications (code) where code is not null;
create index if not exists dbx_supplier_product_verifications_external_id_idx on public.dbx_supplier_product_verifications (external_id) where external_id is not null;
drop trigger if exists dbx_supplier_product_verifications_set_updated_at on public.dbx_supplier_product_verifications;
create trigger dbx_supplier_product_verifications_set_updated_at before update on public.dbx_supplier_product_verifications for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_support_tickets_status_idx on public.dbx_support_tickets (status);
create index if not exists dbx_support_tickets_created_at_idx on public.dbx_support_tickets (created_at desc);
create index if not exists dbx_support_tickets_user_id_idx on public.dbx_support_tickets (user_id);
create index if not exists dbx_support_tickets_reference_id_idx on public.dbx_support_tickets (reference_id) where reference_id is not null;
create index if not exists dbx_support_tickets_code_idx on public.dbx_support_tickets (code) where code is not null;
create index if not exists dbx_support_tickets_external_id_idx on public.dbx_support_tickets (external_id) where external_id is not null;
drop trigger if exists dbx_support_tickets_set_updated_at on public.dbx_support_tickets;
create trigger dbx_support_tickets_set_updated_at before update on public.dbx_support_tickets for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_support_messages_status_idx on public.dbx_support_messages (status);
create index if not exists dbx_support_messages_created_at_idx on public.dbx_support_messages (created_at desc);
create index if not exists dbx_support_messages_user_id_idx on public.dbx_support_messages (user_id);
create index if not exists dbx_support_messages_reference_id_idx on public.dbx_support_messages (reference_id) where reference_id is not null;
create index if not exists dbx_support_messages_code_idx on public.dbx_support_messages (code) where code is not null;
create index if not exists dbx_support_messages_external_id_idx on public.dbx_support_messages (external_id) where external_id is not null;
drop trigger if exists dbx_support_messages_set_updated_at on public.dbx_support_messages;
create trigger dbx_support_messages_set_updated_at before update on public.dbx_support_messages for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_notifications_status_idx on public.dbx_notifications (status);
create index if not exists dbx_notifications_created_at_idx on public.dbx_notifications (created_at desc);
create index if not exists dbx_notifications_user_id_idx on public.dbx_notifications (user_id);
create index if not exists dbx_notifications_reference_id_idx on public.dbx_notifications (reference_id) where reference_id is not null;
create index if not exists dbx_notifications_code_idx on public.dbx_notifications (code) where code is not null;
create index if not exists dbx_notifications_external_id_idx on public.dbx_notifications (external_id) where external_id is not null;
drop trigger if exists dbx_notifications_set_updated_at on public.dbx_notifications;
create trigger dbx_notifications_set_updated_at before update on public.dbx_notifications for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_email_events_status_idx on public.dbx_email_events (status);
create index if not exists dbx_email_events_created_at_idx on public.dbx_email_events (created_at desc);
create index if not exists dbx_email_events_user_id_idx on public.dbx_email_events (user_id);
create index if not exists dbx_email_events_reference_id_idx on public.dbx_email_events (reference_id) where reference_id is not null;
create index if not exists dbx_email_events_code_idx on public.dbx_email_events (code) where code is not null;
create index if not exists dbx_email_events_external_id_idx on public.dbx_email_events (external_id) where external_id is not null;
drop trigger if exists dbx_email_events_set_updated_at on public.dbx_email_events;
create trigger dbx_email_events_set_updated_at before update on public.dbx_email_events for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_security_events_status_idx on public.dbx_security_events (status);
create index if not exists dbx_security_events_created_at_idx on public.dbx_security_events (created_at desc);
create index if not exists dbx_security_events_user_id_idx on public.dbx_security_events (user_id);
create index if not exists dbx_security_events_reference_id_idx on public.dbx_security_events (reference_id) where reference_id is not null;
create index if not exists dbx_security_events_code_idx on public.dbx_security_events (code) where code is not null;
create index if not exists dbx_security_events_external_id_idx on public.dbx_security_events (external_id) where external_id is not null;
drop trigger if exists dbx_security_events_set_updated_at on public.dbx_security_events;
create trigger dbx_security_events_set_updated_at before update on public.dbx_security_events for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_login_attempts_status_idx on public.dbx_login_attempts (status);
create index if not exists dbx_login_attempts_created_at_idx on public.dbx_login_attempts (created_at desc);
create index if not exists dbx_login_attempts_user_id_idx on public.dbx_login_attempts (user_id);
create index if not exists dbx_login_attempts_reference_id_idx on public.dbx_login_attempts (reference_id) where reference_id is not null;
create index if not exists dbx_login_attempts_code_idx on public.dbx_login_attempts (code) where code is not null;
create index if not exists dbx_login_attempts_external_id_idx on public.dbx_login_attempts (external_id) where external_id is not null;
drop trigger if exists dbx_login_attempts_set_updated_at on public.dbx_login_attempts;
create trigger dbx_login_attempts_set_updated_at before update on public.dbx_login_attempts for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_vpn_proxy_risk_events_status_idx on public.dbx_vpn_proxy_risk_events (status);
create index if not exists dbx_vpn_proxy_risk_events_created_at_idx on public.dbx_vpn_proxy_risk_events (created_at desc);
create index if not exists dbx_vpn_proxy_risk_events_user_id_idx on public.dbx_vpn_proxy_risk_events (user_id);
create index if not exists dbx_vpn_proxy_risk_events_reference_id_idx on public.dbx_vpn_proxy_risk_events (reference_id) where reference_id is not null;
create index if not exists dbx_vpn_proxy_risk_events_code_idx on public.dbx_vpn_proxy_risk_events (code) where code is not null;
create index if not exists dbx_vpn_proxy_risk_events_external_id_idx on public.dbx_vpn_proxy_risk_events (external_id) where external_id is not null;
drop trigger if exists dbx_vpn_proxy_risk_events_set_updated_at on public.dbx_vpn_proxy_risk_events;
create trigger dbx_vpn_proxy_risk_events_set_updated_at before update on public.dbx_vpn_proxy_risk_events for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_compliance_reviews_status_idx on public.dbx_compliance_reviews (status);
create index if not exists dbx_compliance_reviews_created_at_idx on public.dbx_compliance_reviews (created_at desc);
create index if not exists dbx_compliance_reviews_user_id_idx on public.dbx_compliance_reviews (user_id);
create index if not exists dbx_compliance_reviews_reference_id_idx on public.dbx_compliance_reviews (reference_id) where reference_id is not null;
create index if not exists dbx_compliance_reviews_code_idx on public.dbx_compliance_reviews (code) where code is not null;
create index if not exists dbx_compliance_reviews_external_id_idx on public.dbx_compliance_reviews (external_id) where external_id is not null;
drop trigger if exists dbx_compliance_reviews_set_updated_at on public.dbx_compliance_reviews;
create trigger dbx_compliance_reviews_set_updated_at before update on public.dbx_compliance_reviews for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_audit_log_status_idx on public.dbx_audit_log (status);
create index if not exists dbx_audit_log_created_at_idx on public.dbx_audit_log (created_at desc);
create index if not exists dbx_audit_log_user_id_idx on public.dbx_audit_log (user_id);
create index if not exists dbx_audit_log_reference_id_idx on public.dbx_audit_log (reference_id) where reference_id is not null;
create index if not exists dbx_audit_log_code_idx on public.dbx_audit_log (code) where code is not null;
create index if not exists dbx_audit_log_external_id_idx on public.dbx_audit_log (external_id) where external_id is not null;
drop trigger if exists dbx_audit_log_set_updated_at on public.dbx_audit_log;
create trigger dbx_audit_log_set_updated_at before update on public.dbx_audit_log for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_platform_bootstrap_status_idx on public.dbx_platform_bootstrap (status);
create index if not exists dbx_platform_bootstrap_created_at_idx on public.dbx_platform_bootstrap (created_at desc);
create index if not exists dbx_platform_bootstrap_reference_id_idx on public.dbx_platform_bootstrap (reference_id) where reference_id is not null;
create index if not exists dbx_platform_bootstrap_code_idx on public.dbx_platform_bootstrap (code) where code is not null;
create index if not exists dbx_platform_bootstrap_external_id_idx on public.dbx_platform_bootstrap (external_id) where external_id is not null;
drop trigger if exists dbx_platform_bootstrap_set_updated_at on public.dbx_platform_bootstrap;
create trigger dbx_platform_bootstrap_set_updated_at before update on public.dbx_platform_bootstrap for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_stripe_events_status_idx on public.dbx_stripe_events (status);
create index if not exists dbx_stripe_events_created_at_idx on public.dbx_stripe_events (created_at desc);
create index if not exists dbx_stripe_events_reference_id_idx on public.dbx_stripe_events (reference_id) where reference_id is not null;
create index if not exists dbx_stripe_events_code_idx on public.dbx_stripe_events (code) where code is not null;
create index if not exists dbx_stripe_events_external_id_idx on public.dbx_stripe_events (external_id) where external_id is not null;
drop trigger if exists dbx_stripe_events_set_updated_at on public.dbx_stripe_events;
create trigger dbx_stripe_events_set_updated_at before update on public.dbx_stripe_events for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_supplier_products_status_idx on public.dbx_supplier_products (status);
create index if not exists dbx_supplier_products_created_at_idx on public.dbx_supplier_products (created_at desc);
create index if not exists dbx_supplier_products_reference_id_idx on public.dbx_supplier_products (reference_id) where reference_id is not null;
create index if not exists dbx_supplier_products_code_idx on public.dbx_supplier_products (code) where code is not null;
create index if not exists dbx_supplier_products_external_id_idx on public.dbx_supplier_products (external_id) where external_id is not null;
drop trigger if exists dbx_supplier_products_set_updated_at on public.dbx_supplier_products;
create trigger dbx_supplier_products_set_updated_at before update on public.dbx_supplier_products for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_product_seed_audit_status_idx on public.dbx_product_seed_audit (status);
create index if not exists dbx_product_seed_audit_created_at_idx on public.dbx_product_seed_audit (created_at desc);
create index if not exists dbx_product_seed_audit_reference_id_idx on public.dbx_product_seed_audit (reference_id) where reference_id is not null;
create index if not exists dbx_product_seed_audit_code_idx on public.dbx_product_seed_audit (code) where code is not null;
create index if not exists dbx_product_seed_audit_external_id_idx on public.dbx_product_seed_audit (external_id) where external_id is not null;
drop trigger if exists dbx_product_seed_audit_set_updated_at on public.dbx_product_seed_audit;
create trigger dbx_product_seed_audit_set_updated_at before update on public.dbx_product_seed_audit for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_country_access_rules_status_idx on public.dbx_country_access_rules (status);
create index if not exists dbx_country_access_rules_created_at_idx on public.dbx_country_access_rules (created_at desc);
create index if not exists dbx_country_access_rules_reference_id_idx on public.dbx_country_access_rules (reference_id) where reference_id is not null;
create index if not exists dbx_country_access_rules_code_idx on public.dbx_country_access_rules (code) where code is not null;
create index if not exists dbx_country_access_rules_external_id_idx on public.dbx_country_access_rules (external_id) where external_id is not null;
drop trigger if exists dbx_country_access_rules_set_updated_at on public.dbx_country_access_rules;
create trigger dbx_country_access_rules_set_updated_at before update on public.dbx_country_access_rules for each row execute function public.dbx_set_updated_at();
create index if not exists dbx_product_restriction_rules_status_idx on public.dbx_product_restriction_rules (status);
create index if not exists dbx_product_restriction_rules_created_at_idx on public.dbx_product_restriction_rules (created_at desc);
create index if not exists dbx_product_restriction_rules_reference_id_idx on public.dbx_product_restriction_rules (reference_id) where reference_id is not null;
create index if not exists dbx_product_restriction_rules_code_idx on public.dbx_product_restriction_rules (code) where code is not null;
create index if not exists dbx_product_restriction_rules_external_id_idx on public.dbx_product_restriction_rules (external_id) where external_id is not null;
drop trigger if exists dbx_product_restriction_rules_set_updated_at on public.dbx_product_restriction_rules;
create trigger dbx_product_restriction_rules_set_updated_at before update on public.dbx_product_restriction_rules for each row execute function public.dbx_set_updated_at();

-- Row Level Security.
alter table public.dbx_profiles enable row level security;
drop policy if exists dbx_profiles_service_role_all on public.dbx_profiles;
create policy dbx_profiles_service_role_all on public.dbx_profiles for all to service_role using (true) with check (true);
alter table public.dbx_user_identities enable row level security;
drop policy if exists dbx_user_identities_service_role_all on public.dbx_user_identities;
create policy dbx_user_identities_service_role_all on public.dbx_user_identities for all to service_role using (true) with check (true);
alter table public.dbx_user_sessions_audit enable row level security;
drop policy if exists dbx_user_sessions_audit_service_role_all on public.dbx_user_sessions_audit;
create policy dbx_user_sessions_audit_service_role_all on public.dbx_user_sessions_audit for all to service_role using (true) with check (true);
alter table public.dbx_onboarding_states enable row level security;
drop policy if exists dbx_onboarding_states_service_role_all on public.dbx_onboarding_states;
create policy dbx_onboarding_states_service_role_all on public.dbx_onboarding_states for all to service_role using (true) with check (true);
alter table public.dbx_owner_bootstrap_claims enable row level security;
drop policy if exists dbx_owner_bootstrap_claims_service_role_all on public.dbx_owner_bootstrap_claims;
create policy dbx_owner_bootstrap_claims_service_role_all on public.dbx_owner_bootstrap_claims for all to service_role using (true) with check (true);
alter table public.dbx_first_user_registry enable row level security;
drop policy if exists dbx_first_user_registry_service_role_all on public.dbx_first_user_registry;
create policy dbx_first_user_registry_service_role_all on public.dbx_first_user_registry for all to service_role using (true) with check (true);
alter table public.dbx_referral_codes enable row level security;
drop policy if exists dbx_referral_codes_service_role_all on public.dbx_referral_codes;
create policy dbx_referral_codes_service_role_all on public.dbx_referral_codes for all to service_role using (true) with check (true);
alter table public.dbx_referral_links enable row level security;
drop policy if exists dbx_referral_links_service_role_all on public.dbx_referral_links;
create policy dbx_referral_links_service_role_all on public.dbx_referral_links for all to service_role using (true) with check (true);
alter table public.dbx_referral_clicks enable row level security;
drop policy if exists dbx_referral_clicks_service_role_all on public.dbx_referral_clicks;
create policy dbx_referral_clicks_service_role_all on public.dbx_referral_clicks for all to service_role using (true) with check (true);
alter table public.dbx_referral_attributions enable row level security;
drop policy if exists dbx_referral_attributions_service_role_all on public.dbx_referral_attributions;
create policy dbx_referral_attributions_service_role_all on public.dbx_referral_attributions for all to service_role using (true) with check (true);
alter table public.dbx_referral_earnings enable row level security;
drop policy if exists dbx_referral_earnings_service_role_all on public.dbx_referral_earnings;
create policy dbx_referral_earnings_service_role_all on public.dbx_referral_earnings for all to service_role using (true) with check (true);
alter table public.dbx_invitation_links enable row level security;
drop policy if exists dbx_invitation_links_service_role_all on public.dbx_invitation_links;
create policy dbx_invitation_links_service_role_all on public.dbx_invitation_links for all to service_role using (true) with check (true);
alter table public.dbx_initiation_links enable row level security;
drop policy if exists dbx_initiation_links_service_role_all on public.dbx_initiation_links;
create policy dbx_initiation_links_service_role_all on public.dbx_initiation_links for all to service_role using (true) with check (true);
alter table public.dbx_wallets enable row level security;
drop policy if exists dbx_wallets_service_role_all on public.dbx_wallets;
create policy dbx_wallets_service_role_all on public.dbx_wallets for all to service_role using (true) with check (true);
alter table public.dbx_ledger_entries enable row level security;
drop policy if exists dbx_ledger_entries_service_role_all on public.dbx_ledger_entries;
create policy dbx_ledger_entries_service_role_all on public.dbx_ledger_entries for all to service_role using (true) with check (true);
alter table public.dbx_wallet_transactions enable row level security;
drop policy if exists dbx_wallet_transactions_service_role_all on public.dbx_wallet_transactions;
create policy dbx_wallet_transactions_service_role_all on public.dbx_wallet_transactions for all to service_role using (true) with check (true);
alter table public.dbx_payout_accounts enable row level security;
drop policy if exists dbx_payout_accounts_service_role_all on public.dbx_payout_accounts;
create policy dbx_payout_accounts_service_role_all on public.dbx_payout_accounts for all to service_role using (true) with check (true);
alter table public.dbx_payout_requests enable row level security;
drop policy if exists dbx_payout_requests_service_role_all on public.dbx_payout_requests;
create policy dbx_payout_requests_service_role_all on public.dbx_payout_requests for all to service_role using (true) with check (true);
alter table public.dbx_affiliate_accounts enable row level security;
drop policy if exists dbx_affiliate_accounts_service_role_all on public.dbx_affiliate_accounts;
create policy dbx_affiliate_accounts_service_role_all on public.dbx_affiliate_accounts for all to service_role using (true) with check (true);
alter table public.dbx_affiliate_campaigns enable row level security;
drop policy if exists dbx_affiliate_campaigns_service_role_all on public.dbx_affiliate_campaigns;
create policy dbx_affiliate_campaigns_service_role_all on public.dbx_affiliate_campaigns for all to service_role using (true) with check (true);
alter table public.dbx_affiliate_conversions enable row level security;
drop policy if exists dbx_affiliate_conversions_service_role_all on public.dbx_affiliate_conversions;
create policy dbx_affiliate_conversions_service_role_all on public.dbx_affiliate_conversions for all to service_role using (true) with check (true);
alter table public.dbx_affiliate_commissions enable row level security;
drop policy if exists dbx_affiliate_commissions_service_role_all on public.dbx_affiliate_commissions;
create policy dbx_affiliate_commissions_service_role_all on public.dbx_affiliate_commissions for all to service_role using (true) with check (true);
alter table public.dbx_advertisers enable row level security;
drop policy if exists dbx_advertisers_service_role_all on public.dbx_advertisers;
create policy dbx_advertisers_service_role_all on public.dbx_advertisers for all to service_role using (true) with check (true);
alter table public.dbx_ad_campaigns enable row level security;
drop policy if exists dbx_ad_campaigns_service_role_all on public.dbx_ad_campaigns;
create policy dbx_ad_campaigns_service_role_all on public.dbx_ad_campaigns for all to service_role using (true) with check (true);
alter table public.dbx_ad_creatives enable row level security;
drop policy if exists dbx_ad_creatives_service_role_all on public.dbx_ad_creatives;
create policy dbx_ad_creatives_service_role_all on public.dbx_ad_creatives for all to service_role using (true) with check (true);
alter table public.dbx_watch_sessions enable row level security;
drop policy if exists dbx_watch_sessions_service_role_all on public.dbx_watch_sessions;
create policy dbx_watch_sessions_service_role_all on public.dbx_watch_sessions for all to service_role using (true) with check (true);
alter table public.dbx_watch_events enable row level security;
drop policy if exists dbx_watch_events_service_role_all on public.dbx_watch_events;
create policy dbx_watch_events_service_role_all on public.dbx_watch_events for all to service_role using (true) with check (true);
alter table public.dbx_watch_rewards enable row level security;
drop policy if exists dbx_watch_rewards_service_role_all on public.dbx_watch_rewards;
create policy dbx_watch_rewards_service_role_all on public.dbx_watch_rewards for all to service_role using (true) with check (true);
alter table public.dbx_fraud_signals enable row level security;
drop policy if exists dbx_fraud_signals_service_role_all on public.dbx_fraud_signals;
create policy dbx_fraud_signals_service_role_all on public.dbx_fraud_signals for all to service_role using (true) with check (true);
alter table public.dbx_commerce_customers enable row level security;
drop policy if exists dbx_commerce_customers_service_role_all on public.dbx_commerce_customers;
create policy dbx_commerce_customers_service_role_all on public.dbx_commerce_customers for all to service_role using (true) with check (true);
alter table public.dbx_commerce_orders enable row level security;
drop policy if exists dbx_commerce_orders_service_role_all on public.dbx_commerce_orders;
create policy dbx_commerce_orders_service_role_all on public.dbx_commerce_orders for all to service_role using (true) with check (true);
alter table public.dbx_commerce_order_items enable row level security;
drop policy if exists dbx_commerce_order_items_service_role_all on public.dbx_commerce_order_items;
create policy dbx_commerce_order_items_service_role_all on public.dbx_commerce_order_items for all to service_role using (true) with check (true);
alter table public.dbx_payment_records enable row level security;
drop policy if exists dbx_payment_records_service_role_all on public.dbx_payment_records;
create policy dbx_payment_records_service_role_all on public.dbx_payment_records for all to service_role using (true) with check (true);
alter table public.dbx_supplier_product_verifications enable row level security;
drop policy if exists dbx_supplier_product_verifications_service_role_all on public.dbx_supplier_product_verifications;
create policy dbx_supplier_product_verifications_service_role_all on public.dbx_supplier_product_verifications for all to service_role using (true) with check (true);
alter table public.dbx_support_tickets enable row level security;
drop policy if exists dbx_support_tickets_service_role_all on public.dbx_support_tickets;
create policy dbx_support_tickets_service_role_all on public.dbx_support_tickets for all to service_role using (true) with check (true);
alter table public.dbx_support_messages enable row level security;
drop policy if exists dbx_support_messages_service_role_all on public.dbx_support_messages;
create policy dbx_support_messages_service_role_all on public.dbx_support_messages for all to service_role using (true) with check (true);
alter table public.dbx_notifications enable row level security;
drop policy if exists dbx_notifications_service_role_all on public.dbx_notifications;
create policy dbx_notifications_service_role_all on public.dbx_notifications for all to service_role using (true) with check (true);
alter table public.dbx_email_events enable row level security;
drop policy if exists dbx_email_events_service_role_all on public.dbx_email_events;
create policy dbx_email_events_service_role_all on public.dbx_email_events for all to service_role using (true) with check (true);
alter table public.dbx_security_events enable row level security;
drop policy if exists dbx_security_events_service_role_all on public.dbx_security_events;
create policy dbx_security_events_service_role_all on public.dbx_security_events for all to service_role using (true) with check (true);
alter table public.dbx_login_attempts enable row level security;
drop policy if exists dbx_login_attempts_service_role_all on public.dbx_login_attempts;
create policy dbx_login_attempts_service_role_all on public.dbx_login_attempts for all to service_role using (true) with check (true);
alter table public.dbx_vpn_proxy_risk_events enable row level security;
drop policy if exists dbx_vpn_proxy_risk_events_service_role_all on public.dbx_vpn_proxy_risk_events;
create policy dbx_vpn_proxy_risk_events_service_role_all on public.dbx_vpn_proxy_risk_events for all to service_role using (true) with check (true);
alter table public.dbx_compliance_reviews enable row level security;
drop policy if exists dbx_compliance_reviews_service_role_all on public.dbx_compliance_reviews;
create policy dbx_compliance_reviews_service_role_all on public.dbx_compliance_reviews for all to service_role using (true) with check (true);
alter table public.dbx_audit_log enable row level security;
drop policy if exists dbx_audit_log_service_role_all on public.dbx_audit_log;
create policy dbx_audit_log_service_role_all on public.dbx_audit_log for all to service_role using (true) with check (true);
alter table public.dbx_platform_bootstrap enable row level security;
drop policy if exists dbx_platform_bootstrap_service_role_all on public.dbx_platform_bootstrap;
create policy dbx_platform_bootstrap_service_role_all on public.dbx_platform_bootstrap for all to service_role using (true) with check (true);
alter table public.dbx_stripe_events enable row level security;
drop policy if exists dbx_stripe_events_service_role_all on public.dbx_stripe_events;
create policy dbx_stripe_events_service_role_all on public.dbx_stripe_events for all to service_role using (true) with check (true);
alter table public.dbx_supplier_products enable row level security;
drop policy if exists dbx_supplier_products_service_role_all on public.dbx_supplier_products;
create policy dbx_supplier_products_service_role_all on public.dbx_supplier_products for all to service_role using (true) with check (true);
alter table public.dbx_product_seed_audit enable row level security;
drop policy if exists dbx_product_seed_audit_service_role_all on public.dbx_product_seed_audit;
create policy dbx_product_seed_audit_service_role_all on public.dbx_product_seed_audit for all to service_role using (true) with check (true);
alter table public.dbx_country_access_rules enable row level security;
drop policy if exists dbx_country_access_rules_service_role_all on public.dbx_country_access_rules;
create policy dbx_country_access_rules_service_role_all on public.dbx_country_access_rules for all to service_role using (true) with check (true);
alter table public.dbx_product_restriction_rules enable row level security;
drop policy if exists dbx_product_restriction_rules_service_role_all on public.dbx_product_restriction_rules;
create policy dbx_product_restriction_rules_service_role_all on public.dbx_product_restriction_rules for all to service_role using (true) with check (true);
drop policy if exists dbx_profiles_own_read on public.dbx_profiles;
create policy dbx_profiles_own_read on public.dbx_profiles for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_profiles_own_update on public.dbx_profiles;
create policy dbx_profiles_own_update on public.dbx_profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists dbx_user_identities_own_read on public.dbx_user_identities;
create policy dbx_user_identities_own_read on public.dbx_user_identities for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_user_identities_own_update on public.dbx_user_identities;
create policy dbx_user_identities_own_update on public.dbx_user_identities for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists dbx_user_sessions_audit_own_read on public.dbx_user_sessions_audit;
create policy dbx_user_sessions_audit_own_read on public.dbx_user_sessions_audit for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_onboarding_states_own_read on public.dbx_onboarding_states;
create policy dbx_onboarding_states_own_read on public.dbx_onboarding_states for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_onboarding_states_own_update on public.dbx_onboarding_states;
create policy dbx_onboarding_states_own_update on public.dbx_onboarding_states for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists dbx_owner_bootstrap_claims_own_read on public.dbx_owner_bootstrap_claims;
create policy dbx_owner_bootstrap_claims_own_read on public.dbx_owner_bootstrap_claims for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_first_user_registry_own_read on public.dbx_first_user_registry;
create policy dbx_first_user_registry_own_read on public.dbx_first_user_registry for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_referral_codes_own_read on public.dbx_referral_codes;
create policy dbx_referral_codes_own_read on public.dbx_referral_codes for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_referral_links_own_read on public.dbx_referral_links;
create policy dbx_referral_links_own_read on public.dbx_referral_links for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_referral_clicks_own_read on public.dbx_referral_clicks;
create policy dbx_referral_clicks_own_read on public.dbx_referral_clicks for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_referral_attributions_own_read on public.dbx_referral_attributions;
create policy dbx_referral_attributions_own_read on public.dbx_referral_attributions for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_referral_earnings_own_read on public.dbx_referral_earnings;
create policy dbx_referral_earnings_own_read on public.dbx_referral_earnings for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_invitation_links_own_read on public.dbx_invitation_links;
create policy dbx_invitation_links_own_read on public.dbx_invitation_links for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_initiation_links_own_read on public.dbx_initiation_links;
create policy dbx_initiation_links_own_read on public.dbx_initiation_links for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_wallets_own_read on public.dbx_wallets;
create policy dbx_wallets_own_read on public.dbx_wallets for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_ledger_entries_own_read on public.dbx_ledger_entries;
create policy dbx_ledger_entries_own_read on public.dbx_ledger_entries for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_wallet_transactions_own_read on public.dbx_wallet_transactions;
create policy dbx_wallet_transactions_own_read on public.dbx_wallet_transactions for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_payout_accounts_own_read on public.dbx_payout_accounts;
create policy dbx_payout_accounts_own_read on public.dbx_payout_accounts for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_payout_requests_own_read on public.dbx_payout_requests;
create policy dbx_payout_requests_own_read on public.dbx_payout_requests for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_affiliate_accounts_own_read on public.dbx_affiliate_accounts;
create policy dbx_affiliate_accounts_own_read on public.dbx_affiliate_accounts for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_affiliate_campaigns_own_read on public.dbx_affiliate_campaigns;
create policy dbx_affiliate_campaigns_own_read on public.dbx_affiliate_campaigns for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_affiliate_conversions_own_read on public.dbx_affiliate_conversions;
create policy dbx_affiliate_conversions_own_read on public.dbx_affiliate_conversions for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_affiliate_commissions_own_read on public.dbx_affiliate_commissions;
create policy dbx_affiliate_commissions_own_read on public.dbx_affiliate_commissions for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_advertisers_own_read on public.dbx_advertisers;
create policy dbx_advertisers_own_read on public.dbx_advertisers for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_ad_campaigns_own_read on public.dbx_ad_campaigns;
create policy dbx_ad_campaigns_own_read on public.dbx_ad_campaigns for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_ad_creatives_own_read on public.dbx_ad_creatives;
create policy dbx_ad_creatives_own_read on public.dbx_ad_creatives for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_watch_sessions_own_read on public.dbx_watch_sessions;
create policy dbx_watch_sessions_own_read on public.dbx_watch_sessions for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_watch_events_own_read on public.dbx_watch_events;
create policy dbx_watch_events_own_read on public.dbx_watch_events for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_watch_rewards_own_read on public.dbx_watch_rewards;
create policy dbx_watch_rewards_own_read on public.dbx_watch_rewards for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_fraud_signals_own_read on public.dbx_fraud_signals;
create policy dbx_fraud_signals_own_read on public.dbx_fraud_signals for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_commerce_customers_own_read on public.dbx_commerce_customers;
create policy dbx_commerce_customers_own_read on public.dbx_commerce_customers for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_commerce_orders_own_read on public.dbx_commerce_orders;
create policy dbx_commerce_orders_own_read on public.dbx_commerce_orders for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_commerce_order_items_own_read on public.dbx_commerce_order_items;
create policy dbx_commerce_order_items_own_read on public.dbx_commerce_order_items for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_payment_records_own_read on public.dbx_payment_records;
create policy dbx_payment_records_own_read on public.dbx_payment_records for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_supplier_product_verifications_own_read on public.dbx_supplier_product_verifications;
create policy dbx_supplier_product_verifications_own_read on public.dbx_supplier_product_verifications for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_support_tickets_own_read on public.dbx_support_tickets;
create policy dbx_support_tickets_own_read on public.dbx_support_tickets for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_support_messages_own_read on public.dbx_support_messages;
create policy dbx_support_messages_own_read on public.dbx_support_messages for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_notifications_own_read on public.dbx_notifications;
create policy dbx_notifications_own_read on public.dbx_notifications for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_email_events_own_read on public.dbx_email_events;
create policy dbx_email_events_own_read on public.dbx_email_events for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_security_events_own_read on public.dbx_security_events;
create policy dbx_security_events_own_read on public.dbx_security_events for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_login_attempts_own_read on public.dbx_login_attempts;
create policy dbx_login_attempts_own_read on public.dbx_login_attempts for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_vpn_proxy_risk_events_own_read on public.dbx_vpn_proxy_risk_events;
create policy dbx_vpn_proxy_risk_events_own_read on public.dbx_vpn_proxy_risk_events for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_compliance_reviews_own_read on public.dbx_compliance_reviews;
create policy dbx_compliance_reviews_own_read on public.dbx_compliance_reviews for select to authenticated using (auth.uid() = user_id);
drop policy if exists dbx_audit_log_own_read on public.dbx_audit_log;
create policy dbx_audit_log_own_read on public.dbx_audit_log for select to authenticated using (auth.uid() = user_id);

drop policy if exists dbx_referral_links_public_read_active on public.dbx_referral_links;
create policy dbx_referral_links_public_read_active on public.dbx_referral_links for select to anon, authenticated using (status = 'active' and deleted_at is null);
drop policy if exists dbx_invitation_links_public_read_active on public.dbx_invitation_links;
create policy dbx_invitation_links_public_read_active on public.dbx_invitation_links for select to anon, authenticated using (status = 'active');
drop policy if exists dbx_initiation_links_public_read_active on public.dbx_initiation_links;
create policy dbx_initiation_links_public_read_active on public.dbx_initiation_links for select to anon, authenticated using (status = 'active');

create or replace function public.dbx_bootstrap_first_owner_user(
  p_user_id uuid,
  p_email text,
  p_display_name text,
  p_telegram_user_id text,
  p_referral_code text default 'DBX-FIRST-0001'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile_id uuid;
  v_wallet_id uuid;
  v_affiliate_account_id uuid;
  v_owner_reference_id text;
  v_initiation_code text;
  v_referral_link_path text;
  v_initiation_link_path text;
begin
  if p_user_id is null then raise exception 'p_user_id is required'; end if;
  if coalesce(trim(p_email), '') = '' then raise exception 'p_email is required'; end if;

  select id, owner_reference_id into v_profile_id, v_owner_reference_id from public.dbx_profiles where user_id = p_user_id;
  if v_owner_reference_id is null then v_owner_reference_id := public.dbx_generate_reference_id('OWNER'); end if;

  insert into public.dbx_profiles (user_id, email, display_name, telegram_user_id, role, is_first_platform_user, first_user_number, owner_reference_id, referral_code, metadata)
  values (p_user_id, lower(trim(p_email)), nullif(trim(p_display_name), ''), nullif(trim(p_telegram_user_id), ''), 'owner', true, 1, v_owner_reference_id, p_referral_code, jsonb_build_object('bootstrap','first_owner'))
  on conflict (user_id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, dbx_profiles.display_name),
    telegram_user_id = coalesce(excluded.telegram_user_id, dbx_profiles.telegram_user_id),
    role = 'owner',
    is_first_platform_user = true,
    first_user_number = coalesce(dbx_profiles.first_user_number, 1),
    owner_reference_id = coalesce(dbx_profiles.owner_reference_id, excluded.owner_reference_id),
    referral_code = coalesce(dbx_profiles.referral_code, excluded.referral_code),
    metadata = dbx_profiles.metadata || excluded.metadata
  returning id, owner_reference_id into v_profile_id, v_owner_reference_id;

  insert into public.dbx_wallets (user_id, status, reference_id, metadata)
  values (p_user_id, 'active', public.dbx_generate_reference_id('WALLET'), jsonb_build_object('bootstrap','first_owner','fakeCredit',false))
  on conflict do nothing;
  select id into v_wallet_id from public.dbx_wallets where user_id = p_user_id order by created_at asc limit 1;

  insert into public.dbx_affiliate_accounts (user_id, status, reference_id, affiliate_code, metadata)
  values (p_user_id, 'active', public.dbx_generate_reference_id('AFF'), p_referral_code, jsonb_build_object('bootstrap','first_owner','fakeCommission',false))
  on conflict do nothing;
  select id into v_affiliate_account_id from public.dbx_affiliate_accounts where user_id = p_user_id order by created_at asc limit 1;

  insert into public.dbx_referral_codes (user_id, status, reference_id, code, referral_code, metadata)
  values (p_user_id, 'active', public.dbx_generate_reference_id('REF'), p_referral_code, p_referral_code, jsonb_build_object('ownerFirstUser',true))
  on conflict (referral_code) do update set user_id = excluded.user_id, status = 'active'
  returning reference_id into v_owner_reference_id;

  v_referral_link_path := '/signup?ref=' || p_referral_code;
  insert into public.dbx_referral_links (user_id, status, reference_id, code, referral_code, link_path, metadata)
  values (p_user_id, 'active', public.dbx_generate_reference_id('RLINK'), p_referral_code, p_referral_code, v_referral_link_path, '{}'::jsonb)
  on conflict do nothing;

  select coalesce((select initiation_code from public.dbx_initiation_links where user_id = p_user_id order by created_at asc limit 1), public.dbx_generate_initiation_code()) into v_initiation_code;
  v_initiation_link_path := '/initiate/' || v_initiation_code;
  insert into public.dbx_initiation_links (user_id, status, reference_id, code, initiation_code, link_path, metadata)
  values (p_user_id, 'active', public.dbx_generate_reference_id('INIT'), v_initiation_code, v_initiation_code, v_initiation_link_path, '{}'::jsonb)
  on conflict (initiation_code) do nothing;

  insert into public.dbx_first_user_registry (user_id, status, first_user_number, owner_first_user_code, owner_reference_id, metadata)
  values (p_user_id, 'claimed', 1, p_referral_code, v_owner_reference_id, jsonb_build_object('telegramUserId', p_telegram_user_id))
  on conflict (first_user_number) do update set user_id = excluded.user_id, status = 'claimed'
  returning owner_reference_id into v_owner_reference_id;

  insert into public.dbx_owner_bootstrap_claims (user_id, status, reference_id, code, metadata)
  values (p_user_id, 'claimed', v_owner_reference_id, p_referral_code, jsonb_build_object('telegramUserId', p_telegram_user_id))
  on conflict do nothing;

  return jsonb_build_object(
    'platformUserId', p_user_id,
    'firstUserNumber', 1,
    'ownerReferenceId', v_owner_reference_id,
    'referralCode', p_referral_code,
    'referralLinkPath', v_referral_link_path,
    'initiationCode', v_initiation_code,
    'initiationLinkPath', v_initiation_link_path,
    'walletId', v_wallet_id,
    'affiliateAccountId', v_affiliate_account_id,
    'fakeWalletCreditCreated', false,
    'fakeReferralEarningCreated', false
  );
end;
$$;
revoke all on function public.dbx_bootstrap_first_owner_user(uuid, text, text, text, text) from public;
grant execute on function public.dbx_bootstrap_first_owner_user(uuid, text, text, text, text) to service_role;

create unique index if not exists dbx_wallets_user_currency_active_key on public.dbx_wallets (user_id, currency) where deleted_at is null;
create unique index if not exists dbx_affiliate_accounts_user_active_key on public.dbx_affiliate_accounts (user_id) where status <> 'closed';
create unique index if not exists dbx_referral_links_code_path_key on public.dbx_referral_links (referral_code, link_path) where deleted_at is null;
create unique index if not exists dbx_owner_bootstrap_claims_user_key on public.dbx_owner_bootstrap_claims (user_id);

create or replace function public.dbx_handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.dbx_profiles (user_id, email, display_name, referral_code, metadata)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name'),
    nullif(new.raw_user_meta_data->>'referral_code', ''),
    jsonb_build_object(
      'signupReferralCode', new.raw_user_meta_data->>'referral_code',
      'signupInitiationCode', new.raw_user_meta_data->>'initiation_code'
    )
  )
  on conflict (user_id) do update set
    email = excluded.email,
    display_name = coalesce(dbx_profiles.display_name, excluded.display_name),
    metadata = dbx_profiles.metadata || excluded.metadata;

  insert into public.dbx_onboarding_states (user_id, status, reference_id, metadata)
  values (new.id, 'started', public.dbx_generate_reference_id('ONBOARD'), jsonb_build_object('source','auth_signup'))
  on conflict do nothing;

  if coalesce(new.raw_user_meta_data->>'referral_code', '') <> '' then
    insert into public.dbx_referral_attributions (user_id, status, code, metadata)
    values (new.id, 'pending_verification', new.raw_user_meta_data->>'referral_code', jsonb_build_object('source','signup_metadata'))
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists dbx_auth_user_created on auth.users;
create trigger dbx_auth_user_created after insert on auth.users for each row execute function public.dbx_handle_new_auth_user();

drop policy if exists dbx_profiles_own_insert on public.dbx_profiles;
create policy dbx_profiles_own_insert on public.dbx_profiles for insert to authenticated with check (auth.uid() = user_id);
create unique index if not exists dbx_onboarding_states_user_active_key on public.dbx_onboarding_states (user_id) where status <> 'completed';

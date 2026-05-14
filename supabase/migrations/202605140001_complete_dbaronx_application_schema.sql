-- Complete dBaronX Supabase-owned application schema for Medusa readiness.
-- Idempotent additive pack: no Medusa core commerce tables are created here.
begin;
create extension if not exists pgcrypto;
create schema if not exists app_public;
create or replace function app_public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create or replace function app_public.generate_reference_id(prefix text default 'DBX')
returns text
language sql
volatile
as $$
  select upper(regexp_replace(coalesce(nullif(prefix, ''), 'DBX'), '[^a-zA-Z0-9]', '', 'g')) || '-' || upper(substr(encode(gen_random_bytes(9), 'hex'), 1, 18));
$$;
create or replace function app_public.generate_referral_code() returns text language sql volatile as $$ select 'DBX-' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 10)); $$;
create or replace function app_public.generate_initiation_code() returns text language sql volatile as $$ select 'INIT-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 12)); $$;

-- OWNER / USER / PROFILE
create table if not exists app_public.platform_users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  email text,
  display_name text,
  telegram_user_id text,
  role text not null default 'user',
  user_number bigint,
  owner_reference_id text,
  referral_code text,
  status text not null default 'active'
);
alter table app_public.platform_users add column if not exists created_at timestamptz not null default now();
alter table app_public.platform_users add column if not exists updated_at timestamptz not null default now();
alter table app_public.platform_users add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.platform_users add column if not exists user_id uuid;
alter table app_public.platform_users add column if not exists email text;
alter table app_public.platform_users add column if not exists display_name text;
alter table app_public.platform_users add column if not exists telegram_user_id text;
alter table app_public.platform_users add column if not exists role text not null default 'user';
alter table app_public.platform_users add column if not exists user_number bigint;
alter table app_public.platform_users add column if not exists owner_reference_id text;
alter table app_public.platform_users add column if not exists referral_code text;
alter table app_public.platform_users add column if not exists status text not null default 'active';
alter table app_public.platform_users enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_platform_users_set_updated_at' and tgrelid = 'app_public.platform_users'::regclass) then create trigger trg_platform_users_set_updated_at before update on app_public.platform_users for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  platform_user_id uuid,
  email text,
  display_name text,
  telegram_user_id text,
  avatar_url text,
  status text not null default 'active'
);
alter table app_public.user_profiles add column if not exists created_at timestamptz not null default now();
alter table app_public.user_profiles add column if not exists updated_at timestamptz not null default now();
alter table app_public.user_profiles add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.user_profiles add column if not exists user_id uuid;
alter table app_public.user_profiles add column if not exists platform_user_id uuid;
alter table app_public.user_profiles add column if not exists email text;
alter table app_public.user_profiles add column if not exists display_name text;
alter table app_public.user_profiles add column if not exists telegram_user_id text;
alter table app_public.user_profiles add column if not exists avatar_url text;
alter table app_public.user_profiles add column if not exists status text not null default 'active';
alter table app_public.user_profiles enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_user_profiles_set_updated_at' and tgrelid = 'app_public.user_profiles'::regclass) then create trigger trg_user_profiles_set_updated_at before update on app_public.user_profiles for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.first_owner_bootstrap_claims (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  platform_user_id uuid,
  claim_status text not null default 'claimed',
  first_user_number integer,
  owner_reference_id text,
  referral_code text,
  initiation_code text,
  claimed_at timestamptz default now(),
  status text not null default 'claimed'
);
alter table app_public.first_owner_bootstrap_claims add column if not exists created_at timestamptz not null default now();
alter table app_public.first_owner_bootstrap_claims add column if not exists updated_at timestamptz not null default now();
alter table app_public.first_owner_bootstrap_claims add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.first_owner_bootstrap_claims add column if not exists user_id uuid;
alter table app_public.first_owner_bootstrap_claims add column if not exists platform_user_id uuid;
alter table app_public.first_owner_bootstrap_claims add column if not exists claim_status text not null default 'claimed';
alter table app_public.first_owner_bootstrap_claims add column if not exists first_user_number integer;
alter table app_public.first_owner_bootstrap_claims add column if not exists owner_reference_id text;
alter table app_public.first_owner_bootstrap_claims add column if not exists referral_code text;
alter table app_public.first_owner_bootstrap_claims add column if not exists initiation_code text;
alter table app_public.first_owner_bootstrap_claims add column if not exists claimed_at timestamptz default now();
alter table app_public.first_owner_bootstrap_claims add column if not exists status text not null default 'claimed';
alter table app_public.first_owner_bootstrap_claims enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_first_owner_bootstrap_claims_set_updated_at' and tgrelid = 'app_public.first_owner_bootstrap_claims'::regclass) then create trigger trg_first_owner_bootstrap_claims_set_updated_at before update on app_public.first_owner_bootstrap_claims for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.owner_reference_codes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  platform_user_id uuid,
  owner_reference_id text,
  code text,
  status text not null default 'active'
);
alter table app_public.owner_reference_codes add column if not exists created_at timestamptz not null default now();
alter table app_public.owner_reference_codes add column if not exists updated_at timestamptz not null default now();
alter table app_public.owner_reference_codes add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.owner_reference_codes add column if not exists user_id uuid;
alter table app_public.owner_reference_codes add column if not exists platform_user_id uuid;
alter table app_public.owner_reference_codes add column if not exists owner_reference_id text;
alter table app_public.owner_reference_codes add column if not exists code text;
alter table app_public.owner_reference_codes add column if not exists status text not null default 'active';
alter table app_public.owner_reference_codes enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_owner_reference_codes_set_updated_at' and tgrelid = 'app_public.owner_reference_codes'::regclass) then create trigger trg_owner_reference_codes_set_updated_at before update on app_public.owner_reference_codes for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  platform_user_id uuid,
  referral_code text,
  code text,
  status text not null default 'active'
);
alter table app_public.referral_codes add column if not exists created_at timestamptz not null default now();
alter table app_public.referral_codes add column if not exists updated_at timestamptz not null default now();
alter table app_public.referral_codes add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.referral_codes add column if not exists user_id uuid;
alter table app_public.referral_codes add column if not exists platform_user_id uuid;
alter table app_public.referral_codes add column if not exists referral_code text;
alter table app_public.referral_codes add column if not exists code text;
alter table app_public.referral_codes add column if not exists status text not null default 'active';
alter table app_public.referral_codes enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_referral_codes_set_updated_at' and tgrelid = 'app_public.referral_codes'::regclass) then create trigger trg_referral_codes_set_updated_at before update on app_public.referral_codes for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.invitation_links (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  platform_user_id uuid,
  invitation_code text,
  link_path text,
  status text not null default 'active'
);
alter table app_public.invitation_links add column if not exists created_at timestamptz not null default now();
alter table app_public.invitation_links add column if not exists updated_at timestamptz not null default now();
alter table app_public.invitation_links add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.invitation_links add column if not exists user_id uuid;
alter table app_public.invitation_links add column if not exists platform_user_id uuid;
alter table app_public.invitation_links add column if not exists invitation_code text;
alter table app_public.invitation_links add column if not exists link_path text;
alter table app_public.invitation_links add column if not exists status text not null default 'active';
alter table app_public.invitation_links enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_invitation_links_set_updated_at' and tgrelid = 'app_public.invitation_links'::regclass) then create trigger trg_invitation_links_set_updated_at before update on app_public.invitation_links for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.initiation_links (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  platform_user_id uuid,
  initiation_code text,
  link_path text,
  status text not null default 'active'
);
alter table app_public.initiation_links add column if not exists created_at timestamptz not null default now();
alter table app_public.initiation_links add column if not exists updated_at timestamptz not null default now();
alter table app_public.initiation_links add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.initiation_links add column if not exists user_id uuid;
alter table app_public.initiation_links add column if not exists platform_user_id uuid;
alter table app_public.initiation_links add column if not exists initiation_code text;
alter table app_public.initiation_links add column if not exists link_path text;
alter table app_public.initiation_links add column if not exists status text not null default 'active';
alter table app_public.initiation_links enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_initiation_links_set_updated_at' and tgrelid = 'app_public.initiation_links'::regclass) then create trigger trg_initiation_links_set_updated_at before update on app_public.initiation_links for each row execute function app_public.set_updated_at(); end if; end $$;

-- WALLET / LEDGER / REWARDS
create table if not exists app_public.wallets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  platform_user_id uuid,
  currency text not null default 'USD',
  available_balance numeric(20,6) not null default 0,
  pending_balance numeric(20,6) not null default 0,
  held_balance numeric(20,6) not null default 0,
  status text not null default 'active'
);
alter table app_public.wallets add column if not exists created_at timestamptz not null default now();
alter table app_public.wallets add column if not exists updated_at timestamptz not null default now();
alter table app_public.wallets add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.wallets add column if not exists user_id uuid;
alter table app_public.wallets add column if not exists platform_user_id uuid;
alter table app_public.wallets add column if not exists currency text not null default 'USD';
alter table app_public.wallets add column if not exists available_balance numeric(20,6) not null default 0;
alter table app_public.wallets add column if not exists pending_balance numeric(20,6) not null default 0;
alter table app_public.wallets add column if not exists held_balance numeric(20,6) not null default 0;
alter table app_public.wallets add column if not exists status text not null default 'active';
alter table app_public.wallets enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_wallets_set_updated_at' and tgrelid = 'app_public.wallets'::regclass) then create trigger trg_wallets_set_updated_at before update on app_public.wallets for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.wallet_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  wallet_id uuid,
  user_id uuid,
  amount numeric(20,6) not null default 0,
  currency text not null default 'USD',
  entry_type text,
  direction text,
  source text,
  source_event_id text,
  idempotency_key text,
  status text not null default 'posted'
);
alter table app_public.wallet_ledger_entries add column if not exists created_at timestamptz not null default now();
alter table app_public.wallet_ledger_entries add column if not exists updated_at timestamptz not null default now();
alter table app_public.wallet_ledger_entries add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.wallet_ledger_entries add column if not exists wallet_id uuid;
alter table app_public.wallet_ledger_entries add column if not exists user_id uuid;
alter table app_public.wallet_ledger_entries add column if not exists amount numeric(20,6) not null default 0;
alter table app_public.wallet_ledger_entries add column if not exists currency text not null default 'USD';
alter table app_public.wallet_ledger_entries add column if not exists entry_type text;
alter table app_public.wallet_ledger_entries add column if not exists direction text;
alter table app_public.wallet_ledger_entries add column if not exists source text;
alter table app_public.wallet_ledger_entries add column if not exists source_event_id text;
alter table app_public.wallet_ledger_entries add column if not exists idempotency_key text;
alter table app_public.wallet_ledger_entries add column if not exists status text not null default 'posted';
alter table app_public.wallet_ledger_entries enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_wallet_ledger_entries_set_updated_at' and tgrelid = 'app_public.wallet_ledger_entries'::regclass) then create trigger trg_wallet_ledger_entries_set_updated_at before update on app_public.wallet_ledger_entries for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.wallet_holds (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  wallet_id uuid,
  user_id uuid,
  amount numeric(20,6) not null default 0,
  currency text not null default 'USD',
  reason text,
  source text,
  source_event_id text,
  released_at timestamptz,
  status text not null default 'active'
);
alter table app_public.wallet_holds add column if not exists created_at timestamptz not null default now();
alter table app_public.wallet_holds add column if not exists updated_at timestamptz not null default now();
alter table app_public.wallet_holds add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.wallet_holds add column if not exists wallet_id uuid;
alter table app_public.wallet_holds add column if not exists user_id uuid;
alter table app_public.wallet_holds add column if not exists amount numeric(20,6) not null default 0;
alter table app_public.wallet_holds add column if not exists currency text not null default 'USD';
alter table app_public.wallet_holds add column if not exists reason text;
alter table app_public.wallet_holds add column if not exists source text;
alter table app_public.wallet_holds add column if not exists source_event_id text;
alter table app_public.wallet_holds add column if not exists released_at timestamptz;
alter table app_public.wallet_holds add column if not exists status text not null default 'active';
alter table app_public.wallet_holds enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_wallet_holds_set_updated_at' and tgrelid = 'app_public.wallet_holds'::regclass) then create trigger trg_wallet_holds_set_updated_at before update on app_public.wallet_holds for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.reward_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  wallet_id uuid,
  amount numeric(20,6) not null default 0,
  currency text not null default 'USD',
  event_type text,
  source text,
  source_event_id text,
  status text not null default 'pending'
);
alter table app_public.reward_events add column if not exists created_at timestamptz not null default now();
alter table app_public.reward_events add column if not exists updated_at timestamptz not null default now();
alter table app_public.reward_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.reward_events add column if not exists user_id uuid;
alter table app_public.reward_events add column if not exists wallet_id uuid;
alter table app_public.reward_events add column if not exists amount numeric(20,6) not null default 0;
alter table app_public.reward_events add column if not exists currency text not null default 'USD';
alter table app_public.reward_events add column if not exists event_type text;
alter table app_public.reward_events add column if not exists source text;
alter table app_public.reward_events add column if not exists source_event_id text;
alter table app_public.reward_events add column if not exists status text not null default 'pending';
alter table app_public.reward_events enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_reward_events_set_updated_at' and tgrelid = 'app_public.reward_events'::regclass) then create trigger trg_reward_events_set_updated_at before update on app_public.reward_events for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.reward_balances (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  wallet_id uuid,
  currency text not null default 'USD',
  earned_balance numeric(20,6) not null default 0,
  available_balance numeric(20,6) not null default 0,
  status text not null default 'active'
);
alter table app_public.reward_balances add column if not exists created_at timestamptz not null default now();
alter table app_public.reward_balances add column if not exists updated_at timestamptz not null default now();
alter table app_public.reward_balances add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.reward_balances add column if not exists user_id uuid;
alter table app_public.reward_balances add column if not exists wallet_id uuid;
alter table app_public.reward_balances add column if not exists currency text not null default 'USD';
alter table app_public.reward_balances add column if not exists earned_balance numeric(20,6) not null default 0;
alter table app_public.reward_balances add column if not exists available_balance numeric(20,6) not null default 0;
alter table app_public.reward_balances add column if not exists status text not null default 'active';
alter table app_public.reward_balances enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_reward_balances_set_updated_at' and tgrelid = 'app_public.reward_balances'::regclass) then create trigger trg_reward_balances_set_updated_at before update on app_public.reward_balances for each row execute function app_public.set_updated_at(); end if; end $$;

-- AFFILIATE / REFERRAL
create table if not exists app_public.affiliate_accounts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  platform_user_id uuid,
  affiliate_code text,
  referral_code text,
  status text not null default 'active'
);
alter table app_public.affiliate_accounts add column if not exists created_at timestamptz not null default now();
alter table app_public.affiliate_accounts add column if not exists updated_at timestamptz not null default now();
alter table app_public.affiliate_accounts add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.affiliate_accounts add column if not exists user_id uuid;
alter table app_public.affiliate_accounts add column if not exists platform_user_id uuid;
alter table app_public.affiliate_accounts add column if not exists affiliate_code text;
alter table app_public.affiliate_accounts add column if not exists referral_code text;
alter table app_public.affiliate_accounts add column if not exists status text not null default 'active';
alter table app_public.affiliate_accounts enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_affiliate_accounts_set_updated_at' and tgrelid = 'app_public.affiliate_accounts'::regclass) then create trigger trg_affiliate_accounts_set_updated_at before update on app_public.affiliate_accounts for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  affiliate_account_id uuid,
  user_id uuid,
  referral_code text,
  source text,
  source_event_id text,
  ip_hash text,
  status text not null default 'tracked'
);
alter table app_public.affiliate_clicks add column if not exists created_at timestamptz not null default now();
alter table app_public.affiliate_clicks add column if not exists updated_at timestamptz not null default now();
alter table app_public.affiliate_clicks add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.affiliate_clicks add column if not exists affiliate_account_id uuid;
alter table app_public.affiliate_clicks add column if not exists user_id uuid;
alter table app_public.affiliate_clicks add column if not exists referral_code text;
alter table app_public.affiliate_clicks add column if not exists source text;
alter table app_public.affiliate_clicks add column if not exists source_event_id text;
alter table app_public.affiliate_clicks add column if not exists ip_hash text;
alter table app_public.affiliate_clicks add column if not exists status text not null default 'tracked';
alter table app_public.affiliate_clicks enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_affiliate_clicks_set_updated_at' and tgrelid = 'app_public.affiliate_clicks'::regclass) then create trigger trg_affiliate_clicks_set_updated_at before update on app_public.affiliate_clicks for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.affiliate_conversions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  affiliate_account_id uuid,
  user_id uuid,
  source text,
  source_event_id text,
  order_ref text,
  amount numeric(20,6),
  currency text,
  status text not null default 'pending'
);
alter table app_public.affiliate_conversions add column if not exists created_at timestamptz not null default now();
alter table app_public.affiliate_conversions add column if not exists updated_at timestamptz not null default now();
alter table app_public.affiliate_conversions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.affiliate_conversions add column if not exists affiliate_account_id uuid;
alter table app_public.affiliate_conversions add column if not exists user_id uuid;
alter table app_public.affiliate_conversions add column if not exists source text;
alter table app_public.affiliate_conversions add column if not exists source_event_id text;
alter table app_public.affiliate_conversions add column if not exists order_ref text;
alter table app_public.affiliate_conversions add column if not exists amount numeric(20,6);
alter table app_public.affiliate_conversions add column if not exists currency text;
alter table app_public.affiliate_conversions add column if not exists status text not null default 'pending';
alter table app_public.affiliate_conversions enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_affiliate_conversions_set_updated_at' and tgrelid = 'app_public.affiliate_conversions'::regclass) then create trigger trg_affiliate_conversions_set_updated_at before update on app_public.affiliate_conversions for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  affiliate_account_id uuid,
  user_id uuid,
  conversion_id uuid,
  amount numeric(20,6) not null default 0,
  currency text not null default 'USD',
  status text not null default 'pending'
);
alter table app_public.affiliate_commissions add column if not exists created_at timestamptz not null default now();
alter table app_public.affiliate_commissions add column if not exists updated_at timestamptz not null default now();
alter table app_public.affiliate_commissions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.affiliate_commissions add column if not exists affiliate_account_id uuid;
alter table app_public.affiliate_commissions add column if not exists user_id uuid;
alter table app_public.affiliate_commissions add column if not exists conversion_id uuid;
alter table app_public.affiliate_commissions add column if not exists amount numeric(20,6) not null default 0;
alter table app_public.affiliate_commissions add column if not exists currency text not null default 'USD';
alter table app_public.affiliate_commissions add column if not exists status text not null default 'pending';
alter table app_public.affiliate_commissions enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_affiliate_commissions_set_updated_at' and tgrelid = 'app_public.affiliate_commissions'::regclass) then create trigger trg_affiliate_commissions_set_updated_at before update on app_public.affiliate_commissions for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.affiliate_payout_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  affiliate_account_id uuid,
  user_id uuid,
  amount numeric(20,6) not null default 0,
  currency text not null default 'USD',
  status text not null default 'requested'
);
alter table app_public.affiliate_payout_requests add column if not exists created_at timestamptz not null default now();
alter table app_public.affiliate_payout_requests add column if not exists updated_at timestamptz not null default now();
alter table app_public.affiliate_payout_requests add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.affiliate_payout_requests add column if not exists affiliate_account_id uuid;
alter table app_public.affiliate_payout_requests add column if not exists user_id uuid;
alter table app_public.affiliate_payout_requests add column if not exists amount numeric(20,6) not null default 0;
alter table app_public.affiliate_payout_requests add column if not exists currency text not null default 'USD';
alter table app_public.affiliate_payout_requests add column if not exists status text not null default 'requested';
alter table app_public.affiliate_payout_requests enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_affiliate_payout_requests_set_updated_at' and tgrelid = 'app_public.affiliate_payout_requests'::regclass) then create trigger trg_affiliate_payout_requests_set_updated_at before update on app_public.affiliate_payout_requests for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.affiliate_payouts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  affiliate_account_id uuid,
  user_id uuid,
  payout_request_id uuid,
  amount numeric(20,6) not null default 0,
  currency text not null default 'USD',
  status text not null default 'pending'
);
alter table app_public.affiliate_payouts add column if not exists created_at timestamptz not null default now();
alter table app_public.affiliate_payouts add column if not exists updated_at timestamptz not null default now();
alter table app_public.affiliate_payouts add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.affiliate_payouts add column if not exists affiliate_account_id uuid;
alter table app_public.affiliate_payouts add column if not exists user_id uuid;
alter table app_public.affiliate_payouts add column if not exists payout_request_id uuid;
alter table app_public.affiliate_payouts add column if not exists amount numeric(20,6) not null default 0;
alter table app_public.affiliate_payouts add column if not exists currency text not null default 'USD';
alter table app_public.affiliate_payouts add column if not exists status text not null default 'pending';
alter table app_public.affiliate_payouts enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_affiliate_payouts_set_updated_at' and tgrelid = 'app_public.affiliate_payouts'::regclass) then create trigger trg_affiliate_payouts_set_updated_at before update on app_public.affiliate_payouts for each row execute function app_public.set_updated_at(); end if; end $$;

-- PAYMENTS / STRIPE / ECONOMIC EVENTS
create table if not exists app_public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  stripe_event_id text,
  event_type text,
  checkout_session_id text,
  payment_intent_id text,
  cart_id text,
  order_ref text,
  amount_total bigint,
  currency text,
  verified boolean not null default false,
  processed boolean not null default false,
  duplicate boolean not null default false,
  source text not null default 'stripe',
  source_event_id text,
  idempotency_key text,
  raw_event jsonb not null default '{}'::jsonb,
  received_at timestamptz default now(),
  status text not null default 'received'
);
alter table app_public.stripe_webhook_events add column if not exists created_at timestamptz not null default now();
alter table app_public.stripe_webhook_events add column if not exists updated_at timestamptz not null default now();
alter table app_public.stripe_webhook_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.stripe_webhook_events add column if not exists stripe_event_id text;
alter table app_public.stripe_webhook_events add column if not exists event_type text;
alter table app_public.stripe_webhook_events add column if not exists checkout_session_id text;
alter table app_public.stripe_webhook_events add column if not exists payment_intent_id text;
alter table app_public.stripe_webhook_events add column if not exists cart_id text;
alter table app_public.stripe_webhook_events add column if not exists order_ref text;
alter table app_public.stripe_webhook_events add column if not exists amount_total bigint;
alter table app_public.stripe_webhook_events add column if not exists currency text;
alter table app_public.stripe_webhook_events add column if not exists verified boolean not null default false;
alter table app_public.stripe_webhook_events add column if not exists processed boolean not null default false;
alter table app_public.stripe_webhook_events add column if not exists duplicate boolean not null default false;
alter table app_public.stripe_webhook_events add column if not exists source text not null default 'stripe';
alter table app_public.stripe_webhook_events add column if not exists source_event_id text;
alter table app_public.stripe_webhook_events add column if not exists idempotency_key text;
alter table app_public.stripe_webhook_events add column if not exists raw_event jsonb not null default '{}'::jsonb;
alter table app_public.stripe_webhook_events add column if not exists received_at timestamptz default now();
alter table app_public.stripe_webhook_events add column if not exists status text not null default 'received';
alter table app_public.stripe_webhook_events enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_stripe_webhook_events_set_updated_at' and tgrelid = 'app_public.stripe_webhook_events'::regclass) then create trigger trg_stripe_webhook_events_set_updated_at before update on app_public.stripe_webhook_events for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.payment_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  checkout_session_id text,
  stripe_event_id text,
  payment_intent_id text,
  cart_id text,
  order_ref text,
  amount numeric(20,6),
  currency text,
  provider text not null default 'stripe',
  status text not null default 'pending'
);
alter table app_public.payment_records add column if not exists created_at timestamptz not null default now();
alter table app_public.payment_records add column if not exists updated_at timestamptz not null default now();
alter table app_public.payment_records add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.payment_records add column if not exists user_id uuid;
alter table app_public.payment_records add column if not exists checkout_session_id text;
alter table app_public.payment_records add column if not exists stripe_event_id text;
alter table app_public.payment_records add column if not exists payment_intent_id text;
alter table app_public.payment_records add column if not exists cart_id text;
alter table app_public.payment_records add column if not exists order_ref text;
alter table app_public.payment_records add column if not exists amount numeric(20,6);
alter table app_public.payment_records add column if not exists currency text;
alter table app_public.payment_records add column if not exists provider text not null default 'stripe';
alter table app_public.payment_records add column if not exists status text not null default 'pending';
alter table app_public.payment_records enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_payment_records_set_updated_at' and tgrelid = 'app_public.payment_records'::regclass) then create trigger trg_payment_records_set_updated_at before update on app_public.payment_records for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.checkout_payment_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  checkout_session_id text,
  cart_id text,
  order_ref text,
  stripe_event_id text,
  amount numeric(20,6),
  currency text,
  status text not null default 'created'
);
alter table app_public.checkout_payment_sessions add column if not exists created_at timestamptz not null default now();
alter table app_public.checkout_payment_sessions add column if not exists updated_at timestamptz not null default now();
alter table app_public.checkout_payment_sessions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.checkout_payment_sessions add column if not exists user_id uuid;
alter table app_public.checkout_payment_sessions add column if not exists checkout_session_id text;
alter table app_public.checkout_payment_sessions add column if not exists cart_id text;
alter table app_public.checkout_payment_sessions add column if not exists order_ref text;
alter table app_public.checkout_payment_sessions add column if not exists stripe_event_id text;
alter table app_public.checkout_payment_sessions add column if not exists amount numeric(20,6);
alter table app_public.checkout_payment_sessions add column if not exists currency text;
alter table app_public.checkout_payment_sessions add column if not exists status text not null default 'created';
alter table app_public.checkout_payment_sessions enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_checkout_payment_sessions_set_updated_at' and tgrelid = 'app_public.checkout_payment_sessions'::regclass) then create trigger trg_checkout_payment_sessions_set_updated_at before update on app_public.checkout_payment_sessions for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.economic_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  event_type text,
  source text,
  source_event_id text,
  checkout_session_id text,
  stripe_event_id text,
  cart_id text,
  order_ref text,
  user_id uuid,
  product_id text,
  variant_id text,
  amount numeric(20,6),
  currency text,
  verified boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
);
alter table app_public.economic_events add column if not exists created_at timestamptz not null default now();
alter table app_public.economic_events add column if not exists updated_at timestamptz not null default now();
alter table app_public.economic_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.economic_events add column if not exists event_type text;
alter table app_public.economic_events add column if not exists source text;
alter table app_public.economic_events add column if not exists source_event_id text;
alter table app_public.economic_events add column if not exists checkout_session_id text;
alter table app_public.economic_events add column if not exists stripe_event_id text;
alter table app_public.economic_events add column if not exists cart_id text;
alter table app_public.economic_events add column if not exists order_ref text;
alter table app_public.economic_events add column if not exists user_id uuid;
alter table app_public.economic_events add column if not exists product_id text;
alter table app_public.economic_events add column if not exists variant_id text;
alter table app_public.economic_events add column if not exists amount numeric(20,6);
alter table app_public.economic_events add column if not exists currency text;
alter table app_public.economic_events add column if not exists verified boolean not null default false;
alter table app_public.economic_events add column if not exists payload jsonb not null default '{}'::jsonb;
alter table app_public.economic_events add column if not exists status text not null default 'pending';
alter table app_public.economic_events enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_economic_events_set_updated_at' and tgrelid = 'app_public.economic_events'::regclass) then create trigger trg_economic_events_set_updated_at before update on app_public.economic_events for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.economic_event_outbox (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  economic_event_id uuid,
  event_type text,
  source text,
  source_event_id text,
  payload jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  status text not null default 'pending'
);
alter table app_public.economic_event_outbox add column if not exists created_at timestamptz not null default now();
alter table app_public.economic_event_outbox add column if not exists updated_at timestamptz not null default now();
alter table app_public.economic_event_outbox add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.economic_event_outbox add column if not exists economic_event_id uuid;
alter table app_public.economic_event_outbox add column if not exists event_type text;
alter table app_public.economic_event_outbox add column if not exists source text;
alter table app_public.economic_event_outbox add column if not exists source_event_id text;
alter table app_public.economic_event_outbox add column if not exists payload jsonb not null default '{}'::jsonb;
alter table app_public.economic_event_outbox add column if not exists published_at timestamptz;
alter table app_public.economic_event_outbox add column if not exists status text not null default 'pending';
alter table app_public.economic_event_outbox enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_economic_event_outbox_set_updated_at' and tgrelid = 'app_public.economic_event_outbox'::regclass) then create trigger trg_economic_event_outbox_set_updated_at before update on app_public.economic_event_outbox for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.settlement_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  source text,
  source_event_id text,
  checkout_session_id text,
  stripe_event_id text,
  order_ref text,
  started_at timestamptz,
  finished_at timestamptz,
  status text not null default 'pending'
);
alter table app_public.settlement_runs add column if not exists created_at timestamptz not null default now();
alter table app_public.settlement_runs add column if not exists updated_at timestamptz not null default now();
alter table app_public.settlement_runs add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.settlement_runs add column if not exists source text;
alter table app_public.settlement_runs add column if not exists source_event_id text;
alter table app_public.settlement_runs add column if not exists checkout_session_id text;
alter table app_public.settlement_runs add column if not exists stripe_event_id text;
alter table app_public.settlement_runs add column if not exists order_ref text;
alter table app_public.settlement_runs add column if not exists started_at timestamptz;
alter table app_public.settlement_runs add column if not exists finished_at timestamptz;
alter table app_public.settlement_runs add column if not exists status text not null default 'pending';
alter table app_public.settlement_runs enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_settlement_runs_set_updated_at' and tgrelid = 'app_public.settlement_runs'::regclass) then create trigger trg_settlement_runs_set_updated_at before update on app_public.settlement_runs for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  idempotency_key text,
  scope text not null default 'global',
  request_hash text,
  locked_until timestamptz,
  status text not null default 'recorded'
);
alter table app_public.idempotency_keys add column if not exists created_at timestamptz not null default now();
alter table app_public.idempotency_keys add column if not exists updated_at timestamptz not null default now();
alter table app_public.idempotency_keys add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.idempotency_keys add column if not exists idempotency_key text;
alter table app_public.idempotency_keys add column if not exists scope text not null default 'global';
alter table app_public.idempotency_keys add column if not exists request_hash text;
alter table app_public.idempotency_keys add column if not exists locked_until timestamptz;
alter table app_public.idempotency_keys add column if not exists status text not null default 'recorded';
alter table app_public.idempotency_keys enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_idempotency_keys_set_updated_at' and tgrelid = 'app_public.idempotency_keys'::regclass) then create trigger trg_idempotency_keys_set_updated_at before update on app_public.idempotency_keys for each row execute function app_public.set_updated_at(); end if; end $$;

-- ORDERS / MEDUSA SYNC
create table if not exists app_public.commerce_order_refs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  order_ref text,
  medusa_order_id text,
  checkout_session_id text,
  cart_id text,
  status text not null default 'pending'
);
alter table app_public.commerce_order_refs add column if not exists created_at timestamptz not null default now();
alter table app_public.commerce_order_refs add column if not exists updated_at timestamptz not null default now();
alter table app_public.commerce_order_refs add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.commerce_order_refs add column if not exists user_id uuid;
alter table app_public.commerce_order_refs add column if not exists order_ref text;
alter table app_public.commerce_order_refs add column if not exists medusa_order_id text;
alter table app_public.commerce_order_refs add column if not exists checkout_session_id text;
alter table app_public.commerce_order_refs add column if not exists cart_id text;
alter table app_public.commerce_order_refs add column if not exists status text not null default 'pending';
alter table app_public.commerce_order_refs enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_commerce_order_refs_set_updated_at' and tgrelid = 'app_public.commerce_order_refs'::regclass) then create trigger trg_commerce_order_refs_set_updated_at before update on app_public.commerce_order_refs for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.medusa_order_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  order_ref text,
  medusa_order_id text,
  source text,
  source_event_id text,
  attempt_count integer not null default 0,
  last_error text,
  status text not null default 'pending'
);
alter table app_public.medusa_order_sync_jobs add column if not exists created_at timestamptz not null default now();
alter table app_public.medusa_order_sync_jobs add column if not exists updated_at timestamptz not null default now();
alter table app_public.medusa_order_sync_jobs add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.medusa_order_sync_jobs add column if not exists order_ref text;
alter table app_public.medusa_order_sync_jobs add column if not exists medusa_order_id text;
alter table app_public.medusa_order_sync_jobs add column if not exists source text;
alter table app_public.medusa_order_sync_jobs add column if not exists source_event_id text;
alter table app_public.medusa_order_sync_jobs add column if not exists attempt_count integer not null default 0;
alter table app_public.medusa_order_sync_jobs add column if not exists last_error text;
alter table app_public.medusa_order_sync_jobs add column if not exists status text not null default 'pending';
alter table app_public.medusa_order_sync_jobs enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_medusa_order_sync_jobs_set_updated_at' and tgrelid = 'app_public.medusa_order_sync_jobs'::regclass) then create trigger trg_medusa_order_sync_jobs_set_updated_at before update on app_public.medusa_order_sync_jobs for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.medusa_order_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  order_ref text,
  medusa_order_id text,
  event_type text,
  source text,
  source_event_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'recorded'
);
alter table app_public.medusa_order_events add column if not exists created_at timestamptz not null default now();
alter table app_public.medusa_order_events add column if not exists updated_at timestamptz not null default now();
alter table app_public.medusa_order_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.medusa_order_events add column if not exists order_ref text;
alter table app_public.medusa_order_events add column if not exists medusa_order_id text;
alter table app_public.medusa_order_events add column if not exists event_type text;
alter table app_public.medusa_order_events add column if not exists source text;
alter table app_public.medusa_order_events add column if not exists source_event_id text;
alter table app_public.medusa_order_events add column if not exists payload jsonb not null default '{}'::jsonb;
alter table app_public.medusa_order_events add column if not exists status text not null default 'recorded';
alter table app_public.medusa_order_events enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_medusa_order_events_set_updated_at' and tgrelid = 'app_public.medusa_order_events'::regclass) then create trigger trg_medusa_order_events_set_updated_at before update on app_public.medusa_order_events for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.fulfillment_tracking_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  order_ref text,
  medusa_order_id text,
  tracking_number text,
  carrier text,
  event_type text,
  source text,
  source_event_id text,
  status text not null default 'pending'
);
alter table app_public.fulfillment_tracking_events add column if not exists created_at timestamptz not null default now();
alter table app_public.fulfillment_tracking_events add column if not exists updated_at timestamptz not null default now();
alter table app_public.fulfillment_tracking_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.fulfillment_tracking_events add column if not exists order_ref text;
alter table app_public.fulfillment_tracking_events add column if not exists medusa_order_id text;
alter table app_public.fulfillment_tracking_events add column if not exists tracking_number text;
alter table app_public.fulfillment_tracking_events add column if not exists carrier text;
alter table app_public.fulfillment_tracking_events add column if not exists event_type text;
alter table app_public.fulfillment_tracking_events add column if not exists source text;
alter table app_public.fulfillment_tracking_events add column if not exists source_event_id text;
alter table app_public.fulfillment_tracking_events add column if not exists status text not null default 'pending';
alter table app_public.fulfillment_tracking_events enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_fulfillment_tracking_events_set_updated_at' and tgrelid = 'app_public.fulfillment_tracking_events'::regclass) then create trigger trg_fulfillment_tracking_events_set_updated_at before update on app_public.fulfillment_tracking_events for each row execute function app_public.set_updated_at(); end if; end $$;

-- ADS / WATCH-TO-EARN
create table if not exists app_public.advertiser_accounts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  status text not null default 'active'
);
alter table app_public.advertiser_accounts add column if not exists created_at timestamptz not null default now();
alter table app_public.advertiser_accounts add column if not exists updated_at timestamptz not null default now();
alter table app_public.advertiser_accounts add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.advertiser_accounts add column if not exists user_id uuid;
alter table app_public.advertiser_accounts add column if not exists status text not null default 'active';
alter table app_public.advertiser_accounts enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_advertiser_accounts_set_updated_at' and tgrelid = 'app_public.advertiser_accounts'::regclass) then create trigger trg_advertiser_accounts_set_updated_at before update on app_public.advertiser_accounts for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  campaign_id text,
  advertiser_account_id uuid,
  product_id text,
  status text not null default 'draft'
);
alter table app_public.ad_campaigns add column if not exists created_at timestamptz not null default now();
alter table app_public.ad_campaigns add column if not exists updated_at timestamptz not null default now();
alter table app_public.ad_campaigns add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.ad_campaigns add column if not exists user_id uuid;
alter table app_public.ad_campaigns add column if not exists campaign_id text;
alter table app_public.ad_campaigns add column if not exists advertiser_account_id uuid;
alter table app_public.ad_campaigns add column if not exists product_id text;
alter table app_public.ad_campaigns add column if not exists status text not null default 'draft';
alter table app_public.ad_campaigns enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_ad_campaigns_set_updated_at' and tgrelid = 'app_public.ad_campaigns'::regclass) then create trigger trg_ad_campaigns_set_updated_at before update on app_public.ad_campaigns for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.ad_creatives (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  campaign_id text,
  product_id text,
  variant_id text,
  status text not null default 'draft'
);
alter table app_public.ad_creatives add column if not exists created_at timestamptz not null default now();
alter table app_public.ad_creatives add column if not exists updated_at timestamptz not null default now();
alter table app_public.ad_creatives add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.ad_creatives add column if not exists user_id uuid;
alter table app_public.ad_creatives add column if not exists campaign_id text;
alter table app_public.ad_creatives add column if not exists product_id text;
alter table app_public.ad_creatives add column if not exists variant_id text;
alter table app_public.ad_creatives add column if not exists status text not null default 'draft';
alter table app_public.ad_creatives enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_ad_creatives_set_updated_at' and tgrelid = 'app_public.ad_creatives'::regclass) then create trigger trg_ad_creatives_set_updated_at before update on app_public.ad_creatives for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.ad_watch_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  campaign_id text,
  device_fingerprint_id uuid,
  started_at timestamptz default now(),
  completed_at timestamptz,
  status text not null default 'started'
);
alter table app_public.ad_watch_sessions add column if not exists created_at timestamptz not null default now();
alter table app_public.ad_watch_sessions add column if not exists updated_at timestamptz not null default now();
alter table app_public.ad_watch_sessions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.ad_watch_sessions add column if not exists user_id uuid;
alter table app_public.ad_watch_sessions add column if not exists campaign_id text;
alter table app_public.ad_watch_sessions add column if not exists device_fingerprint_id uuid;
alter table app_public.ad_watch_sessions add column if not exists started_at timestamptz default now();
alter table app_public.ad_watch_sessions add column if not exists completed_at timestamptz;
alter table app_public.ad_watch_sessions add column if not exists status text not null default 'started';
alter table app_public.ad_watch_sessions enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_ad_watch_sessions_set_updated_at' and tgrelid = 'app_public.ad_watch_sessions'::regclass) then create trigger trg_ad_watch_sessions_set_updated_at before update on app_public.ad_watch_sessions for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.ad_watch_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  campaign_id text,
  event_type text,
  source text,
  source_event_id text,
  status text not null default 'recorded'
);
alter table app_public.ad_watch_events add column if not exists created_at timestamptz not null default now();
alter table app_public.ad_watch_events add column if not exists updated_at timestamptz not null default now();
alter table app_public.ad_watch_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.ad_watch_events add column if not exists user_id uuid;
alter table app_public.ad_watch_events add column if not exists campaign_id text;
alter table app_public.ad_watch_events add column if not exists event_type text;
alter table app_public.ad_watch_events add column if not exists source text;
alter table app_public.ad_watch_events add column if not exists source_event_id text;
alter table app_public.ad_watch_events add column if not exists status text not null default 'recorded';
alter table app_public.ad_watch_events enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_ad_watch_events_set_updated_at' and tgrelid = 'app_public.ad_watch_events'::regclass) then create trigger trg_ad_watch_events_set_updated_at before update on app_public.ad_watch_events for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.ad_reward_confirmations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  campaign_id text,
  wallet_id uuid,
  reward_event_id uuid,
  amount numeric(20,6),
  currency text,
  status text not null default 'pending'
);
alter table app_public.ad_reward_confirmations add column if not exists created_at timestamptz not null default now();
alter table app_public.ad_reward_confirmations add column if not exists updated_at timestamptz not null default now();
alter table app_public.ad_reward_confirmations add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.ad_reward_confirmations add column if not exists user_id uuid;
alter table app_public.ad_reward_confirmations add column if not exists campaign_id text;
alter table app_public.ad_reward_confirmations add column if not exists wallet_id uuid;
alter table app_public.ad_reward_confirmations add column if not exists reward_event_id uuid;
alter table app_public.ad_reward_confirmations add column if not exists amount numeric(20,6);
alter table app_public.ad_reward_confirmations add column if not exists currency text;
alter table app_public.ad_reward_confirmations add column if not exists status text not null default 'pending';
alter table app_public.ad_reward_confirmations enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_ad_reward_confirmations_set_updated_at' and tgrelid = 'app_public.ad_reward_confirmations'::regclass) then create trigger trg_ad_reward_confirmations_set_updated_at before update on app_public.ad_reward_confirmations for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.ad_budget_ledger (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  campaign_id text,
  advertiser_account_id uuid,
  amount numeric(20,6),
  currency text,
  entry_type text,
  source text,
  source_event_id text,
  status text not null default 'posted'
);
alter table app_public.ad_budget_ledger add column if not exists created_at timestamptz not null default now();
alter table app_public.ad_budget_ledger add column if not exists updated_at timestamptz not null default now();
alter table app_public.ad_budget_ledger add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.ad_budget_ledger add column if not exists campaign_id text;
alter table app_public.ad_budget_ledger add column if not exists advertiser_account_id uuid;
alter table app_public.ad_budget_ledger add column if not exists amount numeric(20,6);
alter table app_public.ad_budget_ledger add column if not exists currency text;
alter table app_public.ad_budget_ledger add column if not exists entry_type text;
alter table app_public.ad_budget_ledger add column if not exists source text;
alter table app_public.ad_budget_ledger add column if not exists source_event_id text;
alter table app_public.ad_budget_ledger add column if not exists status text not null default 'posted';
alter table app_public.ad_budget_ledger enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_ad_budget_ledger_set_updated_at' and tgrelid = 'app_public.ad_budget_ledger'::regclass) then create trigger trg_ad_budget_ledger_set_updated_at before update on app_public.ad_budget_ledger for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.ad_fraud_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  campaign_id text,
  event_type text,
  risk_score numeric(10,4),
  source text,
  source_event_id text,
  status text not null default 'open'
);
alter table app_public.ad_fraud_events add column if not exists created_at timestamptz not null default now();
alter table app_public.ad_fraud_events add column if not exists updated_at timestamptz not null default now();
alter table app_public.ad_fraud_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.ad_fraud_events add column if not exists user_id uuid;
alter table app_public.ad_fraud_events add column if not exists campaign_id text;
alter table app_public.ad_fraud_events add column if not exists event_type text;
alter table app_public.ad_fraud_events add column if not exists risk_score numeric(10,4);
alter table app_public.ad_fraud_events add column if not exists source text;
alter table app_public.ad_fraud_events add column if not exists source_event_id text;
alter table app_public.ad_fraud_events add column if not exists status text not null default 'open';
alter table app_public.ad_fraud_events enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_ad_fraud_events_set_updated_at' and tgrelid = 'app_public.ad_fraud_events'::regclass) then create trigger trg_ad_fraud_events_set_updated_at before update on app_public.ad_fraud_events for each row execute function app_public.set_updated_at(); end if; end $$;

-- AI STORIES
create table if not exists app_public.ai_stories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  story_id text,
  title text,
  status text not null default 'draft'
);
alter table app_public.ai_stories add column if not exists created_at timestamptz not null default now();
alter table app_public.ai_stories add column if not exists updated_at timestamptz not null default now();
alter table app_public.ai_stories add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.ai_stories add column if not exists user_id uuid;
alter table app_public.ai_stories add column if not exists story_id text;
alter table app_public.ai_stories add column if not exists title text;
alter table app_public.ai_stories add column if not exists status text not null default 'draft';
alter table app_public.ai_stories enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_ai_stories_set_updated_at' and tgrelid = 'app_public.ai_stories'::regclass) then create trigger trg_ai_stories_set_updated_at before update on app_public.ai_stories for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.ai_story_generations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  story_id text,
  source text,
  source_event_id text,
  status text not null default 'queued'
);
alter table app_public.ai_story_generations add column if not exists created_at timestamptz not null default now();
alter table app_public.ai_story_generations add column if not exists updated_at timestamptz not null default now();
alter table app_public.ai_story_generations add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.ai_story_generations add column if not exists user_id uuid;
alter table app_public.ai_story_generations add column if not exists story_id text;
alter table app_public.ai_story_generations add column if not exists source text;
alter table app_public.ai_story_generations add column if not exists source_event_id text;
alter table app_public.ai_story_generations add column if not exists status text not null default 'queued';
alter table app_public.ai_story_generations enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_ai_story_generations_set_updated_at' and tgrelid = 'app_public.ai_story_generations'::regclass) then create trigger trg_ai_story_generations_set_updated_at before update on app_public.ai_story_generations for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.ai_story_usage_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  story_id text,
  event_type text,
  source text,
  source_event_id text,
  status text not null default 'recorded'
);
alter table app_public.ai_story_usage_events add column if not exists created_at timestamptz not null default now();
alter table app_public.ai_story_usage_events add column if not exists updated_at timestamptz not null default now();
alter table app_public.ai_story_usage_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.ai_story_usage_events add column if not exists user_id uuid;
alter table app_public.ai_story_usage_events add column if not exists story_id text;
alter table app_public.ai_story_usage_events add column if not exists event_type text;
alter table app_public.ai_story_usage_events add column if not exists source text;
alter table app_public.ai_story_usage_events add column if not exists source_event_id text;
alter table app_public.ai_story_usage_events add column if not exists status text not null default 'recorded';
alter table app_public.ai_story_usage_events enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_ai_story_usage_events_set_updated_at' and tgrelid = 'app_public.ai_story_usage_events'::regclass) then create trigger trg_ai_story_usage_events_set_updated_at before update on app_public.ai_story_usage_events for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.ai_story_promotion_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  story_id text,
  campaign_id text,
  event_type text,
  source text,
  source_event_id text,
  status text not null default 'pending'
);
alter table app_public.ai_story_promotion_events add column if not exists created_at timestamptz not null default now();
alter table app_public.ai_story_promotion_events add column if not exists updated_at timestamptz not null default now();
alter table app_public.ai_story_promotion_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.ai_story_promotion_events add column if not exists user_id uuid;
alter table app_public.ai_story_promotion_events add column if not exists story_id text;
alter table app_public.ai_story_promotion_events add column if not exists campaign_id text;
alter table app_public.ai_story_promotion_events add column if not exists event_type text;
alter table app_public.ai_story_promotion_events add column if not exists source text;
alter table app_public.ai_story_promotion_events add column if not exists source_event_id text;
alter table app_public.ai_story_promotion_events add column if not exists status text not null default 'pending';
alter table app_public.ai_story_promotion_events enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_ai_story_promotion_events_set_updated_at' and tgrelid = 'app_public.ai_story_promotion_events'::regclass) then create trigger trg_ai_story_promotion_events_set_updated_at before update on app_public.ai_story_promotion_events for each row execute function app_public.set_updated_at(); end if; end $$;

-- DREAMS / CROWDFUNDING
create table if not exists app_public.dream_projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  project_id text,
  title text,
  funding_goal numeric(20,6),
  currency text,
  status text not null default 'draft'
);
alter table app_public.dream_projects add column if not exists created_at timestamptz not null default now();
alter table app_public.dream_projects add column if not exists updated_at timestamptz not null default now();
alter table app_public.dream_projects add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.dream_projects add column if not exists user_id uuid;
alter table app_public.dream_projects add column if not exists project_id text;
alter table app_public.dream_projects add column if not exists title text;
alter table app_public.dream_projects add column if not exists funding_goal numeric(20,6);
alter table app_public.dream_projects add column if not exists currency text;
alter table app_public.dream_projects add column if not exists status text not null default 'draft';
alter table app_public.dream_projects enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_dream_projects_set_updated_at' and tgrelid = 'app_public.dream_projects'::regclass) then create trigger trg_dream_projects_set_updated_at before update on app_public.dream_projects for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.dream_pledges (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  project_id text,
  amount numeric(20,6),
  currency text,
  status text not null default 'pledged'
);
alter table app_public.dream_pledges add column if not exists created_at timestamptz not null default now();
alter table app_public.dream_pledges add column if not exists updated_at timestamptz not null default now();
alter table app_public.dream_pledges add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.dream_pledges add column if not exists user_id uuid;
alter table app_public.dream_pledges add column if not exists project_id text;
alter table app_public.dream_pledges add column if not exists amount numeric(20,6);
alter table app_public.dream_pledges add column if not exists currency text;
alter table app_public.dream_pledges add column if not exists status text not null default 'pledged';
alter table app_public.dream_pledges enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_dream_pledges_set_updated_at' and tgrelid = 'app_public.dream_pledges'::regclass) then create trigger trg_dream_pledges_set_updated_at before update on app_public.dream_pledges for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.dream_contributions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  project_id text,
  amount numeric(20,6),
  currency text,
  source text,
  source_event_id text,
  status text not null default 'pending'
);
alter table app_public.dream_contributions add column if not exists created_at timestamptz not null default now();
alter table app_public.dream_contributions add column if not exists updated_at timestamptz not null default now();
alter table app_public.dream_contributions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.dream_contributions add column if not exists user_id uuid;
alter table app_public.dream_contributions add column if not exists project_id text;
alter table app_public.dream_contributions add column if not exists amount numeric(20,6);
alter table app_public.dream_contributions add column if not exists currency text;
alter table app_public.dream_contributions add column if not exists source text;
alter table app_public.dream_contributions add column if not exists source_event_id text;
alter table app_public.dream_contributions add column if not exists status text not null default 'pending';
alter table app_public.dream_contributions enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_dream_contributions_set_updated_at' and tgrelid = 'app_public.dream_contributions'::regclass) then create trigger trg_dream_contributions_set_updated_at before update on app_public.dream_contributions for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.dream_reward_claims (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  project_id text,
  reward_id text,
  status text not null default 'pending'
);
alter table app_public.dream_reward_claims add column if not exists created_at timestamptz not null default now();
alter table app_public.dream_reward_claims add column if not exists updated_at timestamptz not null default now();
alter table app_public.dream_reward_claims add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.dream_reward_claims add column if not exists user_id uuid;
alter table app_public.dream_reward_claims add column if not exists project_id text;
alter table app_public.dream_reward_claims add column if not exists reward_id text;
alter table app_public.dream_reward_claims add column if not exists status text not null default 'pending';
alter table app_public.dream_reward_claims enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_dream_reward_claims_set_updated_at' and tgrelid = 'app_public.dream_reward_claims'::regclass) then create trigger trg_dream_reward_claims_set_updated_at before update on app_public.dream_reward_claims for each row execute function app_public.set_updated_at(); end if; end $$;

-- SUPPORT / NOTIFICATIONS
create table if not exists app_public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  ticket_number text,
  subject text,
  status text not null default 'open'
);
alter table app_public.support_tickets add column if not exists created_at timestamptz not null default now();
alter table app_public.support_tickets add column if not exists updated_at timestamptz not null default now();
alter table app_public.support_tickets add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.support_tickets add column if not exists user_id uuid;
alter table app_public.support_tickets add column if not exists ticket_number text;
alter table app_public.support_tickets add column if not exists subject text;
alter table app_public.support_tickets add column if not exists status text not null default 'open';
alter table app_public.support_tickets enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_support_tickets_set_updated_at' and tgrelid = 'app_public.support_tickets'::regclass) then create trigger trg_support_tickets_set_updated_at before update on app_public.support_tickets for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.support_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  ticket_id uuid,
  body text,
  author_type text,
  status text not null default 'sent'
);
alter table app_public.support_messages add column if not exists created_at timestamptz not null default now();
alter table app_public.support_messages add column if not exists updated_at timestamptz not null default now();
alter table app_public.support_messages add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.support_messages add column if not exists user_id uuid;
alter table app_public.support_messages add column if not exists ticket_id uuid;
alter table app_public.support_messages add column if not exists body text;
alter table app_public.support_messages add column if not exists author_type text;
alter table app_public.support_messages add column if not exists status text not null default 'sent';
alter table app_public.support_messages enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_support_messages_set_updated_at' and tgrelid = 'app_public.support_messages'::regclass) then create trigger trg_support_messages_set_updated_at before update on app_public.support_messages for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  event_type text,
  title text,
  body text,
  read_at timestamptz,
  status text not null default 'queued'
);
alter table app_public.notifications add column if not exists created_at timestamptz not null default now();
alter table app_public.notifications add column if not exists updated_at timestamptz not null default now();
alter table app_public.notifications add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.notifications add column if not exists user_id uuid;
alter table app_public.notifications add column if not exists event_type text;
alter table app_public.notifications add column if not exists title text;
alter table app_public.notifications add column if not exists body text;
alter table app_public.notifications add column if not exists read_at timestamptz;
alter table app_public.notifications add column if not exists status text not null default 'queued';
alter table app_public.notifications enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_notifications_set_updated_at' and tgrelid = 'app_public.notifications'::regclass) then create trigger trg_notifications_set_updated_at before update on app_public.notifications for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  notification_id uuid,
  channel text,
  provider_message_id text,
  delivered_at timestamptz,
  status text not null default 'pending'
);
alter table app_public.notification_deliveries add column if not exists created_at timestamptz not null default now();
alter table app_public.notification_deliveries add column if not exists updated_at timestamptz not null default now();
alter table app_public.notification_deliveries add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.notification_deliveries add column if not exists user_id uuid;
alter table app_public.notification_deliveries add column if not exists notification_id uuid;
alter table app_public.notification_deliveries add column if not exists channel text;
alter table app_public.notification_deliveries add column if not exists provider_message_id text;
alter table app_public.notification_deliveries add column if not exists delivered_at timestamptz;
alter table app_public.notification_deliveries add column if not exists status text not null default 'pending';
alter table app_public.notification_deliveries enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_notification_deliveries_set_updated_at' and tgrelid = 'app_public.notification_deliveries'::regclass) then create trigger trg_notification_deliveries_set_updated_at before update on app_public.notification_deliveries for each row execute function app_public.set_updated_at(); end if; end $$;

-- SECURITY / RISK / COMPLIANCE
create table if not exists app_public.risk_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  event_type text,
  risk_score numeric(10,4),
  source text,
  source_event_id text,
  status text not null default 'open'
);
alter table app_public.risk_events add column if not exists created_at timestamptz not null default now();
alter table app_public.risk_events add column if not exists updated_at timestamptz not null default now();
alter table app_public.risk_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.risk_events add column if not exists user_id uuid;
alter table app_public.risk_events add column if not exists event_type text;
alter table app_public.risk_events add column if not exists risk_score numeric(10,4);
alter table app_public.risk_events add column if not exists source text;
alter table app_public.risk_events add column if not exists source_event_id text;
alter table app_public.risk_events add column if not exists status text not null default 'open';
alter table app_public.risk_events enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_risk_events_set_updated_at' and tgrelid = 'app_public.risk_events'::regclass) then create trigger trg_risk_events_set_updated_at before update on app_public.risk_events for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.device_fingerprints (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  device_hash text,
  ip_hash text,
  user_agent_hash text,
  status text not null default 'active'
);
alter table app_public.device_fingerprints add column if not exists created_at timestamptz not null default now();
alter table app_public.device_fingerprints add column if not exists updated_at timestamptz not null default now();
alter table app_public.device_fingerprints add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.device_fingerprints add column if not exists user_id uuid;
alter table app_public.device_fingerprints add column if not exists device_hash text;
alter table app_public.device_fingerprints add column if not exists ip_hash text;
alter table app_public.device_fingerprints add column if not exists user_agent_hash text;
alter table app_public.device_fingerprints add column if not exists status text not null default 'active';
alter table app_public.device_fingerprints enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_device_fingerprints_set_updated_at' and tgrelid = 'app_public.device_fingerprints'::regclass) then create trigger trg_device_fingerprints_set_updated_at before update on app_public.device_fingerprints for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.captcha_verifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  source text,
  source_event_id text,
  verified boolean not null default false,
  verified_at timestamptz,
  status text not null default 'pending'
);
alter table app_public.captcha_verifications add column if not exists created_at timestamptz not null default now();
alter table app_public.captcha_verifications add column if not exists updated_at timestamptz not null default now();
alter table app_public.captcha_verifications add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.captcha_verifications add column if not exists user_id uuid;
alter table app_public.captcha_verifications add column if not exists source text;
alter table app_public.captcha_verifications add column if not exists source_event_id text;
alter table app_public.captcha_verifications add column if not exists verified boolean not null default false;
alter table app_public.captcha_verifications add column if not exists verified_at timestamptz;
alter table app_public.captcha_verifications add column if not exists status text not null default 'pending';
alter table app_public.captcha_verifications enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_captcha_verifications_set_updated_at' and tgrelid = 'app_public.captcha_verifications'::regclass) then create trigger trg_captcha_verifications_set_updated_at before update on app_public.captcha_verifications for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.auth_security_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  event_type text,
  source text,
  source_event_id text,
  status text not null default 'recorded'
);
alter table app_public.auth_security_events add column if not exists created_at timestamptz not null default now();
alter table app_public.auth_security_events add column if not exists updated_at timestamptz not null default now();
alter table app_public.auth_security_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.auth_security_events add column if not exists user_id uuid;
alter table app_public.auth_security_events add column if not exists event_type text;
alter table app_public.auth_security_events add column if not exists source text;
alter table app_public.auth_security_events add column if not exists source_event_id text;
alter table app_public.auth_security_events add column if not exists status text not null default 'recorded';
alter table app_public.auth_security_events enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_auth_security_events_set_updated_at' and tgrelid = 'app_public.auth_security_events'::regclass) then create trigger trg_auth_security_events_set_updated_at before update on app_public.auth_security_events for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.compliance_checks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  check_type text,
  source text,
  source_event_id text,
  status text not null default 'pending'
);
alter table app_public.compliance_checks add column if not exists created_at timestamptz not null default now();
alter table app_public.compliance_checks add column if not exists updated_at timestamptz not null default now();
alter table app_public.compliance_checks add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.compliance_checks add column if not exists user_id uuid;
alter table app_public.compliance_checks add column if not exists check_type text;
alter table app_public.compliance_checks add column if not exists source text;
alter table app_public.compliance_checks add column if not exists source_event_id text;
alter table app_public.compliance_checks add column if not exists status text not null default 'pending';
alter table app_public.compliance_checks enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_compliance_checks_set_updated_at' and tgrelid = 'app_public.compliance_checks'::regclass) then create trigger trg_compliance_checks_set_updated_at before update on app_public.compliance_checks for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.sanctions_screening_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  source text,
  source_event_id text,
  result text,
  status text not null default 'pending'
);
alter table app_public.sanctions_screening_events add column if not exists created_at timestamptz not null default now();
alter table app_public.sanctions_screening_events add column if not exists updated_at timestamptz not null default now();
alter table app_public.sanctions_screening_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.sanctions_screening_events add column if not exists user_id uuid;
alter table app_public.sanctions_screening_events add column if not exists source text;
alter table app_public.sanctions_screening_events add column if not exists source_event_id text;
alter table app_public.sanctions_screening_events add column if not exists result text;
alter table app_public.sanctions_screening_events add column if not exists status text not null default 'pending';
alter table app_public.sanctions_screening_events enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_sanctions_screening_events_set_updated_at' and tgrelid = 'app_public.sanctions_screening_events'::regclass) then create trigger trg_sanctions_screening_events_set_updated_at before update on app_public.sanctions_screening_events for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.geo_policy_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  country text,
  source text,
  source_event_id text,
  status text not null default 'recorded'
);
alter table app_public.geo_policy_events add column if not exists created_at timestamptz not null default now();
alter table app_public.geo_policy_events add column if not exists updated_at timestamptz not null default now();
alter table app_public.geo_policy_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.geo_policy_events add column if not exists user_id uuid;
alter table app_public.geo_policy_events add column if not exists country text;
alter table app_public.geo_policy_events add column if not exists source text;
alter table app_public.geo_policy_events add column if not exists source_event_id text;
alter table app_public.geo_policy_events add column if not exists status text not null default 'recorded';
alter table app_public.geo_policy_events enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_geo_policy_events_set_updated_at' and tgrelid = 'app_public.geo_policy_events'::regclass) then create trigger trg_geo_policy_events_set_updated_at before update on app_public.geo_policy_events for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  event_type text,
  actor_type text,
  source text,
  source_event_id text,
  status text not null default 'recorded'
);
alter table app_public.audit_logs add column if not exists created_at timestamptz not null default now();
alter table app_public.audit_logs add column if not exists updated_at timestamptz not null default now();
alter table app_public.audit_logs add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.audit_logs add column if not exists user_id uuid;
alter table app_public.audit_logs add column if not exists event_type text;
alter table app_public.audit_logs add column if not exists actor_type text;
alter table app_public.audit_logs add column if not exists source text;
alter table app_public.audit_logs add column if not exists source_event_id text;
alter table app_public.audit_logs add column if not exists status text not null default 'recorded';
alter table app_public.audit_logs enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_audit_logs_set_updated_at' and tgrelid = 'app_public.audit_logs'::regclass) then create trigger trg_audit_logs_set_updated_at before update on app_public.audit_logs for each row execute function app_public.set_updated_at(); end if; end $$;

-- SYSTEM / OPS
create table if not exists app_public.system_settings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  key text,
  value jsonb not null default '{}'::jsonb,
  status text not null default 'active'
);
alter table app_public.system_settings add column if not exists created_at timestamptz not null default now();
alter table app_public.system_settings add column if not exists updated_at timestamptz not null default now();
alter table app_public.system_settings add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.system_settings add column if not exists key text;
alter table app_public.system_settings add column if not exists value jsonb not null default '{}'::jsonb;
alter table app_public.system_settings add column if not exists status text not null default 'active';
alter table app_public.system_settings enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_system_settings_set_updated_at' and tgrelid = 'app_public.system_settings'::regclass) then create trigger trg_system_settings_set_updated_at before update on app_public.system_settings for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.system_readiness_checks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  check_name text,
  result jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
);
alter table app_public.system_readiness_checks add column if not exists created_at timestamptz not null default now();
alter table app_public.system_readiness_checks add column if not exists updated_at timestamptz not null default now();
alter table app_public.system_readiness_checks add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.system_readiness_checks add column if not exists check_name text;
alter table app_public.system_readiness_checks add column if not exists result jsonb not null default '{}'::jsonb;
alter table app_public.system_readiness_checks add column if not exists status text not null default 'pending';
alter table app_public.system_readiness_checks enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_system_readiness_checks_set_updated_at' and tgrelid = 'app_public.system_readiness_checks'::regclass) then create trigger trg_system_readiness_checks_set_updated_at before update on app_public.system_readiness_checks for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.background_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  job_type text,
  source text,
  source_event_id text,
  payload jsonb not null default '{}'::jsonb,
  attempt_count integer not null default 0,
  run_after timestamptz default now(),
  status text not null default 'queued'
);
alter table app_public.background_jobs add column if not exists created_at timestamptz not null default now();
alter table app_public.background_jobs add column if not exists updated_at timestamptz not null default now();
alter table app_public.background_jobs add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.background_jobs add column if not exists job_type text;
alter table app_public.background_jobs add column if not exists source text;
alter table app_public.background_jobs add column if not exists source_event_id text;
alter table app_public.background_jobs add column if not exists payload jsonb not null default '{}'::jsonb;
alter table app_public.background_jobs add column if not exists attempt_count integer not null default 0;
alter table app_public.background_jobs add column if not exists run_after timestamptz default now();
alter table app_public.background_jobs add column if not exists status text not null default 'queued';
alter table app_public.background_jobs enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_background_jobs_set_updated_at' and tgrelid = 'app_public.background_jobs'::regclass) then create trigger trg_background_jobs_set_updated_at before update on app_public.background_jobs for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.webhook_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  webhook_event_id uuid,
  source text,
  source_event_id text,
  destination text,
  attempt_count integer not null default 0,
  last_error text,
  status text not null default 'pending'
);
alter table app_public.webhook_delivery_attempts add column if not exists created_at timestamptz not null default now();
alter table app_public.webhook_delivery_attempts add column if not exists updated_at timestamptz not null default now();
alter table app_public.webhook_delivery_attempts add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.webhook_delivery_attempts add column if not exists webhook_event_id uuid;
alter table app_public.webhook_delivery_attempts add column if not exists source text;
alter table app_public.webhook_delivery_attempts add column if not exists source_event_id text;
alter table app_public.webhook_delivery_attempts add column if not exists destination text;
alter table app_public.webhook_delivery_attempts add column if not exists attempt_count integer not null default 0;
alter table app_public.webhook_delivery_attempts add column if not exists last_error text;
alter table app_public.webhook_delivery_attempts add column if not exists status text not null default 'pending';
alter table app_public.webhook_delivery_attempts enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_webhook_delivery_attempts_set_updated_at' and tgrelid = 'app_public.webhook_delivery_attempts'::regclass) then create trigger trg_webhook_delivery_attempts_set_updated_at before update on app_public.webhook_delivery_attempts for each row execute function app_public.set_updated_at(); end if; end $$;

-- CODE-COMPAT APPLICATION TABLES
create table if not exists app_public.ai_story_campaigns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  story_id text,
  campaign_id text,
  status text not null default 'draft'
);
alter table app_public.ai_story_campaigns add column if not exists created_at timestamptz not null default now();
alter table app_public.ai_story_campaigns add column if not exists updated_at timestamptz not null default now();
alter table app_public.ai_story_campaigns add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.ai_story_campaigns add column if not exists user_id uuid;
alter table app_public.ai_story_campaigns add column if not exists story_id text;
alter table app_public.ai_story_campaigns add column if not exists campaign_id text;
alter table app_public.ai_story_campaigns add column if not exists status text not null default 'draft';
alter table app_public.ai_story_campaigns enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_ai_story_campaigns_set_updated_at' and tgrelid = 'app_public.ai_story_campaigns'::regclass) then create trigger trg_ai_story_campaigns_set_updated_at before update on app_public.ai_story_campaigns for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.checkout_settlements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  checkout_session_id text,
  stripe_event_id text,
  order_ref text,
  source text,
  source_event_id text,
  status text not null default 'pending'
);
alter table app_public.checkout_settlements add column if not exists created_at timestamptz not null default now();
alter table app_public.checkout_settlements add column if not exists updated_at timestamptz not null default now();
alter table app_public.checkout_settlements add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.checkout_settlements add column if not exists checkout_session_id text;
alter table app_public.checkout_settlements add column if not exists stripe_event_id text;
alter table app_public.checkout_settlements add column if not exists order_ref text;
alter table app_public.checkout_settlements add column if not exists source text;
alter table app_public.checkout_settlements add column if not exists source_event_id text;
alter table app_public.checkout_settlements add column if not exists status text not null default 'pending';
alter table app_public.checkout_settlements enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_checkout_settlements_set_updated_at' and tgrelid = 'app_public.checkout_settlements'::regclass) then create trigger trg_checkout_settlements_set_updated_at before update on app_public.checkout_settlements for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.commerce_fulfillment_sync (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  order_ref text,
  medusa_order_id text,
  source text,
  source_event_id text,
  status text not null default 'pending'
);
alter table app_public.commerce_fulfillment_sync add column if not exists created_at timestamptz not null default now();
alter table app_public.commerce_fulfillment_sync add column if not exists updated_at timestamptz not null default now();
alter table app_public.commerce_fulfillment_sync add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.commerce_fulfillment_sync add column if not exists order_ref text;
alter table app_public.commerce_fulfillment_sync add column if not exists medusa_order_id text;
alter table app_public.commerce_fulfillment_sync add column if not exists source text;
alter table app_public.commerce_fulfillment_sync add column if not exists source_event_id text;
alter table app_public.commerce_fulfillment_sync add column if not exists status text not null default 'pending';
alter table app_public.commerce_fulfillment_sync enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_commerce_fulfillment_sync_set_updated_at' and tgrelid = 'app_public.commerce_fulfillment_sync'::regclass) then create trigger trg_commerce_fulfillment_sync_set_updated_at before update on app_public.commerce_fulfillment_sync for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.commerce_order_sync (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  order_ref text,
  medusa_order_id text,
  source text,
  source_event_id text,
  status text not null default 'pending'
);
alter table app_public.commerce_order_sync add column if not exists created_at timestamptz not null default now();
alter table app_public.commerce_order_sync add column if not exists updated_at timestamptz not null default now();
alter table app_public.commerce_order_sync add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.commerce_order_sync add column if not exists order_ref text;
alter table app_public.commerce_order_sync add column if not exists medusa_order_id text;
alter table app_public.commerce_order_sync add column if not exists source text;
alter table app_public.commerce_order_sync add column if not exists source_event_id text;
alter table app_public.commerce_order_sync add column if not exists status text not null default 'pending';
alter table app_public.commerce_order_sync enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_commerce_order_sync_set_updated_at' and tgrelid = 'app_public.commerce_order_sync'::regclass) then create trigger trg_commerce_order_sync_set_updated_at before update on app_public.commerce_order_sync for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.commerce_product_sync (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  product_id text,
  variant_id text,
  source text,
  source_event_id text,
  status text not null default 'pending'
);
alter table app_public.commerce_product_sync add column if not exists created_at timestamptz not null default now();
alter table app_public.commerce_product_sync add column if not exists updated_at timestamptz not null default now();
alter table app_public.commerce_product_sync add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.commerce_product_sync add column if not exists product_id text;
alter table app_public.commerce_product_sync add column if not exists variant_id text;
alter table app_public.commerce_product_sync add column if not exists source text;
alter table app_public.commerce_product_sync add column if not exists source_event_id text;
alter table app_public.commerce_product_sync add column if not exists status text not null default 'pending';
alter table app_public.commerce_product_sync enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_commerce_product_sync_set_updated_at' and tgrelid = 'app_public.commerce_product_sync'::regclass) then create trigger trg_commerce_product_sync_set_updated_at before update on app_public.commerce_product_sync for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.commerce_settlements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  order_ref text,
  checkout_session_id text,
  stripe_event_id text,
  source text,
  source_event_id text,
  status text not null default 'pending'
);
alter table app_public.commerce_settlements add column if not exists created_at timestamptz not null default now();
alter table app_public.commerce_settlements add column if not exists updated_at timestamptz not null default now();
alter table app_public.commerce_settlements add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.commerce_settlements add column if not exists order_ref text;
alter table app_public.commerce_settlements add column if not exists checkout_session_id text;
alter table app_public.commerce_settlements add column if not exists stripe_event_id text;
alter table app_public.commerce_settlements add column if not exists source text;
alter table app_public.commerce_settlements add column if not exists source_event_id text;
alter table app_public.commerce_settlements add column if not exists status text not null default 'pending';
alter table app_public.commerce_settlements enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_commerce_settlements_set_updated_at' and tgrelid = 'app_public.commerce_settlements'::regclass) then create trigger trg_commerce_settlements_set_updated_at before update on app_public.commerce_settlements for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.commerce_variant_sync (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  product_id text,
  variant_id text,
  source text,
  source_event_id text,
  status text not null default 'pending'
);
alter table app_public.commerce_variant_sync add column if not exists created_at timestamptz not null default now();
alter table app_public.commerce_variant_sync add column if not exists updated_at timestamptz not null default now();
alter table app_public.commerce_variant_sync add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.commerce_variant_sync add column if not exists product_id text;
alter table app_public.commerce_variant_sync add column if not exists variant_id text;
alter table app_public.commerce_variant_sync add column if not exists source text;
alter table app_public.commerce_variant_sync add column if not exists source_event_id text;
alter table app_public.commerce_variant_sync add column if not exists status text not null default 'pending';
alter table app_public.commerce_variant_sync enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_commerce_variant_sync_set_updated_at' and tgrelid = 'app_public.commerce_variant_sync'::regclass) then create trigger trg_commerce_variant_sync_set_updated_at before update on app_public.commerce_variant_sync for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.health_check (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'ok'
);
alter table app_public.health_check add column if not exists created_at timestamptz not null default now();
alter table app_public.health_check add column if not exists updated_at timestamptz not null default now();
alter table app_public.health_check add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.health_check add column if not exists status text not null default 'ok';
alter table app_public.health_check enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_health_check_set_updated_at' and tgrelid = 'app_public.health_check'::regclass) then create trigger trg_health_check_set_updated_at before update on app_public.health_check for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.intelligence_audit_traces (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  event_type text,
  source text,
  source_event_id text,
  trace jsonb not null default '{}'::jsonb,
  status text not null default 'recorded'
);
alter table app_public.intelligence_audit_traces add column if not exists created_at timestamptz not null default now();
alter table app_public.intelligence_audit_traces add column if not exists updated_at timestamptz not null default now();
alter table app_public.intelligence_audit_traces add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.intelligence_audit_traces add column if not exists user_id uuid;
alter table app_public.intelligence_audit_traces add column if not exists event_type text;
alter table app_public.intelligence_audit_traces add column if not exists source text;
alter table app_public.intelligence_audit_traces add column if not exists source_event_id text;
alter table app_public.intelligence_audit_traces add column if not exists trace jsonb not null default '{}'::jsonb;
alter table app_public.intelligence_audit_traces add column if not exists status text not null default 'recorded';
alter table app_public.intelligence_audit_traces enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_intelligence_audit_traces_set_updated_at' and tgrelid = 'app_public.intelligence_audit_traces'::regclass) then create trigger trg_intelligence_audit_traces_set_updated_at before update on app_public.intelligence_audit_traces for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  wallet_id uuid,
  user_id uuid,
  amount numeric(20,6) not null default 0,
  currency text not null default 'USD',
  entry_type text,
  source text,
  source_event_id text,
  idempotency_key text,
  status text not null default 'posted'
);
alter table app_public.ledger_entries add column if not exists created_at timestamptz not null default now();
alter table app_public.ledger_entries add column if not exists updated_at timestamptz not null default now();
alter table app_public.ledger_entries add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.ledger_entries add column if not exists wallet_id uuid;
alter table app_public.ledger_entries add column if not exists user_id uuid;
alter table app_public.ledger_entries add column if not exists amount numeric(20,6) not null default 0;
alter table app_public.ledger_entries add column if not exists currency text not null default 'USD';
alter table app_public.ledger_entries add column if not exists entry_type text;
alter table app_public.ledger_entries add column if not exists source text;
alter table app_public.ledger_entries add column if not exists source_event_id text;
alter table app_public.ledger_entries add column if not exists idempotency_key text;
alter table app_public.ledger_entries add column if not exists status text not null default 'posted';
alter table app_public.ledger_entries enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_ledger_entries_set_updated_at' and tgrelid = 'app_public.ledger_entries'::regclass) then create trigger trg_ledger_entries_set_updated_at before update on app_public.ledger_entries for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  affiliate_account_id uuid,
  amount numeric(20,6),
  currency text,
  status text not null default 'requested'
);
alter table app_public.payout_requests add column if not exists created_at timestamptz not null default now();
alter table app_public.payout_requests add column if not exists updated_at timestamptz not null default now();
alter table app_public.payout_requests add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.payout_requests add column if not exists user_id uuid;
alter table app_public.payout_requests add column if not exists affiliate_account_id uuid;
alter table app_public.payout_requests add column if not exists amount numeric(20,6);
alter table app_public.payout_requests add column if not exists currency text;
alter table app_public.payout_requests add column if not exists status text not null default 'requested';
alter table app_public.payout_requests enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_payout_requests_set_updated_at' and tgrelid = 'app_public.payout_requests'::regclass) then create trigger trg_payout_requests_set_updated_at before update on app_public.payout_requests for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.supplier_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  order_ref text,
  supplier_order_id text,
  source text,
  source_event_id text,
  status text not null default 'pending'
);
alter table app_public.supplier_orders add column if not exists created_at timestamptz not null default now();
alter table app_public.supplier_orders add column if not exists updated_at timestamptz not null default now();
alter table app_public.supplier_orders add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.supplier_orders add column if not exists user_id uuid;
alter table app_public.supplier_orders add column if not exists order_ref text;
alter table app_public.supplier_orders add column if not exists supplier_order_id text;
alter table app_public.supplier_orders add column if not exists source text;
alter table app_public.supplier_orders add column if not exists source_event_id text;
alter table app_public.supplier_orders add column if not exists status text not null default 'pending';
alter table app_public.supplier_orders enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_supplier_orders_set_updated_at' and tgrelid = 'app_public.supplier_orders'::regclass) then create trigger trg_supplier_orders_set_updated_at before update on app_public.supplier_orders for each row execute function app_public.set_updated_at(); end if; end $$;
create table if not exists app_public.system_launch_readiness_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  source text,
  source_event_id text,
  snapshot jsonb not null default '{}'::jsonb,
  status text not null default 'recorded'
);
alter table app_public.system_launch_readiness_snapshots add column if not exists created_at timestamptz not null default now();
alter table app_public.system_launch_readiness_snapshots add column if not exists updated_at timestamptz not null default now();
alter table app_public.system_launch_readiness_snapshots add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.system_launch_readiness_snapshots add column if not exists source text;
alter table app_public.system_launch_readiness_snapshots add column if not exists source_event_id text;
alter table app_public.system_launch_readiness_snapshots add column if not exists snapshot jsonb not null default '{}'::jsonb;
alter table app_public.system_launch_readiness_snapshots add column if not exists status text not null default 'recorded';
alter table app_public.system_launch_readiness_snapshots enable row level security;
do $$ begin if not exists (select 1 from pg_trigger where tgname = 'trg_system_launch_readiness_snapshots_set_updated_at' and tgrelid = 'app_public.system_launch_readiness_snapshots'::regclass) then create trigger trg_system_launch_readiness_snapshots_set_updated_at before update on app_public.system_launch_readiness_snapshots for each row execute function app_public.set_updated_at(); end if; end $$;
create unique index if not exists uq_platform_users_user_id on app_public.platform_users (user_id) where user_id is not null;
create unique index if not exists uq_platform_users_email on app_public.platform_users (email) where email is not null;
create unique index if not exists uq_platform_users_owner_reference_id on app_public.platform_users (owner_reference_id) where owner_reference_id is not null;
create unique index if not exists uq_platform_users_referral_code on app_public.platform_users (referral_code) where referral_code is not null;
create unique index if not exists uq_user_profiles_user_id on app_public.user_profiles (user_id) where user_id is not null;
create unique index if not exists uq_wallets_user_id_currency on app_public.wallets (user_id, currency) where user_id is not null;
create unique index if not exists uq_affiliate_accounts_user_id on app_public.affiliate_accounts (user_id) where user_id is not null and status <> 'closed';
create unique index if not exists uq_referral_codes_referral_code on app_public.referral_codes (referral_code) where referral_code is not null;
create unique index if not exists uq_initiation_links_initiation_code on app_public.initiation_links (initiation_code) where initiation_code is not null;
create unique index if not exists uq_owner_reference_codes_owner_reference_id on app_public.owner_reference_codes (owner_reference_id) where owner_reference_id is not null;
create unique index if not exists uq_stripe_webhook_events_stripe_event_id on app_public.stripe_webhook_events (stripe_event_id);
create unique index if not exists uq_idempotency_keys_scope_idempotency_key on app_public.idempotency_keys (scope, idempotency_key);
create unique index if not exists uq_economic_events_source_source_event_id on app_public.economic_events (source, source_event_id) where source is not null and source_event_id is not null;
create unique index if not exists uq_wallet_ledger_entries_idempotency_key on app_public.wallet_ledger_entries (idempotency_key) where idempotency_key is not null;
create unique index if not exists uq_ledger_entries_idempotency_key on app_public.ledger_entries (idempotency_key) where idempotency_key is not null;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='platform_users' and column_name='user_id') then execute 'create index if not exists idx_platform_users_user_id on app_public.platform_users (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='platform_users' and column_name='email') then execute 'create index if not exists idx_platform_users_email on app_public.platform_users (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='platform_users' and column_name='status') then execute 'create index if not exists idx_platform_users_status on app_public.platform_users (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='platform_users' and column_name='event_type') then execute 'create index if not exists idx_platform_users_event_type on app_public.platform_users (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='platform_users' and column_name='source') then execute 'create index if not exists idx_platform_users_source on app_public.platform_users (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='platform_users' and column_name='source_event_id') then execute 'create index if not exists idx_platform_users_source_event_id on app_public.platform_users (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='platform_users' and column_name='checkout_session_id') then execute 'create index if not exists idx_platform_users_checkout_session_id on app_public.platform_users (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='platform_users' and column_name='stripe_event_id') then execute 'create index if not exists idx_platform_users_stripe_event_id on app_public.platform_users (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='platform_users' and column_name='cart_id') then execute 'create index if not exists idx_platform_users_cart_id on app_public.platform_users (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='platform_users' and column_name='order_ref') then execute 'create index if not exists idx_platform_users_order_ref on app_public.platform_users (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='platform_users' and column_name='product_id') then execute 'create index if not exists idx_platform_users_product_id on app_public.platform_users (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='platform_users' and column_name='variant_id') then execute 'create index if not exists idx_platform_users_variant_id on app_public.platform_users (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='platform_users' and column_name='campaign_id') then execute 'create index if not exists idx_platform_users_campaign_id on app_public.platform_users (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='platform_users' and column_name='affiliate_account_id') then execute 'create index if not exists idx_platform_users_affiliate_account_id on app_public.platform_users (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='platform_users' and column_name='referral_code') then execute 'create index if not exists idx_platform_users_referral_code on app_public.platform_users (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='platform_users' and column_name='created_at') then execute 'create index if not exists idx_platform_users_created_at on app_public.platform_users (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='user_profiles' and column_name='user_id') then execute 'create index if not exists idx_user_profiles_user_id on app_public.user_profiles (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='user_profiles' and column_name='email') then execute 'create index if not exists idx_user_profiles_email on app_public.user_profiles (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='user_profiles' and column_name='status') then execute 'create index if not exists idx_user_profiles_status on app_public.user_profiles (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='user_profiles' and column_name='event_type') then execute 'create index if not exists idx_user_profiles_event_type on app_public.user_profiles (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='user_profiles' and column_name='source') then execute 'create index if not exists idx_user_profiles_source on app_public.user_profiles (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='user_profiles' and column_name='source_event_id') then execute 'create index if not exists idx_user_profiles_source_event_id on app_public.user_profiles (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='user_profiles' and column_name='checkout_session_id') then execute 'create index if not exists idx_user_profiles_checkout_session_id on app_public.user_profiles (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='user_profiles' and column_name='stripe_event_id') then execute 'create index if not exists idx_user_profiles_stripe_event_id on app_public.user_profiles (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='user_profiles' and column_name='cart_id') then execute 'create index if not exists idx_user_profiles_cart_id on app_public.user_profiles (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='user_profiles' and column_name='order_ref') then execute 'create index if not exists idx_user_profiles_order_ref on app_public.user_profiles (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='user_profiles' and column_name='product_id') then execute 'create index if not exists idx_user_profiles_product_id on app_public.user_profiles (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='user_profiles' and column_name='variant_id') then execute 'create index if not exists idx_user_profiles_variant_id on app_public.user_profiles (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='user_profiles' and column_name='campaign_id') then execute 'create index if not exists idx_user_profiles_campaign_id on app_public.user_profiles (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='user_profiles' and column_name='affiliate_account_id') then execute 'create index if not exists idx_user_profiles_affiliate_account_id on app_public.user_profiles (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='user_profiles' and column_name='referral_code') then execute 'create index if not exists idx_user_profiles_referral_code on app_public.user_profiles (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='user_profiles' and column_name='created_at') then execute 'create index if not exists idx_user_profiles_created_at on app_public.user_profiles (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='first_owner_bootstrap_claims' and column_name='user_id') then execute 'create index if not exists idx_first_owner_bootstrap_claims_user_id on app_public.first_owner_bootstrap_claims (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='first_owner_bootstrap_claims' and column_name='email') then execute 'create index if not exists idx_first_owner_bootstrap_claims_email on app_public.first_owner_bootstrap_claims (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='first_owner_bootstrap_claims' and column_name='status') then execute 'create index if not exists idx_first_owner_bootstrap_claims_status on app_public.first_owner_bootstrap_claims (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='first_owner_bootstrap_claims' and column_name='event_type') then execute 'create index if not exists idx_first_owner_bootstrap_claims_event_type on app_public.first_owner_bootstrap_claims (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='first_owner_bootstrap_claims' and column_name='source') then execute 'create index if not exists idx_first_owner_bootstrap_claims_source on app_public.first_owner_bootstrap_claims (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='first_owner_bootstrap_claims' and column_name='source_event_id') then execute 'create index if not exists idx_first_owner_bootstrap_claims_source_event_id on app_public.first_owner_bootstrap_claims (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='first_owner_bootstrap_claims' and column_name='checkout_session_id') then execute 'create index if not exists idx_first_owner_bootstrap_claims_checkout_session_id on app_public.first_owner_bootstrap_claims (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='first_owner_bootstrap_claims' and column_name='stripe_event_id') then execute 'create index if not exists idx_first_owner_bootstrap_claims_stripe_event_id on app_public.first_owner_bootstrap_claims (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='first_owner_bootstrap_claims' and column_name='cart_id') then execute 'create index if not exists idx_first_owner_bootstrap_claims_cart_id on app_public.first_owner_bootstrap_claims (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='first_owner_bootstrap_claims' and column_name='order_ref') then execute 'create index if not exists idx_first_owner_bootstrap_claims_order_ref on app_public.first_owner_bootstrap_claims (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='first_owner_bootstrap_claims' and column_name='product_id') then execute 'create index if not exists idx_first_owner_bootstrap_claims_product_id on app_public.first_owner_bootstrap_claims (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='first_owner_bootstrap_claims' and column_name='variant_id') then execute 'create index if not exists idx_first_owner_bootstrap_claims_variant_id on app_public.first_owner_bootstrap_claims (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='first_owner_bootstrap_claims' and column_name='campaign_id') then execute 'create index if not exists idx_first_owner_bootstrap_claims_campaign_id on app_public.first_owner_bootstrap_claims (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='first_owner_bootstrap_claims' and column_name='affiliate_account_id') then execute 'create index if not exists idx_first_owner_bootstrap_claims_affiliate_account_id on app_public.first_owner_bootstrap_claims (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='first_owner_bootstrap_claims' and column_name='referral_code') then execute 'create index if not exists idx_first_owner_bootstrap_claims_referral_code on app_public.first_owner_bootstrap_claims (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='first_owner_bootstrap_claims' and column_name='created_at') then execute 'create index if not exists idx_first_owner_bootstrap_claims_created_at on app_public.first_owner_bootstrap_claims (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='owner_reference_codes' and column_name='user_id') then execute 'create index if not exists idx_owner_reference_codes_user_id on app_public.owner_reference_codes (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='owner_reference_codes' and column_name='email') then execute 'create index if not exists idx_owner_reference_codes_email on app_public.owner_reference_codes (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='owner_reference_codes' and column_name='status') then execute 'create index if not exists idx_owner_reference_codes_status on app_public.owner_reference_codes (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='owner_reference_codes' and column_name='event_type') then execute 'create index if not exists idx_owner_reference_codes_event_type on app_public.owner_reference_codes (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='owner_reference_codes' and column_name='source') then execute 'create index if not exists idx_owner_reference_codes_source on app_public.owner_reference_codes (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='owner_reference_codes' and column_name='source_event_id') then execute 'create index if not exists idx_owner_reference_codes_source_event_id on app_public.owner_reference_codes (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='owner_reference_codes' and column_name='checkout_session_id') then execute 'create index if not exists idx_owner_reference_codes_checkout_session_id on app_public.owner_reference_codes (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='owner_reference_codes' and column_name='stripe_event_id') then execute 'create index if not exists idx_owner_reference_codes_stripe_event_id on app_public.owner_reference_codes (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='owner_reference_codes' and column_name='cart_id') then execute 'create index if not exists idx_owner_reference_codes_cart_id on app_public.owner_reference_codes (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='owner_reference_codes' and column_name='order_ref') then execute 'create index if not exists idx_owner_reference_codes_order_ref on app_public.owner_reference_codes (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='owner_reference_codes' and column_name='product_id') then execute 'create index if not exists idx_owner_reference_codes_product_id on app_public.owner_reference_codes (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='owner_reference_codes' and column_name='variant_id') then execute 'create index if not exists idx_owner_reference_codes_variant_id on app_public.owner_reference_codes (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='owner_reference_codes' and column_name='campaign_id') then execute 'create index if not exists idx_owner_reference_codes_campaign_id on app_public.owner_reference_codes (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='owner_reference_codes' and column_name='affiliate_account_id') then execute 'create index if not exists idx_owner_reference_codes_affiliate_account_id on app_public.owner_reference_codes (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='owner_reference_codes' and column_name='referral_code') then execute 'create index if not exists idx_owner_reference_codes_referral_code on app_public.owner_reference_codes (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='owner_reference_codes' and column_name='created_at') then execute 'create index if not exists idx_owner_reference_codes_created_at on app_public.owner_reference_codes (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='referral_codes' and column_name='user_id') then execute 'create index if not exists idx_referral_codes_user_id on app_public.referral_codes (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='referral_codes' and column_name='email') then execute 'create index if not exists idx_referral_codes_email on app_public.referral_codes (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='referral_codes' and column_name='status') then execute 'create index if not exists idx_referral_codes_status on app_public.referral_codes (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='referral_codes' and column_name='event_type') then execute 'create index if not exists idx_referral_codes_event_type on app_public.referral_codes (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='referral_codes' and column_name='source') then execute 'create index if not exists idx_referral_codes_source on app_public.referral_codes (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='referral_codes' and column_name='source_event_id') then execute 'create index if not exists idx_referral_codes_source_event_id on app_public.referral_codes (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='referral_codes' and column_name='checkout_session_id') then execute 'create index if not exists idx_referral_codes_checkout_session_id on app_public.referral_codes (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='referral_codes' and column_name='stripe_event_id') then execute 'create index if not exists idx_referral_codes_stripe_event_id on app_public.referral_codes (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='referral_codes' and column_name='cart_id') then execute 'create index if not exists idx_referral_codes_cart_id on app_public.referral_codes (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='referral_codes' and column_name='order_ref') then execute 'create index if not exists idx_referral_codes_order_ref on app_public.referral_codes (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='referral_codes' and column_name='product_id') then execute 'create index if not exists idx_referral_codes_product_id on app_public.referral_codes (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='referral_codes' and column_name='variant_id') then execute 'create index if not exists idx_referral_codes_variant_id on app_public.referral_codes (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='referral_codes' and column_name='campaign_id') then execute 'create index if not exists idx_referral_codes_campaign_id on app_public.referral_codes (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='referral_codes' and column_name='affiliate_account_id') then execute 'create index if not exists idx_referral_codes_affiliate_account_id on app_public.referral_codes (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='referral_codes' and column_name='referral_code') then execute 'create index if not exists idx_referral_codes_referral_code on app_public.referral_codes (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='referral_codes' and column_name='created_at') then execute 'create index if not exists idx_referral_codes_created_at on app_public.referral_codes (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='invitation_links' and column_name='user_id') then execute 'create index if not exists idx_invitation_links_user_id on app_public.invitation_links (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='invitation_links' and column_name='email') then execute 'create index if not exists idx_invitation_links_email on app_public.invitation_links (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='invitation_links' and column_name='status') then execute 'create index if not exists idx_invitation_links_status on app_public.invitation_links (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='invitation_links' and column_name='event_type') then execute 'create index if not exists idx_invitation_links_event_type on app_public.invitation_links (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='invitation_links' and column_name='source') then execute 'create index if not exists idx_invitation_links_source on app_public.invitation_links (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='invitation_links' and column_name='source_event_id') then execute 'create index if not exists idx_invitation_links_source_event_id on app_public.invitation_links (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='invitation_links' and column_name='checkout_session_id') then execute 'create index if not exists idx_invitation_links_checkout_session_id on app_public.invitation_links (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='invitation_links' and column_name='stripe_event_id') then execute 'create index if not exists idx_invitation_links_stripe_event_id on app_public.invitation_links (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='invitation_links' and column_name='cart_id') then execute 'create index if not exists idx_invitation_links_cart_id on app_public.invitation_links (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='invitation_links' and column_name='order_ref') then execute 'create index if not exists idx_invitation_links_order_ref on app_public.invitation_links (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='invitation_links' and column_name='product_id') then execute 'create index if not exists idx_invitation_links_product_id on app_public.invitation_links (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='invitation_links' and column_name='variant_id') then execute 'create index if not exists idx_invitation_links_variant_id on app_public.invitation_links (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='invitation_links' and column_name='campaign_id') then execute 'create index if not exists idx_invitation_links_campaign_id on app_public.invitation_links (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='invitation_links' and column_name='affiliate_account_id') then execute 'create index if not exists idx_invitation_links_affiliate_account_id on app_public.invitation_links (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='invitation_links' and column_name='referral_code') then execute 'create index if not exists idx_invitation_links_referral_code on app_public.invitation_links (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='invitation_links' and column_name='created_at') then execute 'create index if not exists idx_invitation_links_created_at on app_public.invitation_links (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='initiation_links' and column_name='user_id') then execute 'create index if not exists idx_initiation_links_user_id on app_public.initiation_links (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='initiation_links' and column_name='email') then execute 'create index if not exists idx_initiation_links_email on app_public.initiation_links (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='initiation_links' and column_name='status') then execute 'create index if not exists idx_initiation_links_status on app_public.initiation_links (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='initiation_links' and column_name='event_type') then execute 'create index if not exists idx_initiation_links_event_type on app_public.initiation_links (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='initiation_links' and column_name='source') then execute 'create index if not exists idx_initiation_links_source on app_public.initiation_links (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='initiation_links' and column_name='source_event_id') then execute 'create index if not exists idx_initiation_links_source_event_id on app_public.initiation_links (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='initiation_links' and column_name='checkout_session_id') then execute 'create index if not exists idx_initiation_links_checkout_session_id on app_public.initiation_links (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='initiation_links' and column_name='stripe_event_id') then execute 'create index if not exists idx_initiation_links_stripe_event_id on app_public.initiation_links (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='initiation_links' and column_name='cart_id') then execute 'create index if not exists idx_initiation_links_cart_id on app_public.initiation_links (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='initiation_links' and column_name='order_ref') then execute 'create index if not exists idx_initiation_links_order_ref on app_public.initiation_links (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='initiation_links' and column_name='product_id') then execute 'create index if not exists idx_initiation_links_product_id on app_public.initiation_links (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='initiation_links' and column_name='variant_id') then execute 'create index if not exists idx_initiation_links_variant_id on app_public.initiation_links (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='initiation_links' and column_name='campaign_id') then execute 'create index if not exists idx_initiation_links_campaign_id on app_public.initiation_links (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='initiation_links' and column_name='affiliate_account_id') then execute 'create index if not exists idx_initiation_links_affiliate_account_id on app_public.initiation_links (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='initiation_links' and column_name='referral_code') then execute 'create index if not exists idx_initiation_links_referral_code on app_public.initiation_links (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='initiation_links' and column_name='created_at') then execute 'create index if not exists idx_initiation_links_created_at on app_public.initiation_links (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallets' and column_name='user_id') then execute 'create index if not exists idx_wallets_user_id on app_public.wallets (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallets' and column_name='email') then execute 'create index if not exists idx_wallets_email on app_public.wallets (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallets' and column_name='status') then execute 'create index if not exists idx_wallets_status on app_public.wallets (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallets' and column_name='event_type') then execute 'create index if not exists idx_wallets_event_type on app_public.wallets (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallets' and column_name='source') then execute 'create index if not exists idx_wallets_source on app_public.wallets (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallets' and column_name='source_event_id') then execute 'create index if not exists idx_wallets_source_event_id on app_public.wallets (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallets' and column_name='checkout_session_id') then execute 'create index if not exists idx_wallets_checkout_session_id on app_public.wallets (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallets' and column_name='stripe_event_id') then execute 'create index if not exists idx_wallets_stripe_event_id on app_public.wallets (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallets' and column_name='cart_id') then execute 'create index if not exists idx_wallets_cart_id on app_public.wallets (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallets' and column_name='order_ref') then execute 'create index if not exists idx_wallets_order_ref on app_public.wallets (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallets' and column_name='product_id') then execute 'create index if not exists idx_wallets_product_id on app_public.wallets (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallets' and column_name='variant_id') then execute 'create index if not exists idx_wallets_variant_id on app_public.wallets (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallets' and column_name='campaign_id') then execute 'create index if not exists idx_wallets_campaign_id on app_public.wallets (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallets' and column_name='affiliate_account_id') then execute 'create index if not exists idx_wallets_affiliate_account_id on app_public.wallets (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallets' and column_name='referral_code') then execute 'create index if not exists idx_wallets_referral_code on app_public.wallets (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallets' and column_name='created_at') then execute 'create index if not exists idx_wallets_created_at on app_public.wallets (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_ledger_entries' and column_name='user_id') then execute 'create index if not exists idx_wallet_ledger_entries_user_id on app_public.wallet_ledger_entries (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_ledger_entries' and column_name='email') then execute 'create index if not exists idx_wallet_ledger_entries_email on app_public.wallet_ledger_entries (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_ledger_entries' and column_name='status') then execute 'create index if not exists idx_wallet_ledger_entries_status on app_public.wallet_ledger_entries (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_ledger_entries' and column_name='event_type') then execute 'create index if not exists idx_wallet_ledger_entries_event_type on app_public.wallet_ledger_entries (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_ledger_entries' and column_name='source') then execute 'create index if not exists idx_wallet_ledger_entries_source on app_public.wallet_ledger_entries (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_ledger_entries' and column_name='source_event_id') then execute 'create index if not exists idx_wallet_ledger_entries_source_event_id on app_public.wallet_ledger_entries (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_ledger_entries' and column_name='checkout_session_id') then execute 'create index if not exists idx_wallet_ledger_entries_checkout_session_id on app_public.wallet_ledger_entries (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_ledger_entries' and column_name='stripe_event_id') then execute 'create index if not exists idx_wallet_ledger_entries_stripe_event_id on app_public.wallet_ledger_entries (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_ledger_entries' and column_name='cart_id') then execute 'create index if not exists idx_wallet_ledger_entries_cart_id on app_public.wallet_ledger_entries (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_ledger_entries' and column_name='order_ref') then execute 'create index if not exists idx_wallet_ledger_entries_order_ref on app_public.wallet_ledger_entries (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_ledger_entries' and column_name='product_id') then execute 'create index if not exists idx_wallet_ledger_entries_product_id on app_public.wallet_ledger_entries (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_ledger_entries' and column_name='variant_id') then execute 'create index if not exists idx_wallet_ledger_entries_variant_id on app_public.wallet_ledger_entries (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_ledger_entries' and column_name='campaign_id') then execute 'create index if not exists idx_wallet_ledger_entries_campaign_id on app_public.wallet_ledger_entries (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_ledger_entries' and column_name='affiliate_account_id') then execute 'create index if not exists idx_wallet_ledger_entries_affiliate_account_id on app_public.wallet_ledger_entries (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_ledger_entries' and column_name='referral_code') then execute 'create index if not exists idx_wallet_ledger_entries_referral_code on app_public.wallet_ledger_entries (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_ledger_entries' and column_name='created_at') then execute 'create index if not exists idx_wallet_ledger_entries_created_at on app_public.wallet_ledger_entries (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_holds' and column_name='user_id') then execute 'create index if not exists idx_wallet_holds_user_id on app_public.wallet_holds (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_holds' and column_name='email') then execute 'create index if not exists idx_wallet_holds_email on app_public.wallet_holds (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_holds' and column_name='status') then execute 'create index if not exists idx_wallet_holds_status on app_public.wallet_holds (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_holds' and column_name='event_type') then execute 'create index if not exists idx_wallet_holds_event_type on app_public.wallet_holds (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_holds' and column_name='source') then execute 'create index if not exists idx_wallet_holds_source on app_public.wallet_holds (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_holds' and column_name='source_event_id') then execute 'create index if not exists idx_wallet_holds_source_event_id on app_public.wallet_holds (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_holds' and column_name='checkout_session_id') then execute 'create index if not exists idx_wallet_holds_checkout_session_id on app_public.wallet_holds (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_holds' and column_name='stripe_event_id') then execute 'create index if not exists idx_wallet_holds_stripe_event_id on app_public.wallet_holds (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_holds' and column_name='cart_id') then execute 'create index if not exists idx_wallet_holds_cart_id on app_public.wallet_holds (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_holds' and column_name='order_ref') then execute 'create index if not exists idx_wallet_holds_order_ref on app_public.wallet_holds (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_holds' and column_name='product_id') then execute 'create index if not exists idx_wallet_holds_product_id on app_public.wallet_holds (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_holds' and column_name='variant_id') then execute 'create index if not exists idx_wallet_holds_variant_id on app_public.wallet_holds (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_holds' and column_name='campaign_id') then execute 'create index if not exists idx_wallet_holds_campaign_id on app_public.wallet_holds (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_holds' and column_name='affiliate_account_id') then execute 'create index if not exists idx_wallet_holds_affiliate_account_id on app_public.wallet_holds (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_holds' and column_name='referral_code') then execute 'create index if not exists idx_wallet_holds_referral_code on app_public.wallet_holds (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='wallet_holds' and column_name='created_at') then execute 'create index if not exists idx_wallet_holds_created_at on app_public.wallet_holds (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_events' and column_name='user_id') then execute 'create index if not exists idx_reward_events_user_id on app_public.reward_events (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_events' and column_name='email') then execute 'create index if not exists idx_reward_events_email on app_public.reward_events (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_events' and column_name='status') then execute 'create index if not exists idx_reward_events_status on app_public.reward_events (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_events' and column_name='event_type') then execute 'create index if not exists idx_reward_events_event_type on app_public.reward_events (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_events' and column_name='source') then execute 'create index if not exists idx_reward_events_source on app_public.reward_events (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_events' and column_name='source_event_id') then execute 'create index if not exists idx_reward_events_source_event_id on app_public.reward_events (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_events' and column_name='checkout_session_id') then execute 'create index if not exists idx_reward_events_checkout_session_id on app_public.reward_events (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_events' and column_name='stripe_event_id') then execute 'create index if not exists idx_reward_events_stripe_event_id on app_public.reward_events (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_events' and column_name='cart_id') then execute 'create index if not exists idx_reward_events_cart_id on app_public.reward_events (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_events' and column_name='order_ref') then execute 'create index if not exists idx_reward_events_order_ref on app_public.reward_events (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_events' and column_name='product_id') then execute 'create index if not exists idx_reward_events_product_id on app_public.reward_events (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_events' and column_name='variant_id') then execute 'create index if not exists idx_reward_events_variant_id on app_public.reward_events (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_events' and column_name='campaign_id') then execute 'create index if not exists idx_reward_events_campaign_id on app_public.reward_events (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_events' and column_name='affiliate_account_id') then execute 'create index if not exists idx_reward_events_affiliate_account_id on app_public.reward_events (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_events' and column_name='referral_code') then execute 'create index if not exists idx_reward_events_referral_code on app_public.reward_events (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_events' and column_name='created_at') then execute 'create index if not exists idx_reward_events_created_at on app_public.reward_events (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_balances' and column_name='user_id') then execute 'create index if not exists idx_reward_balances_user_id on app_public.reward_balances (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_balances' and column_name='email') then execute 'create index if not exists idx_reward_balances_email on app_public.reward_balances (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_balances' and column_name='status') then execute 'create index if not exists idx_reward_balances_status on app_public.reward_balances (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_balances' and column_name='event_type') then execute 'create index if not exists idx_reward_balances_event_type on app_public.reward_balances (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_balances' and column_name='source') then execute 'create index if not exists idx_reward_balances_source on app_public.reward_balances (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_balances' and column_name='source_event_id') then execute 'create index if not exists idx_reward_balances_source_event_id on app_public.reward_balances (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_balances' and column_name='checkout_session_id') then execute 'create index if not exists idx_reward_balances_checkout_session_id on app_public.reward_balances (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_balances' and column_name='stripe_event_id') then execute 'create index if not exists idx_reward_balances_stripe_event_id on app_public.reward_balances (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_balances' and column_name='cart_id') then execute 'create index if not exists idx_reward_balances_cart_id on app_public.reward_balances (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_balances' and column_name='order_ref') then execute 'create index if not exists idx_reward_balances_order_ref on app_public.reward_balances (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_balances' and column_name='product_id') then execute 'create index if not exists idx_reward_balances_product_id on app_public.reward_balances (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_balances' and column_name='variant_id') then execute 'create index if not exists idx_reward_balances_variant_id on app_public.reward_balances (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_balances' and column_name='campaign_id') then execute 'create index if not exists idx_reward_balances_campaign_id on app_public.reward_balances (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_balances' and column_name='affiliate_account_id') then execute 'create index if not exists idx_reward_balances_affiliate_account_id on app_public.reward_balances (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_balances' and column_name='referral_code') then execute 'create index if not exists idx_reward_balances_referral_code on app_public.reward_balances (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='reward_balances' and column_name='created_at') then execute 'create index if not exists idx_reward_balances_created_at on app_public.reward_balances (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_accounts' and column_name='user_id') then execute 'create index if not exists idx_affiliate_accounts_user_id on app_public.affiliate_accounts (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_accounts' and column_name='email') then execute 'create index if not exists idx_affiliate_accounts_email on app_public.affiliate_accounts (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_accounts' and column_name='status') then execute 'create index if not exists idx_affiliate_accounts_status on app_public.affiliate_accounts (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_accounts' and column_name='event_type') then execute 'create index if not exists idx_affiliate_accounts_event_type on app_public.affiliate_accounts (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_accounts' and column_name='source') then execute 'create index if not exists idx_affiliate_accounts_source on app_public.affiliate_accounts (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_accounts' and column_name='source_event_id') then execute 'create index if not exists idx_affiliate_accounts_source_event_id on app_public.affiliate_accounts (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_accounts' and column_name='checkout_session_id') then execute 'create index if not exists idx_affiliate_accounts_checkout_session_id on app_public.affiliate_accounts (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_accounts' and column_name='stripe_event_id') then execute 'create index if not exists idx_affiliate_accounts_stripe_event_id on app_public.affiliate_accounts (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_accounts' and column_name='cart_id') then execute 'create index if not exists idx_affiliate_accounts_cart_id on app_public.affiliate_accounts (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_accounts' and column_name='order_ref') then execute 'create index if not exists idx_affiliate_accounts_order_ref on app_public.affiliate_accounts (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_accounts' and column_name='product_id') then execute 'create index if not exists idx_affiliate_accounts_product_id on app_public.affiliate_accounts (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_accounts' and column_name='variant_id') then execute 'create index if not exists idx_affiliate_accounts_variant_id on app_public.affiliate_accounts (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_accounts' and column_name='campaign_id') then execute 'create index if not exists idx_affiliate_accounts_campaign_id on app_public.affiliate_accounts (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_accounts' and column_name='affiliate_account_id') then execute 'create index if not exists idx_affiliate_accounts_affiliate_account_id on app_public.affiliate_accounts (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_accounts' and column_name='referral_code') then execute 'create index if not exists idx_affiliate_accounts_referral_code on app_public.affiliate_accounts (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_accounts' and column_name='created_at') then execute 'create index if not exists idx_affiliate_accounts_created_at on app_public.affiliate_accounts (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_clicks' and column_name='user_id') then execute 'create index if not exists idx_affiliate_clicks_user_id on app_public.affiliate_clicks (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_clicks' and column_name='email') then execute 'create index if not exists idx_affiliate_clicks_email on app_public.affiliate_clicks (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_clicks' and column_name='status') then execute 'create index if not exists idx_affiliate_clicks_status on app_public.affiliate_clicks (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_clicks' and column_name='event_type') then execute 'create index if not exists idx_affiliate_clicks_event_type on app_public.affiliate_clicks (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_clicks' and column_name='source') then execute 'create index if not exists idx_affiliate_clicks_source on app_public.affiliate_clicks (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_clicks' and column_name='source_event_id') then execute 'create index if not exists idx_affiliate_clicks_source_event_id on app_public.affiliate_clicks (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_clicks' and column_name='checkout_session_id') then execute 'create index if not exists idx_affiliate_clicks_checkout_session_id on app_public.affiliate_clicks (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_clicks' and column_name='stripe_event_id') then execute 'create index if not exists idx_affiliate_clicks_stripe_event_id on app_public.affiliate_clicks (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_clicks' and column_name='cart_id') then execute 'create index if not exists idx_affiliate_clicks_cart_id on app_public.affiliate_clicks (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_clicks' and column_name='order_ref') then execute 'create index if not exists idx_affiliate_clicks_order_ref on app_public.affiliate_clicks (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_clicks' and column_name='product_id') then execute 'create index if not exists idx_affiliate_clicks_product_id on app_public.affiliate_clicks (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_clicks' and column_name='variant_id') then execute 'create index if not exists idx_affiliate_clicks_variant_id on app_public.affiliate_clicks (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_clicks' and column_name='campaign_id') then execute 'create index if not exists idx_affiliate_clicks_campaign_id on app_public.affiliate_clicks (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_clicks' and column_name='affiliate_account_id') then execute 'create index if not exists idx_affiliate_clicks_affiliate_account_id on app_public.affiliate_clicks (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_clicks' and column_name='referral_code') then execute 'create index if not exists idx_affiliate_clicks_referral_code on app_public.affiliate_clicks (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_clicks' and column_name='created_at') then execute 'create index if not exists idx_affiliate_clicks_created_at on app_public.affiliate_clicks (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_conversions' and column_name='user_id') then execute 'create index if not exists idx_affiliate_conversions_user_id on app_public.affiliate_conversions (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_conversions' and column_name='email') then execute 'create index if not exists idx_affiliate_conversions_email on app_public.affiliate_conversions (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_conversions' and column_name='status') then execute 'create index if not exists idx_affiliate_conversions_status on app_public.affiliate_conversions (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_conversions' and column_name='event_type') then execute 'create index if not exists idx_affiliate_conversions_event_type on app_public.affiliate_conversions (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_conversions' and column_name='source') then execute 'create index if not exists idx_affiliate_conversions_source on app_public.affiliate_conversions (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_conversions' and column_name='source_event_id') then execute 'create index if not exists idx_affiliate_conversions_source_event_id on app_public.affiliate_conversions (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_conversions' and column_name='checkout_session_id') then execute 'create index if not exists idx_affiliate_conversions_checkout_session_id on app_public.affiliate_conversions (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_conversions' and column_name='stripe_event_id') then execute 'create index if not exists idx_affiliate_conversions_stripe_event_id on app_public.affiliate_conversions (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_conversions' and column_name='cart_id') then execute 'create index if not exists idx_affiliate_conversions_cart_id on app_public.affiliate_conversions (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_conversions' and column_name='order_ref') then execute 'create index if not exists idx_affiliate_conversions_order_ref on app_public.affiliate_conversions (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_conversions' and column_name='product_id') then execute 'create index if not exists idx_affiliate_conversions_product_id on app_public.affiliate_conversions (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_conversions' and column_name='variant_id') then execute 'create index if not exists idx_affiliate_conversions_variant_id on app_public.affiliate_conversions (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_conversions' and column_name='campaign_id') then execute 'create index if not exists idx_affiliate_conversions_campaign_id on app_public.affiliate_conversions (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_conversions' and column_name='affiliate_account_id') then execute 'create index if not exists idx_affiliate_conversions_affiliate_account_id on app_public.affiliate_conversions (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_conversions' and column_name='referral_code') then execute 'create index if not exists idx_affiliate_conversions_referral_code on app_public.affiliate_conversions (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_conversions' and column_name='created_at') then execute 'create index if not exists idx_affiliate_conversions_created_at on app_public.affiliate_conversions (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_commissions' and column_name='user_id') then execute 'create index if not exists idx_affiliate_commissions_user_id on app_public.affiliate_commissions (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_commissions' and column_name='email') then execute 'create index if not exists idx_affiliate_commissions_email on app_public.affiliate_commissions (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_commissions' and column_name='status') then execute 'create index if not exists idx_affiliate_commissions_status on app_public.affiliate_commissions (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_commissions' and column_name='event_type') then execute 'create index if not exists idx_affiliate_commissions_event_type on app_public.affiliate_commissions (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_commissions' and column_name='source') then execute 'create index if not exists idx_affiliate_commissions_source on app_public.affiliate_commissions (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_commissions' and column_name='source_event_id') then execute 'create index if not exists idx_affiliate_commissions_source_event_id on app_public.affiliate_commissions (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_commissions' and column_name='checkout_session_id') then execute 'create index if not exists idx_affiliate_commissions_checkout_session_id on app_public.affiliate_commissions (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_commissions' and column_name='stripe_event_id') then execute 'create index if not exists idx_affiliate_commissions_stripe_event_id on app_public.affiliate_commissions (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_commissions' and column_name='cart_id') then execute 'create index if not exists idx_affiliate_commissions_cart_id on app_public.affiliate_commissions (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_commissions' and column_name='order_ref') then execute 'create index if not exists idx_affiliate_commissions_order_ref on app_public.affiliate_commissions (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_commissions' and column_name='product_id') then execute 'create index if not exists idx_affiliate_commissions_product_id on app_public.affiliate_commissions (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_commissions' and column_name='variant_id') then execute 'create index if not exists idx_affiliate_commissions_variant_id on app_public.affiliate_commissions (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_commissions' and column_name='campaign_id') then execute 'create index if not exists idx_affiliate_commissions_campaign_id on app_public.affiliate_commissions (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_commissions' and column_name='affiliate_account_id') then execute 'create index if not exists idx_affiliate_commissions_affiliate_account_id on app_public.affiliate_commissions (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_commissions' and column_name='referral_code') then execute 'create index if not exists idx_affiliate_commissions_referral_code on app_public.affiliate_commissions (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_commissions' and column_name='created_at') then execute 'create index if not exists idx_affiliate_commissions_created_at on app_public.affiliate_commissions (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payout_requests' and column_name='user_id') then execute 'create index if not exists idx_affiliate_payout_requests_user_id on app_public.affiliate_payout_requests (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payout_requests' and column_name='email') then execute 'create index if not exists idx_affiliate_payout_requests_email on app_public.affiliate_payout_requests (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payout_requests' and column_name='status') then execute 'create index if not exists idx_affiliate_payout_requests_status on app_public.affiliate_payout_requests (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payout_requests' and column_name='event_type') then execute 'create index if not exists idx_affiliate_payout_requests_event_type on app_public.affiliate_payout_requests (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payout_requests' and column_name='source') then execute 'create index if not exists idx_affiliate_payout_requests_source on app_public.affiliate_payout_requests (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payout_requests' and column_name='source_event_id') then execute 'create index if not exists idx_affiliate_payout_requests_source_event_id on app_public.affiliate_payout_requests (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payout_requests' and column_name='checkout_session_id') then execute 'create index if not exists idx_affiliate_payout_requests_checkout_session_id on app_public.affiliate_payout_requests (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payout_requests' and column_name='stripe_event_id') then execute 'create index if not exists idx_affiliate_payout_requests_stripe_event_id on app_public.affiliate_payout_requests (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payout_requests' and column_name='cart_id') then execute 'create index if not exists idx_affiliate_payout_requests_cart_id on app_public.affiliate_payout_requests (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payout_requests' and column_name='order_ref') then execute 'create index if not exists idx_affiliate_payout_requests_order_ref on app_public.affiliate_payout_requests (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payout_requests' and column_name='product_id') then execute 'create index if not exists idx_affiliate_payout_requests_product_id on app_public.affiliate_payout_requests (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payout_requests' and column_name='variant_id') then execute 'create index if not exists idx_affiliate_payout_requests_variant_id on app_public.affiliate_payout_requests (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payout_requests' and column_name='campaign_id') then execute 'create index if not exists idx_affiliate_payout_requests_campaign_id on app_public.affiliate_payout_requests (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payout_requests' and column_name='affiliate_account_id') then execute 'create index if not exists idx_affiliate_payout_requests_affiliate_account_id on app_public.affiliate_payout_requests (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payout_requests' and column_name='referral_code') then execute 'create index if not exists idx_affiliate_payout_requests_referral_code on app_public.affiliate_payout_requests (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payout_requests' and column_name='created_at') then execute 'create index if not exists idx_affiliate_payout_requests_created_at on app_public.affiliate_payout_requests (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payouts' and column_name='user_id') then execute 'create index if not exists idx_affiliate_payouts_user_id on app_public.affiliate_payouts (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payouts' and column_name='email') then execute 'create index if not exists idx_affiliate_payouts_email on app_public.affiliate_payouts (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payouts' and column_name='status') then execute 'create index if not exists idx_affiliate_payouts_status on app_public.affiliate_payouts (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payouts' and column_name='event_type') then execute 'create index if not exists idx_affiliate_payouts_event_type on app_public.affiliate_payouts (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payouts' and column_name='source') then execute 'create index if not exists idx_affiliate_payouts_source on app_public.affiliate_payouts (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payouts' and column_name='source_event_id') then execute 'create index if not exists idx_affiliate_payouts_source_event_id on app_public.affiliate_payouts (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payouts' and column_name='checkout_session_id') then execute 'create index if not exists idx_affiliate_payouts_checkout_session_id on app_public.affiliate_payouts (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payouts' and column_name='stripe_event_id') then execute 'create index if not exists idx_affiliate_payouts_stripe_event_id on app_public.affiliate_payouts (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payouts' and column_name='cart_id') then execute 'create index if not exists idx_affiliate_payouts_cart_id on app_public.affiliate_payouts (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payouts' and column_name='order_ref') then execute 'create index if not exists idx_affiliate_payouts_order_ref on app_public.affiliate_payouts (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payouts' and column_name='product_id') then execute 'create index if not exists idx_affiliate_payouts_product_id on app_public.affiliate_payouts (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payouts' and column_name='variant_id') then execute 'create index if not exists idx_affiliate_payouts_variant_id on app_public.affiliate_payouts (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payouts' and column_name='campaign_id') then execute 'create index if not exists idx_affiliate_payouts_campaign_id on app_public.affiliate_payouts (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payouts' and column_name='affiliate_account_id') then execute 'create index if not exists idx_affiliate_payouts_affiliate_account_id on app_public.affiliate_payouts (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payouts' and column_name='referral_code') then execute 'create index if not exists idx_affiliate_payouts_referral_code on app_public.affiliate_payouts (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='affiliate_payouts' and column_name='created_at') then execute 'create index if not exists idx_affiliate_payouts_created_at on app_public.affiliate_payouts (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='stripe_webhook_events' and column_name='user_id') then execute 'create index if not exists idx_stripe_webhook_events_user_id on app_public.stripe_webhook_events (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='stripe_webhook_events' and column_name='email') then execute 'create index if not exists idx_stripe_webhook_events_email on app_public.stripe_webhook_events (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='stripe_webhook_events' and column_name='status') then execute 'create index if not exists idx_stripe_webhook_events_status on app_public.stripe_webhook_events (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='stripe_webhook_events' and column_name='event_type') then execute 'create index if not exists idx_stripe_webhook_events_event_type on app_public.stripe_webhook_events (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='stripe_webhook_events' and column_name='source') then execute 'create index if not exists idx_stripe_webhook_events_source on app_public.stripe_webhook_events (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='stripe_webhook_events' and column_name='source_event_id') then execute 'create index if not exists idx_stripe_webhook_events_source_event_id on app_public.stripe_webhook_events (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='stripe_webhook_events' and column_name='checkout_session_id') then execute 'create index if not exists idx_stripe_webhook_events_checkout_session_id on app_public.stripe_webhook_events (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='stripe_webhook_events' and column_name='stripe_event_id') then execute 'create index if not exists idx_stripe_webhook_events_stripe_event_id on app_public.stripe_webhook_events (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='stripe_webhook_events' and column_name='cart_id') then execute 'create index if not exists idx_stripe_webhook_events_cart_id on app_public.stripe_webhook_events (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='stripe_webhook_events' and column_name='order_ref') then execute 'create index if not exists idx_stripe_webhook_events_order_ref on app_public.stripe_webhook_events (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='stripe_webhook_events' and column_name='product_id') then execute 'create index if not exists idx_stripe_webhook_events_product_id on app_public.stripe_webhook_events (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='stripe_webhook_events' and column_name='variant_id') then execute 'create index if not exists idx_stripe_webhook_events_variant_id on app_public.stripe_webhook_events (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='stripe_webhook_events' and column_name='campaign_id') then execute 'create index if not exists idx_stripe_webhook_events_campaign_id on app_public.stripe_webhook_events (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='stripe_webhook_events' and column_name='affiliate_account_id') then execute 'create index if not exists idx_stripe_webhook_events_affiliate_account_id on app_public.stripe_webhook_events (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='stripe_webhook_events' and column_name='referral_code') then execute 'create index if not exists idx_stripe_webhook_events_referral_code on app_public.stripe_webhook_events (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='stripe_webhook_events' and column_name='created_at') then execute 'create index if not exists idx_stripe_webhook_events_created_at on app_public.stripe_webhook_events (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payment_records' and column_name='user_id') then execute 'create index if not exists idx_payment_records_user_id on app_public.payment_records (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payment_records' and column_name='email') then execute 'create index if not exists idx_payment_records_email on app_public.payment_records (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payment_records' and column_name='status') then execute 'create index if not exists idx_payment_records_status on app_public.payment_records (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payment_records' and column_name='event_type') then execute 'create index if not exists idx_payment_records_event_type on app_public.payment_records (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payment_records' and column_name='source') then execute 'create index if not exists idx_payment_records_source on app_public.payment_records (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payment_records' and column_name='source_event_id') then execute 'create index if not exists idx_payment_records_source_event_id on app_public.payment_records (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payment_records' and column_name='checkout_session_id') then execute 'create index if not exists idx_payment_records_checkout_session_id on app_public.payment_records (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payment_records' and column_name='stripe_event_id') then execute 'create index if not exists idx_payment_records_stripe_event_id on app_public.payment_records (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payment_records' and column_name='cart_id') then execute 'create index if not exists idx_payment_records_cart_id on app_public.payment_records (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payment_records' and column_name='order_ref') then execute 'create index if not exists idx_payment_records_order_ref on app_public.payment_records (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payment_records' and column_name='product_id') then execute 'create index if not exists idx_payment_records_product_id on app_public.payment_records (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payment_records' and column_name='variant_id') then execute 'create index if not exists idx_payment_records_variant_id on app_public.payment_records (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payment_records' and column_name='campaign_id') then execute 'create index if not exists idx_payment_records_campaign_id on app_public.payment_records (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payment_records' and column_name='affiliate_account_id') then execute 'create index if not exists idx_payment_records_affiliate_account_id on app_public.payment_records (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payment_records' and column_name='referral_code') then execute 'create index if not exists idx_payment_records_referral_code on app_public.payment_records (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payment_records' and column_name='created_at') then execute 'create index if not exists idx_payment_records_created_at on app_public.payment_records (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_payment_sessions' and column_name='user_id') then execute 'create index if not exists idx_checkout_payment_sessions_user_id on app_public.checkout_payment_sessions (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_payment_sessions' and column_name='email') then execute 'create index if not exists idx_checkout_payment_sessions_email on app_public.checkout_payment_sessions (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_payment_sessions' and column_name='status') then execute 'create index if not exists idx_checkout_payment_sessions_status on app_public.checkout_payment_sessions (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_payment_sessions' and column_name='event_type') then execute 'create index if not exists idx_checkout_payment_sessions_event_type on app_public.checkout_payment_sessions (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_payment_sessions' and column_name='source') then execute 'create index if not exists idx_checkout_payment_sessions_source on app_public.checkout_payment_sessions (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_payment_sessions' and column_name='source_event_id') then execute 'create index if not exists idx_checkout_payment_sessions_source_event_id on app_public.checkout_payment_sessions (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_payment_sessions' and column_name='checkout_session_id') then execute 'create index if not exists idx_checkout_payment_sessions_checkout_session_id on app_public.checkout_payment_sessions (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_payment_sessions' and column_name='stripe_event_id') then execute 'create index if not exists idx_checkout_payment_sessions_stripe_event_id on app_public.checkout_payment_sessions (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_payment_sessions' and column_name='cart_id') then execute 'create index if not exists idx_checkout_payment_sessions_cart_id on app_public.checkout_payment_sessions (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_payment_sessions' and column_name='order_ref') then execute 'create index if not exists idx_checkout_payment_sessions_order_ref on app_public.checkout_payment_sessions (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_payment_sessions' and column_name='product_id') then execute 'create index if not exists idx_checkout_payment_sessions_product_id on app_public.checkout_payment_sessions (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_payment_sessions' and column_name='variant_id') then execute 'create index if not exists idx_checkout_payment_sessions_variant_id on app_public.checkout_payment_sessions (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_payment_sessions' and column_name='campaign_id') then execute 'create index if not exists idx_checkout_payment_sessions_campaign_id on app_public.checkout_payment_sessions (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_payment_sessions' and column_name='affiliate_account_id') then execute 'create index if not exists idx_checkout_payment_sessions_affiliate_account_id on app_public.checkout_payment_sessions (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_payment_sessions' and column_name='referral_code') then execute 'create index if not exists idx_checkout_payment_sessions_referral_code on app_public.checkout_payment_sessions (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_payment_sessions' and column_name='created_at') then execute 'create index if not exists idx_checkout_payment_sessions_created_at on app_public.checkout_payment_sessions (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_events' and column_name='user_id') then execute 'create index if not exists idx_economic_events_user_id on app_public.economic_events (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_events' and column_name='email') then execute 'create index if not exists idx_economic_events_email on app_public.economic_events (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_events' and column_name='status') then execute 'create index if not exists idx_economic_events_status on app_public.economic_events (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_events' and column_name='event_type') then execute 'create index if not exists idx_economic_events_event_type on app_public.economic_events (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_events' and column_name='source') then execute 'create index if not exists idx_economic_events_source on app_public.economic_events (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_events' and column_name='source_event_id') then execute 'create index if not exists idx_economic_events_source_event_id on app_public.economic_events (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_events' and column_name='checkout_session_id') then execute 'create index if not exists idx_economic_events_checkout_session_id on app_public.economic_events (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_events' and column_name='stripe_event_id') then execute 'create index if not exists idx_economic_events_stripe_event_id on app_public.economic_events (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_events' and column_name='cart_id') then execute 'create index if not exists idx_economic_events_cart_id on app_public.economic_events (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_events' and column_name='order_ref') then execute 'create index if not exists idx_economic_events_order_ref on app_public.economic_events (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_events' and column_name='product_id') then execute 'create index if not exists idx_economic_events_product_id on app_public.economic_events (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_events' and column_name='variant_id') then execute 'create index if not exists idx_economic_events_variant_id on app_public.economic_events (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_events' and column_name='campaign_id') then execute 'create index if not exists idx_economic_events_campaign_id on app_public.economic_events (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_events' and column_name='affiliate_account_id') then execute 'create index if not exists idx_economic_events_affiliate_account_id on app_public.economic_events (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_events' and column_name='referral_code') then execute 'create index if not exists idx_economic_events_referral_code on app_public.economic_events (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_events' and column_name='created_at') then execute 'create index if not exists idx_economic_events_created_at on app_public.economic_events (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_event_outbox' and column_name='user_id') then execute 'create index if not exists idx_economic_event_outbox_user_id on app_public.economic_event_outbox (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_event_outbox' and column_name='email') then execute 'create index if not exists idx_economic_event_outbox_email on app_public.economic_event_outbox (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_event_outbox' and column_name='status') then execute 'create index if not exists idx_economic_event_outbox_status on app_public.economic_event_outbox (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_event_outbox' and column_name='event_type') then execute 'create index if not exists idx_economic_event_outbox_event_type on app_public.economic_event_outbox (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_event_outbox' and column_name='source') then execute 'create index if not exists idx_economic_event_outbox_source on app_public.economic_event_outbox (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_event_outbox' and column_name='source_event_id') then execute 'create index if not exists idx_economic_event_outbox_source_event_id on app_public.economic_event_outbox (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_event_outbox' and column_name='checkout_session_id') then execute 'create index if not exists idx_economic_event_outbox_checkout_session_id on app_public.economic_event_outbox (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_event_outbox' and column_name='stripe_event_id') then execute 'create index if not exists idx_economic_event_outbox_stripe_event_id on app_public.economic_event_outbox (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_event_outbox' and column_name='cart_id') then execute 'create index if not exists idx_economic_event_outbox_cart_id on app_public.economic_event_outbox (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_event_outbox' and column_name='order_ref') then execute 'create index if not exists idx_economic_event_outbox_order_ref on app_public.economic_event_outbox (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_event_outbox' and column_name='product_id') then execute 'create index if not exists idx_economic_event_outbox_product_id on app_public.economic_event_outbox (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_event_outbox' and column_name='variant_id') then execute 'create index if not exists idx_economic_event_outbox_variant_id on app_public.economic_event_outbox (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_event_outbox' and column_name='campaign_id') then execute 'create index if not exists idx_economic_event_outbox_campaign_id on app_public.economic_event_outbox (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_event_outbox' and column_name='affiliate_account_id') then execute 'create index if not exists idx_economic_event_outbox_affiliate_account_id on app_public.economic_event_outbox (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_event_outbox' and column_name='referral_code') then execute 'create index if not exists idx_economic_event_outbox_referral_code on app_public.economic_event_outbox (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='economic_event_outbox' and column_name='created_at') then execute 'create index if not exists idx_economic_event_outbox_created_at on app_public.economic_event_outbox (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='settlement_runs' and column_name='user_id') then execute 'create index if not exists idx_settlement_runs_user_id on app_public.settlement_runs (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='settlement_runs' and column_name='email') then execute 'create index if not exists idx_settlement_runs_email on app_public.settlement_runs (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='settlement_runs' and column_name='status') then execute 'create index if not exists idx_settlement_runs_status on app_public.settlement_runs (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='settlement_runs' and column_name='event_type') then execute 'create index if not exists idx_settlement_runs_event_type on app_public.settlement_runs (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='settlement_runs' and column_name='source') then execute 'create index if not exists idx_settlement_runs_source on app_public.settlement_runs (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='settlement_runs' and column_name='source_event_id') then execute 'create index if not exists idx_settlement_runs_source_event_id on app_public.settlement_runs (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='settlement_runs' and column_name='checkout_session_id') then execute 'create index if not exists idx_settlement_runs_checkout_session_id on app_public.settlement_runs (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='settlement_runs' and column_name='stripe_event_id') then execute 'create index if not exists idx_settlement_runs_stripe_event_id on app_public.settlement_runs (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='settlement_runs' and column_name='cart_id') then execute 'create index if not exists idx_settlement_runs_cart_id on app_public.settlement_runs (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='settlement_runs' and column_name='order_ref') then execute 'create index if not exists idx_settlement_runs_order_ref on app_public.settlement_runs (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='settlement_runs' and column_name='product_id') then execute 'create index if not exists idx_settlement_runs_product_id on app_public.settlement_runs (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='settlement_runs' and column_name='variant_id') then execute 'create index if not exists idx_settlement_runs_variant_id on app_public.settlement_runs (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='settlement_runs' and column_name='campaign_id') then execute 'create index if not exists idx_settlement_runs_campaign_id on app_public.settlement_runs (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='settlement_runs' and column_name='affiliate_account_id') then execute 'create index if not exists idx_settlement_runs_affiliate_account_id on app_public.settlement_runs (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='settlement_runs' and column_name='referral_code') then execute 'create index if not exists idx_settlement_runs_referral_code on app_public.settlement_runs (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='settlement_runs' and column_name='created_at') then execute 'create index if not exists idx_settlement_runs_created_at on app_public.settlement_runs (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='idempotency_keys' and column_name='user_id') then execute 'create index if not exists idx_idempotency_keys_user_id on app_public.idempotency_keys (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='idempotency_keys' and column_name='email') then execute 'create index if not exists idx_idempotency_keys_email on app_public.idempotency_keys (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='idempotency_keys' and column_name='status') then execute 'create index if not exists idx_idempotency_keys_status on app_public.idempotency_keys (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='idempotency_keys' and column_name='event_type') then execute 'create index if not exists idx_idempotency_keys_event_type on app_public.idempotency_keys (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='idempotency_keys' and column_name='source') then execute 'create index if not exists idx_idempotency_keys_source on app_public.idempotency_keys (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='idempotency_keys' and column_name='source_event_id') then execute 'create index if not exists idx_idempotency_keys_source_event_id on app_public.idempotency_keys (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='idempotency_keys' and column_name='checkout_session_id') then execute 'create index if not exists idx_idempotency_keys_checkout_session_id on app_public.idempotency_keys (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='idempotency_keys' and column_name='stripe_event_id') then execute 'create index if not exists idx_idempotency_keys_stripe_event_id on app_public.idempotency_keys (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='idempotency_keys' and column_name='cart_id') then execute 'create index if not exists idx_idempotency_keys_cart_id on app_public.idempotency_keys (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='idempotency_keys' and column_name='order_ref') then execute 'create index if not exists idx_idempotency_keys_order_ref on app_public.idempotency_keys (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='idempotency_keys' and column_name='product_id') then execute 'create index if not exists idx_idempotency_keys_product_id on app_public.idempotency_keys (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='idempotency_keys' and column_name='variant_id') then execute 'create index if not exists idx_idempotency_keys_variant_id on app_public.idempotency_keys (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='idempotency_keys' and column_name='campaign_id') then execute 'create index if not exists idx_idempotency_keys_campaign_id on app_public.idempotency_keys (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='idempotency_keys' and column_name='affiliate_account_id') then execute 'create index if not exists idx_idempotency_keys_affiliate_account_id on app_public.idempotency_keys (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='idempotency_keys' and column_name='referral_code') then execute 'create index if not exists idx_idempotency_keys_referral_code on app_public.idempotency_keys (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='idempotency_keys' and column_name='created_at') then execute 'create index if not exists idx_idempotency_keys_created_at on app_public.idempotency_keys (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_refs' and column_name='user_id') then execute 'create index if not exists idx_commerce_order_refs_user_id on app_public.commerce_order_refs (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_refs' and column_name='email') then execute 'create index if not exists idx_commerce_order_refs_email on app_public.commerce_order_refs (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_refs' and column_name='status') then execute 'create index if not exists idx_commerce_order_refs_status on app_public.commerce_order_refs (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_refs' and column_name='event_type') then execute 'create index if not exists idx_commerce_order_refs_event_type on app_public.commerce_order_refs (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_refs' and column_name='source') then execute 'create index if not exists idx_commerce_order_refs_source on app_public.commerce_order_refs (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_refs' and column_name='source_event_id') then execute 'create index if not exists idx_commerce_order_refs_source_event_id on app_public.commerce_order_refs (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_refs' and column_name='checkout_session_id') then execute 'create index if not exists idx_commerce_order_refs_checkout_session_id on app_public.commerce_order_refs (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_refs' and column_name='stripe_event_id') then execute 'create index if not exists idx_commerce_order_refs_stripe_event_id on app_public.commerce_order_refs (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_refs' and column_name='cart_id') then execute 'create index if not exists idx_commerce_order_refs_cart_id on app_public.commerce_order_refs (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_refs' and column_name='order_ref') then execute 'create index if not exists idx_commerce_order_refs_order_ref on app_public.commerce_order_refs (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_refs' and column_name='product_id') then execute 'create index if not exists idx_commerce_order_refs_product_id on app_public.commerce_order_refs (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_refs' and column_name='variant_id') then execute 'create index if not exists idx_commerce_order_refs_variant_id on app_public.commerce_order_refs (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_refs' and column_name='campaign_id') then execute 'create index if not exists idx_commerce_order_refs_campaign_id on app_public.commerce_order_refs (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_refs' and column_name='affiliate_account_id') then execute 'create index if not exists idx_commerce_order_refs_affiliate_account_id on app_public.commerce_order_refs (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_refs' and column_name='referral_code') then execute 'create index if not exists idx_commerce_order_refs_referral_code on app_public.commerce_order_refs (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_refs' and column_name='created_at') then execute 'create index if not exists idx_commerce_order_refs_created_at on app_public.commerce_order_refs (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_sync_jobs' and column_name='user_id') then execute 'create index if not exists idx_medusa_order_sync_jobs_user_id on app_public.medusa_order_sync_jobs (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_sync_jobs' and column_name='email') then execute 'create index if not exists idx_medusa_order_sync_jobs_email on app_public.medusa_order_sync_jobs (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_sync_jobs' and column_name='status') then execute 'create index if not exists idx_medusa_order_sync_jobs_status on app_public.medusa_order_sync_jobs (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_sync_jobs' and column_name='event_type') then execute 'create index if not exists idx_medusa_order_sync_jobs_event_type on app_public.medusa_order_sync_jobs (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_sync_jobs' and column_name='source') then execute 'create index if not exists idx_medusa_order_sync_jobs_source on app_public.medusa_order_sync_jobs (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_sync_jobs' and column_name='source_event_id') then execute 'create index if not exists idx_medusa_order_sync_jobs_source_event_id on app_public.medusa_order_sync_jobs (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_sync_jobs' and column_name='checkout_session_id') then execute 'create index if not exists idx_medusa_order_sync_jobs_checkout_session_id on app_public.medusa_order_sync_jobs (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_sync_jobs' and column_name='stripe_event_id') then execute 'create index if not exists idx_medusa_order_sync_jobs_stripe_event_id on app_public.medusa_order_sync_jobs (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_sync_jobs' and column_name='cart_id') then execute 'create index if not exists idx_medusa_order_sync_jobs_cart_id on app_public.medusa_order_sync_jobs (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_sync_jobs' and column_name='order_ref') then execute 'create index if not exists idx_medusa_order_sync_jobs_order_ref on app_public.medusa_order_sync_jobs (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_sync_jobs' and column_name='product_id') then execute 'create index if not exists idx_medusa_order_sync_jobs_product_id on app_public.medusa_order_sync_jobs (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_sync_jobs' and column_name='variant_id') then execute 'create index if not exists idx_medusa_order_sync_jobs_variant_id on app_public.medusa_order_sync_jobs (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_sync_jobs' and column_name='campaign_id') then execute 'create index if not exists idx_medusa_order_sync_jobs_campaign_id on app_public.medusa_order_sync_jobs (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_sync_jobs' and column_name='affiliate_account_id') then execute 'create index if not exists idx_medusa_order_sync_jobs_affiliate_account_id on app_public.medusa_order_sync_jobs (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_sync_jobs' and column_name='referral_code') then execute 'create index if not exists idx_medusa_order_sync_jobs_referral_code on app_public.medusa_order_sync_jobs (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_sync_jobs' and column_name='created_at') then execute 'create index if not exists idx_medusa_order_sync_jobs_created_at on app_public.medusa_order_sync_jobs (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_events' and column_name='user_id') then execute 'create index if not exists idx_medusa_order_events_user_id on app_public.medusa_order_events (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_events' and column_name='email') then execute 'create index if not exists idx_medusa_order_events_email on app_public.medusa_order_events (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_events' and column_name='status') then execute 'create index if not exists idx_medusa_order_events_status on app_public.medusa_order_events (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_events' and column_name='event_type') then execute 'create index if not exists idx_medusa_order_events_event_type on app_public.medusa_order_events (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_events' and column_name='source') then execute 'create index if not exists idx_medusa_order_events_source on app_public.medusa_order_events (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_events' and column_name='source_event_id') then execute 'create index if not exists idx_medusa_order_events_source_event_id on app_public.medusa_order_events (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_events' and column_name='checkout_session_id') then execute 'create index if not exists idx_medusa_order_events_checkout_session_id on app_public.medusa_order_events (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_events' and column_name='stripe_event_id') then execute 'create index if not exists idx_medusa_order_events_stripe_event_id on app_public.medusa_order_events (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_events' and column_name='cart_id') then execute 'create index if not exists idx_medusa_order_events_cart_id on app_public.medusa_order_events (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_events' and column_name='order_ref') then execute 'create index if not exists idx_medusa_order_events_order_ref on app_public.medusa_order_events (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_events' and column_name='product_id') then execute 'create index if not exists idx_medusa_order_events_product_id on app_public.medusa_order_events (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_events' and column_name='variant_id') then execute 'create index if not exists idx_medusa_order_events_variant_id on app_public.medusa_order_events (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_events' and column_name='campaign_id') then execute 'create index if not exists idx_medusa_order_events_campaign_id on app_public.medusa_order_events (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_events' and column_name='affiliate_account_id') then execute 'create index if not exists idx_medusa_order_events_affiliate_account_id on app_public.medusa_order_events (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_events' and column_name='referral_code') then execute 'create index if not exists idx_medusa_order_events_referral_code on app_public.medusa_order_events (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='medusa_order_events' and column_name='created_at') then execute 'create index if not exists idx_medusa_order_events_created_at on app_public.medusa_order_events (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='fulfillment_tracking_events' and column_name='user_id') then execute 'create index if not exists idx_fulfillment_tracking_events_user_id on app_public.fulfillment_tracking_events (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='fulfillment_tracking_events' and column_name='email') then execute 'create index if not exists idx_fulfillment_tracking_events_email on app_public.fulfillment_tracking_events (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='fulfillment_tracking_events' and column_name='status') then execute 'create index if not exists idx_fulfillment_tracking_events_status on app_public.fulfillment_tracking_events (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='fulfillment_tracking_events' and column_name='event_type') then execute 'create index if not exists idx_fulfillment_tracking_events_event_type on app_public.fulfillment_tracking_events (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='fulfillment_tracking_events' and column_name='source') then execute 'create index if not exists idx_fulfillment_tracking_events_source on app_public.fulfillment_tracking_events (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='fulfillment_tracking_events' and column_name='source_event_id') then execute 'create index if not exists idx_fulfillment_tracking_events_source_event_id on app_public.fulfillment_tracking_events (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='fulfillment_tracking_events' and column_name='checkout_session_id') then execute 'create index if not exists idx_fulfillment_tracking_events_checkout_session_id on app_public.fulfillment_tracking_events (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='fulfillment_tracking_events' and column_name='stripe_event_id') then execute 'create index if not exists idx_fulfillment_tracking_events_stripe_event_id on app_public.fulfillment_tracking_events (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='fulfillment_tracking_events' and column_name='cart_id') then execute 'create index if not exists idx_fulfillment_tracking_events_cart_id on app_public.fulfillment_tracking_events (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='fulfillment_tracking_events' and column_name='order_ref') then execute 'create index if not exists idx_fulfillment_tracking_events_order_ref on app_public.fulfillment_tracking_events (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='fulfillment_tracking_events' and column_name='product_id') then execute 'create index if not exists idx_fulfillment_tracking_events_product_id on app_public.fulfillment_tracking_events (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='fulfillment_tracking_events' and column_name='variant_id') then execute 'create index if not exists idx_fulfillment_tracking_events_variant_id on app_public.fulfillment_tracking_events (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='fulfillment_tracking_events' and column_name='campaign_id') then execute 'create index if not exists idx_fulfillment_tracking_events_campaign_id on app_public.fulfillment_tracking_events (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='fulfillment_tracking_events' and column_name='affiliate_account_id') then execute 'create index if not exists idx_fulfillment_tracking_events_affiliate_account_id on app_public.fulfillment_tracking_events (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='fulfillment_tracking_events' and column_name='referral_code') then execute 'create index if not exists idx_fulfillment_tracking_events_referral_code on app_public.fulfillment_tracking_events (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='fulfillment_tracking_events' and column_name='created_at') then execute 'create index if not exists idx_fulfillment_tracking_events_created_at on app_public.fulfillment_tracking_events (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='advertiser_accounts' and column_name='user_id') then execute 'create index if not exists idx_advertiser_accounts_user_id on app_public.advertiser_accounts (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='advertiser_accounts' and column_name='email') then execute 'create index if not exists idx_advertiser_accounts_email on app_public.advertiser_accounts (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='advertiser_accounts' and column_name='status') then execute 'create index if not exists idx_advertiser_accounts_status on app_public.advertiser_accounts (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='advertiser_accounts' and column_name='event_type') then execute 'create index if not exists idx_advertiser_accounts_event_type on app_public.advertiser_accounts (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='advertiser_accounts' and column_name='source') then execute 'create index if not exists idx_advertiser_accounts_source on app_public.advertiser_accounts (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='advertiser_accounts' and column_name='source_event_id') then execute 'create index if not exists idx_advertiser_accounts_source_event_id on app_public.advertiser_accounts (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='advertiser_accounts' and column_name='checkout_session_id') then execute 'create index if not exists idx_advertiser_accounts_checkout_session_id on app_public.advertiser_accounts (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='advertiser_accounts' and column_name='stripe_event_id') then execute 'create index if not exists idx_advertiser_accounts_stripe_event_id on app_public.advertiser_accounts (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='advertiser_accounts' and column_name='cart_id') then execute 'create index if not exists idx_advertiser_accounts_cart_id on app_public.advertiser_accounts (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='advertiser_accounts' and column_name='order_ref') then execute 'create index if not exists idx_advertiser_accounts_order_ref on app_public.advertiser_accounts (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='advertiser_accounts' and column_name='product_id') then execute 'create index if not exists idx_advertiser_accounts_product_id on app_public.advertiser_accounts (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='advertiser_accounts' and column_name='variant_id') then execute 'create index if not exists idx_advertiser_accounts_variant_id on app_public.advertiser_accounts (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='advertiser_accounts' and column_name='campaign_id') then execute 'create index if not exists idx_advertiser_accounts_campaign_id on app_public.advertiser_accounts (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='advertiser_accounts' and column_name='affiliate_account_id') then execute 'create index if not exists idx_advertiser_accounts_affiliate_account_id on app_public.advertiser_accounts (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='advertiser_accounts' and column_name='referral_code') then execute 'create index if not exists idx_advertiser_accounts_referral_code on app_public.advertiser_accounts (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='advertiser_accounts' and column_name='created_at') then execute 'create index if not exists idx_advertiser_accounts_created_at on app_public.advertiser_accounts (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_campaigns' and column_name='user_id') then execute 'create index if not exists idx_ad_campaigns_user_id on app_public.ad_campaigns (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_campaigns' and column_name='email') then execute 'create index if not exists idx_ad_campaigns_email on app_public.ad_campaigns (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_campaigns' and column_name='status') then execute 'create index if not exists idx_ad_campaigns_status on app_public.ad_campaigns (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_campaigns' and column_name='event_type') then execute 'create index if not exists idx_ad_campaigns_event_type on app_public.ad_campaigns (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_campaigns' and column_name='source') then execute 'create index if not exists idx_ad_campaigns_source on app_public.ad_campaigns (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_campaigns' and column_name='source_event_id') then execute 'create index if not exists idx_ad_campaigns_source_event_id on app_public.ad_campaigns (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_campaigns' and column_name='checkout_session_id') then execute 'create index if not exists idx_ad_campaigns_checkout_session_id on app_public.ad_campaigns (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_campaigns' and column_name='stripe_event_id') then execute 'create index if not exists idx_ad_campaigns_stripe_event_id on app_public.ad_campaigns (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_campaigns' and column_name='cart_id') then execute 'create index if not exists idx_ad_campaigns_cart_id on app_public.ad_campaigns (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_campaigns' and column_name='order_ref') then execute 'create index if not exists idx_ad_campaigns_order_ref on app_public.ad_campaigns (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_campaigns' and column_name='product_id') then execute 'create index if not exists idx_ad_campaigns_product_id on app_public.ad_campaigns (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_campaigns' and column_name='variant_id') then execute 'create index if not exists idx_ad_campaigns_variant_id on app_public.ad_campaigns (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_campaigns' and column_name='campaign_id') then execute 'create index if not exists idx_ad_campaigns_campaign_id on app_public.ad_campaigns (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_campaigns' and column_name='affiliate_account_id') then execute 'create index if not exists idx_ad_campaigns_affiliate_account_id on app_public.ad_campaigns (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_campaigns' and column_name='referral_code') then execute 'create index if not exists idx_ad_campaigns_referral_code on app_public.ad_campaigns (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_campaigns' and column_name='created_at') then execute 'create index if not exists idx_ad_campaigns_created_at on app_public.ad_campaigns (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_creatives' and column_name='user_id') then execute 'create index if not exists idx_ad_creatives_user_id on app_public.ad_creatives (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_creatives' and column_name='email') then execute 'create index if not exists idx_ad_creatives_email on app_public.ad_creatives (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_creatives' and column_name='status') then execute 'create index if not exists idx_ad_creatives_status on app_public.ad_creatives (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_creatives' and column_name='event_type') then execute 'create index if not exists idx_ad_creatives_event_type on app_public.ad_creatives (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_creatives' and column_name='source') then execute 'create index if not exists idx_ad_creatives_source on app_public.ad_creatives (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_creatives' and column_name='source_event_id') then execute 'create index if not exists idx_ad_creatives_source_event_id on app_public.ad_creatives (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_creatives' and column_name='checkout_session_id') then execute 'create index if not exists idx_ad_creatives_checkout_session_id on app_public.ad_creatives (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_creatives' and column_name='stripe_event_id') then execute 'create index if not exists idx_ad_creatives_stripe_event_id on app_public.ad_creatives (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_creatives' and column_name='cart_id') then execute 'create index if not exists idx_ad_creatives_cart_id on app_public.ad_creatives (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_creatives' and column_name='order_ref') then execute 'create index if not exists idx_ad_creatives_order_ref on app_public.ad_creatives (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_creatives' and column_name='product_id') then execute 'create index if not exists idx_ad_creatives_product_id on app_public.ad_creatives (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_creatives' and column_name='variant_id') then execute 'create index if not exists idx_ad_creatives_variant_id on app_public.ad_creatives (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_creatives' and column_name='campaign_id') then execute 'create index if not exists idx_ad_creatives_campaign_id on app_public.ad_creatives (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_creatives' and column_name='affiliate_account_id') then execute 'create index if not exists idx_ad_creatives_affiliate_account_id on app_public.ad_creatives (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_creatives' and column_name='referral_code') then execute 'create index if not exists idx_ad_creatives_referral_code on app_public.ad_creatives (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_creatives' and column_name='created_at') then execute 'create index if not exists idx_ad_creatives_created_at on app_public.ad_creatives (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_sessions' and column_name='user_id') then execute 'create index if not exists idx_ad_watch_sessions_user_id on app_public.ad_watch_sessions (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_sessions' and column_name='email') then execute 'create index if not exists idx_ad_watch_sessions_email on app_public.ad_watch_sessions (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_sessions' and column_name='status') then execute 'create index if not exists idx_ad_watch_sessions_status on app_public.ad_watch_sessions (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_sessions' and column_name='event_type') then execute 'create index if not exists idx_ad_watch_sessions_event_type on app_public.ad_watch_sessions (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_sessions' and column_name='source') then execute 'create index if not exists idx_ad_watch_sessions_source on app_public.ad_watch_sessions (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_sessions' and column_name='source_event_id') then execute 'create index if not exists idx_ad_watch_sessions_source_event_id on app_public.ad_watch_sessions (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_sessions' and column_name='checkout_session_id') then execute 'create index if not exists idx_ad_watch_sessions_checkout_session_id on app_public.ad_watch_sessions (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_sessions' and column_name='stripe_event_id') then execute 'create index if not exists idx_ad_watch_sessions_stripe_event_id on app_public.ad_watch_sessions (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_sessions' and column_name='cart_id') then execute 'create index if not exists idx_ad_watch_sessions_cart_id on app_public.ad_watch_sessions (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_sessions' and column_name='order_ref') then execute 'create index if not exists idx_ad_watch_sessions_order_ref on app_public.ad_watch_sessions (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_sessions' and column_name='product_id') then execute 'create index if not exists idx_ad_watch_sessions_product_id on app_public.ad_watch_sessions (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_sessions' and column_name='variant_id') then execute 'create index if not exists idx_ad_watch_sessions_variant_id on app_public.ad_watch_sessions (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_sessions' and column_name='campaign_id') then execute 'create index if not exists idx_ad_watch_sessions_campaign_id on app_public.ad_watch_sessions (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_sessions' and column_name='affiliate_account_id') then execute 'create index if not exists idx_ad_watch_sessions_affiliate_account_id on app_public.ad_watch_sessions (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_sessions' and column_name='referral_code') then execute 'create index if not exists idx_ad_watch_sessions_referral_code on app_public.ad_watch_sessions (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_sessions' and column_name='created_at') then execute 'create index if not exists idx_ad_watch_sessions_created_at on app_public.ad_watch_sessions (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_events' and column_name='user_id') then execute 'create index if not exists idx_ad_watch_events_user_id on app_public.ad_watch_events (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_events' and column_name='email') then execute 'create index if not exists idx_ad_watch_events_email on app_public.ad_watch_events (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_events' and column_name='status') then execute 'create index if not exists idx_ad_watch_events_status on app_public.ad_watch_events (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_events' and column_name='event_type') then execute 'create index if not exists idx_ad_watch_events_event_type on app_public.ad_watch_events (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_events' and column_name='source') then execute 'create index if not exists idx_ad_watch_events_source on app_public.ad_watch_events (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_events' and column_name='source_event_id') then execute 'create index if not exists idx_ad_watch_events_source_event_id on app_public.ad_watch_events (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_events' and column_name='checkout_session_id') then execute 'create index if not exists idx_ad_watch_events_checkout_session_id on app_public.ad_watch_events (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_events' and column_name='stripe_event_id') then execute 'create index if not exists idx_ad_watch_events_stripe_event_id on app_public.ad_watch_events (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_events' and column_name='cart_id') then execute 'create index if not exists idx_ad_watch_events_cart_id on app_public.ad_watch_events (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_events' and column_name='order_ref') then execute 'create index if not exists idx_ad_watch_events_order_ref on app_public.ad_watch_events (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_events' and column_name='product_id') then execute 'create index if not exists idx_ad_watch_events_product_id on app_public.ad_watch_events (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_events' and column_name='variant_id') then execute 'create index if not exists idx_ad_watch_events_variant_id on app_public.ad_watch_events (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_events' and column_name='campaign_id') then execute 'create index if not exists idx_ad_watch_events_campaign_id on app_public.ad_watch_events (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_events' and column_name='affiliate_account_id') then execute 'create index if not exists idx_ad_watch_events_affiliate_account_id on app_public.ad_watch_events (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_events' and column_name='referral_code') then execute 'create index if not exists idx_ad_watch_events_referral_code on app_public.ad_watch_events (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_watch_events' and column_name='created_at') then execute 'create index if not exists idx_ad_watch_events_created_at on app_public.ad_watch_events (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_reward_confirmations' and column_name='user_id') then execute 'create index if not exists idx_ad_reward_confirmations_user_id on app_public.ad_reward_confirmations (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_reward_confirmations' and column_name='email') then execute 'create index if not exists idx_ad_reward_confirmations_email on app_public.ad_reward_confirmations (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_reward_confirmations' and column_name='status') then execute 'create index if not exists idx_ad_reward_confirmations_status on app_public.ad_reward_confirmations (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_reward_confirmations' and column_name='event_type') then execute 'create index if not exists idx_ad_reward_confirmations_event_type on app_public.ad_reward_confirmations (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_reward_confirmations' and column_name='source') then execute 'create index if not exists idx_ad_reward_confirmations_source on app_public.ad_reward_confirmations (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_reward_confirmations' and column_name='source_event_id') then execute 'create index if not exists idx_ad_reward_confirmations_source_event_id on app_public.ad_reward_confirmations (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_reward_confirmations' and column_name='checkout_session_id') then execute 'create index if not exists idx_ad_reward_confirmations_checkout_session_id on app_public.ad_reward_confirmations (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_reward_confirmations' and column_name='stripe_event_id') then execute 'create index if not exists idx_ad_reward_confirmations_stripe_event_id on app_public.ad_reward_confirmations (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_reward_confirmations' and column_name='cart_id') then execute 'create index if not exists idx_ad_reward_confirmations_cart_id on app_public.ad_reward_confirmations (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_reward_confirmations' and column_name='order_ref') then execute 'create index if not exists idx_ad_reward_confirmations_order_ref on app_public.ad_reward_confirmations (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_reward_confirmations' and column_name='product_id') then execute 'create index if not exists idx_ad_reward_confirmations_product_id on app_public.ad_reward_confirmations (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_reward_confirmations' and column_name='variant_id') then execute 'create index if not exists idx_ad_reward_confirmations_variant_id on app_public.ad_reward_confirmations (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_reward_confirmations' and column_name='campaign_id') then execute 'create index if not exists idx_ad_reward_confirmations_campaign_id on app_public.ad_reward_confirmations (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_reward_confirmations' and column_name='affiliate_account_id') then execute 'create index if not exists idx_ad_reward_confirmations_affiliate_account_id on app_public.ad_reward_confirmations (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_reward_confirmations' and column_name='referral_code') then execute 'create index if not exists idx_ad_reward_confirmations_referral_code on app_public.ad_reward_confirmations (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_reward_confirmations' and column_name='created_at') then execute 'create index if not exists idx_ad_reward_confirmations_created_at on app_public.ad_reward_confirmations (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_budget_ledger' and column_name='user_id') then execute 'create index if not exists idx_ad_budget_ledger_user_id on app_public.ad_budget_ledger (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_budget_ledger' and column_name='email') then execute 'create index if not exists idx_ad_budget_ledger_email on app_public.ad_budget_ledger (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_budget_ledger' and column_name='status') then execute 'create index if not exists idx_ad_budget_ledger_status on app_public.ad_budget_ledger (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_budget_ledger' and column_name='event_type') then execute 'create index if not exists idx_ad_budget_ledger_event_type on app_public.ad_budget_ledger (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_budget_ledger' and column_name='source') then execute 'create index if not exists idx_ad_budget_ledger_source on app_public.ad_budget_ledger (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_budget_ledger' and column_name='source_event_id') then execute 'create index if not exists idx_ad_budget_ledger_source_event_id on app_public.ad_budget_ledger (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_budget_ledger' and column_name='checkout_session_id') then execute 'create index if not exists idx_ad_budget_ledger_checkout_session_id on app_public.ad_budget_ledger (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_budget_ledger' and column_name='stripe_event_id') then execute 'create index if not exists idx_ad_budget_ledger_stripe_event_id on app_public.ad_budget_ledger (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_budget_ledger' and column_name='cart_id') then execute 'create index if not exists idx_ad_budget_ledger_cart_id on app_public.ad_budget_ledger (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_budget_ledger' and column_name='order_ref') then execute 'create index if not exists idx_ad_budget_ledger_order_ref on app_public.ad_budget_ledger (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_budget_ledger' and column_name='product_id') then execute 'create index if not exists idx_ad_budget_ledger_product_id on app_public.ad_budget_ledger (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_budget_ledger' and column_name='variant_id') then execute 'create index if not exists idx_ad_budget_ledger_variant_id on app_public.ad_budget_ledger (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_budget_ledger' and column_name='campaign_id') then execute 'create index if not exists idx_ad_budget_ledger_campaign_id on app_public.ad_budget_ledger (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_budget_ledger' and column_name='affiliate_account_id') then execute 'create index if not exists idx_ad_budget_ledger_affiliate_account_id on app_public.ad_budget_ledger (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_budget_ledger' and column_name='referral_code') then execute 'create index if not exists idx_ad_budget_ledger_referral_code on app_public.ad_budget_ledger (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_budget_ledger' and column_name='created_at') then execute 'create index if not exists idx_ad_budget_ledger_created_at on app_public.ad_budget_ledger (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_fraud_events' and column_name='user_id') then execute 'create index if not exists idx_ad_fraud_events_user_id on app_public.ad_fraud_events (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_fraud_events' and column_name='email') then execute 'create index if not exists idx_ad_fraud_events_email on app_public.ad_fraud_events (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_fraud_events' and column_name='status') then execute 'create index if not exists idx_ad_fraud_events_status on app_public.ad_fraud_events (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_fraud_events' and column_name='event_type') then execute 'create index if not exists idx_ad_fraud_events_event_type on app_public.ad_fraud_events (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_fraud_events' and column_name='source') then execute 'create index if not exists idx_ad_fraud_events_source on app_public.ad_fraud_events (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_fraud_events' and column_name='source_event_id') then execute 'create index if not exists idx_ad_fraud_events_source_event_id on app_public.ad_fraud_events (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_fraud_events' and column_name='checkout_session_id') then execute 'create index if not exists idx_ad_fraud_events_checkout_session_id on app_public.ad_fraud_events (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_fraud_events' and column_name='stripe_event_id') then execute 'create index if not exists idx_ad_fraud_events_stripe_event_id on app_public.ad_fraud_events (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_fraud_events' and column_name='cart_id') then execute 'create index if not exists idx_ad_fraud_events_cart_id on app_public.ad_fraud_events (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_fraud_events' and column_name='order_ref') then execute 'create index if not exists idx_ad_fraud_events_order_ref on app_public.ad_fraud_events (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_fraud_events' and column_name='product_id') then execute 'create index if not exists idx_ad_fraud_events_product_id on app_public.ad_fraud_events (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_fraud_events' and column_name='variant_id') then execute 'create index if not exists idx_ad_fraud_events_variant_id on app_public.ad_fraud_events (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_fraud_events' and column_name='campaign_id') then execute 'create index if not exists idx_ad_fraud_events_campaign_id on app_public.ad_fraud_events (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_fraud_events' and column_name='affiliate_account_id') then execute 'create index if not exists idx_ad_fraud_events_affiliate_account_id on app_public.ad_fraud_events (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_fraud_events' and column_name='referral_code') then execute 'create index if not exists idx_ad_fraud_events_referral_code on app_public.ad_fraud_events (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ad_fraud_events' and column_name='created_at') then execute 'create index if not exists idx_ad_fraud_events_created_at on app_public.ad_fraud_events (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_stories' and column_name='user_id') then execute 'create index if not exists idx_ai_stories_user_id on app_public.ai_stories (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_stories' and column_name='email') then execute 'create index if not exists idx_ai_stories_email on app_public.ai_stories (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_stories' and column_name='status') then execute 'create index if not exists idx_ai_stories_status on app_public.ai_stories (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_stories' and column_name='event_type') then execute 'create index if not exists idx_ai_stories_event_type on app_public.ai_stories (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_stories' and column_name='source') then execute 'create index if not exists idx_ai_stories_source on app_public.ai_stories (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_stories' and column_name='source_event_id') then execute 'create index if not exists idx_ai_stories_source_event_id on app_public.ai_stories (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_stories' and column_name='checkout_session_id') then execute 'create index if not exists idx_ai_stories_checkout_session_id on app_public.ai_stories (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_stories' and column_name='stripe_event_id') then execute 'create index if not exists idx_ai_stories_stripe_event_id on app_public.ai_stories (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_stories' and column_name='cart_id') then execute 'create index if not exists idx_ai_stories_cart_id on app_public.ai_stories (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_stories' and column_name='order_ref') then execute 'create index if not exists idx_ai_stories_order_ref on app_public.ai_stories (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_stories' and column_name='product_id') then execute 'create index if not exists idx_ai_stories_product_id on app_public.ai_stories (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_stories' and column_name='variant_id') then execute 'create index if not exists idx_ai_stories_variant_id on app_public.ai_stories (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_stories' and column_name='campaign_id') then execute 'create index if not exists idx_ai_stories_campaign_id on app_public.ai_stories (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_stories' and column_name='affiliate_account_id') then execute 'create index if not exists idx_ai_stories_affiliate_account_id on app_public.ai_stories (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_stories' and column_name='referral_code') then execute 'create index if not exists idx_ai_stories_referral_code on app_public.ai_stories (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_stories' and column_name='created_at') then execute 'create index if not exists idx_ai_stories_created_at on app_public.ai_stories (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_generations' and column_name='user_id') then execute 'create index if not exists idx_ai_story_generations_user_id on app_public.ai_story_generations (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_generations' and column_name='email') then execute 'create index if not exists idx_ai_story_generations_email on app_public.ai_story_generations (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_generations' and column_name='status') then execute 'create index if not exists idx_ai_story_generations_status on app_public.ai_story_generations (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_generations' and column_name='event_type') then execute 'create index if not exists idx_ai_story_generations_event_type on app_public.ai_story_generations (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_generations' and column_name='source') then execute 'create index if not exists idx_ai_story_generations_source on app_public.ai_story_generations (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_generations' and column_name='source_event_id') then execute 'create index if not exists idx_ai_story_generations_source_event_id on app_public.ai_story_generations (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_generations' and column_name='checkout_session_id') then execute 'create index if not exists idx_ai_story_generations_checkout_session_id on app_public.ai_story_generations (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_generations' and column_name='stripe_event_id') then execute 'create index if not exists idx_ai_story_generations_stripe_event_id on app_public.ai_story_generations (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_generations' and column_name='cart_id') then execute 'create index if not exists idx_ai_story_generations_cart_id on app_public.ai_story_generations (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_generations' and column_name='order_ref') then execute 'create index if not exists idx_ai_story_generations_order_ref on app_public.ai_story_generations (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_generations' and column_name='product_id') then execute 'create index if not exists idx_ai_story_generations_product_id on app_public.ai_story_generations (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_generations' and column_name='variant_id') then execute 'create index if not exists idx_ai_story_generations_variant_id on app_public.ai_story_generations (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_generations' and column_name='campaign_id') then execute 'create index if not exists idx_ai_story_generations_campaign_id on app_public.ai_story_generations (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_generations' and column_name='affiliate_account_id') then execute 'create index if not exists idx_ai_story_generations_affiliate_account_id on app_public.ai_story_generations (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_generations' and column_name='referral_code') then execute 'create index if not exists idx_ai_story_generations_referral_code on app_public.ai_story_generations (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_generations' and column_name='created_at') then execute 'create index if not exists idx_ai_story_generations_created_at on app_public.ai_story_generations (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_usage_events' and column_name='user_id') then execute 'create index if not exists idx_ai_story_usage_events_user_id on app_public.ai_story_usage_events (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_usage_events' and column_name='email') then execute 'create index if not exists idx_ai_story_usage_events_email on app_public.ai_story_usage_events (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_usage_events' and column_name='status') then execute 'create index if not exists idx_ai_story_usage_events_status on app_public.ai_story_usage_events (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_usage_events' and column_name='event_type') then execute 'create index if not exists idx_ai_story_usage_events_event_type on app_public.ai_story_usage_events (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_usage_events' and column_name='source') then execute 'create index if not exists idx_ai_story_usage_events_source on app_public.ai_story_usage_events (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_usage_events' and column_name='source_event_id') then execute 'create index if not exists idx_ai_story_usage_events_source_event_id on app_public.ai_story_usage_events (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_usage_events' and column_name='checkout_session_id') then execute 'create index if not exists idx_ai_story_usage_events_checkout_session_id on app_public.ai_story_usage_events (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_usage_events' and column_name='stripe_event_id') then execute 'create index if not exists idx_ai_story_usage_events_stripe_event_id on app_public.ai_story_usage_events (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_usage_events' and column_name='cart_id') then execute 'create index if not exists idx_ai_story_usage_events_cart_id on app_public.ai_story_usage_events (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_usage_events' and column_name='order_ref') then execute 'create index if not exists idx_ai_story_usage_events_order_ref on app_public.ai_story_usage_events (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_usage_events' and column_name='product_id') then execute 'create index if not exists idx_ai_story_usage_events_product_id on app_public.ai_story_usage_events (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_usage_events' and column_name='variant_id') then execute 'create index if not exists idx_ai_story_usage_events_variant_id on app_public.ai_story_usage_events (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_usage_events' and column_name='campaign_id') then execute 'create index if not exists idx_ai_story_usage_events_campaign_id on app_public.ai_story_usage_events (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_usage_events' and column_name='affiliate_account_id') then execute 'create index if not exists idx_ai_story_usage_events_affiliate_account_id on app_public.ai_story_usage_events (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_usage_events' and column_name='referral_code') then execute 'create index if not exists idx_ai_story_usage_events_referral_code on app_public.ai_story_usage_events (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_usage_events' and column_name='created_at') then execute 'create index if not exists idx_ai_story_usage_events_created_at on app_public.ai_story_usage_events (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_promotion_events' and column_name='user_id') then execute 'create index if not exists idx_ai_story_promotion_events_user_id on app_public.ai_story_promotion_events (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_promotion_events' and column_name='email') then execute 'create index if not exists idx_ai_story_promotion_events_email on app_public.ai_story_promotion_events (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_promotion_events' and column_name='status') then execute 'create index if not exists idx_ai_story_promotion_events_status on app_public.ai_story_promotion_events (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_promotion_events' and column_name='event_type') then execute 'create index if not exists idx_ai_story_promotion_events_event_type on app_public.ai_story_promotion_events (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_promotion_events' and column_name='source') then execute 'create index if not exists idx_ai_story_promotion_events_source on app_public.ai_story_promotion_events (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_promotion_events' and column_name='source_event_id') then execute 'create index if not exists idx_ai_story_promotion_events_source_event_id on app_public.ai_story_promotion_events (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_promotion_events' and column_name='checkout_session_id') then execute 'create index if not exists idx_ai_story_promotion_events_checkout_session_id on app_public.ai_story_promotion_events (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_promotion_events' and column_name='stripe_event_id') then execute 'create index if not exists idx_ai_story_promotion_events_stripe_event_id on app_public.ai_story_promotion_events (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_promotion_events' and column_name='cart_id') then execute 'create index if not exists idx_ai_story_promotion_events_cart_id on app_public.ai_story_promotion_events (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_promotion_events' and column_name='order_ref') then execute 'create index if not exists idx_ai_story_promotion_events_order_ref on app_public.ai_story_promotion_events (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_promotion_events' and column_name='product_id') then execute 'create index if not exists idx_ai_story_promotion_events_product_id on app_public.ai_story_promotion_events (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_promotion_events' and column_name='variant_id') then execute 'create index if not exists idx_ai_story_promotion_events_variant_id on app_public.ai_story_promotion_events (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_promotion_events' and column_name='campaign_id') then execute 'create index if not exists idx_ai_story_promotion_events_campaign_id on app_public.ai_story_promotion_events (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_promotion_events' and column_name='affiliate_account_id') then execute 'create index if not exists idx_ai_story_promotion_events_affiliate_account_id on app_public.ai_story_promotion_events (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_promotion_events' and column_name='referral_code') then execute 'create index if not exists idx_ai_story_promotion_events_referral_code on app_public.ai_story_promotion_events (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_promotion_events' and column_name='created_at') then execute 'create index if not exists idx_ai_story_promotion_events_created_at on app_public.ai_story_promotion_events (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_projects' and column_name='user_id') then execute 'create index if not exists idx_dream_projects_user_id on app_public.dream_projects (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_projects' and column_name='email') then execute 'create index if not exists idx_dream_projects_email on app_public.dream_projects (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_projects' and column_name='status') then execute 'create index if not exists idx_dream_projects_status on app_public.dream_projects (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_projects' and column_name='event_type') then execute 'create index if not exists idx_dream_projects_event_type on app_public.dream_projects (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_projects' and column_name='source') then execute 'create index if not exists idx_dream_projects_source on app_public.dream_projects (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_projects' and column_name='source_event_id') then execute 'create index if not exists idx_dream_projects_source_event_id on app_public.dream_projects (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_projects' and column_name='checkout_session_id') then execute 'create index if not exists idx_dream_projects_checkout_session_id on app_public.dream_projects (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_projects' and column_name='stripe_event_id') then execute 'create index if not exists idx_dream_projects_stripe_event_id on app_public.dream_projects (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_projects' and column_name='cart_id') then execute 'create index if not exists idx_dream_projects_cart_id on app_public.dream_projects (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_projects' and column_name='order_ref') then execute 'create index if not exists idx_dream_projects_order_ref on app_public.dream_projects (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_projects' and column_name='product_id') then execute 'create index if not exists idx_dream_projects_product_id on app_public.dream_projects (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_projects' and column_name='variant_id') then execute 'create index if not exists idx_dream_projects_variant_id on app_public.dream_projects (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_projects' and column_name='campaign_id') then execute 'create index if not exists idx_dream_projects_campaign_id on app_public.dream_projects (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_projects' and column_name='affiliate_account_id') then execute 'create index if not exists idx_dream_projects_affiliate_account_id on app_public.dream_projects (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_projects' and column_name='referral_code') then execute 'create index if not exists idx_dream_projects_referral_code on app_public.dream_projects (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_projects' and column_name='created_at') then execute 'create index if not exists idx_dream_projects_created_at on app_public.dream_projects (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_pledges' and column_name='user_id') then execute 'create index if not exists idx_dream_pledges_user_id on app_public.dream_pledges (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_pledges' and column_name='email') then execute 'create index if not exists idx_dream_pledges_email on app_public.dream_pledges (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_pledges' and column_name='status') then execute 'create index if not exists idx_dream_pledges_status on app_public.dream_pledges (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_pledges' and column_name='event_type') then execute 'create index if not exists idx_dream_pledges_event_type on app_public.dream_pledges (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_pledges' and column_name='source') then execute 'create index if not exists idx_dream_pledges_source on app_public.dream_pledges (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_pledges' and column_name='source_event_id') then execute 'create index if not exists idx_dream_pledges_source_event_id on app_public.dream_pledges (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_pledges' and column_name='checkout_session_id') then execute 'create index if not exists idx_dream_pledges_checkout_session_id on app_public.dream_pledges (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_pledges' and column_name='stripe_event_id') then execute 'create index if not exists idx_dream_pledges_stripe_event_id on app_public.dream_pledges (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_pledges' and column_name='cart_id') then execute 'create index if not exists idx_dream_pledges_cart_id on app_public.dream_pledges (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_pledges' and column_name='order_ref') then execute 'create index if not exists idx_dream_pledges_order_ref on app_public.dream_pledges (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_pledges' and column_name='product_id') then execute 'create index if not exists idx_dream_pledges_product_id on app_public.dream_pledges (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_pledges' and column_name='variant_id') then execute 'create index if not exists idx_dream_pledges_variant_id on app_public.dream_pledges (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_pledges' and column_name='campaign_id') then execute 'create index if not exists idx_dream_pledges_campaign_id on app_public.dream_pledges (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_pledges' and column_name='affiliate_account_id') then execute 'create index if not exists idx_dream_pledges_affiliate_account_id on app_public.dream_pledges (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_pledges' and column_name='referral_code') then execute 'create index if not exists idx_dream_pledges_referral_code on app_public.dream_pledges (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_pledges' and column_name='created_at') then execute 'create index if not exists idx_dream_pledges_created_at on app_public.dream_pledges (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_contributions' and column_name='user_id') then execute 'create index if not exists idx_dream_contributions_user_id on app_public.dream_contributions (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_contributions' and column_name='email') then execute 'create index if not exists idx_dream_contributions_email on app_public.dream_contributions (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_contributions' and column_name='status') then execute 'create index if not exists idx_dream_contributions_status on app_public.dream_contributions (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_contributions' and column_name='event_type') then execute 'create index if not exists idx_dream_contributions_event_type on app_public.dream_contributions (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_contributions' and column_name='source') then execute 'create index if not exists idx_dream_contributions_source on app_public.dream_contributions (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_contributions' and column_name='source_event_id') then execute 'create index if not exists idx_dream_contributions_source_event_id on app_public.dream_contributions (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_contributions' and column_name='checkout_session_id') then execute 'create index if not exists idx_dream_contributions_checkout_session_id on app_public.dream_contributions (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_contributions' and column_name='stripe_event_id') then execute 'create index if not exists idx_dream_contributions_stripe_event_id on app_public.dream_contributions (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_contributions' and column_name='cart_id') then execute 'create index if not exists idx_dream_contributions_cart_id on app_public.dream_contributions (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_contributions' and column_name='order_ref') then execute 'create index if not exists idx_dream_contributions_order_ref on app_public.dream_contributions (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_contributions' and column_name='product_id') then execute 'create index if not exists idx_dream_contributions_product_id on app_public.dream_contributions (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_contributions' and column_name='variant_id') then execute 'create index if not exists idx_dream_contributions_variant_id on app_public.dream_contributions (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_contributions' and column_name='campaign_id') then execute 'create index if not exists idx_dream_contributions_campaign_id on app_public.dream_contributions (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_contributions' and column_name='affiliate_account_id') then execute 'create index if not exists idx_dream_contributions_affiliate_account_id on app_public.dream_contributions (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_contributions' and column_name='referral_code') then execute 'create index if not exists idx_dream_contributions_referral_code on app_public.dream_contributions (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_contributions' and column_name='created_at') then execute 'create index if not exists idx_dream_contributions_created_at on app_public.dream_contributions (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_reward_claims' and column_name='user_id') then execute 'create index if not exists idx_dream_reward_claims_user_id on app_public.dream_reward_claims (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_reward_claims' and column_name='email') then execute 'create index if not exists idx_dream_reward_claims_email on app_public.dream_reward_claims (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_reward_claims' and column_name='status') then execute 'create index if not exists idx_dream_reward_claims_status on app_public.dream_reward_claims (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_reward_claims' and column_name='event_type') then execute 'create index if not exists idx_dream_reward_claims_event_type on app_public.dream_reward_claims (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_reward_claims' and column_name='source') then execute 'create index if not exists idx_dream_reward_claims_source on app_public.dream_reward_claims (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_reward_claims' and column_name='source_event_id') then execute 'create index if not exists idx_dream_reward_claims_source_event_id on app_public.dream_reward_claims (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_reward_claims' and column_name='checkout_session_id') then execute 'create index if not exists idx_dream_reward_claims_checkout_session_id on app_public.dream_reward_claims (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_reward_claims' and column_name='stripe_event_id') then execute 'create index if not exists idx_dream_reward_claims_stripe_event_id on app_public.dream_reward_claims (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_reward_claims' and column_name='cart_id') then execute 'create index if not exists idx_dream_reward_claims_cart_id on app_public.dream_reward_claims (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_reward_claims' and column_name='order_ref') then execute 'create index if not exists idx_dream_reward_claims_order_ref on app_public.dream_reward_claims (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_reward_claims' and column_name='product_id') then execute 'create index if not exists idx_dream_reward_claims_product_id on app_public.dream_reward_claims (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_reward_claims' and column_name='variant_id') then execute 'create index if not exists idx_dream_reward_claims_variant_id on app_public.dream_reward_claims (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_reward_claims' and column_name='campaign_id') then execute 'create index if not exists idx_dream_reward_claims_campaign_id on app_public.dream_reward_claims (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_reward_claims' and column_name='affiliate_account_id') then execute 'create index if not exists idx_dream_reward_claims_affiliate_account_id on app_public.dream_reward_claims (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_reward_claims' and column_name='referral_code') then execute 'create index if not exists idx_dream_reward_claims_referral_code on app_public.dream_reward_claims (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='dream_reward_claims' and column_name='created_at') then execute 'create index if not exists idx_dream_reward_claims_created_at on app_public.dream_reward_claims (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_tickets' and column_name='user_id') then execute 'create index if not exists idx_support_tickets_user_id on app_public.support_tickets (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_tickets' and column_name='email') then execute 'create index if not exists idx_support_tickets_email on app_public.support_tickets (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_tickets' and column_name='status') then execute 'create index if not exists idx_support_tickets_status on app_public.support_tickets (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_tickets' and column_name='event_type') then execute 'create index if not exists idx_support_tickets_event_type on app_public.support_tickets (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_tickets' and column_name='source') then execute 'create index if not exists idx_support_tickets_source on app_public.support_tickets (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_tickets' and column_name='source_event_id') then execute 'create index if not exists idx_support_tickets_source_event_id on app_public.support_tickets (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_tickets' and column_name='checkout_session_id') then execute 'create index if not exists idx_support_tickets_checkout_session_id on app_public.support_tickets (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_tickets' and column_name='stripe_event_id') then execute 'create index if not exists idx_support_tickets_stripe_event_id on app_public.support_tickets (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_tickets' and column_name='cart_id') then execute 'create index if not exists idx_support_tickets_cart_id on app_public.support_tickets (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_tickets' and column_name='order_ref') then execute 'create index if not exists idx_support_tickets_order_ref on app_public.support_tickets (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_tickets' and column_name='product_id') then execute 'create index if not exists idx_support_tickets_product_id on app_public.support_tickets (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_tickets' and column_name='variant_id') then execute 'create index if not exists idx_support_tickets_variant_id on app_public.support_tickets (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_tickets' and column_name='campaign_id') then execute 'create index if not exists idx_support_tickets_campaign_id on app_public.support_tickets (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_tickets' and column_name='affiliate_account_id') then execute 'create index if not exists idx_support_tickets_affiliate_account_id on app_public.support_tickets (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_tickets' and column_name='referral_code') then execute 'create index if not exists idx_support_tickets_referral_code on app_public.support_tickets (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_tickets' and column_name='created_at') then execute 'create index if not exists idx_support_tickets_created_at on app_public.support_tickets (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_messages' and column_name='user_id') then execute 'create index if not exists idx_support_messages_user_id on app_public.support_messages (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_messages' and column_name='email') then execute 'create index if not exists idx_support_messages_email on app_public.support_messages (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_messages' and column_name='status') then execute 'create index if not exists idx_support_messages_status on app_public.support_messages (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_messages' and column_name='event_type') then execute 'create index if not exists idx_support_messages_event_type on app_public.support_messages (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_messages' and column_name='source') then execute 'create index if not exists idx_support_messages_source on app_public.support_messages (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_messages' and column_name='source_event_id') then execute 'create index if not exists idx_support_messages_source_event_id on app_public.support_messages (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_messages' and column_name='checkout_session_id') then execute 'create index if not exists idx_support_messages_checkout_session_id on app_public.support_messages (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_messages' and column_name='stripe_event_id') then execute 'create index if not exists idx_support_messages_stripe_event_id on app_public.support_messages (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_messages' and column_name='cart_id') then execute 'create index if not exists idx_support_messages_cart_id on app_public.support_messages (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_messages' and column_name='order_ref') then execute 'create index if not exists idx_support_messages_order_ref on app_public.support_messages (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_messages' and column_name='product_id') then execute 'create index if not exists idx_support_messages_product_id on app_public.support_messages (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_messages' and column_name='variant_id') then execute 'create index if not exists idx_support_messages_variant_id on app_public.support_messages (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_messages' and column_name='campaign_id') then execute 'create index if not exists idx_support_messages_campaign_id on app_public.support_messages (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_messages' and column_name='affiliate_account_id') then execute 'create index if not exists idx_support_messages_affiliate_account_id on app_public.support_messages (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_messages' and column_name='referral_code') then execute 'create index if not exists idx_support_messages_referral_code on app_public.support_messages (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='support_messages' and column_name='created_at') then execute 'create index if not exists idx_support_messages_created_at on app_public.support_messages (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notifications' and column_name='user_id') then execute 'create index if not exists idx_notifications_user_id on app_public.notifications (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notifications' and column_name='email') then execute 'create index if not exists idx_notifications_email on app_public.notifications (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notifications' and column_name='status') then execute 'create index if not exists idx_notifications_status on app_public.notifications (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notifications' and column_name='event_type') then execute 'create index if not exists idx_notifications_event_type on app_public.notifications (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notifications' and column_name='source') then execute 'create index if not exists idx_notifications_source on app_public.notifications (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notifications' and column_name='source_event_id') then execute 'create index if not exists idx_notifications_source_event_id on app_public.notifications (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notifications' and column_name='checkout_session_id') then execute 'create index if not exists idx_notifications_checkout_session_id on app_public.notifications (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notifications' and column_name='stripe_event_id') then execute 'create index if not exists idx_notifications_stripe_event_id on app_public.notifications (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notifications' and column_name='cart_id') then execute 'create index if not exists idx_notifications_cart_id on app_public.notifications (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notifications' and column_name='order_ref') then execute 'create index if not exists idx_notifications_order_ref on app_public.notifications (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notifications' and column_name='product_id') then execute 'create index if not exists idx_notifications_product_id on app_public.notifications (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notifications' and column_name='variant_id') then execute 'create index if not exists idx_notifications_variant_id on app_public.notifications (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notifications' and column_name='campaign_id') then execute 'create index if not exists idx_notifications_campaign_id on app_public.notifications (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notifications' and column_name='affiliate_account_id') then execute 'create index if not exists idx_notifications_affiliate_account_id on app_public.notifications (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notifications' and column_name='referral_code') then execute 'create index if not exists idx_notifications_referral_code on app_public.notifications (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notifications' and column_name='created_at') then execute 'create index if not exists idx_notifications_created_at on app_public.notifications (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notification_deliveries' and column_name='user_id') then execute 'create index if not exists idx_notification_deliveries_user_id on app_public.notification_deliveries (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notification_deliveries' and column_name='email') then execute 'create index if not exists idx_notification_deliveries_email on app_public.notification_deliveries (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notification_deliveries' and column_name='status') then execute 'create index if not exists idx_notification_deliveries_status on app_public.notification_deliveries (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notification_deliveries' and column_name='event_type') then execute 'create index if not exists idx_notification_deliveries_event_type on app_public.notification_deliveries (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notification_deliveries' and column_name='source') then execute 'create index if not exists idx_notification_deliveries_source on app_public.notification_deliveries (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notification_deliveries' and column_name='source_event_id') then execute 'create index if not exists idx_notification_deliveries_source_event_id on app_public.notification_deliveries (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notification_deliveries' and column_name='checkout_session_id') then execute 'create index if not exists idx_notification_deliveries_checkout_session_id on app_public.notification_deliveries (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notification_deliveries' and column_name='stripe_event_id') then execute 'create index if not exists idx_notification_deliveries_stripe_event_id on app_public.notification_deliveries (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notification_deliveries' and column_name='cart_id') then execute 'create index if not exists idx_notification_deliveries_cart_id on app_public.notification_deliveries (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notification_deliveries' and column_name='order_ref') then execute 'create index if not exists idx_notification_deliveries_order_ref on app_public.notification_deliveries (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notification_deliveries' and column_name='product_id') then execute 'create index if not exists idx_notification_deliveries_product_id on app_public.notification_deliveries (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notification_deliveries' and column_name='variant_id') then execute 'create index if not exists idx_notification_deliveries_variant_id on app_public.notification_deliveries (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notification_deliveries' and column_name='campaign_id') then execute 'create index if not exists idx_notification_deliveries_campaign_id on app_public.notification_deliveries (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notification_deliveries' and column_name='affiliate_account_id') then execute 'create index if not exists idx_notification_deliveries_affiliate_account_id on app_public.notification_deliveries (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notification_deliveries' and column_name='referral_code') then execute 'create index if not exists idx_notification_deliveries_referral_code on app_public.notification_deliveries (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='notification_deliveries' and column_name='created_at') then execute 'create index if not exists idx_notification_deliveries_created_at on app_public.notification_deliveries (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='risk_events' and column_name='user_id') then execute 'create index if not exists idx_risk_events_user_id on app_public.risk_events (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='risk_events' and column_name='email') then execute 'create index if not exists idx_risk_events_email on app_public.risk_events (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='risk_events' and column_name='status') then execute 'create index if not exists idx_risk_events_status on app_public.risk_events (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='risk_events' and column_name='event_type') then execute 'create index if not exists idx_risk_events_event_type on app_public.risk_events (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='risk_events' and column_name='source') then execute 'create index if not exists idx_risk_events_source on app_public.risk_events (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='risk_events' and column_name='source_event_id') then execute 'create index if not exists idx_risk_events_source_event_id on app_public.risk_events (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='risk_events' and column_name='checkout_session_id') then execute 'create index if not exists idx_risk_events_checkout_session_id on app_public.risk_events (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='risk_events' and column_name='stripe_event_id') then execute 'create index if not exists idx_risk_events_stripe_event_id on app_public.risk_events (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='risk_events' and column_name='cart_id') then execute 'create index if not exists idx_risk_events_cart_id on app_public.risk_events (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='risk_events' and column_name='order_ref') then execute 'create index if not exists idx_risk_events_order_ref on app_public.risk_events (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='risk_events' and column_name='product_id') then execute 'create index if not exists idx_risk_events_product_id on app_public.risk_events (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='risk_events' and column_name='variant_id') then execute 'create index if not exists idx_risk_events_variant_id on app_public.risk_events (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='risk_events' and column_name='campaign_id') then execute 'create index if not exists idx_risk_events_campaign_id on app_public.risk_events (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='risk_events' and column_name='affiliate_account_id') then execute 'create index if not exists idx_risk_events_affiliate_account_id on app_public.risk_events (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='risk_events' and column_name='referral_code') then execute 'create index if not exists idx_risk_events_referral_code on app_public.risk_events (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='risk_events' and column_name='created_at') then execute 'create index if not exists idx_risk_events_created_at on app_public.risk_events (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='device_fingerprints' and column_name='user_id') then execute 'create index if not exists idx_device_fingerprints_user_id on app_public.device_fingerprints (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='device_fingerprints' and column_name='email') then execute 'create index if not exists idx_device_fingerprints_email on app_public.device_fingerprints (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='device_fingerprints' and column_name='status') then execute 'create index if not exists idx_device_fingerprints_status on app_public.device_fingerprints (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='device_fingerprints' and column_name='event_type') then execute 'create index if not exists idx_device_fingerprints_event_type on app_public.device_fingerprints (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='device_fingerprints' and column_name='source') then execute 'create index if not exists idx_device_fingerprints_source on app_public.device_fingerprints (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='device_fingerprints' and column_name='source_event_id') then execute 'create index if not exists idx_device_fingerprints_source_event_id on app_public.device_fingerprints (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='device_fingerprints' and column_name='checkout_session_id') then execute 'create index if not exists idx_device_fingerprints_checkout_session_id on app_public.device_fingerprints (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='device_fingerprints' and column_name='stripe_event_id') then execute 'create index if not exists idx_device_fingerprints_stripe_event_id on app_public.device_fingerprints (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='device_fingerprints' and column_name='cart_id') then execute 'create index if not exists idx_device_fingerprints_cart_id on app_public.device_fingerprints (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='device_fingerprints' and column_name='order_ref') then execute 'create index if not exists idx_device_fingerprints_order_ref on app_public.device_fingerprints (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='device_fingerprints' and column_name='product_id') then execute 'create index if not exists idx_device_fingerprints_product_id on app_public.device_fingerprints (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='device_fingerprints' and column_name='variant_id') then execute 'create index if not exists idx_device_fingerprints_variant_id on app_public.device_fingerprints (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='device_fingerprints' and column_name='campaign_id') then execute 'create index if not exists idx_device_fingerprints_campaign_id on app_public.device_fingerprints (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='device_fingerprints' and column_name='affiliate_account_id') then execute 'create index if not exists idx_device_fingerprints_affiliate_account_id on app_public.device_fingerprints (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='device_fingerprints' and column_name='referral_code') then execute 'create index if not exists idx_device_fingerprints_referral_code on app_public.device_fingerprints (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='device_fingerprints' and column_name='created_at') then execute 'create index if not exists idx_device_fingerprints_created_at on app_public.device_fingerprints (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='captcha_verifications' and column_name='user_id') then execute 'create index if not exists idx_captcha_verifications_user_id on app_public.captcha_verifications (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='captcha_verifications' and column_name='email') then execute 'create index if not exists idx_captcha_verifications_email on app_public.captcha_verifications (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='captcha_verifications' and column_name='status') then execute 'create index if not exists idx_captcha_verifications_status on app_public.captcha_verifications (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='captcha_verifications' and column_name='event_type') then execute 'create index if not exists idx_captcha_verifications_event_type on app_public.captcha_verifications (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='captcha_verifications' and column_name='source') then execute 'create index if not exists idx_captcha_verifications_source on app_public.captcha_verifications (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='captcha_verifications' and column_name='source_event_id') then execute 'create index if not exists idx_captcha_verifications_source_event_id on app_public.captcha_verifications (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='captcha_verifications' and column_name='checkout_session_id') then execute 'create index if not exists idx_captcha_verifications_checkout_session_id on app_public.captcha_verifications (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='captcha_verifications' and column_name='stripe_event_id') then execute 'create index if not exists idx_captcha_verifications_stripe_event_id on app_public.captcha_verifications (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='captcha_verifications' and column_name='cart_id') then execute 'create index if not exists idx_captcha_verifications_cart_id on app_public.captcha_verifications (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='captcha_verifications' and column_name='order_ref') then execute 'create index if not exists idx_captcha_verifications_order_ref on app_public.captcha_verifications (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='captcha_verifications' and column_name='product_id') then execute 'create index if not exists idx_captcha_verifications_product_id on app_public.captcha_verifications (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='captcha_verifications' and column_name='variant_id') then execute 'create index if not exists idx_captcha_verifications_variant_id on app_public.captcha_verifications (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='captcha_verifications' and column_name='campaign_id') then execute 'create index if not exists idx_captcha_verifications_campaign_id on app_public.captcha_verifications (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='captcha_verifications' and column_name='affiliate_account_id') then execute 'create index if not exists idx_captcha_verifications_affiliate_account_id on app_public.captcha_verifications (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='captcha_verifications' and column_name='referral_code') then execute 'create index if not exists idx_captcha_verifications_referral_code on app_public.captcha_verifications (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='captcha_verifications' and column_name='created_at') then execute 'create index if not exists idx_captcha_verifications_created_at on app_public.captcha_verifications (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='auth_security_events' and column_name='user_id') then execute 'create index if not exists idx_auth_security_events_user_id on app_public.auth_security_events (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='auth_security_events' and column_name='email') then execute 'create index if not exists idx_auth_security_events_email on app_public.auth_security_events (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='auth_security_events' and column_name='status') then execute 'create index if not exists idx_auth_security_events_status on app_public.auth_security_events (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='auth_security_events' and column_name='event_type') then execute 'create index if not exists idx_auth_security_events_event_type on app_public.auth_security_events (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='auth_security_events' and column_name='source') then execute 'create index if not exists idx_auth_security_events_source on app_public.auth_security_events (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='auth_security_events' and column_name='source_event_id') then execute 'create index if not exists idx_auth_security_events_source_event_id on app_public.auth_security_events (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='auth_security_events' and column_name='checkout_session_id') then execute 'create index if not exists idx_auth_security_events_checkout_session_id on app_public.auth_security_events (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='auth_security_events' and column_name='stripe_event_id') then execute 'create index if not exists idx_auth_security_events_stripe_event_id on app_public.auth_security_events (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='auth_security_events' and column_name='cart_id') then execute 'create index if not exists idx_auth_security_events_cart_id on app_public.auth_security_events (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='auth_security_events' and column_name='order_ref') then execute 'create index if not exists idx_auth_security_events_order_ref on app_public.auth_security_events (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='auth_security_events' and column_name='product_id') then execute 'create index if not exists idx_auth_security_events_product_id on app_public.auth_security_events (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='auth_security_events' and column_name='variant_id') then execute 'create index if not exists idx_auth_security_events_variant_id on app_public.auth_security_events (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='auth_security_events' and column_name='campaign_id') then execute 'create index if not exists idx_auth_security_events_campaign_id on app_public.auth_security_events (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='auth_security_events' and column_name='affiliate_account_id') then execute 'create index if not exists idx_auth_security_events_affiliate_account_id on app_public.auth_security_events (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='auth_security_events' and column_name='referral_code') then execute 'create index if not exists idx_auth_security_events_referral_code on app_public.auth_security_events (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='auth_security_events' and column_name='created_at') then execute 'create index if not exists idx_auth_security_events_created_at on app_public.auth_security_events (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='compliance_checks' and column_name='user_id') then execute 'create index if not exists idx_compliance_checks_user_id on app_public.compliance_checks (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='compliance_checks' and column_name='email') then execute 'create index if not exists idx_compliance_checks_email on app_public.compliance_checks (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='compliance_checks' and column_name='status') then execute 'create index if not exists idx_compliance_checks_status on app_public.compliance_checks (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='compliance_checks' and column_name='event_type') then execute 'create index if not exists idx_compliance_checks_event_type on app_public.compliance_checks (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='compliance_checks' and column_name='source') then execute 'create index if not exists idx_compliance_checks_source on app_public.compliance_checks (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='compliance_checks' and column_name='source_event_id') then execute 'create index if not exists idx_compliance_checks_source_event_id on app_public.compliance_checks (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='compliance_checks' and column_name='checkout_session_id') then execute 'create index if not exists idx_compliance_checks_checkout_session_id on app_public.compliance_checks (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='compliance_checks' and column_name='stripe_event_id') then execute 'create index if not exists idx_compliance_checks_stripe_event_id on app_public.compliance_checks (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='compliance_checks' and column_name='cart_id') then execute 'create index if not exists idx_compliance_checks_cart_id on app_public.compliance_checks (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='compliance_checks' and column_name='order_ref') then execute 'create index if not exists idx_compliance_checks_order_ref on app_public.compliance_checks (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='compliance_checks' and column_name='product_id') then execute 'create index if not exists idx_compliance_checks_product_id on app_public.compliance_checks (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='compliance_checks' and column_name='variant_id') then execute 'create index if not exists idx_compliance_checks_variant_id on app_public.compliance_checks (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='compliance_checks' and column_name='campaign_id') then execute 'create index if not exists idx_compliance_checks_campaign_id on app_public.compliance_checks (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='compliance_checks' and column_name='affiliate_account_id') then execute 'create index if not exists idx_compliance_checks_affiliate_account_id on app_public.compliance_checks (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='compliance_checks' and column_name='referral_code') then execute 'create index if not exists idx_compliance_checks_referral_code on app_public.compliance_checks (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='compliance_checks' and column_name='created_at') then execute 'create index if not exists idx_compliance_checks_created_at on app_public.compliance_checks (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='sanctions_screening_events' and column_name='user_id') then execute 'create index if not exists idx_sanctions_screening_events_user_id on app_public.sanctions_screening_events (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='sanctions_screening_events' and column_name='email') then execute 'create index if not exists idx_sanctions_screening_events_email on app_public.sanctions_screening_events (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='sanctions_screening_events' and column_name='status') then execute 'create index if not exists idx_sanctions_screening_events_status on app_public.sanctions_screening_events (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='sanctions_screening_events' and column_name='event_type') then execute 'create index if not exists idx_sanctions_screening_events_event_type on app_public.sanctions_screening_events (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='sanctions_screening_events' and column_name='source') then execute 'create index if not exists idx_sanctions_screening_events_source on app_public.sanctions_screening_events (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='sanctions_screening_events' and column_name='source_event_id') then execute 'create index if not exists idx_sanctions_screening_events_source_event_id on app_public.sanctions_screening_events (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='sanctions_screening_events' and column_name='checkout_session_id') then execute 'create index if not exists idx_sanctions_screening_events_checkout_session_id on app_public.sanctions_screening_events (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='sanctions_screening_events' and column_name='stripe_event_id') then execute 'create index if not exists idx_sanctions_screening_events_stripe_event_id on app_public.sanctions_screening_events (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='sanctions_screening_events' and column_name='cart_id') then execute 'create index if not exists idx_sanctions_screening_events_cart_id on app_public.sanctions_screening_events (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='sanctions_screening_events' and column_name='order_ref') then execute 'create index if not exists idx_sanctions_screening_events_order_ref on app_public.sanctions_screening_events (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='sanctions_screening_events' and column_name='product_id') then execute 'create index if not exists idx_sanctions_screening_events_product_id on app_public.sanctions_screening_events (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='sanctions_screening_events' and column_name='variant_id') then execute 'create index if not exists idx_sanctions_screening_events_variant_id on app_public.sanctions_screening_events (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='sanctions_screening_events' and column_name='campaign_id') then execute 'create index if not exists idx_sanctions_screening_events_campaign_id on app_public.sanctions_screening_events (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='sanctions_screening_events' and column_name='affiliate_account_id') then execute 'create index if not exists idx_sanctions_screening_events_affiliate_account_id on app_public.sanctions_screening_events (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='sanctions_screening_events' and column_name='referral_code') then execute 'create index if not exists idx_sanctions_screening_events_referral_code on app_public.sanctions_screening_events (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='sanctions_screening_events' and column_name='created_at') then execute 'create index if not exists idx_sanctions_screening_events_created_at on app_public.sanctions_screening_events (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='geo_policy_events' and column_name='user_id') then execute 'create index if not exists idx_geo_policy_events_user_id on app_public.geo_policy_events (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='geo_policy_events' and column_name='email') then execute 'create index if not exists idx_geo_policy_events_email on app_public.geo_policy_events (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='geo_policy_events' and column_name='status') then execute 'create index if not exists idx_geo_policy_events_status on app_public.geo_policy_events (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='geo_policy_events' and column_name='event_type') then execute 'create index if not exists idx_geo_policy_events_event_type on app_public.geo_policy_events (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='geo_policy_events' and column_name='source') then execute 'create index if not exists idx_geo_policy_events_source on app_public.geo_policy_events (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='geo_policy_events' and column_name='source_event_id') then execute 'create index if not exists idx_geo_policy_events_source_event_id on app_public.geo_policy_events (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='geo_policy_events' and column_name='checkout_session_id') then execute 'create index if not exists idx_geo_policy_events_checkout_session_id on app_public.geo_policy_events (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='geo_policy_events' and column_name='stripe_event_id') then execute 'create index if not exists idx_geo_policy_events_stripe_event_id on app_public.geo_policy_events (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='geo_policy_events' and column_name='cart_id') then execute 'create index if not exists idx_geo_policy_events_cart_id on app_public.geo_policy_events (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='geo_policy_events' and column_name='order_ref') then execute 'create index if not exists idx_geo_policy_events_order_ref on app_public.geo_policy_events (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='geo_policy_events' and column_name='product_id') then execute 'create index if not exists idx_geo_policy_events_product_id on app_public.geo_policy_events (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='geo_policy_events' and column_name='variant_id') then execute 'create index if not exists idx_geo_policy_events_variant_id on app_public.geo_policy_events (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='geo_policy_events' and column_name='campaign_id') then execute 'create index if not exists idx_geo_policy_events_campaign_id on app_public.geo_policy_events (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='geo_policy_events' and column_name='affiliate_account_id') then execute 'create index if not exists idx_geo_policy_events_affiliate_account_id on app_public.geo_policy_events (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='geo_policy_events' and column_name='referral_code') then execute 'create index if not exists idx_geo_policy_events_referral_code on app_public.geo_policy_events (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='geo_policy_events' and column_name='created_at') then execute 'create index if not exists idx_geo_policy_events_created_at on app_public.geo_policy_events (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='audit_logs' and column_name='user_id') then execute 'create index if not exists idx_audit_logs_user_id on app_public.audit_logs (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='audit_logs' and column_name='email') then execute 'create index if not exists idx_audit_logs_email on app_public.audit_logs (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='audit_logs' and column_name='status') then execute 'create index if not exists idx_audit_logs_status on app_public.audit_logs (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='audit_logs' and column_name='event_type') then execute 'create index if not exists idx_audit_logs_event_type on app_public.audit_logs (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='audit_logs' and column_name='source') then execute 'create index if not exists idx_audit_logs_source on app_public.audit_logs (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='audit_logs' and column_name='source_event_id') then execute 'create index if not exists idx_audit_logs_source_event_id on app_public.audit_logs (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='audit_logs' and column_name='checkout_session_id') then execute 'create index if not exists idx_audit_logs_checkout_session_id on app_public.audit_logs (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='audit_logs' and column_name='stripe_event_id') then execute 'create index if not exists idx_audit_logs_stripe_event_id on app_public.audit_logs (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='audit_logs' and column_name='cart_id') then execute 'create index if not exists idx_audit_logs_cart_id on app_public.audit_logs (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='audit_logs' and column_name='order_ref') then execute 'create index if not exists idx_audit_logs_order_ref on app_public.audit_logs (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='audit_logs' and column_name='product_id') then execute 'create index if not exists idx_audit_logs_product_id on app_public.audit_logs (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='audit_logs' and column_name='variant_id') then execute 'create index if not exists idx_audit_logs_variant_id on app_public.audit_logs (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='audit_logs' and column_name='campaign_id') then execute 'create index if not exists idx_audit_logs_campaign_id on app_public.audit_logs (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='audit_logs' and column_name='affiliate_account_id') then execute 'create index if not exists idx_audit_logs_affiliate_account_id on app_public.audit_logs (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='audit_logs' and column_name='referral_code') then execute 'create index if not exists idx_audit_logs_referral_code on app_public.audit_logs (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='audit_logs' and column_name='created_at') then execute 'create index if not exists idx_audit_logs_created_at on app_public.audit_logs (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_settings' and column_name='user_id') then execute 'create index if not exists idx_system_settings_user_id on app_public.system_settings (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_settings' and column_name='email') then execute 'create index if not exists idx_system_settings_email on app_public.system_settings (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_settings' and column_name='status') then execute 'create index if not exists idx_system_settings_status on app_public.system_settings (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_settings' and column_name='event_type') then execute 'create index if not exists idx_system_settings_event_type on app_public.system_settings (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_settings' and column_name='source') then execute 'create index if not exists idx_system_settings_source on app_public.system_settings (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_settings' and column_name='source_event_id') then execute 'create index if not exists idx_system_settings_source_event_id on app_public.system_settings (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_settings' and column_name='checkout_session_id') then execute 'create index if not exists idx_system_settings_checkout_session_id on app_public.system_settings (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_settings' and column_name='stripe_event_id') then execute 'create index if not exists idx_system_settings_stripe_event_id on app_public.system_settings (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_settings' and column_name='cart_id') then execute 'create index if not exists idx_system_settings_cart_id on app_public.system_settings (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_settings' and column_name='order_ref') then execute 'create index if not exists idx_system_settings_order_ref on app_public.system_settings (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_settings' and column_name='product_id') then execute 'create index if not exists idx_system_settings_product_id on app_public.system_settings (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_settings' and column_name='variant_id') then execute 'create index if not exists idx_system_settings_variant_id on app_public.system_settings (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_settings' and column_name='campaign_id') then execute 'create index if not exists idx_system_settings_campaign_id on app_public.system_settings (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_settings' and column_name='affiliate_account_id') then execute 'create index if not exists idx_system_settings_affiliate_account_id on app_public.system_settings (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_settings' and column_name='referral_code') then execute 'create index if not exists idx_system_settings_referral_code on app_public.system_settings (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_settings' and column_name='created_at') then execute 'create index if not exists idx_system_settings_created_at on app_public.system_settings (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_readiness_checks' and column_name='user_id') then execute 'create index if not exists idx_system_readiness_checks_user_id on app_public.system_readiness_checks (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_readiness_checks' and column_name='email') then execute 'create index if not exists idx_system_readiness_checks_email on app_public.system_readiness_checks (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_readiness_checks' and column_name='status') then execute 'create index if not exists idx_system_readiness_checks_status on app_public.system_readiness_checks (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_readiness_checks' and column_name='event_type') then execute 'create index if not exists idx_system_readiness_checks_event_type on app_public.system_readiness_checks (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_readiness_checks' and column_name='source') then execute 'create index if not exists idx_system_readiness_checks_source on app_public.system_readiness_checks (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_readiness_checks' and column_name='source_event_id') then execute 'create index if not exists idx_system_readiness_checks_source_event_id on app_public.system_readiness_checks (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_readiness_checks' and column_name='checkout_session_id') then execute 'create index if not exists idx_system_readiness_checks_checkout_session_id on app_public.system_readiness_checks (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_readiness_checks' and column_name='stripe_event_id') then execute 'create index if not exists idx_system_readiness_checks_stripe_event_id on app_public.system_readiness_checks (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_readiness_checks' and column_name='cart_id') then execute 'create index if not exists idx_system_readiness_checks_cart_id on app_public.system_readiness_checks (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_readiness_checks' and column_name='order_ref') then execute 'create index if not exists idx_system_readiness_checks_order_ref on app_public.system_readiness_checks (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_readiness_checks' and column_name='product_id') then execute 'create index if not exists idx_system_readiness_checks_product_id on app_public.system_readiness_checks (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_readiness_checks' and column_name='variant_id') then execute 'create index if not exists idx_system_readiness_checks_variant_id on app_public.system_readiness_checks (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_readiness_checks' and column_name='campaign_id') then execute 'create index if not exists idx_system_readiness_checks_campaign_id on app_public.system_readiness_checks (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_readiness_checks' and column_name='affiliate_account_id') then execute 'create index if not exists idx_system_readiness_checks_affiliate_account_id on app_public.system_readiness_checks (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_readiness_checks' and column_name='referral_code') then execute 'create index if not exists idx_system_readiness_checks_referral_code on app_public.system_readiness_checks (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_readiness_checks' and column_name='created_at') then execute 'create index if not exists idx_system_readiness_checks_created_at on app_public.system_readiness_checks (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='background_jobs' and column_name='user_id') then execute 'create index if not exists idx_background_jobs_user_id on app_public.background_jobs (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='background_jobs' and column_name='email') then execute 'create index if not exists idx_background_jobs_email on app_public.background_jobs (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='background_jobs' and column_name='status') then execute 'create index if not exists idx_background_jobs_status on app_public.background_jobs (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='background_jobs' and column_name='event_type') then execute 'create index if not exists idx_background_jobs_event_type on app_public.background_jobs (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='background_jobs' and column_name='source') then execute 'create index if not exists idx_background_jobs_source on app_public.background_jobs (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='background_jobs' and column_name='source_event_id') then execute 'create index if not exists idx_background_jobs_source_event_id on app_public.background_jobs (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='background_jobs' and column_name='checkout_session_id') then execute 'create index if not exists idx_background_jobs_checkout_session_id on app_public.background_jobs (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='background_jobs' and column_name='stripe_event_id') then execute 'create index if not exists idx_background_jobs_stripe_event_id on app_public.background_jobs (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='background_jobs' and column_name='cart_id') then execute 'create index if not exists idx_background_jobs_cart_id on app_public.background_jobs (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='background_jobs' and column_name='order_ref') then execute 'create index if not exists idx_background_jobs_order_ref on app_public.background_jobs (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='background_jobs' and column_name='product_id') then execute 'create index if not exists idx_background_jobs_product_id on app_public.background_jobs (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='background_jobs' and column_name='variant_id') then execute 'create index if not exists idx_background_jobs_variant_id on app_public.background_jobs (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='background_jobs' and column_name='campaign_id') then execute 'create index if not exists idx_background_jobs_campaign_id on app_public.background_jobs (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='background_jobs' and column_name='affiliate_account_id') then execute 'create index if not exists idx_background_jobs_affiliate_account_id on app_public.background_jobs (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='background_jobs' and column_name='referral_code') then execute 'create index if not exists idx_background_jobs_referral_code on app_public.background_jobs (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='background_jobs' and column_name='created_at') then execute 'create index if not exists idx_background_jobs_created_at on app_public.background_jobs (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='webhook_delivery_attempts' and column_name='user_id') then execute 'create index if not exists idx_webhook_delivery_attempts_user_id on app_public.webhook_delivery_attempts (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='webhook_delivery_attempts' and column_name='email') then execute 'create index if not exists idx_webhook_delivery_attempts_email on app_public.webhook_delivery_attempts (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='webhook_delivery_attempts' and column_name='status') then execute 'create index if not exists idx_webhook_delivery_attempts_status on app_public.webhook_delivery_attempts (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='webhook_delivery_attempts' and column_name='event_type') then execute 'create index if not exists idx_webhook_delivery_attempts_event_type on app_public.webhook_delivery_attempts (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='webhook_delivery_attempts' and column_name='source') then execute 'create index if not exists idx_webhook_delivery_attempts_source on app_public.webhook_delivery_attempts (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='webhook_delivery_attempts' and column_name='source_event_id') then execute 'create index if not exists idx_webhook_delivery_attempts_source_event_id on app_public.webhook_delivery_attempts (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='webhook_delivery_attempts' and column_name='checkout_session_id') then execute 'create index if not exists idx_webhook_delivery_attempts_checkout_session_id on app_public.webhook_delivery_attempts (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='webhook_delivery_attempts' and column_name='stripe_event_id') then execute 'create index if not exists idx_webhook_delivery_attempts_stripe_event_id on app_public.webhook_delivery_attempts (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='webhook_delivery_attempts' and column_name='cart_id') then execute 'create index if not exists idx_webhook_delivery_attempts_cart_id on app_public.webhook_delivery_attempts (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='webhook_delivery_attempts' and column_name='order_ref') then execute 'create index if not exists idx_webhook_delivery_attempts_order_ref on app_public.webhook_delivery_attempts (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='webhook_delivery_attempts' and column_name='product_id') then execute 'create index if not exists idx_webhook_delivery_attempts_product_id on app_public.webhook_delivery_attempts (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='webhook_delivery_attempts' and column_name='variant_id') then execute 'create index if not exists idx_webhook_delivery_attempts_variant_id on app_public.webhook_delivery_attempts (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='webhook_delivery_attempts' and column_name='campaign_id') then execute 'create index if not exists idx_webhook_delivery_attempts_campaign_id on app_public.webhook_delivery_attempts (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='webhook_delivery_attempts' and column_name='affiliate_account_id') then execute 'create index if not exists idx_webhook_delivery_attempts_affiliate_account_id on app_public.webhook_delivery_attempts (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='webhook_delivery_attempts' and column_name='referral_code') then execute 'create index if not exists idx_webhook_delivery_attempts_referral_code on app_public.webhook_delivery_attempts (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='webhook_delivery_attempts' and column_name='created_at') then execute 'create index if not exists idx_webhook_delivery_attempts_created_at on app_public.webhook_delivery_attempts (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_campaigns' and column_name='user_id') then execute 'create index if not exists idx_ai_story_campaigns_user_id on app_public.ai_story_campaigns (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_campaigns' and column_name='email') then execute 'create index if not exists idx_ai_story_campaigns_email on app_public.ai_story_campaigns (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_campaigns' and column_name='status') then execute 'create index if not exists idx_ai_story_campaigns_status on app_public.ai_story_campaigns (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_campaigns' and column_name='event_type') then execute 'create index if not exists idx_ai_story_campaigns_event_type on app_public.ai_story_campaigns (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_campaigns' and column_name='source') then execute 'create index if not exists idx_ai_story_campaigns_source on app_public.ai_story_campaigns (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_campaigns' and column_name='source_event_id') then execute 'create index if not exists idx_ai_story_campaigns_source_event_id on app_public.ai_story_campaigns (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_campaigns' and column_name='checkout_session_id') then execute 'create index if not exists idx_ai_story_campaigns_checkout_session_id on app_public.ai_story_campaigns (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_campaigns' and column_name='stripe_event_id') then execute 'create index if not exists idx_ai_story_campaigns_stripe_event_id on app_public.ai_story_campaigns (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_campaigns' and column_name='cart_id') then execute 'create index if not exists idx_ai_story_campaigns_cart_id on app_public.ai_story_campaigns (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_campaigns' and column_name='order_ref') then execute 'create index if not exists idx_ai_story_campaigns_order_ref on app_public.ai_story_campaigns (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_campaigns' and column_name='product_id') then execute 'create index if not exists idx_ai_story_campaigns_product_id on app_public.ai_story_campaigns (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_campaigns' and column_name='variant_id') then execute 'create index if not exists idx_ai_story_campaigns_variant_id on app_public.ai_story_campaigns (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_campaigns' and column_name='campaign_id') then execute 'create index if not exists idx_ai_story_campaigns_campaign_id on app_public.ai_story_campaigns (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_campaigns' and column_name='affiliate_account_id') then execute 'create index if not exists idx_ai_story_campaigns_affiliate_account_id on app_public.ai_story_campaigns (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_campaigns' and column_name='referral_code') then execute 'create index if not exists idx_ai_story_campaigns_referral_code on app_public.ai_story_campaigns (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_story_campaigns' and column_name='created_at') then execute 'create index if not exists idx_ai_story_campaigns_created_at on app_public.ai_story_campaigns (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_settlements' and column_name='user_id') then execute 'create index if not exists idx_checkout_settlements_user_id on app_public.checkout_settlements (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_settlements' and column_name='email') then execute 'create index if not exists idx_checkout_settlements_email on app_public.checkout_settlements (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_settlements' and column_name='status') then execute 'create index if not exists idx_checkout_settlements_status on app_public.checkout_settlements (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_settlements' and column_name='event_type') then execute 'create index if not exists idx_checkout_settlements_event_type on app_public.checkout_settlements (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_settlements' and column_name='source') then execute 'create index if not exists idx_checkout_settlements_source on app_public.checkout_settlements (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_settlements' and column_name='source_event_id') then execute 'create index if not exists idx_checkout_settlements_source_event_id on app_public.checkout_settlements (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_settlements' and column_name='checkout_session_id') then execute 'create index if not exists idx_checkout_settlements_checkout_session_id on app_public.checkout_settlements (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_settlements' and column_name='stripe_event_id') then execute 'create index if not exists idx_checkout_settlements_stripe_event_id on app_public.checkout_settlements (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_settlements' and column_name='cart_id') then execute 'create index if not exists idx_checkout_settlements_cart_id on app_public.checkout_settlements (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_settlements' and column_name='order_ref') then execute 'create index if not exists idx_checkout_settlements_order_ref on app_public.checkout_settlements (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_settlements' and column_name='product_id') then execute 'create index if not exists idx_checkout_settlements_product_id on app_public.checkout_settlements (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_settlements' and column_name='variant_id') then execute 'create index if not exists idx_checkout_settlements_variant_id on app_public.checkout_settlements (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_settlements' and column_name='campaign_id') then execute 'create index if not exists idx_checkout_settlements_campaign_id on app_public.checkout_settlements (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_settlements' and column_name='affiliate_account_id') then execute 'create index if not exists idx_checkout_settlements_affiliate_account_id on app_public.checkout_settlements (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_settlements' and column_name='referral_code') then execute 'create index if not exists idx_checkout_settlements_referral_code on app_public.checkout_settlements (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='checkout_settlements' and column_name='created_at') then execute 'create index if not exists idx_checkout_settlements_created_at on app_public.checkout_settlements (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_fulfillment_sync' and column_name='user_id') then execute 'create index if not exists idx_commerce_fulfillment_sync_user_id on app_public.commerce_fulfillment_sync (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_fulfillment_sync' and column_name='email') then execute 'create index if not exists idx_commerce_fulfillment_sync_email on app_public.commerce_fulfillment_sync (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_fulfillment_sync' and column_name='status') then execute 'create index if not exists idx_commerce_fulfillment_sync_status on app_public.commerce_fulfillment_sync (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_fulfillment_sync' and column_name='event_type') then execute 'create index if not exists idx_commerce_fulfillment_sync_event_type on app_public.commerce_fulfillment_sync (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_fulfillment_sync' and column_name='source') then execute 'create index if not exists idx_commerce_fulfillment_sync_source on app_public.commerce_fulfillment_sync (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_fulfillment_sync' and column_name='source_event_id') then execute 'create index if not exists idx_commerce_fulfillment_sync_source_event_id on app_public.commerce_fulfillment_sync (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_fulfillment_sync' and column_name='checkout_session_id') then execute 'create index if not exists idx_commerce_fulfillment_sync_checkout_session_id on app_public.commerce_fulfillment_sync (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_fulfillment_sync' and column_name='stripe_event_id') then execute 'create index if not exists idx_commerce_fulfillment_sync_stripe_event_id on app_public.commerce_fulfillment_sync (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_fulfillment_sync' and column_name='cart_id') then execute 'create index if not exists idx_commerce_fulfillment_sync_cart_id on app_public.commerce_fulfillment_sync (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_fulfillment_sync' and column_name='order_ref') then execute 'create index if not exists idx_commerce_fulfillment_sync_order_ref on app_public.commerce_fulfillment_sync (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_fulfillment_sync' and column_name='product_id') then execute 'create index if not exists idx_commerce_fulfillment_sync_product_id on app_public.commerce_fulfillment_sync (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_fulfillment_sync' and column_name='variant_id') then execute 'create index if not exists idx_commerce_fulfillment_sync_variant_id on app_public.commerce_fulfillment_sync (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_fulfillment_sync' and column_name='campaign_id') then execute 'create index if not exists idx_commerce_fulfillment_sync_campaign_id on app_public.commerce_fulfillment_sync (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_fulfillment_sync' and column_name='affiliate_account_id') then execute 'create index if not exists idx_commerce_fulfillment_sync_affiliate_account_id on app_public.commerce_fulfillment_sync (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_fulfillment_sync' and column_name='referral_code') then execute 'create index if not exists idx_commerce_fulfillment_sync_referral_code on app_public.commerce_fulfillment_sync (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_fulfillment_sync' and column_name='created_at') then execute 'create index if not exists idx_commerce_fulfillment_sync_created_at on app_public.commerce_fulfillment_sync (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_sync' and column_name='user_id') then execute 'create index if not exists idx_commerce_order_sync_user_id on app_public.commerce_order_sync (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_sync' and column_name='email') then execute 'create index if not exists idx_commerce_order_sync_email on app_public.commerce_order_sync (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_sync' and column_name='status') then execute 'create index if not exists idx_commerce_order_sync_status on app_public.commerce_order_sync (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_sync' and column_name='event_type') then execute 'create index if not exists idx_commerce_order_sync_event_type on app_public.commerce_order_sync (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_sync' and column_name='source') then execute 'create index if not exists idx_commerce_order_sync_source on app_public.commerce_order_sync (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_sync' and column_name='source_event_id') then execute 'create index if not exists idx_commerce_order_sync_source_event_id on app_public.commerce_order_sync (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_sync' and column_name='checkout_session_id') then execute 'create index if not exists idx_commerce_order_sync_checkout_session_id on app_public.commerce_order_sync (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_sync' and column_name='stripe_event_id') then execute 'create index if not exists idx_commerce_order_sync_stripe_event_id on app_public.commerce_order_sync (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_sync' and column_name='cart_id') then execute 'create index if not exists idx_commerce_order_sync_cart_id on app_public.commerce_order_sync (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_sync' and column_name='order_ref') then execute 'create index if not exists idx_commerce_order_sync_order_ref on app_public.commerce_order_sync (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_sync' and column_name='product_id') then execute 'create index if not exists idx_commerce_order_sync_product_id on app_public.commerce_order_sync (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_sync' and column_name='variant_id') then execute 'create index if not exists idx_commerce_order_sync_variant_id on app_public.commerce_order_sync (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_sync' and column_name='campaign_id') then execute 'create index if not exists idx_commerce_order_sync_campaign_id on app_public.commerce_order_sync (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_sync' and column_name='affiliate_account_id') then execute 'create index if not exists idx_commerce_order_sync_affiliate_account_id on app_public.commerce_order_sync (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_sync' and column_name='referral_code') then execute 'create index if not exists idx_commerce_order_sync_referral_code on app_public.commerce_order_sync (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_order_sync' and column_name='created_at') then execute 'create index if not exists idx_commerce_order_sync_created_at on app_public.commerce_order_sync (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_product_sync' and column_name='user_id') then execute 'create index if not exists idx_commerce_product_sync_user_id on app_public.commerce_product_sync (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_product_sync' and column_name='email') then execute 'create index if not exists idx_commerce_product_sync_email on app_public.commerce_product_sync (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_product_sync' and column_name='status') then execute 'create index if not exists idx_commerce_product_sync_status on app_public.commerce_product_sync (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_product_sync' and column_name='event_type') then execute 'create index if not exists idx_commerce_product_sync_event_type on app_public.commerce_product_sync (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_product_sync' and column_name='source') then execute 'create index if not exists idx_commerce_product_sync_source on app_public.commerce_product_sync (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_product_sync' and column_name='source_event_id') then execute 'create index if not exists idx_commerce_product_sync_source_event_id on app_public.commerce_product_sync (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_product_sync' and column_name='checkout_session_id') then execute 'create index if not exists idx_commerce_product_sync_checkout_session_id on app_public.commerce_product_sync (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_product_sync' and column_name='stripe_event_id') then execute 'create index if not exists idx_commerce_product_sync_stripe_event_id on app_public.commerce_product_sync (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_product_sync' and column_name='cart_id') then execute 'create index if not exists idx_commerce_product_sync_cart_id on app_public.commerce_product_sync (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_product_sync' and column_name='order_ref') then execute 'create index if not exists idx_commerce_product_sync_order_ref on app_public.commerce_product_sync (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_product_sync' and column_name='product_id') then execute 'create index if not exists idx_commerce_product_sync_product_id on app_public.commerce_product_sync (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_product_sync' and column_name='variant_id') then execute 'create index if not exists idx_commerce_product_sync_variant_id on app_public.commerce_product_sync (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_product_sync' and column_name='campaign_id') then execute 'create index if not exists idx_commerce_product_sync_campaign_id on app_public.commerce_product_sync (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_product_sync' and column_name='affiliate_account_id') then execute 'create index if not exists idx_commerce_product_sync_affiliate_account_id on app_public.commerce_product_sync (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_product_sync' and column_name='referral_code') then execute 'create index if not exists idx_commerce_product_sync_referral_code on app_public.commerce_product_sync (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_product_sync' and column_name='created_at') then execute 'create index if not exists idx_commerce_product_sync_created_at on app_public.commerce_product_sync (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_settlements' and column_name='user_id') then execute 'create index if not exists idx_commerce_settlements_user_id on app_public.commerce_settlements (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_settlements' and column_name='email') then execute 'create index if not exists idx_commerce_settlements_email on app_public.commerce_settlements (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_settlements' and column_name='status') then execute 'create index if not exists idx_commerce_settlements_status on app_public.commerce_settlements (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_settlements' and column_name='event_type') then execute 'create index if not exists idx_commerce_settlements_event_type on app_public.commerce_settlements (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_settlements' and column_name='source') then execute 'create index if not exists idx_commerce_settlements_source on app_public.commerce_settlements (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_settlements' and column_name='source_event_id') then execute 'create index if not exists idx_commerce_settlements_source_event_id on app_public.commerce_settlements (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_settlements' and column_name='checkout_session_id') then execute 'create index if not exists idx_commerce_settlements_checkout_session_id on app_public.commerce_settlements (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_settlements' and column_name='stripe_event_id') then execute 'create index if not exists idx_commerce_settlements_stripe_event_id on app_public.commerce_settlements (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_settlements' and column_name='cart_id') then execute 'create index if not exists idx_commerce_settlements_cart_id on app_public.commerce_settlements (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_settlements' and column_name='order_ref') then execute 'create index if not exists idx_commerce_settlements_order_ref on app_public.commerce_settlements (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_settlements' and column_name='product_id') then execute 'create index if not exists idx_commerce_settlements_product_id on app_public.commerce_settlements (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_settlements' and column_name='variant_id') then execute 'create index if not exists idx_commerce_settlements_variant_id on app_public.commerce_settlements (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_settlements' and column_name='campaign_id') then execute 'create index if not exists idx_commerce_settlements_campaign_id on app_public.commerce_settlements (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_settlements' and column_name='affiliate_account_id') then execute 'create index if not exists idx_commerce_settlements_affiliate_account_id on app_public.commerce_settlements (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_settlements' and column_name='referral_code') then execute 'create index if not exists idx_commerce_settlements_referral_code on app_public.commerce_settlements (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_settlements' and column_name='created_at') then execute 'create index if not exists idx_commerce_settlements_created_at on app_public.commerce_settlements (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_variant_sync' and column_name='user_id') then execute 'create index if not exists idx_commerce_variant_sync_user_id on app_public.commerce_variant_sync (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_variant_sync' and column_name='email') then execute 'create index if not exists idx_commerce_variant_sync_email on app_public.commerce_variant_sync (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_variant_sync' and column_name='status') then execute 'create index if not exists idx_commerce_variant_sync_status on app_public.commerce_variant_sync (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_variant_sync' and column_name='event_type') then execute 'create index if not exists idx_commerce_variant_sync_event_type on app_public.commerce_variant_sync (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_variant_sync' and column_name='source') then execute 'create index if not exists idx_commerce_variant_sync_source on app_public.commerce_variant_sync (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_variant_sync' and column_name='source_event_id') then execute 'create index if not exists idx_commerce_variant_sync_source_event_id on app_public.commerce_variant_sync (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_variant_sync' and column_name='checkout_session_id') then execute 'create index if not exists idx_commerce_variant_sync_checkout_session_id on app_public.commerce_variant_sync (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_variant_sync' and column_name='stripe_event_id') then execute 'create index if not exists idx_commerce_variant_sync_stripe_event_id on app_public.commerce_variant_sync (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_variant_sync' and column_name='cart_id') then execute 'create index if not exists idx_commerce_variant_sync_cart_id on app_public.commerce_variant_sync (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_variant_sync' and column_name='order_ref') then execute 'create index if not exists idx_commerce_variant_sync_order_ref on app_public.commerce_variant_sync (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_variant_sync' and column_name='product_id') then execute 'create index if not exists idx_commerce_variant_sync_product_id on app_public.commerce_variant_sync (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_variant_sync' and column_name='variant_id') then execute 'create index if not exists idx_commerce_variant_sync_variant_id on app_public.commerce_variant_sync (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_variant_sync' and column_name='campaign_id') then execute 'create index if not exists idx_commerce_variant_sync_campaign_id on app_public.commerce_variant_sync (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_variant_sync' and column_name='affiliate_account_id') then execute 'create index if not exists idx_commerce_variant_sync_affiliate_account_id on app_public.commerce_variant_sync (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_variant_sync' and column_name='referral_code') then execute 'create index if not exists idx_commerce_variant_sync_referral_code on app_public.commerce_variant_sync (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='commerce_variant_sync' and column_name='created_at') then execute 'create index if not exists idx_commerce_variant_sync_created_at on app_public.commerce_variant_sync (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='health_check' and column_name='user_id') then execute 'create index if not exists idx_health_check_user_id on app_public.health_check (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='health_check' and column_name='email') then execute 'create index if not exists idx_health_check_email on app_public.health_check (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='health_check' and column_name='status') then execute 'create index if not exists idx_health_check_status on app_public.health_check (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='health_check' and column_name='event_type') then execute 'create index if not exists idx_health_check_event_type on app_public.health_check (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='health_check' and column_name='source') then execute 'create index if not exists idx_health_check_source on app_public.health_check (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='health_check' and column_name='source_event_id') then execute 'create index if not exists idx_health_check_source_event_id on app_public.health_check (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='health_check' and column_name='checkout_session_id') then execute 'create index if not exists idx_health_check_checkout_session_id on app_public.health_check (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='health_check' and column_name='stripe_event_id') then execute 'create index if not exists idx_health_check_stripe_event_id on app_public.health_check (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='health_check' and column_name='cart_id') then execute 'create index if not exists idx_health_check_cart_id on app_public.health_check (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='health_check' and column_name='order_ref') then execute 'create index if not exists idx_health_check_order_ref on app_public.health_check (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='health_check' and column_name='product_id') then execute 'create index if not exists idx_health_check_product_id on app_public.health_check (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='health_check' and column_name='variant_id') then execute 'create index if not exists idx_health_check_variant_id on app_public.health_check (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='health_check' and column_name='campaign_id') then execute 'create index if not exists idx_health_check_campaign_id on app_public.health_check (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='health_check' and column_name='affiliate_account_id') then execute 'create index if not exists idx_health_check_affiliate_account_id on app_public.health_check (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='health_check' and column_name='referral_code') then execute 'create index if not exists idx_health_check_referral_code on app_public.health_check (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='health_check' and column_name='created_at') then execute 'create index if not exists idx_health_check_created_at on app_public.health_check (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='intelligence_audit_traces' and column_name='user_id') then execute 'create index if not exists idx_intelligence_audit_traces_user_id on app_public.intelligence_audit_traces (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='intelligence_audit_traces' and column_name='email') then execute 'create index if not exists idx_intelligence_audit_traces_email on app_public.intelligence_audit_traces (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='intelligence_audit_traces' and column_name='status') then execute 'create index if not exists idx_intelligence_audit_traces_status on app_public.intelligence_audit_traces (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='intelligence_audit_traces' and column_name='event_type') then execute 'create index if not exists idx_intelligence_audit_traces_event_type on app_public.intelligence_audit_traces (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='intelligence_audit_traces' and column_name='source') then execute 'create index if not exists idx_intelligence_audit_traces_source on app_public.intelligence_audit_traces (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='intelligence_audit_traces' and column_name='source_event_id') then execute 'create index if not exists idx_intelligence_audit_traces_source_event_id on app_public.intelligence_audit_traces (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='intelligence_audit_traces' and column_name='checkout_session_id') then execute 'create index if not exists idx_intelligence_audit_traces_checkout_session_id on app_public.intelligence_audit_traces (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='intelligence_audit_traces' and column_name='stripe_event_id') then execute 'create index if not exists idx_intelligence_audit_traces_stripe_event_id on app_public.intelligence_audit_traces (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='intelligence_audit_traces' and column_name='cart_id') then execute 'create index if not exists idx_intelligence_audit_traces_cart_id on app_public.intelligence_audit_traces (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='intelligence_audit_traces' and column_name='order_ref') then execute 'create index if not exists idx_intelligence_audit_traces_order_ref on app_public.intelligence_audit_traces (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='intelligence_audit_traces' and column_name='product_id') then execute 'create index if not exists idx_intelligence_audit_traces_product_id on app_public.intelligence_audit_traces (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='intelligence_audit_traces' and column_name='variant_id') then execute 'create index if not exists idx_intelligence_audit_traces_variant_id on app_public.intelligence_audit_traces (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='intelligence_audit_traces' and column_name='campaign_id') then execute 'create index if not exists idx_intelligence_audit_traces_campaign_id on app_public.intelligence_audit_traces (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='intelligence_audit_traces' and column_name='affiliate_account_id') then execute 'create index if not exists idx_intelligence_audit_traces_affiliate_account_id on app_public.intelligence_audit_traces (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='intelligence_audit_traces' and column_name='referral_code') then execute 'create index if not exists idx_intelligence_audit_traces_referral_code on app_public.intelligence_audit_traces (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='intelligence_audit_traces' and column_name='created_at') then execute 'create index if not exists idx_intelligence_audit_traces_created_at on app_public.intelligence_audit_traces (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ledger_entries' and column_name='user_id') then execute 'create index if not exists idx_ledger_entries_user_id on app_public.ledger_entries (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ledger_entries' and column_name='email') then execute 'create index if not exists idx_ledger_entries_email on app_public.ledger_entries (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ledger_entries' and column_name='status') then execute 'create index if not exists idx_ledger_entries_status on app_public.ledger_entries (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ledger_entries' and column_name='event_type') then execute 'create index if not exists idx_ledger_entries_event_type on app_public.ledger_entries (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ledger_entries' and column_name='source') then execute 'create index if not exists idx_ledger_entries_source on app_public.ledger_entries (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ledger_entries' and column_name='source_event_id') then execute 'create index if not exists idx_ledger_entries_source_event_id on app_public.ledger_entries (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ledger_entries' and column_name='checkout_session_id') then execute 'create index if not exists idx_ledger_entries_checkout_session_id on app_public.ledger_entries (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ledger_entries' and column_name='stripe_event_id') then execute 'create index if not exists idx_ledger_entries_stripe_event_id on app_public.ledger_entries (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ledger_entries' and column_name='cart_id') then execute 'create index if not exists idx_ledger_entries_cart_id on app_public.ledger_entries (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ledger_entries' and column_name='order_ref') then execute 'create index if not exists idx_ledger_entries_order_ref on app_public.ledger_entries (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ledger_entries' and column_name='product_id') then execute 'create index if not exists idx_ledger_entries_product_id on app_public.ledger_entries (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ledger_entries' and column_name='variant_id') then execute 'create index if not exists idx_ledger_entries_variant_id on app_public.ledger_entries (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ledger_entries' and column_name='campaign_id') then execute 'create index if not exists idx_ledger_entries_campaign_id on app_public.ledger_entries (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ledger_entries' and column_name='affiliate_account_id') then execute 'create index if not exists idx_ledger_entries_affiliate_account_id on app_public.ledger_entries (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ledger_entries' and column_name='referral_code') then execute 'create index if not exists idx_ledger_entries_referral_code on app_public.ledger_entries (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ledger_entries' and column_name='created_at') then execute 'create index if not exists idx_ledger_entries_created_at on app_public.ledger_entries (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payout_requests' and column_name='user_id') then execute 'create index if not exists idx_payout_requests_user_id on app_public.payout_requests (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payout_requests' and column_name='email') then execute 'create index if not exists idx_payout_requests_email on app_public.payout_requests (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payout_requests' and column_name='status') then execute 'create index if not exists idx_payout_requests_status on app_public.payout_requests (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payout_requests' and column_name='event_type') then execute 'create index if not exists idx_payout_requests_event_type on app_public.payout_requests (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payout_requests' and column_name='source') then execute 'create index if not exists idx_payout_requests_source on app_public.payout_requests (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payout_requests' and column_name='source_event_id') then execute 'create index if not exists idx_payout_requests_source_event_id on app_public.payout_requests (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payout_requests' and column_name='checkout_session_id') then execute 'create index if not exists idx_payout_requests_checkout_session_id on app_public.payout_requests (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payout_requests' and column_name='stripe_event_id') then execute 'create index if not exists idx_payout_requests_stripe_event_id on app_public.payout_requests (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payout_requests' and column_name='cart_id') then execute 'create index if not exists idx_payout_requests_cart_id on app_public.payout_requests (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payout_requests' and column_name='order_ref') then execute 'create index if not exists idx_payout_requests_order_ref on app_public.payout_requests (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payout_requests' and column_name='product_id') then execute 'create index if not exists idx_payout_requests_product_id on app_public.payout_requests (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payout_requests' and column_name='variant_id') then execute 'create index if not exists idx_payout_requests_variant_id on app_public.payout_requests (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payout_requests' and column_name='campaign_id') then execute 'create index if not exists idx_payout_requests_campaign_id on app_public.payout_requests (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payout_requests' and column_name='affiliate_account_id') then execute 'create index if not exists idx_payout_requests_affiliate_account_id on app_public.payout_requests (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payout_requests' and column_name='referral_code') then execute 'create index if not exists idx_payout_requests_referral_code on app_public.payout_requests (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='payout_requests' and column_name='created_at') then execute 'create index if not exists idx_payout_requests_created_at on app_public.payout_requests (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='supplier_orders' and column_name='user_id') then execute 'create index if not exists idx_supplier_orders_user_id on app_public.supplier_orders (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='supplier_orders' and column_name='email') then execute 'create index if not exists idx_supplier_orders_email on app_public.supplier_orders (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='supplier_orders' and column_name='status') then execute 'create index if not exists idx_supplier_orders_status on app_public.supplier_orders (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='supplier_orders' and column_name='event_type') then execute 'create index if not exists idx_supplier_orders_event_type on app_public.supplier_orders (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='supplier_orders' and column_name='source') then execute 'create index if not exists idx_supplier_orders_source on app_public.supplier_orders (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='supplier_orders' and column_name='source_event_id') then execute 'create index if not exists idx_supplier_orders_source_event_id on app_public.supplier_orders (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='supplier_orders' and column_name='checkout_session_id') then execute 'create index if not exists idx_supplier_orders_checkout_session_id on app_public.supplier_orders (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='supplier_orders' and column_name='stripe_event_id') then execute 'create index if not exists idx_supplier_orders_stripe_event_id on app_public.supplier_orders (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='supplier_orders' and column_name='cart_id') then execute 'create index if not exists idx_supplier_orders_cart_id on app_public.supplier_orders (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='supplier_orders' and column_name='order_ref') then execute 'create index if not exists idx_supplier_orders_order_ref on app_public.supplier_orders (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='supplier_orders' and column_name='product_id') then execute 'create index if not exists idx_supplier_orders_product_id on app_public.supplier_orders (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='supplier_orders' and column_name='variant_id') then execute 'create index if not exists idx_supplier_orders_variant_id on app_public.supplier_orders (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='supplier_orders' and column_name='campaign_id') then execute 'create index if not exists idx_supplier_orders_campaign_id on app_public.supplier_orders (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='supplier_orders' and column_name='affiliate_account_id') then execute 'create index if not exists idx_supplier_orders_affiliate_account_id on app_public.supplier_orders (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='supplier_orders' and column_name='referral_code') then execute 'create index if not exists idx_supplier_orders_referral_code on app_public.supplier_orders (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='supplier_orders' and column_name='created_at') then execute 'create index if not exists idx_supplier_orders_created_at on app_public.supplier_orders (created_at)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_launch_readiness_snapshots' and column_name='user_id') then execute 'create index if not exists idx_system_launch_readiness_snapshots_user_id on app_public.system_launch_readiness_snapshots (user_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_launch_readiness_snapshots' and column_name='email') then execute 'create index if not exists idx_system_launch_readiness_snapshots_email on app_public.system_launch_readiness_snapshots (email)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_launch_readiness_snapshots' and column_name='status') then execute 'create index if not exists idx_system_launch_readiness_snapshots_status on app_public.system_launch_readiness_snapshots (status)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_launch_readiness_snapshots' and column_name='event_type') then execute 'create index if not exists idx_system_launch_readiness_snapshots_event_type on app_public.system_launch_readiness_snapshots (event_type)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_launch_readiness_snapshots' and column_name='source') then execute 'create index if not exists idx_system_launch_readiness_snapshots_source on app_public.system_launch_readiness_snapshots (source)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_launch_readiness_snapshots' and column_name='source_event_id') then execute 'create index if not exists idx_system_launch_readiness_snapshots_source_event_id on app_public.system_launch_readiness_snapshots (source_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_launch_readiness_snapshots' and column_name='checkout_session_id') then execute 'create index if not exists idx_system_launch_readiness_snapshots_checkout_session_id on app_public.system_launch_readiness_snapshots (checkout_session_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_launch_readiness_snapshots' and column_name='stripe_event_id') then execute 'create index if not exists idx_system_launch_readiness_snapshots_stripe_event_id on app_public.system_launch_readiness_snapshots (stripe_event_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_launch_readiness_snapshots' and column_name='cart_id') then execute 'create index if not exists idx_system_launch_readiness_snapshots_cart_id on app_public.system_launch_readiness_snapshots (cart_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_launch_readiness_snapshots' and column_name='order_ref') then execute 'create index if not exists idx_system_launch_readiness_snapshots_order_ref on app_public.system_launch_readiness_snapshots (order_ref)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_launch_readiness_snapshots' and column_name='product_id') then execute 'create index if not exists idx_system_launch_readiness_snapshots_product_id on app_public.system_launch_readiness_snapshots (product_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_launch_readiness_snapshots' and column_name='variant_id') then execute 'create index if not exists idx_system_launch_readiness_snapshots_variant_id on app_public.system_launch_readiness_snapshots (variant_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_launch_readiness_snapshots' and column_name='campaign_id') then execute 'create index if not exists idx_system_launch_readiness_snapshots_campaign_id on app_public.system_launch_readiness_snapshots (campaign_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_launch_readiness_snapshots' and column_name='affiliate_account_id') then execute 'create index if not exists idx_system_launch_readiness_snapshots_affiliate_account_id on app_public.system_launch_readiness_snapshots (affiliate_account_id)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_launch_readiness_snapshots' and column_name='referral_code') then execute 'create index if not exists idx_system_launch_readiness_snapshots_referral_code on app_public.system_launch_readiness_snapshots (referral_code)'; end if; end $$;
do $$ begin if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='system_launch_readiness_snapshots' and column_name='created_at') then execute 'create index if not exists idx_system_launch_readiness_snapshots_created_at on app_public.system_launch_readiness_snapshots (created_at)'; end if; end $$;
drop policy if exists service_role_manage_platform_users on app_public.platform_users;
create policy service_role_manage_platform_users on app_public.platform_users for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_platform_users on app_public.platform_users;
create policy authenticated_own_rows_platform_users on app_public.platform_users for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_user_profiles on app_public.user_profiles;
create policy service_role_manage_user_profiles on app_public.user_profiles for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_user_profiles on app_public.user_profiles;
create policy authenticated_own_rows_user_profiles on app_public.user_profiles for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_first_owner_bootstrap_claims on app_public.first_owner_bootstrap_claims;
create policy service_role_manage_first_owner_bootstrap_claims on app_public.first_owner_bootstrap_claims for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_first_owner_bootstrap_claims on app_public.first_owner_bootstrap_claims;
create policy authenticated_own_rows_first_owner_bootstrap_claims on app_public.first_owner_bootstrap_claims for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_owner_reference_codes on app_public.owner_reference_codes;
create policy service_role_manage_owner_reference_codes on app_public.owner_reference_codes for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_owner_reference_codes on app_public.owner_reference_codes;
create policy authenticated_own_rows_owner_reference_codes on app_public.owner_reference_codes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_referral_codes on app_public.referral_codes;
create policy service_role_manage_referral_codes on app_public.referral_codes for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_referral_codes on app_public.referral_codes;
create policy authenticated_own_rows_referral_codes on app_public.referral_codes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists public_read_active_referral_codes on app_public.referral_codes;
create policy public_read_active_referral_codes on app_public.referral_codes for select to anon, authenticated using (coalesce(status, 'active') = 'active');
drop policy if exists service_role_manage_invitation_links on app_public.invitation_links;
create policy service_role_manage_invitation_links on app_public.invitation_links for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_invitation_links on app_public.invitation_links;
create policy authenticated_own_rows_invitation_links on app_public.invitation_links for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists public_read_active_invitation_links on app_public.invitation_links;
create policy public_read_active_invitation_links on app_public.invitation_links for select to anon, authenticated using (coalesce(status, 'active') = 'active');
drop policy if exists service_role_manage_initiation_links on app_public.initiation_links;
create policy service_role_manage_initiation_links on app_public.initiation_links for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_initiation_links on app_public.initiation_links;
create policy authenticated_own_rows_initiation_links on app_public.initiation_links for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists public_read_active_initiation_links on app_public.initiation_links;
create policy public_read_active_initiation_links on app_public.initiation_links for select to anon, authenticated using (coalesce(status, 'active') = 'active');
drop policy if exists service_role_manage_wallets on app_public.wallets;
create policy service_role_manage_wallets on app_public.wallets for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_wallets on app_public.wallets;
create policy authenticated_own_rows_wallets on app_public.wallets for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_wallet_ledger_entries on app_public.wallet_ledger_entries;
create policy service_role_manage_wallet_ledger_entries on app_public.wallet_ledger_entries for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_wallet_ledger_entries on app_public.wallet_ledger_entries;
create policy authenticated_own_rows_wallet_ledger_entries on app_public.wallet_ledger_entries for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_wallet_holds on app_public.wallet_holds;
create policy service_role_manage_wallet_holds on app_public.wallet_holds for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_wallet_holds on app_public.wallet_holds;
create policy authenticated_own_rows_wallet_holds on app_public.wallet_holds for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_reward_events on app_public.reward_events;
create policy service_role_manage_reward_events on app_public.reward_events for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_reward_events on app_public.reward_events;
create policy authenticated_own_rows_reward_events on app_public.reward_events for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_reward_balances on app_public.reward_balances;
create policy service_role_manage_reward_balances on app_public.reward_balances for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_reward_balances on app_public.reward_balances;
create policy authenticated_own_rows_reward_balances on app_public.reward_balances for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_affiliate_accounts on app_public.affiliate_accounts;
create policy service_role_manage_affiliate_accounts on app_public.affiliate_accounts for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_affiliate_accounts on app_public.affiliate_accounts;
create policy authenticated_own_rows_affiliate_accounts on app_public.affiliate_accounts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_affiliate_clicks on app_public.affiliate_clicks;
create policy service_role_manage_affiliate_clicks on app_public.affiliate_clicks for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_affiliate_clicks on app_public.affiliate_clicks;
create policy authenticated_own_rows_affiliate_clicks on app_public.affiliate_clicks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_affiliate_conversions on app_public.affiliate_conversions;
create policy service_role_manage_affiliate_conversions on app_public.affiliate_conversions for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_affiliate_conversions on app_public.affiliate_conversions;
create policy authenticated_own_rows_affiliate_conversions on app_public.affiliate_conversions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_affiliate_commissions on app_public.affiliate_commissions;
create policy service_role_manage_affiliate_commissions on app_public.affiliate_commissions for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_affiliate_commissions on app_public.affiliate_commissions;
create policy authenticated_own_rows_affiliate_commissions on app_public.affiliate_commissions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_affiliate_payout_requests on app_public.affiliate_payout_requests;
create policy service_role_manage_affiliate_payout_requests on app_public.affiliate_payout_requests for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_affiliate_payout_requests on app_public.affiliate_payout_requests;
create policy authenticated_own_rows_affiliate_payout_requests on app_public.affiliate_payout_requests for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_affiliate_payouts on app_public.affiliate_payouts;
create policy service_role_manage_affiliate_payouts on app_public.affiliate_payouts for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_affiliate_payouts on app_public.affiliate_payouts;
create policy authenticated_own_rows_affiliate_payouts on app_public.affiliate_payouts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_stripe_webhook_events on app_public.stripe_webhook_events;
create policy service_role_manage_stripe_webhook_events on app_public.stripe_webhook_events for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_payment_records on app_public.payment_records;
create policy service_role_manage_payment_records on app_public.payment_records for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_checkout_payment_sessions on app_public.checkout_payment_sessions;
create policy service_role_manage_checkout_payment_sessions on app_public.checkout_payment_sessions for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_economic_events on app_public.economic_events;
create policy service_role_manage_economic_events on app_public.economic_events for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_economic_event_outbox on app_public.economic_event_outbox;
create policy service_role_manage_economic_event_outbox on app_public.economic_event_outbox for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_settlement_runs on app_public.settlement_runs;
create policy service_role_manage_settlement_runs on app_public.settlement_runs for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_idempotency_keys on app_public.idempotency_keys;
create policy service_role_manage_idempotency_keys on app_public.idempotency_keys for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_commerce_order_refs on app_public.commerce_order_refs;
create policy service_role_manage_commerce_order_refs on app_public.commerce_order_refs for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_medusa_order_sync_jobs on app_public.medusa_order_sync_jobs;
create policy service_role_manage_medusa_order_sync_jobs on app_public.medusa_order_sync_jobs for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_medusa_order_events on app_public.medusa_order_events;
create policy service_role_manage_medusa_order_events on app_public.medusa_order_events for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_fulfillment_tracking_events on app_public.fulfillment_tracking_events;
create policy service_role_manage_fulfillment_tracking_events on app_public.fulfillment_tracking_events for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_advertiser_accounts on app_public.advertiser_accounts;
create policy service_role_manage_advertiser_accounts on app_public.advertiser_accounts for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_ad_campaigns on app_public.ad_campaigns;
create policy service_role_manage_ad_campaigns on app_public.ad_campaigns for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_ad_creatives on app_public.ad_creatives;
create policy service_role_manage_ad_creatives on app_public.ad_creatives for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_ad_watch_sessions on app_public.ad_watch_sessions;
create policy service_role_manage_ad_watch_sessions on app_public.ad_watch_sessions for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_ad_watch_sessions on app_public.ad_watch_sessions;
create policy authenticated_own_rows_ad_watch_sessions on app_public.ad_watch_sessions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_ad_watch_events on app_public.ad_watch_events;
create policy service_role_manage_ad_watch_events on app_public.ad_watch_events for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_ad_watch_events on app_public.ad_watch_events;
create policy authenticated_own_rows_ad_watch_events on app_public.ad_watch_events for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_ad_reward_confirmations on app_public.ad_reward_confirmations;
create policy service_role_manage_ad_reward_confirmations on app_public.ad_reward_confirmations for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_ad_reward_confirmations on app_public.ad_reward_confirmations;
create policy authenticated_own_rows_ad_reward_confirmations on app_public.ad_reward_confirmations for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_ad_budget_ledger on app_public.ad_budget_ledger;
create policy service_role_manage_ad_budget_ledger on app_public.ad_budget_ledger for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_ad_fraud_events on app_public.ad_fraud_events;
create policy service_role_manage_ad_fraud_events on app_public.ad_fraud_events for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_ai_stories on app_public.ai_stories;
create policy service_role_manage_ai_stories on app_public.ai_stories for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_ai_stories on app_public.ai_stories;
create policy authenticated_own_rows_ai_stories on app_public.ai_stories for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_ai_story_generations on app_public.ai_story_generations;
create policy service_role_manage_ai_story_generations on app_public.ai_story_generations for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_ai_story_generations on app_public.ai_story_generations;
create policy authenticated_own_rows_ai_story_generations on app_public.ai_story_generations for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_ai_story_usage_events on app_public.ai_story_usage_events;
create policy service_role_manage_ai_story_usage_events on app_public.ai_story_usage_events for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_ai_story_usage_events on app_public.ai_story_usage_events;
create policy authenticated_own_rows_ai_story_usage_events on app_public.ai_story_usage_events for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_ai_story_promotion_events on app_public.ai_story_promotion_events;
create policy service_role_manage_ai_story_promotion_events on app_public.ai_story_promotion_events for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_ai_story_promotion_events on app_public.ai_story_promotion_events;
create policy authenticated_own_rows_ai_story_promotion_events on app_public.ai_story_promotion_events for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_dream_projects on app_public.dream_projects;
create policy service_role_manage_dream_projects on app_public.dream_projects for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_dream_projects on app_public.dream_projects;
create policy authenticated_own_rows_dream_projects on app_public.dream_projects for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_dream_pledges on app_public.dream_pledges;
create policy service_role_manage_dream_pledges on app_public.dream_pledges for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_dream_pledges on app_public.dream_pledges;
create policy authenticated_own_rows_dream_pledges on app_public.dream_pledges for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_dream_contributions on app_public.dream_contributions;
create policy service_role_manage_dream_contributions on app_public.dream_contributions for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_dream_contributions on app_public.dream_contributions;
create policy authenticated_own_rows_dream_contributions on app_public.dream_contributions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_dream_reward_claims on app_public.dream_reward_claims;
create policy service_role_manage_dream_reward_claims on app_public.dream_reward_claims for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_dream_reward_claims on app_public.dream_reward_claims;
create policy authenticated_own_rows_dream_reward_claims on app_public.dream_reward_claims for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_support_tickets on app_public.support_tickets;
create policy service_role_manage_support_tickets on app_public.support_tickets for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_support_tickets on app_public.support_tickets;
create policy authenticated_own_rows_support_tickets on app_public.support_tickets for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_support_messages on app_public.support_messages;
create policy service_role_manage_support_messages on app_public.support_messages for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_support_messages on app_public.support_messages;
create policy authenticated_own_rows_support_messages on app_public.support_messages for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_notifications on app_public.notifications;
create policy service_role_manage_notifications on app_public.notifications for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_notifications on app_public.notifications;
create policy authenticated_own_rows_notifications on app_public.notifications for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_notification_deliveries on app_public.notification_deliveries;
create policy service_role_manage_notification_deliveries on app_public.notification_deliveries for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_notification_deliveries on app_public.notification_deliveries;
create policy authenticated_own_rows_notification_deliveries on app_public.notification_deliveries for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_risk_events on app_public.risk_events;
create policy service_role_manage_risk_events on app_public.risk_events for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_device_fingerprints on app_public.device_fingerprints;
create policy service_role_manage_device_fingerprints on app_public.device_fingerprints for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_device_fingerprints on app_public.device_fingerprints;
create policy authenticated_own_rows_device_fingerprints on app_public.device_fingerprints for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_captcha_verifications on app_public.captcha_verifications;
create policy service_role_manage_captcha_verifications on app_public.captcha_verifications for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_captcha_verifications on app_public.captcha_verifications;
create policy authenticated_own_rows_captcha_verifications on app_public.captcha_verifications for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_auth_security_events on app_public.auth_security_events;
create policy service_role_manage_auth_security_events on app_public.auth_security_events for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_compliance_checks on app_public.compliance_checks;
create policy service_role_manage_compliance_checks on app_public.compliance_checks for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_sanctions_screening_events on app_public.sanctions_screening_events;
create policy service_role_manage_sanctions_screening_events on app_public.sanctions_screening_events for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_geo_policy_events on app_public.geo_policy_events;
create policy service_role_manage_geo_policy_events on app_public.geo_policy_events for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_audit_logs on app_public.audit_logs;
create policy service_role_manage_audit_logs on app_public.audit_logs for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_system_settings on app_public.system_settings;
create policy service_role_manage_system_settings on app_public.system_settings for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_system_readiness_checks on app_public.system_readiness_checks;
create policy service_role_manage_system_readiness_checks on app_public.system_readiness_checks for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_background_jobs on app_public.background_jobs;
create policy service_role_manage_background_jobs on app_public.background_jobs for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_webhook_delivery_attempts on app_public.webhook_delivery_attempts;
create policy service_role_manage_webhook_delivery_attempts on app_public.webhook_delivery_attempts for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_ai_story_campaigns on app_public.ai_story_campaigns;
create policy service_role_manage_ai_story_campaigns on app_public.ai_story_campaigns for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_ai_story_campaigns on app_public.ai_story_campaigns;
create policy authenticated_own_rows_ai_story_campaigns on app_public.ai_story_campaigns for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_checkout_settlements on app_public.checkout_settlements;
create policy service_role_manage_checkout_settlements on app_public.checkout_settlements for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_commerce_fulfillment_sync on app_public.commerce_fulfillment_sync;
create policy service_role_manage_commerce_fulfillment_sync on app_public.commerce_fulfillment_sync for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_commerce_order_sync on app_public.commerce_order_sync;
create policy service_role_manage_commerce_order_sync on app_public.commerce_order_sync for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_commerce_product_sync on app_public.commerce_product_sync;
create policy service_role_manage_commerce_product_sync on app_public.commerce_product_sync for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_commerce_settlements on app_public.commerce_settlements;
create policy service_role_manage_commerce_settlements on app_public.commerce_settlements for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_commerce_variant_sync on app_public.commerce_variant_sync;
create policy service_role_manage_commerce_variant_sync on app_public.commerce_variant_sync for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_health_check on app_public.health_check;
create policy service_role_manage_health_check on app_public.health_check for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_intelligence_audit_traces on app_public.intelligence_audit_traces;
create policy service_role_manage_intelligence_audit_traces on app_public.intelligence_audit_traces for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_ledger_entries on app_public.ledger_entries;
create policy service_role_manage_ledger_entries on app_public.ledger_entries for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_payout_requests on app_public.payout_requests;
create policy service_role_manage_payout_requests on app_public.payout_requests for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists authenticated_own_rows_payout_requests on app_public.payout_requests;
create policy authenticated_own_rows_payout_requests on app_public.payout_requests for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists service_role_manage_supplier_orders on app_public.supplier_orders;
create policy service_role_manage_supplier_orders on app_public.supplier_orders for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_manage_system_launch_readiness_snapshots on app_public.system_launch_readiness_snapshots;
create policy service_role_manage_system_launch_readiness_snapshots on app_public.system_launch_readiness_snapshots for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create or replace function app_public.get_or_create_wallet(
  p_user_id uuid,
  p_currency text default 'USD'
)
returns uuid
language plpgsql
security definer
set search_path = app_public, public, auth
as $$
declare v_wallet_id uuid;
begin
  if p_user_id is null then raise exception 'p_user_id is required'; end if;
  insert into app_public.wallets (user_id, currency, status, metadata)
  values (p_user_id, upper(coalesce(nullif(trim(p_currency), ''), 'USD')), 'active', jsonb_build_object('createdBy','get_or_create_wallet'))
  on conflict do nothing;
  select id into v_wallet_id from app_public.wallets where user_id = p_user_id and currency = upper(coalesce(nullif(trim(p_currency), ''), 'USD')) order by created_at asc limit 1;
  return v_wallet_id;
end;
$$;

create or replace function app_public.record_wallet_ledger_entry(
  p_wallet_id uuid,
  p_user_id uuid,
  p_amount numeric,
  p_currency text default 'USD',
  p_entry_type text default 'adjustment',
  p_source text default 'system',
  p_source_event_id text default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = app_public, public, auth
as $$
declare v_entry_id uuid; v_wallet_id uuid; v_inserted boolean := false;
begin
  v_wallet_id := coalesce(p_wallet_id, app_public.get_or_create_wallet(p_user_id, p_currency));
  if v_wallet_id is null then raise exception 'wallet is required'; end if;
  insert into app_public.wallet_ledger_entries (wallet_id, user_id, amount, currency, entry_type, source, source_event_id, idempotency_key, metadata)
  values (v_wallet_id, p_user_id, coalesce(p_amount, 0), upper(coalesce(nullif(trim(p_currency), ''), 'USD')), p_entry_type, p_source, p_source_event_id, p_idempotency_key, coalesce(p_metadata, '{}'::jsonb))
  on conflict do nothing
  returning id into v_entry_id;
  v_inserted := v_entry_id is not null;
  if v_entry_id is null and p_idempotency_key is not null then
    select id into v_entry_id from app_public.wallet_ledger_entries where idempotency_key = p_idempotency_key limit 1;
  end if;
  update app_public.wallets
  set available_balance = available_balance + coalesce(p_amount, 0)
  where id = v_wallet_id and coalesce(p_amount, 0) <> 0 and v_inserted;
  return v_entry_id;
end;
$$;

create or replace function app_public.record_idempotency_key(
  p_idempotency_key text,
  p_scope text default 'global',
  p_request_hash text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = app_public, public, auth
as $$
declare v_id uuid;
begin
  if coalesce(trim(p_idempotency_key), '') = '' then raise exception 'p_idempotency_key is required'; end if;
  insert into app_public.idempotency_keys (idempotency_key, scope, request_hash, status, metadata)
  values (trim(p_idempotency_key), coalesce(nullif(trim(p_scope), ''), 'global'), p_request_hash, 'recorded', coalesce(p_metadata, '{}'::jsonb))
  on conflict do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from app_public.idempotency_keys where idempotency_key = trim(p_idempotency_key) and scope = coalesce(nullif(trim(p_scope), ''), 'global') limit 1;
  end if;
  return v_id;
end;
$$;

create or replace function app_public.record_stripe_webhook_event(
  p_stripe_event_id text,
  p_event_type text,
  p_raw_event jsonb default '{}'::jsonb,
  p_checkout_session_id text default null,
  p_payment_intent_id text default null,
  p_cart_id text default null,
  p_order_ref text default null,
  p_amount_total bigint default null,
  p_currency text default null,
  p_verified boolean default true,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = app_public, public, auth
as $$
declare v_id uuid;
begin
  if coalesce(trim(p_stripe_event_id), '') = '' then raise exception 'p_stripe_event_id is required'; end if;
  insert into app_public.stripe_webhook_events (stripe_event_id, source_event_id, idempotency_key, event_type, raw_event, checkout_session_id, payment_intent_id, cart_id, order_ref, amount_total, currency, verified, duplicate, status, metadata)
  values (trim(p_stripe_event_id), trim(p_stripe_event_id), trim(p_stripe_event_id), coalesce(nullif(trim(p_event_type), ''), 'stripe.unknown'), coalesce(p_raw_event, '{}'::jsonb), p_checkout_session_id, p_payment_intent_id, p_cart_id, p_order_ref, p_amount_total, lower(p_currency), coalesce(p_verified, false), false, 'received', coalesce(p_metadata, '{}'::jsonb))
  on conflict (stripe_event_id) do update set duplicate = true, updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function app_public.record_economic_event(
  p_event_type text,
  p_source text,
  p_source_event_id text default null,
  p_checkout_session_id text default null,
  p_stripe_event_id text default null,
  p_cart_id text default null,
  p_order_ref text default null,
  p_user_id uuid default null,
  p_product_id text default null,
  p_variant_id text default null,
  p_amount numeric default null,
  p_currency text default null,
  p_verified boolean default false,
  p_payload jsonb default '{}'::jsonb,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = app_public, public, auth
as $$
declare v_id uuid;
begin
  insert into app_public.economic_events (event_type, source, source_event_id, checkout_session_id, stripe_event_id, cart_id, order_ref, user_id, product_id, variant_id, amount, currency, verified, payload, status, metadata)
  values (coalesce(nullif(trim(p_event_type), ''), 'economic.unknown'), coalesce(nullif(trim(p_source), ''), 'system'), p_source_event_id, p_checkout_session_id, p_stripe_event_id, p_cart_id, p_order_ref, p_user_id, p_product_id, p_variant_id, p_amount, lower(p_currency), coalesce(p_verified, false), coalesce(p_payload, '{}'::jsonb), case when coalesce(p_verified, false) then 'verified' else 'pending' end, coalesce(p_metadata, '{}'::jsonb))
  on conflict do nothing
  returning id into v_id;
  if v_id is not null then
    insert into app_public.economic_event_outbox (economic_event_id, event_type, source, source_event_id, payload, status, metadata)
    values (v_id, coalesce(nullif(trim(p_event_type), ''), 'economic.unknown'), coalesce(nullif(trim(p_source), ''), 'system'), p_source_event_id, coalesce(p_payload, '{}'::jsonb), 'pending', coalesce(p_metadata, '{}'::jsonb));
  end if;
  return v_id;
end;
$$;

create or replace function app_public.dbx_bootstrap_first_owner_user(
  p_user_id uuid,
  p_email text,
  p_display_name text default null,
  p_telegram_user_id text default null,
  p_referral_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = app_public, public, auth
as $$
declare
  v_platform_user_id uuid;
  v_wallet_id uuid;
  v_affiliate_account_id uuid;
  v_owner_reference_id text;
  v_referral_code text;
  v_initiation_code text;
  v_referral_link_path text;
  v_initiation_link_path text;
begin
  if p_user_id is null then raise exception 'p_user_id is required'; end if;
  if coalesce(trim(p_email), '') = '' then raise exception 'p_email is required'; end if;
  v_referral_code := coalesce(nullif(trim(p_referral_code), ''), app_public.generate_referral_code());
  select id, owner_reference_id, referral_code into v_platform_user_id, v_owner_reference_id, v_referral_code from app_public.platform_users where user_id = p_user_id limit 1;
  v_owner_reference_id := coalesce(v_owner_reference_id, app_public.generate_reference_id('OWNER'));
  v_referral_code := coalesce(v_referral_code, p_referral_code, app_public.generate_referral_code());

  insert into app_public.platform_users (user_id, email, display_name, telegram_user_id, role, user_number, owner_reference_id, referral_code, status, metadata)
  values (p_user_id, lower(trim(p_email)), nullif(trim(p_display_name), ''), nullif(trim(p_telegram_user_id), ''), 'owner', 1, v_owner_reference_id, v_referral_code, 'active', jsonb_build_object('bootstrap','first_owner'))
  on conflict do nothing
  returning id, owner_reference_id, referral_code into v_platform_user_id, v_owner_reference_id, v_referral_code;
  if v_platform_user_id is null then
    update app_public.platform_users set email = lower(trim(p_email)), display_name = coalesce(nullif(trim(p_display_name), ''), display_name), telegram_user_id = coalesce(nullif(trim(p_telegram_user_id), ''), telegram_user_id), role = 'owner', user_number = coalesce(user_number, 1), owner_reference_id = coalesce(owner_reference_id, v_owner_reference_id), referral_code = coalesce(referral_code, v_referral_code), updated_at = now() where user_id = p_user_id returning id, owner_reference_id, referral_code into v_platform_user_id, v_owner_reference_id, v_referral_code;
  end if;

  insert into app_public.user_profiles (user_id, platform_user_id, email, display_name, telegram_user_id, status, metadata)
  values (p_user_id, v_platform_user_id, lower(trim(p_email)), nullif(trim(p_display_name), ''), nullif(trim(p_telegram_user_id), ''), 'active', jsonb_build_object('bootstrap','first_owner'))
  on conflict do nothing;

  v_wallet_id := app_public.get_or_create_wallet(p_user_id, 'USD');

  insert into app_public.affiliate_accounts (user_id, platform_user_id, affiliate_code, referral_code, status, metadata)
  values (p_user_id, v_platform_user_id, app_public.generate_reference_id('AFF'), v_referral_code, 'active', jsonb_build_object('bootstrap','first_owner','fakeCommission',false))
  on conflict do nothing;
  select id into v_affiliate_account_id from app_public.affiliate_accounts where user_id = p_user_id order by created_at asc limit 1;

  insert into app_public.owner_reference_codes (user_id, platform_user_id, owner_reference_id, code, status, metadata)
  values (p_user_id, v_platform_user_id, v_owner_reference_id, v_owner_reference_id, 'active', jsonb_build_object('bootstrap','first_owner'))
  on conflict do nothing;
  insert into app_public.referral_codes (user_id, platform_user_id, referral_code, code, status, metadata)
  values (p_user_id, v_platform_user_id, v_referral_code, v_referral_code, 'active', jsonb_build_object('ownerFirstUser',true))
  on conflict do nothing;

  v_referral_link_path := '/signup?ref=' || v_referral_code;
  insert into app_public.invitation_links (user_id, platform_user_id, invitation_code, link_path, status, metadata)
  values (p_user_id, v_platform_user_id, v_referral_code, v_referral_link_path, 'active', jsonb_build_object('bootstrap','first_owner'))
  on conflict do nothing;

  select initiation_code into v_initiation_code from app_public.initiation_links where user_id = p_user_id order by created_at asc limit 1;
  v_initiation_code := coalesce(v_initiation_code, app_public.generate_initiation_code());
  v_initiation_link_path := '/initiate/' || v_initiation_code;
  insert into app_public.initiation_links (user_id, platform_user_id, initiation_code, link_path, status, metadata)
  values (p_user_id, v_platform_user_id, v_initiation_code, v_initiation_link_path, 'active', jsonb_build_object('bootstrap','first_owner'))
  on conflict do nothing;

  insert into app_public.first_owner_bootstrap_claims (user_id, platform_user_id, claim_status, first_user_number, owner_reference_id, referral_code, initiation_code, status, metadata)
  values (p_user_id, v_platform_user_id, 'claimed', 1, v_owner_reference_id, v_referral_code, v_initiation_code, 'claimed', jsonb_build_object('telegramUserId', p_telegram_user_id))
  on conflict do nothing;

  return jsonb_build_object('platformUserId', v_platform_user_id, 'firstUserNumber', 1, 'ownerReferenceId', v_owner_reference_id, 'referralCode', v_referral_code, 'referralLinkPath', v_referral_link_path, 'initiationCode', v_initiation_code, 'initiationLinkPath', v_initiation_link_path, 'walletId', v_wallet_id, 'affiliateAccountId', v_affiliate_account_id, 'fakeWalletCreditCreated', false, 'fakeReferralEarningCreated', false);
end;
$$;

revoke all on function app_public.get_or_create_wallet(uuid, text) from public, anon, authenticated;
revoke all on function app_public.record_wallet_ledger_entry(uuid, uuid, numeric, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function app_public.record_idempotency_key(text, text, text, jsonb) from public, anon, authenticated;
revoke all on function app_public.record_stripe_webhook_event(text, text, jsonb, text, text, text, text, bigint, text, boolean, jsonb) from public, anon, authenticated;
revoke all on function app_public.record_economic_event(text, text, text, text, text, text, text, uuid, text, text, numeric, text, boolean, jsonb, jsonb) from public, anon, authenticated;
revoke all on function app_public.dbx_bootstrap_first_owner_user(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function app_public.get_or_create_wallet(uuid, text) to service_role;
grant execute on function app_public.record_wallet_ledger_entry(uuid, uuid, numeric, text, text, text, text, text, jsonb) to service_role;
grant execute on function app_public.record_idempotency_key(text, text, text, jsonb) to service_role;
grant execute on function app_public.record_stripe_webhook_event(text, text, jsonb, text, text, text, text, bigint, text, boolean, jsonb) to service_role;
grant execute on function app_public.record_economic_event(text, text, text, text, text, text, text, uuid, text, text, numeric, text, boolean, jsonb, jsonb) to service_role;
grant execute on function app_public.dbx_bootstrap_first_owner_user(uuid, text, text, text, text) to service_role;

commit;
-- Finalize first-owner bootstrap RPC exposure and idempotency.
-- The API intentionally calls app_public.dbx_bootstrap_first_owner_user through
-- the service-role Supabase client; this migration keeps the data writes in the
-- existing public platform tables while exposing a stable app_public RPC surface.

create extension if not exists pgcrypto;
create schema if not exists app_public;

grant usage on schema app_public to service_role;

create unique index if not exists dbx_wallets_user_currency_active_key
  on public.dbx_wallets (user_id, currency)
  where deleted_at is null;

create unique index if not exists dbx_affiliate_accounts_user_active_key
  on public.dbx_affiliate_accounts (user_id)
  where status <> 'closed';

create unique index if not exists dbx_referral_links_code_path_key
  on public.dbx_referral_links (referral_code, link_path)
  where deleted_at is null;

create unique index if not exists dbx_owner_bootstrap_claims_user_key
  on public.dbx_owner_bootstrap_claims (user_id);

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
  v_wallet_id uuid;
  v_affiliate_account_id uuid;
  v_owner_reference_id text;
  v_referral_reference_id text;
  v_initiation_code text;
  v_referral_link_path text;
  v_initiation_link_path text;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  if coalesce(trim(p_email), '') = '' then
    raise exception 'p_email is required';
  end if;

  p_referral_code := upper(coalesce(nullif(trim(p_referral_code), ''), 'DBX-FIRST-0001'));

  select owner_reference_id
    into v_owner_reference_id
    from public.dbx_profiles
   where user_id = p_user_id;

  if v_owner_reference_id is null then
    v_owner_reference_id := public.dbx_generate_reference_id('OWNER');
  end if;

  insert into public.dbx_profiles (
    user_id,
    email,
    display_name,
    telegram_user_id,
    role,
    is_first_platform_user,
    first_user_number,
    owner_reference_id,
    referral_code,
    metadata
  ) values (
    p_user_id,
    lower(trim(p_email)),
    nullif(trim(p_display_name), ''),
    nullif(trim(p_telegram_user_id), ''),
    'owner',
    true,
    1,
    v_owner_reference_id,
    p_referral_code,
    jsonb_build_object('bootstrap', 'first_owner')
  )
  on conflict (user_id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, dbx_profiles.display_name),
    telegram_user_id = coalesce(excluded.telegram_user_id, dbx_profiles.telegram_user_id),
    role = 'owner',
    is_first_platform_user = true,
    first_user_number = coalesce(dbx_profiles.first_user_number, 1),
    owner_reference_id = coalesce(dbx_profiles.owner_reference_id, excluded.owner_reference_id),
    referral_code = coalesce(dbx_profiles.referral_code, excluded.referral_code),
    metadata = dbx_profiles.metadata || excluded.metadata,
    updated_at = now()
  returning owner_reference_id into v_owner_reference_id;

  insert into public.dbx_wallets (user_id, status, reference_id, currency, metadata)
  values (
    p_user_id,
    'active',
    public.dbx_generate_reference_id('WALLET'),
    'USD',
    jsonb_build_object('bootstrap', 'first_owner', 'fakeCredit', false)
  )
  on conflict do nothing;

  select id
    into v_wallet_id
    from public.dbx_wallets
   where user_id = p_user_id
     and deleted_at is null
   order by created_at asc
   limit 1;

  insert into public.dbx_affiliate_accounts (user_id, status, reference_id, affiliate_code, metadata)
  values (
    p_user_id,
    'active',
    public.dbx_generate_reference_id('AFF'),
    p_referral_code,
    jsonb_build_object('bootstrap', 'first_owner', 'fakeCommission', false)
  )
  on conflict do nothing;

  select id
    into v_affiliate_account_id
    from public.dbx_affiliate_accounts
   where user_id = p_user_id
     and status <> 'closed'
   order by created_at asc
   limit 1;

  insert into public.dbx_referral_codes (user_id, status, reference_id, code, referral_code, metadata)
  values (
    p_user_id,
    'active',
    public.dbx_generate_reference_id('REF'),
    p_referral_code,
    p_referral_code,
    jsonb_build_object('ownerFirstUser', true)
  )
  on conflict (referral_code) do update set
    user_id = excluded.user_id,
    status = 'active',
    updated_at = now()
  returning reference_id into v_referral_reference_id;

  v_referral_link_path := '/signup?ref=' || p_referral_code;

  insert into public.dbx_referral_links (user_id, status, reference_id, code, referral_code, link_path, metadata)
  values (
    p_user_id,
    'active',
    public.dbx_generate_reference_id('RLINK'),
    p_referral_code,
    p_referral_code,
    v_referral_link_path,
    jsonb_build_object('ownerFirstUser', true)
  )
  on conflict do nothing;

  select coalesce(
    (
      select initiation_code
        from public.dbx_initiation_links
       where user_id = p_user_id
       order by created_at asc
       limit 1
    ),
    public.dbx_generate_initiation_code()
  ) into v_initiation_code;

  v_initiation_link_path := '/initiate/' || v_initiation_code;

  insert into public.dbx_initiation_links (user_id, status, reference_id, code, initiation_code, link_path, metadata)
  values (
    p_user_id,
    'active',
    public.dbx_generate_reference_id('INIT'),
    v_initiation_code,
    v_initiation_code,
    v_initiation_link_path,
    jsonb_build_object('ownerFirstUser', true)
  )
  on conflict (initiation_code) do update set
    user_id = excluded.user_id,
    status = 'active',
    link_path = excluded.link_path,
    updated_at = now();

  insert into public.dbx_first_user_registry (
    user_id,
    status,
    first_user_number,
    owner_first_user_code,
    owner_reference_id,
    metadata
  ) values (
    p_user_id,
    'claimed',
    1,
    p_referral_code,
    v_owner_reference_id,
    jsonb_build_object('telegramUserId', p_telegram_user_id)
  )
  on conflict (first_user_number) do update set
    user_id = excluded.user_id,
    status = 'claimed',
    owner_first_user_code = coalesce(dbx_first_user_registry.owner_first_user_code, excluded.owner_first_user_code),
    owner_reference_id = coalesce(dbx_first_user_registry.owner_reference_id, excluded.owner_reference_id),
    metadata = dbx_first_user_registry.metadata || excluded.metadata,
    updated_at = now();

  insert into public.dbx_owner_bootstrap_claims (user_id, status, reference_id, code, metadata)
  values (
    p_user_id,
    'claimed',
    v_owner_reference_id,
    p_referral_code,
    jsonb_build_object('telegramUserId', p_telegram_user_id)
  )
  on conflict (user_id) do update set
    status = 'claimed',
    reference_id = coalesce(dbx_owner_bootstrap_claims.reference_id, excluded.reference_id),
    code = coalesce(dbx_owner_bootstrap_claims.code, excluded.code),
    metadata = dbx_owner_bootstrap_claims.metadata || excluded.metadata,
    updated_at = now();

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

create or replace function app_public.dbx_bootstrap_first_owner_user(
  p_user_id uuid,
  p_email text,
  p_display_name text,
  p_telegram_user_id text,
  p_referral_code text default 'DBX-FIRST-0001'
)
returns jsonb
language sql
security definer
set search_path = app_public, public, auth
as $$
  select public.dbx_bootstrap_first_owner_user(
    p_user_id,
    p_email,
    p_display_name,
    p_telegram_user_id,
    p_referral_code
  );
$$;

revoke all on function app_public.dbx_bootstrap_first_owner_user(uuid, text, text, text, text) from public;
grant execute on function app_public.dbx_bootstrap_first_owner_user(uuid, text, text, text, text) to service_role;

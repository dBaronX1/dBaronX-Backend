begin;

create schema if not exists app_public;

create extension if not exists pgcrypto;

create table if not exists app_public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text,
  full_name text,
  display_name text,
  referral_code text,
  phone text,
  country text,
  avatar_url text,
  preferred_language text not null default 'en',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table app_public.user_profiles add column if not exists id uuid default gen_random_uuid();
alter table app_public.user_profiles add column if not exists user_id uuid;
alter table app_public.user_profiles add column if not exists email text;
alter table app_public.user_profiles add column if not exists full_name text;
alter table app_public.user_profiles add column if not exists display_name text;
alter table app_public.user_profiles add column if not exists referral_code text;
alter table app_public.user_profiles add column if not exists phone text;
alter table app_public.user_profiles add column if not exists country text;
alter table app_public.user_profiles add column if not exists avatar_url text;
alter table app_public.user_profiles add column if not exists preferred_language text default 'en';
alter table app_public.user_profiles add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.user_profiles add column if not exists created_at timestamptz not null default now();
alter table app_public.user_profiles add column if not exists updated_at timestamptz not null default now();

update app_public.user_profiles
set preferred_language = 'en'
where preferred_language is null;

alter table app_public.user_profiles
  alter column preferred_language set default 'en',
  alter column preferred_language set not null,
  alter column metadata set default '{}'::jsonb,
  alter column metadata set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null,
  alter column user_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'user_profiles_pkey'
      and conrelid = 'app_public.user_profiles'::regclass
  ) then
    alter table app_public.user_profiles
      add constraint user_profiles_pkey primary key (id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'user_profiles_user_id_key'
      and conrelid = 'app_public.user_profiles'::regclass
  ) then
    alter table app_public.user_profiles
      add constraint user_profiles_user_id_key unique (user_id);
  end if;
end
$$;

create index if not exists idx_user_profiles_user_id on app_public.user_profiles (user_id);
create index if not exists idx_user_profiles_email on app_public.user_profiles (email);
create index if not exists idx_user_profiles_referral_code on app_public.user_profiles (referral_code);

alter table app_public.user_profiles enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'app_public' and tablename = 'user_profiles' and policyname = 'user_profiles_select_own') then
    create policy "user_profiles_select_own"
      on app_public.user_profiles
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'app_public' and tablename = 'user_profiles' and policyname = 'user_profiles_insert_own') then
    create policy "user_profiles_insert_own"
      on app_public.user_profiles
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'app_public' and tablename = 'user_profiles' and policyname = 'user_profiles_update_own') then
    create policy "user_profiles_update_own"
      on app_public.user_profiles
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'app_public' and tablename = 'user_profiles' and policyname = 'user_profiles_service_role_all') then
    create policy "user_profiles_service_role_all"
      on app_public.user_profiles
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end
$$;

create or replace function app_public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_profiles_set_updated_at on app_public.user_profiles;

create trigger trg_user_profiles_set_updated_at
before update on app_public.user_profiles
for each row
execute function app_public.set_updated_at();

commit;

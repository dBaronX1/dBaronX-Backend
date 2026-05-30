-- AI Stories generation contract alignment.
-- Idempotent, additive repair for fields used by the FastAPI/Rocket story generation contract.

create schema if not exists app_public;

create table if not exists app_public.ai_stories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  title text,
  status text not null default 'draft'
);

alter table app_public.ai_stories add column if not exists created_at timestamptz not null default now();
alter table app_public.ai_stories add column if not exists updated_at timestamptz not null default now();
alter table app_public.ai_stories add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.ai_stories add column if not exists user_id uuid;
alter table app_public.ai_stories add column if not exists story_id text;
alter table app_public.ai_stories add column if not exists title text;
alter table app_public.ai_stories add column if not exists slug text;
alter table app_public.ai_stories add column if not exists prompt text;
alter table app_public.ai_stories add column if not exists content text;
alter table app_public.ai_stories add column if not exists excerpt text;
alter table app_public.ai_stories add column if not exists genre text;
alter table app_public.ai_stories add column if not exists tone text;
alter table app_public.ai_stories add column if not exists language text;
alter table app_public.ai_stories add column if not exists provider text;
alter table app_public.ai_stories add column if not exists tags text[] not null default '{}'::text[];
alter table app_public.ai_stories add column if not exists status text not null default 'draft';
alter table app_public.ai_stories enable row level security;

do $$
begin
  if to_regproc('app_public.set_updated_at()') is not null
     and not exists (
       select 1
       from pg_trigger
       where tgname = 'trg_ai_stories_set_updated_at'
         and tgrelid = 'app_public.ai_stories'::regclass
     ) then
    create trigger trg_ai_stories_set_updated_at
      before update on app_public.ai_stories
      for each row execute function app_public.set_updated_at();
  end if;
end $$;

create table if not exists app_public.ai_story_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  prompt text,
  genre text,
  tone text,
  language text,
  status text not null default 'queued',
  started_at timestamptz,
  completed_at timestamptz,
  error_message text
);

alter table app_public.ai_story_generation_jobs add column if not exists created_at timestamptz not null default now();
alter table app_public.ai_story_generation_jobs add column if not exists updated_at timestamptz not null default now();
alter table app_public.ai_story_generation_jobs add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.ai_story_generation_jobs add column if not exists user_id uuid;
alter table app_public.ai_story_generation_jobs add column if not exists prompt text;
alter table app_public.ai_story_generation_jobs add column if not exists genre text;
alter table app_public.ai_story_generation_jobs add column if not exists tone text;
alter table app_public.ai_story_generation_jobs add column if not exists language text;
alter table app_public.ai_story_generation_jobs add column if not exists status text not null default 'queued';
alter table app_public.ai_story_generation_jobs add column if not exists started_at timestamptz;
alter table app_public.ai_story_generation_jobs add column if not exists completed_at timestamptz;
alter table app_public.ai_story_generation_jobs add column if not exists error_message text;
alter table app_public.ai_story_generation_jobs enable row level security;

do $$
begin
  if to_regproc('app_public.set_updated_at()') is not null
     and not exists (
       select 1
       from pg_trigger
       where tgname = 'trg_ai_story_generation_jobs_set_updated_at'
         and tgrelid = 'app_public.ai_story_generation_jobs'::regclass
     ) then
    create trigger trg_ai_story_generation_jobs_set_updated_at
      before update on app_public.ai_story_generation_jobs
      for each row execute function app_public.set_updated_at();
  end if;
end $$;

create table if not exists app_public.ai_story_moderation_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  story_id uuid,
  user_id uuid,
  allowed boolean not null default false,
  flags text[] not null default '{}'::text[]
);

alter table app_public.ai_story_moderation_logs add column if not exists created_at timestamptz not null default now();
alter table app_public.ai_story_moderation_logs add column if not exists updated_at timestamptz not null default now();
alter table app_public.ai_story_moderation_logs add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table app_public.ai_story_moderation_logs add column if not exists story_id uuid;
alter table app_public.ai_story_moderation_logs add column if not exists user_id uuid;
alter table app_public.ai_story_moderation_logs add column if not exists allowed boolean not null default false;
alter table app_public.ai_story_moderation_logs add column if not exists flags text[] not null default '{}'::text[];
alter table app_public.ai_story_moderation_logs enable row level security;

do $$
begin
  if to_regproc('app_public.set_updated_at()') is not null
     and not exists (
       select 1
       from pg_trigger
       where tgname = 'trg_ai_story_moderation_logs_set_updated_at'
         and tgrelid = 'app_public.ai_story_moderation_logs'::regclass
     ) then
    create trigger trg_ai_story_moderation_logs_set_updated_at
      before update on app_public.ai_story_moderation_logs
      for each row execute function app_public.set_updated_at();
  end if;
end $$;

-- Production AI Stories generation path additions (idempotent and additive).
alter table app_public.ai_stories add column if not exists concept_id text;
alter table app_public.ai_stories add column if not exists model text;
alter table app_public.ai_stories add column if not exists length text;
alter table app_public.ai_stories add column if not exists audience text;
alter table app_public.ai_stories add column if not exists word_count integer;

do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='app_public' and table_name='ai_stories' and column_name='concept_id') then
    execute 'create index if not exists idx_ai_stories_concept_id on app_public.ai_stories (concept_id)';
  end if;
end $$;

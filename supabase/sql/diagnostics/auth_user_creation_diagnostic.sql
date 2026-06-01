-- dBaronX Supabase Auth user-creation diagnostic.
-- Safe to run in the Supabase SQL Editor. This script is read-only and only emits result sets.
-- Use when Supabase Dashboard Authentication > Users reports: "Database error creating new user".

select
  'auth_users_non_internal_triggers' as diagnostic_section,
  n.nspname as table_schema,
  c.relname as table_name,
  t.tgname as trigger_name,
  pg_get_triggerdef(t.oid, true) as trigger_definition,
  pn.nspname as function_schema,
  p.proname as function_name,
  p.oid::regprocedure::text as function_signature
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace pn on pn.oid = p.pronamespace
where n.nspname = 'auth'
  and c.relname = 'users'
  and not t.tgisinternal
order by t.tgname;

select
  'auth_users_trigger_function_definitions' as diagnostic_section,
  t.tgname as trigger_name,
  pn.nspname as function_schema,
  p.proname as function_name,
  p.oid::regprocedure::text as function_signature,
  pg_get_functiondef(p.oid) as function_definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace pn on pn.oid = p.pronamespace
where n.nspname = 'auth'
  and c.relname = 'users'
  and not t.tgisinternal
order by t.tgname;

select
  'profile_tables_found' as diagnostic_section,
  table_schema,
  table_name,
  table_type
from information_schema.tables
where table_schema in ('public', 'app_public', 'app_private')
  and table_name in ('profiles', 'user_profiles', 'dbx_profiles')
order by table_schema, table_name;

select
  'public_profiles_columns' as diagnostic_section,
  column_name,
  ordinal_position,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
order by ordinal_position;

select
  'app_public_profiles_columns' as diagnostic_section,
  table_name,
  column_name,
  ordinal_position,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'app_public'
  and table_name in ('profiles', 'user_profiles')
order by table_name, ordinal_position;

select
  'profile_table_constraints' as diagnostic_section,
  tc.table_schema,
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  string_agg(kcu.column_name, ', ' order by kcu.ordinal_position) as constraint_columns
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on kcu.constraint_schema = tc.constraint_schema
 and kcu.constraint_name = tc.constraint_name
 and kcu.table_schema = tc.table_schema
 and kcu.table_name = tc.table_name
where tc.table_schema in ('public', 'app_public', 'app_private')
  and tc.table_name in ('profiles', 'user_profiles', 'dbx_profiles')
group by tc.table_schema, tc.table_name, tc.constraint_name, tc.constraint_type
order by tc.table_schema, tc.table_name, tc.constraint_type, tc.constraint_name;

select
  'profile_related_functions' as diagnostic_section,
  n.nspname as function_schema,
  p.proname as function_name,
  p.oid::regprocedure::text as function_signature,
  pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'app_public', 'app_private')
  and (
    p.proname ilike '%handle_new_user%'
    or p.proname ilike '%create_profile%'
    or p.proname ilike '%profile%'
  )
order by n.nspname, p.proname, p.oid::regprocedure::text;

select
  'profile_rls_status' as diagnostic_section,
  schemaname as table_schema,
  tablename as table_name,
  rowsecurity as rls_enabled,
  forcerowsecurity as rls_forced
from pg_tables
where schemaname in ('public', 'app_public', 'app_private')
  and tablename in ('profiles', 'user_profiles', 'dbx_profiles')
order by schemaname, tablename;

select
  'profile_not_null_without_defaults' as diagnostic_section,
  table_schema,
  table_name,
  column_name,
  data_type,
  udt_name
from information_schema.columns
where table_schema in ('public', 'app_public', 'app_private')
  and table_name in ('profiles', 'user_profiles', 'dbx_profiles')
  and is_nullable = 'NO'
  and column_default is null
order by table_schema, table_name, ordinal_position;

select
  'auth_users_duplicate_custom_trigger_functions' as diagnostic_section,
  pn.nspname as function_schema,
  p.proname as function_name,
  p.oid::regprocedure::text as function_signature,
  count(*) as trigger_count,
  array_agg(t.tgname order by t.tgname) as trigger_names
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace pn on pn.oid = p.pronamespace
where n.nspname = 'auth'
  and c.relname = 'users'
  and not t.tgisinternal
group by pn.nspname, p.proname, p.oid
having count(*) > 1
order by trigger_count desc, function_schema, function_name;

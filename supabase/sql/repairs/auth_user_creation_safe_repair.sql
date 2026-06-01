-- dBaronX Supabase Auth user-creation safe repair.
-- Run diagnostics/auth_user_creation_diagnostic.sql first and review all custom auth.users triggers.
-- This repair is idempotent and non-destructive: it does not remove tables, delete users, or disable all auth triggers.
-- It only replaces the conventional public.handle_new_user() + on_auth_user_created trigger when public.profiles exists.
-- If duplicate custom auth.users triggers exist, inspect them with the diagnostic before removing anything.

-- Emergency-only manual option if profile auto-create must be temporarily disabled while investigating:
-- drop trigger if exists on_auth_user_created on auth.users;
-- Prefer the idempotent repair below first, because it preserves profile auto-create and prevents profile failures from blocking auth user creation.

do $$
begin
  if to_regclass('public.profiles') is null then
    raise notice 'Skipping public.handle_new_user repair because public.profiles does not exist. Run the diagnostic and repair the trigger that targets the actual profile table.';
    return;
  end if;

  execute $function$
    create or replace function public.handle_new_user()
    returns trigger
    language plpgsql
    security definer
    set search_path = public, auth, pg_temp
    as $body$
    declare
      v_columns text[] := array[]::text[];
      v_values text[] := array[]::text[];
      v_key_column text := null;
      v_has_unique_key boolean := false;
      v_sql text;
    begin
      if to_regclass('public.profiles') is null then
        return new;
      end if;

      if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'user_id') then
        v_key_column := 'user_id';
      elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'id') then
        v_key_column := 'id';
      else
        raise warning 'public.handle_new_user skipped profile insert: public.profiles has neither user_id nor id column';
        return new;
      end if;

      v_columns := array_append(v_columns, v_key_column);
      v_values := array_append(v_values, quote_literal(new.id));

      if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'email') then
        v_columns := array_append(v_columns, 'email');
        v_values := array_append(v_values, quote_nullable(new.email));
      end if;

      if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'full_name') then
        v_columns := array_append(v_columns, 'full_name');
        v_values := array_append(v_values, quote_nullable(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'name')));
      end if;

      if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'display_name') then
        v_columns := array_append(v_columns, 'display_name');
        v_values := array_append(v_values, quote_nullable(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')));
      end if;

      if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'username') then
        v_columns := array_append(v_columns, 'username');
        v_values := array_append(v_values, quote_nullable(new.raw_user_meta_data ->> 'username'));
      end if;

      if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'referral_code') then
        v_columns := array_append(v_columns, 'referral_code');
        v_values := array_append(v_values, quote_nullable(new.raw_user_meta_data ->> 'referral_code'));
      end if;

      if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'role') then
        v_columns := array_append(v_columns, 'role');
        v_values := array_append(v_values, quote_literal('user'));
      end if;

      if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'account_role') then
        v_columns := array_append(v_columns, 'account_role');
        v_values := array_append(v_values, quote_literal('user'));
      end if;

      if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_admin') then
        v_columns := array_append(v_columns, 'is_admin');
        v_values := array_append(v_values, 'false');
      end if;

      if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'metadata') then
        v_columns := array_append(v_columns, 'metadata');
        v_values := array_append(v_values, quote_literal(coalesce(new.raw_user_meta_data, '{}'::jsonb)::text) || '::jsonb');
      end if;

      if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'created_at') then
        v_columns := array_append(v_columns, 'created_at');
        v_values := array_append(v_values, 'now()');
      end if;

      if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'updated_at') then
        v_columns := array_append(v_columns, 'updated_at');
        v_values := array_append(v_values, 'now()');
      end if;

      select exists (
        select 1
        from pg_index i
        join pg_class c on c.oid = i.indrelid
        join pg_namespace n on n.oid = c.relnamespace
        join pg_attribute a on a.attrelid = c.oid and a.attnum = any(i.indkey)
        where n.nspname = 'public'
          and c.relname = 'profiles'
          and i.indisunique
          and i.indnatts = 1
          and a.attname = v_key_column
      ) into v_has_unique_key;

      if v_has_unique_key then
        if array_length(v_columns, 1) > 1 then
          v_sql := format(
            'insert into public.profiles (%s) values (%s) on conflict (%I) do update set %s',
            array_to_string(array(select format('%I', col) from unnest(v_columns) as col), ', '),
            array_to_string(v_values, ', '),
            v_key_column,
            array_to_string(
              array(
                select format('%1$I = excluded.%1$I', col)
                from unnest(v_columns) as col
                where col <> v_key_column
              ),
              ', '
            )
          );
        else
          v_sql := format(
            'insert into public.profiles (%s) values (%s) on conflict (%I) do nothing',
            array_to_string(array(select format('%I', col) from unnest(v_columns) as col), ', '),
            array_to_string(v_values, ', '),
            v_key_column
          );
        end if;
      else
        v_sql := format(
          'insert into public.profiles (%s) select %s where not exists (select 1 from public.profiles where %I = %s)',
          array_to_string(array(select format('%I', col) from unnest(v_columns) as col), ', '),
          array_to_string(v_values, ', '),
          v_key_column,
          quote_literal(new.id)
        );
      end if;

      execute v_sql;
      return new;
    exception
      when others then
        raise warning 'public.handle_new_user profile insert skipped so auth user creation can continue: SQLSTATE %, %', sqlstate, sqlerrm;
        return new;
    end;
    $body$;
  $function$;

  drop trigger if exists on_auth_user_created on auth.users;

  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
end
$$;

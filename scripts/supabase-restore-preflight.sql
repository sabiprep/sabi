-- SABI — preflight for copying the full project INTO the main project
--
-- Run this on the DESTINATION (main project, dnrzixaasphxiswjyglj), read only.
-- It answers the three questions that decide whether the copy is safe:
--   1. Which public tables already hold rows? (a COPY would collide there)
--   2. Which tables are owned by an auth user? (their rows cannot be copied
--      unless the same auth.users rows exist here first)
--   3. Which sequences need setval afterwards?
--
-- Context and the full procedure:
-- docs/runbooks/supabase-copy-full-into-main-2026-11-14.md
--
-- Run the numbered blocks one at a time: the SQL editor shows only the last
-- result grid, and blocks 2 and 4 report through the Messages/Notices panel.

-- 1. Confirm you are on the destination.
select current_database()                as database,
       current_user                      as connected_role,
       current_setting('server_version') as postgres_version;

-- 2. Exact row count for every table in public.
--    Any table above zero is a table where the copy must MERGE, not insert.
do $$
declare
  r record;
  n bigint;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace ns on ns.oid = c.relnamespace
    where ns.nspname = 'public'
      and c.relkind in ('r', 'p')
    order by c.relname
  loop
    execute format('select count(*) from public.%I', r.relname) into n;
    raise notice '%-42s %', r.relname, n;
  end loop;
end $$;

-- 3. Every column that points at auth.users. Rows in these tables reference an
--    account; if that account does not exist on this project the insert fails on
--    the foreign key. Exclude these tables from the data copy and handle the
--    accounts deliberately (see section 4 of the runbook).
select tc.table_name            as table_name,
       kcu.column_name          as user_column,
       coalesce(rc.delete_rule, 'NO ACTION') as on_delete
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name
 and kcu.constraint_schema = tc.constraint_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.constraint_schema = tc.constraint_schema
left join information_schema.referential_constraints rc
  on rc.constraint_name = tc.constraint_name
 and rc.constraint_schema = tc.constraint_schema
where tc.constraint_type = 'FOREIGN KEY'
  and ccu.table_schema = 'auth'
  and ccu.table_name = 'users'
order by tc.table_name, kcu.column_name;

-- 4. Sequences to advance after a copy that inserted explicit ids.
--    Copy each line, replace nothing, run it after the data restore.
select format('select setval(%L, coalesce((select max(%I) from %I.%I), 0) + 1, false);',
              pg_get_serial_sequence(quote_ident(c.table_schema) || '.' || quote_ident(c.table_name),
                                     c.column_name),
              c.column_name, c.table_schema, c.table_name) as fix_sequence
from information_schema.columns c
where c.table_schema = 'public'
  and (c.is_identity = 'YES' or c.column_default like 'nextval(%')
order by 1;

-- 5. Accounts and ledger on the destination. Compare with the same query run on
--    the source: if the source holds accounts this project does not have, the
--    user-owned tables can only be copied after those accounts are created.
select (select count(*) from auth.users)                                as auth_users,
       (select count(*) from auth.users where email_confirmed_at is not null) as confirmed_users,
       (select count(*) from supabase_migrations.schema_migrations)     as ledger_rows;

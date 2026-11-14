-- SABI — Supabase project audit (READ ONLY)
--
-- Purpose: compare the two Supabase projects and decide which one is the source
-- of truth. Nothing here writes, creates or drops anything: every statement is a
-- SELECT, plus one DO block that only raises notices.
--
-- How to run: Supabase dashboard -> the project -> SQL Editor -> New query ->
-- paste this file. The editor shows only the LAST statement's result grid, so run
-- the numbered blocks one at a time (select a block, then Run) and copy each grid.
-- Block 8's output appears under the editor's Messages/Notices panel.
-- Run the whole thing in BOTH projects and compare result by result. Context and
-- the decision procedure are in
-- docs/runbooks/supabase-project-consolidation-2026-11-14.md.

-- 1. Which server am I on, and what is it running?
select current_database()              as database,
       current_user                    as connected_role,
       current_setting('server_version') as postgres_version,
       (select count(*) from pg_namespace where nspname = 'public') as has_public_schema;

-- 2. Every table in public, with an estimated row count and its RLS state.
--    A table that appears here but in no migration is an "orphan" (see §4 of the
--    runbook): it survives only as long as this project does.
select c.relname                    as table_name,
       greatest(c.reltuples::bigint, 0) as est_rows,
       c.relrowsecurity             as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
order by c.relname;

-- 3. Headline totals.
select count(*)                                  as public_tables,
       count(*) filter (where c.relrowsecurity)  as rls_enabled_tables,
       count(*) filter (where not c.relrowsecurity) as rls_disabled_tables
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p');

-- 4. Migration ledger. If this errors, the project has no CLI migration ledger
--    at all - that is itself the finding, and it means every migration was
--    applied by hand.
select version, name, inserted_at
from supabase_migrations.schema_migrations
order by version;

-- 5. Accounts. A project with real users cannot be silently discarded.
select count(*)                                                as auth_users,
       count(*) filter (where email_confirmed_at is not null)  as confirmed_users,
       count(*) filter (where last_sign_in_at is not null)     as users_who_signed_in,
       min(created_at)                                         as first_account,
       max(created_at)                                         as last_account
from auth.users;

select provider, count(*) as identities
from auth.identities
group by provider
order by identities desc;

-- 6. Storage buckets and how much they hold.
select b.id, b.name, b.public,
       (select count(*) from storage.objects o where o.bucket_id = b.id) as objects
from storage.buckets b
order by b.name;

-- 7. A single hash of the public schema. Two projects with the same fingerprint
--    have identical table/column names and types; different fingerprints mean
--    the two schemas have diverged and a plain dump/restore is not a no-op.
select md5(string_agg(col.table_name || '.' || col.column_name || ':' || col.data_type,
                      ',' order by col.table_name, col.column_name)) as public_schema_fingerprint,
       count(*) as public_columns
from information_schema.columns col
where col.table_schema = 'public';

-- 8. Exact counts for the tables that matter, skipping any that do not exist.
do $$
declare
  tbl   text;
  n     bigint;
  names text[] := array[
    'profiles', 'question_bank', 'jamb_subjects', 'jamb_topics', 'jamb_subtopics',
    'learning_sessions', 'student_topic_mastery', 'audit_logs', 'notifications'
  ];
begin
  foreach tbl in array names loop
    if to_regclass('public.' || tbl) is null then
      raise notice '%-24s MISSING', tbl;
    else
      execute format('select count(*) from public.%I', tbl) into n;
      raise notice '%-24s % rows', tbl, n;
    end if;
  end loop;
end $$;

begin;

do $$
declare
  tbl text;
  required_tables text[] := array[
    'question_variant_groups',
    'question_variant_members',
    'question_attempts',
    'adaptive_decisions',
    'student_objective_mastery',
    'question_generation_jobs',
    'question_source_evidence'
  ];
  trigger_count integer;
  fn_oid oid;
  fn_definer boolean;
  fn_config text[];
begin
  foreach tbl in array required_tables loop
    if to_regclass('public.' || tbl) is null then
      raise exception 'Required question intelligence table missing: %', tbl;
    end if;
    if not (select c.relrowsecurity from pg_class c where c.oid = to_regclass('public.' || tbl)) then
      raise exception 'RLS is not enabled on %', tbl;
    end if;
    if has_table_privilege('anon', 'public.' || tbl, 'SELECT')
       or has_table_privilege('anon', 'public.' || tbl, 'INSERT')
       or has_table_privilege('authenticated', 'public.' || tbl, 'SELECT')
       or has_table_privilege('authenticated', 'public.' || tbl, 'INSERT') then
      raise exception 'Client role unexpectedly has direct access to %', tbl;
    end if;
    if not has_table_privilege('service_role', 'public.' || tbl, 'INSERT') then
      raise exception 'service_role cannot insert into %', tbl;
    end if;
  end loop;

  select p.oid, p.prosecdef, p.proconfig
    into fn_oid, fn_definer, fn_config
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'capture_question_attempt_from_session_item';

  if fn_oid is null then
    raise exception 'Attempt-capture trigger function is missing';
  end if;
  if fn_definer then
    raise exception 'Attempt-capture function must remain SECURITY INVOKER';
  end if;
  if not coalesce(fn_config @> array['search_path=""'], false) then
    raise exception 'Attempt-capture function must pin an empty search_path; got %', fn_config;
  end if;
  if has_function_privilege('anon', fn_oid, 'EXECUTE')
     or has_function_privilege('authenticated', fn_oid, 'EXECUTE') then
    raise exception 'Client role can execute internal attempt-capture function';
  end if;
  if not has_function_privilege('service_role', fn_oid, 'EXECUTE') then
    raise exception 'service_role cannot execute attempt-capture function';
  end if;

  select count(*) into trigger_count
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'learning_session_items'
    and t.tgname = 'capture_question_attempt_after_session_item_answer'
    and not t.tgisinternal
    and t.tgenabled = 'O';

  if trigger_count <> 1 then
    raise exception 'Expected exactly one enabled attempt-capture trigger; found %', trigger_count;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.question_attempts'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%user_id, client_submission_id%'
  ) then
    raise exception 'Attempt idempotency unique constraint is missing';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.question_variant_members'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%group_id, question_id%'
  ) then
    raise exception 'Variant membership uniqueness constraint is missing';
  end if;
end $$;

rollback;

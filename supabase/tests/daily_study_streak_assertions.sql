-- Verify daily study streak RPC is present and restricted to the backend role.
do $$
begin
  if to_regprocedure('public.record_student_study_activity(uuid,text)') is null then
    raise exception 'Daily study streak RPC is missing';
  end if;

  if has_function_privilege('anon', 'public.record_student_study_activity(uuid,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.record_student_study_activity(uuid,text)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.record_student_study_activity(uuid,text)', 'EXECUTE') then
    raise exception 'Daily study streak RPC must be service-role-only';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'student_streak_state'
      and column_name = 'timezone'
  ) then
    raise exception 'Student streak timezone column is missing';
  end if;
end $$;

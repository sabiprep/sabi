-- Phase 3 structural/security assertions. Safe to run after migration on disposable PostgreSQL.
DO $$
DECLARE
  v_table TEXT;
  v_function REGPROCEDURE;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'learning_sessions','learning_attempts','student_topic_mastery'
  ] LOOP
    IF to_regclass('public.' || v_table) IS NULL THEN
      RAISE EXCEPTION 'Missing Phase 3 table: %', v_table;
    END IF;
    IF NOT (
      SELECT c.relrowsecurity
      FROM pg_class c
      WHERE c.oid = to_regclass('public.' || v_table)
    ) THEN
      RAISE EXCEPTION 'RLS is not enabled on %', v_table;
    END IF;
    IF has_table_privilege('anon', 'public.' || v_table, 'SELECT')
       OR has_table_privilege('authenticated', 'public.' || v_table, 'SELECT')
       OR has_table_privilege('anon', 'public.' || v_table, 'INSERT')
       OR has_table_privilege('authenticated', 'public.' || v_table, 'INSERT') THEN
      RAISE EXCEPTION 'Client role has direct access to %', v_table;
    END IF;
  END LOOP;

  IF NOT has_table_privilege('service_role', 'public.learning_attempts', 'INSERT')
     OR NOT has_table_privilege('service_role', 'public.student_topic_mastery', 'UPDATE') THEN
    RAISE EXCEPTION 'Service role is missing required learning-evidence privileges';
  END IF;

  FOREACH v_function IN ARRAY ARRAY[
    'public.create_learning_session(uuid,text,text)'::regprocedure,
    'public.record_learning_attempt(uuid,uuid,uuid,text,text,integer)'::regprocedure,
    'public.complete_learning_session(uuid,uuid,text)'::regprocedure
  ] LOOP
    IF has_function_privilege('public', v_function, 'EXECUTE')
       OR has_function_privilege('anon', v_function, 'EXECUTE')
       OR has_function_privilege('authenticated', v_function, 'EXECUTE') THEN
      RAISE EXCEPTION 'Client role can execute privileged function %', v_function;
    END IF;
    IF NOT has_function_privilege('service_role', v_function, 'EXECUTE') THEN
      RAISE EXCEPTION 'Service role cannot execute privileged function %', v_function;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='learning_attempts_student_topic_idx'
  ) THEN
    RAISE EXCEPTION 'Missing student/topic attempt index';
  END IF;
END
$$;

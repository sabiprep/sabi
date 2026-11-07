-- Phase 5 structural/security assertions. Safe on disposable PostgreSQL.
DO $phase5_assertions$
DECLARE
  v_table TEXT;
  v_function REGPROCEDURE := 'public.create_jamb_exam_run(uuid,text,text[])'::regprocedure;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['jamb_exam_runs','jamb_exam_run_items'] LOOP
    IF to_regclass('public.' || v_table) IS NULL THEN
      RAISE EXCEPTION 'Missing Phase 5 table: %', v_table;
    END IF;
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = to_regclass('public.' || v_table)) THEN
      RAISE EXCEPTION 'RLS is not enabled on %', v_table;
    END IF;
    IF has_table_privilege('anon', 'public.' || v_table, 'SELECT')
       OR has_table_privilege('authenticated', 'public.' || v_table, 'SELECT')
       OR has_table_privilege('anon', 'public.' || v_table, 'INSERT')
       OR has_table_privilege('authenticated', 'public.' || v_table, 'INSERT') THEN
      RAISE EXCEPTION 'Client role has direct access to %', v_table;
    END IF;
  END LOOP;

  IF NOT has_table_privilege('service_role', 'public.jamb_exam_runs', 'INSERT')
     OR NOT has_table_privilege('service_role', 'public.jamb_exam_run_items', 'INSERT') THEN
    RAISE EXCEPTION 'Service role is missing exam-run write privileges';
  END IF;

  IF has_function_privilege('public', v_function, 'EXECUTE')
     OR has_function_privilege('anon', v_function, 'EXECUTE')
     OR has_function_privilege('authenticated', v_function, 'EXECUTE')
     OR NOT has_function_privilege('service_role', v_function, 'EXECUTE') THEN
    RAISE EXCEPTION 'Exam-run creation RPC has incorrect execution privileges';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='jamb_exam_run_items_run_order_idx'
  ) THEN
    RAISE EXCEPTION 'Missing exam item ordering index';
  END IF;
END
$phase5_assertions$;

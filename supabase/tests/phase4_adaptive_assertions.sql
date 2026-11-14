-- Phase 4 adaptive review security and schema assertions.
DO $phase4$
BEGIN
  IF to_regclass('public.student_topic_review_schedule') IS NULL THEN
    RAISE EXCEPTION 'Missing Phase 4 spaced-review schedule table';
  END IF;

  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.student_topic_review_schedule'::regclass) THEN
    RAISE EXCEPTION 'RLS is not enabled on student_topic_review_schedule';
  END IF;

  IF has_table_privilege('anon', 'public.student_topic_review_schedule', 'SELECT')
     OR has_table_privilege('authenticated', 'public.student_topic_review_schedule', 'SELECT')
     OR has_table_privilege('anon', 'public.student_topic_review_schedule', 'INSERT')
     OR has_table_privilege('authenticated', 'public.student_topic_review_schedule', 'UPDATE') THEN
    RAISE EXCEPTION 'Client role has direct access to spaced-review schedule';
  END IF;

  IF NOT has_table_privilege('service_role', 'public.student_topic_review_schedule', 'SELECT') THEN
    RAISE EXCEPTION 'Service role cannot read spaced-review schedules';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'learning_attempt_schedule_topic_review'
      AND tgrelid = 'public.learning_attempts'::regclass
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Learning attempt does not update spaced-review schedule';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'student_topic_review_due_idx'
  ) THEN
    RAISE EXCEPTION 'Missing due-review lookup index';
  END IF;

  IF has_function_privilege('anon', 'public.schedule_topic_review_after_attempt()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.schedule_topic_review_after_attempt()', 'EXECUTE')
     OR has_function_privilege('service_role', 'public.schedule_topic_review_after_attempt()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Trigger-only schedule function is executable by client/service roles';
  END IF;
END
$phase4$;

-- Assertions for the Phase 1 migration. Any failure aborts CI.
DO $$
DECLARE
  subject_count integer;
  config_count integer;
  config_subject_count integer;
  rel text;
BEGIN
  SELECT count(*) INTO subject_count FROM public.jamb_subjects;
  IF subject_count <> 23 THEN
    RAISE EXCEPTION 'Expected 23 JAMB subjects; found %', subject_count;
  END IF;

  SELECT count(*) INTO config_count FROM public.exam_configurations;
  IF config_count <> 2 THEN
    RAISE EXCEPTION 'Expected 2 exam configurations; found %', config_count;
  END IF;

  SELECT count(*) INTO config_subject_count FROM public.exam_configuration_subjects;
  IF config_subject_count <> 46 THEN
    RAISE EXCEPTION 'Expected 46 exam-subject mappings; found %', config_subject_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.exam_configurations
    WHERE key = 'full-mock' AND question_count = 180 AND duration_seconds = 7200
      AND compulsory_subject_slug = 'use-of-english' AND total_subjects = 4
  ) THEN
    RAISE EXCEPTION 'Full mock configuration is incorrect';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.exam_configurations
    WHERE key = 'quick-mock' AND question_count = 40 AND duration_seconds = 1800
      AND compulsory_subject_slug = 'use-of-english' AND total_subjects = 4
  ) THEN
    RAISE EXCEPTION 'Quick mock configuration is incorrect';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname IN ('Allow insert and update via server', 'Allow read access to own profile')
  ) THEN
    RAISE EXCEPTION 'Overly broad legacy profile policies remain';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Candidates can read their own profile'
      AND cmd = 'SELECT' AND qual LIKE '%auth.uid()%id%'
  ) THEN
    RAISE EXCEPTION 'Owner-scoped profile SELECT policy is missing';
  END IF;

  FOREACH rel IN ARRAY ARRAY[
    'jamb_subjects','jamb_topics','exam_configurations',
    'exam_configuration_subjects','course_subject_combinations',
    'course_subject_combination_subjects'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = rel AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'RLS is not enabled on public.%', rel;
    END IF;
  END LOOP;

  IF has_function_privilege('anon', 'public.enforce_profile_protected_columns()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.enforce_profile_protected_columns()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.handle_new_or_linked_user()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.handle_new_or_linked_user()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Client roles can still execute protected trigger functions';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid = 'public.generate_sabi_unique_id()'::regprocedure
      AND p.proconfig @> ARRAY['search_path=pg_catalog, public']
  ) THEN
    RAISE EXCEPTION 'Unique ID function search_path was not hardened';
  END IF;
END
$$;

-- Re-running the migration must remain safe and must not duplicate seed rows.

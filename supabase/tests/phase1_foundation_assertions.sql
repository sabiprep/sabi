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

  -- RLS does not protect TRUNCATE; client grants must be least-privilege.
  IF has_table_privilege('anon', 'public.profiles', 'SELECT')
     OR has_table_privilege('anon', 'public.profiles', 'TRUNCATE')
     OR has_table_privilege('anon', 'public.profiles', 'INSERT')
     OR has_table_privilege('anon', 'public.profiles', 'UPDATE')
     OR has_table_privilege('anon', 'public.profiles', 'DELETE') THEN
    RAISE EXCEPTION 'Anonymous role retains a client privilege on profiles';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.profiles', 'SELECT')
     OR NOT has_table_privilege('authenticated', 'public.profiles', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.profiles', 'INSERT')
     OR has_table_privilege('authenticated', 'public.profiles', 'DELETE')
     OR has_table_privilege('authenticated', 'public.profiles', 'TRUNCATE')
     OR has_table_privilege('authenticated', 'public.profiles', 'TRIGGER') THEN
    RAISE EXCEPTION 'Authenticated profile grants are not least-privilege';
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

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid = 'public.enforce_profile_protected_columns()'::regprocedure
      AND pg_get_functiondef(p.oid) LIKE '%session_user IN%'
      AND pg_get_functiondef(p.oid) NOT LIKE '%IF current_user IN%'
  ) THEN
    RAISE EXCEPTION 'Profile protection trigger still trusts current_user inside SECURITY DEFINER';
  END IF;
END
$$;

-- Prove an authenticated PostgREST-style caller cannot promote their own role.
INSERT INTO public.profiles (id, email, sabi_unique_id)
VALUES ('22222222-2222-4222-8222-222222222222', 'rls-regression@sabi.test', '9876Z')
ON CONFLICT (id) DO NOTHING;

SET SESSION AUTHORIZATION authenticator;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', false);
SELECT set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);

DO $$
DECLARE
  role_change_blocked boolean := false;
BEGIN
  BEGIN
    UPDATE public.profiles
    SET role = 'ADMIN'
    WHERE id = '22222222-2222-4222-8222-222222222222';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'profiles.role can only be changed by SABI administrators' THEN
      role_change_blocked := true;
    ELSE
      RAISE;
    END IF;
  END;

  IF NOT role_change_blocked THEN
    RAISE EXCEPTION 'SECURITY FAILURE: authenticated candidate promoted their own profile role';
  END IF;
END
$$;

RESET ROLE;
RESET SESSION AUTHORIZATION;

-- Re-running the migration must remain safe and must not duplicate seed rows.

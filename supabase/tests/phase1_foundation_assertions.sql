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

  -- RLS does not protect TRUNCATE; check direct and inherited client privileges.
  IF has_table_privilege('anon', 'public.profiles', 'SELECT')
     OR has_table_privilege('anon', 'public.profiles', 'TRUNCATE')
     OR has_table_privilege('anon', 'public.profiles', 'INSERT')
     OR has_table_privilege('anon', 'public.profiles', 'UPDATE')
     OR has_table_privilege('anon', 'public.profiles', 'DELETE') THEN
    RAISE EXCEPTION 'Anonymous role retains a direct or inherited client privilege on profiles';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class c
    CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
    WHERE c.oid = 'public.profiles'::regclass
      AND a.grantee = 0
      AND a.privilege_type IN ('SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER')
  ) THEN
    RAISE EXCEPTION 'PUBLIC retains table-level privileges on profiles';
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


-- Draft legacy taxonomy must not be presented to clients as verified syllabus data.
SET ROLE anon;
DO $taxonomy_visibility$
DECLARE
  visible_topics integer;
  visible_subtopics integer;
  visible_versions integer;
BEGIN
  SELECT count(*) INTO visible_topics FROM public.jamb_topics;
  SELECT count(*) INTO visible_subtopics FROM public.jamb_subtopics;
  SELECT count(*) INTO visible_versions FROM public.jamb_syllabus_versions;
  IF visible_topics <> 0 OR visible_subtopics <> 0 OR visible_versions <> 0 THEN
    RAISE EXCEPTION 'Anonymous client can see unverified syllabus taxonomy';
  END IF;
END
$taxonomy_visibility$;
RESET ROLE;

-- Prove an authenticated PostgREST-style caller cannot promote their own role.
INSERT INTO public.profiles (id, email, sabi_unique_id)
VALUES
  ('22222222-2222-4222-8222-222222222222', 'rls-regression@sabi.test', '9876Z'),
  ('33333333-3333-4333-8333-333333333333', 'other-student@sabi.test', '9876Y')
ON CONFLICT (id) DO NOTHING;

SET SESSION AUTHORIZATION authenticator;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', false);
SELECT set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);

DO $$
DECLARE
  role_change_blocked boolean := false;
  other_visible integer := 0;
  affected integer := 0;
BEGIN
  SELECT count(*) INTO other_visible
  FROM public.profiles
  WHERE id = '33333333-3333-4333-8333-333333333333';
  IF other_visible <> 0 THEN
    RAISE EXCEPTION 'SECURITY FAILURE: authenticated candidate read another student profile';
  END IF;

  UPDATE public.profiles
  SET target_score = 330
  WHERE id = '33333333-3333-4333-8333-333333333333';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN
    RAISE EXCEPTION 'SECURITY FAILURE: authenticated candidate updated another student profile';
  END IF;

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

-- Re-running the migrations must remain safe and must not duplicate seed rows.


-- Phase 1.3/1.4: catalogue least privilege, default ACLs, and usable taxonomy.
DO $$
DECLARE
  rel text;
  client_role text;
  topic_count integer;
  subtopic_count integer;
  unmapped integer;
BEGIN
  FOREACH rel IN ARRAY ARRAY[
    'jamb_subjects','jamb_topics','exam_configurations',
    'exam_configuration_subjects','course_subject_combinations',
    'course_subject_combination_subjects'
  ] LOOP
    FOREACH client_role IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF NOT has_table_privilege(client_role, 'public.' || rel, 'SELECT')
         OR has_table_privilege(client_role, 'public.' || rel, 'INSERT')
         OR has_table_privilege(client_role, 'public.' || rel, 'UPDATE')
         OR has_table_privilege(client_role, 'public.' || rel, 'DELETE')
         OR has_table_privilege(client_role, 'public.' || rel, 'TRUNCATE')
         OR has_table_privilege(client_role, 'public.' || rel, 'TRIGGER')
         OR has_table_privilege(client_role, 'public.' || rel, 'REFERENCES') THEN
        RAISE EXCEPTION 'Catalogue ACL is not read-only for role % on public.%', client_role, rel;
      END IF;
    END LOOP;
  END LOOP;

  IF has_table_privilege('anon', 'public.question_bank', 'SELECT')
     OR has_table_privilege('authenticated', 'public.question_bank', 'SELECT')
     OR has_table_privilege('anon', 'public.question_bank', 'TRUNCATE')
     OR has_table_privilege('authenticated', 'public.question_bank', 'TRUNCATE') THEN
    RAISE EXCEPTION 'Question bank is not server-only';
  END IF;

  IF has_table_privilege('anon', 'public.audit_logs', 'SELECT')
     OR has_table_privilege('authenticated', 'public.audit_logs', 'SELECT')
     OR has_table_privilege('anon', 'public.audit_logs', 'TRUNCATE')
     OR has_table_privilege('authenticated', 'public.audit_logs', 'TRUNCATE') THEN
    RAISE EXCEPTION 'Client roles retain direct audit-log access';
  END IF;

  IF NOT has_table_privilege('service_role', 'public.audit_logs', 'SELECT')
     OR NOT has_table_privilege('service_role', 'public.jamb_subjects', 'INSERT') THEN
    RAISE EXCEPTION 'Privileged server access was unintentionally removed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_default_acl d
    JOIN pg_roles owner_role ON owner_role.oid = d.defaclrole
    CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    JOIN pg_roles grantee ON grantee.oid = a.grantee
    WHERE d.defaclnamespace = 'public'::regnamespace
      AND owner_role.rolname IN ('postgres','supabase_admin')
      AND grantee.rolname IN ('anon','authenticated')
      AND d.defaclobjtype IN ('r','S')
  ) THEN
    RAISE EXCEPTION 'Future tables/sequences still inherit client grants';
  END IF;

  SELECT count(*) INTO topic_count FROM public.jamb_topics;
  SELECT count(*) INTO subtopic_count FROM public.jamb_subtopics;
  IF topic_count <> 4 OR subtopic_count <> 4 THEN
    RAISE EXCEPTION 'Expected 4 draft topics and 4 draft subtopics; found % and %', topic_count, subtopic_count;
  END IF;

  SELECT count(*) INTO unmapped
  FROM public.question_bank
  WHERE topic IS NOT NULL AND btrim(topic) <> '' AND topic_id IS NULL;
  IF unmapped <> 0 THEN
    RAISE EXCEPTION 'Question bank contains % non-empty topic labels without a taxonomy reference', unmapped;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.jamb_topics
    WHERE source_label <> 'legacy_question_bank' OR verification_status <> 'draft'
  ) THEN
    RAISE EXCEPTION 'Legacy topic labels must remain explicitly marked as unverified drafts';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid = 'public.jamb_syllabus_versions'::regclass AND relrowsecurity
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid = 'public.jamb_subtopics'::regclass AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on the syllabus version/subtopic tables';
  END IF;

  IF to_regclass('public.question_bank_topic_id_idx') IS NULL
     OR to_regclass('public.question_bank_subtopic_id_idx') IS NULL
     OR to_regclass('public.exam_configuration_subjects_subject_slug_idx') IS NULL
     OR to_regclass('public.exam_configurations_compulsory_subject_slug_idx') IS NULL THEN
    RAISE EXCEPTION 'Required Phase 1 foreign-key/query indexes are missing';
  END IF;
END
$$;

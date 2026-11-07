-- ============================================================================
-- SABI PHASE 0 - DATABASE SELF-CHECK
--
-- Read-only: no writes, no DDL, safe to run on production at any time.
-- Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- Section 1 must be ALL "OK" before Phase 0 is considered deployed.
-- If a row says MISSING, the third column names the file to run.
-- ============================================================================

WITH checks AS (
  SELECT 1 AS step,
         'base schema: table public.profiles' AS requirement,
         to_regclass('public.profiles') IS NOT NULL AS ok,
         'run supabase_schema.sql' AS fix

  UNION ALL SELECT 2,
         'base schema: function public.generate_sabi_unique_id()',
         to_regprocedure('public.generate_sabi_unique_id()') IS NOT NULL,
         'run supabase_schema.sql'

  UNION ALL SELECT 3,
         'base schema: column profiles.sabi_unique_id',
         EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'profiles'
                    AND column_name = 'sabi_unique_id'),
         'run supabase_schema.sql'

  UNION ALL SELECT 4,
         'base schema: column profiles.auth_providers',
         EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'profiles'
                    AND column_name = 'auth_providers'),
         'run supabase_schema.sql'

  UNION ALL SELECT 5,
         'phase 0: column profiles.role',
         EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'profiles'
                    AND column_name = 'role'),
         'run 0001_phase0_security.sql'

  UNION ALL SELECT 6,
         'phase 0: constraint profiles_role_check',
         EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'),
         'run 0001_phase0_security.sql'

  UNION ALL SELECT 7,
         'base schema: RLS enabled on public.profiles',
         COALESCE((SELECT relrowsecurity FROM pg_class
                    WHERE oid = to_regclass('public.profiles')), false),
         'run supabase_schema.sql'

  UNION ALL SELECT 8,
         'phase 0: policy "Candidates can update their own profile"',
         EXISTS (SELECT 1 FROM pg_policies
                  WHERE schemaname = 'public' AND tablename = 'profiles'
                    AND policyname = 'Candidates can update their own profile'),
         'run 0001_phase0_security.sql'

  UNION ALL SELECT 9,
         'phase 0: trigger enforce_profile_protected_columns',
         EXISTS (SELECT 1 FROM pg_trigger
                  WHERE tgrelid = to_regclass('public.profiles')
                    AND tgname = 'enforce_profile_protected_columns'),
         'run 0001_phase0_security.sql'

  UNION ALL SELECT 10,
         'base schema: trigger on_auth_user_created on auth.users',
         EXISTS (SELECT 1 FROM pg_trigger
                  WHERE tgrelid = to_regclass('auth.users')
                    AND tgname = 'on_auth_user_created'),
         'run supabase_schema.sql'

  UNION ALL SELECT 11,
         'phase 0: signup trigger no longer auto-confirms email',
         COALESCE((SELECT prosrc NOT ILIKE '%email_confirmed_at%'
                     FROM pg_proc WHERE proname = 'handle_new_or_linked_user'
                    LIMIT 1), false),
         'run 0001_phase0_security.sql'

  UNION ALL SELECT 12,
         'phase 0: recovery oracle RPC removed',
         to_regprocedure('public.verify_sabi_unique_id_for_recovery(text,text)') IS NULL,
         'run 0001_phase0_security.sql'

  UNION ALL SELECT 13,
         'phase 0: table public.audit_logs',
         to_regclass('public.audit_logs') IS NOT NULL,
         'run 0001_phase0_security.sql'

  UNION ALL SELECT 14,
         'phase 0: RLS enabled on public.audit_logs',
         COALESCE((SELECT relrowsecurity FROM pg_class
                    WHERE oid = to_regclass('public.audit_logs')), false),
         'run 0001_phase0_security.sql'
)
SELECT CASE WHEN ok THEN 'OK' ELSE 'MISSING' END AS status,
       requirement,
       CASE WHEN ok THEN '' ELSE fix END AS action
FROM checks
ORDER BY step;

-- ============================================================================
-- SABI PHASE 0 - DATABASE SELF-CHECK
--
-- Read-only: no writes, no DDL, safe to run on production at any time.
-- Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- Returns 19 rows, OK / MISSING. Every row must be OK for Phase 0 to be
-- considered deployed. A MISSING row names the file to run in column 3.
-- Run those files in ascending order, 0001 through 0004.
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

  UNION ALL SELECT 15,
         'phase 0: profiles.role is NOT NULL with default STUDENT',
         EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'profiles'
                    AND column_name = 'role'
                    AND is_nullable = 'NO'
                    AND column_default ILIKE '%STUDENT%'),
         'run 0001_phase0_security.sql'

  UNION ALL SELECT 16,
         'phase 0: owner-scoped SELECT policy on profiles',
         EXISTS (SELECT 1 FROM pg_policies
                  WHERE schemaname = 'public' AND tablename = 'profiles'
                    AND cmd = 'SELECT'
                    AND qual ILIKE '%auth.uid()%'),
         'run 0002_phase1_foundation.sql'

  UNION ALL SELECT 17,
         'hardening: guard trigger uses session_user, not current_user',
         COALESCE((SELECT prosrc ILIKE '%session_user%'
                     FROM pg_proc WHERE proname = 'enforce_profile_protected_columns'
                    LIMIT 1), false),
         'run 0001_phase0_security.sql'

  UNION ALL SELECT 18,
         'hardening: anon has no privilege on public.profiles',
         CASE WHEN to_regclass('public.profiles') IS NULL THEN false
              ELSE NOT has_table_privilege('anon', 'public.profiles', 'SELECT')
         END,
         'run 0003_profile_privilege_hardening.sql then 0004_profile_public_acl_hardening.sql'

  UNION ALL SELECT 19,
         'hardening: authenticated may SELECT/UPDATE only (no INSERT/DELETE/TRUNCATE)',
         CASE WHEN to_regclass('public.profiles') IS NULL THEN false
              ELSE has_table_privilege('authenticated', 'public.profiles', 'SELECT')
               AND has_table_privilege('authenticated', 'public.profiles', 'UPDATE')
               AND NOT has_table_privilege('authenticated', 'public.profiles', 'INSERT')
               AND NOT has_table_privilege('authenticated', 'public.profiles', 'DELETE')
               AND NOT has_table_privilege('authenticated', 'public.profiles', 'TRUNCATE')
         END,
         'run 0003_profile_privilege_hardening.sql then 0004_profile_public_acl_hardening.sql'
)
SELECT CASE WHEN ok THEN 'OK' ELSE 'MISSING' END AS status,
       requirement,
       CASE WHEN ok THEN '' ELSE fix END AS action
FROM checks
ORDER BY step;

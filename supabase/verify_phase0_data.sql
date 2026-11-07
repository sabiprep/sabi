-- ============================================================================
-- SABI PHASE 0 - DATABASE SELF-CHECK, PART 2 (data)
--
-- Run these ONLY after every row of supabase/verify_phase0.sql reads "OK":
-- they query public.profiles directly, so they error if the table is missing.
-- Run them one at a time (the Supabase SQL editor shows only the last result).
-- Read-only.
-- ============================================================================

-- 2a. How many accounts exist (informational).
SELECT count(*) AS total_accounts FROM public.profiles;

-- 2b. Role distribution. Expect every existing account at STUDENT until you
--     promote the first administrator (docs/PHASE0-GO-LIVE.md, step A6).
SELECT role, count(*) AS accounts
FROM public.profiles
GROUP BY role
ORDER BY accounts DESC;

-- 2c. Must return 0. A non-zero count means a role value that
--     profiles_role_check does not allow, i.e. the constraint is missing.
SELECT count(*) AS rows_with_unknown_role
FROM public.profiles
WHERE role NOT IN ('STUDENT', 'SUPPORT', 'ANALYST', 'CONTENT_MANAGER', 'ADMIN', 'MASTER_ADMIN');

-- 2d. Policies on profiles. Expect the candidate SELECT/INSERT/UPDATE policies,
--     with has_with_check = true on the UPDATE one (phase 0 adds it).
SELECT policyname, cmd, with_check IS NOT NULL AS has_with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;

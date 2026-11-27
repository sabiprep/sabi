-- Stage 2: Auth, Profile & Session Security Hardening (RLS + Column Protection)
-- Enforces strict row-level isolation across candidate tables and prevents
-- client-side tampering with privileged columns on public.profiles.

BEGIN;

-- 1. Enforce RLS and clean role grants on public.profiles
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM authenticated;
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;

-- Ensure self-only SELECT & UPDATE policies use initplan-friendly (SELECT auth.uid())
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- 2. Block non-service-role clients from modifying identity/privilege columns directly
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow server-side service_role and internal Postgres superuser operations
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
     OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Cannot change profile id';
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Cannot change profile email directly';
  END IF;

  IF NEW.sabi_unique_id IS DISTINCT FROM OLD.sabi_unique_id THEN
    RAISE EXCEPTION 'Cannot change sabi_unique_id directly';
  END IF;

  IF NEW.auth_providers IS DISTINCT FROM OLD.auth_providers THEN
    RAISE EXCEPTION 'Cannot change auth_providers directly';
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_privileged_columns ON public.profiles;
CREATE TRIGGER trg_guard_profile_privileged_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_privileged_columns();

-- 3. Helpful index for fast authenticated profile lookup by normalized email
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower
  ON public.profiles (LOWER(email));

-- 4. Re-verify RLS on saved_question_snapshots, student_league_standings, and student_streak_state
DO $$
BEGIN
  IF to_regclass('public.saved_question_snapshots') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.saved_question_snapshots ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.saved_question_snapshots FROM anon';
  END IF;

  IF to_regclass('public.student_league_standings') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.student_league_standings ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.student_league_standings FROM anon';
  END IF;

  IF to_regclass('public.student_streak_state') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.student_streak_state ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.student_streak_state FROM anon';
  END IF;
END $$;

COMMIT;

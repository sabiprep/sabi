-- ============================================================================
-- SABI PHASE 0 SECURITY MIGRATION
-- Run in Supabase Dashboard -> SQL Editor (after supabase_schema.sql).
--
-- What this migration does
--   1. Adds public.profiles.role (fixes: no way to authorize privileged actions).
--   2. Blocks candidates from elevating role / rewriting identity columns.
--   3. Removes the auto-confirm side effect from the signup trigger (defect B2).
--   4. Drops the 5-character-ID recovery oracle RPC (defect B5).
--   5. Adds an append-only audit trail for privileged actions.
--   6. Tightens the profile UPDATE policy with an explicit WITH CHECK.
--
-- Idempotent: safe to re-run.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Roles
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'STUDENT';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('STUDENT', 'SUPPORT', 'ANALYST', 'CONTENT_MANAGER', 'ADMIN', 'MASTER_ADMIN'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role);

-- ---------------------------------------------------------------------------
-- 2. Protected columns guard
--    Even with a row-level policy scoped to auth.uid() = id, a candidate could
--    otherwise rewrite `role`, `sabi_unique_id` or `email` on their own row.
--    Service-role (server) writes are unaffected.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_profile_protected_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  jwt_role TEXT;
BEGIN
  -- Trusted contexts bypass the guard:
  --   * the Supabase SQL editor / migrations / psql connect as postgres (no JWT),
  --   * PostgREST service-role requests carry role = service_role.
  -- Everything else (anon / authenticated candidates) is checked below.
  IF current_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  jwt_role := current_setting('request.jwt.claim.role', true);

  IF jwt_role IS NULL THEN
    BEGIN
      jwt_role := (current_setting('request.jwt.claims', true))::jsonb ->> 'role';
    EXCEPTION WHEN others THEN
      jwt_role := NULL;
    END;
  END IF;

  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.id <> OLD.id THEN
    RAISE EXCEPTION 'profiles.id is immutable';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'profiles.role can only be changed by SABI administrators';
  END IF;

  IF NEW.sabi_unique_id IS DISTINCT FROM OLD.sabi_unique_id THEN
    RAISE EXCEPTION 'profiles.sabi_unique_id is immutable';
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'profiles.email must be changed through SABI account support';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_protected_columns ON public.profiles;
CREATE TRIGGER enforce_profile_protected_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_protected_columns();

-- ---------------------------------------------------------------------------
-- 3. Signup trigger: no more silent email auto-confirmation (defect B2)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_or_linked_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Email confirmation is intentionally NOT touched here. Confirmation happens
  -- only through the verified self-scoped flow in server.ts, or through a real
  -- email link / OTP in Phase 1.
  INSERT INTO public.profiles (
    id,
    email,
    sabi_unique_id,
    full_name,
    phone,
    state_of_origin
  )
  VALUES (
    NEW.id,
    LOWER(TRIM(NEW.email)),
    COALESCE(NEW.raw_user_meta_data->>'sabi_unique_id', public.generate_sabi_unique_id()),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, ''),
    COALESCE(NEW.raw_user_meta_data->>'state_of_origin', 'Lagos')
  )
  ON CONFLICT (email) DO UPDATE
  SET
    full_name = CASE
      WHEN public.profiles.full_name = '' THEN EXCLUDED.full_name
      ELSE public.profiles.full_name
    END,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Retire the weak recovery oracle (defect B5)
--    Password resets now use a Supabase-issued 6-digit recovery OTP.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.verify_sabi_unique_id_for_recovery(TEXT, TEXT);

-- ---------------------------------------------------------------------------
-- 5. Audit trail for privileged actions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL DEFAULT 'UNKNOWN',
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL DEFAULT 'profile',
  resource_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON public.audit_logs (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON public.audit_logs (action, created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins may read the trail; only the service role may write it.
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('ADMIN', 'MASTER_ADMIN')
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Explicit WITH CHECK on the candidate UPDATE policy
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Candidates can update their own profile" ON public.profiles;
CREATE POLICY "Candidates can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

COMMIT;

-- ---------------------------------------------------------------------------
-- 7. Manual follow-up (cannot be done from SQL alone)
--    a) Promote the first administrator:
--         UPDATE public.profiles SET role = 'MASTER_ADMIN' WHERE email = 'you@example.com';
--    b) Supabase Dashboard -> Authentication -> Email Templates -> "Reset Password":
--       include the 6-digit token so candidates can reset without leaving the app,
--       e.g. add the line:  Your SABI reset code is {{ .Token }}
-- ---------------------------------------------------------------------------



-- Avoid per-row auth.uid() evaluation in the candidate profile SELECT policy.
-- This preserves the existing self-only access rule while allowing PostgreSQL
-- to evaluate the stable auth identity once per statement.

DROP POLICY IF EXISTS "Candidates can read their own profile" ON public.profiles;

CREATE POLICY "Candidates can read their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

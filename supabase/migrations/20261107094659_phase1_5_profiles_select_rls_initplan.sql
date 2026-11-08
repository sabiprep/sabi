DROP POLICY IF EXISTS "Candidates can read their own profile" ON public.profiles;
CREATE POLICY "Candidates can read their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);
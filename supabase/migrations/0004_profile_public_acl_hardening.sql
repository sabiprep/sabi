-- SABI Phase 1.2: remove inherited PUBLIC grants on profile records.
-- RLS does not protect TRUNCATE and role grants can be inherited from PUBLIC.
BEGIN;

REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;

COMMIT;

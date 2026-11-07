-- SABI Phase 1.1: least-privilege grants for profile access.
-- RLS does not protect TRUNCATE, so remove all client table privileges first.
BEGIN;

REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM authenticated;

-- Authenticated clients may read and update only their own row under RLS.
-- Profile creation and privileged writes remain server/service-role operations.
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;

COMMIT;

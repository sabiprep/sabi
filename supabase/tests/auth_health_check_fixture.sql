-- ============================================================================
-- Test-only fixture for scripts/auth-health-check.sql.
--
-- The Phase 1 stub creates auth.users with four columns; the real Supabase
-- schema has many more. This adds the columns the health check reads and seeds
-- one identity per failure mode, so the script executes every branch against a
-- real PostgreSQL parser instead of only being syntax-parsed.
--
-- Disposable CI database only. Never apply this to a real project.
-- ============================================================================

BEGIN;

-- 1. Bring the disposable auth stub up to the shape the script queries.
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email_confirmed_at TIMESTAMPTZ;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS auth.identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_id text,
  identity_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Identities: healthy, unconfirmed, Google-only, drifted email,
--    identity without profile, and a pair sharing one phone number.
INSERT INTO auth.users (id, email, phone, email_confirmed_at, created_at) VALUES
  ('00000000-0000-4000-a000-000000000001', 'authhc.healthy@sabi.test',
   '+2348000000001', now(), now() - interval '10 days'),
  ('00000000-0000-4000-a000-000000000002', 'authhc.unconfirmed@sabi.test',
   '+2348000000002', NULL,  now() - interval '9 days'),
  ('00000000-0000-4000-a000-000000000003', 'authhc.google@sabi.test',
   '', now(), now() - interval '8 days'),
  ('00000000-0000-4000-a000-000000000004', 'authhc.drift.auth@sabi.test',
   '', now(), now() - interval '7 days'),
  ('00000000-0000-4000-a000-000000000005', 'authhc.noprofile@sabi.test',
   '', now(), now() - interval '6 days'),
  ('00000000-0000-4000-a000-000000000006', 'authhc.dupephone.a@sabi.test',
   '+2348000000009', now(), now() - interval '5 days'),
  ('00000000-0000-4000-a000-000000000007', 'authhc.dupephone.b@sabi.test',
   '+2348000000009', now(), now() - interval '4 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (user_id, provider, provider_id) VALUES
  ('00000000-0000-4000-a000-000000000001', 'email',    'authhc.healthy@sabi.test'),
  ('00000000-0000-4000-a000-000000000002', 'email',    'authhc.unconfirmed@sabi.test'),
  ('00000000-0000-4000-a000-000000000003', 'google',   'google-oauth2|authhc'),
  ('00000000-0000-4000-a000-000000000004', 'email',    'authhc.drift.auth@sabi.test'),
  ('00000000-0000-4000-a000-000000000005', 'email',    'authhc.noprofile@sabi.test'),
  ('00000000-0000-4000-a000-000000000006', 'email',    'authhc.dupephone.a@sabi.test'),
  ('00000000-0000-4000-a000-000000000007', 'email',    'authhc.dupephone.b@sabi.test')
ON CONFLICT DO NOTHING;

-- 3. Profiles. Row 4 deliberately keeps a different email than its identity
--    (the drift case); row 5 is missing entirely (the repair case); rows 6 and
--    7 share one phone number (the ambiguous-identifier case).
INSERT INTO public.profiles (id, email, sabi_unique_id, full_name, phone, state_of_origin) VALUES
  ('00000000-0000-4000-a000-000000000001', 'authhc.healthy@sabi.test',
   '9001A', 'Healthy Candidate', '+2348000000001', 'Lagos'),
  ('00000000-0000-4000-a000-000000000002', 'authhc.unconfirmed@sabi.test',
   '9002B', 'Unconfirmed Candidate', '+2348000000002', 'Oyo'),
  ('00000000-0000-4000-a000-000000000003', 'authhc.google@sabi.test',
   '9003C', 'Google Candidate', '', 'Abuja'),
  ('00000000-0000-4000-a000-000000000004', 'authhc.drift.profile@sabi.test',
   '9004D', 'Drifted Candidate', '', 'Kano'),
  ('00000000-0000-4000-a000-000000000006', 'authhc.dupephone.a@sabi.test',
   '9006F', 'Duplicate Phone A', '+2348000000009', 'Enugu'),
  ('00000000-0000-4000-a000-000000000007', 'authhc.dupephone.b@sabi.test',
   '9007G', 'Duplicate Phone B', '+2348000000009', 'Kaduna')
ON CONFLICT DO NOTHING;

COMMIT;

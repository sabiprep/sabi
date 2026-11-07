-- Minimal disposable PostgreSQL representation of the live Phase 0 schema.
-- This is test-only; it is never applied to Supabase.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN CREATE ROLE authenticator NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN CREATE ROLE supabase_admin NOLOGIN BYPASSRLS; END IF;
END
$$;
GRANT authenticated TO authenticator;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth.uid() TO PUBLIC;

-- Reproduce the overly broad default ACLs observed in the live project so the
-- hardening migration proves it removes both existing and future exposure.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;

CREATE TABLE auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  phone text,
  raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE OR REPLACE FUNCTION public.generate_sabi_unique_id()
RETURNS varchar LANGUAGE plpgsql AS $$
DECLARE
  candidate_id varchar(5);
BEGIN
  candidate_id := '1234A';
  RETURN candidate_id;
END;
$$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  sabi_unique_id varchar(5) NOT NULL DEFAULT public.generate_sabi_unique_id(),
  full_name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  state_of_origin text DEFAULT 'Lagos',
  auth_providers text[] DEFAULT ARRAY['email']::text[],
  onboarding_completed boolean DEFAULT false,
  onboarding_answers jsonb DEFAULT '{}'::jsonb,
  registered_subjects text[] DEFAULT ARRAY['English Language','Mathematics','Physics','Chemistry']::text[],
  target_score integer DEFAULT 320,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  role text NOT NULL DEFAULT 'STUDENT',
  CONSTRAINT profiles_role_check CHECK (role IN ('STUDENT','SUPPORT','ANALYST','CONTENT_MANAGER','ADMIN','MASTER_ADMIN'))
);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read audit logs" ON public.audit_logs FOR SELECT TO PUBLIC
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
      AND p.role IN ('ADMIN', 'MASTER_ADMIN')
  ));

CREATE TABLE public.question_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  topic text,
  subtopic text
);
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
INSERT INTO public.question_bank(subject, topic, subtopic) VALUES
  ('Biology', 'Adaptation', 'Adaptations in animals'),
  ('Chemistry', 'Acids and Bases', 'Acid-base indicators'),
  ('C.R.S', 'Abraham and the Patriarchs', 'Abraham'),
  ('Use of English', 'Comprehension', 'Main idea');

CREATE OR REPLACE FUNCTION public.enforce_profile_protected_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_or_linked_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_profile_protected_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_protected_columns();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow insert and update via server"
  ON public.profiles FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY "Allow read access to own profile"
  ON public.profiles FOR SELECT TO PUBLIC USING (true);
CREATE POLICY "Candidates can update their own profile"
  ON public.profiles FOR UPDATE TO PUBLIC
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO anon, authenticated;
GRANT ALL ON public.profiles TO service_role;

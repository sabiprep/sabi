-- ============================================================================
-- SABI JAMB CBT - SUPABASE POSTGRESQL SCHEMA & IDENTITY SYNC
-- Paste this into your Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================================

-- 1. Function to generate a unique 5-character SABI ID (4 digits + 1 uppercase letter, e.g. '4829K')
CREATE OR REPLACE FUNCTION public.generate_sabi_unique_id()
RETURNS VARCHAR(5)
LANGUAGE plpgsql
AS $$
DECLARE
  digits TEXT;
  letter TEXT;
  letters CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ'; -- Excludes I and O to prevent 1/0 confusion
  candidate_id VARCHAR(5);
  exists_already BOOLEAN;
BEGIN
  LOOP
    digits := LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
    letter := SUBSTR(letters, (FLOOR(RANDOM() * LENGTH(letters)) + 1)::INT, 1);
    candidate_id := digits || letter;

    SELECT EXISTS(
      SELECT 1 FROM public.profiles WHERE sabi_unique_id = candidate_id
    ) INTO exists_already;

    EXIT WHEN NOT exists_already;
  END LOOP;

  RETURN candidate_id;
END;
$$;

-- 2. Candidate Profiles Table (Single source of truth synced by Email across Email & Google OAuth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  sabi_unique_id VARCHAR(5) UNIQUE NOT NULL DEFAULT public.generate_sabi_unique_id(),
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  state_of_origin TEXT DEFAULT 'Lagos',
  auth_providers TEXT[] DEFAULT ARRAY['email'],
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_answers JSONB DEFAULT '{}'::JSONB,
  registered_subjects TEXT[] DEFAULT ARRAY['English Language', 'Mathematics', 'Physics', 'Chemistry'],
  target_score INT DEFAULT 320,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Candidates can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 4. Trigger to automatically create or sync a profile when a user signs up with Email OR Google
-- Supabase Auth automatically links identities sharing the same verified email address into the same auth.users row.
CREATE OR REPLACE FUNCTION public.handle_new_or_linked_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
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
    public.generate_sabi_unique_id(),
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_or_linked_user();

-- 5. RPC Function: Verify 5-character Unique SABI ID before granting Password Reset / Account Recovery
CREATE OR REPLACE FUNCTION public.verify_sabi_unique_id_for_recovery(
  lookup_email_or_phone TEXT,
  provided_unique_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  matched BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE (LOWER(email) = LOWER(TRIM(lookup_email_or_phone)) OR phone = TRIM(lookup_email_or_phone))
      AND UPPER(sabi_unique_id) = UPPER(TRIM(provided_unique_id))
  ) INTO matched;

  RETURN matched;
END;
$$;

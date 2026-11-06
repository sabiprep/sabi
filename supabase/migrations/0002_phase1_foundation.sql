-- SABI Phase 1 foundation: canonical JAMB configuration and profile RLS hardening.
-- This migration is additive and deliberately does not alter question_bank rows.
BEGIN;

-- A permissive ALL policy would override narrower profile policies.
DROP POLICY IF EXISTS "Allow insert and update via server" ON public.profiles;
DROP POLICY IF EXISTS "Allow read access to own profile" ON public.profiles;
CREATE POLICY "Candidates can read their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Existing scoped UPDATE policy is retained. Inserts and privileged writes use
-- the server-side service-role client, which bypasses RLS.

CREATE TABLE IF NOT EXISTS public.jamb_subjects (
  slug TEXT PRIMARY KEY,
  display_name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.jamb_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_slug TEXT NOT NULL REFERENCES public.jamb_subjects(slug) ON UPDATE CASCADE ON DELETE RESTRICT,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  syllabus_year INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(subject_slug, slug),
  UNIQUE(subject_slug, name)
);
CREATE INDEX IF NOT EXISTS jamb_topics_subject_order_idx
  ON public.jamb_topics(subject_slug, sort_order, name);

CREATE TABLE IF NOT EXISTS public.exam_configurations (
  key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  question_count INTEGER NOT NULL CHECK (question_count > 0),
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  total_subjects INTEGER NOT NULL DEFAULT 4 CHECK (total_subjects > 0),
  compulsory_subject_slug TEXT NOT NULL REFERENCES public.jamb_subjects(slug),
  optional_subject_count INTEGER NOT NULL DEFAULT 3 CHECK (optional_subject_count >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (total_subjects = optional_subject_count + 1)
);

CREATE TABLE IF NOT EXISTS public.exam_configuration_subjects (
  configuration_key TEXT NOT NULL REFERENCES public.exam_configurations(key) ON DELETE CASCADE,
  subject_slug TEXT NOT NULL REFERENCES public.jamb_subjects(slug) ON DELETE RESTRICT,
  is_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY(configuration_key, subject_slug)
);

-- Course/institution combinations are stored with provenance and remain drafts
-- until checked against the relevant institution/JAMB admission requirements.
CREATE TABLE IF NOT EXISTS public.course_subject_combinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_name TEXT NOT NULL,
  institution_name TEXT,
  required_subjects TEXT[] NOT NULL,
  source_url TEXT,
  effective_year INTEGER,
  verification_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (verification_status IN ('draft', 'verified', 'retired')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS course_subject_combinations_lookup_idx
  ON public.course_subject_combinations(course_name, institution_name, effective_year);

-- Seed the currently approved product catalogue; names align with onboarding UI.
INSERT INTO public.jamb_subjects(slug, display_name, category, aliases) VALUES
  ('use-of-english','English Language','Languages',ARRAY['Use of English']),
  ('mathematics','Mathematics','Science','{}'),
  ('physics','Physics','Science','{}'),
  ('chemistry','Chemistry','Science','{}'),
  ('biology','Biology','Science','{}'),
  ('literature-in-english','Literature-in-English','Arts',ARRAY['Literature in English']),
  ('government','Government','Arts','{}'),
  ('economics','Economics','Social Sciences','{}'),
  ('christian-religious-studies','Christian Religious Studies','Arts',ARRAY['CRS','C.R.S']),
  ('islamic-religious-studies','Islamic Religious Studies','Arts',ARRAY['IRS']),
  ('agricultural-science','Agricultural Science','Science','{}'),
  ('geography','Geography','General','{}'),
  ('commerce','Commerce','Social Sciences','{}'),
  ('financial-accounting','Financial Accounting','Social Sciences',ARRAY['Accounting']),
  ('history','History','Arts','{}'),
  ('yoruba','Yoruba','Languages','{}'),
  ('igbo','Igbo','Languages','{}'),
  ('hausa','Hausa','Languages','{}'),
  ('music','Music','Arts','{}'),
  ('fine-art','Fine Art','Arts',ARRAY['Visual Arts']),
  ('french','French','Languages','{}'),
  ('arabic','Arabic','Languages','{}'),
  ('home-economics','Home Economics','General','{}')
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  category = EXCLUDED.category,
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

INSERT INTO public.exam_configurations
  (key,title,question_count,duration_seconds,total_subjects,compulsory_subject_slug,optional_subject_count)
VALUES
  ('full-mock','Full UTME Mock',180,7200,4,'use-of-english',3),
  ('quick-mock','Quick UTME Mock',40,1800,4,'use-of-english',3)
ON CONFLICT (key) DO UPDATE SET
  title=EXCLUDED.title,
  question_count=EXCLUDED.question_count,
  duration_seconds=EXCLUDED.duration_seconds,
  total_subjects=EXCLUDED.total_subjects,
  compulsory_subject_slug=EXCLUDED.compulsory_subject_slug,
  optional_subject_count=EXCLUDED.optional_subject_count,
  updated_at=NOW();

INSERT INTO public.exam_configuration_subjects(configuration_key, subject_slug, is_allowed)
SELECT c.key, s.slug, TRUE
FROM public.exam_configurations c
CROSS JOIN public.jamb_subjects s
WHERE s.is_active
ON CONFLICT (configuration_key, subject_slug) DO UPDATE SET is_allowed=TRUE;

ALTER TABLE public.jamb_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jamb_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_configuration_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_subject_combinations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active JAMB subjects" ON public.jamb_subjects;
CREATE POLICY "Public can read active JAMB subjects"
  ON public.jamb_subjects FOR SELECT TO anon, authenticated USING (is_active);

DROP POLICY IF EXISTS "Public can read active JAMB topics" ON public.jamb_topics;
CREATE POLICY "Public can read active JAMB topics"
  ON public.jamb_topics FOR SELECT TO anon, authenticated USING (is_active);

DROP POLICY IF EXISTS "Public can read active exam configurations" ON public.exam_configurations;
CREATE POLICY "Public can read active exam configurations"
  ON public.exam_configurations FOR SELECT TO anon, authenticated USING (is_active);

DROP POLICY IF EXISTS "Public can read allowed exam subjects" ON public.exam_configuration_subjects;
CREATE POLICY "Public can read allowed exam subjects"
  ON public.exam_configuration_subjects FOR SELECT TO anon, authenticated USING (is_allowed);

DROP POLICY IF EXISTS "Public can read verified course combinations" ON public.course_subject_combinations;
CREATE POLICY "Public can read verified course combinations"
  ON public.course_subject_combinations FOR SELECT TO anon, authenticated USING (verification_status = 'verified');

GRANT SELECT ON public.jamb_subjects, public.jamb_topics, public.exam_configurations,
  public.exam_configuration_subjects, public.course_subject_combinations TO anon, authenticated;

COMMIT;

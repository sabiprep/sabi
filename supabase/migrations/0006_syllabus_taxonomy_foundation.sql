-- SABI Phase 1.4: versioned syllabus taxonomy and safe legacy-label mapping.
-- Legacy question labels are imported as DRAFT, never falsely represented as
-- JAMB-verified syllabus content. Official syllabus versions can be curated later.
BEGIN;

CREATE TABLE IF NOT EXISTS public.jamb_syllabus_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_slug TEXT NOT NULL REFERENCES public.jamb_subjects(slug) ON UPDATE CASCADE ON DELETE RESTRICT,
  version_label TEXT NOT NULL,
  syllabus_year INTEGER,
  source_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (verification_status IN ('draft', 'verified', 'retired')),
  effective_from DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(subject_slug, version_label),
  CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from)
);

ALTER TABLE public.jamb_topics
  ADD COLUMN IF NOT EXISTS syllabus_version_id UUID
    REFERENCES public.jamb_syllabus_versions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS source_label TEXT NOT NULL DEFAULT 'manual';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.jamb_topics'::regclass
      AND conname = 'jamb_topics_verification_status_check'
  ) THEN
    ALTER TABLE public.jamb_topics
      ADD CONSTRAINT jamb_topics_verification_status_check
      CHECK (verification_status IN ('draft', 'verified', 'retired'));
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.jamb_subtopics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.jamb_topics(id) ON DELETE RESTRICT,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (verification_status IN ('draft', 'verified', 'retired')),
  source_label TEXT NOT NULL DEFAULT 'manual',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(topic_id, slug),
  UNIQUE(topic_id, name)
);

CREATE INDEX IF NOT EXISTS jamb_syllabus_versions_subject_status_idx
  ON public.jamb_syllabus_versions(subject_slug, verification_status, syllabus_year);
CREATE INDEX IF NOT EXISTS jamb_topics_version_order_idx
  ON public.jamb_topics(syllabus_version_id, sort_order, name);
CREATE INDEX IF NOT EXISTS jamb_subtopics_topic_order_idx
  ON public.jamb_subtopics(topic_id, sort_order, name);

ALTER TABLE public.question_bank
  ADD COLUMN IF NOT EXISTS topic_id UUID,
  ADD COLUMN IF NOT EXISTS subtopic_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.question_bank'::regclass
      AND conname = 'question_bank_topic_id_fkey'
  ) THEN
    ALTER TABLE public.question_bank
      ADD CONSTRAINT question_bank_topic_id_fkey
      FOREIGN KEY (topic_id) REFERENCES public.jamb_topics(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.question_bank'::regclass
      AND conname = 'question_bank_subtopic_id_fkey'
  ) THEN
    ALTER TABLE public.question_bank
      ADD CONSTRAINT question_bank_subtopic_id_fkey
      FOREIGN KEY (subtopic_id) REFERENCES public.jamb_subtopics(id) ON DELETE RESTRICT;
  END IF;
END
$$;

-- Map only the four exact subject labels currently present in question_bank.
-- Unknown subjects intentionally fail below instead of being guessed.
WITH legacy_topics AS (
  SELECT DISTINCT
    CASE lower(btrim(subject))
      WHEN 'biology' THEN 'biology'
      WHEN 'chemistry' THEN 'chemistry'
      WHEN 'c.r.s' THEN 'christian-religious-studies'
      WHEN 'crs' THEN 'christian-religious-studies'
      WHEN 'use of english' THEN 'use-of-english'
      WHEN 'english language' THEN 'use-of-english'
      ELSE NULL
    END AS subject_slug,
    btrim(topic) AS topic_name
  FROM public.question_bank
  WHERE topic IS NOT NULL AND btrim(topic) <> ''
)
INSERT INTO public.jamb_topics
  (subject_slug, slug, name, verification_status, source_label, is_active)
SELECT
  subject_slug,
  trim(both '-' FROM regexp_replace(lower(topic_name), '[^a-z0-9]+', '-', 'g'))
    || '-' || left(md5(topic_name), 8),
  topic_name,
  'draft',
  'legacy_question_bank',
  TRUE
FROM legacy_topics
WHERE subject_slug IS NOT NULL
ON CONFLICT (subject_slug, name) DO NOTHING;

UPDATE public.question_bank q
SET topic_id = t.id
FROM public.jamb_topics t
WHERE q.topic_id IS NULL
  AND t.name = btrim(q.topic)
  AND t.subject_slug = CASE lower(btrim(q.subject))
    WHEN 'biology' THEN 'biology'
    WHEN 'chemistry' THEN 'chemistry'
    WHEN 'c.r.s' THEN 'christian-religious-studies'
    WHEN 'crs' THEN 'christian-religious-studies'
    WHEN 'use of english' THEN 'use-of-english'
    WHEN 'english language' THEN 'use-of-english'
    ELSE NULL
  END;

INSERT INTO public.jamb_subtopics
  (topic_id, slug, name, verification_status, source_label, is_active)
SELECT DISTINCT
  q.topic_id,
  trim(both '-' FROM regexp_replace(lower(btrim(q.subtopic)), '[^a-z0-9]+', '-', 'g'))
    || '-' || left(md5(btrim(q.subtopic)), 8),
  btrim(q.subtopic),
  'draft',
  'legacy_question_bank',
  TRUE
FROM public.question_bank q
WHERE q.topic_id IS NOT NULL
  AND q.subtopic IS NOT NULL
  AND btrim(q.subtopic) <> ''
ON CONFLICT (topic_id, name) DO NOTHING;

UPDATE public.question_bank q
SET subtopic_id = st.id
FROM public.jamb_subtopics st
WHERE q.subtopic_id IS NULL
  AND st.topic_id = q.topic_id
  AND st.name = btrim(q.subtopic)
  AND q.subtopic IS NOT NULL
  AND btrim(q.subtopic) <> '';

DO $$
DECLARE
  unmapped_topics BIGINT;
  unmapped_subtopics BIGINT;
  unknown_subjects BIGINT;
BEGIN
  SELECT count(*) INTO unmapped_topics
  FROM public.question_bank
  WHERE topic IS NOT NULL AND btrim(topic) <> '' AND topic_id IS NULL;

  SELECT count(*) INTO unmapped_subtopics
  FROM public.question_bank
  WHERE subtopic IS NOT NULL AND btrim(subtopic) <> '' AND subtopic_id IS NULL;

  SELECT count(*) INTO unknown_subjects
  FROM public.question_bank
  WHERE topic IS NOT NULL AND btrim(topic) <> ''
    AND lower(btrim(subject)) NOT IN (
      'biology', 'chemistry', 'c.r.s', 'crs', 'use of english', 'english language'
    );

  IF unmapped_topics > 0 OR unmapped_subtopics > 0 OR unknown_subjects > 0 THEN
    RAISE EXCEPTION
      'Legacy taxonomy mapping incomplete: unmapped topics %, subtopics %, unknown subjects %',
      unmapped_topics, unmapped_subtopics, unknown_subjects;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS question_bank_topic_id_idx ON public.question_bank(topic_id);
CREATE INDEX IF NOT EXISTS question_bank_subtopic_id_idx ON public.question_bank(subtopic_id);

ALTER TABLE public.jamb_syllabus_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jamb_subtopics ENABLE ROW LEVEL SECURITY;

-- Legacy labels stay private to privileged backend workflows until reviewed.
DROP POLICY IF EXISTS "Public can read active JAMB topics" ON public.jamb_topics;
CREATE POLICY "Public can read verified JAMB topics"
  ON public.jamb_topics FOR SELECT TO anon, authenticated
  USING (is_active AND verification_status = 'verified');

DROP POLICY IF EXISTS "Public can read verified syllabus versions" ON public.jamb_syllabus_versions;
CREATE POLICY "Public can read verified syllabus versions"
  ON public.jamb_syllabus_versions FOR SELECT TO anon, authenticated
  USING (verification_status = 'verified');

DROP POLICY IF EXISTS "Public can read active JAMB subtopics" ON public.jamb_subtopics;
CREATE POLICY "Public can read active JAMB subtopics"
  ON public.jamb_subtopics FOR SELECT TO anon, authenticated
  USING (is_active AND verification_status = 'verified');

GRANT SELECT ON public.jamb_syllabus_versions, public.jamb_subtopics TO anon, authenticated;

COMMIT;

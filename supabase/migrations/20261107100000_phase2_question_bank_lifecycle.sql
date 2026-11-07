-- SABI Phase 2: additive question-bank lifecycle, provenance, versioning and moderation.
-- Existing question rows and legacy status values are preserved. Historical rows
-- receive a baseline version and provenance record, but remain pending review.
BEGIN;

ALTER TABLE public.question_bank
  ADD COLUMN IF NOT EXISTS current_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS review_state TEXT NOT NULL DEFAULT 'pending_review';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'question_bank_review_state_check'
      AND conrelid = 'public.question_bank'::regclass
  ) THEN
    ALTER TABLE public.question_bank
      ADD CONSTRAINT question_bank_review_state_check
      CHECK (review_state IN ('pending_review', 'approved', 'rejected', 'flagged', 'retired'));
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.question_bank_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id TEXT NOT NULL REFERENCES public.question_bank(id) ON DELETE RESTRICT,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  payload JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  legacy_status TEXT,
  review_state TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (review_state IN ('pending_review', 'approved', 'rejected', 'flagged', 'retired')),
  change_reason TEXT NOT NULL DEFAULT 'baseline_import',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(question_id, version_number)
);
CREATE INDEX IF NOT EXISTS question_bank_versions_question_created_idx
  ON public.question_bank_versions(question_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.question_provenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id TEXT NOT NULL UNIQUE REFERENCES public.question_bank(id) ON DELETE RESTRICT,
  source_label TEXT,
  source_url TEXT,
  source_type TEXT NOT NULL DEFAULT 'legacy_unknown'
    CHECK (source_type IN ('official_exam', 'publisher', 'contributor', 'ai_generated', 'legacy_unknown', 'other')),
  attribution TEXT,
  provenance_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (provenance_status IN ('unknown', 'unverified', 'verified', 'disputed')),
  evidence JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS question_provenance_status_idx
  ON public.question_provenance(provenance_status, source_type);

CREATE TABLE IF NOT EXISTS public.question_review_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id TEXT NOT NULL REFERENCES public.question_bank(id) ON DELETE RESTRICT,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  decision TEXT NOT NULL
    CHECK (decision IN ('submitted', 'approved', 'rejected', 'changes_requested', 'flagged', 'retired')),
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_role TEXT NOT NULL DEFAULT 'SYSTEM',
  comments TEXT,
  quality_checks JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (question_id, version_number)
    REFERENCES public.question_bank_versions(question_id, version_number) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS question_review_events_question_created_idx
  ON public.question_review_events(question_id, created_at DESC);
CREATE INDEX IF NOT EXISTS question_review_events_decision_created_idx
  ON public.question_review_events(decision, created_at DESC);

CREATE TABLE IF NOT EXISTS public.question_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id TEXT NOT NULL REFERENCES public.question_bank(id) ON DELETE RESTRICT,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL
    CHECK (reason IN ('wrong_answer', 'ambiguous', 'typo', 'bad_explanation', 'wrong_topic', 'duplicate', 'source_issue', 'other')),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  FOREIGN KEY (question_id, version_number)
    REFERENCES public.question_bank_versions(question_id, version_number) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS question_flags_open_created_idx
  ON public.question_flags(status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS question_flags_reporter_open_unique_idx
  ON public.question_flags(question_id, version_number, reporter_id, reason)
  WHERE status = 'open' AND reporter_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.question_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_label TEXT,
  source_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'validating', 'validated', 'committed', 'failed', 'cancelled')),
  total_rows INTEGER NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
  valid_rows INTEGER NOT NULL DEFAULT 0 CHECK (valid_rows >= 0),
  invalid_rows INTEGER NOT NULL DEFAULT 0 CHECK (invalid_rows >= 0),
  duplicate_rows INTEGER NOT NULL DEFAULT 0 CHECK (duplicate_rows >= 0),
  summary JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CHECK (valid_rows + invalid_rows <= total_rows),
  CHECK (duplicate_rows <= total_rows)
);

CREATE TABLE IF NOT EXISTS public.question_import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.question_import_batches(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL CHECK (row_number > 0),
  raw_payload JSONB NOT NULL,
  normalized_payload JSONB,
  validation_errors JSONB NOT NULL DEFAULT '[]'::JSONB,
  duplicate_question_id TEXT REFERENCES public.question_bank(id) ON DELETE SET NULL,
  outcome TEXT NOT NULL DEFAULT 'pending'
    CHECK (outcome IN ('pending', 'valid', 'invalid', 'duplicate', 'imported', 'skipped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(batch_id, row_number)
);
CREATE INDEX IF NOT EXISTS question_import_rows_batch_outcome_idx
  ON public.question_import_rows(batch_id, outcome, row_number);

-- Snapshot exact existing rows as version 1; no source content or legacy
-- status is rewritten. All historical rows are conservatively pending review.
INSERT INTO public.question_bank_versions
  (question_id, version_number, payload, content_hash, legacy_status, review_state, change_reason)
SELECT q.id, 1, to_jsonb(q), md5(to_jsonb(q)::text), q.status, 'pending_review', 'baseline_import'
FROM public.question_bank q
ON CONFLICT (question_id, version_number) DO NOTHING;

-- Preserve source strings exactly. A legacy source label is not proof of
-- authoritative provenance, so migrated source records remain unverified.
INSERT INTO public.question_provenance
  (question_id, source_label, source_type, provenance_status, evidence)
SELECT q.id, NULLIF(q.source, ''), 'legacy_unknown',
  CASE WHEN q.source IS NULL OR btrim(q.source) = '' THEN 'unknown' ELSE 'unverified' END,
  jsonb_build_object('origin', 'legacy_question_bank.source', 'source_value_preserved', TRUE)
FROM public.question_bank q
ON CONFLICT (question_id) DO NOTHING;

ALTER TABLE public.question_bank_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_provenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_review_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_import_rows ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.question_bank_versions, public.question_provenance, public.question_review_events,
  public.question_flags, public.question_import_batches, public.question_import_rows
FROM PUBLIC, anon, authenticated;

-- Version snapshots and review events are append-only at the application privilege layer.
-- Explicitly revoke broader default privileges before granting only SELECT/INSERT.
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.question_bank_versions, public.question_review_events FROM service_role;
GRANT SELECT, INSERT ON TABLE public.question_bank_versions, public.question_review_events TO service_role;
GRANT ALL ON TABLE
  public.question_provenance, public.question_flags, public.question_import_batches, public.question_import_rows
TO service_role;

-- Legacy published status is not enough for delivery. review_state defaults all
-- existing rows to pending_review until a real review workflow approves them.
REVOKE ALL ON TABLE public.question_bank FROM PUBLIC, anon, authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.question_bank FROM service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.question_bank TO service_role;


-- Corrections create a new immutable snapshot and return the question to review.
CREATE OR REPLACE FUNCTION public.create_question_bank_version(
  p_question_id TEXT,
  p_payload JSONB,
  p_change_reason TEXT,
  p_actor_id UUID,
  p_actor_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  q public.question_bank%ROWTYPE;
  next_version INTEGER;
  subject_display TEXT;
  topic_name TEXT;
  subtopic_name TEXT;
  option_count INTEGER;
BEGIN
  IF p_actor_id IS NULL OR p_actor_role IS NULL
     OR p_actor_role NOT IN ('CONTENT_MANAGER', 'ADMIN', 'MASTER_ADMIN') THEN
    RAISE EXCEPTION 'Question editor is not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object'
     OR p_change_reason IS NULL OR length(btrim(p_change_reason)) < 5
     OR length(p_change_reason) > 500 THEN
    RAISE EXCEPTION 'A valid question payload and change reason are required'
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO q
  FROM public.question_bank
  WHERE id = p_question_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_payload->>'question' IS NULL OR length(btrim(p_payload->>'question')) < 8
     OR p_payload->>'explanation' IS NULL OR length(btrim(p_payload->>'explanation')) < 8
     OR p_payload->>'answer' IS NULL
     OR lower(p_payload->>'answer') NOT IN ('a', 'b', 'c', 'd')
     OR p_payload->>'difficulty' IS NULL
     OR p_payload->>'difficulty' NOT IN ('easy', 'medium', 'hard')
     OR p_payload->'options' IS NULL
     OR p_payload->'options'->>'A' IS NULL OR btrim(p_payload->'options'->>'A') = ''
     OR p_payload->'options'->>'B' IS NULL OR btrim(p_payload->'options'->>'B') = ''
     OR p_payload->'options'->>'C' IS NULL OR btrim(p_payload->'options'->>'C') = ''
     OR p_payload->'options'->>'D' IS NULL OR btrim(p_payload->'options'->>'D') = '' THEN
    RAISE EXCEPTION 'Question payload is incomplete or has an invalid answer key'
      USING ERRCODE = '23514';
  END IF;

  SELECT count(DISTINCT lower(regexp_replace(btrim(option_value), '[[:space:]]+', ' ', 'g')))
    INTO option_count
  FROM unnest(ARRAY[
    p_payload->'options'->>'A',
    p_payload->'options'->>'B',
    p_payload->'options'->>'C',
    p_payload->'options'->>'D'
  ]) AS options(option_value);
  IF option_count <> 4 THEN
    RAISE EXCEPTION 'Answer options must be distinct' USING ERRCODE = '23514';
  END IF;

  SELECT js.display_name, t.name, st.name
    INTO subject_display, topic_name, subtopic_name
  FROM public.jamb_subjects js
  JOIN public.jamb_topics t ON t.subject_slug = js.slug
  JOIN public.jamb_subtopics st ON st.topic_id = t.id
  WHERE js.slug = p_payload->>'subjectSlug'
    AND t.id = (p_payload->>'topicId')::UUID
    AND st.id = (p_payload->>'subtopicId')::UUID
    AND t.is_active = TRUE
    AND st.is_active = TRUE;

  IF subject_display IS NULL OR topic_name IS NULL OR subtopic_name IS NULL THEN
    RAISE EXCEPTION 'Question subject, topic and subtopic must be valid and correctly related'
      USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.question_bank_versions
    WHERE question_id = p_question_id AND version_number = q.current_version
  ) THEN
    RAISE EXCEPTION 'Current question version snapshot is missing'
      USING ERRCODE = '23514';
  END IF;

  next_version := q.current_version + 1;

  UPDATE public.question_bank
  SET exam_type = COALESCE(p_payload->>'examType', q.exam_type),
      subject = subject_display,
      topic = topic_name,
      subtopic = subtopic_name,
      year = COALESCE((p_payload->>'year')::INTEGER, q.year),
      question = p_payload->>'question',
      option_a = p_payload->'options'->>'A',
      option_b = p_payload->'options'->>'B',
      option_c = p_payload->'options'->>'C',
      option_d = p_payload->'options'->>'D',
      answer = lower(p_payload->>'answer'),
      explanation = p_payload->>'explanation',
      explanation_short = NULLIF(p_payload->>'explanationShort', ''),
      difficulty = p_payload->>'difficulty',
      concepts = ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_payload->'concepts', '[]'::JSONB))),
      topic_id = (p_payload->>'topicId')::UUID,
      subtopic_id = (p_payload->>'subtopicId')::UUID,
      current_version = next_version,
      review_state = 'pending_review',
      status = 'ai-draft',
      updated_at = NOW()
  WHERE id = p_question_id
  RETURNING * INTO q;

  -- A content revision invalidates the previous provenance approval until the
  -- source is rechecked against the new version.
  UPDATE public.question_provenance
  SET provenance_status = 'unverified',
      updated_at = NOW(),
      evidence = evidence || jsonb_build_object(
        'provenance_recheck_required', TRUE,
        'last_content_revision_version', next_version
      )
  WHERE question_id = p_question_id;

  INSERT INTO public.question_bank_versions
    (question_id, version_number, payload, content_hash, legacy_status, review_state, change_reason, created_by)
  VALUES
    (q.id, next_version, to_jsonb(q), md5(to_jsonb(q)::text), q.status, 'pending_review', p_change_reason, p_actor_id);

  INSERT INTO public.question_review_events
    (question_id, version_number, decision, reviewer_id, reviewer_role, comments, quality_checks)
  VALUES
    (q.id, next_version, 'submitted', p_actor_id, p_actor_role, p_change_reason,
     '{"content_valid": true, "requires_review": true}'::JSONB);

  RETURN jsonb_build_object(
    'question_id', q.id,
    'version_number', next_version,
    'review_state', 'pending_review',
    'status', 'ai-draft'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_question_bank_version(TEXT, JSONB, TEXT, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_question_bank_version(TEXT, JSONB, TEXT, UUID, TEXT)
  TO service_role;

-- Atomic, server-only review transition. Approval requires a human reviewer
-- attestation plus verified provenance and syllabus taxonomy in the database.
CREATE OR REPLACE FUNCTION public.review_question_bank_item(
  p_question_id TEXT,
  p_decision TEXT,
  p_reviewer_id UUID,
  p_reviewer_role TEXT,
  p_comments TEXT DEFAULT NULL,
  p_quality_checks JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  q public.question_bank%ROWTYPE;
  next_state TEXT;
  provenance_state TEXT;
  topic_state TEXT;
  subtopic_state TEXT;
  option_count INTEGER;
BEGIN
  IF p_reviewer_id IS NULL OR p_reviewer_role IS NULL OR p_reviewer_role NOT IN ('CONTENT_MANAGER', 'ADMIN', 'MASTER_ADMIN') THEN
    RAISE EXCEPTION 'Reviewer is not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_decision IS NULL OR p_decision NOT IN ('approved', 'rejected', 'changes_requested', 'flagged', 'retired') THEN
    RAISE EXCEPTION 'Unsupported review decision' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO q
  FROM public.question_bank
  WHERE id = p_question_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    (q.review_state = 'pending_review' AND p_decision IN ('approved', 'rejected', 'changes_requested', 'flagged', 'retired'))
    OR (q.review_state = 'approved' AND p_decision IN ('flagged', 'retired'))
    OR (q.review_state = 'rejected' AND p_decision IN ('changes_requested', 'retired'))
    OR (q.review_state = 'flagged' AND p_decision IN ('approved', 'rejected', 'changes_requested', 'retired'))
  ) THEN
    RAISE EXCEPTION 'Invalid question review transition: % -> %', q.review_state, p_decision
      USING ERRCODE = '22023';
  END IF;

  next_state := CASE p_decision
    WHEN 'changes_requested' THEN 'pending_review'
    ELSE p_decision
  END;

  IF p_decision = 'approved' THEN
    IF NOT (COALESCE(p_quality_checks, '{}'::JSONB) @> '{"content_reviewed": true, "answer_key_verified": true}'::JSONB) THEN
      RAISE EXCEPTION 'Approval requires content_reviewed and answer_key_verified reviewer attestations'
        USING ERRCODE = '23514';
    END IF;

    IF q.question IS NULL OR btrim(q.question) = ''
       OR q.explanation IS NULL OR btrim(q.explanation) = ''
       OR q.answer IS NULL OR lower(btrim(q.answer)) NOT IN ('a', 'b', 'c', 'd')
       OR q.option_a IS NULL OR btrim(q.option_a) = ''
       OR q.option_b IS NULL OR btrim(q.option_b) = ''
       OR q.option_c IS NULL OR btrim(q.option_c) = ''
       OR q.option_d IS NULL OR btrim(q.option_d) = '' THEN
      RAISE EXCEPTION 'Question content is incomplete or answer key is invalid'
        USING ERRCODE = '23514';
    END IF;

    SELECT count(DISTINCT lower(regexp_replace(btrim(option_value), '[[:space:]]+', ' ', 'g')))
      INTO option_count
    FROM unnest(ARRAY[q.option_a, q.option_b, q.option_c, q.option_d]) AS options(option_value);
    IF option_count <> 4 THEN
      RAISE EXCEPTION 'Answer options must be distinct' USING ERRCODE = '23514';
    END IF;

    SELECT provenance_status INTO provenance_state
    FROM public.question_provenance
    WHERE question_id = p_question_id;

    IF provenance_state IS DISTINCT FROM 'verified' THEN
      RAISE EXCEPTION 'Question provenance must be verified before approval'
        USING ERRCODE = '23514';
    END IF;

    SELECT t.verification_status, st.verification_status
      INTO topic_state, subtopic_state
    FROM public.jamb_topics t
    JOIN public.jamb_subtopics st ON st.topic_id = t.id
    WHERE t.id = q.topic_id
      AND st.id = q.subtopic_id
      AND t.is_active = TRUE
      AND st.is_active = TRUE
      AND EXISTS (
        SELECT 1
        FROM public.jamb_subjects js
        WHERE js.slug = t.subject_slug
          AND (
            lower(btrim(q.subject)) = lower(js.display_name)
            OR EXISTS (
              SELECT 1 FROM unnest(js.aliases) AS aliases(alias_value)
              WHERE lower(btrim(q.subject)) = lower(btrim(alias_value))
            )
          )
      );

    IF topic_state IS DISTINCT FROM 'verified' OR subtopic_state IS DISTINCT FROM 'verified' THEN
      RAISE EXCEPTION 'Question topic and subtopic must be verified before approval'
        USING ERRCODE = '23514';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.question_bank_versions
      WHERE question_id = p_question_id AND version_number = q.current_version
    ) THEN
      RAISE EXCEPTION 'Current question version snapshot is missing'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  UPDATE public.question_bank
  SET review_state = next_state,
      status = CASE WHEN p_decision = 'approved' THEN 'published' ELSE status END,
      updated_at = NOW()
  WHERE id = p_question_id;

  INSERT INTO public.question_review_events
    (question_id, version_number, decision, reviewer_id, reviewer_role, comments, quality_checks)
  VALUES
    (p_question_id, q.current_version, p_decision, p_reviewer_id, p_reviewer_role, p_comments,
     COALESCE(p_quality_checks, '{}'::JSONB));

  RETURN jsonb_build_object(
    'question_id', p_question_id,
    'version_number', q.current_version,
    'decision', p_decision,
    'review_state', next_state
  );
END;
$$;

REVOKE ALL ON FUNCTION public.review_question_bank_item(TEXT, TEXT, UUID, TEXT, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_question_bank_item(TEXT, TEXT, UUID, TEXT, TEXT, JSONB)
  TO service_role;


-- Student-facing retrieval returns only fully approved content and never
-- includes the authoritative answer key or explanation.
CREATE OR REPLACE FUNCTION public.get_eligible_question_bank(
  p_subject_slug TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id TEXT, subject TEXT, topic TEXT, subtopic TEXT, year INTEGER,
  question TEXT, option_a TEXT, option_b TEXT, option_c TEXT, option_d TEXT,
  difficulty TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT q.id, q.subject, q.topic, q.subtopic, q.year, q.question,
         q.option_a, q.option_b, q.option_c, q.option_d, q.difficulty
  FROM public.question_bank q
  JOIN public.question_provenance p ON p.question_id = q.id
  JOIN public.jamb_topics t ON t.id = q.topic_id
  JOIN public.jamb_subtopics st ON st.id = q.subtopic_id AND st.topic_id = t.id
  WHERE q.status = 'published'
    AND q.review_state = 'approved'
    AND p.provenance_status = 'verified'
    AND t.verification_status = 'verified'
    AND st.verification_status = 'verified'
    AND t.is_active = TRUE
    AND st.is_active = TRUE
    AND (p_subject_slug IS NULL OR t.subject_slug = p_subject_slug)
  ORDER BY q.id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION public.get_eligible_question_bank(TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_eligible_question_bank(TEXT, INTEGER, INTEGER)
  TO service_role;


-- Provenance verification is an explicit, auditable human action. It is
-- version-bound so a concurrent content revision cannot inherit verification.
CREATE OR REPLACE FUNCTION public.verify_question_provenance(
  p_question_id TEXT,
  p_source_label TEXT,
  p_source_url TEXT,
  p_source_type TEXT,
  p_attribution TEXT,
  p_evidence_note TEXT,
  p_actor_id UUID,
  p_actor_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $phase2$
DECLARE
  q public.question_bank%ROWTYPE;
  p public.question_provenance%ROWTYPE;
  verification JSONB;
BEGIN
  IF p_actor_id IS NULL OR p_actor_role IS NULL
     OR p_actor_role NOT IN ('CONTENT_MANAGER', 'ADMIN', 'MASTER_ADMIN') THEN
    RAISE EXCEPTION 'Provenance verifier is not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_source_label IS NULL OR btrim(p_source_label) = ''
     OR p_source_url IS NULL OR p_source_url !~ '^https?://'
     OR p_source_type IS NULL OR p_source_type NOT IN ('official_exam', 'publisher', 'contributor', 'ai_generated', 'other')
     OR p_attribution IS NULL OR btrim(p_attribution) = ''
     OR p_evidence_note IS NULL OR length(btrim(p_evidence_note)) < 20 THEN
    RAISE EXCEPTION 'Source label, valid HTTP(S) URL, source type, attribution and evidence note are required'
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO q FROM public.question_bank
  WHERE id = p_question_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO p FROM public.question_provenance
  WHERE question_id = p_question_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question provenance record not found' USING ERRCODE = 'P0002';
  END IF;

  verification := jsonb_build_object(
    'version_number', q.current_version,
    'verified_by', p_actor_id,
    'verified_role', p_actor_role,
    'verified_at', NOW(),
    'source_label', btrim(p_source_label),
    'source_url', p_source_url,
    'source_type', p_source_type,
    'attribution', btrim(p_attribution),
    'evidence_note', btrim(p_evidence_note)
  );

  UPDATE public.question_provenance
  SET source_label = btrim(p_source_label),
      source_url = p_source_url,
      source_type = p_source_type,
      attribution = btrim(p_attribution),
      provenance_status = 'verified',
      evidence = COALESCE(evidence, '{}'::JSONB) ||
        jsonb_build_object(
          'verification_history',
          COALESCE(evidence->'verification_history', '[]'::JSONB) || jsonb_build_array(verification),
          'verified_version', q.current_version,
          'verified_at', NOW()
        ),
      updated_at = NOW()
  WHERE question_id = p_question_id;

  RETURN jsonb_build_object(
    'question_id', p_question_id,
    'version_number', q.current_version,
    'provenance_status', 'verified'
  );
END;
$phase2$;

REVOKE ALL ON FUNCTION public.verify_question_provenance(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_question_provenance(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT)
  TO service_role;


-- Validated batches can be committed only as draft content. The commit is
-- atomic, rechecks taxonomy and duplicates, and never publishes a question.
ALTER TABLE public.question_import_batches
  ADD COLUMN IF NOT EXISTS committed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS committed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.commit_question_import_batch(
  p_batch_id UUID,
  p_actor_id UUID,
  p_actor_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $phase2$
DECLARE
  batch_row public.question_import_batches%ROWTYPE;
  import_row public.question_import_rows%ROWTYPE;
  normalized JSONB;
  source_meta JSONB;
  subject_display TEXT;
  topic_name TEXT;
  subtopic_name TEXT;
  new_id TEXT;
  inserted_ids JSONB := '[]'::JSONB;
  inserted_count INTEGER := 0;
BEGIN
  IF p_actor_id IS NULL OR p_actor_role IS NULL
     OR p_actor_role NOT IN ('CONTENT_MANAGER', 'ADMIN', 'MASTER_ADMIN') THEN
    RAISE EXCEPTION 'Import committer is not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO batch_row FROM public.question_import_batches
  WHERE id = p_batch_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Import batch not found' USING ERRCODE = 'P0002';
  END IF;
  IF batch_row.status <> 'validated' THEN
    RAISE EXCEPTION 'Only a validated import batch can be committed' USING ERRCODE = '22023';
  END IF;
  IF batch_row.total_rows = 0
     OR batch_row.valid_rows <> batch_row.total_rows
     OR batch_row.invalid_rows <> 0
     OR batch_row.duplicate_rows <> 0
     OR (SELECT count(*) FROM public.question_import_rows
         WHERE batch_id = p_batch_id AND outcome = 'valid') <> batch_row.total_rows THEN
    RAISE EXCEPTION 'Resolve all invalid and duplicate rows, then validate a clean batch before committing'
      USING ERRCODE = '23514';
  END IF;

  -- Serialize import commits so concurrent batches cannot race past the
  -- duplicate check against one another.
  PERFORM pg_advisory_xact_lock(hashtext('sabi-question-bank-import-commit'));

  FOR import_row IN
    SELECT * FROM public.question_import_rows
    WHERE batch_id = p_batch_id AND outcome = 'valid'
    ORDER BY row_number
    FOR UPDATE
  LOOP
    normalized := import_row.normalized_payload;
    source_meta := COALESCE(normalized->'provenance', '{}'::JSONB);

    SELECT js.display_name, t.name, st.name
      INTO subject_display, topic_name, subtopic_name
    FROM public.jamb_subjects js
    JOIN public.jamb_topics t ON t.subject_slug = js.slug
    JOIN public.jamb_subtopics st ON st.topic_id = t.id
    WHERE js.slug = normalized->>'subjectSlug'
      AND t.id = (normalized->>'topicId')::UUID
      AND st.id = (normalized->>'subtopicId')::UUID
      AND js.is_active = TRUE AND t.is_active = TRUE AND st.is_active = TRUE;

    IF subject_display IS NULL OR topic_name IS NULL OR subtopic_name IS NULL THEN
      RAISE EXCEPTION 'Taxonomy changed after validation; revalidate batch row %', import_row.row_number
        USING ERRCODE = '23514';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.question_bank q
      WHERE lower(btrim(q.subject)) = lower(btrim(subject_display))
        AND lower(regexp_replace(btrim(q.question), '[[:space:]]+', ' ', 'g')) =
            lower(regexp_replace(btrim(normalized->>'question'), '[[:space:]]+', ' ', 'g'))
        AND lower(regexp_replace(btrim(q.option_a), '[[:space:]]+', ' ', 'g')) =
            lower(regexp_replace(btrim(normalized->'options'->>'A'), '[[:space:]]+', ' ', 'g'))
        AND lower(regexp_replace(btrim(q.option_b), '[[:space:]]+', ' ', 'g')) =
            lower(regexp_replace(btrim(normalized->'options'->>'B'), '[[:space:]]+', ' ', 'g'))
        AND lower(regexp_replace(btrim(q.option_c), '[[:space:]]+', ' ', 'g')) =
            lower(regexp_replace(btrim(normalized->'options'->>'C'), '[[:space:]]+', ' ', 'g'))
        AND lower(regexp_replace(btrim(q.option_d), '[[:space:]]+', ' ', 'g')) =
            lower(regexp_replace(btrim(normalized->'options'->>'D'), '[[:space:]]+', ' ', 'g'))
    ) THEN
      RAISE EXCEPTION 'A duplicate appeared after validation; revalidate batch row %', import_row.row_number
        USING ERRCODE = '23505';
    END IF;

    new_id := 'Q-' || replace(gen_random_uuid()::TEXT, '-', '');
    INSERT INTO public.question_bank (
      id, exam_type, subject, topic, subtopic, year, question,
      option_a, option_b, option_c, option_d, answer, explanation,
      explanation_short, difficulty, concepts, source, status,
      topic_id, subtopic_id, current_version, review_state
    ) VALUES (
      new_id,
      COALESCE(normalized->>'examType', 'UTME'),
      subject_display, topic_name, subtopic_name,
      NULLIF(normalized->>'year', '')::INTEGER,
      normalized->>'question',
      normalized->'options'->>'A', normalized->'options'->>'B',
      normalized->'options'->>'C', normalized->'options'->>'D',
      lower(normalized->>'answer'), normalized->>'explanation',
      NULLIF(normalized->>'explanationShort', ''),
      normalized->>'difficulty',
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(normalized->'concepts', '[]'::JSONB))),
      COALESCE(NULLIF(source_meta->>'sourceLabel', ''), batch_row.source_label, 'Unverified import'),
      'ai-draft', (normalized->>'topicId')::UUID, (normalized->>'subtopicId')::UUID,
      1, 'pending_review'
    );

    INSERT INTO public.question_provenance (
      question_id, source_label, source_url, source_type, attribution,
      provenance_status, evidence
    ) VALUES (
      new_id,
      COALESCE(NULLIF(source_meta->>'sourceLabel', ''), batch_row.source_label),
      COALESCE(NULLIF(source_meta->>'sourceUrl', ''), batch_row.source_url),
      CASE WHEN source_meta->>'sourceType' IN ('official_exam','publisher','contributor','ai_generated','other')
        THEN source_meta->>'sourceType' ELSE 'legacy_unknown' END,
      NULLIF(source_meta->>'attribution', ''),
      CASE WHEN COALESCE(NULLIF(source_meta->>'sourceLabel', ''), batch_row.source_label) IS NULL
             AND COALESCE(NULLIF(source_meta->>'sourceUrl', ''), batch_row.source_url) IS NULL
        THEN 'unknown' ELSE 'unverified' END,
      jsonb_build_object('origin', 'question_import_batch', 'batch_id', p_batch_id, 'row_number', import_row.row_number)
    );

    INSERT INTO public.question_bank_versions (
      question_id, version_number, payload, content_hash, legacy_status,
      review_state, change_reason, created_by
    )
    SELECT q.id, 1, to_jsonb(q), md5(to_jsonb(q)::TEXT), q.status,
           'pending_review', 'import_batch:' || p_batch_id::TEXT, p_actor_id
    FROM public.question_bank q WHERE q.id = new_id;

    INSERT INTO public.question_review_events (
      question_id, version_number, decision, reviewer_id, reviewer_role,
      comments, quality_checks
    ) VALUES (
      new_id, 1, 'submitted', p_actor_id, p_actor_role,
      'Imported through validated batch ' || p_batch_id::TEXT,
      '{"import_validated": true, "requires_human_review": true}'::JSONB
    );

    UPDATE public.question_import_rows SET outcome = 'imported'
    WHERE id = import_row.id;
    inserted_ids := inserted_ids || jsonb_build_array(new_id);
    inserted_count := inserted_count + 1;
  END LOOP;

  UPDATE public.question_import_batches
  SET status = 'committed',
      committed_by = p_actor_id,
      committed_at = NOW(),
      summary = COALESCE(summary, '{}'::JSONB) ||
        jsonb_build_object('imported_count', inserted_count, 'question_ids', inserted_ids),
      completed_at = COALESCE(completed_at, NOW())
  WHERE id = p_batch_id;

  RETURN jsonb_build_object(
    'batch_id', p_batch_id,
    'status', 'committed',
    'imported_count', inserted_count,
    'question_ids', inserted_ids,
    'review_state', 'pending_review'
  );
END;
$phase2$;

REVOKE ALL ON FUNCTION public.commit_question_import_batch(UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_question_import_batch(UUID, UUID, TEXT)
  TO service_role;


-- Answer evaluation is available only after an authenticated student submits
-- an option for a currently eligible question. The question pool endpoint
-- itself continues to omit answer keys and explanations.
CREATE OR REPLACE FUNCTION public.submit_eligible_question_answer(
  p_question_id TEXT,
  p_answer TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $phase2$
DECLARE
  correct_answer TEXT;
  answer_explanation TEXT;
BEGIN
  IF p_answer IS NULL OR upper(btrim(p_answer)) NOT IN ('A', 'B', 'C', 'D') THEN
    RAISE EXCEPTION 'Answer must be A, B, C or D' USING ERRCODE = '22023';
  END IF;

  SELECT q.answer, q.explanation
    INTO correct_answer, answer_explanation
  FROM public.question_bank q
  JOIN public.question_provenance p ON p.question_id = q.id
  JOIN public.jamb_topics t ON t.id = q.topic_id
  JOIN public.jamb_subtopics st ON st.id = q.subtopic_id AND st.topic_id = t.id
  WHERE q.id = p_question_id
    AND q.status = 'published'
    AND q.review_state = 'approved'
    AND p.provenance_status = 'verified'
    AND t.verification_status = 'verified'
    AND st.verification_status = 'verified'
    AND t.is_active = TRUE
    AND st.is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Eligible question not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object(
    'question_id', p_question_id,
    'submitted_answer', upper(btrim(p_answer)),
    'is_correct', lower(correct_answer) = lower(btrim(p_answer)),
    'correct_answer', upper(correct_answer),
    'explanation', answer_explanation
  );
END;
$phase2$;

REVOKE ALL ON FUNCTION public.submit_eligible_question_answer(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_eligible_question_answer(TEXT, TEXT)
  TO service_role;

COMMIT;

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

-- Snapshot the exact existing record as version 1. No legacy answer, status,
-- explanation, or taxonomy value is changed by this migration.
INSERT INTO public.question_bank_versions
  (question_id, version_number, payload, content_hash, legacy_status, review_state, change_reason)
SELECT
  q.id,
  1,
  to_jsonb(q),
  md5(to_jsonb(q)::text),
  q.status,
  'pending_review',
  'baseline_import'
FROM public.question_bank q
ON CONFLICT (question_id, version_number) DO NOTHING;

-- Preserve source strings exactly as imported. A legacy source label is not
-- proof of authoritative provenance; every migrated provenance record is
-- explicitly unverified (or unknown where no source label exists).
INSERT INTO public.question_provenance
  (question_id, source_label, source_type, provenance_status, evidence)
SELECT
  q.id,
  NULLIF(q.source, ''),
  CASE
    WHEN q.source IS NULL OR btrim(q.source) = '' THEN 'legacy_unknown'
    ELSE 'legacy_unknown'
  END,
  CASE
    WHEN q.source IS NULL OR btrim(q.source) = '' THEN 'unknown'
    ELSE 'unverified'
  END,
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
  public.question_bank_versions,
  public.question_provenance,
  public.question_review_events,
  public.question_flags,
  public.question_import_batches,
  public.question_import_rows
FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE
  public.question_bank_versions,
  public.question_provenance,
  public.question_review_events,
  public.question_flags,
  public.question_import_batches,
  public.question_import_rows
TO service_role;

-- The base question bank remains server-only. Its review_state column defaults
-- all pre-existing records to pending_review; legacy 'published' is not enough
-- to make a question eligible for learning/exam delivery.
REVOKE ALL ON TABLE public.question_bank FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.question_bank TO service_role;

COMMIT;

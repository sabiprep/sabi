-- Stage 1B: Permanent Public Shared Question Links Registry
-- Guarantees that EVERY current and future question (including AI-generated
-- practice questions not yet in question_bank) resolves permanently at /q/:questionId.
-- Direct anon/authenticated table access is revoked so correct_answer is NEVER exposed
-- prior to server-side answer verification via POST /api/public/questions/:id/check.

BEGIN;

CREATE TABLE IF NOT EXISTS public.shared_question_links (
  canonical_question_id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  shared_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mode TEXT NOT NULL DEFAULT 'blitz' CHECK (mode IN ('blitz', 'smart', 'custom', 'cbt')),
  subject_canonical TEXT NOT NULL,
  subject_label TEXT NOT NULL,
  topic_label TEXT NOT NULL,
  question_year INTEGER,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  explanation_short TEXT NOT NULL DEFAULT '',
  explanation_full TEXT NOT NULL DEFAULT '',
  explanation_pidgin TEXT NOT NULL DEFAULT '',
  share_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_question_links_updated
  ON public.shared_question_links (updated_at DESC);

ALTER TABLE public.shared_question_links ENABLE ROW LEVEL SECURITY;

-- Keep answer keys strictly behind backend Express routes (service_role only)
REVOKE ALL PRIVILEGES ON TABLE public.shared_question_links FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.shared_question_links FROM authenticated;

COMMIT;

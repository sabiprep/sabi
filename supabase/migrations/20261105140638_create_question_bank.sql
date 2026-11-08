-- Sabi question bank
-- Mirrors the audited personal-project schema exactly.
-- This migration creates an empty destination table; it does not copy or alter data.

CREATE TABLE IF NOT EXISTS public.question_bank (
  id TEXT PRIMARY KEY,
  exam_type TEXT,
  subject TEXT NOT NULL,
  topic TEXT,
  subtopic TEXT,
  year INTEGER,
  question TEXT NOT NULL,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  answer TEXT NOT NULL,
  explanation TEXT,
  explanation_short TEXT,
  difficulty TEXT DEFAULT 'medium'::TEXT,
  difficulty_actual TEXT,
  concepts TEXT[],
  common_wrong_answer TEXT,
  source TEXT DEFAULT 'ALOC API'::TEXT,
  status TEXT DEFAULT 'ai-draft'::TEXT,
  confidence_score DOUBLE PRECISION DEFAULT 0.0,
  flag_count INTEGER DEFAULT 0,
  verified_by TEXT DEFAULT 'ai-confirmed'::TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_difficulty ON public.question_bank (difficulty);
CREATE INDEX IF NOT EXISTS idx_exam_type ON public.question_bank (exam_type);
CREATE INDEX IF NOT EXISTS idx_status ON public.question_bank (status);
CREATE INDEX IF NOT EXISTS idx_subject ON public.question_bank (subject);
CREATE INDEX IF NOT EXISTS idx_topic ON public.question_bank (topic);
CREATE INDEX IF NOT EXISTS idx_year ON public.question_bank (year);

ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

-- Question-bank access is server-only until the API's authorization and
-- question-publication rules are implemented. Never expose answer keys via
-- direct anon/authenticated table access.
REVOKE ALL ON TABLE public.question_bank FROM anon, authenticated, service_role;
GRANT SELECT, INSERT ON TABLE public.question_bank TO service_role;

COMMENT ON TABLE public.question_bank IS
  'Sabi UTME question bank. Imported from the legacy personal project with source metadata and status preserved.';
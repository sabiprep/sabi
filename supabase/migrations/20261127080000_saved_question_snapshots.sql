-- Cross-device Saved Question Snapshots Vault
-- Stores full-display Blitz, Smart Practice, Custom Practice, and CBT review snapshots
-- per authenticated student with strict Row-Level Security (RLS).

CREATE TABLE IF NOT EXISTS public.saved_question_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  canonical_question_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('blitz', 'smart', 'custom', 'cbt')),
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
  was_answered BOOLEAN NOT NULL DEFAULT FALSE,
  selected_option TEXT CHECK (selected_option IS NULL OR selected_option IN ('A', 'B', 'C', 'D')),
  is_correct BOOLEAN,
  explanation_style TEXT NOT NULL DEFAULT 'english' CHECK (explanation_style IN ('english', 'pidgin')),
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT saved_question_snapshots_user_canonical_unique UNIQUE (user_id, canonical_question_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_snapshots_user_saved_at
  ON public.saved_question_snapshots (user_id, saved_at DESC);

ALTER TABLE public.saved_question_snapshots ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.saved_question_snapshots FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.saved_question_snapshots TO authenticated, service_role;

DROP POLICY IF EXISTS "Users can view their own saved snapshots" ON public.saved_question_snapshots;
CREATE POLICY "Users can view their own saved snapshots"
  ON public.saved_question_snapshots
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own saved snapshots" ON public.saved_question_snapshots;
CREATE POLICY "Users can insert their own saved snapshots"
  ON public.saved_question_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own saved snapshots" ON public.saved_question_snapshots;
CREATE POLICY "Users can update their own saved snapshots"
  ON public.saved_question_snapshots
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own saved snapshots" ON public.saved_question_snapshots;
CREATE POLICY "Users can delete their own saved snapshots"
  ON public.saved_question_snapshots
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.saved_question_snapshots IS
  'Cross-device saved full-display JAMB question snapshots (answered & unanswered states) synced across Android APK and Desktop WebApp.';

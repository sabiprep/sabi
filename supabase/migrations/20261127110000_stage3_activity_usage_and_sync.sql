-- =============================================================================
-- Stage 3: Authoritative Study Activity Events, Daily Usage & Cross-Device Sync
-- =============================================================================
-- Stores idempotent student question attempts, session duration logs, and
-- authoritative Nigeria-time (Africa/Lagos, WAT) daily usage aggregates so
-- streaks, XP, and mastery remain consistent across Android APK and Desktop WebApp.

CREATE TABLE IF NOT EXISTS public.student_activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('question_attempt', 'session_completed')),
  mode TEXT NOT NULL CHECK (mode IN ('blitz', 'smart', 'custom', 'cbt', 'diagnostic')),
  question_id TEXT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT 'Core Syllabus',
  selected_option TEXT NULL CHECK (selected_option IS NULL OR selected_option IN ('A', 'B', 'C', 'D')),
  is_correct BOOLEAN NULL,
  elapsed_seconds INTEGER NOT NULL DEFAULT 0 CHECK (elapsed_seconds >= 0 AND elapsed_seconds <= 7200),
  xp_awarded INTEGER NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0 AND xp_awarded <= 250),
  activity_date_wat DATE NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT student_activity_events_user_client_unique UNIQUE (user_id, client_event_id)
);

CREATE INDEX IF NOT EXISTS idx_student_activity_events_user_date
  ON public.student_activity_events (user_id, activity_date_wat DESC);

CREATE INDEX IF NOT EXISTS idx_student_activity_events_user_subject
  ON public.student_activity_events (user_id, subject, topic);

CREATE TABLE IF NOT EXISTS public.student_daily_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  questions_practiced INTEGER NOT NULL DEFAULT 0 CHECK (questions_practiced >= 0),
  correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  xp_earned INTEGER NOT NULL DEFAULT 0 CHECK (xp_earned >= 0),
  study_seconds INTEGER NOT NULL DEFAULT 0 CHECK (study_seconds >= 0),
  sessions_completed INTEGER NOT NULL DEFAULT 0 CHECK (sessions_completed >= 0),
  subjects_practiced TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (user_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_student_daily_usage_user_recent
  ON public.student_daily_usage (user_id, activity_date DESC);

-- Enable Row Level Security: learners can only read their own verified records;
-- all authoritative writes happen server-side via service_role to prevent XP/streak spoofing.
ALTER TABLE public.student_activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_daily_usage ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.student_activity_events FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.student_activity_events FROM authenticated;
GRANT SELECT ON TABLE public.student_activity_events TO authenticated;

REVOKE ALL ON TABLE public.student_daily_usage FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.student_daily_usage FROM authenticated;
GRANT SELECT ON TABLE public.student_daily_usage TO authenticated;

DROP POLICY IF EXISTS "Students can view own activity events" ON public.student_activity_events;
CREATE POLICY "Students can view own activity events"
  ON public.student_activity_events
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Students can view own daily usage" ON public.student_daily_usage;
CREATE POLICY "Students can view own daily usage"
  ON public.student_daily_usage
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

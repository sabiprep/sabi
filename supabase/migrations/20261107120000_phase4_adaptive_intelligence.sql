-- SABI Phase 4: adaptive review scheduling.
-- A schedule row is derived from each persisted attempt. This is additive and
-- never promotes question content or alters student attempt history.
BEGIN;

CREATE TABLE IF NOT EXISTS public.student_topic_review_schedule (
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.jamb_topics(id) ON DELETE RESTRICT,
  subtopic_id UUID NOT NULL REFERENCES public.jamb_subtopics(id) ON DELETE RESTRICT,
  subject_slug TEXT NOT NULL,
  consecutive_correct INTEGER NOT NULL DEFAULT 0 CHECK (consecutive_correct >= 0),
  interval_days INTEGER NOT NULL DEFAULT 1 CHECK (interval_days BETWEEN 1 AND 30),
  last_reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_review_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_result_correct BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, topic_id, subtopic_id)
);

CREATE INDEX IF NOT EXISTS student_topic_review_due_idx
  ON public.student_topic_review_schedule(student_id, next_review_at);

ALTER TABLE public.student_topic_review_schedule ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.student_topic_review_schedule FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.student_topic_review_schedule TO service_role;

CREATE OR REPLACE FUNCTION public.schedule_topic_review_after_attempt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $phase4$
DECLARE
  v_streak INTEGER;
  v_interval INTEGER;
BEGIN
  INSERT INTO public.student_topic_review_schedule (
    student_id, topic_id, subtopic_id, subject_slug,
    consecutive_correct, interval_days, last_reviewed_at,
    next_review_at, last_result_correct, updated_at
  )
  VALUES (
    NEW.student_id, NEW.topic_id, NEW.subtopic_id, NEW.subject_slug,
    CASE WHEN NEW.is_correct THEN 1 ELSE 0 END,
    1,
    NEW.attempted_at,
    NEW.attempted_at + INTERVAL '1 day',
    NEW.is_correct,
    NOW()
  )
  ON CONFLICT (student_id, topic_id, subtopic_id) DO UPDATE SET
    subject_slug = EXCLUDED.subject_slug,
    consecutive_correct = CASE
      WHEN NEW.is_correct THEN public.student_topic_review_schedule.consecutive_correct + 1
      ELSE 0
    END,
    interval_days = CASE
      WHEN NOT NEW.is_correct THEN 1
      WHEN public.student_topic_review_schedule.consecutive_correct = 0 THEN 1
      WHEN public.student_topic_review_schedule.consecutive_correct = 1 THEN 3
      WHEN public.student_topic_review_schedule.consecutive_correct = 2 THEN 7
      WHEN public.student_topic_review_schedule.consecutive_correct = 3 THEN 14
      ELSE 30
    END,
    last_reviewed_at = NEW.attempted_at,
    next_review_at = NEW.attempted_at + (
      CASE
        WHEN NOT NEW.is_correct THEN 1
        WHEN public.student_topic_review_schedule.consecutive_correct = 0 THEN 1
        WHEN public.student_topic_review_schedule.consecutive_correct = 1 THEN 3
        WHEN public.student_topic_review_schedule.consecutive_correct = 2 THEN 7
        WHEN public.student_topic_review_schedule.consecutive_correct = 3 THEN 14
        ELSE 30
      END * INTERVAL '1 day'
    ),
    last_result_correct = NEW.is_correct,
    updated_at = NOW();

  RETURN NEW;
END;
$phase4$;

DROP TRIGGER IF EXISTS learning_attempt_schedule_topic_review ON public.learning_attempts;
CREATE TRIGGER learning_attempt_schedule_topic_review
AFTER INSERT ON public.learning_attempts
FOR EACH ROW EXECUTE FUNCTION public.schedule_topic_review_after_attempt();

REVOKE ALL ON FUNCTION public.schedule_topic_review_after_attempt()
  FROM PUBLIC, anon, authenticated, service_role;

COMMIT;

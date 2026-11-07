-- SABI Phase 3: persistent learning evidence and topic mastery.
-- Additive only. No existing question-bank rows or production data are changed.
BEGIN;

CREATE TABLE IF NOT EXISTS public.learning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('diagnostic', 'smart', 'blitz', 'custom', 'cbt')),
  subject_slug TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((status = 'active' AND completed_at IS NULL) OR (status <> 'active' AND completed_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS learning_sessions_student_started_idx
  ON public.learning_sessions(student_id, started_at DESC);
CREATE INDEX IF NOT EXISTS learning_sessions_student_status_idx
  ON public.learning_sessions(student_id, status, started_at DESC);

CREATE TABLE IF NOT EXISTS public.learning_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.learning_sessions(id) ON DELETE RESTRICT,
  question_id TEXT NOT NULL REFERENCES public.question_bank(id) ON DELETE RESTRICT,
  question_version_id UUID NOT NULL REFERENCES public.question_bank_versions(id) ON DELETE RESTRICT,
  question_version_number INTEGER NOT NULL CHECK (question_version_number > 0),
  subject_slug TEXT NOT NULL,
  topic_id UUID NOT NULL REFERENCES public.jamb_topics(id) ON DELETE RESTRICT,
  subtopic_id UUID NOT NULL REFERENCES public.jamb_subtopics(id) ON DELETE RESTRICT,
  submitted_option TEXT NOT NULL CHECK (submitted_option IN ('a', 'b', 'c', 'd')),
  is_correct BOOLEAN NOT NULL,
  response_time_ms INTEGER CHECK (response_time_ms IS NULL OR response_time_ms BETWEEN 0 AND 3600000),
  answer_algorithm_version TEXT NOT NULL DEFAULT 'answer-evaluation-v1',
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, event_id)
);

CREATE INDEX IF NOT EXISTS learning_attempts_student_time_idx
  ON public.learning_attempts(student_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS learning_attempts_student_topic_idx
  ON public.learning_attempts(student_id, topic_id, subtopic_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS learning_attempts_session_idx
  ON public.learning_attempts(student_id, session_id, attempted_at);

CREATE TABLE IF NOT EXISTS public.student_topic_mastery (
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.jamb_topics(id) ON DELETE RESTRICT,
  subtopic_id UUID NOT NULL REFERENCES public.jamb_subtopics(id) ON DELETE RESTRICT,
  subject_slug TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count BETWEEN 0 AND attempt_count),
  accuracy NUMERIC(6,5) NOT NULL DEFAULT 0 CHECK (accuracy BETWEEN 0 AND 1),
  mastery_score NUMERIC(6,5) NOT NULL DEFAULT 0.5 CHECK (mastery_score BETWEEN 0 AND 1),
  evidence_confidence NUMERIC(6,5) NOT NULL DEFAULT 0 CHECK (evidence_confidence BETWEEN 0 AND 1),
  mastery_state TEXT NOT NULL DEFAULT 'not_started'
    CHECK (mastery_state IN ('not_started', 'needs_support', 'developing', 'proficient', 'mastered')),
  last_attempted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(student_id, topic_id, subtopic_id),
  CHECK (subtopic_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS student_topic_mastery_student_state_idx
  ON public.student_topic_mastery(student_id, mastery_state, updated_at DESC);

ALTER TABLE public.learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_topic_mastery ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.learning_sessions, public.learning_attempts, public.student_topic_mastery
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.learning_sessions TO service_role;
GRANT SELECT, INSERT ON TABLE public.learning_attempts TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.student_topic_mastery TO service_role;

-- Create a session for the authenticated student. The API supplies the user ID
-- only after validating the Supabase access token; this RPC is service-role only.
CREATE OR REPLACE FUNCTION public.create_learning_session(
  p_student_id UUID,
  p_mode TEXT,
  p_subject_slug TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_id UUID;
BEGIN
  IF p_student_id IS NULL OR p_mode NOT IN ('diagnostic', 'smart', 'blitz', 'custom', 'cbt') THEN
    RAISE EXCEPTION 'Invalid learning session request' USING ERRCODE = '22023';
  END IF;
  IF p_subject_slug IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.jamb_subjects WHERE slug = p_subject_slug
  ) THEN
    RAISE EXCEPTION 'Unknown subject' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.learning_sessions(student_id, mode, subject_slug)
  VALUES (p_student_id, p_mode, p_subject_slug)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- The database loads the immutable question-version answer key and calculates
-- correctness. No client-provided correctness, answer key or mastery is accepted.
CREATE OR REPLACE FUNCTION public.record_learning_attempt(
  p_student_id UUID,
  p_event_id UUID,
  p_session_id UUID,
  p_question_id TEXT,
  p_submitted_option TEXT,
  p_response_time_ms INTEGER DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_session public.learning_sessions%ROWTYPE;
  v_question public.question_bank%ROWTYPE;
  v_version public.question_bank_versions%ROWTYPE;
  v_subject_slug TEXT;
  v_correct BOOLEAN;
  v_existing public.learning_attempts%ROWTYPE;
  v_attempt public.learning_attempts%ROWTYPE;
  v_count INTEGER;
  v_correct_count INTEGER;
  v_accuracy NUMERIC(6,5);
  v_mastery NUMERIC(6,5);
  v_confidence NUMERIC(6,5);
  v_state TEXT;
BEGIN
  IF p_student_id IS NULL OR p_event_id IS NULL OR p_session_id IS NULL
     OR p_question_id IS NULL OR lower(p_submitted_option) NOT IN ('a','b','c','d')
     OR (p_response_time_ms IS NOT NULL AND p_response_time_ms NOT BETWEEN 0 AND 3600000) THEN
    RAISE EXCEPTION 'Invalid learning attempt' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_session FROM public.learning_sessions
  WHERE id = p_session_id AND student_id = p_student_id FOR UPDATE;
  IF NOT FOUND OR v_session.status <> 'active' THEN
    RAISE EXCEPTION 'Active student session not found' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_question FROM public.question_bank WHERE id = p_question_id FOR SHARE;
  IF NOT FOUND OR v_question.status <> 'published' OR v_question.review_state <> 'approved'
     OR v_question.current_version IS NULL THEN
    RAISE EXCEPTION 'Question is not eligible for scored practice' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.question_provenance qp
    WHERE qp.question_id = v_question.id AND qp.provenance_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Question provenance is not verified' USING ERRCODE = '22023';
  END IF;

  SELECT t.subject_slug INTO v_subject_slug
  FROM public.jamb_topics t
  JOIN public.jamb_subtopics st ON st.topic_id = t.id
  WHERE t.id = v_question.topic_id AND st.id = v_question.subtopic_id
    AND t.is_active AND st.is_active
    AND t.verification_status = 'verified'
    AND st.verification_status = 'verified';
  IF v_subject_slug IS NULL THEN
    RAISE EXCEPTION 'Question taxonomy is not verified' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_version FROM public.question_bank_versions
  WHERE question_id = v_question.id AND version_number = v_question.current_version
    AND review_state = 'approved';
  IF NOT FOUND OR lower(COALESCE(v_version.payload->>'answer','')) NOT IN ('a','b','c','d') THEN
    RAISE EXCEPTION 'Approved immutable question version is unavailable' USING ERRCODE = '22023';
  END IF;

  v_correct := lower(p_submitted_option) = lower(v_version.payload->>'answer');

  SELECT * INTO v_existing FROM public.learning_attempts
  WHERE student_id = p_student_id AND event_id = p_event_id;
  IF FOUND THEN
    IF v_existing.session_id = p_session_id
       AND v_existing.question_id = p_question_id
       AND v_existing.question_version_id = v_version.id
       AND v_existing.submitted_option = lower(p_submitted_option)
       AND v_existing.response_time_ms IS NOT DISTINCT FROM p_response_time_ms THEN
      RETURN jsonb_build_object('status','duplicate','attempt_id',v_existing.id,'is_correct',v_existing.is_correct);
    END IF;
    RAISE EXCEPTION 'event_id already exists with different attempt content' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.learning_attempts(
    event_id, student_id, session_id, question_id, question_version_id,
    question_version_number, subject_slug, topic_id, subtopic_id,
    submitted_option, is_correct, response_time_ms
  ) VALUES (
    p_event_id, p_student_id, p_session_id, v_question.id, v_version.id,
    v_question.current_version, v_subject_slug, v_question.topic_id, v_question.subtopic_id,
    lower(p_submitted_option), v_correct, p_response_time_ms
  ) RETURNING * INTO v_attempt;

  SELECT COUNT(*)::INTEGER, COUNT(*) FILTER (WHERE is_correct)::INTEGER
    INTO v_count, v_correct_count
  FROM public.learning_attempts
  WHERE student_id = p_student_id AND topic_id = v_question.topic_id
    AND subtopic_id = v_question.subtopic_id;

  v_accuracy := CASE WHEN v_count = 0 THEN 0 ELSE v_correct_count::NUMERIC / v_count END;
  -- Beta(2,2) prior smooths sparse evidence; confidence increases with volume.
  v_mastery := (v_correct_count + 2)::NUMERIC / (v_count + 4);
  v_confidence := v_count::NUMERIC / (v_count + 5);
  v_state := CASE
    WHEN v_count = 0 THEN 'not_started'
    WHEN v_count < 5 THEN 'developing'
    WHEN v_mastery < 0.40 THEN 'needs_support'
    WHEN v_mastery < 0.65 THEN 'developing'
    WHEN v_mastery < 0.82 THEN 'proficient'
    ELSE 'mastered'
  END;

  INSERT INTO public.student_topic_mastery(
    student_id, topic_id, subtopic_id, subject_slug, attempt_count, correct_count,
    accuracy, mastery_score, evidence_confidence, mastery_state, last_attempted_at, updated_at
  ) VALUES (
    p_student_id, v_question.topic_id, v_question.subtopic_id, v_subject_slug,
    v_count, v_correct_count, v_accuracy, v_mastery, v_confidence, v_state,
    v_attempt.attempted_at, NOW()
  )
  ON CONFLICT(student_id, topic_id, subtopic_id) DO UPDATE SET
    subject_slug = EXCLUDED.subject_slug,
    attempt_count = EXCLUDED.attempt_count,
    correct_count = EXCLUDED.correct_count,
    accuracy = EXCLUDED.accuracy,
    mastery_score = EXCLUDED.mastery_score,
    evidence_confidence = EXCLUDED.evidence_confidence,
    mastery_state = EXCLUDED.mastery_state,
    last_attempted_at = EXCLUDED.last_attempted_at,
    updated_at = NOW();

  RETURN jsonb_build_object(
    'status','stored',
    'attempt_id',v_attempt.id,
    'is_correct',v_correct,
    'correct_answer',lower(v_version.payload->>'answer'),
    'explanation',COALESCE(v_version.payload->>'explanation',''),
    'question_version',v_question.current_version,
    'topic_id',v_question.topic_id,
    'subtopic_id',v_question.subtopic_id,
    'mastery_score',v_mastery,
    'evidence_confidence',v_confidence,
    'mastery_state',v_state
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_learning_session(
  p_student_id UUID,
  p_session_id UUID,
  p_status TEXT DEFAULT 'completed'
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_rows INTEGER;
BEGIN
  IF p_student_id IS NULL OR p_status NOT IN ('completed','abandoned') THEN
    RAISE EXCEPTION 'Invalid session completion request' USING ERRCODE = '22023';
  END IF;
  UPDATE public.learning_sessions
  SET status = p_status, completed_at = NOW()
  WHERE id = p_session_id AND student_id = p_student_id AND status = 'active';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.create_learning_session(UUID,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_learning_attempt(UUID,UUID,UUID,TEXT,TEXT,INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_learning_session(UUID,UUID,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_learning_session(UUID,TEXT,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_learning_attempt(UUID,UUID,UUID,TEXT,TEXT,INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_learning_session(UUID,UUID,TEXT) TO service_role;

COMMIT;

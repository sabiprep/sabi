-- SABI Phase 5: trusted JAMB exam-run foundation.
-- Creates immutable exam question sets from verified, approved question versions.
-- No production data is backfilled or modified.
BEGIN;

CREATE TABLE IF NOT EXISTS public.jamb_exam_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  learning_session_id UUID NOT NULL UNIQUE REFERENCES public.learning_sessions(id) ON DELETE RESTRICT,
  configuration_key TEXT NOT NULL REFERENCES public.exam_configurations(key) ON DELETE RESTRICT,
  subject_slugs TEXT[] NOT NULL CHECK (cardinality(subject_slugs) = 4),
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'submitted', 'expired', 'abandoned')),
  total_questions INTEGER NOT NULL CHECK (total_questions > 0),
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deadline_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (deadline_at > started_at),
  CHECK ((status = 'in_progress' AND submitted_at IS NULL)
      OR (status <> 'in_progress' AND submitted_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS jamb_exam_runs_student_started_idx
  ON public.jamb_exam_runs(student_id, started_at DESC);
CREATE INDEX IF NOT EXISTS jamb_exam_runs_student_status_idx
  ON public.jamb_exam_runs(student_id, status, started_at DESC);

CREATE TABLE IF NOT EXISTS public.jamb_exam_run_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_run_id UUID NOT NULL REFERENCES public.jamb_exam_runs(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL CHECK (question_number > 0),
  question_id TEXT NOT NULL REFERENCES public.question_bank(id) ON DELETE RESTRICT,
  question_version_id UUID NOT NULL REFERENCES public.question_bank_versions(id) ON DELETE RESTRICT,
  subject_slug TEXT NOT NULL REFERENCES public.jamb_subjects(slug) ON DELETE RESTRICT,
  topic_id UUID NOT NULL REFERENCES public.jamb_topics(id) ON DELETE RESTRICT,
  subtopic_id UUID NOT NULL REFERENCES public.jamb_subtopics(id) ON DELETE RESTRICT,
  learning_attempt_id UUID REFERENCES public.learning_attempts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(exam_run_id, question_number),
  UNIQUE(exam_run_id, question_id)
);

CREATE INDEX IF NOT EXISTS jamb_exam_run_items_run_order_idx
  ON public.jamb_exam_run_items(exam_run_id, question_number);
CREATE INDEX IF NOT EXISTS jamb_exam_run_items_subject_idx
  ON public.jamb_exam_run_items(exam_run_id, subject_slug);

ALTER TABLE public.jamb_exam_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jamb_exam_run_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.jamb_exam_runs, public.jamb_exam_run_items
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.jamb_exam_runs TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.jamb_exam_run_items TO service_role;

CREATE OR REPLACE FUNCTION public.create_jamb_exam_run(
  p_student_id UUID,
  p_configuration_key TEXT,
  p_subject_slugs TEXT[]
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $phase5$
DECLARE
  v_config public.exam_configurations%ROWTYPE;
  v_session_id UUID;
  v_run_id UUID;
  v_subject TEXT;
  v_subject_index INTEGER := 0;
  v_subject_count INTEGER;
  v_quota INTEGER;
  v_inserted INTEGER;
  v_total INTEGER := 0;
BEGIN
  IF p_student_id IS NULL OR p_configuration_key IS NULL
     OR p_subject_slugs IS NULL OR cardinality(p_subject_slugs) <> 4
     OR (SELECT count(DISTINCT s) FROM unnest(p_subject_slugs) AS s) <> 4 THEN
    RAISE EXCEPTION 'A student, valid configuration and four distinct subjects are required'
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_config
  FROM public.exam_configurations
  WHERE key = p_configuration_key AND is_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exam configuration is not active' USING ERRCODE = '22023';
  END IF;

  IF NOT (v_config.compulsory_subject_slug = ANY(p_subject_slugs)) THEN
    RAISE EXCEPTION 'The compulsory subject must be included' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_subject_slugs) AS selected(subject_slug)
    LEFT JOIN public.exam_configuration_subjects allowed
      ON allowed.configuration_key = p_configuration_key
     AND allowed.subject_slug = selected.subject_slug
     AND allowed.is_allowed
    WHERE allowed.subject_slug IS NULL
  ) THEN
    RAISE EXCEPTION 'One or more selected subjects are not allowed for this configuration'
      USING ERRCODE = '22023';
  END IF;

  v_subject_count := cardinality(p_subject_slugs);
  v_session_id := public.create_learning_session(p_student_id, 'cbt', NULL);

  INSERT INTO public.jamb_exam_runs (
    student_id, learning_session_id, configuration_key, subject_slugs,
    total_questions, duration_seconds, started_at, deadline_at
  ) VALUES (
    p_student_id, v_session_id, p_configuration_key, p_subject_slugs,
    v_config.question_count, v_config.duration_seconds, NOW(),
    NOW() + make_interval(secs => v_config.duration_seconds)
  ) RETURNING id INTO v_run_id;

  FOREACH v_subject IN ARRAY p_subject_slugs LOOP
    v_subject_index := v_subject_index + 1;
    v_quota := (v_config.question_count / v_subject_count)
      + CASE WHEN v_subject_index <= (v_config.question_count % v_subject_count) THEN 1 ELSE 0 END;

    WITH eligible AS (
      SELECT
        qb.id AS question_id,
        qv.id AS question_version_id,
        t.subject_slug,
        qb.topic_id,
        qb.subtopic_id,
        row_number() OVER (ORDER BY random()) AS selection_order
      FROM public.question_bank qb
      JOIN public.jamb_topics t ON t.id = qb.topic_id
      JOIN public.jamb_subtopics st ON st.id = qb.subtopic_id AND st.topic_id = t.id
      JOIN public.question_bank_versions qv
        ON qv.question_id = qb.id
       AND qv.version_number = qb.current_version
       AND qv.review_state = 'approved'
      WHERE t.subject_slug = v_subject
        AND qb.status = 'published'
        AND qb.review_state = 'approved'
        AND qb.current_version IS NOT NULL
        AND t.is_active AND st.is_active
        AND t.verification_status = 'verified'
        AND st.verification_status = 'verified'
        AND EXISTS (
          SELECT 1 FROM public.question_provenance qp
          WHERE qp.question_id = qb.id AND qp.provenance_status = 'verified'
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.jamb_exam_run_items existing
          WHERE existing.exam_run_id = v_run_id AND existing.question_id = qb.id
        )
    )
    INSERT INTO public.jamb_exam_run_items (
      exam_run_id, question_number, question_id, question_version_id,
      subject_slug, topic_id, subtopic_id
    )
    SELECT v_run_id,
      v_total + selection_order,
      question_id, question_version_id, subject_slug, topic_id, subtopic_id
    FROM eligible
    WHERE selection_order <= v_quota;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    IF v_inserted <> v_quota THEN
      RAISE EXCEPTION 'Not enough verified questions for subject %: required %, found %',
        v_subject, v_quota, v_inserted USING ERRCODE = '22023';
    END IF;
    v_total := v_total + v_inserted;
  END LOOP;

  IF v_total <> v_config.question_count THEN
    RAISE EXCEPTION 'Exam question allocation is incomplete' USING ERRCODE = '22023';
  END IF;

  RETURN v_run_id;
END;
$phase5$;

REVOKE ALL ON FUNCTION public.create_jamb_exam_run(UUID, TEXT, TEXT[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_jamb_exam_run(UUID, TEXT, TEXT[])
  TO service_role;

COMMIT;

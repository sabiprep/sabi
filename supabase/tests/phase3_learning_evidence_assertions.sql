-- Phase 3 structural/security assertions. Safe to run after migration on disposable PostgreSQL.
DO $$
DECLARE
  v_table TEXT;
  v_function REGPROCEDURE;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'learning_sessions','learning_attempts','student_topic_mastery'
  ] LOOP
    IF to_regclass('public.' || v_table) IS NULL THEN
      RAISE EXCEPTION 'Missing Phase 3 table: %', v_table;
    END IF;
    IF NOT (
      SELECT c.relrowsecurity
      FROM pg_class c
      WHERE c.oid = to_regclass('public.' || v_table)
    ) THEN
      RAISE EXCEPTION 'RLS is not enabled on %', v_table;
    END IF;
    IF has_table_privilege('anon', 'public.' || v_table, 'SELECT')
       OR has_table_privilege('authenticated', 'public.' || v_table, 'SELECT')
       OR has_table_privilege('anon', 'public.' || v_table, 'INSERT')
       OR has_table_privilege('authenticated', 'public.' || v_table, 'INSERT') THEN
      RAISE EXCEPTION 'Client role has direct access to %', v_table;
    END IF;
  END LOOP;

  IF NOT has_table_privilege('service_role', 'public.learning_attempts', 'INSERT')
     OR NOT has_table_privilege('service_role', 'public.student_topic_mastery', 'UPDATE') THEN
    RAISE EXCEPTION 'Service role is missing required learning-evidence privileges';
  END IF;

  FOREACH v_function IN ARRAY ARRAY[
    'public.create_learning_session(uuid,text,text)'::regprocedure,
    'public.record_learning_attempt(uuid,uuid,uuid,text,text,integer)'::regprocedure,
    'public.complete_learning_session(uuid,uuid,text)'::regprocedure
  ] LOOP
    IF has_function_privilege('public', v_function, 'EXECUTE')
       OR has_function_privilege('anon', v_function, 'EXECUTE')
       OR has_function_privilege('authenticated', v_function, 'EXECUTE') THEN
      RAISE EXCEPTION 'Client role can execute privileged function %', v_function;
    END IF;
    IF NOT has_function_privilege('service_role', v_function, 'EXECUTE') THEN
      RAISE EXCEPTION 'Service role cannot execute privileged function %', v_function;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='learning_attempts_student_topic_idx'
  ) THEN
    RAISE EXCEPTION 'Missing student/topic attempt index';
  END IF;
END
$$;


-- End-to-end learning evidence behavior. All fixtures are rolled back.
BEGIN;
DO $phase3_runtime$
DECLARE
  v_student UUID := '00000000-0000-4000-8000-000000000031';
  v_event UUID := '00000000-0000-4000-8000-000000000032';
  v_session UUID;
  v_topic UUID;
  v_subtopic UUID;
  v_question public.question_bank%ROWTYPE;
  v_version public.question_bank_versions%ROWTYPE;
  v_result JSONB;
  v_mastery public.student_topic_mastery%ROWTYPE;
  v_conflict BOOLEAN := FALSE;
  v_closed BOOLEAN := FALSE;
BEGIN
  INSERT INTO auth.users(id, email)
  VALUES (v_student, 'phase3-learning-test@example.com')
  ON CONFLICT (id) DO NOTHING;

  SELECT id INTO v_topic FROM public.jamb_topics
  WHERE subject_slug = 'biology' AND name = 'Adaptation' LIMIT 1;
  SELECT id INTO v_subtopic FROM public.jamb_subtopics
  WHERE topic_id = v_topic AND name = 'Adaptations in animals' LIMIT 1;
  IF v_topic IS NULL OR v_subtopic IS NULL THEN
    RAISE EXCEPTION 'Phase 3 fixture taxonomy was not found';
  END IF;

  UPDATE public.jamb_topics SET verification_status = 'verified', is_active = TRUE WHERE id = v_topic;
  UPDATE public.jamb_subtopics SET verification_status = 'verified', is_active = TRUE WHERE id = v_subtopic;

  INSERT INTO public.question_bank(
    id, subject, topic, subtopic, topic_id, subtopic_id, question,
    option_a, option_b, option_c, option_d, answer, explanation,
    difficulty, status, current_version, review_state
  ) VALUES (
    'PHASE3-TEST-001', 'Biology', 'Adaptation', 'Adaptations in animals',
    v_topic, v_subtopic, 'Which feature helps a camel survive in a desert?',
    'Long eyelashes', 'Webbed feet', 'Gills', 'Bright feathers',
    'a', 'Long eyelashes help protect the eyes from blowing sand.',
    'easy', 'published', 1, 'approved'
  );

  SELECT * INTO v_question FROM public.question_bank WHERE id = 'PHASE3-TEST-001';
  INSERT INTO public.question_bank_versions(
    question_id, version_number, payload, content_hash, legacy_status, review_state, change_reason
  ) VALUES (
    v_question.id, 1, to_jsonb(v_question), md5(to_jsonb(v_question)::text),
    'published', 'approved', 'phase3_runtime_fixture'
  ) RETURNING * INTO v_version;

  INSERT INTO public.question_provenance(
    question_id, source_label, source_type, provenance_status, evidence
  ) VALUES (
    v_question.id, 'Phase 3 disposable fixture', 'other', 'verified',
    '{"test_fixture":true}'::jsonb
  );

  v_session := public.create_learning_session(v_student, 'smart', 'biology');
  v_result := public.record_learning_attempt(
    v_student, v_event, v_session, v_question.id, 'a', 12000
  );
  IF v_result->>'status' <> 'stored'
     OR v_result->>'is_correct' <> 'true'
     OR v_result->>'correct_answer' <> 'a'
     OR v_result->>'explanation' IS NULL
     OR v_result->>'question_version' <> '1' THEN
    RAISE EXCEPTION 'Correct answer was not evaluated and stored from the approved immutable snapshot: %', v_result;
  END IF;

  -- Replaying the same event and payload is idempotent.
  v_result := public.record_learning_attempt(
    v_student, v_event, v_session, v_question.id, 'a', 12000
  );
  IF v_result->>'status' <> 'duplicate' OR v_result->>'is_correct' <> 'true' THEN
    RAISE EXCEPTION 'Identical event replay was not idempotent: %', v_result;
  END IF;

  -- Reusing an event ID with different answer content must conflict.
  BEGIN
    PERFORM public.record_learning_attempt(
      v_student, v_event, v_session, v_question.id, 'b', 12000
    );
  EXCEPTION WHEN unique_violation THEN
    v_conflict := TRUE;
  END;
  IF NOT v_conflict THEN
    RAISE EXCEPTION 'Conflicting event ID reuse was accepted';
  END IF;

  -- The second attempt is incorrect; mastery is derived from stored outcomes.
  v_result := public.record_learning_attempt(
    v_student, '00000000-0000-4000-8000-000000000033',
    v_session, v_question.id, 'b', 18000
  );
  IF v_result->>'is_correct' <> 'false' THEN
    RAISE EXCEPTION 'Incorrect answer was not calculated from the trusted answer key';
  END IF;

  SELECT * INTO v_mastery FROM public.student_topic_mastery
  WHERE student_id = v_student AND topic_id = v_topic AND subtopic_id = v_subtopic;
  IF v_mastery.attempt_count <> 2 OR v_mastery.correct_count <> 1
     OR v_mastery.accuracy <> 0.5 OR v_mastery.mastery_score <> 0.5
     OR v_mastery.mastery_state <> 'developing' THEN
    RAISE EXCEPTION 'Topic mastery was not correctly recalculated from attempts: %', row_to_json(v_mastery);
  END IF;

  IF NOT public.complete_learning_session(v_student, v_session, 'completed') THEN
    RAISE EXCEPTION 'Active learning session could not be completed';
  END IF;
  BEGIN
    PERFORM public.record_learning_attempt(
      v_student, '00000000-0000-4000-8000-000000000034',
      v_session, v_question.id, 'a', 1000
    );
  EXCEPTION WHEN insufficient_privilege THEN
    v_closed := TRUE;
  END;
  IF NOT v_closed THEN
    RAISE EXCEPTION 'Attempt was accepted after the session was completed';
  END IF;
END
$phase3_runtime$;
ROLLBACK;

BEGIN;
-- Phase 2 adaptive-learning schema and behaviour assertions.
DO $$
DECLARE
  v_user uuid := gen_random_uuid();
  v_session uuid;
  v_result jsonb;
  v_mastery public.student_topic_mastery%rowtype;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='student_topic_mastery' AND column_name='correct_streak'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='student_topic_mastery' AND column_name='interval_days'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='student_topic_mastery' AND column_name='ease_factor'
  ) THEN
    RAISE EXCEPTION 'Phase 2 spaced-repetition columns are missing';
  END IF;

  IF NOT has_function_privilege('service_role',
    'public.submit_learning_answer(uuid,text,text,integer,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Service role cannot submit learning answers';
  END IF;
  IF has_function_privilege('authenticated',
    'public.submit_learning_answer(uuid,text,text,integer,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Authenticated clients must not call the privileged answer function directly';
  END IF;

  INSERT INTO auth.users(id,email) VALUES(v_user,'phase2-ci-'||v_user::text||'@sabi.test');
  INSERT INTO public.question_bank(id,exam_type,subject,topic,question,answer,status)
  VALUES
    ('phase2-ci-q1','UTME','Use of English','CI spaced topic','CI question one?','a','published'),
    ('phase2-ci-q2','UTME','Use of English','CI spaced topic','CI question two?','a','published'),
    ('phase2-ci-q3','UTME','Use of English','CI spaced topic','CI question three?','a','published');

  INSERT INTO public.learning_sessions(user_id,mode,subject,total_questions)
  VALUES(v_user,'diagnostic','Use of English',3) RETURNING id INTO v_session;
  INSERT INTO public.learning_session_items(session_id,user_id,question_id,position)
  VALUES(v_session,v_user,'phase2-ci-q1',0),(v_session,v_user,'phase2-ci-q2',1),(v_session,v_user,'phase2-ci-q3',2);

  v_result := public.submit_learning_answer(v_session,'phase2-ci-q1','B',1000,v_user);
  IF (v_result->>'next_review_days')::integer <> 1 THEN RAISE EXCEPTION 'Incorrect answer must schedule a 1-day review'; END IF;
  v_result := public.submit_learning_answer(v_session,'phase2-ci-q2','A',1000,v_user);
  IF (v_result->>'next_review_days')::integer <> 1 THEN RAISE EXCEPTION 'First correct streak must schedule a 1-day review'; END IF;
  v_result := public.submit_learning_answer(v_session,'phase2-ci-q3','A',1000,v_user);
  IF (v_result->>'next_review_days')::integer <> 3 THEN RAISE EXCEPTION 'Second consecutive correct answer must schedule a 3-day review'; END IF;

  SELECT * INTO v_mastery FROM public.student_topic_mastery
  WHERE user_id=v_user AND subject='Use of English' AND topic='CI spaced topic';
  IF v_mastery.attempted_count <> 3 OR v_mastery.correct_count <> 2 OR v_mastery.mastery_score <> 57.14 THEN
    RAISE EXCEPTION 'Bayesian-smoothed mastery calculation is incorrect';
  END IF;
  IF v_mastery.correct_streak <> 2 OR v_mastery.interval_days <> 3 OR v_mastery.last_result <> 'correct' THEN
    RAISE EXCEPTION 'Spaced-repetition state was not persisted correctly';
  END IF;
END
$$;

ROLLBACK;

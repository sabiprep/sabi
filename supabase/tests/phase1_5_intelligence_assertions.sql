BEGIN;
DO $$
DECLARE
  v_user uuid := gen_random_uuid();
  v_session uuid;
  v_item uuid;
  v_question text := 'phase15-ci-q1';
  v_events integer;
  v_history integer;
  v_catalog_count integer;
BEGIN
  IF to_regclass('public.learning_events') IS NULL
    OR to_regclass('public.engine_runs') IS NULL
    OR to_regclass('public.recommendations') IS NULL
    OR to_regclass('public.student_topic_mastery_history') IS NULL
    OR to_regclass('public.question_sources') IS NULL
    OR to_regclass('public.jamb_syllabus_objectives') IS NULL THEN
    RAISE EXCEPTION 'One or more Phase 1.5 intelligence tables are missing';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.learning_events'::regclass) THEN
    RAISE EXCEPTION 'learning_events must have RLS enabled';
  END IF;
  IF has_table_privilege('authenticated','public.learning_events','INSERT') THEN
    RAISE EXCEPTION 'Authenticated clients must not write raw learning telemetry directly';
  END IF;
  IF NOT has_table_privilege('service_role','public.learning_events','INSERT') THEN
    RAISE EXCEPTION 'Service role must be able to ingest learning telemetry';
  END IF;
  IF has_table_privilege('authenticated','public.learning_events','UPDATE')
    OR has_table_privilege('authenticated','public.learning_events','DELETE') THEN
    RAISE EXCEPTION 'Learning telemetry must remain append-only for client roles';
  END IF;
  SELECT count(*) INTO v_catalog_count FROM public.jamb_subjects;
  IF v_catalog_count <> 25 THEN RAISE EXCEPTION 'Expected 25 JAMB subjects after catalogue seed; found %', v_catalog_count; END IF;
  SELECT count(*) INTO v_catalog_count FROM public.jamb_subject_availability WHERE exam_year=2026;
  IF v_catalog_count <> 25 THEN RAISE EXCEPTION 'Expected 25 2026 subject availability records; found %', v_catalog_count; END IF;
  IF (SELECT count(*) FROM public.engine_registry) < 10 THEN
    RAISE EXCEPTION 'Expected seeded engine registry entries';
  END IF;

  INSERT INTO auth.users(id,email) VALUES(v_user,'phase15-ci-'||v_user::text||'@sabi.test');
  INSERT INTO public.question_bank(id,subject,topic,question,answer,status)
  VALUES(v_question,'Biology','Phase 1.5 CI topic','Test question?','A','published');

  INSERT INTO public.learning_sessions(user_id,mode,subject,total_questions)
  VALUES(v_user,'smart_practice','Biology',1) RETURNING id INTO v_session;
  INSERT INTO public.learning_session_items(session_id,user_id,question_id,position,presented_at)
  VALUES(v_session,v_user,v_question,0,now()) RETURNING id INTO v_item;

  INSERT INTO public.learning_events(user_id,session_id,session_item_id,question_id,client_event_id,event_type,occurred_at)
  VALUES(v_user,v_session,v_item,v_question,'phase15-event-1','question_presented',now());
  INSERT INTO public.learning_events(user_id,session_id,session_item_id,question_id,client_event_id,event_type,occurred_at)
  VALUES(v_user,v_session,v_item,v_question,'phase15-event-2','answer_selected',now());

  SELECT count(*) INTO v_events FROM public.learning_events WHERE user_id=v_user;
  IF v_events <> 2 THEN RAISE EXCEPTION 'Learning event stream did not retain both events'; END IF;

  INSERT INTO public.student_topic_mastery(
    user_id,subject,topic,attempted_count,correct_count,mastery_score,
    correct_streak,ease_factor,interval_days,last_result,next_review_at
  ) VALUES(v_user,'Biology','Phase 1.5 CI topic',1,1,60,1,2.55,1,'correct',now()+interval '1 day');

  SELECT count(*) INTO v_history FROM public.student_topic_mastery_history
  WHERE user_id=v_user AND topic='Phase 1.5 CI topic';
  IF v_history <> 1 THEN RAISE EXCEPTION 'Mastery history trigger failed to snapshot insert'; END IF;

  UPDATE public.student_topic_mastery
  SET attempted_count=2,correct_count=1,mastery_score=50,updated_at=now()
  WHERE user_id=v_user AND subject='Biology' AND topic='Phase 1.5 CI topic';
  SELECT count(*) INTO v_history FROM public.student_topic_mastery_history
  WHERE user_id=v_user AND topic='Phase 1.5 CI topic';
  IF v_history <> 2 THEN RAISE EXCEPTION 'Mastery history trigger failed to snapshot update'; END IF;

  INSERT INTO public.engine_registry(engine_key,display_name,purpose,lifecycle_status,current_version)
  VALUES('ci_test_engine','CI Test Engine','Validates engine trace schema','active','test-1');
  INSERT INTO public.engine_runs(engine_key,engine_version,user_id,input_snapshot,output_snapshot,decision_summary)
  VALUES('ci_test_engine','test-1',v_user,'{"signal":"weak_topic"}','{"selected":"topic"}','CI engine trace');
  IF NOT EXISTS (SELECT 1 FROM public.engine_runs WHERE user_id=v_user AND engine_key='ci_test_engine') THEN
    RAISE EXCEPTION 'Engine run trace was not persisted';
  END IF;

  INSERT INTO public.recommendations(user_id,recommendation_type,target_type,target_id,rationale)
  VALUES(v_user,'topic_review','topic','phase-1-5-ci-topic','{"reason":"weak mastery"}');
  IF NOT EXISTS (SELECT 1 FROM public.recommendations WHERE user_id=v_user AND target_id='phase-1-5-ci-topic') THEN
    RAISE EXCEPTION 'Recommendation was not persisted';
  END IF;
END
$$;
ROLLBACK;

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
  IF NOT EXISTS (
    SELECT 1 FROM public.question_bank
    WHERE id='phase15-provenance-fixture' AND source_id IS NOT NULL AND content_fingerprint IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Legacy question provenance or content fingerprint backfill failed';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.question_sources
    WHERE source_key='legacy-source-' || md5('CI fixture source')
      AND permitted_use='unknown' AND verification_status='unverified'
  ) THEN
    RAISE EXCEPTION 'Legacy source must remain explicitly unverified';
  END IF;
  IF (SELECT count(*) FROM public.engine_registry) < 10 THEN
    RAISE EXCEPTION 'Expected seeded engine registry entries';
  END IF;
  IF (SELECT count(*) FROM sabi_simulation.personas) <> 25 THEN
    RAISE EXCEPTION 'Expected 25 isolated synthetic learner personas';
  END IF;
  IF has_table_privilege('authenticated','sabi_simulation.personas','SELECT') THEN
    RAISE EXCEPTION 'Synthetic personas must not be exposed to authenticated users';
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

  -- Onboarding must retain exact student answers and keep a versioned audit trail.
  IF to_regclass('public.student_onboarding_questions') IS NULL
    OR to_regclass('public.student_onboarding_responses') IS NULL
    OR to_regclass('public.student_progress_checkins') IS NULL
    OR to_regclass('public.student_data_processing_purposes') IS NULL THEN
    RAISE EXCEPTION 'Versioned onboarding and progress check-in tables are missing';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.student_onboarding_responses'::regclass)
    OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.student_progress_checkins'::regclass) THEN
    RAISE EXCEPTION 'Student onboarding and check-in tables must have RLS enabled';
  END IF;
  IF has_table_privilege('authenticated','public.student_onboarding_responses','INSERT')
    OR has_table_privilege('authenticated','public.student_onboarding_responses','UPDATE')
    OR has_table_privilege('authenticated','public.student_onboarding_responses','DELETE') THEN
    RAISE EXCEPTION 'Authenticated clients must not directly write or rewrite private onboarding answers';
  END IF;
  IF has_table_privilege('anon','public.student_onboarding_responses','SELECT') THEN
    RAISE EXCEPTION 'Anonymous users must not read onboarding answers';
  END IF;
  IF NOT has_table_privilege('authenticated','public.student_onboarding_responses','SELECT') THEN
    RAISE EXCEPTION 'Students must be able to read their own onboarding answers through RLS';
  END IF;

  INSERT INTO public.student_data_processing_purposes(purpose_key,description,consent_type)
  VALUES('ci_personalization','CI-only onboarding purpose','personalization');
  INSERT INTO public.student_onboarding_question_sets(set_key,display_name)
  VALUES('ci-onboarding','CI onboarding');
  INSERT INTO public.student_onboarding_question_versions(question_set_id,version_label,status)
  SELECT id,'v1','published' FROM public.student_onboarding_question_sets WHERE set_key='ci-onboarding';
  INSERT INTO public.student_onboarding_questions(question_version_id,question_key,prompt,answer_type,processing_purpose,sensitivity_level)
  SELECT id,'motivation','What motivates you to prepare for this exam?','long_text','ci_personalization','personal'
  FROM public.student_onboarding_question_versions v
  JOIN public.student_onboarding_question_sets s ON s.id=v.question_set_id
  WHERE s.set_key='ci-onboarding' AND v.version_label='v1';
  INSERT INTO public.student_onboarding_submissions(user_id,question_version_id,purpose_consent_snapshot)
  SELECT v_user,v.id,'{"personalization":true}'
  FROM public.student_onboarding_question_versions v
  JOIN public.student_onboarding_question_sets s ON s.id=v.question_set_id
  WHERE s.set_key='ci-onboarding' AND v.version_label='v1';
  INSERT INTO public.student_onboarding_responses(submission_id,question_id,question_key,answer_value,answer_text)
  SELECT sub.id,q.id,q.question_key,
    '"I want to become an engineer and make my family proud"'::jsonb,
    'I want to become an engineer and make my family proud'
  FROM public.student_onboarding_submissions sub
  JOIN public.student_onboarding_question_versions v ON v.id=sub.question_version_id
  JOIN public.student_onboarding_question_sets s ON s.id=v.question_set_id
  JOIN public.student_onboarding_questions q ON q.question_version_id=v.id
  WHERE sub.user_id=v_user AND s.set_key='ci-onboarding';
  IF NOT EXISTS (
    SELECT 1 FROM public.student_onboarding_responses
    WHERE answer_text='I want to become an engineer and make my family proud'
      AND answer_value='"I want to become an engineer and make my family proud"'::jsonb
  ) THEN RAISE EXCEPTION 'Exact free-text motivation answer was not preserved'; END IF;

  INSERT INTO public.student_progress_checkins(user_id,confidence_score,motivation_score,perceived_barriers,reflection_text)
  VALUES(v_user,3,5,array['limited_study_time'],'I need a more consistent schedule');
  IF NOT EXISTS (SELECT 1 FROM public.student_progress_checkins WHERE user_id=v_user AND motivation_score=5) THEN
    RAISE EXCEPTION 'Longitudinal motivation check-in was not persisted';
  END IF;

  BEGIN
    UPDATE public.student_onboarding_responses SET answer_text='rewritten' WHERE answer_text='I want to become an engineer and make my family proud';
    RAISE EXCEPTION 'Expected onboarding response immutability trigger to reject updates';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'Expected onboarding response immutability trigger to reject updates' THEN RAISE; END IF;
  END;

END
$$;
ROLLBACK;

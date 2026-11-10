BEGIN;

DO $$
DECLARE
  v_user uuid := gen_random_uuid();
  v_source uuid;
  v_session uuid;
  v_cbt_session uuid;
  v_result jsonb;
  v_pending jsonb;
  v_total integer;
  v_status text;
  v_marked boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='learning_session_items'
      AND column_name='marked_for_review' AND is_nullable='NO'
  ) THEN
    RAISE EXCEPTION 'CBT review flag column is missing or nullable';
  END IF;

  IF NOT has_function_privilege('service_role',
    'public.append_learning_session_item(uuid,uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Service role cannot append an adaptive question';
  END IF;
  IF has_function_privilege('authenticated',
    'public.append_learning_session_item(uuid,uuid,text)', 'EXECUTE')
    OR has_function_privilege('anon',
    'public.append_learning_session_item(uuid,uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Adaptive append RPC must not be directly executable by client roles';
  END IF;

  INSERT INTO auth.users(id,email)
  VALUES(v_user,'learning-continuation-ci-'||v_user::text||'@sabi.test');

  INSERT INTO public.question_sources(
    source_key,source_name,source_type,permitted_use,verification_status,checked_at
  ) VALUES (
    'learning-continuation-ci-'||v_user::text,
    'SABI automated continuation fixture',
    'teacher_authored','practice_display','verified',now()
  ) RETURNING id INTO v_source;

  INSERT INTO public.question_bank(
    id,exam_type,subject,topic,question,answer,status,review_status,source_id
  ) VALUES
    ('learning-continuation-q1-'||v_user::text,'UTME','Use of English','Continuation CI','Question one?','A','published','approved',v_source),
    ('learning-continuation-q2-'||v_user::text,'UTME','Use of English','Continuation CI','Question two?','B','published','approved',v_source),
    ('learning-continuation-q3-'||v_user::text,'UTME','Use of English','CBT review CI','Question three?','C','published','approved',v_source);

  INSERT INTO public.learning_sessions(user_id,mode,subject,total_questions)
  VALUES(v_user,'smart_practice','Use of English',1) RETURNING id INTO v_session;

  INSERT INTO public.learning_session_items(session_id,user_id,question_id,position)
  VALUES(v_session,v_user,'learning-continuation-q1-'||v_user::text,0);

  v_result := public.submit_learning_answer(
    v_session,'learning-continuation-q1-'||v_user::text,'A',1000,v_user
  );

  SELECT status,total_questions INTO v_status,v_total
  FROM public.learning_sessions WHERE id=v_session;

  IF v_status <> 'in_progress' OR v_result->>'session_completed' <> 'false' THEN
    RAISE EXCEPTION 'Smart Practice must remain active after its current batch is answered';
  END IF;

  v_result := public.append_learning_session_item(
    v_session,v_user,'learning-continuation-q2-'||v_user::text
  );

  IF v_result->>'appended' <> 'true' OR (v_result->>'position')::integer <> 1 THEN
    RAISE EXCEPTION 'The adaptive continuation RPC did not append the next question';
  END IF;

  SELECT total_questions INTO v_total FROM public.learning_sessions WHERE id=v_session;
  IF v_total <> 2 THEN RAISE EXCEPTION 'Appending a question did not increase the session total atomically'; END IF;

  v_pending := public.append_learning_session_item(
    v_session,v_user,'learning-continuation-q2-'||v_user::text
  );
  IF v_pending->>'appended' <> 'false'
    OR v_pending->>'question_id' <> 'learning-continuation-q2-'||v_user::text THEN
    RAISE EXCEPTION 'A retry should return the existing pending question without duplicating it';
  END IF;

  INSERT INTO public.learning_sessions(user_id,mode,subject,total_questions)
  VALUES(v_user,'cbt','Use of English',1) RETURNING id INTO v_cbt_session;

  INSERT INTO public.learning_session_items(session_id,user_id,question_id,position)
  VALUES(v_cbt_session,v_user,'learning-continuation-q3-'||v_user::text,0);

  UPDATE public.learning_session_items
  SET marked_for_review=true
  WHERE session_id=v_cbt_session AND user_id=v_user
    AND question_id='learning-continuation-q3-'||v_user::text
  RETURNING marked_for_review INTO v_marked;

  IF v_marked IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'CBT review flag was not persisted';
  END IF;
END
$$;

ROLLBACK;

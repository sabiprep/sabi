-- End-to-end learner workflow contract. Runs only in disposable CI PostgreSQL.
-- Covers account/onboarding persistence, all learner session modes, authoritative
-- answer capture, elapsed time, mastery/review scheduling, streaks and notification jobs.
begin;

do $$
declare
  v_user uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_mode text;
  v_session uuid;
  v_q text;
  v_result jsonb;
  v_mastery public.student_topic_mastery%rowtype;
  v_streak record;
  v_job uuid;
  v_claimed integer;
  v_count integer;
  v_modes text[] := array['diagnostic','smart_practice','blitz','custom','cbt'];
  v_idx integer := 0;
begin
  insert into auth.users(id,email) values
    (v_user,'learner-e2e-'||v_user::text||'@sabi.test'),
    (v_other,'learner-e2e-other-'||v_other::text||'@sabi.test');

  -- Registration creates a durable auth identity; onboarding is repeat-safe
  -- and persists normalized profile, subject selections, goals and preferences.
  perform public.save_student_onboarding_profile(
    v_user,2026,array['English Language','Mathematics','Physics','Chemistry'],320,
    '{"currentClass":"SS3 Candidate","attempts":"0 Previous UTME Sittings","dailyStudyHours":"1 – 2 Hours Daily","explanationPreference":"Detailed Step-by-Step Derivation","targetCourse":"Engineering","targetUniversity":"University of Uyo"}'::jsonb
  );
  perform public.save_student_onboarding_profile(
    v_user,2026,array['English Language','Mathematics','Physics','Chemistry'],320,
    '{"currentClass":"SS3 Candidate","attempts":"0 Previous UTME Sittings","dailyStudyHours":"1 – 2 Hours Daily","explanationPreference":"Detailed Step-by-Step Derivation","targetCourse":"Engineering","targetUniversity":"University of Uyo"}'::jsonb
  );
  if (select count(*) from public.student_subject_selections where user_id=v_user and exam_year=2026) <> 4 then
    raise exception 'Onboarding did not persist the four selected UTME subjects';
  end if;
  if (select count(*) from public.student_goals where user_id=v_user and exam_year=2026 and status='active') <> 1 then
    raise exception 'Onboarding retry created duplicate active goals';
  end if;
  if not exists(select 1 from public.student_academic_profiles where user_id=v_user) then
    raise exception 'Onboarding did not persist the academic profile';
  end if;

  -- Exercise diagnostic, SmartPractice, Blitz, custom simulator and CBT
  -- through the same authoritative database answer RPC used by the API.
  foreach v_mode in array v_modes loop
    v_idx := v_idx + 1;
    v_q := 'learner-e2e-q-'||v_idx::text;
    insert into public.question_bank
      (id,exam_type,subject,topic,question,option_a,option_b,option_c,option_d,answer,explanation,status)
    values
      (v_q,'UTME','Mathematics','Learner E2E topic','What is 2 + 2?','4','3','5','6','A',
       'Two plus two equals four.','published');

    insert into public.learning_sessions(user_id,mode,subject,total_questions,metadata)
    values(
      v_user,v_mode,'Mathematics',1,
      case when v_mode='cbt' then
        jsonb_build_object('examConfiguration',jsonb_build_object('expiresAt',(now()+interval '2 hours')::text))
      else '{}'::jsonb end
    ) returning id into v_session;

    insert into public.learning_session_items(session_id,user_id,question_id,position,presented_at)
    values(v_session,v_user,v_q,0,now());

    v_result := public.submit_learning_answer(v_session,v_q,'A',1234,v_user);
    if (v_result->>'correct')::boolean is not true then
      raise exception 'Correct answer was not scored correctly in % session',v_mode;
    end if;
    if (v_result->>'session_completed')::boolean is not true then
      raise exception '% session did not complete after its final answer',v_mode;
    end if;
    if (v_result->>'answered_count')::integer <> 1 then
      raise exception '% session answer count is incorrect',v_mode;
    end if;
    if (select elapsed_ms from public.learning_session_items where session_id=v_session and question_id=v_q) <> 1234 then
      raise exception 'Response time was not persisted for %',v_mode;
    end if;

    -- Replaying a submitted item must be rejected, not double-counted.
    begin
      perform public.submit_learning_answer(v_session,v_q,'A',1234,v_user);
      raise exception 'Duplicate answer replay was accepted for %',v_mode;
    exception when no_data_found then null;
      when raise_exception then
        if sqlerrm like 'Duplicate answer replay was accepted%' then raise; end if;
    end;
  end loop;

  select * into v_mastery from public.student_topic_mastery
  where user_id=v_user and subject='Mathematics' and topic='Learner E2E topic';
  if v_mastery.attempted_count <> 5 or v_mastery.correct_count <> 5 then
    raise exception 'Mastery did not reconcile with the five authoritative answers';
  end if;
  if v_mastery.mastery_score not between 0 and 100 or v_mastery.next_review_at is null then
    raise exception 'Mastery score or spaced-repetition review schedule is invalid';
  end if;

  -- A learner cannot submit an answer to another learner's session.
  select id into v_session from public.learning_sessions where user_id=v_user order by created_at limit 1;
  begin
    perform public.submit_learning_answer(v_session,'learner-e2e-q-1','A',1000,v_other);
    raise exception 'Cross-user answer submission was accepted';
  exception when no_data_found then null;
    when raise_exception then
      if sqlerrm='Cross-user answer submission was accepted' then raise; end if;
  end;

  select * into v_streak from public.record_student_study_activity(v_user,'Africa/Lagos');
  if v_streak.current_streak < 1 or v_streak.timezone <> 'Africa/Lagos' then
    raise exception 'Study streak was not recorded in the learner timezone';
  end if;
  perform public.record_student_study_activity(v_user,'Africa/Lagos');
  if (select current_streak from public.student_streak_state where user_id=v_user) <> v_streak.current_streak then
    raise exception 'Same-day streak retry was not idempotent';
  end if;

  -- In-app completion notification enters the durable queue and can be claimed
  -- by the worker; no external email/SMS/push provider is invoked in CI.
  insert into public.notification_queue(user_id,channel,template_key,payload,idempotency_key)
  values(v_user,'in_app','learning_session_completed',
    '{"title":"Practice session completed","body":"Your results are ready."}'::jsonb,
    'learner-e2e-notification-'||v_user::text)
  returning id into v_job;
  select count(*) into v_claimed from public.claim_notification_jobs(10,array['in_app'])
  where id=v_job and status='processing';
  if v_claimed <> 1 then raise exception 'Notification worker did not claim the in-app notification'; end if;
  if not public.finalize_notification_job(v_job,true,null) then
    raise exception 'Notification worker could not finalize the in-app notification';
  end if;
  if (select status from public.notification_queue where id=v_job) <> 'sent' then
    raise exception 'Notification job did not reach sent state';
  end if;

  -- Learner-facing rows must be protected by owner-scoped RLS.
  if not (select relrowsecurity from pg_class where oid='public.learning_sessions'::regclass)
     or not (select relrowsecurity from pg_class where oid='public.learning_session_items'::regclass)
     or not (select relrowsecurity from pg_class where oid='public.student_topic_mastery'::regclass)
     or not (select relrowsecurity from pg_class where oid='public.in_app_notifications'::regclass) then
    raise exception 'Learner workflow tables must all have RLS enabled';
  end if;

  delete from auth.users where id in (v_user,v_other);
  if exists(select 1 from public.learning_sessions where user_id=v_user)
     or exists(select 1 from public.student_topic_mastery where user_id=v_user)
     or exists(select 1 from public.student_streak_state where user_id=v_user)
     or exists(select 1 from public.notification_queue where id=v_job) then
    raise exception 'Learner deletion did not cascade through workflow-owned records';
  end if;
end
$$;

rollback;

-- Phase 1.6 universal signal layer assertions. Run inside disposable PostgreSQL only.
begin;

do $$
declare
  v_user uuid := gen_random_uuid();
  v_observation uuid;
  v_count integer;
  v_current jsonb;
  v_run uuid;
  v_session uuid;
  v_item uuid;
  v_checkin_user uuid := gen_random_uuid();
  v_checkin_id uuid;
  v_checkin_retry_id uuid;
begin
  if (select count(*) from public.signal_definitions where lifecycle_status='active') < 12 then
    raise exception 'Expected the starter canonical signal catalogue';
  end if;
  if (select count(*) from public.engine_contract_versions where contract_status='active') < 9 then
    raise exception 'Expected active versioned contracts for current and planned engines';
  end if;
  if (select count(*) from public.signal_engine_subscriptions where is_enabled) < 25 then
    raise exception 'Expected declarative signal-to-engine subscriptions';
  end if;

  if not (select relrowsecurity from pg_class where oid='public.student_signal_observations'::regclass)
    or not (select relrowsecurity from pg_class where oid='public.student_signal_current'::regclass)
    or not (select relrowsecurity from pg_class where oid='public.signal_definitions'::regclass) then
    raise exception 'Signal tables must have RLS enabled';
  end if;
  if has_table_privilege('authenticated','public.student_signal_observations','INSERT')
    or has_table_privilege('authenticated','public.student_signal_observations','UPDATE')
    or has_table_privilege('authenticated','public.student_signal_observations','DELETE') then
    raise exception 'Authenticated users must not write or rewrite signal evidence directly';
  end if;
  if has_table_privilege('anon','public.student_signal_current','SELECT') then
    raise exception 'Anonymous users must not read learner signal projections';
  end if;
  if not has_table_privilege('authenticated','public.student_signal_current','SELECT') then
    raise exception 'Authenticated learners must be able to read their own projected signals under RLS';
  end if;

  insert into auth.users(id,email)
  values(v_user,'phase16-ci-'||v_user::text||'@sabi.test');

  insert into auth.users(id,email)
  values(v_checkin_user,'phase16-checkin-'||v_checkin_user::text||'@sabi.test');

  perform public.save_student_onboarding_profile(
    v_user,2026,array['English Language','Mathematics','Physics','Chemistry'],320,
    '{"currentClass":"SS3 Candidate","attempts":"1 Previous UTME Sitting","dailyStudyHours":"1 – 2 Hours Daily","explanationPreference":"Detailed Step-by-Step Derivation","targetCourse":"Electrical and Electronics Engineering","targetUniversity":"University of Uyo"}'::jsonb
  );
  perform public.save_student_onboarding_profile(
    v_user,2026,array['English Language','Mathematics','Physics','Chemistry'],320,
    '{"currentClass":"SS3 Candidate","attempts":"1 Previous UTME Sitting","dailyStudyHours":"1 – 2 Hours Daily","explanationPreference":"Detailed Step-by-Step Derivation","targetCourse":"Electrical and Electronics Engineering","targetUniversity":"University of Uyo"}'::jsonb
  );
  if not exists (
    select 1 from public.student_academic_profiles
    where user_id=v_user and education_level='senior_secondary' and previous_utme_attempts=1
  ) then raise exception 'Normalized academic profile was not populated'; end if;
  if (select count(*) from public.student_subject_selections where user_id=v_user and exam_year=2026) <> 4 then
    raise exception 'Normalized subject selections were not populated'; end if;
  if (select count(*) from public.student_goals where user_id=v_user and exam_year=2026 and status='active') <> 1 then
    raise exception 'Onboarding retry created duplicate active goals'; end if;
  if not exists (
    select 1 from public.student_learning_preferences
    where user_id=v_user and daily_goal_minutes=90 and explanation_style='detailed'
  ) then raise exception 'Normalized learning preferences were not populated'; end if;

  v_checkin_id := public.record_student_progress_checkin(
    v_checkin_user,'phase16-checkin-key-0001',4,3,array['limited_time'],
    'I need a more consistent routine'
  );
  v_checkin_retry_id := public.record_student_progress_checkin(
    v_checkin_user,'phase16-checkin-key-0001',4,3,array['limited_time'],
    'I need a more consistent routine'
  );
  if v_checkin_id is distinct from v_checkin_retry_id then
    raise exception 'Check-in retry did not return the original submission';
  end if;
  if (select count(*) from public.student_progress_checkins
      where user_id=v_checkin_user and submission_key='phase16-checkin-key-0001') <> 1 then
    raise exception 'Idempotent check-in created duplicate records';
  end if;
  if not exists (
    select 1 from public.student_signal_current
    where user_id=v_checkin_user and signal_key='student.confidence' and value='4'::jsonb
  ) or not exists (
    select 1 from public.student_signal_current
    where user_id=v_checkin_user and signal_key='student.motivation_score' and value='3'::jsonb
  ) then
    raise exception 'Check-in values were not atomically materialized as learner signals';
  end if;
  begin
    perform public.record_student_progress_checkin(
      v_checkin_user,'phase16-checkin-key-0001',2,3,array['limited_time'],
      'I need a more consistent routine'
    );
    raise exception 'Expected check-in idempotency mismatch to be rejected';
  exception when raise_exception then
    if SQLERRM = 'Expected check-in idempotency mismatch to be rejected' then raise; end if;
  end;

  insert into public.learning_sessions(user_id,mode,subject,total_questions)
  values(v_user,'smart_practice','Biology',1) returning id into v_session;
  insert into public.learning_session_items(session_id,user_id,question_id,position,presented_at)
  values(v_session,v_user,'phase15-provenance-fixture',0,now()) returning id into v_item;
  insert into public.learning_events(
    user_id,session_id,session_item_id,question_id,client_event_id,event_type,occurred_at
  ) values (
    v_user,v_session,v_item,'phase15-provenance-fixture',
    'phase16-event-'||v_user::text,'question_presented',now()
  );
  if not exists (
    select 1 from public.signal_processing_outbox
    where event_kind='learning_event_received'
      and payload->>'event_type'='question_presented'
      and idempotency_key like 'learning-event:%'
  ) then raise exception 'Learning event was not atomically handed to the signal processing outbox'; end if;

  insert into public.student_signal_observations(
    user_id,signal_key,schema_version,source_key,value,confidence,purpose_key,
    provenance,observed_at,idempotency_key
  ) values (
    v_user,'student.confidence',1,'progress-checkin','4'::jsonb,0.9,
    'personalized_learning','{"method":"student_self_report","test":true}'::jsonb,
    now(),'phase16-confidence-'||v_user::text
  ) returning id into v_observation;

  select value into v_current from public.student_signal_current
  where user_id=v_user and signal_key='student.confidence';
  if v_current is distinct from '4'::jsonb then
    raise exception 'Signal observation was not materialized into current state';
  end if;

  select count(*) into v_count from public.student_signal_history
  where user_id=v_user and signal_key='student.confidence';
  if v_count <> 1 then raise exception 'Signal history did not capture the first observation'; end if;

  select count(*) into v_count from public.signal_processing_outbox
  where idempotency_key='signal-observed:'||v_observation::text;
  if v_count <> 1 then raise exception 'Signal observation did not enqueue exactly one outbox item'; end if;

  v_count := public.dispatch_signal_observation_to_engines(v_observation);
  if v_count < 2 then
    raise exception 'Signal dispatcher did not create engine requests for active registered subscriptions';
  end if;
  if public.dispatch_signal_observation_to_engines(v_observation) <> 0 then
    raise exception 'Signal dispatch was not idempotent';
  end if;
  select count(*) into v_count from public.signal_processing_outbox
  where event_kind='engine_requested' and observation_id=v_observation;
  if v_count < 2 then raise exception 'Expected active engine-request outbox records'; end if;

  select count(*) into v_count from public.claim_signal_outbox(50)
  where observation_id=v_observation;
  if v_count <> 1 then raise exception 'Outbox claim did not atomically claim the signal observation'; end if;
  if not exists (
    select 1 from public.signal_processing_outbox
    where idempotency_key='signal-observed:'||v_observation::text
      and processing_status='processing' and attempt_count=1
  ) then raise exception 'Claimed outbox row did not enter processing state'; end if;

  -- Same idempotency key must not create duplicate evidence or queue work.
  insert into public.student_signal_observations(
    user_id,signal_key,schema_version,source_key,value,purpose_key,observed_at,idempotency_key
  ) values (
    v_user,'student.confidence',1,'progress-checkin','5'::jsonb,
    'personalized_learning',now(),'phase16-confidence-'||v_user::text
  ) on conflict (user_id,idempotency_key) do nothing;

  select count(*) into v_count from public.student_signal_history
  where user_id=v_user and signal_key='student.confidence';
  if v_count <> 1 then raise exception 'Idempotent observation retry created duplicate history'; end if;

  -- A stale observation is retained in history but cannot overwrite current state.
  insert into public.student_signal_observations(
    user_id,signal_key,schema_version,source_key,value,purpose_key,observed_at,idempotency_key
  ) values (
    v_user,'student.confidence',1,'progress-checkin','2'::jsonb,
    'personalized_learning',now()-interval '2 days','phase16-confidence-stale-'||v_user::text
  );
  select value into v_current from public.student_signal_current
  where user_id=v_user and signal_key='student.confidence';
  if v_current is distinct from '4'::jsonb then
    raise exception 'Stale signal observation incorrectly replaced current state';
  end if;

  -- Versioned contracts cannot be silently edited in place.
  begin
    update public.signal_schema_versions set changelog='mutated'
    where signal_key='student.confidence' and schema_version=1;
    raise exception 'Expected signal schema immutability trigger to reject update';
  exception when raise_exception then
    if SQLERRM = 'Expected signal schema immutability trigger to reject update' then raise; end if;
  end;

  insert into public.engine_runs(engine_key,engine_version,user_id,input_snapshot,output_snapshot,decision_summary)
  values('recommendation-engine','phase-2',v_user,'{}','{}','Phase 1.6 signal trace fixture')
  returning id into v_run;

  insert into public.engine_run_signal_inputs(
    engine_run_id,signal_key,schema_version,signal_observation_id,input_requirement,
    was_present,value_snapshot,missing_reason
  ) values (
    v_run,'student.confidence',1,v_observation,'optional',true,'4'::jsonb,null
  );
  insert into public.engine_run_signal_inputs(
    engine_run_id,signal_key,schema_version,input_requirement,
    was_present,value_snapshot,missing_reason
  ) values (
    v_run,'student.motivation',1,'optional',false,null,'not_provided'
  );

  select count(*) into v_count from public.engine_run_signal_inputs where engine_run_id=v_run;
  if v_count <> 2 then raise exception 'Engine input trace did not preserve present and missing optional signals'; end if;

  -- Deleting an account must erase its signal evidence and projections.
  delete from auth.users where id=v_user;
  delete from auth.users where id=v_checkin_user;
  select count(*) into v_count from public.student_signal_observations where user_id=v_user;
  if v_count <> 0 then raise exception 'Account deletion left signal observations behind'; end if;
  select count(*) into v_count from public.student_signal_history where user_id=v_user;
  if v_count <> 0 then raise exception 'Account deletion left signal history behind'; end if;
  select count(*) into v_count from public.student_signal_current where user_id=v_user;
  if v_count <> 0 then raise exception 'Account deletion left current signal projections behind'; end if;

  begin
    update public.student_signal_history set value='5'::jsonb
    where user_id=v_user and signal_key='student.confidence';
    raise exception 'Expected signal history immutability trigger to reject update';
  exception when raise_exception then
    if SQLERRM = 'Expected signal history immutability trigger to reject update' then raise; end if;
  end;
end
$$;

rollback;

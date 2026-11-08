-- Phase 1.6 universal signal layer assertions. Run inside disposable PostgreSQL only.
begin;

do $$
declare
  v_user uuid := gen_random_uuid();
  v_observation uuid;
  v_count integer;
  v_current jsonb;
  v_run uuid;
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

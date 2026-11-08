-- Rollback-only end-to-end verification of the answer RPC and attempt capture.
begin;

do $$
declare
  v_user_id uuid;
  v_question_id text;
  v_correct_option text;
  v_wrong_option text;
  v_session_id uuid;
  v_second_session_id uuid;
  v_final_session_id uuid;
  v_item_id uuid;
  v_second_item_id uuid;
  v_final_item_id uuid;
  v_attempt_count integer;
  v_first_attempt_number integer;
  v_second_attempt_number integer;
  v_final_attempt_number integer;
  v_function text;
  v_result jsonb;
  v_session_status text;
  v_answered_count integer;
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (gen_random_uuid(), 'attempt-capture-ci-fixture@local.invalid', '{}'::jsonb)
  returning id into v_user_id;

  select id, upper(trim(answer))
    into v_question_id, v_correct_option
  from public.question_bank
  where answer is not null
    and lower(trim(answer)) in ('a', 'b', 'c', 'd')
  order by id
  limit 1;

  if v_question_id is null or v_correct_option is null then
    raise exception 'Assertion failed: a question with a valid stored answer key is required';
  end if;

  update public.question_bank set status = 'published' where id = v_question_id;

  v_wrong_option := case when v_correct_option = 'A' then 'B' else 'A' end;

  select pg_get_functiondef('public.capture_question_attempt_from_session_item()'::regprocedure)
    into v_function;
  if position('pg_advisory_xact_lock' in v_function) = 0 then
    raise exception 'Assertion failed: attempt capture must serialize learner/question attempts';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'question_attempts_session_item_uidx'
      and indexdef ilike '%unique%'
  ) then
    raise exception 'Assertion failed: session item attempt idempotency index is missing';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'question_attempts_user_question_attempt_number_uidx'
      and indexdef ilike '%unique%'
  ) then
    raise exception 'Assertion failed: learner/question attempt sequence index is missing';
  end if;

  -- First real learner submission: RPC grading, session counters, mastery and
  -- the after-answer trigger must all complete in the same transaction.
  insert into public.learning_sessions (user_id, mode, subject, status, total_questions)
  values (v_user_id, 'smart_practice', 'Answer RPC Test', 'in_progress', 2)
  returning id into v_session_id;

  insert into public.learning_session_items (session_id, user_id, question_id, position)
  values (v_session_id, v_user_id, v_question_id, 0)
  returning id into v_item_id;

  v_result := public.submit_learning_answer(v_session_id, v_question_id, v_correct_option, 1250, v_user_id);

  if coalesce((v_result->>'correct')::boolean, false) is not true then
    raise exception 'Assertion failed: RPC must grade the stored correct option as correct';
  end if;
  if v_result->>'correct_option' <> v_correct_option then
    raise exception 'Assertion failed: RPC must return the stored answer key';
  end if;

  select status, answered_count into v_session_status, v_answered_count
  from public.learning_sessions where id = v_session_id;
  if v_session_status <> 'in_progress' or v_answered_count <> 1 then
    raise exception 'Assertion failed: first answer must update the session count without completing a two-question session';
  end if;

  select count(*), max(attempt_number)
    into v_attempt_count, v_first_attempt_number
  from public.question_attempts
  where session_item_id = v_item_id;
  if v_attempt_count <> 1 or v_first_attempt_number <> 1 then
    raise exception 'Assertion failed: first RPC answer must create exactly one attempt numbered 1';
  end if;

  -- A duplicate RPC call must fail without changing the stored answer or
  -- creating a second attempt. The HTTP route recovers this committed row.
  begin
    perform public.submit_learning_answer(v_session_id, v_question_id, v_correct_option, 1250, v_user_id);
    raise exception 'Assertion failed: duplicate answer RPC unexpectedly succeeded';
  exception
    when sqlstate 'P0002' then
      null;
  end;

  select count(*) into v_attempt_count
  from public.question_attempts
  where session_item_id = v_item_id;
  if v_attempt_count <> 1 then
    raise exception 'Assertion failed: duplicate RPC call must not duplicate the attempt';
  end if;

  -- A later attempt on the same question in a new session must get the next
  -- sequence number and use the stored answer key for grading.
  insert into public.learning_sessions (user_id, mode, subject, status, total_questions)
  values (v_user_id, 'smart_practice', 'Answer RPC Test', 'in_progress', 2)
  returning id into v_second_session_id;

  insert into public.learning_session_items (session_id, user_id, question_id, position)
  values (v_second_session_id, v_user_id, v_question_id, 0)
  returning id into v_second_item_id;

  v_result := public.submit_learning_answer(v_second_session_id, v_question_id, v_wrong_option, 900, v_user_id);
  if coalesce((v_result->>'correct')::boolean, true) is not false then
    raise exception 'Assertion failed: RPC must grade a wrong option as incorrect';
  end if;

  select attempt_number into v_second_attempt_number
  from public.question_attempts
  where session_item_id = v_second_item_id;
  if v_second_attempt_number <> v_first_attempt_number + 1 then
    raise exception 'Assertion failed: later question attempt number must increment sequentially';
  end if;

  -- A final one-question session must complete atomically; retrying its final
  -- answer hits the inactive-session guard, not a second grading operation.
  insert into public.learning_sessions (user_id, mode, subject, status, total_questions)
  values (v_user_id, 'smart_practice', 'Answer RPC Test', 'in_progress', 1)
  returning id into v_final_session_id;

  insert into public.learning_session_items (session_id, user_id, question_id, position)
  values (v_final_session_id, v_user_id, v_question_id, 0)
  returning id into v_final_item_id;

  v_result := public.submit_learning_answer(v_final_session_id, v_question_id, v_correct_option, 500, v_user_id);
  select status, answered_count into v_session_status, v_answered_count
  from public.learning_sessions where id = v_final_session_id;
  if v_session_status <> 'completed' or v_answered_count <> 1 or
     coalesce((v_result->>'session_completed')::boolean, false) is not true then
    raise exception 'Assertion failed: final answer must complete the session exactly once';
  end if;

  begin
    perform public.submit_learning_answer(v_final_session_id, v_question_id, v_correct_option, 500, v_user_id);
    raise exception 'Assertion failed: completed-session retry unexpectedly succeeded';
  exception
    when sqlstate '55000' then
      null;
  end;

  select count(*), max(attempt_number)
    into v_attempt_count, v_final_attempt_number
  from public.question_attempts
  where session_item_id = v_final_item_id;
  if v_attempt_count <> 1 or v_final_attempt_number <> v_second_attempt_number + 1 then
    raise exception 'Assertion failed: completed-session retry must not duplicate the final attempt';
  end if;
end;
$$;

rollback;

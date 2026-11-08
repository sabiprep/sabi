-- Rollback-only verification for append-only, concurrency-safe attempt capture.
begin;

do $$
declare
  v_user_id uuid;
  v_question_id text;
  v_session_id uuid;
  v_second_session_id uuid;
  v_item_id uuid;
  v_second_item_id uuid;
  v_attempt_count integer;
  v_first_attempt_number integer;
  v_second_attempt_number integer;
  v_function text;
begin
  select id into v_user_id from auth.users limit 1;
  if v_user_id is null then
    raise exception 'Assertion failed: an auth user fixture is required';
  end if;

  select id into v_question_id
  from public.question_bank
  where status = 'published'
  order by id
  limit 1;
  if v_question_id is null then
    raise exception 'Assertion failed: a published question fixture is required';
  end if;

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

  insert into public.learning_sessions (user_id, mode, subject, status, total_questions)
  values (v_user_id, 'smart_practice', 'Attempt Capture Test', 'in_progress', 1)
  returning id into v_session_id;

  insert into public.learning_session_items (session_id, user_id, question_id, position)
  values (v_session_id, v_user_id, v_question_id, 0)
  returning id into v_item_id;

  update public.learning_session_items
  set selected_option = 'A', is_correct = true, answered_at = now()
  where id = v_item_id;

  select count(*), max(attempt_number)
    into v_attempt_count, v_first_attempt_number
  from public.question_attempts
  where session_item_id = v_item_id;

  if v_attempt_count <> 1 or v_first_attempt_number <> 1 then
    raise exception 'Assertion failed: first answer must create exactly one attempt numbered 1';
  end if;

  -- Re-updating an already answered item must not append another attempt.
  update public.learning_session_items
  set answered_at = answered_at, active_time_ms = active_time_ms + 1
  where id = v_item_id;

  select count(*) into v_attempt_count
  from public.question_attempts
  where session_item_id = v_item_id;

  if v_attempt_count <> 1 then
    raise exception 'Assertion failed: repeated item update duplicated the attempt';
  end if;

  insert into public.learning_sessions (user_id, mode, subject, status, total_questions)
  values (v_user_id, 'smart_practice', 'Attempt Capture Test', 'in_progress', 1)
  returning id into v_second_session_id;

  insert into public.learning_session_items (session_id, user_id, question_id, position)
  values (v_second_session_id, v_user_id, v_question_id, 0)
  returning id into v_second_item_id;

  update public.learning_session_items
  set selected_option = 'B', is_correct = false, answered_at = now()
  where id = v_second_item_id;

  select attempt_number into v_second_attempt_number
  from public.question_attempts
  where session_item_id = v_second_item_id;

  if v_second_attempt_number <> v_first_attempt_number + 1 then
    raise exception 'Assertion failed: repeated question attempt number must increment sequentially';
  end if;
end;
$$;

rollback;

create unique index if not exists question_attempts_session_item_uidx
  on public.question_attempts (session_item_id)
  where session_item_id is not null;

create unique index if not exists question_attempts_user_question_attempt_number_uidx
  on public.question_attempts (user_id, question_id, attempt_number);

create or replace function public.capture_question_attempt_from_session_item()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_variant_group_id uuid;
  v_attempt_number integer;
begin
  if old.answered_at is null and new.answered_at is not null then
    -- Serialize attempts for the same learner/question, including attempts
    -- created concurrently from separate sessions.
    perform pg_advisory_xact_lock(
      hashtextextended(new.user_id::text || ':' || new.question_id, 0)
    );

    -- A question can only be attributed to a variant group when its active
    -- membership is unambiguous.
    select case
      when count(distinct qvm.group_id) = 1
        then (array_agg(distinct qvm.group_id))[1]
      else null
    end
    into v_variant_group_id
    from public.question_variant_members qvm
    where qvm.question_id = new.question_id
      and qvm.is_active = true;

    select coalesce(max(qa.attempt_number), 0) + 1
      into v_attempt_number
    from public.question_attempts qa
    where qa.user_id = new.user_id
      and qa.question_id = new.question_id;

    insert into public.question_attempts (
      user_id, client_submission_id, session_id, session_item_id,
      question_id, variant_group_id, selected_option, is_correct,
      elapsed_ms, active_elapsed_ms, hint_count, answer_change_count,
      attempt_number, attempted_at, grading_source
    ) values (
      new.user_id, gen_random_uuid(), new.session_id, new.id,
      new.question_id, v_variant_group_id, new.selected_option,
      coalesce(new.is_correct, false), new.elapsed_ms, new.active_time_ms,
      new.hint_count, new.answer_change_count, v_attempt_number,
      coalesce(new.answered_at, now()), 'stored_answer_key'
    )
    on conflict (session_item_id) where session_item_id is not null do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.capture_question_attempt_from_session_item() from public, anon, authenticated;
grant execute on function public.capture_question_attempt_from_session_item() to service_role;

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
    select qvm.group_id into v_variant_group_id
    from public.question_variant_members qvm
    where qvm.question_id = new.question_id and qvm.is_active = true
    order by qvm.created_at asc limit 1;

    select coalesce(max(qa.attempt_number), 0) + 1 into v_attempt_number
    from public.question_attempts qa
    where qa.user_id = new.user_id and qa.question_id = new.question_id;

    insert into public.question_attempts (
      user_id, client_submission_id, session_id, session_item_id, question_id,
      variant_group_id, selected_option, is_correct, elapsed_ms, active_elapsed_ms,
      hint_count, answer_change_count, attempt_number, attempted_at, grading_source
    ) values (
      new.user_id, gen_random_uuid(), new.session_id, new.id, new.question_id,
      v_variant_group_id, new.selected_option, coalesce(new.is_correct, false),
      new.elapsed_ms, new.active_time_ms, new.hint_count, new.answer_change_count,
      v_attempt_number, coalesce(new.answered_at, now()), 'stored_answer_key'
    );
  end if;
  return new;
end;
$$;

revoke all on function public.capture_question_attempt_from_session_item() from public, anon, authenticated;
grant execute on function public.capture_question_attempt_from_session_item() to service_role;

drop trigger if exists capture_question_attempt_after_session_item_answer on public.learning_session_items;
create trigger capture_question_attempt_after_session_item_answer
after update of answered_at on public.learning_session_items
for each row
when (old.answered_at is null and new.answered_at is not null)
execute function public.capture_question_attempt_from_session_item();

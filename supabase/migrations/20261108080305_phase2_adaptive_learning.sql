alter table public.student_topic_mastery
  add column if not exists correct_streak integer not null default 0 check (correct_streak >= 0),
  add column if not exists ease_factor numeric(4,2) not null default 2.50 check (ease_factor between 1.30 and 2.80),
  add column if not exists interval_days integer not null default 1 check (interval_days between 1 and 365),
  add column if not exists last_result text check (last_result in ('correct','incorrect'));

create index if not exists student_topic_mastery_due_lookup_idx
  on public.student_topic_mastery (user_id, next_review_at, mastery_score);

create or replace function public.submit_learning_answer(
  p_session_id uuid, p_question_id text, p_selected_option text, p_elapsed_ms integer, p_user_id uuid
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_session public.learning_sessions%rowtype;
  v_item public.learning_session_items%rowtype;
  v_question public.question_bank%rowtype;
  v_mastery public.student_topic_mastery%rowtype;
  v_correct boolean;
  v_answered integer;
  v_score numeric(5,2);
  v_new_attempted integer;
  v_new_correct integer;
  v_new_streak integer;
  v_new_interval integer;
  v_new_ease numeric(4,2);
begin
  if p_selected_option not in ('A','B','C','D') then raise exception 'Invalid answer option' using errcode = '22023'; end if;
  if p_elapsed_ms is not null and (p_elapsed_ms < 0 or p_elapsed_ms > 3600000) then raise exception 'Invalid elapsed time' using errcode = '22023'; end if;
  select * into v_session from public.learning_sessions where id = p_session_id and user_id = p_user_id for update;
  if not found then raise exception 'Learning session not found' using errcode = 'P0002'; end if;
  if v_session.status <> 'in_progress' then raise exception 'Learning session is not active' using errcode = '55000'; end if;
  select * into v_item from public.learning_session_items where session_id = p_session_id and user_id = p_user_id and question_id = p_question_id and answered_at is null for update;
  if not found then raise exception 'Question is not part of this active session or was already answered' using errcode = 'P0002'; end if;
  select * into v_question from public.question_bank where id = p_question_id and status = 'published';
  if not found then raise exception 'Question is no longer available' using errcode = 'P0002'; end if;
  v_correct := lower(trim(v_question.answer)) = lower(p_selected_option);
  update public.learning_session_items set selected_option=p_selected_option,is_correct=v_correct,elapsed_ms=p_elapsed_ms,answered_at=now() where id=v_item.id;
  update public.learning_sessions set answered_count=answered_count+1,correct_count=correct_count+case when v_correct then 1 else 0 end,
    status=case when answered_count+1>=total_questions then 'completed' else status end,
    completed_at=case when answered_count+1>=total_questions then now() else completed_at end
    where id=p_session_id returning answered_count into v_answered;
  if coalesce(v_question.topic,'') <> '' then
    select * into v_mastery from public.student_topic_mastery where user_id=p_user_id and subject=v_question.subject and topic=v_question.topic for update;
    v_new_attempted := coalesce(v_mastery.attempted_count,0)+1;
    v_new_correct := coalesce(v_mastery.correct_count,0)+case when v_correct then 1 else 0 end;
    v_new_streak := case when v_correct then coalesce(v_mastery.correct_streak,0)+1 else 0 end;
    v_new_ease := greatest(1.30,least(2.80,coalesce(v_mastery.ease_factor,2.50)+case when v_correct then 0.05 else -0.20 end));
    v_new_interval := case when not v_correct then 1 when coalesce(v_mastery.correct_streak,0)=0 then 1 when coalesce(v_mastery.correct_streak,0)=1 then 3 else least(365,greatest(1,round(coalesce(v_mastery.interval_days,1)*v_new_ease)::integer)) end;
    v_score := round(100.0*(v_new_correct+2)/(v_new_attempted+4),2);
    insert into public.student_topic_mastery(user_id,subject,topic,attempted_count,correct_count,mastery_score,last_attempt_at,next_review_at,updated_at,correct_streak,ease_factor,interval_days,last_result)
    values(p_user_id,v_question.subject,v_question.topic,v_new_attempted,v_new_correct,v_score,now(),now()+make_interval(days=>v_new_interval),now(),v_new_streak,v_new_ease,v_new_interval,case when v_correct then 'correct' else 'incorrect' end)
    on conflict(user_id,subject,topic) do update set attempted_count=excluded.attempted_count,correct_count=excluded.correct_count,mastery_score=excluded.mastery_score,last_attempt_at=excluded.last_attempt_at,next_review_at=excluded.next_review_at,updated_at=excluded.updated_at,correct_streak=excluded.correct_streak,ease_factor=excluded.ease_factor,interval_days=excluded.interval_days,last_result=excluded.last_result;
  end if;
  return jsonb_build_object('correct',v_correct,'correct_option',upper(trim(v_question.answer)),'explanation',coalesce(v_question.explanation_short,v_question.explanation,''),'answered_count',v_answered,'total_questions',v_session.total_questions,'session_completed',v_answered>=v_session.total_questions,'mastery_score',v_score,'next_review_days',v_new_interval,'correct_streak',v_new_streak);
end;
$$;
revoke all on function public.submit_learning_answer(uuid,text,text,integer,uuid) from public,anon,authenticated;
grant execute on function public.submit_learning_answer(uuid,text,text,integer,uuid) to service_role;
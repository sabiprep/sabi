-- Make mastery updates atomic when a student submits answers concurrently.
create or replace function public.submit_learning_answer(
  p_session_id uuid, p_question_id text, p_selected_option text, p_elapsed_ms integer, p_user_id uuid
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_session public.learning_sessions%rowtype;
  v_item public.learning_session_items%rowtype;
  v_question public.question_bank%rowtype;
  v_correct boolean;
  v_answered integer;
  v_score numeric(5,2);
  v_interval integer;
  v_streak integer;
begin
  if p_selected_option not in ('A','B','C','D') then raise exception 'Invalid answer option' using errcode = '22023'; end if;
  if p_elapsed_ms is not null and (p_elapsed_ms < 0 or p_elapsed_ms > 3600000) then raise exception 'Invalid elapsed time' using errcode = '22023'; end if;
  select * into v_session from public.learning_sessions where id=p_session_id and user_id=p_user_id for update;
  if not found then raise exception 'Learning session not found' using errcode = 'P0002'; end if;
  if v_session.status <> 'in_progress' then raise exception 'Learning session is not active' using errcode = '55000'; end if;
  select * into v_item from public.learning_session_items where session_id=p_session_id and user_id=p_user_id and question_id=p_question_id and answered_at is null for update;
  if not found then raise exception 'Question is not part of this active session or was already answered' using errcode = 'P0002'; end if;
  select * into v_question from public.question_bank where id=p_question_id and status='published';
  if not found then raise exception 'Question is no longer available' using errcode = 'P0002'; end if;
  v_correct := lower(trim(v_question.answer))=lower(p_selected_option);
  update public.learning_session_items set selected_option=p_selected_option,is_correct=v_correct,elapsed_ms=p_elapsed_ms,answered_at=now() where id=v_item.id;
  update public.learning_sessions set answered_count=answered_count+1,correct_count=correct_count+case when v_correct then 1 else 0 end,
    status=case when answered_count+1>=total_questions then 'completed' else status end,
    completed_at=case when answered_count+1>=total_questions then now() else completed_at end
    where id=p_session_id returning answered_count into v_answered;

  if coalesce(v_question.topic,'') <> '' then
    insert into public.student_topic_mastery(
      user_id,subject,topic,attempted_count,correct_count,mastery_score,last_attempt_at,next_review_at,updated_at,
      correct_streak,ease_factor,interval_days,last_result
    ) values (
      p_user_id,v_question.subject,v_question.topic,1,case when v_correct then 1 else 0,
      round(100.0*(case when v_correct then 1 else 0 + 2 end)/5.0,2),
      now(),now()+interval '1 day',now(),case when v_correct then 1 else 0 end,
      greatest(1.30,least(2.80,2.50+case when v_correct then 0.05 else -0.20 end)),1,
      case when v_correct then 'correct' else 'incorrect' end
    )
    on conflict(user_id,subject,topic) do update set
      attempted_count=public.student_topic_mastery.attempted_count+1,
      correct_count=public.student_topic_mastery.correct_count+case when v_correct then 1 else 0 end,
      mastery_score=round(100.0*(public.student_topic_mastery.correct_count+case when v_correct then 1 else 0 end+2)/
        (public.student_topic_mastery.attempted_count+1+4),2),
      correct_streak=case when v_correct then public.student_topic_mastery.correct_streak+1 else 0 end,
      ease_factor=greatest(1.30,least(2.80,public.student_topic_mastery.ease_factor+case when v_correct then 0.05 else -0.20 end)),
      interval_days=case
        when not v_correct then 1
        when public.student_topic_mastery.correct_streak=0 then 1
        when public.student_topic_mastery.correct_streak=1 then 3
        else least(365,greatest(1,round(public.student_topic_mastery.interval_days*
          greatest(1.30,least(2.80,public.student_topic_mastery.ease_factor+0.05)))::integer))
      end,
      next_review_at=now()+make_interval(days=>case
        when not v_correct then 1
        when public.student_topic_mastery.correct_streak=0 then 1
        when public.student_topic_mastery.correct_streak=1 then 3
        else least(365,greatest(1,round(public.student_topic_mastery.interval_days*
          greatest(1.30,least(2.80,public.student_topic_mastery.ease_factor+0.05)))::integer))
      end),
      last_attempt_at=now(),updated_at=now(),
      last_result=case when v_correct then 'correct' else 'incorrect' end
    returning mastery_score,interval_days,correct_streak into v_score,v_interval,v_streak;
  end if;

  return jsonb_build_object('correct',v_correct,'correct_option',upper(trim(v_question.answer)),
    'explanation',coalesce(v_question.explanation_short,v_question.explanation,''),'answered_count',v_answered,
    'total_questions',v_session.total_questions,'session_completed',v_answered>=v_session.total_questions,
    'mastery_score',v_score,'next_review_days',v_interval,'correct_streak',v_streak);
end;
$$;
revoke all on function public.submit_learning_answer(uuid,text,text,integer,uuid) from public,anon,authenticated;
grant execute on function public.submit_learning_answer(uuid,text,text,integer,uuid) to service_role;
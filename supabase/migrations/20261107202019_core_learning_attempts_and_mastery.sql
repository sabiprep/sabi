
create table if not exists public.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('diagnostic','smart_practice','blitz','cbt','custom')),
  subject text,
  status text not null default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  total_questions integer not null check (total_questions between 1 and 100),
  answered_count integer not null default 0 check (answered_count >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint learning_sessions_counts_valid check (correct_count <= answered_count and answered_count <= total_questions)
);

create table if not exists public.learning_session_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.learning_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null references public.question_bank(id),
  position integer not null check (position >= 0),
  selected_option text check (selected_option in ('A','B','C','D')),
  is_correct boolean,
  elapsed_ms integer check (elapsed_ms is null or elapsed_ms between 0 and 3600000),
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (session_id, question_id),
  unique (session_id, position)
);

create table if not exists public.student_topic_mastery (
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  topic text not null,
  attempted_count integer not null default 0 check (attempted_count >= 0),
  correct_count integer not null default 0 check (correct_count between 0 and attempted_count),
  mastery_score numeric(5,2) not null default 0 check (mastery_score between 0 and 100),
  last_attempt_at timestamptz,
  next_review_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, subject, topic)
);

create index if not exists learning_sessions_user_started_idx
  on public.learning_sessions (user_id, started_at desc);
create index if not exists learning_session_items_user_idx
  on public.learning_session_items (user_id, created_at desc);
create index if not exists learning_session_items_question_idx
  on public.learning_session_items (question_id);
create index if not exists student_topic_mastery_review_idx
  on public.student_topic_mastery (user_id, next_review_at);

alter table public.learning_sessions enable row level security;
alter table public.learning_session_items enable row level security;
alter table public.student_topic_mastery enable row level security;

revoke all on public.learning_sessions from anon, authenticated;
revoke all on public.learning_session_items from anon, authenticated;
revoke all on public.student_topic_mastery from anon, authenticated;
grant all on public.learning_sessions to service_role;
grant all on public.learning_session_items to service_role;
grant all on public.student_topic_mastery to service_role;

create or replace function public.submit_learning_answer(
  p_session_id uuid,
  p_question_id text,
  p_selected_option text,
  p_elapsed_ms integer,
  p_user_id uuid
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session public.learning_sessions%rowtype;
  v_item public.learning_session_items%rowtype;
  v_question public.question_bank%rowtype;
  v_correct boolean;
  v_answered integer;
  v_score numeric(5,2);
begin
  if p_selected_option not in ('A','B','C','D') then
    raise exception 'Invalid answer option' using errcode = '22023';
  end if;
  if p_elapsed_ms is not null and (p_elapsed_ms < 0 or p_elapsed_ms > 3600000) then
    raise exception 'Invalid elapsed time' using errcode = '22023';
  end if;

  select * into v_session
  from public.learning_sessions
  where id = p_session_id and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Learning session not found' using errcode = 'P0002';
  end if;
  if v_session.status <> 'in_progress' then
    raise exception 'Learning session is not active' using errcode = '55000';
  end if;

  select * into v_item
  from public.learning_session_items
  where session_id = p_session_id
    and user_id = p_user_id
    and question_id = p_question_id
    and answered_at is null
  for update;

  if not found then
    raise exception 'Question is not part of this active session or was already answered' using errcode = 'P0002';
  end if;

  select * into v_question
  from public.question_bank
  where id = p_question_id and status = 'published';

  if not found then
    raise exception 'Question is no longer available' using errcode = 'P0002';
  end if;

  v_correct := lower(trim(v_question.answer)) = lower(p_selected_option);

  update public.learning_session_items
  set selected_option = p_selected_option,
      is_correct = v_correct,
      elapsed_ms = p_elapsed_ms,
      answered_at = now()
  where id = v_item.id;

  update public.learning_sessions
  set answered_count = answered_count + 1,
      correct_count = correct_count + case when v_correct then 1 else 0 end,
      status = case when answered_count + 1 >= total_questions then 'completed' else status end,
      completed_at = case when answered_count + 1 >= total_questions then now() else completed_at end
  where id = p_session_id
  returning answered_count into v_answered;

  if coalesce(v_question.topic, '') <> '' then
    insert into public.student_topic_mastery (
      user_id, subject, topic, attempted_count, correct_count,
      mastery_score, last_attempt_at, next_review_at, updated_at
    ) values (
      p_user_id, v_question.subject, v_question.topic, 1,
      case when v_correct then 1 else 0 end,
      case when v_correct then 100 else 0 end,
      now(),
      now() + interval '1 day',
      now()
    )
    on conflict (user_id, subject, topic) do update
    set attempted_count = public.student_topic_mastery.attempted_count + 1,
        correct_count = public.student_topic_mastery.correct_count + case when v_correct then 1 else 0 end,
        mastery_score = round(
          100.0 * (public.student_topic_mastery.correct_count + case when v_correct then 1 else 0 end)
          / (public.student_topic_mastery.attempted_count + 1), 2
        ),
        last_attempt_at = now(),
        next_review_at = now() + case
          when round(100.0 * (public.student_topic_mastery.correct_count + case when v_correct then 1 else 0 end)
            / (public.student_topic_mastery.attempted_count + 1), 2) < 50 then interval '1 day'
          when round(100.0 * (public.student_topic_mastery.correct_count + case when v_correct then 1 else 0 end)
            / (public.student_topic_mastery.attempted_count + 1), 2) < 70 then interval '3 days'
          when round(100.0 * (public.student_topic_mastery.correct_count + case when v_correct then 1 else 0 end)
            / (public.student_topic_mastery.attempted_count + 1), 2) < 85 then interval '7 days'
          else interval '14 days'
        end,
        updated_at = now()
    returning mastery_score into v_score;
  end if;

  return jsonb_build_object(
    'correct', v_correct,
    'correct_option', upper(trim(v_question.answer)),
    'explanation', coalesce(v_question.explanation_short, v_question.explanation, ''),
    'answered_count', v_answered,
    'total_questions', v_session.total_questions,
    'session_completed', v_answered >= v_session.total_questions,
    'mastery_score', v_score
  );
end;
$$;

revoke all on function public.submit_learning_answer(uuid, text, text, integer, uuid) from public, anon, authenticated;
grant execute on function public.submit_learning_answer(uuid, text, text, integer, uuid) to service_role;

-- Phase 1.5: learner intelligence, learning telemetry, content governance and engine traceability.
-- This migration is additive. It preserves the Phase 1/2 tables and API contracts.

create table if not exists public.student_academic_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  exam_year integer,
  education_level text check (education_level in ('junior_secondary','senior_secondary','post_secondary','other')),
  current_class text,
  school_type text check (school_type in ('public','private','tutorial_centre','home_school','other')),
  previous_utme_attempts smallint not null default 0 check (previous_utme_attempts between 0 and 20),
  preferred_language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_subject_selections (
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_year integer not null,
  subject_slug text not null references public.jamb_subjects(slug) on update cascade,
  selection_order smallint not null check (selection_order between 1 and 4),
  is_compulsory boolean not null default false,
  selection_source text not null default 'student'
    check (selection_source in ('student','onboarding','teacher','system_recommendation','migration')),
  created_at timestamptz not null default now(),
  primary key (user_id, exam_year, subject_slug),
  unique (user_id, exam_year, selection_order)
);

create table if not exists public.student_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_year integer not null,
  target_score integer check (target_score between 0 and 400),
  target_course text,
  target_institution text,
  target_exam_date date,
  status text not null default 'active' check (status in ('active','achieved','paused','replaced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_learning_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_goal_minutes smallint not null default 30 check (daily_goal_minutes between 0 and 1440),
  preferred_session_minutes smallint not null default 20 check (preferred_session_minutes between 5 and 180),
  explanation_style text not null default 'step_by_step'
    check (explanation_style in ('concise','step_by_step','detailed','examples_first')),
  reminder_time time,
  reminders_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Consent is an append-only record: a new row records every grant or revocation.
create table if not exists public.student_consent_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null check (consent_type in ('personalization','learning_analytics','ai_tutor','research','marketing')),
  granted boolean not null,
  policy_version text not null,
  recorded_at timestamptz not null default now(),
  source text not null default 'in_app' check (source in ('in_app','admin','migration'))
);

create index if not exists student_goals_user_year_idx
  on public.student_goals (user_id, exam_year, status);
create index if not exists student_subject_selections_year_idx
  on public.student_subject_selections (exam_year, subject_slug);

-- Subject availability is cycle-specific. It deliberately does not silently
-- expand the existing generic CBT allow-list for a future exam year.
create table if not exists public.jamb_subject_availability (
  exam_year integer not null,
  subject_slug text not null references public.jamb_subjects(slug) on update cascade,
  availability_status text not null
    check (availability_status in ('listed_in_manual','pending_verification','not_available','retired')),
  source_url text not null,
  verified_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  primary key (exam_year, subject_slug)
);

create table if not exists public.jamb_syllabus_objectives (
  id uuid primary key default gen_random_uuid(),
  syllabus_version_id uuid references public.jamb_syllabus_versions(id) on delete set null,
  topic_id uuid not null references public.jamb_topics(id) on delete cascade,
  subtopic_id uuid references public.jamb_subtopics(id) on delete set null,
  objective_code text,
  objective_text text not null,
  verification_status text not null default 'draft'
    check (verification_status in ('draft','verified','retired')),
  source_url text,
  source_label text not null default 'unverified',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists jamb_syllabus_objectives_topic_idx
  on public.jamb_syllabus_objectives (topic_id, sort_order);

-- Provenance and human review are separate from the legacy free-text source field.
create table if not exists public.question_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  source_name text not null,
  source_type text not null
    check (source_type in ('official_past_question','publisher','teacher_authored','ai_generated','internal','other')),
  source_url text,
  license_name text,
  attribution_required boolean not null default false,
  permitted_use text not null default 'unknown'
    check (permitted_use in ('unknown','internal_review','practice_display','redistribution_allowed','restricted')),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified','verified','restricted','rejected')),
  checked_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.question_bank
  add column if not exists source_id uuid references public.question_sources(id) on delete set null,
  add column if not exists content_fingerprint text,
  add column if not exists review_status text not null default 'unreviewed'
    check (review_status in ('unreviewed','needs_review','approved','rejected')),
  add column if not exists last_reviewed_at timestamptz;

create index if not exists question_bank_source_id_idx on public.question_bank (source_id);
create index if not exists question_bank_review_status_idx on public.question_bank (review_status, status);
create index if not exists question_bank_content_fingerprint_idx
  on public.question_bank (content_fingerprint)
  where content_fingerprint is not null;

create table if not exists public.question_review_history (
  id uuid primary key default gen_random_uuid(),
  question_id text not null references public.question_bank(id) on delete cascade,
  reviewer_user_id uuid references auth.users(id) on delete set null,
  review_decision text not null check (review_decision in ('approved','rejected','needs_revision')),
  academic_accuracy boolean,
  answer_verified boolean,
  explanation_verified boolean,
  syllabus_alignment_verified boolean,
  reviewer_notes text,
  reviewed_at timestamptz not null default now()
);
create index if not exists question_review_history_question_idx
  on public.question_review_history (question_id, reviewed_at desc);

-- A single append-only event stream captures useful learning signals without
-- recording raw keystrokes, device fingerprints or unrelated personal data.
create table if not exists public.learning_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.learning_sessions(id) on delete cascade,
  session_item_id uuid references public.learning_session_items(id) on delete set null,
  question_id text references public.question_bank(id) on delete set null,
  client_event_id text not null default gen_random_uuid()::text,
  event_type text not null check (event_type in (
    'session_started','session_paused','session_resumed','session_completed','session_abandoned',
    'question_presented','question_revisited','answer_selected','answer_changed','answer_submitted',
    'question_skipped','hint_requested','explanation_opened','navigation_changed',
    'focus_lost','focus_returned'
  )),
  sequence_no integer check (sequence_no is null or sequence_no >= 0),
  elapsed_ms integer check (elapsed_ms is null or elapsed_ms between 0 and 3600000),
  active_elapsed_ms integer check (active_elapsed_ms is null or active_elapsed_ms between 0 and 3600000),
  event_payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(event_payload) = 'object' and pg_column_size(event_payload) <= 4096),
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  schema_version smallint not null default 1 check (schema_version > 0),
  unique (user_id, client_event_id)
);
create index if not exists learning_events_user_time_idx
  on public.learning_events (user_id, occurred_at desc);
create index if not exists learning_events_session_time_idx
  on public.learning_events (session_id, occurred_at);
create index if not exists learning_events_question_type_idx
  on public.learning_events (question_id, event_type, occurred_at desc);

alter table public.learning_session_items
  add column if not exists presented_at timestamptz,
  add column if not exists first_interaction_at timestamptz,
  add column if not exists last_interaction_at timestamptz,
  add column if not exists answer_change_count integer not null default 0 check (answer_change_count >= 0),
  add column if not exists hint_count integer not null default 0 check (hint_count >= 0),
  add column if not exists explanation_view_count integer not null default 0 check (explanation_view_count >= 0),
  add column if not exists active_time_ms integer not null default 0 check (active_time_ms >= 0),
  add column if not exists idle_time_ms integer not null default 0 check (idle_time_ms >= 0),
  add column if not exists revisit_count integer not null default 0 check (revisit_count >= 0),
  add column if not exists presentation_count integer not null default 1 check (presentation_count >= 0),
  add column if not exists skipped_at timestamptz;

-- Immutable mastery snapshots preserve the learner's trajectory for analytics.
create table if not exists public.student_topic_mastery_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  topic text not null,
  attempted_count integer not null,
  correct_count integer not null,
  mastery_score numeric(5,2) not null,
  correct_streak integer not null,
  ease_factor numeric(4,2) not null,
  interval_days integer not null,
  last_result text,
  next_review_at timestamptz,
  snapshot_operation text not null check (snapshot_operation in ('insert','update')),
  captured_at timestamptz not null default now()
);
create index if not exists student_topic_mastery_history_user_idx
  on public.student_topic_mastery_history (user_id, captured_at desc);
create index if not exists student_topic_mastery_history_topic_idx
  on public.student_topic_mastery_history (user_id, subject, topic, captured_at desc);

create or replace function public.capture_student_topic_mastery_history()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.student_topic_mastery_history (
    user_id, subject, topic, attempted_count, correct_count, mastery_score,
    correct_streak, ease_factor, interval_days, last_result, next_review_at,
    snapshot_operation, captured_at
  ) values (
    new.user_id, new.subject, new.topic, new.attempted_count, new.correct_count,
    new.mastery_score, new.correct_streak, new.ease_factor, new.interval_days,
    new.last_result, new.next_review_at, lower(tg_op), now()
  );
  return new;
end;
$$;

drop trigger if exists student_topic_mastery_history_capture on public.student_topic_mastery;
create trigger student_topic_mastery_history_capture
after insert or update on public.student_topic_mastery
for each row execute function public.capture_student_topic_mastery_history();

-- Engine registry and execution traces make recommendations and predictions explainable.
create table if not exists public.engine_registry (
  engine_key text primary key,
  display_name text not null,
  purpose text not null,
  lifecycle_status text not null default 'planned'
    check (lifecycle_status in ('planned','active','paused','retired')),
  current_version text,
  configuration jsonb not null default '{}'::jsonb
    check (jsonb_typeof(configuration) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.engine_runs (
  id uuid primary key default gen_random_uuid(),
  engine_key text not null references public.engine_registry(engine_key),
  engine_version text not null,
  user_id uuid references auth.users(id) on delete set null,
  session_id uuid references public.learning_sessions(id) on delete set null,
  idempotency_key text,
  run_status text not null default 'completed'
    check (run_status in ('queued','running','completed','failed','cancelled')),
  input_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(input_snapshot) = 'object' and pg_column_size(input_snapshot) <= 16384),
  output_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(output_snapshot) = 'object' and pg_column_size(output_snapshot) <= 16384),
  decision_summary text,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  error_code text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (engine_key, idempotency_key)
);
create index if not exists engine_runs_user_time_idx on public.engine_runs (user_id, started_at desc);
create index if not exists engine_runs_engine_time_idx on public.engine_runs (engine_key, started_at desc);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  engine_run_id uuid references public.engine_runs(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  recommendation_type text not null
    check (recommendation_type in ('topic_review','question_set','subject_focus','study_plan','diagnostic','exam_readiness','tutor_support')),
  target_type text not null check (target_type in ('topic','subtopic','question','subject','session','plan')),
  target_id text not null,
  rank_position integer not null default 1 check (rank_position > 0),
  relevance_score numeric(7,4) check (relevance_score is null or relevance_score between 0 and 1),
  rationale jsonb not null default '{}'::jsonb check (jsonb_typeof(rationale) = 'object'),
  recommendation_status text not null default 'pending'
    check (recommendation_status in ('pending','accepted','dismissed','completed','expired')),
  created_at timestamptz not null default now(),
  acted_at timestamptz,
  expires_at timestamptz
);
create index if not exists recommendations_user_status_idx
  on public.recommendations (user_id, recommendation_status, created_at desc);

create table if not exists public.recommendation_feedback (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references public.recommendations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  feedback_type text not null check (feedback_type in ('helpful','not_helpful','too_easy','too_hard','irrelevant','completed','skipped')),
  reason_code text,
  created_at timestamptz not null default now()
);
create index if not exists recommendation_feedback_user_idx
  on public.recommendation_feedback (user_id, created_at desc);

create table if not exists public.score_prediction_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_year integer,
  predicted_score numeric(6,2) not null check (predicted_score between 0 and 400),
  lower_bound numeric(6,2) check (lower_bound between 0 and 400),
  upper_bound numeric(6,2) check (upper_bound between 0 and 400),
  confidence_level text not null check (confidence_level in ('low','medium','high')),
  model_version text not null,
  answered_question_count integer not null default 0 check (answered_question_count >= 0),
  subject_breakdown jsonb not null default '{}'::jsonb check (jsonb_typeof(subject_breakdown) = 'object'),
  prediction_factors jsonb not null default '{}'::jsonb check (jsonb_typeof(prediction_factors) = 'object'),
  created_at timestamptz not null default now(),
  check (lower_bound is null or upper_bound is null or lower_bound <= upper_bound)
);
create index if not exists score_prediction_snapshots_user_time_idx
  on public.score_prediction_snapshots (user_id, created_at desc);

-- All new public-schema tables use RLS. Student-owned read models are read-only
-- to authenticated clients; writes and telemetry ingestion go through trusted APIs.
do $$
declare
  t text;
begin
  foreach t in array array[
    'student_academic_profiles','student_subject_selections','student_goals',
    'student_learning_preferences','student_consent_history','jamb_subject_availability',
    'jamb_syllabus_objectives','question_sources','question_review_history','learning_events',
    'student_topic_mastery_history','engine_registry','engine_runs','recommendations',
    'recommendation_feedback','score_prediction_snapshots'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

grant select on public.student_academic_profiles, public.student_subject_selections,
  public.student_goals, public.student_learning_preferences, public.student_consent_history,
  public.student_topic_mastery_history, public.recommendations,
  public.score_prediction_snapshots to authenticated;

create policy "Students read own academic profile"
  on public.student_academic_profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Students read own subject selections"
  on public.student_subject_selections for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Students read own goals"
  on public.student_goals for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Students read own learning preferences"
  on public.student_learning_preferences for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Students read own consent history"
  on public.student_consent_history for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Students read own mastery history"
  on public.student_topic_mastery_history for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Students read own recommendations"
  on public.recommendations for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Students read own score prediction history"
  on public.score_prediction_snapshots for select to authenticated
  using ((select auth.uid()) = user_id);

-- The event stream and review/engine tables intentionally remain service-role-only.
comment on table public.learning_events is
  'Append-only learning telemetry. Store explicit learning events only; never raw keystrokes or device fingerprints.';
comment on table public.student_topic_mastery_history is
  'Append-only snapshots generated whenever the current topic mastery row changes.';
comment on table public.question_review_history is
  'Human academic review decisions. AI confidence metadata is not a substitute for review.';

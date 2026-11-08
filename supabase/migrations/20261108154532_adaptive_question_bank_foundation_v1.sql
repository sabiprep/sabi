begin;

create table public.question_variant_groups (
  id uuid primary key default gen_random_uuid(),
  subject_slug text not null references public.jamb_subjects(slug) on delete restrict,
  topic_id uuid references public.jamb_topics(id) on delete restrict,
  subtopic_id uuid references public.jamb_subtopics(id) on delete restrict,
  objective_id uuid references public.jamb_syllabus_objectives(id) on delete restrict,
  concept_key text not null,
  group_kind text not null default 'same_concept'
    check (group_kind in ('same_concept','remediation','extension')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  check (topic_id is not null or subtopic_id is not null or objective_id is not null)
);

create index question_variant_groups_subject_concept_idx
  on public.question_variant_groups(subject_slug, concept_key);
create index question_variant_groups_topic_idx
  on public.question_variant_groups(topic_id) where topic_id is not null;
create index question_variant_groups_objective_idx
  on public.question_variant_groups(objective_id) where objective_id is not null;

create table public.question_variant_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.question_variant_groups(id) on delete cascade,
  question_id text not null references public.question_bank(id) on delete restrict,
  difficulty_level text not null check (difficulty_level in ('foundation','standard','challenge')),
  variant_role text not null default 'parallel'
    check (variant_role in ('original','simplified','parallel','extension')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (group_id, question_id)
);
create index question_variant_members_select_idx
  on public.question_variant_members(group_id, difficulty_level, is_active);

create table public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_submission_id uuid not null,
  session_id uuid references public.learning_sessions(id) on delete set null,
  session_item_id uuid references public.learning_session_items(id) on delete set null,
  question_id text not null references public.question_bank(id) on delete restrict,
  variant_group_id uuid references public.question_variant_groups(id) on delete set null,
  selected_option text check (selected_option is null or selected_option in ('A','B','C','D')),
  is_correct boolean not null,
  elapsed_ms integer check (elapsed_ms is null or elapsed_ms >= 0),
  active_elapsed_ms integer check (active_elapsed_ms is null or active_elapsed_ms >= 0),
  hint_count integer not null default 0 check (hint_count >= 0),
  answer_change_count integer not null default 0 check (answer_change_count >= 0),
  attempt_number integer not null default 1 check (attempt_number > 0),
  grading_source text not null default 'stored_answer_key' check (grading_source = 'stored_answer_key'),
  answer_key_fingerprint text,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object' and pg_column_size(metadata) <= 8192),
  attempted_at timestamptz not null default now(),
  unique (user_id, client_submission_id)
);
create index question_attempts_user_time_idx on public.question_attempts(user_id, attempted_at desc);
create index question_attempts_user_question_time_idx on public.question_attempts(user_id, question_id, attempted_at desc);
create index question_attempts_group_time_idx on public.question_attempts(user_id, variant_group_id, attempted_at desc)
  where variant_group_id is not null;
create index question_attempts_session_idx on public.question_attempts(session_id) where session_id is not null;

create table public.adaptive_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.learning_sessions(id) on delete set null,
  trigger_attempt_id uuid references public.question_attempts(id) on delete set null,
  variant_group_id uuid references public.question_variant_groups(id) on delete set null,
  previous_difficulty text check (previous_difficulty is null or previous_difficulty in ('foundation','standard','challenge')),
  selected_difficulty text not null check (selected_difficulty in ('foundation','standard','challenge')),
  selected_question_id text references public.question_bank(id) on delete set null,
  decision_reason text not null,
  evidence jsonb not null default '{}'::jsonb
    check (jsonb_typeof(evidence) = 'object' and pg_column_size(evidence) <= 8192),
  engine_version text not null,
  created_at timestamptz not null default now()
);
create index adaptive_decisions_user_time_idx on public.adaptive_decisions(user_id, created_at desc);
create index adaptive_decisions_session_idx on public.adaptive_decisions(session_id) where session_id is not null;

create table public.student_objective_mastery (
  user_id uuid not null references auth.users(id) on delete cascade,
  objective_id uuid not null references public.jamb_syllabus_objectives(id) on delete restrict,
  mastery_score numeric(5,2) not null default 0 check (mastery_score between 0 and 100),
  confidence numeric(5,2) not null default 0 check (confidence between 0 and 100),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  correct_count integer not null default 0 check (correct_count >= 0 and correct_count <= attempt_count),
  last_attempted_at timestamptz,
  next_review_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, objective_id)
);
create index student_objective_mastery_due_idx on public.student_objective_mastery(user_id, next_review_at)
  where next_review_at is not null;

create table public.question_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model text,
  job_type text not null check (job_type in ('archive_import','variant_generation','validation')),
  subject_slug text references public.jamb_subjects(slug) on delete set null,
  objective_id uuid references public.jamb_syllabus_objectives(id) on delete set null,
  source_id uuid references public.question_sources(id) on delete set null,
  status text not null default 'queued'
    check (status in ('queued','running','completed','partially_completed','failed','cancelled')),
  prompt_version text,
  requested_count integer not null default 0 check (requested_count >= 0),
  accepted_count integer not null default 0 check (accepted_count >= 0),
  rejected_count integer not null default 0 check (rejected_count >= 0),
  input_tokens bigint check (input_tokens is null or input_tokens >= 0),
  output_tokens bigint check (output_tokens is null or output_tokens >= 0),
  credits_used numeric(14,4) check (credits_used is null or credits_used >= 0),
  retry_count integer not null default 0 check (retry_count >= 0),
  validation_report jsonb not null default '{}'::jsonb
    check (jsonb_typeof(validation_report) = 'object' and pg_column_size(validation_report) <= 16384),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (accepted_count + rejected_count <= requested_count or requested_count = 0)
);
create index question_generation_jobs_status_idx on public.question_generation_jobs(status, created_at);

create table public.question_source_evidence (
  id uuid primary key default gen_random_uuid(),
  question_id text not null references public.question_bank(id) on delete restrict,
  source_id uuid not null references public.question_sources(id) on delete restrict,
  external_reference text,
  retrieved_at timestamptz,
  authenticity_status text not null default 'unverified'
    check (authenticity_status in ('unverified','verified','disputed','rejected')),
  content_verification_status text not null default 'unreviewed'
    check (content_verification_status in ('unreviewed','verified','needs_review','rejected')),
  rights_status text not null default 'unknown'
    check (rights_status in ('unknown','internal_review','practice_display','redistribution_allowed','restricted','rejected')),
  evidence jsonb not null default '{}'::jsonb
    check (jsonb_typeof(evidence) = 'object' and pg_column_size(evidence) <= 8192),
  created_at timestamptz not null default now(),
  unique (question_id, source_id, external_reference)
);
create index question_source_evidence_question_idx on public.question_source_evidence(question_id);
create index question_source_evidence_source_idx on public.question_source_evidence(source_id);

alter table public.question_variant_groups enable row level security;
alter table public.question_variant_members enable row level security;
alter table public.question_attempts enable row level security;
alter table public.adaptive_decisions enable row level security;
alter table public.student_objective_mastery enable row level security;
alter table public.question_generation_jobs enable row level security;
alter table public.question_source_evidence enable row level security;

revoke all on public.question_variant_groups, public.question_variant_members, public.question_attempts,
  public.adaptive_decisions, public.student_objective_mastery, public.question_generation_jobs,
  public.question_source_evidence from anon, authenticated;
grant all on public.question_variant_groups, public.question_variant_members, public.question_attempts,
  public.adaptive_decisions, public.student_objective_mastery, public.question_generation_jobs,
  public.question_source_evidence to service_role;

comment on table public.question_attempts is 'Append-only, server-graded student submissions. Student roles must not write grading fields directly.';
comment on table public.adaptive_decisions is 'Auditable record of adaptive practice difficulty and item selection decisions.';
comment on table public.question_source_evidence is 'Tracks source authenticity, content verification and reuse rights as separate dimensions.';
comment on table public.question_generation_jobs is 'Tracks archive ingestion and AI generation/validation batches, including provider credit usage.';
comment on table public.question_variant_groups is 'Groups questions that assess the same concept at different difficulty levels.';

commit;

-- Phase 1.6: universal, versioned signal registry and engine integration layer.
-- Additive only. This migration does not alter the Phase 1/2 engine algorithms.

create table if not exists public.signal_definitions (
  signal_key text primary key,
  display_name text not null,
  description text not null,
  domain text not null,
  value_type text not null check (value_type in ('string','number','integer','boolean','object','array')),
  unit text,
  sensitivity_level text not null default 'standard'
    check (sensitivity_level in ('standard','personal','sensitive')),
  default_purpose text not null references public.student_data_processing_purposes(purpose_key),
  lifecycle_status text not null default 'active'
    check (lifecycle_status in ('draft','active','deprecated','retired')),
  current_schema_version integer not null default 1 check (current_schema_version > 0),
  definition_metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(definition_metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.signal_schema_versions (
  signal_key text not null references public.signal_definitions(signal_key) on delete restrict,
  schema_version integer not null check (schema_version > 0),
  json_schema jsonb not null check (jsonb_typeof(json_schema) = 'object'),
  compatibility_mode text not null default 'backward'
    check (compatibility_mode in ('backward','forward','full','breaking')),
  version_status text not null default 'active'
    check (version_status in ('draft','active','deprecated','retired')),
  changelog text not null,
  created_at timestamptz not null default now(),
  primary key (signal_key, schema_version)
);

create table if not exists public.signal_source_registry (
  source_key text primary key,
  display_name text not null,
  source_type text not null
    check (source_type in ('onboarding','learning_event','progress_checkin','assessment','teacher','system','import','derived')),
  trust_level text not null default 'standard'
    check (trust_level in ('unverified','standard','verified','authoritative')),
  allowed_purposes text[] not null default '{}',
  is_active boolean not null default true,
  source_metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(source_metadata) = 'object'),
  created_at timestamptz not null default now()
);

create table if not exists public.engine_contract_versions (
  engine_key text not null references public.engine_registry(engine_key) on delete restrict,
  contract_version integer not null check (contract_version > 0),
  contract jsonb not null check (jsonb_typeof(contract) = 'object'),
  compatibility_mode text not null default 'backward'
    check (compatibility_mode in ('backward','forward','full','breaking')),
  contract_status text not null default 'draft'
    check (contract_status in ('draft','active','deprecated','retired')),
  changelog text not null,
  created_at timestamptz not null default now(),
  primary key (engine_key, contract_version)
);

create table if not exists public.signal_engine_subscriptions (
  id uuid primary key default gen_random_uuid(),
  engine_key text not null references public.engine_registry(engine_key) on delete cascade,
  engine_contract_version integer not null,
  signal_key text not null references public.signal_definitions(signal_key) on delete restrict,
  min_schema_version integer not null default 1 check (min_schema_version > 0),
  max_schema_version integer,
  input_requirement text not null default 'optional'
    check (input_requirement in ('required','optional')),
  trigger_mode text not null default 'on_change'
    check (trigger_mode in ('on_change','scheduled','on_demand','batch')),
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  foreign key (engine_key, engine_contract_version)
    references public.engine_contract_versions(engine_key, contract_version) on delete restrict,
  check (max_schema_version is null or max_schema_version >= min_schema_version),
  unique (engine_key, engine_contract_version, signal_key, trigger_mode)
);

-- Idempotent check-in writes ensure the self-report and its normalized
-- signals are committed together, never half-recorded.
alter table public.student_progress_checkins
  add column if not exists submission_key text;

create unique index if not exists student_progress_checkins_idempotency_idx
  on public.student_progress_checkins(user_id,submission_key)
  where submission_key is not null;

create table if not exists public.student_signal_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  signal_key text not null,
  schema_version integer not null,
  source_key text not null references public.signal_source_registry(source_key) on delete restrict,
  source_event_id uuid references public.learning_events(id) on delete set null,
  value jsonb not null,
  confidence numeric(5,4) check (confidence is null or confidence between 0 and 1),
  purpose_key text not null references public.student_data_processing_purposes(purpose_key),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  observed_at timestamptz not null,
  received_at timestamptz not null default now(),
  idempotency_key text not null,
  unique (user_id, idempotency_key),
  foreign key (signal_key, schema_version)
    references public.signal_schema_versions(signal_key, schema_version) on delete restrict
);
create index if not exists student_signal_observations_user_signal_time_idx
  on public.student_signal_observations(user_id, signal_key, observed_at desc);
create index if not exists student_signal_observations_source_event_idx
  on public.student_signal_observations(source_event_id) where source_event_id is not null;

create table if not exists public.student_signal_current (
  user_id uuid not null references auth.users(id) on delete cascade,
  signal_key text not null references public.signal_definitions(signal_key) on delete restrict,
  schema_version integer not null,
  value jsonb not null,
  confidence numeric(5,4) check (confidence is null or confidence between 0 and 1),
  purpose_key text not null references public.student_data_processing_purposes(purpose_key),
  source_observation_id uuid not null references public.student_signal_observations(id) on delete cascade,
  observed_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, signal_key),
  foreign key (signal_key, schema_version)
    references public.signal_schema_versions(signal_key, schema_version) on delete restrict
);
create index if not exists student_signal_current_signal_idx
  on public.student_signal_current(signal_key, updated_at desc);

create table if not exists public.student_signal_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  signal_key text not null references public.signal_definitions(signal_key) on delete restrict,
  schema_version integer not null,
  value jsonb not null,
  confidence numeric(5,4) check (confidence is null or confidence between 0 and 1),
  purpose_key text not null references public.student_data_processing_purposes(purpose_key),
  source_observation_id uuid not null references public.student_signal_observations(id) on delete restrict,
  observed_at timestamptz not null,
  captured_at timestamptz not null default now(),
  foreign key (signal_key, schema_version)
    references public.signal_schema_versions(signal_key, schema_version) on delete restrict
);
create index if not exists student_signal_history_user_time_idx
  on public.student_signal_history(user_id, captured_at desc);
create index if not exists student_signal_history_user_signal_time_idx
  on public.student_signal_history(user_id, signal_key, captured_at desc);

create table if not exists public.signal_processing_outbox (
  id uuid primary key default gen_random_uuid(),
  event_kind text not null check (event_kind in ('learning_event_received','signal_observed','signal_recomputed','engine_requested')),
  user_id uuid references auth.users(id) on delete cascade,
  signal_key text references public.signal_definitions(signal_key) on delete restrict,
  observation_id uuid references public.student_signal_observations(id) on delete cascade,
  engine_key text references public.engine_registry(engine_key) on delete restrict,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  idempotency_key text not null unique,
  processing_status text not null default 'pending'
    check (processing_status in ('pending','processing','completed','failed','dead_letter','cancelled')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  completed_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now()
);
create index if not exists signal_processing_outbox_ready_idx
  on public.signal_processing_outbox(available_at, created_at)
  where processing_status in ('pending','failed');

create table if not exists public.engine_run_signal_inputs (
  id bigint generated always as identity primary key,
  engine_run_id uuid not null references public.engine_runs(id) on delete cascade,
  signal_key text not null references public.signal_definitions(signal_key) on delete restrict,
  schema_version integer not null,
  signal_observation_id uuid references public.student_signal_observations(id) on delete set null,
  input_requirement text not null check (input_requirement in ('required','optional')),
  was_present boolean not null,
  value_snapshot jsonb,
  missing_reason text,
  captured_at timestamptz not null default now(),
  foreign key (signal_key, schema_version)
    references public.signal_schema_versions(signal_key, schema_version) on delete restrict,
  check ((was_present and value_snapshot is not null and missing_reason is null)
      or (not was_present and value_snapshot is null and missing_reason is not null))
);
create index if not exists engine_run_signal_inputs_run_idx
  on public.engine_run_signal_inputs(engine_run_id, signal_key);

-- Schema and engine contracts are immutable once published. Create a new version.
create or replace function public.reject_versioned_contract_mutation()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  raise exception 'Published contracts are immutable; create a new version';
end;
$$;

drop trigger if exists signal_schema_versions_immutable on public.signal_schema_versions;
create trigger signal_schema_versions_immutable
before update or delete on public.signal_schema_versions
for each row execute function public.reject_versioned_contract_mutation();

drop trigger if exists engine_contract_versions_immutable on public.engine_contract_versions;
create trigger engine_contract_versions_immutable
before update or delete on public.engine_contract_versions
for each row execute function public.reject_versioned_contract_mutation();

-- Keep all signal evidence immutable. Corrections are new observations.
create or replace function public.reject_signal_history_mutation()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  raise exception 'Signal evidence is immutable; append a corrected observation';
end;
$$;

drop trigger if exists student_signal_observations_immutable on public.student_signal_observations;
create trigger student_signal_observations_immutable
before update on public.student_signal_observations
for each row execute function public.reject_signal_history_mutation();

drop trigger if exists student_signal_history_immutable on public.student_signal_history;
create trigger student_signal_history_immutable
before update on public.student_signal_history
for each row execute function public.reject_signal_history_mutation();

-- Materialize each accepted observation as current state + immutable history + outbox event.
create or replace function public.materialize_student_signal_observation()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  insert into public.student_signal_history(
    user_id, signal_key, schema_version, value, confidence, purpose_key,
    source_observation_id, observed_at
  ) values (
    new.user_id, new.signal_key, new.schema_version, new.value, new.confidence,
    new.purpose_key, new.id, new.observed_at
  );

  insert into public.student_signal_current(
    user_id, signal_key, schema_version, value, confidence, purpose_key,
    source_observation_id, observed_at, updated_at
  ) values (
    new.user_id, new.signal_key, new.schema_version, new.value, new.confidence,
    new.purpose_key, new.id, new.observed_at, now()
  )
  on conflict (user_id, signal_key) do update set
    schema_version = excluded.schema_version,
    value = excluded.value,
    confidence = excluded.confidence,
    purpose_key = excluded.purpose_key,
    source_observation_id = excluded.source_observation_id,
    observed_at = excluded.observed_at,
    updated_at = now()
  where excluded.observed_at >= public.student_signal_current.observed_at;

  insert into public.signal_processing_outbox(
    event_kind, user_id, signal_key, observation_id, payload, idempotency_key
  ) values (
    'signal_observed', new.user_id, new.signal_key, new.id,
    jsonb_build_object('signal_key',new.signal_key,'schema_version',new.schema_version),
    'signal-observed:' || new.id::text
  ) on conflict (idempotency_key) do nothing;

  return new;
end;
$$;

drop trigger if exists student_signal_observation_materialize on public.student_signal_observations;
create trigger student_signal_observation_materialize
after insert on public.student_signal_observations
for each row execute function public.materialize_student_signal_observation();

create or replace function public.record_student_progress_checkin(
  p_user_id uuid,
  p_submission_key text,
  p_confidence_score smallint default null,
  p_motivation_score smallint default null,
  p_perceived_barriers text[] default '{}',
  p_reflection_text text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $
declare
  v_checkin_id uuid;
  v_existing public.student_progress_checkins%rowtype;
begin
  if p_submission_key is null or length(p_submission_key) < 8 or length(p_submission_key) > 120 then
    raise exception 'A valid check-in idempotency key is required';
  end if;
  if p_confidence_score is null and p_motivation_score is null
     and coalesce(cardinality(p_perceived_barriers),0)=0
     and nullif(trim(p_reflection_text),'') is null then
    raise exception 'At least one check-in response is required';
  end if;

  select * into v_existing
  from public.student_progress_checkins
  where user_id=p_user_id and submission_key=p_submission_key
  for update;

  if found then
    if v_existing.confidence_score is distinct from p_confidence_score
       or v_existing.motivation_score is distinct from p_motivation_score
       or v_existing.perceived_barriers is distinct from coalesce(p_perceived_barriers,'{}')
       or v_existing.reflection_text is distinct from p_reflection_text then
      raise exception 'Check-in idempotency key was reused with different answers';
    end if;
    v_checkin_id := v_existing.id;
  else
    insert into public.student_progress_checkins(
      user_id,confidence_score,motivation_score,perceived_barriers,reflection_text,
      capture_source,submission_key
    ) values (
      p_user_id,p_confidence_score,p_motivation_score,coalesce(p_perceived_barriers,'{}'),
      p_reflection_text,'in_app',p_submission_key
    ) returning id into v_checkin_id;
  end if;

  if p_confidence_score is not null then
    insert into public.student_signal_observations(
      user_id,signal_key,schema_version,source_key,value,confidence,purpose_key,
      provenance,observed_at,idempotency_key
    ) values (
      p_user_id,'student.confidence',1,'progress-checkin',to_jsonb(p_confidence_score),
      1.0,'personalized_learning',
      jsonb_build_object('checkin_id',v_checkin_id,'method','student_self_report'),
      coalesce(v_existing.captured_at,now()),
      'progress-checkin:'||v_checkin_id::text||':confidence'
    ) on conflict (user_id,idempotency_key) do nothing;
  end if;

  if p_motivation_score is not null then
    insert into public.student_signal_observations(
      user_id,signal_key,schema_version,source_key,value,confidence,purpose_key,
      provenance,observed_at,idempotency_key
    ) values (
      p_user_id,'student.motivation_score',1,'progress-checkin',to_jsonb(p_motivation_score),
      1.0,'personalized_learning',
      jsonb_build_object('checkin_id',v_checkin_id,'method','student_self_report'),
      coalesce(v_existing.captured_at,now()),
      'progress-checkin:'||v_checkin_id::text||':motivation'
    ) on conflict (user_id,idempotency_key) do nothing;
  end if;

  return v_checkin_id;
end;
$$;

revoke all on function public.record_student_progress_checkin(uuid,text,smallint,smallint,text[],text) from public,anon,authenticated;
grant execute on function public.record_student_progress_checkin(uuid,text,smallint,smallint,text[],text) to service_role;

-- Raw learning events are durable evidence. The outbox handoff is in the same
-- transaction so accepted telemetry cannot be lost between storage and processing.
create or replace function public.enqueue_learning_event_for_signal_processing()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  insert into public.signal_processing_outbox(
    event_kind,user_id,payload,idempotency_key
  ) values (
    'learning_event_received',new.user_id,
    jsonb_build_object(
      'learning_event_id',new.id,
      'event_type',new.event_type,
      'session_id',new.session_id,
      'session_item_id',new.session_item_id,
      'question_id',new.question_id,
      'schema_version',new.schema_version
    ),
    'learning-event:' || new.id::text
  ) on conflict (idempotency_key) do nothing;
  return new;
end;
$$;

drop trigger if exists learning_event_signal_outbox on public.learning_events;
create trigger learning_event_signal_outbox
after insert on public.learning_events
for each row execute function public.enqueue_learning_event_for_signal_processing();

-- Registry metadata is internal. Learners can only read their own projected signals.
do $$
declare t text;
begin
  foreach t in array array[
    'signal_definitions','signal_schema_versions','signal_source_registry',
    'engine_contract_versions','signal_engine_subscriptions','signal_processing_outbox',
    'engine_run_signal_inputs'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
  foreach t in array array[
    'student_signal_observations','student_signal_current','student_signal_history'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end;
$$;

grant select on public.student_signal_current, public.student_signal_history to authenticated;
create policy "Students read own current signals"
  on public.student_signal_current for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Students read own signal history"
  on public.student_signal_history for select to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.signal_definitions is
  'Canonical registry of semantic learner signals. Register new signals here; do not hard-code engine-to-table coupling.';
comment on table public.signal_schema_versions is
  'Immutable, versioned JSON Schema contracts for signal values. Never silently change a signal meaning.';
comment on table public.student_signal_observations is
  'Append-only normalized signal evidence with source, purpose, provenance, confidence and schema version.';
comment on table public.student_signal_current is
  'Latest accepted projection per learner and signal; rebuilt from immutable observations.';
comment on table public.student_signal_history is
  'Append-only history of signal values and schema versions.';
comment on table public.signal_processing_outbox is
  'Transactional outbox for reliable, idempotent asynchronous signal and engine processing.';
comment on table public.engine_contract_versions is
  'Versioned engine input/output contracts; records required and optional signal expectations.';
comment on table public.signal_engine_subscriptions is
  'Declarative mapping from registered signals to engine contract versions and trigger modes.';
comment on table public.engine_run_signal_inputs is
  'Exact signal versions and values (or missing reasons) consumed by each engine run.';

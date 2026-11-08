-- Sabi official JAMB syllabus ingestion and objective mapping foundation v1.
-- Additive only: no existing syllabus or question-bank rows are promoted or rewritten.
begin;

alter table public.jamb_syllabus_versions
  add column if not exists source_document_sha256 text,
  add column if not exists source_retrieved_at timestamptz,
  add column if not exists source_published_label text,
  add column if not exists source_metadata jsonb not null default '{}'::jsonb,
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists notes text;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.jamb_syllabus_versions'::regclass and conname='jamb_syllabus_versions_source_hash_check') then
    alter table public.jamb_syllabus_versions add constraint jamb_syllabus_versions_source_hash_check
      check (source_document_sha256 is null or source_document_sha256 ~ '^[a-f0-9]{64}$');
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.jamb_syllabus_versions'::regclass and conname='jamb_syllabus_versions_source_metadata_object_check') then
    alter table public.jamb_syllabus_versions add constraint jamb_syllabus_versions_source_metadata_object_check
      check (jsonb_typeof(source_metadata)='object');
  end if;
end $$;

alter table public.jamb_topics
  add column if not exists section_code text,
  add column if not exists section_title text,
  add column if not exists content_notes text,
  add column if not exists source_page integer;

alter table public.jamb_syllabus_objectives
  add column if not exists source_page integer,
  add column if not exists objective_group text;

create table if not exists public.jamb_syllabus_general_objectives (
  id uuid primary key default gen_random_uuid(),
  syllabus_version_id uuid not null references public.jamb_syllabus_versions(id) on delete restrict,
  objective_code text,
  objective_text text not null,
  sort_order integer not null default 0,
  source_page integer,
  verification_status text not null default 'draft' check (verification_status in ('draft','verified','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jamb_syllabus_content_items (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.jamb_topics(id) on delete restrict,
  syllabus_version_id uuid not null references public.jamb_syllabus_versions(id) on delete restrict,
  item_type text not null default 'content' check (item_type in ('content','note','example','scripture_reference','recommended_text')),
  item_text text not null,
  sort_order integer not null default 0,
  source_page integer,
  verification_status text not null default 'draft' check (verification_status in ('draft','verified','retired')),
  source_label text not null default 'ibass_import',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jamb_syllabus_import_batches (
  id uuid primary key default gen_random_uuid(),
  subject_slug text not null references public.jamb_subjects(slug) on update cascade on delete restrict,
  version_id uuid references public.jamb_syllabus_versions(id) on delete restrict,
  source_url text not null,
  source_document_sha256 text,
  source_retrieved_at timestamptz not null default now(),
  source_published_label text,
  importer_version text not null,
  status text not null default 'received' check (status in ('received','parsed','needs_review','approved','published','rejected','failed')),
  parsed_record_count integer not null default 0 check (parsed_record_count >= 0),
  accepted_record_count integer not null default 0 check (accepted_record_count >= 0),
  rejected_record_count integer not null default 0 check (rejected_record_count >= 0),
  validation_report jsonb not null default '{}'::jsonb check (jsonb_typeof(validation_report)='object'),
  created_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_document_sha256 is null or source_document_sha256 ~ '^[a-f0-9]{64}$')
);

create table if not exists public.jamb_syllabus_import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.jamb_syllabus_import_batches(id) on delete cascade,
  record_type text not null check (record_type in ('general_objective','section','topic','content_item','objective','recommended_text')),
  external_key text not null,
  parent_external_key text,
  sort_order integer not null default 0,
  source_page integer,
  raw_text text,
  raw_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(raw_payload)='object'),
  validation_status text not null default 'pending' check (validation_status in ('pending','valid','invalid','duplicate','accepted','rejected')),
  validation_errors jsonb not null default '[]'::jsonb check (jsonb_typeof(validation_errors)='array'),
  published_record_id uuid,
  created_at timestamptz not null default now(),
  unique (batch_id, record_type, external_key)
);

create table if not exists public.question_objective_mappings (
  id uuid primary key default gen_random_uuid(),
  question_id text not null references public.question_bank(id) on delete cascade,
  objective_id uuid not null references public.jamb_syllabus_objectives(id) on delete restrict,
  mapping_method text not null check (mapping_method in ('human','exact_topic','rule_based','semantic','ai_suggested')),
  confidence numeric(5,4) not null default 0 check (confidence between 0 and 1),
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected')),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  reviewer_user_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, objective_id)
);

create index if not exists jamb_syllabus_general_objectives_version_idx on public.jamb_syllabus_general_objectives(syllabus_version_id,sort_order);
create index if not exists jamb_syllabus_content_items_topic_idx on public.jamb_syllabus_content_items(topic_id,sort_order);
create index if not exists jamb_syllabus_import_batches_subject_status_idx on public.jamb_syllabus_import_batches(subject_slug,status,created_at desc);
create index if not exists jamb_syllabus_import_rows_batch_status_idx on public.jamb_syllabus_import_rows(batch_id,validation_status,sort_order);
create index if not exists question_objective_mappings_question_status_idx on public.question_objective_mappings(question_id,review_status);
create index if not exists question_objective_mappings_objective_status_idx on public.question_objective_mappings(objective_id,review_status);

create unique index if not exists jamb_syllabus_objectives_version_code_uidx
  on public.jamb_syllabus_objectives(syllabus_version_id,objective_code)
  where syllabus_version_id is not null and objective_code is not null;

alter table public.jamb_syllabus_general_objectives enable row level security;
alter table public.jamb_syllabus_content_items enable row level security;
alter table public.jamb_syllabus_import_batches enable row level security;
alter table public.jamb_syllabus_import_rows enable row level security;
alter table public.question_objective_mappings enable row level security;

revoke all on public.jamb_syllabus_general_objectives,public.jamb_syllabus_content_items,
  public.jamb_syllabus_import_batches,public.jamb_syllabus_import_rows,public.question_objective_mappings
from public,anon,authenticated;
grant all on public.jamb_syllabus_general_objectives,public.jamb_syllabus_content_items,
  public.jamb_syllabus_import_batches,public.jamb_syllabus_import_rows,public.question_objective_mappings
to service_role;

comment on table public.jamb_syllabus_import_batches is
  'Auditable imports of official JAMB IBASS syllabus documents. A parsed batch is not verified until human review approves it.';
comment on table public.jamb_syllabus_import_rows is
  'Staging records preserve parsed source text and source page references before publication to canonical syllabus tables.';
comment on table public.question_objective_mappings is
  'Question-to-syllabus-objective links. Only approved mappings may power objective mastery, recommendations or coverage reports.';
comment on column public.jamb_syllabus_versions.source_document_sha256 is
  'SHA-256 of the exact source PDF bytes; required evidence for a verified source release.';
comment on column public.jamb_topics.content_notes is
  'Verbatim JAMB syllabus content/notes for this topic; do not replace with generated explanations.';

commit;
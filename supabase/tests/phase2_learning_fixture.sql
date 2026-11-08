-- Minimal question-bank table needed to exercise learning migrations in disposable CI PostgreSQL.
create table if not exists public.question_bank (
  id text primary key,
  exam_type text,
  subject text not null,
  topic text,
  subtopic text,
  year integer,
  question text not null,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  answer text not null,
  source text not null default 'CI fixture',
  explanation text,
  explanation_short text,
  difficulty text default 'medium',
  status text default 'ai-draft'
);

-- Minimal Phase 1.4 catalogue structures used by the additive Phase 1.5 migration.
create table if not exists public.jamb_syllabus_versions (
  id uuid primary key default gen_random_uuid(),
  subject_slug text not null references public.jamb_subjects(slug),
  version_label text not null,
  syllabus_year integer,
  source_url text,
  verification_status text not null default 'draft',
  effective_from date,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.jamb_subtopics (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.jamb_topics(id) on delete cascade,
  slug text not null,
  name text not null,
  verification_status text not null default 'draft',
  source_label text not null default 'manual',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(topic_id, slug)
);

-- A synthetic source row lets the Phase 1.5 provenance seed be tested.
insert into public.question_bank (id, subject, topic, question, option_a, option_b, option_c, option_d, answer, source, status)
values ('phase15-provenance-fixture','Biology','Provenance fixture','Which cell structure contains DNA?','Nucleus','Ribosome','Cell wall','Vacuole','A','CI fixture source','ai-draft')
on conflict (id) do nothing;

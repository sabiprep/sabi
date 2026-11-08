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
  explanation text,
  explanation_short text,
  difficulty text default 'medium',
  status text default 'ai-draft'
);

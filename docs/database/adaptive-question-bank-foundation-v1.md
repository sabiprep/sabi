# Sabi Adaptive Question Bank — Database Foundation v1

Status: design and implementation blueprint. This document is not an applied database migration.

## 1. Production baseline (read-only audit, 2026-11-08)

- Supabase project: `sabi` (`dnrzixaasphxiswjyglj`), PostgreSQL 17.
- 47 public tables; RLS is enabled on all 47.
- `public.question_bank`: 3,740 rows.
- `public.jamb_subjects`: 25 subjects; current question bank has four subjects: Chemistry (1,043), Biology (997), C.R.S (995), Use of English (705).
- Topic/subtopic catalogue: 809 topics and 3,006 subtopics.
- `question_bank` has text IDs, source/topic/subtopic foreign keys, difficulty, status, review_status, concepts and content_fingerprint.
- `question_sources` has source identity, type, URL, license_name, attribution_required, permitted_use and verification_status.
- ALOC-labelled records exist, but source rows currently have `source_type=other`, no license name, `permitted_use=unknown`, and `verification_status=unverified`. This is not proof that the question content is incorrect; it means the evidence is not recorded in the database.
- Existing `learning_sessions`, `learning_session_items`, `learning_events`, `student_topic_mastery` and `student_topic_mastery_history` are present but have zero rows at audit time.
- Existing session items store a current selected answer and correctness, but this is not a durable, append-only attempt history.
- Existing `jamb_syllabus_versions` and `jamb_syllabus_objectives` have zero rows. Objective-level adaptation must not be enabled until syllabus objectives are imported and checked.
- Difficulty values currently include inconsistent casing. Normalize in application/query logic first; perform a controlled data migration only after validating all distinct values and consumers.
- Existing RLS policies on the learning tables are mostly SELECT-only. Client-side answer submission must not be enabled by broad direct table writes.

## 2. Design principles

1. Preserve `question_bank` as the canonical source of existing question content for this release. Do not rename, drop or rewrite it.
2. Preserve source question text and answer keys. A generated variant is a separate question row and must point back to its parent/variant group.
3. Separate three independent dimensions:
   - source authenticity (where the item came from and how it was retrieved);
   - content verification (whether question, answer, explanation and difficulty were checked);
   - reuse rights (whether Sabi may store, adapt and distribute it).
4. Keep every submitted attempt immutable. Store current mastery as a projection that can be recalculated from attempt history.
5. Store explicit difficulty labels: `foundation`, `standard`, `challenge`. Keep legacy difficulty values mapped during transition; never silently reinterpret the original source value.
6. Adaptive practice can move difficulty up or down. Timed JAMB/CBT simulation must keep its exam blueprint fixed and must not adapt difficulty mid-exam.
7. Human-reviewed answer keys are authoritative. AI can draft variants and explanations but cannot grade, change an answer key, update mastery, or change score/readiness/payment state.
8. Do not spend provider credits until an import/generation batch records input, output, validation outcome, retry count and actual cost.

## 3. Existing tables to reuse

- Academic catalogue: `jamb_subjects`, `jamb_topics`, `jamb_subtopics`, `jamb_syllabus_versions`, `jamb_syllabus_objectives`.
- Question content: `question_bank`, `question_sources`, `question_review_history`.
- Session context: `learning_sessions`, `learning_session_items`, `learning_events`.
- Current topic mastery projection: `student_topic_mastery`, `student_topic_mastery_history`.
- Identity: `profiles` (verify its relationship to `auth.users` before relying on it for RLS ownership).

Do not create parallel subject/topic tables or a replacement question table in v1.

## 4. Additive tables proposed

### 4.1 `question_variant_groups`

One group represents one learning concept/objective and its alternative question forms.

- `id uuid primary key`
- `subject_slug text not null references jamb_subjects(slug)`
- `topic_id uuid references jamb_topics(id)`
- `subtopic_id uuid references jamb_subtopics(id)`
- `objective_id uuid references jamb_syllabus_objectives(id)`
- `concept_key text not null`
- `group_kind text not null` — e.g. `same_concept`, `remediation`, `extension`
- `created_at timestamptz not null default now()`
- `created_by uuid` — server/admin actor where available

At least one of topic, subtopic or objective must be present. Objective is nullable until the syllabus is loaded.

### 4.2 `question_variant_members`

Maps existing or newly generated `question_bank` rows into a variant group.

- `id uuid primary key`
- `group_id uuid not null references question_variant_groups(id)`
- `question_id text not null references question_bank(id)`
- `difficulty_level text not null check in ('foundation','standard','challenge')`
- `variant_role text not null` — `original`, `simplified`, `parallel`, `extension`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`
- unique `(group_id, question_id)`

Use a partial unique index to prevent two active members at the same difficulty in the same group only if product rules require one canonical item per level. Otherwise allow multiple questions per level and select by exposure/quality.

### 4.3 `question_attempts`

Append-only record for each final submission, including repeated attempts at the same item.

- `id uuid primary key`
- `user_id uuid not null`
- `session_id uuid references learning_sessions(id)`
- `session_item_id uuid references learning_session_items(id)`
- `question_id text not null references question_bank(id)`
- `variant_group_id uuid references question_variant_groups(id)`
- `selected_option text`
- `is_correct boolean not null`
- `elapsed_ms integer check (elapsed_ms is null or elapsed_ms >= 0)`
- `active_elapsed_ms integer check (active_elapsed_ms is null or active_elapsed_ms >= 0)`
- `hint_count integer not null default 0 check (hint_count >= 0)`
- `answer_change_count integer not null default 0 check (answer_change_count >= 0)`
- `attempt_number integer not null default 1 check (attempt_number > 0)`
- `attempted_at timestamptz not null default now()`
- `grading_source text not null default 'stored_answer_key'`
- `answer_key_version text` — optional content version/fingerprint at time of attempt
- `metadata jsonb not null default '{}'`

Unique idempotency key should be based on a client-generated submission UUID, not on question/user/time. Clients must not be able to set `is_correct` or `grading_source`; grade in a trusted server-side path against the stored answer key. Deny UPDATE and DELETE to student roles.

### 4.4 `adaptive_decisions`

Auditable record of why a practice engine selected the next question/difficulty.

- `id uuid primary key`
- `user_id uuid not null`
- `session_id uuid references learning_sessions(id)`
- `trigger_attempt_id uuid references question_attempts(id)`
- `variant_group_id uuid references question_variant_groups(id)`
- `previous_difficulty text`
- `selected_difficulty text not null check in ('foundation','standard','challenge')`
- `selected_question_id text references question_bank(id)`
- `decision_reason text not null`
- `evidence jsonb not null default '{}'` — recent accuracy, response-time band, hints, sample size and recency
- `engine_version text not null`
- `created_at timestamptz not null default now()`

### 4.5 `student_objective_mastery`

Current mastery projection at the learning-objective level. Do not populate until verified objectives exist.

- `user_id uuid not null`
- `objective_id uuid not null references jamb_syllabus_objectives(id)`
- `mastery_score numeric(5,2) not null default 0 check between 0 and 100`
- `confidence numeric(5,2) not null default 0 check between 0 and 100`
- `attempt_count integer not null default 0`
- `correct_count integer not null default 0`
- `last_attempted_at timestamptz`
- `next_review_at timestamptz`
- `updated_at timestamptz not null default now()`
- primary key `(user_id, objective_id)`

### 4.6 `question_generation_jobs`

Tracks ingestion and generation batches, including cost and validation.

- `id uuid primary key`
- `provider text not null`
- `model text`
- `job_type text not null` — `archive_import`, `variant_generation`, `validation`
- `subject_slug text references jamb_subjects(slug)`
- `objective_id uuid references jamb_syllabus_objectives(id)`
- `source_id uuid references question_sources(id)`
- `status text not null`
- `prompt_version text`
- `requested_count integer not null default 0`
- `accepted_count integer not null default 0`
- `rejected_count integer not null default 0`
- `input_tokens bigint`
- `output_tokens bigint`
- `credits_used numeric(14,4)`
- `retry_count integer not null default 0`
- `validation_report jsonb not null default '{}'`
- `created_at timestamptz not null default now()`
- `completed_at timestamptz`

Never store provider API secrets in this table or in source control.

### 4.7 `question_source_evidence`

Records the exact source/archive reference and evidence independently from the reusable source catalogue.

- `id uuid primary key`
- `question_id text not null references question_bank(id)`
- `source_id uuid not null references question_sources(id)`
- `external_reference text` — provider question ID, archive key, original URL or document locator
- `retrieved_at timestamptz`
- `authenticity_status text not null default 'unverified'`
- `content_verification_status text not null default 'unreviewed'`
- `rights_status text not null default 'unknown'`
- `evidence jsonb not null default '{}'`
- `created_at timestamptz not null default now()`

This preserves evidence where a source can be authentic while its content or reuse rights remain unchecked.

## 5. Adaptive selection rules v1

Only adaptive practice uses these rules.

- Begin at the student's estimated level for the target concept; otherwise start at `standard`.
- One incorrect answer is not enough to permanently lower difficulty.
- If the student misses the same concept repeatedly, select a `foundation` item from the same variant group and offer a short lesson/remediation step.
- If the student answers correctly with substantial hints or repeated answer changes, keep the current level and collect more evidence.
- Increase one level only after a minimum evidence window (suggested: at least 3 recent attempts, >=80% correct, no hint dependence). This is a tunable rule, not a hard-coded universal truth.
- Use response time as supporting evidence, not as the sole grading signal.
- Avoid immediately repeating the exact same question; select a parallel variant where possible.
- If no valid variant exists, do not invent a question inline. Continue with a same-level item and enqueue generation for later review.
- Never adapt during a timed CBT/JAMB simulation. Keep the exam blueprint and scoring fixed.

## 6. Security and access model

- All new public-schema tables must have RLS enabled.
- Student SELECT policies must be ownership-scoped using `auth.uid() = user_id` (or an explicitly verified profile mapping).
- Student roles must not directly INSERT trusted grading fields, UPDATE or DELETE attempt history, approve questions, edit source rights, or change mastery projections.
- Submit/grade attempts through a trusted backend function or Edge Function. The function validates the authenticated user, session ownership, question publication state and stored answer key, then writes the attempt and updates projections transactionally.
- Admin/content-manager policies must be based on a trusted role claim in `app_metadata` or a server-side authorization table; never trust user-editable `user_metadata`.
- Keep generation jobs, provider usage and rights-evidence writes server-only.
- Recheck all policies and grants after implementation. RLS enabled without policies is not an access model.

## 7. Migration and rollout sequence

1. Reconcile migration history with the 16 migration files on `main` and the 14 migrations recorded in production. Inspect the two missing migration records and determine whether their schema objects already exist before applying anything.
2. Add new tables and indexes additively. No destructive alterations to `question_bank`.
3. Add RLS and explicit grants/policies based on the access model above.
4. Add a trusted attempt-submission/grading path; test that clients cannot forge correctness.
5. Import verified syllabus versions/objectives before objective-level mastery or generation is enabled.
6. Backfill source evidence and normalize difficulty through a reversible mapping; retain original raw values.
7. Create variant groups from concept/topic matches only where the match is reliable. Do not automatically group every question sharing a broad topic.
8. Seed and validate a small pilot batch before scaling archive ingestion or using provider credits.
9. Run advisor checks, test student/admin/service-role access, verify idempotency, and confirm rollback/recovery plan before production rollout.

## 8. Acceptance criteria

- Existing 3,740 question rows and their IDs/content/answer keys remain unchanged by the foundation migration.
- Every new question can be traced to a source record and an explicit content/reuse-rights status.
- A student submission is graded server-side against the stored answer key and creates an immutable attempt record.
- Adaptive decisions are reproducible from stored evidence and engine version.
- A missed concept can select a lower-difficulty sibling; repeated strong performance can select a higher-difficulty sibling.
- Timed CBT mode never changes the exam difficulty distribution mid-session.
- No student can read or write another student's attempts, mastery or decisions.
- Generation jobs record actual credit usage and validation results.
- All migrations, policies and queries pass verification before production release.

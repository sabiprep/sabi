# Sabi Question Intelligence Architecture v1.0

Status: product decisions approved; implementation contract finalized; codebase audit completed 2026-11-08.

## 1. Approved product decisions

- Blitz: hybrid feed (personalized weakness/revision ranking balanced with syllabus discovery).
- Question variants: AI-generated, processed asynchronously and reviewed before publication.
- CBT: strict exam simulation; fixed paper and blueprint for the entire session.
- Custom Practice: student-controlled filters; never silently override selected filters.
- Smart Practice: adaptive selection based on learning evidence and verified concept/variant relationships.

## 2. System boundary

One canonical question bank and content-engineering pipeline serve four independent selectors. All four modes submit to one trusted attempt/learning-event pipeline and one student learning state.

Question Engineering owns content quality and structure: ingestion, taxonomy, concept mapping, difficulty classification, provenance/rights evidence, duplicate detection, variant generation, validation and review lifecycle. It does not rank a student's next question.

Mode selectors own retrieval policy:
- Blitz Feed Selector: hybrid relevance + discovery ranking.
- CBT Exam Assembler: exam configuration/blueprint assembly, deterministic fixed paper.
- Custom Selector: exact user-specified filters and explicit fallback behavior.
- Smart Practice Selector: mastery/evidence-driven adaptive next-question selection.

Shared learning services own trusted grading, immutable attempts/events, mastery projections, spaced review, recommendations and analytics. AI Coach is a separate explanation/tutoring capability; it does not grade or update mastery.

## 3. Mode contracts

### Blitz
Input: authenticated student, selected subject(s), feed cursor, optional session context.
Ranking signals: low mastery/weak topics, due review, recent incorrect evidence, syllabus discovery/coverage, difficulty fit, freshness and exposure history.
Policy: hybrid feed, not arbitrary random; avoid immediate exact repeats; enforce variety and a configurable discovery floor. Personalization must not starve unseen syllabus concepts.
Output: question + opaque continuation cursor + reason category for telemetry. Do not expose answer key before submission.

### CBT
Input: exam type/year/configuration, subject combination, blueprint version.
Assembler: validate configuration, enforce section counts/subject constraints, sample only eligible published/reviewed questions, persist exact ordered question IDs and blueprint snapshot.
Policy: fixed paper, fixed duration/scoring, no adaptive replacement or difficulty changes after start. No AI explanation during timed session. Results can feed learning intelligence after submission.
Fail closed if the eligible pool cannot satisfy the blueprint; report shortage by section.

### Custom Practice
Input: explicit subject, topic/subtopic, difficulty, year, question count and supported question type.
Policy: filters are authoritative. If insufficient inventory, return a clear shortage and available count; do not broaden filters silently. All completed attempts still feed shared learning state.
Output: stable session snapshot and applied-filter summary.

### Smart Practice
Input: student learning state, target subject/topic if specified, available verified variants, recent exposure.
Policy: choose the next question based on evidence, mastery, confidence, due review, hints, answer changes, recency and response-time bands. One wrong answer cannot permanently lower difficulty. Difficulty changes require a minimum evidence window and must remain within the same learning objective/concept when possible.
Fallback: if no approved variant exists, select a suitable approved question at the current level and enqueue variant generation; never invent a live question.

## 4. Question and variant lifecycle

1. Ingest original item with source evidence.
2. Map subject, verified syllabus version, topic/subtopic and learning objective where available.
3. Identify a precise concept key; broad topic equality alone is insufficient for variant grouping.
4. Queue AI generation job with provider/model/prompt version, requested count and cost controls.
5. Generate parallel/remediation/extension variants asynchronously.
6. Validate schema, answer-option integrity, unambiguous wording, solution correctness, concept equivalence, difficulty and duplicate similarity.
7. Human/content reviewer approves or rejects. Only approved, rights-cleared, published items are eligible for student delivery.
8. Store variant membership and full provenance. Preserve the original question and answer key.

AI may draft content and validation evidence. The stored, reviewed answer key remains authoritative. AI cannot grade a student, alter an answer key, publish its own unreviewed output, or update mastery/readiness/XP/payment state.

## 5. Shared learning data contract

Every submitted answer must pass through a trusted server-side grading transaction:
- authenticate user and verify session ownership/status;
- verify question is in that session and eligible;
- grade against the stored answer key;
- write an append-only attempt with a client submission idempotency key;
- write a learning event/outbox record;
- update mastery projection transactionally or through an idempotent worker;
- record selection/adaptive decision evidence separately.

Do not let clients write correctness, answer keys, mastery scores, confidence, XP or payment state. Student attempt history must be append-only. Distinguish accuracy, mastery and confidence. A session-item row is a current answer state, not a complete lifetime attempt ledger.

## 6. Existing database assets to reuse

- Content/taxonomy: question_bank, question_sources, question_review_history, jamb_subjects, jamb_topics, jamb_subtopics, jamb_syllabus_versions, jamb_syllabus_objectives.
- Session/event: learning_sessions, learning_session_items, learning_events.
- Existing topic mastery: student_topic_mastery and student_topic_mastery_history.
- New foundation: question_variant_groups, question_variant_members, question_attempts, adaptive_decisions, student_objective_mastery, question_generation_jobs, question_source_evidence.

Do not create four banks, parallel taxonomy tables, or duplicate mastery systems. Objective-level mastery remains disabled until verified syllabus objectives are imported.

## 7. Current codebase audit (main, 2026-11-08)

Verified observations:
- BackendLearningPage calls /api/learning/sessions and /answers for diagnostic, smart_practice, blitz, cbt and custom.
- The server has a separate CBT assembly path using active exam_configurations, the student's four registered subjects, published UTME questions, fixed section counts and an expiry timestamp.
- The non-CBT session path currently retrieves published questions and shuffles them. Smart Practice adds topic-mastery ranking and recent-question avoidance, but does not yet select through variant groups or persist adaptive_decisions.
- The current custom session API accepts subject/topic/topics/limit only. Difficulty and year filters are not yet part of its request contract.
- The visible BlitzPage and SmartPracticePage still build legacy level content from local SEED_QUESTIONS. They need to be migrated or explicitly retired in favor of the backend learning route.
- The existing question pool contains 3,740 records across four subjects (Chemistry, Biology, C.R.S, Use of English). This does not cover all likely UTME subject combinations.
- The syllabus version/objective tables were empty in the production audit. Objective-level selection/mastery cannot be treated as ready.
- New question-intelligence tables are service-role-only with RLS enabled and no student policies. Keep them behind trusted backend routes until a deliberate access model is implemented.
- The attempt-capture trigger fires on the first unanswered-to-answered transition of a session item. It does not capture repeated edits/submissions to the same session item. The current submit_learning_answer RPC is SECURITY INVOKER and is called by the server's service-role Supabase client; direct authenticated execution is revoked. Preserve that boundary.
- Trigger attempt_number uses max+1 and variant group selection takes the first active membership; both require deterministic concurrency/uniqueness hardening before production-scale use.
- Production migration history contains 17 entries through 20261108154801. Main also contains two older additive migrations (20261108121800 backend service foundations and 20261108122647 notification worker) that are not yet applied in production. They are outside this PR's diff. CI applies both to a disposable PostgreSQL database and runs their assertion suites successfully. Reconcile/apply them separately before the next production migration deployment; do not mark them applied without applying their SQL.
- PR #13 contains three additive question-intelligence migrations already applied and recorded in production, plus documentation. Merging this PR does not apply or reapply the two unrelated older migrations. Production migration drift remains a separate release gate.

## 8. Implementation sequence and acceptance criteria

### A. Stabilize database contract
- Reconcile production/main migration history and verify exact SQL parity.
- Harden attempt idempotency, repeat-attempt semantics and deterministic variant membership.
- Verify trigger capture with a controlled test user and confirm client roles cannot forge grading data.
- Review all new RLS/grants and existing advisor findings; do not add blanket policies.

### B. Question content readiness
- Import and verify syllabus versions/objectives.
- Audit question source authenticity, content correctness and reuse rights as separate statuses.
- Normalize difficulty through a reversible mapping; preserve raw source values.
- Define and test concept/variant grouping on a small reviewed pilot.

### C. Implement selectors
- Add explicit selector modules/contracts for Blitz, CBT, Custom and Smart Practice.
- Blitz: personalized/discovery hybrid ranking and exposure controls.
- CBT: blueprint-backed fixed paper and shortage tests.
- Custom: subject/topic/subtopic/difficulty/year/count filters with no silent fallback.
- Smart Practice: variant-aware adaptive choice with evidence thresholds and decision audit.

### D. Variant pipeline
- Add generation queue worker, prompt versioning, usage/cost accounting, validation and reviewer approval.
- Publish only reviewed and rights-cleared variants.
- Add retry, failure, duplicate and idempotency tests.

### E. Integration and verification
- Route visible mode screens to backend selectors; remove local seed question delivery from production learning paths.
- Verify all modes create sessions and immutable attempts and update the same student learning state.
- Add unit, integration and authorization tests for each mode.
- Keep Android compilation paused until separately requested.

Release gates:
- No existing question rows or answer keys changed by the foundation work.
- No student can read or modify another student's learning records.
- No unreviewed generated question is student-facing.
- CBT paper/order/configuration remains fixed after start.
- Every mode produces trusted attempt events and updates shared learning state.
- All migration history, CI tests and Supabase advisors are reconciled before production release.

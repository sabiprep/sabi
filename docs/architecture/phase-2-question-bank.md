# Sabi Phase 2 — Question Bank Infrastructure

**Workstreams:** 5 (question bank/provenance) and 6 (quality, validation, moderation and review)  
**Implementation branch:** `backend/phase2-question-bank-2026-11-07`  
**Target Supabase project:** `dnrzixaasphxiswjyglj` (`sabi`, eu-west-1)

## Goals

Provide a reliable, versioned and traceable question source. Prevent incomplete, incorrect, duplicated, unverified or flagged questions from entering practice and CBT.

## Live baseline profile (7 November 2026)

- 3,740 question rows.
- Legacy status distribution: 3,333 `ai-draft`, 3 `needs-review`, 404 `published`.
- All rows currently contain a question, four option fields, an answer key and a non-empty explanation.
- 171 repeated normalized question stems were observed in a first-pass stem-only comparison. This is a review signal, not proof of duplicate questions; subject, options and provenance must be considered.
- Legacy source labels are heterogeneous. A source label is not treated as evidence of authenticity.
- 3,740 topic and subtopic references exist from Phase 1, but imported taxonomy is still draft pending authoritative JAMB verification.

## Implemented in the Phase 2 branch

### Additive lifecycle schema

The timestamped migration `20261107100000_phase2_question_bank_lifecycle.sql` adds:

- `question_bank.current_version` and `question_bank.review_state`.
- `question_bank_versions`: immutable-content snapshots and SHA-256/MD5 integrity identifiers for revision tracking.
- `question_provenance`: source label, URL, attribution, evidence and explicit verification state.
- `question_review_events`: append-only review decisions and reviewer metadata.
- `question_flags`: student/staff issue reports and resolution state.
- `question_import_batches` and `question_import_rows`: auditable bulk-import receipts, validation errors and duplicate candidates.

Every existing question receives a version-1 snapshot and provenance record. Existing question content and legacy status values are preserved. Every existing row defaults to `pending_review`; legacy `published` does not mean approved.

### Server-side quality and review

- Shared Zod schema rejects unknown/protected fields, validates subject/taxonomy IDs, four distinct options, answer key, explanation and metadata.
- Normalized SHA-256 fingerprints support duplicate detection without deleting or auto-merging records.
- Dry-run import validation compares against the existing question bank and within-batch fingerprints, then persists row-level validation/duplicate reports without importing or changing questions.
- Review transitions are explicit and terminal retirement cannot be reversed.
- Atomic `review_question_bank_item` RPC writes the decision and history in one transaction.
- Approval requires reviewer attestations, complete content, a valid answer key, four distinct options, verified provenance and verified topic/subtopic taxonomy.
- `GET /api/question-bank/review-queue`, `GET /api/question-bank/flag-queue` and `GET /api/question-bank/:questionId` are restricted to content managers and administrators.
- `POST /api/question-bank/:questionId/review`, `POST /api/question-bank/flags/:flagId/resolve` and `POST /api/question-bank/import/validate` are restricted to content managers and administrators.
- `POST /api/question-bank/:questionId/flag` lets authenticated students report issues against the currently approved question version. Duplicate open flags from the same reporter/reason are blocked.
- `GET /api/question-bank/eligible` requires authentication and returns only fully approved, provenance-verified and taxonomy-verified questions. It never returns the answer key or explanation.

## Serving eligibility rule

A question is eligible only when all are true:

1. Legacy status is `published`.
2. Lifecycle review state is `approved`.
3. Provenance state is `verified`.
4. Topic and subtopic verification states are `verified`.
5. Topic and subtopic are active and correctly related.

The student-facing SQL function enforces this rule on the server. No client-supplied correctness, answer key, review state or verification status is accepted.

## Safety and rollout

- Phase 2 migration is committed to GitHub and CI only; it has **not** been applied to production.
- Existing question-bank rows are not deleted, replaced, corrected or bulk-rewritten.
- Baseline snapshots and provenance rows are additive and preserve legacy values.
- All Phase 2 operational tables are RLS-enabled and inaccessible to `anon` and `authenticated`; the server uses `service_role`.
- No question is automatically approved by migration, AI confidence, legacy `verified_by`, or legacy `published` status.
- Production migration requires separate explicit approval after CI and migration review.
- Bulk imports, AI generation and correction tools must create drafts and review events; they must not publish directly.

## Phase 2 exit gate

- [ ] Existing records profiled and provenance gaps visible.
- [ ] Migration applies cleanly and idempotently in disposable PostgreSQL.
- [ ] Every existing row has a baseline version and provenance record.
- [ ] Import validation and duplicate reporting tested.
- [ ] Approval gates reject invalid content and unverified source/taxonomy.
- [ ] Review history and flags are auditable.
- [ ] Student retrieval excludes all pending, rejected, flagged, retired or unverified questions.
- [ ] Content-manager authorization and answer-key isolation tests pass.
- [ ] Production migration is explicitly approved and applied.

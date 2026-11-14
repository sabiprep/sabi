# Sabi Phase 5 — JAMB Readiness and Exam Simulation

## Objective
Turn verified question-bank content and Phase 3–4 learning evidence into a reliable, timed UTME simulation and defensible readiness reporting.

## Release sequence
Phase 5 is stacked on Phase 4, which is stacked on Phase 3, Phase 2 and Phase 1. This branch is implementation-only. No merge, production migration or deployment is included.

## Initial vertical slice: trusted exam assembly
- Create a student-owned CBT learning session and an exam-run record.
- Freeze the chosen four-subject combination, exam configuration, question count, duration, start time and deadline.
- Select a balanced question allocation across the four selected subjects.
- Include only published, approved questions with verified provenance and active, verified topic/subtopic taxonomy.
- Pin each selected question to its immutable approved question version.
- Keep exam-run and item tables inaccessible to browser roles; privileged creation runs through a service-role-only RPC.
- Fail atomically when any selected subject lacks enough eligible questions. Never silently fill an exam with unverified or draft questions.

## Planned exam experience
1. Exam setup: choose a valid subject combination and a supported exam configuration.
2. Timed CBT: server-issued question order, answer persistence, navigation and a deadline enforced by the server.
3. Submission: score from the pinned immutable answer snapshots; persist attempts through the Phase 3 evidence path.
4. Results: total score, subject breakdown, accuracy, timing and topic-level strengths/gaps.
5. Readiness: evidence coverage and confidence first; any score estimate remains explicitly provisional until calibrated against representative, validated exam outcomes.

## Readiness model guardrails
- A readiness estimate is not a guarantee of a JAMB result or admission.
- No score prediction from draft/unverified questions or fabricated activity.
- Report evidence volume, subject coverage, syllabus coverage and confidence beside any estimate.
- Separate observed mock-exam score from forecast score.
- Do not label a student exam-ready based on one short practice session.

## Current implementation status
- [x] Isolated Phase 5 branch created from the Phase 4 implementation branch.
- [x] Exam-run and immutable question-set schema added.
- [x] Server-only exam assembly RPC added with verified-content gates and balanced subject allocation.
- [x] RLS, grants and SQL security assertions added.
- [x] Authenticated exam setup, creation, retrieval and answer-submission APIs.
- [x] Server deadline checks and automatic expiry handling.
- [x] Student timed CBT interface with question navigation and saved-answer state.
- [x] Exam submission and observed results with subject/topic performance breakdowns.
- [ ] Syllabus coverage and evidence-confidence reporting.
- [ ] Calibration study before any score predictor is enabled.
- [ ] Full Phase 1–5 CI and migration idempotency pass.
- [ ] Production rollout separately approved after migration-baseline reconciliation.


## API surface delivered
- `GET /api/jamb-exams/configurations` — active formats and allowed subject catalogue.
- `POST /api/jamb-exams/runs` — creates a student-owned timed exam from four distinct subjects, including compulsory Use of English.
- `GET /api/jamb-exams/runs/:runId` — retrieves the owner's exam, pinned question snapshots and saved answer state without exposing answer keys.
- `POST /api/jamb-exams/runs/:runId/questions/:questionId/answer` — persists an answer through the Phase 3 evidence path; rejects late answers and already-submitted questions.
- `POST /api/jamb-exams/runs/:runId/submit` — closes the exam and returns observed results, subject breakdowns and topic evidence.

The CBT interface is available at `/jamb-exam`, linked from the Custom JAMB Simulator. Submitted answers are locked in this first slice; answer editing/review-before-final-submit is a follow-up enhancement.

## Known guardrails
- The backend rejects a question if its currently approved version no longer matches the version pinned when the exam was assembled.
- The exam report displays observed performance only. It deliberately does not manufacture a JAMB score prediction or readiness label.
- Production currently has no verified topic/subtopic taxonomy in the baseline audit, so the strict eligibility gate may yield an empty mock paper until content verification is completed.

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
- [ ] Authenticated exam APIs and deadline-enforced answer submission.
- [ ] Student CBT interface and exam navigation.
- [ ] Results and subject-level performance analytics.
- [ ] Syllabus coverage and evidence-confidence reporting.
- [ ] Calibration study before any score predictor is enabled.
- [ ] Full Phase 1–5 CI and migration idempotency pass.
- [ ] Production rollout separately approved after migration-baseline reconciliation.

# Sabi Phase 3 — Learning Evidence and Topic Mastery

**Implementation branch:** `backend/phase3-learning-evidence-2026-11-07`  
**Base:** Phase 2 branch `backend/phase2-question-bank-2026-11-07`  
**Target Supabase project:** `dnrzixaasphxiswjyglj` (`sabi`)

## Goal

Turn verified practice activity into durable, explainable learning evidence. Phase 3 records sessions and server-evaluated attempts, then maintains topic/subtopic performance summaries that a later adaptive engine can consume.

## Included

- Authenticated learning sessions with explicit mode and lifecycle.
- Persistent attempts tied to the exact immutable question version, session, subject, topic and subtopic.
- Correctness calculated inside PostgreSQL from the approved version snapshot; client-supplied correctness and answer keys are never accepted.
- Idempotent attempt writes using a student-scoped event UUID. Reuse with different content is a conflict.
- Per-subtopic accuracy, smoothed mastery estimate, evidence confidence and a transparent mastery state.
- Session completion and student-scoped summary retrieval through the authenticated API.
- Verified Practice starts a session, records each submitted answer with response time and displays post-submit feedback from the trusted question-version snapshot.
- Student Topic Mastery dashboard at `/learning-progress` displays attempt volume, accuracy, mastery estimate and evidence confidence.
- Service-role-only database access; browser/mobile clients never access evidence tables directly.

## Mastery baseline

The first implementation uses a Beta(2,2) prior:
- accuracy = correct / attempts
- mastery estimate = (correct + 2) / (attempts + 4)
- evidence confidence = attempts / (attempts + 5)

A topic cannot be labelled mastered until at least five attempts. Thresholds are versioned in code and documented; later calibration must use observed outcomes rather than arbitrary AI confidence.

## API surface

- `POST /api/learning/sessions` — start an authenticated practice session.
- `POST /api/learning/sessions/:sessionId/attempts` — submit an answer and record its server-calculated outcome.
- `POST /api/learning/sessions/:sessionId/complete` — complete or abandon a session.
- `GET /api/learning/mastery` — retrieve only the authenticated student's mastery summaries.

## Boundaries

- No production migration, merge or deployment is part of this implementation.
- No existing questions, statuses, versions, provenance or taxonomy are modified.
- No XP, streaks, payment, readiness prediction, JAMB score prediction or recommendation decisions are derived in this phase.
- No AI-generated mastery values are accepted.
- Existing Phase 2 verified-only eligibility remains the gate for scored attempts.
- Historical activity is not fabricated or backfilled from client state.

## Exit criteria

- [ ] Session lifecycle and ownership tests.
- [ ] Attempt correctness derives from immutable approved version data.
- [ ] Idempotency and conflicting event reuse tests.
- [ ] Topic mastery aggregation and sparse-evidence tests.
- [ ] RLS/grant and service-only RPC assertions.
- [ ] Migration application and idempotency pass in disposable PostgreSQL.
- [ ] API tests prove authentication and client-controlled correctness are rejected.
- [ ] CI passes; production rollout remains separately gated.

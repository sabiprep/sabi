# Phase 4 — Adaptive Intelligence

## Objective
Turn verified Phase 3 learning evidence into transparent, personalized next-question recommendations. Phase 4 is a deterministic baseline that can be evaluated and improved without introducing opaque AI decisions.

## Recommendation signals
1. **Due review:** a topic whose spaced-review date has arrived receives the highest priority.
2. **Needs support:** low mastery estimates and repeated incorrect attempts receive focused practice.
3. **New topic:** topics with no recorded attempts are introduced before optional challenge material.
4. **Reinforcement:** developing topics receive more practice.
5. **Challenge:** proficient/mastered topics can receive harder questions when the verified pool has no higher-priority work.

The engine adjusts target difficulty from evidence: easy for support-needed topics, medium for developing topics, and hard for proficient/mastered topics. Candidate questions are ranked toward that target.

## Spaced revision
A database trigger updates `student_topic_review_schedule` atomically with each persisted attempt:
- Incorrect answer resets the consecutive-correct streak and schedules review in 1 day.
- Correct answers progress through 1, 3, 7, 14 and 30 day intervals.
- The schedule stores the topic/subtopic, streak, interval, last result and next due time.
- Replays of an idempotent attempt do not create another attempt and therefore do not advance the schedule.

## API
- `GET /api/learning/recommendations?subject=<slug>&limit=10`
  - Requires authentication.
  - Reads only the current student's mastery, due schedules and recent attempt IDs.
  - Gets candidate questions only from the Phase 2 verified-only question RPC.
  - Returns question payloads without answer keys, plus a human-readable recommendation reason and target difficulty.
  - Uses private, no-store caching.

## Student experience
- `/recommendations` and the existing `/verified-practice` entry now use adaptive question selection.
- Each question explains why it was selected and the suggested difficulty.
- Answers remain hidden until submission and attempts continue through the Phase 3 evidence API.
- The student navigation exposes the adaptive route as **For You**.

## Safety and boundaries
- No unverified, unreviewed or inactive-taxonomy question can enter recommendations.
- The client cannot submit mastery scores, answer correctness or schedule changes.
- No AI-generated or inferred student history is used.
- This baseline does not predict JAMB scores, guarantee readiness or claim psychometric calibration.
- The 1/3/7/14/30-day schedule is a transparent initial policy and should be tuned with real learning outcomes.
- No production migration, merge or deployment is included in implementation.

## Exit criteria
- [x] Deterministic recommendation engine with unit tests for due reviews, weak topics, unseen topics, recency and difficulty.
- [x] Authenticated recommendation API with student-scoped evidence reads.
- [x] Adaptive practice UI shows recommendation reasons and target difficulty.
- [x] Spaced-review schedule updates atomically from persisted attempts.
- [x] RLS and direct client access restrictions for schedule data.
- [x] SQL security assertions and attempt-trigger integration assertion.
- [x] Full CI passes: Backend CI #363 passed type-check, unit tests, web/API build, Phase 1–4 migrations, Phase 1–4 security assertions and migration idempotency.
- [ ] Production rollout separately approved after Phase 1–3 dependency/release gates are resolved.

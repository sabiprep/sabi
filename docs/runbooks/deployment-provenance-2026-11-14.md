# Deployment provenance — 14 November 2026

Read-only investigation with `curl`, `git` and `git merge-tree`. No deployment,
branch on `origin`, or database row was changed. This file supersedes the
"unversioned build" hypothesis I recorded earlier the same day; the live
deployment is fully versioned, my local `origin/main` was simply stale.

## What is actually live

`sabi-tan.vercel.app` runs **`origin/main` at `f2a64a9`**
("test: seed full synthetic platform dataset", 11 Nov 2026). Three independent
proofs:

1. `GET /api/learning/recommendations` returns
   `{"dueReviews":[],"dueReviewCount":0,"reviewPlan":[],"focusTopics":[],
   "weakestTopic":null,"nextAction":{…}}`.
   `dueReviewCount` exists at `server/learning/routes.ts:1284` on `origin/main`
   and nowhere else in this repository.
2. `POST /api/learning/sessions` rejects `mode` unless it is one of
   `diagnostic | smart_practice | blitz | cbt | custom`; `smart_practice` appears
   in `origin/main`'s `server/learning/*` only.
3. `origin/main:server.ts` mounts exactly seven routers —
   `/api/learning`, `/api/ai`, `/api/ai/knowledge`, `/api/payments`,
   `/api/internal/notifications`, `/api/gamification`, `/api/admin` — which
   matches the live 404s for `/api/learning/mastery`, `/api/question-bank/*` and
   `/api/jamb-exams/*`.

## Authentication is working in production

Verified against the live deployment on 14 Nov 2026:

```
GET  /api/health                 -> 200 {runtime:"vercel-function", admin_configured:true,
                                         service_role_configured:true, configuration_error:null}
POST /api/auth/register          -> 200 {"status":"created","verified":true, …}
POST /api/auth/login             -> 200 {"status":"authenticated", …}   (field: identifier)
POST <supabase>/auth/v1/token    -> 200 access_token (needs the deployed anon key)
GET  /api/questions              -> 200, 75 questions
```

## The host trap

| Host | What it is | `/api/health` |
| --- | --- | --- |
| `sabi-tan.vercel.app` | This project | `200` JSON |
| `sabi.vercel.app` | A **different** Vercel project | `200` **HTML** — the SPA shell |

`sabi.vercel.app` answers every `/api/*` path with 1 020 bytes of HTML, so
sign-up there fails as a network/parse error. Both Phase 0 documents used to name
that host; they now name `sabi-tan.vercel.app`, and
`docs/PHASE0-GO-LIVE.md` warns about the trap explicitly.

## Why the consolidation did not become `main`

The 2026-11-07 phase stack was built from `cbd54c2`, which is an ancestor of
`origin/main`; meanwhile `origin/main` advanced 135 commits with its own
implementation of the same ground: `server/learning` (1 284+ lines), AI control
plane, admin RBAC, billing, gamification and notifications.

| | `origin/main` | phase stack |
| --- | --- | --- |
| `tsc --noEmit` | clean | clean |
| Tests | 26 files / 177 pass | 12 files / 126 pass |
| `/api/learning` | `server/learning/routes.ts` | `server/learningEvidence/routes.ts` |
| Extra subsystems | `ai`, `admin`, `billing`, `gamification`, `notifications` | `questionBank`, `jambExam` |

`git merge-tree --write-tree --messages main origin/main` reports only six
textual conflicts, which is the dangerous part: the auto-merged tree contains

```ts
app.use('/api/learning', learningRouter);        // server/learning  (first match wins)
app.use('/api/learning', learningEvidenceRouter); // dead code, silently shadowed
```

and the two migration sets **both create ten of the same tables**
(`jamb_subjects`, `jamb_topics`, `jamb_subtopics`, `jamb_syllabus_versions`,
`exam_configurations`, `exam_configuration_subjects`,
`course_subject_combinations`, `course_subject_combination_subjects`,
`learning_sessions`, `student_topic_mastery`) plus two different `question_bank`
definitions. A textual merge would therefore have produced a silently divergent
schema — the same failure class as `cbd54c2 fix(api): restore the serverless boot
guard the merge dropped`.

Decision (14 Nov 2026): **`origin/main` is the trunk.** `main` was fast-forwarded
to `f2a64a9`; the stack is preserved at tag
`archive/phase-stack-consolidated-2026-11-14` and branch
`feature/phase-stack-2026-11-07`. Rollback point before any of this:
`pre-consolidation-2026-11-14`.

## What is worth porting from the stack

Port individually, onto `main`, as reviewed changes:

1. `server/questionBank/{routes,workflow,validation,importValidation}.ts` — admin
   import validation and the `pending → approved → live` lifecycle.
2. `server/jambExam/routes.ts` — exam run lifecycle (start/submit/rescore);
   `origin/main` only has `GET /api/learning/exam-configurations`.
3. The four pages (`QuestionBankAdminPage`, `JambExamPage`,
   `LearningEvidencePage`, `VerifiedQuestionPracticePage`) — after the frontend
   renovation, since `origin/main`'s `src/pages/StudentPages.tsx` already renders
   its own recommendations UI.
4. Any migration in the stack is **not** portable as-is: re-base onto
   `origin/main`'s schema and version numbering, and never re-create the ten
   shared tables.

**Do not port** `server/learningEvidence/*` — it is superseded by
`server/learning`, and porting it would recreate the duplicate `/api/learning`
mount.

## Test account created during verification

`phase0-check-20261114@example.com` (Auth user `30df56c1-…`, SABI ID `7844E`,
role `STUDENT`). `example.com` cannot receive mail. Delete it from Supabase →
Authentication → Users when convenient.

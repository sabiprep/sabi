# Deployment integrity check — 14 November 2026

Read-only evidence gathered with `curl` against the three hosts in use. No
deployment or database state was modified. Purpose: establish **which build is
actually serving traffic**, because two different hosts were in circulation and
one of them does not belong to this project.

## The three hosts

| Host | What it is | `/api/health` |
| --- | --- | --- |
| `sabi-tan.vercel.app` | Production web app for this project | `200` JSON, `runtime:"vercel-function"` |
| `sabi-lesn8pzef-sabi-9031.vercel.app` | Immutable deployment URL | `200` JSON, identical payload |
| `sabi.vercel.app` | **Not this project** | `200` **HTML** — the SPA shell |

`sabi.vercel.app` answers `/api/health` and `/api/questions` with the same
1 020-byte HTML document, so a client pointed at it receives HTML instead of
JSON. Sign-up and sign-in there fail in the browser and look like a network
error. The Phase 0 checklist and runbook previously named this host; they now
name `sabi-tan.vercel.app`.

## What the production deployment is running

The health payload on `sabi-tan.vercel.app` matches the `GET /api/health` handler
in `server.ts` on `main` field for field and in the same order (`status`,
`phase`, `timestamp`, `runtime`, `supabase_url_configured`,
`service_role_configured`, `admin_configured`, `configuration_error`,
`missing_variables`, `instant_verify`, `ai_configured`, `extra_cors_origins`).
The deployed `index.html` is 1 227 bytes, the same size as a local
`npm run build` of `main`, and the deployed bundle contains
`https://dnrzixaasphxiswjyglj.supabase.co` plus an anon key that Supabase Auth
accepts (`GET /auth/v1/settings` → `200`, `email: true`).

Authentication itself is working in production. Verified end to end:

```
POST /api/auth/register            -> 200 {"status":"created","verified":true,...}
POST /api/auth/login               -> 200 {"status":"authenticated",...}
POST <supabase>/auth/v1/token      -> 200 access_token (972 bytes)
GET  /api/questions                -> 200, 75 questions
```

## The discrepancy

The same deployment answers `/api/learning/recommendations` with:

```json
{"dueReviews":[],"dueReviewCount":0,"reviewPlan":[],"focusTopics":[],
 "weakestTopic":null,"nextAction":{"type":"diagnostic","message":"..."}}
```

and rejects `POST /api/learning/sessions` with a `mode` enum of
`"diagnostic"|"smart_practice"|"blitz"|"cbt"|"custom"`.

Neither string exists anywhere in this repository, on any branch, in any commit:

```bash
git log --all -S 'dueReviewCount'          # no output
grep -rn 'smart_practice' --include='*.ts' # no output
```

`main`'s handler at `server/learningEvidence/routes.ts` returns
`{"status":"success","recommendations":[],"strategy":"evidence_adaptive_v1"}`
and reads the `get_eligible_question_bank` RPC, which no deployed schema
provides yet.

Meanwhile these routes 404 on the deployment with
`{"error":"Unknown API route: ..."}`:

- `GET /api/learning/mastery`
- `GET /api/question-bank/eligible`
- `POST /api/question-bank/import/validate`
- `GET /api/jamb-exams/configurations`
- `POST /api/jamb-exams/runs`

**Conclusion:** production is a hand-assembled build — `main`'s `server.ts`
(health, auth, questions) plus a learning-evidence router that is committed
nowhere. It is not reproducible from `main`, and it is not the phase1-phase5
stack either (that mounts the question bank and JAMB routers, and its `mode` enum
has no `smart_practice`).

## What to do

1. Deploy `main` (post-consolidation) to the project that owns
   `sabi-tan.vercel.app`. The phase routes then come from
   `server/questionBank/routes.ts`, `server/learningEvidence/routes.ts` and
   `server/jambExam/routes.ts`, all committed and unit tested.
2. Re-run the probes below and require the `main` shapes.
3. Add `commit` and `build` to `/api/health` from `VERCEL_GIT_COMMIT_SHA` so a
   deployment can be traced to a commit in one request (the README rule is
   "a deployment that cannot be traced to a `main` commit is not a release").

## Probe script

```bash
APP=https://sabi-tan.vercel.app
curl -s "$APP/api/health"
# expect runtime "vercel-function", admin_configured true, configuration_error null

curl -s -o /dev/null -w '%{content_type}\n' "$APP/api/questions"
# expect application/json; a text/html answer means the host is not this project

TOKEN=<access_token from /auth/v1/token>
curl -s "$APP/api/learning/recommendations" -H "Authorization: Bearer $TOKEN"
# after redeploying main: {"status":"success","recommendations":[...],"strategy":"evidence_adaptive_v1"}
# {"dueReviews":...} means the unversioned build is still live
```

## Test account created during this check

`phase0-check-20261114@example.com` (`example.com` cannot receive mail).
Auth user `30df56c1-560c-4395-98f5-1c9e9c6a0d24`, SABI ID `7844E`, role
`STUDENT`. Delete it from Supabase → Authentication → Users when convenient; it
exists only to prove that registration and login work against production.

# SABI

JAMB CBT study app: React + Vite SPA, Express API (`server.ts`), Supabase
(Postgres + Auth), deployed to Vercel as a static site plus one serverless API
function (`api/index.ts`).

## Run locally

```bash
npm ci
npm run dev        # SPA + API on http://localhost:3000
npm run lint       # tsc --noEmit
npm test           # vitest run
npm run build      # dist/ (SPA) + dist/server.cjs (API bundle)
```

Local dev needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`
(see `.env.example`). Without them the API refuses to start locally and says
which one is missing. The SPA additionally needs `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY`: account creation and the credential check happen on
the API (`POST /api/auth/register`, `POST /api/auth/login` — the login field is
`identifier`, not `email`), and the browser then exchanges the same credentials
with Supabase Auth (`supabase.auth.signInWithPassword`) to hold the session
token that every authenticated API call sends as `Authorization: Bearer <token>`.

## Which document do I open?

| You are... | Open |
| --- | --- |
| **The developer doing the outside build** - Supabase dashboard, Vercel dashboard, testing the live URL | **[`docs/PHASE0-GO-LIVE.md`](docs/PHASE0-GO-LIVE.md)** - this one, A to D, start to finish |
| Checking whether the Supabase project already has the right rules | [`supabase/verify_phase0.sql`](supabase/verify_phase0.sql) - read-only, 19 `OK`/`MISSING` rows |
| Building the Android APK | [`ANDROID_APK_BUILD_GUIDE.md`](ANDROID_APK_BUILD_GUIDE.md) - checklist step D points here |
| Debugging a deployment failure | [`docs/runbooks/phase0-rollout.md`](docs/runbooks/phase0-rollout.md) section 8 - reference, not a procedure |
| Reading the security model | [`docs/security-phase0.md`](docs/security-phase0.md) - reference, not a procedure |
| Looking up what was already applied to production | [`docs/runbooks/phase1-rollout.md`](docs/runbooks/phase1-rollout.md) - an applied-change record |
| Working out **which build is live**, and why a second Vercel host and a parallel branch stack exist | [`docs/runbooks/deployment-provenance-2026-11-14.md`](docs/runbooks/deployment-provenance-2026-11-14.md) - production lineage, archive tags, port plan |

If you only open one file, make it **`docs/PHASE0-GO-LIVE.md`**. Phase 1 work
does not begin until its sign-off list is fully ticked.

Database SQL, in the order it is applied — ascending only (`0001` restores the
looser `search_path` that `0002` pins, so `0001` last would undo that hardening).
`supabase/migrations/README.md` explains why `supabase db push` stays off:

1. `supabase_schema.sql` - base schema (profiles, signup trigger, generator)
2. `supabase/migrations/0001_phase0_security.sql` - Phase 0
3. `supabase/migrations/0002_phase1_foundation.sql` - owner-only policies, `session_user` guard
4. `supabase/migrations/0003_profile_privilege_hardening.sql` - least-privilege grants
5. `supabase/migrations/0004_profile_public_acl_hardening.sql` - removes inherited `PUBLIC` grants

## Branching

`main` is the only release branch. CI runs on pushes to `main` and on pull
requests into `main`, and Vercel deploys from `main` — a deployment that cannot
be traced to a `main` commit is not a release.

Work happens on short-lived branches that are merged back and deleted. No
long-lived `backend/*` or `frontend/*` stacks: CI does not certify branches, so
a stack that sits on its own branch for a week drifts from what is actually
deployed. On 14 Nov 2026 that drift produced two full implementations of the same
learning subsystem — the deployed one (`server/learning`) and an unmerged one
(`server/learningEvidence`), which mount the same `/api/learning` prefix and
create 10 of the same tables.

The 2026-11-07 phase stack (`server/questionBank`, `server/jambExam`,
`server/learningEvidence`, its 7 migrations and 4 admin/learner pages) is
preserved, **unmerged**, at tag
`archive/phase-stack-consolidated-2026-11-14` / branch
`feature/phase-stack-2026-11-07`. Its question-bank and JAMB pieces are being
ported as small reviewed changes on top of `main`; its learning-evidence router is
superseded and should not be revived. Rollback point for the consolidation
attempt: `pre-consolidation-2026-11-14`.

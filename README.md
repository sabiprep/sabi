# SABI

Sabi is an adaptive JAMB UTME preparation platform. It ships as a React 19 +
Vite SPA with an Express API (`server.ts`) backed by Supabase (Postgres + Auth),
deployed to Vercel as a static site plus one serverless API function
(`api/index.ts`).

The backend provides authenticated student accounts, academic configuration,
verified question delivery, durable learning evidence, adaptive practice
recommendations and a timed CBT simulation.

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
`VITE_SUPABASE_ANON_KEY`: account creation and the credential check happen on the
API (`POST /api/auth/register`, `POST /api/auth/login`), and the browser then
exchanges the same credentials with Supabase Auth
(`supabase.auth.signInWithPassword`) to hold the session token that every
authenticated API call sends as `Authorization: Bearer <token>`.

### Requirements

- Node.js 22
- npm
- A Supabase project for backend and authentication
- A Gemini API key for live AI tutor features (optional for local UI/API work)

## Which document do I open?

| You are... | Open |
| --- | --- |
| **The developer doing the outside build** - Supabase dashboard, Vercel dashboard, testing the live URL | **[`docs/PHASE0-GO-LIVE.md`](docs/PHASE0-GO-LIVE.md)** - this one, A to D, start to finish |
| Checking whether the Supabase project already has the right rules | [`supabase/verify_phase0.sql`](supabase/verify_phase0.sql) - read-only, 19 `OK`/`MISSING` rows |
| Building the Android APK | [`ANDROID_APK_BUILD_GUIDE.md`](ANDROID_APK_BUILD_GUIDE.md) - checklist step D points here |
| Debugging a deployment failure | [`docs/runbooks/phase0-rollout.md`](docs/runbooks/phase0-rollout.md) section 8 - reference, not a procedure |
| Reading the security model | [`docs/security-phase0.md`](docs/security-phase0.md) - reference, not a procedure |
| Looking up what was already applied to production | [`docs/runbooks/phase1-rollout.md`](docs/runbooks/phase1-rollout.md) - an applied-change record |
| Reviewing what each backend phase delivers | [`docs/architecture/`](docs/architecture) - `phase-1-foundation.md` through `phase-5-jamb-readiness.md` |
| Working out **which build is actually live** | [`docs/runbooks/deployment-integrity-2026-11-14.md`](docs/runbooks/deployment-integrity-2026-11-14.md) - host-by-host evidence |

If you only open one file, make it **`docs/PHASE0-GO-LIVE.md`**. Phase 1 work
does not begin until its sign-off list is fully ticked.

## Verification commands

```bash
npm run lint
npm test
npm run build
```

The backend CI workflow (`.github/workflows/backend-ci.yml`) runs these checks
and applies every SQL migration to a disposable PostgreSQL 16 database. The
fixture is test-only and must never be applied to Supabase.

## Architecture

- `server.ts` is the single Express/Vercel API entry point.
- `api/index.ts` is the Vercel function wrapper: it loads `server.ts` lazily so a
  boot failure answers `500 {"code":"API_BOOT_FAILED"}` instead of an opaque
  hosting error page.
- `server/config.ts` centralizes environment, CORS and rate-limit configuration.
- `server/lib/supabaseAdmin.ts` creates the server-only Supabase client and fails
  closed when production credentials are missing.
- `server/middleware/` contains authentication, role authorization, validation,
  rate limiting, configuration guarding and error handling.
- `server/validation/` contains request schemas.
- Domain routers are mounted by `server.ts`: `server/questionBank/`,
  `server/learningEvidence/` and `server/jambExam/`.
- `shared/jamb.ts` is the canonical JAMB subject catalogue shared by the API and
  the SPA; `server/config/jamb.ts` re-exports it for backend imports.
- `supabase/migrations/` contains ordered, additive SQL migrations.
- `supabase/tests/` contains disposable database fixtures and migration assertions.

## Backend phases

All phase work is merged into `main`. Code presence is not proof that a migration
has been applied to Supabase: check the target project's ledger and run the
matching assertion suite before treating a phase as live.

| Phase | Delivered | Migration |
| --- | --- | --- |
| 0 - Authentication and API security | Bearer-token identity, role authorization, request validation, rate limiting, CORS allow-list, per-deployment health self-check | `0001_phase0_security.sql` |
| 1 - Academic foundation | Versioned syllabus taxonomy, exam configurations, course combinations, catalogue ACL hardening, least-privilege sequences | `0002`-`0007` |
| 2 - Question bank lifecycle | Immutable question versions, provenance, review events, flags, import batches, duplicate fingerprints, publish-on-approval workflow | `20261107100000_phase2_question_bank_lifecycle.sql` |
| 3 - Learning evidence | Authenticated sessions and server-evaluated attempts, per-subtopic mastery and evidence confidence | `20261107110000_phase3_learning_evidence.sql` |
| 4 - Adaptive intelligence | Deterministic recommendation signals, difficulty targeting, spaced-review schedule trigger, `GET /api/learning/recommendations` | `20261107120000_phase4_adaptive_intelligence.sql` |
| 5 - JAMB readiness | Server-assembled timed CBT with immutable question snapshots, deadline enforcement, observed results | `20261107130000_phase5_jamb_exam_runs.sql` |

## Database migrations

Database SQL is applied in the order below, ascending only (`0001` restores the
looser `search_path` that `0002` pins, so applying `0001` last would undo that
hardening). `supabase/migrations/README.md` explains why `supabase db push` stays
off:

1. `supabase_schema.sql` - base schema (profiles, signup trigger, generator)
2. `supabase/migrations/0001_phase0_security.sql` - Phase 0
3. `supabase/migrations/0002_phase1_foundation.sql` - owner-only policies, `session_user` guard
4. `supabase/migrations/0003_profile_privilege_hardening.sql` - least-privilege grants
5. `supabase/migrations/0004_profile_public_acl_hardening.sql` - removes inherited `PUBLIC` grants
6. `supabase/migrations/0005_catalog_acl_hardening.sql` - catalogue least privilege
7. `supabase/migrations/0006_syllabus_taxonomy_foundation.sql` - versioned taxonomy, legacy label mapping
8. `supabase/migrations/0007_profiles_select_rls_initplan.sql` - profile select policy re-planned for RLS
9. `supabase/migrations/20261107100000_phase2_question_bank_lifecycle.sql`
10. `supabase/migrations/20261107110000_phase3_learning_evidence.sql`
11. `supabase/migrations/20261107120000_phase4_adaptive_intelligence.sql`
12. `supabase/migrations/20261107130000_phase5_jamb_exam_runs.sql`

The Phase 1 academic catalogue is stored in `jamb_subjects`,
`jamb_syllabus_versions`, `jamb_topics`, `jamb_subtopics`,
`exam_configurations` / `exam_configuration_subjects`, and
`course_subject_combinations` with its subject join table.

Legacy topic labels imported from the question bank are marked `draft` with their
source recorded. They are not represented as JAMB-verified syllabus content. A
verified syllabus version requires a reviewed authoritative source.

## Database change safety

- Do not apply production migrations without explicit approval.
- A migration file in Git does not prove it has been applied to Supabase.
- Check the target project, migration ledger, schema, RLS policies, grants and
  default privileges before applying changes.
- Keep service-role access intact; client access to academic catalogues is
  read-only and audit records are server-only.
- Run Supabase security/performance advisors after schema changes.

## Branch policy

`main` is the only integration branch and the only branch that is deployed.

- Every change lands on `main`. Long-lived feature branches are not used: they
  drift, and this repository already lost 172 commits of backend work to a
  stacked branch chain (`backend/phase1-...` through `backend/phase5-...`) that
  was never merged until 14 November 2026.
- If a change needs isolation, use a short-lived branch (hours, not weeks) and
  merge it into `main` the same day, with `npm run lint`, `npm test` and
  `npm run build` green after the merge.
- A phase is not "done" while it lives on a side branch. Code, migration, tests
  and documentation land together on `main`.
- Deployments must be built from `main`. A deployment that cannot be traced to a
  `main` commit is not a release.

The state of `main` immediately before the phase1-phase5 consolidation is
preserved in tag `pre-consolidation-2026-11-14`, so the merge can be reverted
without rewriting history.

## Deployment

Vercel builds this repository as a Vite static site plus the `api/index.ts`
function (see `vercel.json`).

| Environment | URL |
| --- | --- |
| Production web app | `https://sabi-tan.vercel.app` |
| Immutable deployment | `https://sabi-lesn8pzef-sabi-9031.vercel.app` |
| API health self-check | `https://sabi-tan.vercel.app/api/health` |

`GET /api/health` is the fastest way to confirm which build is live: it reports
`runtime`, `admin_configured`, `service_role_configured`, `missing_variables` and
`instant_verify` as booleans only, never a secret.

> `https://sabi.vercel.app` is **not** this project. It answers `/api/*` with the
> SPA shell (an HTML page with the same ETag for every path), so any client
> pointed at it receives HTML instead of JSON. Do not use it as an API base or as
> the Supabase Auth Site URL.

Confirm the Vercel project, its production branch and its environment variables
before promoting a deployment.


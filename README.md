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
which one is missing.

## Going live (Phase 0)

**Start here → [`docs/PHASE0-GO-LIVE.md`](docs/PHASE0-GO-LIVE.md)** — the single
ordered checklist for the work that happens outside the repo (Supabase dashboard,
Vercel dashboard, verification on the live URL). Phase 1 does not start until its
sign-off list is fully ticked.

Then, in order of usefulness:

| Document | Use it for |
| --- | --- |
| [`supabase/verify_phase0.sql`](supabase/verify_phase0.sql) | read-only SQL that says whether your Supabase project matches the code (one `OK` / `MISSING` row per requirement) |
| [`supabase/verify_phase0_data.sql`](supabase/verify_phase0_data.sql) | read-only spot-check of the data after the checks above are green |
| [`docs/runbooks/phase0-rollout.md`](docs/runbooks/phase0-rollout.md) | reference and troubleshooting: why each step exists, smoke tests, rollback, error signatures |
| [`docs/security-phase0.md`](docs/security-phase0.md) | the security model: roles, RLS, protected columns, residual risks |
| [`ANDROID_APK_BUILD_GUIDE.md`](ANDROID_APK_BUILD_GUIDE.md) | building the Android APK against the deployed API |

Database files, in the order they are applied to a fresh project:

1. `supabase_schema.sql` — base schema (profiles, signup trigger, generator)
2. `supabase/migrations/0001_phase0_security.sql` — Phase 0 hardening





lets get the work started 


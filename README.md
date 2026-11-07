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

## Which document do I open?

| You are... | Open |
| --- | --- |
| **The developer doing the outside build** - Supabase dashboard, Vercel dashboard, testing the live URL | **[`docs/PHASE0-GO-LIVE.md`](docs/PHASE0-GO-LIVE.md)** - this one, A to D, start to finish |
| Checking whether the Supabase project already has the right rules | [`supabase/verify_phase0.sql`](supabase/verify_phase0.sql) - read-only, 19 `OK`/`MISSING` rows |
| Building the Android APK | [`ANDROID_APK_BUILD_GUIDE.md`](ANDROID_APK_BUILD_GUIDE.md) - checklist step D points here |
| Debugging a deployment failure | [`docs/runbooks/phase0-rollout.md`](docs/runbooks/phase0-rollout.md) section 8 - reference, not a procedure |
| Reading the security model | [`docs/security-phase0.md`](docs/security-phase0.md) - reference, not a procedure |
| Looking up what was already applied to production | [`docs/runbooks/phase1-rollout.md`](docs/runbooks/phase1-rollout.md) - an applied-change record |

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

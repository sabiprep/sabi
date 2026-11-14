# Supabase project consolidation — 14 November 2026

Status: **open decision**. This runbook answers "can we use both Supabase
projects — the main one at the end, the new full one for now?" — and gives the
only sequence that does not lose data or split accounts.

Related: `docs/runbooks/phase0-rollout.md`,
`docs/database/production-migration-history-reconciliation.md`.

## 1. What the repository says today

Every document in this repository names **one** production project:

```
docs/BACKEND-COMPLETION-PLAN.md:5        Production Supabase project: dnrzixaasphxiswjyglj
docs/runbooks/phase1-rollout.md:16       Applied to project dnrzixaasphxiswjyglj
docs/database/adaptive-question-bank-foundation-v1.md:7
                                         Supabase project: sabi (dnrzixaasphxiswjyglj), PostgreSQL 17
```

The live deployment on `sabi-tan.vercel.app` is bound to that same ref, so
whatever is in `dnrzixaasphxiswjyglj` **is** production right now. If that is the
project that looks empty, then the live app is authenticating against a database
with no curriculum content — sign-up and sign-in work (the auth tables are
built in), and the learning screens have nothing to show.

> Confirm the mapping before acting. Run `scripts/supabase-project-audit.sql`
> in both projects (Supabase → SQL Editor → Run, read-only) and compare.

## 2. The hard constraint: one deployment, one project

A Supabase project is a complete, self-contained Postgres + Auth + Storage
instance. An app binds to exactly one of them through `SUPABASE_URL`,
`VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `VITE_SUPABASE_ANON_KEY`.
There is no "use both" mode, no shared database, and no automatic sync. What is
**not** shared between two projects:

| Resource | Consequence of switching projects |
| --- | --- |
| `auth.users` + `auth.identities` | Accounts do not exist in the other project; a password hash alone is not enough to log in |
| JWT signing secret / anon key | Every token and every client key is different; env vars must change together or every request 401s |
| `storage.buckets` + objects | Files are per project; URLs break |
| `supabase_migrations.schema_migrations` | The ledger is per project, and this project has hand-applied objects, so two ledgers never mean two identical schemas |
| RLS policies, triggers, functions | Recreated per project; see `docs/PHASE0-GO-LIVE.md` §A2 |

Two projects *are* legitimate as **two environments**. What is not legitimate is
two projects both reachable from production, or a production deployment whose
project you intend to throw away.

## 3. Recommended sequence

**Step 0 — establish facts.** Run the audit script in both projects. Record the
two refs, table counts, migration-ledger counts and `auth.users` counts in the
decision table in §6.

**Step 1 — make the full project production, now.** This is the "use the new one
now" half of the request, and it is one env-var change set plus a redeploy:

1. Vercel → Project → Settings → Environment Variables → **Production**, update
   all four of `SUPABASE_URL`, `VITE_SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_ANON_KEY` to the full project.
2. Redeploy (Deployments → ⋯ → Redeploy). Env changes do not affect an existing
   deployment.
3. Verify: `GET /api/health` must report `service_role_configured: true` and
   `configuration_error: null`; then `POST /api/auth/register` and
   `POST /api/auth/login` (field `identifier`); then check content renders.

**Step 2 — keep the empty project as staging, not as production.** Point the
**Preview** environment at it and never set Production back to it by accident.
Preview and Production env vars are separate in Vercel, which is exactly what
makes this safe.

**Step 3 — later, flip the "main" project to active.** When the main project must
become the one true database, copy **into** it while it is still empty, then flip
the env vars. Direction matters: **always copy from the project that holds the
data into the project that holds nothing.** Never the reverse, never `--clean`
over a project that already has live `auth.users`.

- Schema + data: `supabase db dump` (or `pg_dump --schema=public`) from the full
  project, restore into the main project, then `supabase db push` to reconcile
  the ledger.
- Auth users: a `public` dump does not carry them. Either migrate
  `auth.users` + `auth.identities` together in a maintenance window and accept
  that sessions are invalidated, or (with only test accounts today) let users
  re-register. Decide this **before** real students exist.

**Step 4 — decommission the duplicate.** After the flip is verified, pause or
delete the project that is no longer bound to any environment, and update
`docs/BACKEND-COMPLETION-PLAN.md`, `docs/runbooks/phase1-rollout.md` and
`docs/database/adaptive-question-bank-foundation-v1.md` to the surviving ref.

## 4. Rules that prevent a split brain

- One project per environment; Production never points at a project scheduled for
  deletion.
- Change the URL and **both keys** in the same edit; a mismatched anon key against
  a valid URL produces 401s that look like application bugs.
- Never replay historical SQL to "align" two projects — apply new timestamped
  migrations only (`supabase/migrations/README.md`).
- A project seeded by hand from a scratch environment will contain tables no
  migration created. Treat the audit script's table list as evidence, not truth,
  until the orphans are captured as a migration.
- Take a dump before any restore. Supabase's daily backups are not a restore
  strategy for a project you are about to overwrite.

## 5. Cost note

Two active projects mean two sets of limits and, on a paid plan, two bills. If
the empty project has no data and no real users, the cheapest correct outcome is
one project: audit, copy, flip, delete.

## 6. Decision record (fill in when known)

| Field | Value |
| --- | --- |
| Project A ref | _to fill_ — role: _production / staging_ |
| Project B ref | _to fill_ — role: _production / staging_ |
| Which ref `sabi-tan.vercel.app` is bound to today | `dnrzixaasphxiswjyglj` (per §1) |
| Real user accounts in A / B | _to fill_ (audit: `auth.users`) |
| Public tables in A / B | _to fill_ |
| Migration-ledger rows in A / B | _to fill_ |
| Chosen production project | _to fill_ |
| Flip date | _to fill_ |

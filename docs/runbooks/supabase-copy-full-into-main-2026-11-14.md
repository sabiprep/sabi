# Copying the full Supabase project into the main project — 14 November 2026

Decision (operator, 14 Nov 2026): **the data moves from the new/full project into
the main project**, so `dnrzixaasphxiswjyglj` stays the one production database and
nothing in Vercel changes. The earlier "flip Production to the full project"
option in `supabase-project-consolidation-2026-11-14.md` is superseded by this
document; §6 of that file is updated to match.

Related: `scripts/supabase-project-audit.sql`,
`scripts/supabase-restore-preflight.sql`, `supabase/verify_phase0.sql`,
`docs/database/production-migration-history-reconciliation.md`.

## 1. Why this is not `pg_restore` over the top

The main project is **not empty**, whatever the dashboard appears to show:

- `docs/runbooks/phase1-rollout.md:27,29` records the JAMB catalogue at 23
  subjects and `question_bank` at **3,740 rows**, with Phase 0/Phase 1 hardening
  applied and verified.
- `docs/database/production-migration-history-reconciliation.md` records the
  backend-service and notification-worker migrations applied on top, and
  `supabase/migrations/README.md:14` records **14** ledger versions.

So a schema restore would either abort (objects already exist) or, with
`--clean`, **drop the Phase 0 hardening**: the protected-columns trigger, the
owner-scoped policies, the least-privilege grants and `audit_logs`. That is the
single most likely way to break production with this operation.

Therefore: **the schema stays the main project's. You copy data, additively.**

## 2. What "everything" actually contains

| Category | Lives in | Copy it? |
| --- | --- | --- |
| Schema, RLS, triggers, functions, grants | `public` DDL | **No** — main already has it; the repo's migrations are the source of truth |
| Reference / content rows (subjects, topics, questions, exam configs, engine and signal registries, XP rules, templates) | `public` tables | **Yes** — additive merge |
| User-owned rows (anything with a FK to `auth.users`: profiles, sessions, attempts, mastery, notifications…) | `public` tables | **Only after the accounts exist here** |
| Accounts | `auth.users`, `auth.identities` | Deliberate decision — see §4 |
| Files | `storage.buckets`, `storage.objects` | Separate script; a SQL copy leaves the actual objects behind |
| Migration ledger | `supabase_migrations.schema_migrations` | **Never** — copying the source ledger would corrupt this project's history |

## 3. Preflight — prove the premise before touching anything

1. **Audit both projects.** Run `scripts/supabase-project-audit.sql` in each;
   compare the `public_schema_fingerprint` and the table lists. If the
   fingerprints differ, the copy is a schema operation too, and §5 stops until the
   difference is explained.
2. **Preflight the destination.** Run `scripts/supabase-restore-preflight.sql` on
   the main project. You need its three lists: tables already holding rows,
   tables owned by an auth user, and the `setval` statements.
3. **Back up the destination properly.**

   ```bash
   pg_dump "$TGT" -Fc --no-owner --no-privileges \
     -f "/tmp/main-backup-$(date +%Y%m%d-%H%M).dump"
   ```

4. **Diff the schemas** — the decisive check, because a fingerprint compares names
   and types only, not constraints, indexes or policies:

   ```bash
   pg_dump "$SRC" --schema-only --no-owner --no-privileges -n public -f /tmp/src_schema.sql
   pg_dump "$TGT" --schema-only --no-owner --no-privileges -n public -f /tmp/tgt_schema.sql
   diff -u /tmp/tgt_schema.sql /tmp/src_schema.sql | head -200
   ```

   Read the diff before continuing. Extra **tables** in the source are orphans
   (see §5); anything else in the diff is drift that must be resolved first.

Connection strings are on each project's Dashboard → Connect. Use the direct
string, or the session pooler if your network has no IPv6:

```
postgresql://postgres:<DB_PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres
```

`pg_dump`/`psql` must be **v17 or newer** (`pg_dump --version`): both projects run
PostgreSQL 17, and an older client refuses or silently truncates.

## 4. Decide the accounts question first

`public.profiles.id` (and every other user-owned table) references
`auth.users.id`. Copying those rows before the account exists is an immediate
foreign-key failure, and copying `auth.users` over live accounts is worse.

- **Default — recommended here.** Do not migrate accounts. Production accounts
  were created on the main project by real sign-ups and keep working. Seed/test
  accounts from the full project are not worth the risk. Consequence: user-owned
  tables are excluded from the copy.
- **Only if the full project holds accounts you must keep.** Migrate
  `auth.users` + `auth.identities` together in a maintenance window, inserting
  only ids that do not already exist, then copy the user-owned tables. This
  invalidates sessions for the migrated accounts and cannot be half-done; decide
  it before there are real students.

Either way, run preflight block 3 and write its table list down — it is the exact
exclusion list for the next step.

## 5. Copy

Additive, idempotent, re-runnable: `--on-conflict-do-nothing` turns every row into
`INSERT … ON CONFLICT DO NOTHING`, so existing rows in the main project win and
nothing is dropped or truncated. Restricting the dump to `-n public` is what keeps
`auth`, `storage` and the migration ledger out of it.

```bash
export SRC='postgresql://postgres:<FULL_DB_PASSWORD>@db.<FULL_REF>.supabase.co:5432/postgres'
export TGT='postgresql://postgres:<MAIN_DB_PASSWORD>@db.dnrzixaasphxiswjyglj.supabase.co:5432/postgres'

pg_dump "$SRC" --data-only --column-inserts --on-conflict-do-nothing \
  --no-owner --no-privileges -n public \
  --exclude-table='public.profiles' \
  --exclude-table='public.<each user-owned table from preflight block 3>' \
  -f /tmp/full_public_data.sql

grep -c '^INSERT INTO' /tmp/full_public_data.sql    # sanity: is anything in there?
grep -o '^INSERT INTO public\."[a-z_]*"' /tmp/full_public_data.sql | sort -u  # which tables

psql "$TGT" -v ON_ERROR_STOP=1 --single-transaction -f /tmp/full_public_data.sql
```

`--single-transaction` means one foreign-key or constraint error rolls the whole
copy back — that is deliberate, so a partial copy cannot exist.

Then advance the sequences with the statements from preflight block 4 (only
needed if you inserted explicit ids):

```bash
psql "$TGT" -v ON_ERROR_STOP=1 -f /tmp/fix-sequences.sql
```

**Tables that exist only in the full project** cannot be copied this way — the
target has no such table and the INSERT fails. Capture their DDL as a **new
timestamped migration** in `supabase/migrations/` (repo rule:
`supabase/migrations/README.md`), let `Backend CI` prove it on disposable Postgres,
apply it to the main project, then re-run the copy.

**Storage files** are not in the database dump beyond their metadata rows. Migrate
them with Supabase's documented storage migration script, or re-upload; never copy
`storage.objects` rows by hand while leaving the files behind.

## 6. Verify before you close the window

```sql
-- 1. Every table's row count must now be >= the source's count.
--    Re-run block 2 of scripts/supabase-restore-preflight.sql and compare with
--    the same block run on the source.

-- 2. No dangling profile rows (generalise this for each table from preflight 3).
select count(*) as orphan_profiles
from public.profiles p
left join auth.users u on u.id = p.id
where u.id is null;

-- 3. The ledger must be unchanged by the copy.
select count(*) from supabase_migrations.schema_migrations;   -- still the pre-copy number

-- 4. Phase 0 is still intact.
--    Run supabase/verify_phase0.sql: all 19 rows must still read OK.
```

Then the live checks that prove the copy helped rather than hurt:

```
GET  https://sabi-tan.vercel.app/api/health        -> configuration_error: null
GET  https://sabi-tan.vercel.app/api/questions     -> 200, same count as before the copy
POST /api/auth/login {identifier, password}        -> 200 "authenticated"  (an account created before the copy)
GET  /api/learning/recommendations (with token)    -> 200, dueReviewCount present
```

An account created **before** the copy must still log in afterwards. That single
check catches an accidental `auth` restore.

## 7. If you must replace rows instead of merging

The merge above deliberately keeps the main project's existing content — including
its 3,740 `question_bank` rows. If a table must end up with the *source's* rows
instead, do it per table, never globally:

```sql
begin;
-- children first: nothing may reference the rows you are about to delete
delete from public.<child_table> where <fk> in (select id from public.<parent_table>);
delete from public.<parent_table>;
-- then re-run only that table's INSERTs from /tmp/full_public_data.sql
commit;
```

**Never** `TRUNCATE public.question_bank CASCADE` on production: the cascade
follows foreign keys outward and will delete learner attempts and session rows
along with the questions.

## 8. Rollback

The copy is additive, so the minimal rollback is to delete the inserted rows using
the backup as the reference set. The reliable rollback is the dump from §3.3:

```bash
pg_restore --clean --if-exists --no-owner --no-privileges -d "$TGT" -n public \
  "/tmp/main-backup-<timestamp>.dump"
```

Rehearse the rollback on a scratch project once before running the copy on
production. A backup you have never restored is a hypothesis, not a backup.

## 9. Record the outcome

Fill §6 of `docs/runbooks/supabase-project-consolidation-2026-11-14.md`: which ref
is production, copy date, row counts before/after, accounts decision, and whether
the second project is now paused or deleted. If the surviving ref ever changes,
update `docs/BACKEND-COMPLETION-PLAN.md:5`, `docs/runbooks/phase1-rollout.md:16`
and `docs/database/adaptive-question-bank-foundation-v1.md:7` in the same commit.

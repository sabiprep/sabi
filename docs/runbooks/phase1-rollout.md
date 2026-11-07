# Phase 1 foundation rollout

> **This is a record of what was already applied — it is not a procedure.**
> For the work that still has to happen outside the repo (Supabase Auth settings,
> Vercel environment variables, verification on the live URL) use
> [`docs/PHASE0-GO-LIVE.md`](../PHASE0-GO-LIVE.md). Phase 1 development does not
> begin until that checklist's sign-off list is fully ticked. Do not replay the
> SQL described below as new migrations (`supabase/migrations/README.md`).

> **Current production status — 2026-11-06:** The approved profile security remediation and Phase 1 foundation have been applied to the live Sabi Supabase project. The pre-remediation snapshot below is retained as an audit record. Post-migration verification is recorded in the production application log.

## Production application log (2026-11-06)

The user confirmed a recent backup and explicitly approved production remediation after a live-schema preflight.

Applied to project `dnrzixaasphxiswjyglj`:
- Remote migration `20261106185031 / profile_privilege_hardening`: revoked all privileges on `public.profiles` from `anon`; reset `authenticated` to SELECT and UPDATE only. Existing explicit `service_role` privileges were preserved.
- Remote migration `20261106185050 / phase1_foundation`: removed the two broad profile policies, created authenticated owner-only SELECT, corrected the protected-column trigger, hardened function search paths and trigger-function execute privileges, and created/seeded the Phase 1 catalogue/configuration tables.

Post-application checks confirmed:
- `anon` has no table privileges on `public.profiles`.
- `authenticated` has only SELECT and UPDATE on `profiles`; RLS restricts both to the caller's own row.
- The only profile SELECT policy is owner-scoped; the UPDATE policy remains owner-scoped.
- The protected-column trigger uses `session_user`, pins `search_path` to `pg_catalog, public`, and is not directly executable by anon/authenticated.
- SQL `PUBLIC` has no profile table privileges; no direct or inherited anon profile privileges remain.
- An unrelated authenticated user sees zero profile rows.
- The JAMB catalogue contains 23 subjects; Full Mock is 180 questions / 7,200 seconds and Quick Mock is 40 questions / 1,800 seconds.
- `jamb_topics` contains zero rows pending approved syllabus taxonomy.
- `question_bank` remains at 3,740 rows; no question-bank rows were modified.
- GitHub Actions run 87 passed after adding the privilege-hardening migration and least-privilege SQL assertions.

The remote migration history now contains:
- `20261105140638 / create_question_bank`
- `20261106185031 / profile_privilege_hardening`
- `20261106185050 / phase1_foundation`
- `20261106185843 / profile_public_acl_hardening`

**Migration-ledger follow-up:** Phase 0 schema effects were present before this work but were not recorded in migration history. They were not rerun or falsely marked applied. The repository currently has legacy numbered migration filenames (`0001`, `0002`, `0003`) while the remote history uses timestamp versions. Reconcile/standardize local migration filenames and the Phase 0 baseline before relying on `supabase migration list`, automated deploys, or additional CLI migrations. Do not blindly repair history or rerun Phase 0.

Supabase's security advisor after remediation reports:
- INFO: `public.question_bank` has RLS enabled with no policies. This is intentional server-only access; do not add client policies without a separate question/answer-key access design.
- WARN: leaked-password protection remains disabled. This is a separate Auth project setting and was not changed because it can affect account sign-in behavior.

No application deployment, PR merge, or change to `main` was performed.

## Scope

This migration adds the canonical JAMB subject catalogue, syllabus-topic structure,
exam configuration records and normalized course-subject requirement records. It also
removes the two overly broad public profile policies confirmed in the current Supabase
project and replaces profile SELECT with authenticated owner-only access.

It does not modify `question_bank` rows, existing student profile data, authentication
users, or the existing question import process.

## Pre-remediation live schema snapshot (2026-11-06)

A read-only inspection of the connected project found:

- Migration history contained only `20261105140638 / create_question_bank`.
- The Phase 0 effects were present: `profiles.role`, its role check and index, `audit_logs`, and the `enforce_profile_protected_columns` trigger on `public.profiles`.
- The Phase 0 function definitions existed, but no user-defined trigger was attached to `auth.users` for `handle_new_or_linked_user`. The API creates and synchronizes profiles directly.
- None of the six Phase 1 catalogue/configuration tables existed yet.
- The existing `profiles` policies were the broad `ALL` policy and public `SELECT USING (true)` policy listed above.
- The live `anon` and `authenticated` roles had broad table-level grants, including TRUNCATE. RLS does not protect TRUNCATE; this was separately fixed by the privilege-hardening migration.
- The security-definer guard's `current_user` check could return early as the `postgres` function owner. In combination with the permissive UPDATE policy, clients could potentially alter protected identity and role columns. Treat this as a critical exposure until remediation is applied and verified.
- Supabase's security advisor reported leaked-password protection disabled. This is an Auth project setting, separate from the SQL migration.
- `question_bank` contained 3,740 rows and was intentionally outside this migration.

**Critical Phase 0 guard defect found during code audit:** the live
`enforce_profile_protected_columns()` was `SECURITY DEFINER`, owned by
`postgres`, and checked `current_user` for trusted roles. Inside a
`SECURITY DEFINER` function, `current_user` is the function owner, so the
trusted-role branch could return before checking protected columns. With the
broad profile policies, candidate role changes could not be assumed blocked.
The corrected implementation checks `session_user` for trusted direct database
sessions and the verified PostgREST JWT role for service-role requests. It is
included in both the corrected Phase 0 migration (for clean installs) and the
Phase 1 migration (to repair existing installs).

The absence of an `auth.users` trigger was not fixed by Phase 1: registration
currently creates the Auth user and profile through the API. Do not attach the
trigger as a shortcut; first choose and test one authoritative profile-creation
path to avoid duplicate or conflicting profile writes.

## Rollout requirements for future environments

1. Confirm a recent recoverable Supabase backup exists.
2. Confirm the application release that uses the canonical onboarding contract is ready.
3. Reconcile migration history. Phase 0 objects may exist without a recorded migration. Do not blindly rerun Phase 0 or mark it applied in migration history until the schema and deployment history have been compared.
4. Validate in an isolated PostgreSQL environment. GitHub Actions currently exercises the migrations and assertions against disposable PostgreSQL 16.
5. Confirm the target schema has the expected profile policies and Phase 0 functions before applying.
6. Check whether any production client still writes directly to `profiles`. Candidate profile writes should use the authenticated API; server service-role writes bypass RLS.
7. Obtain explicit production rollout approval.

Do not run these migrations automatically from application startup.

## Apply

Apply the migrations in dependency order using the approved Supabase migration workflow:
1. `supabase/migrations/0002_phase1_foundation.sql`
2. `supabase/migrations/0003_profile_privilege_hardening.sql`
3. `supabase/migrations/0004_profile_public_acl_hardening.sql`

The live project was remediated through the remote migration entries listed in the production application log. The SQL source files are retained as historical manual rollout scripts; see `supabase/migrations/README.md`. Resolve the repository/remote migration filename-version mismatch before using automated CLI migration status or subsequent deployments.

## Post-migration verification

Check the new catalogue and configurations:

```sql
select count(*) as subject_count from public.jamb_subjects;
select key, question_count, duration_seconds, total_subjects, compulsory_subject_slug
from public.exam_configurations order by key;
select count(*) as topic_count from public.jamb_topics;
```

Expected initial catalogue size: 23 subjects. Topics are intentionally not pre-seeded:
the existing local syllabus labels and frequency estimates have not yet been reconciled
against an approved syllabus source.

Check profile policies and grants:

```sql
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'profiles'
order by policyname;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'profiles'
order by grantee, privilege_type;
```

Expected: anon has no table privileges; authenticated has SELECT and UPDATE only;
SELECT and UPDATE remain scoped to the caller's own profile; there is no public
`ALL` policy and no public SELECT policy with `USING (true)`.

Verify the Phase 0 trigger-function hardening:

```sql
select p.proname, p.prosecdef, p.proconfig,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'enforce_profile_protected_columns',
    'handle_new_or_linked_user',
    'generate_sabi_unique_id'
  )
order by p.proname;
```

Expected: all three functions pin `search_path` to `pg_catalog, public`; the two
trigger functions are not executable by anon or authenticated. Their trigger
attachments must remain present, and registration/profile-update smoke tests must pass.

Test using both an authenticated candidate token and an anonymous key:
- Candidate can read exactly their own profile.
- Candidate cannot read another candidate's profile.
- Anonymous caller cannot read or modify profiles.
- Registration, login, verification and onboarding API flows still work.
- Onboarding persists the same canonical four subjects in both
  `registered_subjects` and `onboarding_answers.chosenSubjects`.

## Deliberate deferrals

- Course/institution subject combinations remain empty until requirements are verified
  against authoritative, year-specific admission sources.
- Syllabus topics remain empty until an approved syllabus taxonomy is supplied.
- No question-bank records or imports are changed by this phase.
- Supabase Auth confirmation policy and leaked-password protection are separate
  account-level settings and are not changed by these SQL migrations.

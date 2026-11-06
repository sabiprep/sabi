# Phase 1 foundation rollout

## Scope

This migration adds the canonical JAMB subject catalogue, syllabus-topic structure,
exam configuration records and normalized course-subject requirement records. It also
removes the two overly broad public profile policies confirmed in the current Supabase
project and replaces profile SELECT with authenticated owner-only access.

It does not modify `question_bank` rows, existing student profile data, authentication
users, or the existing question import process.

## Live schema reconciliation snapshot (2026-11-06)

A read-only inspection of the connected project found:

- Migration history contains only `20261105140638 / create_question_bank`.
- The Phase 0 effects are present: `profiles.role`, its role check and index, `audit_logs`, and the `enforce_profile_protected_columns` trigger on `public.profiles`.
- The Phase 0 function definitions exist, but no user-defined trigger is attached to `auth.users` for `handle_new_or_linked_user`. The API currently creates and synchronizes profiles directly.
- None of the six Phase 1 catalogue/configuration tables exists yet.
- The existing `profiles` policies are still the broad `ALL` policy and public `SELECT USING (true)` policy listed above.
- The live `anon` and `authenticated` roles also have table-level `SELECT` and `UPDATE` grants on `profiles`. Grants alone do not bypass RLS, but in combination with the current public `ALL USING (true)` policy they permit broad row access and updates. Treat this as a critical exposure until the policy correction is applied and verified.
- The security-definer guard's `current_user` check can return early as the `postgres` function owner. In combination with the permissive UPDATE policy, clients may be able to alter protected identity and role columns. Do not use the current live profile role as an authorization boundary until remediation is deployed.
- Supabase's security advisor also reports leaked-password protection disabled. This is an Auth project setting, separate from the SQL migration.
- `question_bank` contains 3,740 rows and is intentionally outside this migration.

**Critical Phase 0 guard defect found during code audit:** the live
`enforce_profile_protected_columns()` is `SECURITY DEFINER`, owned by
`postgres`, and checks `current_user` for trusted roles. Inside a
`SECURITY DEFINER` function, `current_user` is the function owner, so the
trusted-role branch can return before checking protected columns. With the
current broad profile policies, do not assume candidate role changes are blocked.
The corrected implementation checks `session_user` for trusted direct database
sessions and the verified PostgREST JWT role for service-role requests. It is
included in both the corrected Phase 0 migration (for clean installs) and the
Phase 1 migration (to repair existing installs).

The absence of an `auth.users` trigger is not fixed by Phase 1: registration
currently creates the Auth user and profile through the API. Do not attach the
trigger as a shortcut; first choose and test one authoritative profile-creation
path to avoid duplicate or conflicting profile writes.

The migration history mismatch remains unresolved. The presence of Phase 0
objects is evidence that its effects were applied, not proof that the recorded
migration history is complete. Do not insert a history row or rerun Phase 0
blindly. Reconcile the SQL objects and deployment history with the project
owner before adopting the migration ledger.

## Before applying to a live project

1. Confirm a recent recoverable Supabase backup exists.
2. Confirm the application release that uses the canonical onboarding contract is ready.
3. Reconcile migration history before applying anything. The connected project currently
   reports only `create_question_bank`, while this repository also contains
   `0001_phase0_security.sql`. Confirm whether Phase 0 was applied manually and compare
   its effects with the live schema. Do not blindly rerun Phase 0 or mark it applied in
   migration history until that comparison is complete.
4. Run the migration in a staging project first. If no staging environment is available
   at no additional cost, keep production migration blocked until an isolated validation
   path is approved; do not create a paid branch or apply directly to production as a
   shortcut.
5. Confirm the current project schema still has the two policy names referenced below:
   - `Allow insert and update via server`
   - `Allow read access to own profile`
6. Check whether any production client still writes directly to `profiles`. Candidate
   profile writes should use the authenticated API; server service-role writes bypass RLS.
7. Obtain explicit production rollout approval.

Do not run this migration automatically from application startup.

## Apply

Run `supabase/migrations/0002_phase1_foundation.sql` using the Supabase migration
workflow approved for this project. The migration is transactional and additive. It is
safe to rerun for its own objects, but it is not a substitute for staging validation.

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

Check profile policies:

```sql
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'profiles'
order by policyname;
```

Expected: authenticated users can SELECT only their own profile; UPDATE remains scoped
to their own profile with the existing protected-column trigger; there should be no
public `ALL` policy and no public SELECT policy with `USING (true)`.

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
- Anonymous caller cannot read profiles.
- Registration, login, verification and onboarding API flows still work.
- Onboarding persists the same canonical four subjects in both
  `registered_subjects` and `onboarding_answers.chosenSubjects`.

## Deliberate deferrals

- Course/institution subject combinations remain empty until requirements are verified
  against authoritative, year-specific admission sources.
- Syllabus topics remain empty until an approved syllabus taxonomy is supplied.
- No question-bank records or imports are changed by this phase.
- Supabase Auth confirmation policy and leaked-password protection are separate
  account-level settings and are not changed by this SQL migration.

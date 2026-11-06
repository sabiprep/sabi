# Phase 1 foundation rollout

## Scope

This migration adds the canonical JAMB subject catalogue, syllabus-topic structure,
exam configuration records and normalized course-subject requirement records. It also
removes the two overly broad public profile policies confirmed in the current Supabase
project and replaces profile SELECT with authenticated owner-only access.

It does not modify `question_bank` rows, existing student profile data, authentication
users, or the existing question import process.

## Before applying to a live project

1. Confirm a recent recoverable Supabase backup exists.
2. Confirm the application release that uses the canonical onboarding contract is ready.
3. Run the migration in a staging project first.
4. Confirm the current project schema still has the two policy names referenced below:
   - `Allow insert and update via server`
   - `Allow read access to own profile`
5. Check whether any production client still writes directly to `profiles`. Candidate
   profile writes should use the authenticated API; server service-role writes bypass RLS.
6. Obtain explicit production rollout approval.

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

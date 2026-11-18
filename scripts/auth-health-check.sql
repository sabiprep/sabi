-- ============================================================================
-- SABI auth health check — read-only
-- Created 19 November 2026 after "sign-in is broken" reports the API could not
-- explain: POST /api/auth/login answers 401/403/409/503 for six different
-- causes, and three of them are database state, not code.
--
-- Where to run it: Supabase Dashboard -> SQL Editor, in ONE project at a time.
-- Run the same file in both projects and compare the two outputs.
-- Safety: the transaction is READ ONLY and every statement is a SELECT. No
-- auth user, profile or migration row is modified. No full email is printed -
-- local parts are truncated to 3 characters.
--
-- Block map:
--   1  counts            2  identity providers
--   3  profiles with no auth identity (can never sign in)
--   4  auth identities with no profile (row gets repaired at sign-in)
--   5  auth email vs profile email drift  -> 401 on a correct password
--   6  duplicate identifiers -> .maybeSingle() -> 503 for every sign-in
--   7  unconfirmed accounts             8  per-account verdict table
-- ============================================================================

begin read only;

-- ---------------------------------------------------------------------------
-- 1. Overview. If auth_users is 0 in the project production points at, sign-in
--    cannot work for anybody and the cause is the project split, not the code.
-- ---------------------------------------------------------------------------
select
  1 as block,
  (select count(*) from auth.users)                                      as auth_users,
  (select count(*) from auth.users where email_confirmed_at is not null) as auth_confirmed,
  (select count(*) from auth.users where email_confirmed_at is null)     as auth_unconfirmed,
  (select count(*) from public.profiles)                                 as profile_rows,
  (select count(*) from auth.identities)                                 as identities;

-- ---------------------------------------------------------------------------
-- 2. Identity providers in use. A Google-only account has no password and will
--    always answer 401 to a password sign-in - that is not a bug.
-- ---------------------------------------------------------------------------
select 2 as block, provider, count(*) as identities
from auth.identities
group by provider
order by identities desc;

-- ---------------------------------------------------------------------------
-- 3. FAIL: profile rows with no auth identity. These users can never sign in,
--    and re-registering answers 409 "already registered". Expect 0 rows.
-- ---------------------------------------------------------------------------
select
  3 as block,
  left(split_part(p.email, '@', 1), 3) || '***@' || split_part(p.email, '@', 2) as email_masked,
  p.id,
  p.sabi_unique_id,
  p.created_at::date as profile_created
from public.profiles p
left join auth.users u on u.id = p.id
where u.id is null
order by p.created_at;

-- ---------------------------------------------------------------------------
-- 4. REPAIR: auth identities with no profile row. Sign-in succeeds (the API
--    creates the row), but RLS reads return nothing until it does. A large
--    count means the signup trigger never fired.
-- ---------------------------------------------------------------------------
select
  4 as block,
  left(split_part(u.email, '@', 1), 3) || '***@' || split_part(u.email, '@', 2) as email_masked,
  u.id,
  u.email_confirmed_at is not null as email_confirmed,
  u.created_at::date as signed_up
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
order by u.created_at;

-- ---------------------------------------------------------------------------
-- 5. FAIL: the auth identity and the profile disagree about the email.
--    /api/auth/login resolves targetEmail from PROFILES, so a stale profile
--    email makes a correct password answer 401 (or 409 when the ids differ).
-- ---------------------------------------------------------------------------
select
  5 as block,
  left(split_part(u.email, '@', 1), 3) || '***@' || split_part(u.email, '@', 2) as auth_email_masked,
  left(split_part(p.email, '@', 1), 3) || '***@' || split_part(p.email, '@', 2) as profile_email_masked,
  u.id,
  u.email_confirmed_at is not null as email_confirmed
from auth.users u
join public.profiles p on p.id = u.id
where lower(trim(u.email)) <> lower(trim(p.email))
   or coalesce(trim(p.email), '') = ''
order by u.created_at;


-- ---------------------------------------------------------------------------
-- 6. FAIL, worst case: two profile rows matching one login identifier. The
--    endpoint uses .or(...).maybeSingle(), so PostgREST raises
--    "multiple (or no) rows returned" and EVERY sign-in for that identifier
--    answers 503 "Sign-in is temporarily unavailable". Expect 0 rows.
-- ---------------------------------------------------------------------------
select
  6 as block,
  'email' as identifier_kind,
  left(split_part(lower(trim(email)), '@', 1), 3)
    || '***@' || split_part(lower(trim(email)), '@', 2) as identifier_hint,
  count(*)           as matching_profiles,
  count(distinct id) as distinct_ids,
  string_agg(id::text, ', ' order by id) as profile_ids
from public.profiles
where coalesce(trim(email), '') <> ''
group by lower(trim(email))
having count(*) > 1

union all

select
  6,
  'phone',
  left(regexp_replace(coalesce(phone, ''), '\d(?=\d{3})', '*', 'g'), 11),
  count(*),
  count(distinct id),
  string_agg(id::text, ', ' order by id)
from public.profiles
where coalesce(trim(phone), '') <> ''
group by phone
having count(*) > 1

order by 1, 2, 4 desc;


-- ---------------------------------------------------------------------------
-- 7. BLOCKED: unconfirmed accounts. With SABI_INSTANT_VERIFY=true the API
--    confirms the account after a correct password, so these only block the
--    browser token exchange. With the flag off they block sign-in outright.
-- ---------------------------------------------------------------------------
select
  7 as block,
  left(split_part(u.email, '@', 1), 3) || '***@' || split_part(u.email, '@', 2) as email_masked,
  u.id,
  u.created_at::date as signed_up,
  (select count(*) from auth.identities i
    where i.user_id = u.id and i.provider = 'email') as email_identities
from auth.users u
where u.email_confirmed_at is null
order by u.created_at;

-- ---------------------------------------------------------------------------
-- 8. The table to read first: one row per identity, with a plain-language
--    verdict. 'OK' means the account can sign in with a password right now.
-- ---------------------------------------------------------------------------
select
  8 as block,
  left(split_part(coalesce(u.email, p.email, ''), '@', 1), 3)
    || '***@' || split_part(coalesce(u.email, p.email, ''), '@', 2) as email_masked,
  coalesce(u.id, p.id) as id,
  u.created_at::date as signed_up,
  case
    when u.id is null                 then 'FAIL: profile without an auth identity'
    when p.id is null                 then 'REPAIR: auth identity without a profile row'
    when u.email_confirmed_at is null then 'BLOCKED: email not confirmed'
    when lower(trim(u.email)) <> lower(trim(p.email))
                                      then 'FAIL: auth email differs from profile email'
    when not exists (select 1 from auth.identities i
                      where i.user_id = u.id and i.provider = 'email')
                                      then 'NO PASSWORD: Google/other identity only'
    else 'OK'
  end as verdict
from auth.users u
full join public.profiles p on p.id = u.id
order by
  case
    when u.id is null then 1
    when p.id is null then 2
    when u.email_confirmed_at is null then 3
    when lower(trim(u.email)) <> lower(trim(p.email)) then 4
    else 5
  end,
  u.created_at desc
limit 200;

commit;

-- ============================================================================
-- After reading the results
-- ============================================================================
-- * Block 1 shows auth_users = 0 -> the project production points at has no
--   accounts. Stop: that is the two-project problem, not a code defect. Look at
--   the other project before changing anything.
-- * Block 3/6 rows -> fix the data, one row at a time, in a transaction, after a
--   backup. Never "fix" auth data by truncating a table.
-- * Block 5 rows -> reconcile profiles.email to auth.users.email after
--   confirming which address the candidate actually uses.
-- * Password recovery also needs, under Dashboard -> Authentication:
--     Email Templates -> "Reset Password" must contain {{ .Token }}, otherwise
--     the 6-digit code step (/api/auth/reset-password/confirm) can never work;
--     and custom SMTP should be configured, because the built-in sender is rate
--     limited to a handful of messages per hour and drops the rest silently.
--   Reference: supabase/reference/phase0_security.sql:191-194.
-- ============================================================================

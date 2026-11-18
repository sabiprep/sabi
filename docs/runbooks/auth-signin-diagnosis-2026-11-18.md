# Sign-in and password recovery: diagnosis — 18 November 2026

Status: investigation open. This document records what is **proven**, what is
**ruled out**, and the one read-only script that answers the rest. It exists so
the next person does not repeat the "the API looks fine" loop.

Related: `scripts/auth-health-check.sql`,
`supabase/tests/auth_health_check_fixture.sql`, `server.ts` (routes
`/api/auth/*`), `supabase/reference/phase0_security.sql`.

## 1. What is proven against production

Measured with `curl` against `https://sabi-tan.vercel.app` and against the
client bundle, not inferred:

| Check | Result |
| --- | --- |
| `GET /api/health` | `ok`, `configuration_error: null`, `instant_verify: true` |
| Wrong password on a real account | `401` + a message, not a crash |
| Unknown phone number | `404` |
| Malformed body | `400` |
| Browser bundle `supabaseUrl` | `https://dnrzixaasphxiswjyglj.supabase.co` |
| Anon key `ref` | `dnrzixaasphxiswjyglj` — same project as the URL |

So the deployment is not pointing at the wrong Supabase project, the function is
not missing environment variables, and the login endpoint is not failing
unconditionally. Whatever is broken is **per account** or **in the recovery
path**, and it cannot be seen from outside because every symptom collapses into
the same `401`.

## 2. What is ruled out

- **Stale bundle pointing at the old project** — the deployed bundle binds URL
  and anon key to the same ref.
- **Missing or blank server configuration** — `/api/health` reports
  `configuration_error: null`.
- **The endpoint being simply broken** — it returns distinct `400/401/404`
  statuses for distinct inputs.

## 3. The one defect that is provable from the code

The UI was still telling users to recover their account with the **retired**
5-character Unique SABI ID. Phase 0 removed that path
(`supabase/reference/phase0_security.sql:9,191-194`) and the endpoint that
implemented it now answers `410`; the supported path is a 6-digit code emailed
by `/api/auth/reset-password`. Four user-facing strings contradicted that:

| File | Was | Now |
| --- | --- | --- |
| `src/pages/PublicPages.tsx:782` | "reset using your 5-character Unique SABI ID" | "receive a 6-digit recovery code by email" |
| `src/pages/PublicPages.tsx:1022` | "You will need it if you ever reset your password" | ID is a support reference; resets use the emailed code |
| `src/pages/PublicPages.tsx:1024` | "Provide … your 5-character Unique SABI ID as verification grant" | enter email/phone, receive the emailed code |
| `src/pages/PublicPages.tsx:1319`, `src/pages/StudentPages.tsx:1514` | "required to reset your password" | support reference only |

A user who followed those instructions reached a dead end that looks exactly
like "password reset is broken". This is fixed; it does **not** explain a plain
sign-in failure.

## 4. Recovery also needs two dashboard settings

Code cannot compensate for these, and neither is visible from `/api/health`:

1. **Authentication → Email Templates → Reset Password must contain

## 5. Run `scripts/auth-health-check.sql`

Read-only: `begin read only`, eight `SELECT` blocks, no writes, no full email
addresses. Run it in the SQL editor of **one** project at a time and compare.

| Block | Shows | If it returns rows |
| --- | --- | --- |
| 1 | auth users, confirmed/unconfirmed, profile rows, identities | `auth_users = 0` → the project has no accounts; the problem is the two-project split, stop here |
| 2 | identity providers | a Google-only account has no password, so `401` is correct behaviour |
| 3 | profile rows with no auth identity | can never sign in; re-registering answers `409` |
| 4 | auth identities with no profile row | sign-in works, the row is created at sign-in; a large count means the signup trigger never fired |
| 5 | auth email ≠ profile email | `/api/auth/login` resolves the email from `profiles`, so a stale profile email answers `401` for a correct password |
| 6 | two profiles matching one identifier | `.or(...).maybeSingle()` raises, and **every** sign-in for that identifier answers `503` |
| 7 | unconfirmed accounts | blocked at the browser token exchange when `instant_verify` is off |
| 8 | per-account verdict | read this first: `OK`, `FAIL: …`, `REPAIR: …`, `BLOCKED: …`, `NO PASSWORD: …` |

Note on block 6: `profiles.email` is `UNIQUE`, so the email branch can only fire
if that constraint was dropped; the phone branch is the live risk, because
`profiles.phone` has no uniqueness constraint.

## 6. How to fix what it finds

Never truncate or bulk-update auth tables. One row at a time, in a transaction,
after a backup:

- **Block 3 / 6** — a data repair: delete the duplicate profile or give the
  orphan its account back. Confirm the identifier with the candidate first.
- **Block 4** — usually nothing: the API repairs the row on the next sign-in. If
  the count keeps growing, the `handle_new_or_linked_user` trigger is missing.
- **Block 5** — reconcile `profiles.email` to `auth.users.email` once you know
  which address the candidate actually uses.
- **Block 7** — confirm the account (`instant_verify` already does this after a
  correct password) or resend confirmation.

## 7. Regression guard

`supabase/tests/auth_health_check_fixture.sql` seeds one identity per failure
mode; `backend-ci.yml` applies it and then executes the health check with
`ON_ERROR_STOP=1`. Every verdict branch therefore runs on real PostgreSQL on
each push instead of only being syntax-parsed, so a renamed column or a broken
aggregate fails CI rather than production triage.

## 8. Still open

- The full project's ref (only `dnrzixaasphxiswjyglj` is known) and the copy of
  its reference data — see `supabase-copy-full-into-main-2026-11-14.md`.
- The accounts-migration decision, and removal of the test account
  `phase0-check-20261114@example.com`.
- No production credentials exist locally (`.env` is the template), so blocks
  1-8 must be run by the operator. That is the only reason this document ends
  with a table of possibilities rather than a single cause.

   `{{ .Token }}`.** `server.ts` asks for and verifies a numeric code
   (`verifyOtp({ type: 'recovery' })`). The stock template only ships a
   `{{ .ConfirmationURL }}` link, so the code step can never succeed.
2. **Custom SMTP should be configured.** The built-in sender is rate limited to
   a handful of messages per hour; beyond that, recovery emails are silently
   dropped, so "I never got the code" is a mail configuration symptom, not a
   code defect.

# Phase 0 go-live — do these in order

This is the **only** list of work that has to happen **outside the repo**
(Supabase dashboard, Vercel dashboard). Everything inside the code is finished
and tested. Nothing here is optional, and the order matters.

> Reference for *why* each step exists and for troubleshooting:
> `docs/runbooks/phase0-rollout.md`. You do not need to read it to go live.

## Status right now

| Part | State |
| --- | --- |
| Code (API, auth endpoints, boot guard, tests) | **done** — `tsc` 0 errors, 92 tests green, build OK |
| Supabase (schema + Phase 0 rules) | **unknown** until you run **A1** |
| Vercel (env vars, Node version) | **not done** — this is exactly why sign-up fails on the URL |

**Have the Supabase rules changed?** No. The SQL in `supabase/migrations/` has not
changed, and none of the recent API work needs a database change. **A1** proves it
either way, in 30 seconds.

---

## A. Supabase — about 15 minutes

**Your live project may already be done.** `docs/runbooks/phase1-rollout.md`
records that project `dnrzixaasphxiswjyglj` received the profile hardening and the
Phase 1 foundation SQL on 2026-11-06 (`profile_privilege_hardening`,
`phase1_foundation`, `profile_public_acl_hardening` in its migration ledger). If
that is your project, run **no SQL at all** — A1 tells you which case you are in,
and A1 + A3 + A4 is your whole Supabase step.

### A1. Find out where you are (read-only, 30 seconds)

**SQL Editor → New query** → paste `supabase/verify_phase0.sql` → **Run**.
It returns one table of 19 rows, `OK` / `MISSING`, and never writes anything.

* every row `OK` → nothing to apply, go straight to **A4** (Auth settings);
* any row `MISSING` → run what the third column names, in the order in A2.

### A2. Apply SQL — only if A1 reported `MISSING`, always ascending

| # | File | What it is |
| --- | --- | --- |
| 0 | `supabase_schema.sql` (repo root) | base schema — **only** on a project with no `public.profiles` at all |
| 1 | `supabase/migrations/0001_phase0_security.sql` | Phase 0: `profiles.role`, protected-columns trigger, `audit_logs`, no auto-confirm, recovery RPC dropped |
| 2 | `supabase/migrations/0002_phase1_foundation.sql` | owner-only SELECT policy, `session_user` version of the trigger, catalogue tables |
| 3 | `supabase/migrations/0003_profile_privilege_hardening.sql` | least-privilege grants for `anon` / `authenticated` |
| 4 | `supabase/migrations/0004_profile_public_acl_hardening.sql` | removes inherited `PUBLIC` grants |

⚠️ **Ascending order only.** All five files are idempotent and safe to re-run,
but `0001` restores `handle_new_or_linked_user` with the looser
`search_path = public`; `0002` then pins it to `pg_catalog, public` and revokes
client `EXECUTE`. Run `0001` last and you quietly undo that hardening.

⛔ **Never re-run `supabase_schema.sql` after 0001** — it restores the email
auto-confirm trigger and the weak 5-character recovery RPC that Phase 0 removes.

⚠️ Do **not** use `supabase db push` here; `supabase/migrations/README.md`
explains why (the local numbering does not match the remote ledger).

### A3. Confirm the database matches the code

Run `supabase/verify_phase0.sql` again. **Every row must read `OK`** — that is
the definition of "the Supabase rules are up to date". If any row still says
`MISSING`, the third column names the file to run.

Optional spot-check afterwards, one query at a time:
`supabase/verify_phase0_data.sql` (account count, roles all `STUDENT`,
`rows_with_unknown_role` = `0`).

### A4. Authentication → URL Configuration

| Field | Value |
| --- | --- |
| Site URL | `https://sabi.vercel.app` (your real production domain) |
| Redirect URLs | `https://sabi.vercel.app/**`, `http://localhost:5173/**`, `capacitor://localhost` |

A `redirectTo` that is not on this list is silently replaced by the Site URL, so
recovery emails would open the wrong page.

### A5. Authentication → Emails → **Reset Password** template

The app asks candidates for a **6-digit code**, not a link, so the template must
contain `{{ .Token }}`. Supabase's stock template does not. Body:

```html
<h2>Reset your SABI password</h2>
<p>Enter this 6-digit code in the app to choose a new password:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px">{{ .Token }}</p>
<p>The code expires in 1 hour. If you did not request it, ignore this email —
your password stays unchanged.</p>
<p><a href="{{ .SiteURL }}">Open SABI</a></p>
```

Send yourself one real recovery email and confirm the code renders before
telling anyone the feature exists.

### A6. Promote the first `MASTER_ADMIN`

Sign up through the app once (so the profile row exists), then in SQL Editor:

```sql
UPDATE public.profiles SET role = 'MASTER_ADMIN' WHERE email = 'you@example.com';
```

Role changes are rejected for `anon`/`authenticated` by design — the SQL editor
(`postgres`) is an allowed context.

---

## B. Vercel — about 10 minutes

### B1. Node.js version

**Project → Settings → General → Node.js Version → `22.x`** (the repo's
`engines.node` is `22.x`; older runtimes cannot load the server bundle).

### B2. Environment variables — Production scope, all of them

**Project → Settings → Environment Variables.** Tick **Production** (and
Preview if you smoke-test previews) for every row:

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → **service_role** secret. Server-only: never prefix `VITE_` |
| `VITE_SUPABASE_URL` | same URL as `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → **anon public** key |
| `SABI_APP_URL` | `https://sabi.vercel.app` |
| `ALLOWED_ORIGINS` | `https://sabi.vercel.app` (comma separated, no trailing slash) |
| `SABI_INSTANT_VERIFY` | `true` — server confirms the account at sign-up |
| `GEMINI_API_KEY` | optional; without it AI routes return simulated drafts |
| `VITE_API_BASE_URL` | leave **unset** — same-origin means `/api` on this domain |

Two different consumers, which is why both `VITE_*` pairs are needed:
the static site reads `VITE_*` **at build time** (inlined into the JS),
the API function reads the server variables **at request time**.

### B3. Redeploy

**Deployments → ⋯ → Redeploy** and **uncheck "Use existing Build Cache"**
(`VITE_*` values are baked into the bundle, so a cached build keeps the old
values). Adding an env var does **not** update a running deployment by itself.

Nothing else needs changing: `vercel.json` holds the build/output settings and
`.npmrc` sets `legacy-peer-deps=true`, matching CI.

---

## C. Verify on the URL — about 5 minutes

```bash
APP=https://sabi.vercel.app
# 1. The API is alive AND configured. Expect status ok, admin_configured true,
#    runtime vercel-function, configuration_error null.
curl -s "$APP/api/health"

# 2. Sign-up really writes to Supabase. Expect {"status":"created", …}
curl -s -X POST "$APP/api/auth/register" -H 'content-type: application/json' \
  -d '{"fullName":"Phase 0 Test","email":"phase0-test-1@yourdomain.com","password":"Test1234!","phone":"08000000000","stateOfOrigin":"Lagos"}'

# 3. Login through the API. Expect {"status":"authenticated", …}
curl -s -X POST "$APP/api/auth/login" -H 'content-type: application/json' \
  -d '{"email":"phase0-test-1@yourdomain.com","password":"Test1234!"}'

# 4. The browser/WebView preflight is answered. Expect 204.
curl -s -o /dev/null -w '%{http_code}\n' -X OPTIONS "$APP/api/auth/register" \
  -H 'Origin: https://sabi.vercel.app' -H 'Access-Control-Request-Method: POST'
```

Then the real test: **sign up from the deployed page with a brand-new email**
and sign in with it.

| What you see | What it means | Fix |
| --- | --- | --- |
| `503 {"code":"API_NOT_CONFIGURED","missing":["…"]}` | that variable is not set for Production | B2, then B3 |
| `500 {"code":"API_BOOT_FAILED", …}` | function died on import | Vercel logs, then B1/B2 |
| `302` + HTML mentioning `__cookie_check.html` | wrong host: not this project's deployment | use the exact deployment URL |
| `500` with a Postgres/RLS message | rules not applied | A2, then A3 |
| `200` health but `admin_configured:false` | service-role key missing or wrong scope | B2, then B3 |

---

## D. Sign-off — tick all five, then Phase 1 starts

- [ ] `/api/health` → `status:"ok"`, `admin_configured:true`, `runtime:"vercel-function"`
- [ ] Sign-up on the deployed URL with a fresh email creates the account and shows a SABI ID
- [ ] Sign-in with that account works
- [ ] Forgot Password email contains the 6-digit code and resets the password
- [ ] The Android APK, rebuilt against this URL, signs up successfully

Phase 0 is **not** "fixed" until all five boxes are ticked. No Phase 1 work
(no new features, no schema changes) starts before that.

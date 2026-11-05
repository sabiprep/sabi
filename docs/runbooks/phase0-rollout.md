# Phase 0 Rollout Runbook

Ordered, copy-paste procedure for taking the Phase 0 security work live.
Follow the order — every step depends on the one before it.

| # | Step | Who | Time |
| --- | --- | --- | --- |
| 0 | Pre-flight checks (CI green, branch, backup) | Dev | 5 min |
| 1 | Apply `0001_phase0_security.sql` | Dev/DBA | 5 min |
| 2 | Verify the database state | Dev/DBA | 5 min |
| 3 | Set server env vars and deploy the API | DevOps | 10 min |
| 4 | Configure Supabase Auth (Site URL, redirects, reset template) | Dev | 5 min |
| 5 | Promote the first `MASTER_ADMIN` | Dev/DBA | 2 min |
| 6 | Smoke test (API + app) | QA/Dev | 20 min |
| 7 | Post-deploy checks and rollback plan | DevOps | — |

---

## 0. Pre-flight

```bash
git checkout main && git pull
npm ci
npm run lint      # tsc --noEmit  → must exit 0
npm test          # vitest run    → 45 tests, 0 failures
npm run build     # vite build + esbuild server bundle
```

* Take a database backup: **Supabase → Database → Backups → Create backup**
  (or at minimum export `public.profiles`):
  ```bash
  pg_dump "$DATABASE_URL" --schema=public --no-owner > backups/profiles-$(date +%F).sql
  ```
* Confirm `supabase_schema.sql` has already been applied. The migration only
  *hardens* an existing schema; it does not create `public.profiles`.

---

## 1. Apply the migration

**Supabase dashboard → SQL Editor → New query**, paste the entire contents of
`supabase/migrations/0001_phase0_security.sql`, then **Run**.

The file is wrapped in `BEGIN; … COMMIT;` and is **idempotent** — running it
twice is safe. If any statement fails, the whole transaction rolls back and
nothing is half-applied; fix the reported line and re-run.

What it changes:

| Object | Change |
| --- | --- |
| `public.profiles.role` | New column, `TEXT NOT NULL DEFAULT 'STUDENT'` + `profiles_role_check` constraint (6 allowed roles) + index |
| `public.enforce_profile_protected_columns()` | New trigger function; blocks `id`, `role`, `sabi_unique_id`, `email` changes for `anon`/`authenticated` |
| `enforce_profile_protected_columns` trigger | `BEFORE UPDATE` on `public.profiles` |
| `public.handle_new_or_linked_user()` | Replaced: **no longer auto-confirms emails** (trigger `on_auth_user_created` stays attached) |
| `public.verify_sabi_unique_id_for_recovery(TEXT, TEXT)` | **Dropped** (the enumerable recovery oracle) |
| `public.audit_logs` | New append-only table + RLS (service role writes, admins read) |
| `profiles` UPDATE policy | Re-created with an explicit `WITH CHECK (auth.uid() = id)` |

### ⚠️ Important: never run this against production with `supabase db push`
If you use the Supabase CLI, run `supabase db push --dry-run` first and inspect
the diff. The SQL editor path above is the recommended one for this migration
because it also touches `auth.users` triggers.

---

## 2. Verify the database state

Run each query in the SQL editor and compare with the expected result.

```sql
-- 2a. role column: TEXT, default 'STUDENT', NOT NULL  → 1 row
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role';

-- 2b. constraint present  → profiles_role_check with the 6 roles
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE conname = 'profiles_role_check';

-- 2c. trigger enabled ('O' = enabled, origin)
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'public.profiles'::regclass AND NOT tgisinternal;

-- 2d. enforcement function present, recovery RPC gone (1 row, not 2)
SELECT proname FROM pg_proc
WHERE proname IN ('enforce_profile_protected_columns', 'verify_sabi_unique_id_for_recovery');

-- 2e. candidate UPDATE policy has a WITH CHECK
SELECT policyname, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles';

-- 2f. audit table exists
SELECT to_regclass('public.audit_logs');

-- 2g. every existing account starts as STUDENT
SELECT role, count(*) FROM public.profiles GROUP BY role;
```

**Acceptance:** `role` = `STUDENT` for all existing rows; the enforcement function
exists; `verify_sabi_unique_id_for_recovery` returns **no rows**.

---

## 3. Set server environment variables and deploy

The API **refuses to start** outside `NODE_ENV=test` when either of these is
missing (see `server/lib/supabaseAdmin.ts`):

```
[SABI] SUPABASE_URL (or VITE_SUPABASE_URL) is not set. ...
[SABI] SUPABASE_SERVICE_ROLE_KEY is not set. Privileged server operations ...
```

That is intentional: a missing key used to mean a silent fallback to the anon key.

### 3a. Required variables

| Variable | Example | Notes |
| --- | --- | --- |
| `SUPABASE_URL` (or `VITE_SUPABASE_URL`) | `https://abcd1234.supabase.co` | trailing `/rest/v1` is stripped automatically |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi…` | **server only.** Project Settings → API → `service_role`. Never prefix with `VITE_` |
| `SABI_APP_URL` | `https://sabi.vercel.app` | `redirectTo` for `resetPasswordForEmail` |
| `ALLOWED_ORIGINS` | `https://sabi.vercel.app,https://admin.sabi.ng` | comma separated, no trailing slash |
| `SABI_INSTANT_VERIFY` | `true` | `false` disables server-side auto-confirm at sign-up |
| `GEMINI_API_KEY` | `AIza…` | optional; AI routes fall back to simulated drafts |

Optional tuning: `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` (120),
`AUTH_RATE_LIMIT_MAX` (10), `AI_RATE_LIMIT_MAX` (20), `MAX_JSON_BODY` (256kb).

> `localhost`, `127.0.0.1`, `capacitor://localhost`, `https://localhost`,
> `ionic://localhost` and any `https://sabi*.vercel.app` origin are always
> allowed — do **not** list them in `ALLOWED_ORIGINS`.

### 3b. Vercel

Dashboard → **Project → Settings → Environment Variables** → add each var for
*Production* (and *Preview* if you run preview smoke tests), then **Redeploy**.
Env changes never apply to an existing deployment.

```bash
vercel env add SUPABASE_SERVICE_ROLE_KEY production   # paste value when prompted
vercel env add SABI_APP_URL production
vercel env add ALLOWED_ORIGINS production
vercel env add SABI_INSTANT_VERIFY production
vercel env ls production
vercel --prod                                          # redeploy
```

### 3c. Cloud Run (current production host)

```bash
gcloud run services update sabi-api \
  --region europe-west1 \
  --update-env-vars \
SUPABASE_URL="https://abcd1234.supabase.co",SUPABASE_SERVICE_ROLE_KEY="eyJ…",SABI_APP_URL="https://sabi.vercel.app",ALLOWED_ORIGINS="https://sabi.vercel.app",SABI_INSTANT_VERIFY="true",NODE_ENV="production"
```

Use `--update-env-vars` (merge) rather than `--set-env-vars` (replace) — the
latter silently drops `GEMINI_API_KEY`. Preferred for the key itself:

```bash
gcloud run services update sabi-api --region europe-west1 \
  --update-secrets SUPABASE_SERVICE_ROLE_KEY=sabi-service-role:latest
```

### 3d. Confirm the boot guard

```bash
curl -sS -i "$API_BASE_URL/api/health" | head -1      # expect HTTP/2 200
curl -sS "$API_BASE_URL/api/health"                   # must be JSON, not HTML
curl -sS -i "$API_BASE_URL/api/questions" | head -1   # expect HTTP/2 200
```

`/api/health` returns only booleans, so it is safe to hit from anywhere:

```json
{
  "status": "ok",
  "phase": "phase0",
  "supabase_url_configured": true,
  "service_role_configured": true,
  "instant_verify": true,
  "ai_configured": true,
  "extra_cors_origins": 1
}
```

If any `*_configured` flag is `false`, stop: the deployment is missing an env var
(§3a). If the response is **HTML** instead of JSON, `$API_BASE_URL` is pointing at
a static/SPA host or a preview proxy rather than this Express app — see §8.

Then check the logs: there must be **no**
`[SABI] SUPABASE_SERVICE_ROLE_KEY is not set` line, and no `x-powered-by`
header in the response.

---

## 4. Configure Supabase Auth

### 4a. Site URL and redirect allow-list

**Authentication → URL Configuration**

* **Site URL**: `https://<your-app-domain>` (same value as `SABI_APP_URL`)
* **Redirect URLs**: add `https://<your-app-domain>/**`, plus
  `http://localhost:5173/**` for local work, and `capacitor://localhost` if the
  Android build is live.

A `redirectTo` that is not on this list is silently replaced by the Site URL, so
recovery emails would link to the wrong page.

### 4b. Reset Password template — **must contain `{{ .Token }}`**

The confirm endpoint calls `verifyOtp({ type: 'recovery', token: otp })`, i.e. it
needs the **6-digit code**, not a magic link. Supabase's stock template only
renders `{{ .ConfirmationURL }}`, so recovery step 2 cannot work until this is
fixed (users would get a link and no code to type).

**Authentication → Emails → Reset Password**, body:

```html
<h2>Reset your SABI password</h2>
<p>Enter this 6-digit code in the app to choose a new password:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px">{{ .Token }}</p>
<p>The code expires in 1 hour. If you did not request it, ignore this email —
your password stays unchanged.</p>
<p><a href="{{ .SiteURL }}">Open SABI</a></p>
```

Send yourself a real recovery email and confirm the code renders. Until that is
verified, do not announce the password-reset feature.

### 4c. Other Auth settings to align

| Setting | Value | Why |
| --- | --- | --- |
| Confirm email | ON, once `SABI_INSTANT_VERIFY=false` | the trigger no longer auto-confirms |
| Minimum password length | `8` | matches `passwordSchema` |
| Leaked password protection | ON (if on plan) | free win |
| Auth rate limits | keep defaults | complements the API limiter (10/min on `/api/auth/*`) |

---

## 5. Promote the first `MASTER_ADMIN`

Roles live on `public.profiles.role` and are **never** client-writable: the
`enforce_profile_protected_columns` trigger rejects `role` changes from
`anon`/`authenticated`, while the service role and the SQL editor (`postgres` /
`supabase_admin`) pass through.

1. Create the admin account **through the app** so the profile row exists, then
   locate it:

   ```sql
   SELECT id, email, sabi_unique_id, role, created_at
   FROM public.profiles
   ORDER BY created_at DESC
   LIMIT 10;
   ```

2. Promote (by email — no UUID copy-paste):

   ```sql
   UPDATE public.profiles
   SET role = 'MASTER_ADMIN', updated_at = NOW()
   WHERE email = 'admin@sabi.ng'
   RETURNING id, email, role;
   ```

   By SABI ID instead: `WHERE sabi_unique_id = 'A4K7X';`

3. Verify:

   ```sql
   SELECT role, count(*) FROM public.profiles GROUP BY role;
   ```

4. Confirm enforcement end to end:

   ```bash
   # MASTER_ADMIN token → 200 (draft question returned)
   curl -sS -o /dev/null -w '%{http_code}\n' -X POST "$API_BASE_URL/api/generate-question" \
     -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
     -d '{"subject":"Physics","topic":"Waves"}'

   # STUDENT token → 403 { "error": "Your account does not have permission ..." }
   curl -sS -X POST "$API_BASE_URL/api/generate-question" \
     -H "Authorization: Bearer $STUDENT_TOKEN" -H 'Content-Type: application/json' \
     -d '{"subject":"Physics","topic":"Waves"}'
   ```

5. **Prove a candidate cannot self-elevate** — the core Phase 0 guarantee:

   ```bash
   curl -sS -X PATCH "$SUPABASE_URL/rest/v1/profiles?id=eq.$USER_ID" \
     -H "apikey: $ANON_KEY" \
     -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
     -H 'Content-Type: application/json' \
     -H 'Prefer: return=representation' \
     -d '{"role":"MASTER_ADMIN"}'
   ```

   Expected: error mentioning
   `profiles.role can only be changed by SABI administrators`, and the row role is
   still `STUDENT`.

> Fallback only if the SQL editor is unavailable: temporarily
> `ALTER TABLE public.profiles DISABLE TRIGGER enforce_profile_protected_columns;`
> → run the `UPDATE` → `ALTER TABLE public.profiles ENABLE TRIGGER enforce_profile_protected_columns;`.
> Never leave the trigger disabled.

---

## 6. Live smoke test

### 6a. Prepare

```bash
export API_BASE_URL="https://<your-api-host>"          # Vercel/Cloud Run URL
export SUPABASE_URL="https://<project>.supabase.co"
export ANON_KEY="<anon/publishable key>"
export TEST_EMAIL="sabi-smoke-$(date +%s)@yourdomain.com"
export TEST_PASSWORD="SmokeTest!2026"
```

### 6b. API sequence (register → login → verify → onboarding → progress)

```bash
# 1. Register: expect {"status":"created","auth_user_id":"…","sabi_unique_id":"1234K"}
curl -sS -X POST "$API_BASE_URL/api/auth/register" -H 'Content-Type: application/json' -d "{
  \"fullName\": \"Smoke Test\",
  \"email\": \"$TEST_EMAIL\",
  \"password\": \"$TEST_PASSWORD\",
  \"phone\": \"08012345678\",
  \"stateOfOrigin\": \"Lagos\"
}" | tee /tmp/sabi-register.json

# 2. Login through the API: expect {"status":"authenticated",...}
curl -sS -X POST "$API_BASE_URL/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"identifier\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"method\":\"email\"}"

# 3. Obtain a real Supabase access token (what the app's SDK does)
export ACCESS_TOKEN=$(curl -sS -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" | jq -r .access_token)
echo "token length: ${#ACCESS_TOKEN}"        # must be > 100

# 4. Verify own account: expect {"verified":true,"sabi_unique_id":"…"}
curl -sS -X POST "$API_BASE_URL/api/auth/verify" \
  -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$TEST_EMAIL\"}"

# 5. Onboarding: expect {"status":"saved"}
curl -sS -X POST "$API_BASE_URL/api/profile/onboarding" \
  -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Content-Type: application/json' \
  -d '{"onboardingAnswers":{"goal":"450+","studyHours":4},
       "registeredSubjects":["English Language","Mathematics","Physics","Chemistry"],
       "targetScore":340}'

# 6. Progress sync: expect {"status":"synced"}  (not "synced_locally")
curl -sS -X POST "$API_BASE_URL/api/profile/progress" \
  -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Content-Type: application/json' \
  -d '{"progress":{"diamonds":12,"streak":3,"lastSession":"2026-11-05"}}'

# 7. Read the row back under RLS as the candidate (own row only)
curl -sS "$SUPABASE_URL/rest/v1/profiles?select=*" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.[0] | {email, role, onboarding_completed, target_score, diamond: .onboarding_answers.live_progress.diamonds}'
# expect exactly 1 row, role = "STUDENT", onboarding_completed = true, diamonds = 12
```

### 6c. Negative checks — all must fail closed

```bash
# a. No token → 401
curl -sS -o /dev/null -w 'no-token progress: %{http_code}\n' -X POST \
  "$API_BASE_URL/api/profile/progress" -H 'Content-Type: application/json' -d '{"progress":{}}'

# b. Garbage token → 401 (never a 500)
curl -sS -o /dev/null -w 'bad-token verify: %{http_code}\n' -X POST \
  "$API_BASE_URL/api/auth/verify" -H 'Authorization: Bearer not.a.real.token' \
  -H 'Content-Type: application/json' -d '{}'

# c. Verifying somebody else's email → 403
curl -sS -X POST "$API_BASE_URL/api/auth/verify" \
  -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Content-Type: application/json' \
  -d '{"email":"someone.else@example.com"}' | jq -r .error

# d. STUDENT calling the AI pipeline → 403
curl -sS -o /dev/null -w 'student ai: %{http_code}\n' -X POST \
  "$API_BASE_URL/api/generate-question" -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' -d '{"subject":"Physics","topic":"Waves"}'

# e. Smuggled privileges / unknown keys → 400 with details[]
curl -sS -X POST "$API_BASE_URL/api/profile/onboarding" \
  -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Content-Type: application/json' \
  -d '{"onboardingAnswers":{},"role":"MASTER_ADMIN"}' | jq

# f. Retired SABI-ID recovery endpoint → 410 gone (fails loudly for stale APKs)
curl -sS -o /dev/null -w 'legacy recovery: %{http_code}\n' -X POST \
  "$API_BASE_URL/api/auth/reset-password" -H 'Content-Type: application/json' -d '{}'

# g. Unknown /api route → JSON 404, not the SPA HTML
curl -sS -o /dev/null -w 'unknown api: %{http_code}\n' "$API_BASE_URL/api/does-not-exist"

# h. CORS: production origin allowed, foreign origin blocked
curl -sS -o /dev/null -D - -X OPTIONS "$API_BASE_URL/api/questions" \
  -H 'Origin: https://evil.example' -H 'Access-Control-Request-Method: GET' | grep -i access-control || echo 'no ACAO header (correct)'

# i. Recovery request is enumeration-proof: 200 with a generic message
curl -sS -X POST "$API_BASE_URL/api/auth/reset-password/request" \
  -H 'Content-Type: application/json' -d '{"identifier":"nobody@nowhere.test"}' | jq -r .status
```

### 6d. App-level walkthrough (browser + Android)

| # | Action | Expected |
| --- | --- | --- |
| 1 | Sign up with a fresh email | Lands on the verify step; profile row appears in `profiles` with `role = STUDENT` |
| 2 | Complete verification | `sabi_unique_id` shown, matches the DB row |
| 3 | Sign out, sign in again | Session restored by the Supabase SDK |
| 4 | DevTools → Application → **delete every `localStorage` key** → reload | Still signed in (identity comes from the session, not localStorage) |
| 5 | Clear cookies + localStorage (full sign-out) → reload `/home` | Redirected to the splash/login screen |
| 6 | Complete onboarding | `onboarding_completed = true`, `target_score` saved |
| 7 | Answer a question, gain diamonds, reload | `onboarding_answers.live_progress` updated, balance survives reload |
| 8 | Forgot Password with a real inbox | Email arrives **with a visible 6-digit code**; entering it + a new password signs in with the new password |
| 9 | Ask the AI tutor (chat/explain) while signed in | 200; while signed out → 401 and the UI asks for sign-in |
| 10 | Android build (`capacitor://localhost`) | Same flows work; no CORS errors in logcat |

---

## 7. Post-deploy checks, rollback, sign-off

### 7a. First 24 hours — watch these

| Signal | Where | Healthy |
| --- | --- | --- |
| 401 rate on `/api/profile/*` | API logs / Vercel | near zero for signed-in users; a spike means a client sends no token |
| 403 on `/api/generate-question` | API logs | only non-staff accounts |
| `[SABI] Recovery email dispatch failed` | server console | absent |
| `Could not resolve account role, failing closed as STUDENT` | server console | absent (means `profiles.role` is missing for a user) |
| `synced_locally` responses | API logs | only during flaky network, not systematically |
| Postgres `distinct too` / trigger errors on `profiles` | Supabase → Logs → Postgres | absent |

### 7b. Rollback

The code side is safe to revert; the **database migration is additive** and
should be kept in almost every scenario.

* **Revert the API only:** redeploy the previous Cloud Run revision or Vercel
  deployment. The old server works against the migrated schema (the new `role`
  column is additive, and the trigger only blocks `role`/`id`/`email` changes).
* **Revert the client only:** redeploy the previous web build/APK. It will get
  `410` from the retired recovery route and must fall back to Forgot Password.
* **Emergency DB unblock** (only if something went badly wrong):
  ```sql
  ALTER TABLE public.profiles DISABLE TRIGGER enforce_profile_protected_columns;
  -- …fix the data…
  ALTER TABLE public.profiles ENABLE TRIGGER enforce_profile_protected_columns;
  ```
* **Restoring the old recovery RPC is not recommended.** If you must, re-create
  `public.verify_sabi_unique_id_for_recovery` from `supabase_schema.sql` **and**
  redeploy the previous server — but note this re-opens defect B5 (anyone who
  knows a 5-character ID can reset that account).

### 7c. Sign-off checklist

Copy into the PR / release notes and tick each box:

- [ ] `npm run lint`, `npm test`, `npm run build` green on the release commit
- [ ] Migration applied and verified (§2 queries)
- [ ] `verify_sabi_unique_id_for_recovery` no longer exists
- [ ] `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SABI_APP_URL`, `ALLOWED_ORIGINS` set in prod and redeployed
- [ ] API boots with no `[SABI] … is not set` error
- [ ] Supabase Site URL + Redirect URLs configured
- [ ] Reset Password template contains `{{ .Token }}` and a real email was received
- [ ] First `MASTER_ADMIN` promoted, `generate-question` returns 200 for them / 403 for a STUDENT
- [ ] Candidate `PATCH /profiles` with `{"role":"MASTER_ADMIN"}` is rejected by the trigger
- [ ] Smoke test §6b passed end to end (`status: created` → `authenticated` → `verified` → `saved` → `synced`)
- [ ] Negative checks §6c all fail closed (401/403/400/410/404)
- [ ] App walkthrough §6d passed on web **and** Android
- [ ] `docs/security-phase0.md` reviewed by a second engineer
- [ ] Known residual risk logged: candidates can still update their own non-protected profile columns (`full_name`, `onboarding_answers`, …) — narrowing this is Phase 1 work.

### 7d. Known residual risks (accepted for Phase 0)

1. `SABI_INSTANT_VERIFY=true` keeps server-side auto-confirm at sign-up; flipping
   it to `false` requires the email-confirm UI to be ready.
2. The `profiles` UPDATE policy still allows a candidate to write their own
   non-protected columns. Only `id`, `role`, `sabi_unique_id` and `email` are
   guarded.
3. No second factor for staff accounts; roles are the only privilege boundary.
4. `audit_logs` exists but is not yet written to by the API — wiring it up is
   Phase 1.

---

## 8. Troubleshooting

### 8a. "Could not create your account…" on the deployed app

Before Phase 0's last fix, *every* failed sign-up rendered the same line
("please check your internet connection"), whatever the real cause was — an
unreachable API, a CORS block, a 400 from validation, an HTML page returned by a
static host. The client now reports the actual reason, so start by reading the
message:

| Message you see | Meaning | Fix |
| --- | --- | --- |
| `…The SABI API could not be reached at <url> (Failed to fetch)…` | `fetch` never completed: DNS/TLS failure, API down, or the browser blocked the response because CORS headers were missing | Check the API is up (`/api/health`); add the app origin to `ALLOWED_ORIGINS` |
| `…Origin <origin> is not allowed to call the SABI API…` (HTTP 403) | The server reachable, but your browser origin is not allow-listed | Add that exact origin to `ALLOWED_ORIGINS` and redeploy, or set `SABI_APP_URL` to it (that origin is trusted automatically) |
| `…answered HTTP <code> with an HTML page instead of the SABI API at <url>…` | The app is calling a static host / SPA fallback (or a preview proxy) instead of the Express API | Point `VITE_API_BASE_URL` at the API host, or serve the API and SPA from the same origin; then rebuild the client |
| `…Invalid request body. (…)` | Real validation failure — the message now lists the offending fields | Check the form values (e.g. phone format, state of origin) |
| `…Too many requests. Please slow down and try again shortly.` | `authLimiter` tripped (10 attempts / 15 min per IP) | Wait, or raise `AUTH_RATE_LIMIT_MAX` for testing |
| `…An account with <email> is already registered…` (HTTP 409) | Expected | Use Sign In or Forgot Password |

Fast triage, in order:

```bash
# 1. Is the API alive and configured? (JSON, service_role_configured: true)
curl -sS "$API_BASE_URL/api/health"

# 2. Does the API accept a browser POST from the app's origin?
curl -sS -i -X OPTIONS "$API_BASE_URL/api/auth/register" \
  -H "Origin: $APP_ORIGIN" | head -8       # expect 204 + Access-Control-Allow-Origin

# 3. What does the API itself say about this payload?
curl -sS -i -X POST "$API_BASE_URL/api/auth/register" \
  -H 'Content-Type: application/json' -H "Origin: $APP_ORIGIN" \
  -d '{"fullName":"Test Candidate","email":"test+1@example.com","password":"secret123","phone":"+2348000000000","stateOfOrigin":"Lagos","provider":"email"}'
```

Response codes from `POST /api/auth/register`:

| Code | Meaning |
| --- | --- |
| 200 / 201 | Created (or resumed); body carries `sabi_unique_id` + `profile` |
| 400 | Schema validation failed — `details[]` names the field |
| 403 | Origin blocked by CORS, or `MASTER_ADMIN`-only route |
| 409 | Email already registered |
| 429 | Rate limited |
| 500 | Check the server log: `[SABI] POST /api/auth/register failed: …` (usually a Supabase/service-role problem — `/api/health` will show `service_role_configured: false` if the key is missing) |
| 502 / 503 / 504 with HTML | You are not talking to this Express app at all (proxy/static host) |

Deployment-shape checks that cause the HTML case:

* If the SPA is static (Vercel/Netlify) and the API runs elsewhere, the build
  **must** have `VITE_API_BASE_URL` set to the API host. Without it, `/api/*`
  resolves against the static host, which answers with `index.html`.
* `VITE_API_BASE_URL` must be the host that runs `server.ts`. An AI Studio
  preview URL (`https://ais-pre-….run.app`) is a proxied preview that can answer
  with a `__cookie_check.html` redirect — never use it as a production API base.
* If the API and SPA share one origin (the current Cloud Run deployment), leave
  `VITE_API_BASE_URL` **empty**; same-origin requests are always allowed and no
  CORS configuration is involved.


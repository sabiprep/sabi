# SABI Phase 0 — Security Hardening

Phase 0 removes the "trust the client" model from the SABI backend. Identity is
now proven by a Supabase access token, privileged tables are write-protected, and
profile creation/updates happen only on the server.

## 1. What changed

### Identity (defect B1)

Before: every API route was anonymous and read identity from the request body
(`email`, `authUserId`). Anyone could act as any candidate.

Now:

| Layer | Behaviour |
| --- | --- |
| `server/middleware/requireAuth.ts` | Verifies `Authorization: Bearer <access_token>` with the service-role client and sets `req.user = { id, email, metadata, phone }`. |
| `server/middleware/requireRole.ts` | Guards role-scoped routes (`STUDENT` < `SUPPORT` < `ANALYST` < `CONTENT_MANAGER` < `ADMIN` < `MASTER_ADMIN`). |
| `src/utils/apiClient.ts` | `apiFetch` / `apiPostJson` attach the current session token to every client call. |
| `src/lib/supabase.ts` | Still used for *authentication only* (sign-in, session, OAuth). |

No client code writes `public.profiles` directly any more. Rows are created by
the signup trigger and updated through `/api/auth/verify`, `/api/profile/onboarding`
and `/api/profile/progress`.

### Request validation (defect B7)

`server/validation/schemas.ts` defines a `strictObject` zod schema per route, so
unknown keys are rejected and strings are trimmed/length-capped. `email` and
`sabi_unique_id` are canonicalised (lower-case / upper-case) before use.
`server/middleware/validate.ts` returns `400 { error, details: [{ path, message }] }`.

### Rate limiting

`server/middleware/rateLimit.ts` applies a global limiter to `/api`, a stricter
one to credential routes and a separate budget to the Gemini-backed routes.

### Recovery (defect B5)

The 5-character Unique SABI ID is no longer a recovery credential — it was
enumerable. Password recovery is now a two-step OTP flow:

1. `POST /api/auth/reset-password/request { identifier }` → always
   `200 { status: 'sent' }` (never reveals whether the account exists).
2. `POST /api/auth/reset-password/confirm { email, otp, newPassword }` → verifies
   the Supabase `recovery` token and sets the new password.

`POST /api/auth/reset-password` (the legacy Unique-ID endpoint) returns `410`.

### Registration (defect B4)

`POST /api/auth/register` returns `409` when the email already exists instead of
silently overwriting the account, and it never auto-confirms an account that the
caller does not control.

### Transport & headers

`helmet` (without CSP for now), `x-powered-by` disabled, JSON body cap
(`MAX_JSON_BODY`, default `256kb`), and a CORS **allow-list**:

* always allowed: `localhost` on 3000/4173/5173, `127.0.0.1`, the Capacitor
  WebViews (`capacitor://localhost`, `https://localhost`, `ionic://localhost`),
  and `https://sabi*.vercel.app`;
* anything else must be listed in `ALLOWED_ORIGINS` (comma separated);

## 2. Environment variables

See `.env.example`. Server-only values (never prefix with `VITE_`):

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | for AI routes | Server-side Gemini key. |
| `SUPABASE_SERVICE_ROLE_KEY` | **yes** (prod) | Privileged auth admin + profile writes. The API refuses to boot without it. |
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | **yes** | Supabase project URL. |
| `SABI_APP_URL` | recommended | Password-recovery redirect target. |
| `ALLOWED_ORIGINS` | recommended | Extra CORS origins. |
| `SABI_INSTANT_VERIFY` | optional | `false` disables server-side instant confirmation of new accounts. |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX`, `AI_RATE_LIMIT_MAX`, `MAX_JSON_BODY` | optional | Throttling and body-size tuning. |

`VITE_API_BASE_URL` stays client-side; in the Android APK the Capacitor bridge
rewrites relative `/api/*` requests to it.

## 3. Database setup

1. Run `supabase_schema.sql` (base schema) if it has not been applied yet.
2. Run `supabase/migrations/0001_phase0_security.sql` in the SQL editor. It is
   idempotent and:
   * adds `profiles.role` (default `STUDENT`) plus a `CHECK` constraint;
   * adds `enforce_profile_protected_columns` so a candidate cannot change
     `id`, `role`, `sabi_unique_id` or `email` on their own row;
   * stops the signup trigger from auto-confirming email addresses;
   * drops `verify_sabi_unique_id_for_recovery`;
   * creates the append-only `audit_logs` table (service role writes, admins read);
   * re-creates the candidate UPDATE policy with an explicit `WITH CHECK`.
3. Promote the first administrator. This works from the SQL editor because the
   trigger only bypasses for trusted contexts (`postgres`, `supabase_admin`,
   `supabase_auth_admin`, `service_role`); candidate sessions are always
   rejected.

   ```sql
   UPDATE public.profiles
   SET role = 'MASTER_ADMIN', updated_at = NOW()
   WHERE email = 'you@example.com'
   RETURNING id, email, role;
   ```

4. Authentication → Email Templates → **Reset Password**: include the 6-digit
   token, otherwise step 2 of the recovery flow cannot work:

   ```html
   <p>Your SABI recovery code is <strong>{{ .Token }}</strong></p>
   <p>It expires shortly. Never share this code with anyone.</p>
   ```

> **Full procedure:** see [`docs/runbooks/phase0-rollout.md`](./runbooks/phase0-rollout.md)
> for the ordered rollout (migration → verification queries → env vars → Auth
> config → admin promotion → smoke tests → rollback) and the sign-off checklist.


## 4. API surface

| Route | Auth | Notes |
| --- | --- | --- |
| `POST /api/auth/register` | public + auth limiter | `409` on existing email. |
| `POST /api/auth/login` | public + auth limiter | Resolves phone → email server-side. |
| `POST /api/auth/verify` | bearer token | Upserts the caller's own profile from auth metadata. |
| `POST /api/auth/reset-password/request` | public + auth limiter | Generic response (anti-enumeration). |
| `POST /api/auth/reset-password/confirm` | public + auth limiter | 6-digit OTP. |
| `POST /api/auth/reset-password` | — | `410`, retired. |
| `POST /api/profile/onboarding` | bearer token | Writes onboarding answers to the caller's row. |
| `POST /api/profile/progress` | bearer token | Merges progress into the caller's row. |
| `GET /api/questions` | public | Read-only question catalogue. |
| `POST /api/explain`, `POST /api/chat`, `POST /api/generate-question` | bearer token + AI limiter | Gemini proxies; generated questions are `ai-draft`. |

Unknown `/api/*` paths return `404 { error }` JSON instead of the SPA shell.

## 5. Tests

```bash
npm run lint    # tsc --noEmit
npm test        # vitest run
npm run build   # vite build + esbuild server bundle
```

| Suite | Covers |
| --- | --- |
| `server/utils/sabiId.test.ts` | Unique-ID format, determinism, ambiguous-letter exclusion. |
| `server/validation/schemas.test.ts` | Every route schema, including smuggled-field rejection. |
| `server/apiSecurity.test.ts` | Real Express app: 401 on privileged routes, 400 validation, JSON 404, CORS allow-list, helmet headers, retired recovery route. |

`server/apiSecurity.test.ts` drives the app through supertest with
`NODE_ENV=test`, so it needs no Supabase credentials and makes no live network
calls: requests without a token are rejected before Supabase is ever contacted,
and the one "unverifiable token" case fails closed with `401`.

## 6. Known follow-ups (Phase 1)

* Replace instant verification with a real OTP / email-link flow
  (`SABI_INSTANT_VERIFY=false`).
* Enable a Content-Security-Policy once inline styles are removed.
* Move rate-limit buckets to a shared store (Redis) when running more than one
  instance; the current limiters are per-process.
* Segment the large vendor bundles (`questions`, `index`); the build warns about
  chunks over 500 kB.

* disallowed preflights get `403` and no `Access-Control-Allow-Origin` header.

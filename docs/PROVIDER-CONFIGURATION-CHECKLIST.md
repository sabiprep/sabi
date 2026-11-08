# Sabi backend configuration checklist

This checklist separates code that is already implemented from provider credentials, IDs and product data that must be supplied later. Keep all secrets server-side. Never add secrets to Git, client-side `VITE_*` variables, screenshots or source control.

## 1. Vercel environment variables

### Supabase API
- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### AI providers
- `SABI_AI_ENABLED=false` until provider credentials and models have been tested.
- `SABI_AI_PROVIDER_ORDER=gemini,openai,anthropic` (change order only after testing).
- `GEMINI_API_KEY` and `SABI_GEMINI_MODEL`
- `OPENAI_API_KEY` and `SABI_OPENAI_MODEL`
- `ANTHROPIC_API_KEY` and `SABI_ANTHROPIC_MODEL`
- Optional task-specific model IDs and provider-order overrides.
- `SABI_AI_CREDITS_ENABLED=false` until task credit prices and grant policy are approved and configured.

### Payments
- `SABI_PAYMENT_ENABLED=false` until a provider sandbox test passes.
- `SABI_PAYMENT_PROVIDER=paystack` or `flutterwave`.
- `SABI_PAYMENT_CALLBACK_URL`
- Paystack: `PAYSTACK_SECRET_KEY`
- Flutterwave: `FLUTTERWAVE_SECRET_KEY` and `FLW_SECRET_HASH`

Only NGN checkout is currently supported by the provider adapters. Plans are not seeded. Add approved entitlement catalogue entries and plan prices through the admin APIs before enabling checkout.

### Notifications
- `NOTIFICATION_WORKER_SECRET`
- Brevo email: `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`
- Termii SMS: `TERMII_API_KEY`, `TERMII_SENDER_ID`
- Push delivery is not enabled; Firebase Cloud Messaging adapter/configuration remains future work.

## 2. GitHub Actions secrets

- `SABI_SIGNAL_WORKER_URL` — production API base URL for the learning signal worker.
- `SIGNAL_WORKER_SECRET` — must match the Vercel `SIGNAL_WORKER_SECRET`.
- `SABI_NOTIFICATION_WORKER_URL` — production API base URL for the notification worker.
- `NOTIFICATION_WORKER_SECRET` — must match the Vercel `NOTIFICATION_WORKER_SECRET`.

The scheduled workflows safely skip dispatch while required secrets are absent.

## 3. Admin data to configure after migrations are approved and applied

- Entitlement catalogue keys and value schemas.
- Subscription plans, NGN prices, billing intervals, limits and feature entitlements.
- Per-task AI credit prices for `explanation`, `tutor_chat`, `content_draft` and `study_plan`.
- Gamification XP rules for approved events such as `correct_answer`, `answer_submitted` and `session_completed`.
- Notification templates by channel and locale.
- Approved knowledge documents for RAG retrieval.

No plans, AI task prices, XP rules, or notification templates are seeded by default. This prevents unapproved pricing, credit costs, XP values or messaging from silently becoming live policy.

## 4. JAMB content readiness

Before expanding the published question bank:
1. Verify each question source and its permitted use.
2. Verify the applicable JAMB syllabus version for each subject.
3. Verify topic/objective mappings.
4. Review question wording, options and answer keys.
5. Publish only after the backend quality gate passes.

The latest read-only production audit found 404 published questions, all in Use of English; 3,333 AI drafts and 3 additional review-needed questions; 157 source records marked unknown/unverified; and no verified syllabus version/objective. Existing published records have not been altered.

## 5. Deployment boundary

The working branch contains additive migration files and backend code. The new schema has only been exercised in disposable PostgreSQL CI. No production migration, production data change, provider secret, Vercel environment change, deployment or merge to `main` has been performed. Apply the migrations only through the approved production migration workflow after reviewing the CI evidence.

# Sabi Backend Execution Status

**Baseline:** `main` at `2aaecf8e184e3becd4531a8ac8583770b304c7e2` (8 Nov 2026)  
**Working implementation:** `backend/full-platform-completion-2026-11-08`  
**Draft PR:** #12  
**Rule:** Code presence is not production completion. Each workstream requires integration, tests, security review, and live verification where applicable.

## Confirmed architecture decisions

- Core learning must work without AI.
- Stored, human-reviewed answer keys control objective scoring.
- AI is an optional teaching layer and cannot change answer keys, scores, mastery, readiness, XP, or payment state.
- Learners explicitly tap **Explain this answer**.
- No AI explanations or tutoring during an active timed CBT; post-exam review is allowed.
- Provider credentials and model IDs are external configuration to be added later.
- AI is disabled unless `SABI_AI_ENABLED=true`.
- No paid Supabase development branch is required or created.
- No production schema, data, secrets, or deployment changes are included in PR #12.

## Workstream status

| ID | Workstream | Evidence-based status | Remaining work |
|---:|---|---|---|
| 1 | Project foundation/server | **Partial** — Express server, Vercel adapter, central config, Supabase admin client, auth/role/validation/rate-limit/error middleware and CI exist. | Split the 1,600+ line server entry into bounded route modules; API versioning, structured request tracing and full config/readiness validation. |
| 2 | Database architecture/RLS | **Partial** — 14 production migrations recorded; inspected public tables have RLS; service-only tables deny client access. | Full table/function/grant/index inventory, missing FK indexes, advisor review, leaked-password protection decision, backup/restore verification. No production DDL without approval. |
| 3 | Auth/profiles/onboarding | **Partial** — Supabase Auth registration/login, profile sync, verification, reset flows, onboarding projection and check-ins exist. | Verify email OTP policy, session revocation/logout, role lifecycle, deletion/suspension, protected profile updates and cross-student isolation end-to-end. |
| 4 | JAMB configuration/taxonomy | **Partial** — subject catalogue (25 rows), topic taxonomy (809 rows), subtopics (3,006 rows), subject combination validation and two exam configurations exist. Live syllabus versions and verified syllabus objectives are both zero. | Validate every question-to-taxonomy mapping, syllabus versioning, and configuration consistency across all subjects. |
| 5 | Question bank/provenance | **Partial** — 3,740 rows observed in production: 404 published (all Use of English), 3 needs-review (Use of English), and 3,333 AI drafts (Biology 997, C.R.S 995, Chemistry 1,043, Use of English 298). Provenance tables exist. | Review subject distribution, licensing/provenance completeness, duplicate detection, versioned correction and question-pool sufficiency. |
| 6 | Question quality/moderation | **Partial** — protected review queue and publish/reject/needs-review workflow exist. AI drafts are persisted as unpublished records in the working branch. | End-to-end review history, stronger quality checks, bulk-import reports, duplicate checks and reviewer authorization tests. |
| 7 | Learning events/contracts | **Implemented, live flow unverified** — typed events, versioned contracts, server-derived identity, idempotency, signal observations and outbox exist. | Exercise real authenticated event ingestion and retries with production-like traffic. |
| 8 | Answer evaluation | **Implemented, live flow unverified** — service-only answer RPC checks the stored key and updates the session atomically. | Add complete changed-version, malformed-data, duplicate, expiry and cross-user integration tests. |
| 9 | Mastery | **Implemented, needs validation** — atomic mastery update, spaced review state and history snapshots exist. | Validate evidence eligibility, confidence separation, calibration and edge cases. |
| 10 | Syllabus coverage | **Missing** | Implement a separate coverage model; do not conflate question exposure with mastery. |
| 11 | Question selection | **Partial** — server-side published-question selection and Smart Practice ranking exist. | Centralize ranking, log algorithm/config version, enforce exposure/difficulty/tie rules and test empty pools. |
| 12 | Recommendations | **Implemented, needs validation** — deterministic due-review and weak-topic recommendations exist. | Lifecycle, staleness, feedback and recommendation effectiveness. |
| 13 | Readiness estimation | **Missing** | Define and approve evidence dimensions/formula before implementing a readiness score. |
| 14 | Diagnostic | **Partial** — diagnostic session creation and central answer evaluation exist. | Verify baseline/retake policy and initial-vs-established evidence semantics. |
| 15 | Smart Practice | **Partial** — session creation and adaptive selection exist. | Verify retries, recovery, selection traces and full learner journey. |
| 16 | Blitz | **Partial** — mode exists in the session model. | Verify speed never affects mastery/rewards and stop/recovery behavior. |
| 17 | Custom Practice | **Partial** — custom session mode and filters exist. | Validate all supported settings and unsupported combinations. |
| 18 | CBT | **Partial** — Quick Mock/Full Mock configurations and server-side answer scoring exist. PR #12 adds server-issued deadlines, expiry enforcement and post-exam review. | CI and authenticated end-to-end expiry/auto-finalization tests; production deployment remains pending approval/quota. |
| 19 | AI Coach | **Implemented in working branch, not activated** — gateway-backed chat route uses authenticated context and approved question context. | Connect remaining client surfaces, consent experience, prompt versioning, abuse controls and end-to-end tests. |
| 20 | RAG/retrieval | **Partial** — limited retrieval from published question-bank material exists. | Approved knowledge corpus, provenance, chunking, retrieval quality, citations and evaluation. |
| 21 | AI credits/model routing | **Partial** — provider-independent Gemini/OpenAI/Anthropic gateway, task routing, timeout and fallback exist. | Durable token/cost accounting, credit ledger, quota enforcement, circuit breaker, admin configuration and consent enforcement. |
| 22 | Gamification | **Not verified** | Backend-owned XP ledger, streak rules, idempotency and anti-abuse tests. |
| 23 | Entitlements/subscriptions | **Missing** | Plan catalogue, server-side entitlement checks, subscription lifecycle and audit. |
| 24 | Payments/webhooks | **Missing** | Provider adapter, server verification, signed/idempotent webhooks, refunds/reversals and reconciliation. |
| 25 | Notifications/background jobs | **Partial** — signal outbox, retry/dead-letter handling and scheduled worker workflow exist. | Notification queue/provider, preferences, templates, scheduled reminders and operational alerting. |
| 26 | Admin/question operations | **Partial** — role-protected content review and audit writes exist. | Least-privilege support tools, import/report workflows, admin dashboard and complete audit coverage. |
| 27 | Analytics/reporting | **Partial** — learner progress endpoints and deterministic learning analytics adapter exist in working branch. | Canonical metric definitions, dashboards, retention/funnel reporting and reconciliation. |
| 28 | Parent/school | **Missing** | Relationships, invitations, consent, organization isolation and scoped reports. |
| 29 | Observability/recovery | **Partial** — health endpoint, error handling, audit structures and worker retry/dead-letter exist. | Correlation IDs, alerting, backup verification, restore drill, incident runbook and retention/deletion verification. |
| 30 | QA/pilot/launch | **Partial** — unit tests and disposable PostgreSQL migration CI exist. | Complete end-to-end journeys, security/resilience suite, pilot gates and explicit launch sign-off. |

## Current implementation in PR #12

- Server-only provider-neutral AI gateway: Gemini, OpenAI, Anthropic.
- Explicit AI-disabled/unconfigured states; no mock AI answers.
- Verified-answer explanation endpoint bound to an owned, answered session.
- Active CBT AI lockout; completed CBT post-exam explanations.
- AI Coach chat through the gateway.
- AI question drafts persisted with `ai-draft` / `unreviewed` status; human publication remains mandatory.
- Deterministic study-plan, learning-analytics and tutor-context engine adapters.
- CBT deadline stored server-side in session metadata; answer API rejects submissions after expiry and finalizes expired sessions on the next request.
- Practice and post-exam UI controls for on-demand explanations; display-only CBT countdown.

## Execution gates

1. Get PR #12 TypeScript, test, build and disposable PostgreSQL CI fully green after the latest commit.
2. Finish Phase 1 verification and resolve or explicitly accept security/configuration gaps.
3. Complete question quality and published-pool sufficiency checks before expanding CBT availability.
4. Implement syllabus coverage and readiness without silently choosing unresolved product formulas.
5. Build entitlement/payment, notifications and XP ledgers with migrations and tests before activating those features.
6. Apply any new migrations and configure provider secrets only after separate explicit approval.
7. Deploy only after CI, environment readiness, and user approval; Vercel daily deployment limit was previously reported.

## Important limitation

The working branch is not production. No claim of full-backend completion or live activation should be made until all 30 workstreams pass their acceptance criteria and the launch gate is signed off.

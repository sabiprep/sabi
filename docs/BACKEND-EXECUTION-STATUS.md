# Sabi Backend Execution Status

## Current verified snapshot — 8 November 2026

- **Latest application code merge:** `ccf21bfe2fe5568ceee05438e09c7d1ca7f1df32` (PR #18).
- **Latest merged change:** [PR #18 — idempotent answer submission](https://github.com/sabiprep/sabi/pull/18).
- **Latest Backend CI:** run #411 (`42521946286`) passed type-checking, unit tests, web/API build, disposable PostgreSQL migration chain, and all configured database assertion suites.
- **Other recently merged work:** PR #14 backend service foundations; PR #15 official JAMB syllabus ingestion schema; PR #16 active-CBT answer feedback lockout; PR #17 concurrency-safe question-attempt capture.
- **Production deployment:** not confirmed. Vercel rejected the recent deployment because the project exceeded its free daily deployment quota. A green Backend CI run is not proof that the latest code is live.
- **Production database:** 21 migrations recorded; 0 learner sessions; 0 captured question attempts; 0 verified syllabus versions; 0 verified syllabus objectives; 104 syllabus import rows still pending validation; 0 question-to-objective mappings.
- **Syllabus content:** 13 general objectives have been staged as drafts. The four pilot subject versions and import batches remain drafts / needs-review. Detailed topic objectives and content items have not been imported or approved.
- **Learner journey:** not yet verified against a live authenticated learner. The empty session/attempt tables mean there is no production usage evidence.
- **Build restrictions:** no paid Supabase branch was created; Android builds remain manual-only and were not triggered.

The workstream table and implementation notes below are the earlier PR #12 baseline snapshot. They are retained for history and must not be read as a current audit of main. Re-audit each workstream before marking it complete.

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
- No production schema, data, secrets, or deployment changes are included in PR #12. The two new additive migrations are only exercised against disposable PostgreSQL in CI.

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
| 20 | RAG/retrieval | **Partial** — approved knowledge-document/chunk schema, admin draft ingestion/approval/archive workflow and approved-only full-text retrieval are implemented. | Add embeddings/vector retrieval when provider/dimensions are chosen; expand corpus and evaluate retrieval quality/citations. |
| 21 | AI credits/model routing | **Partial** — Gemini/OpenAI/Anthropic gateway, task routing/fallback, durable token usage events, AI credit ledger, configurable task pricing and atomic reserve/refund RPCs exist. Credits remain disabled by default. | Provider pricing calibration, prompt management, circuit breaker, full quota/abuse tests and consent experience review. |
| 22 | Gamification | **Partial** — XP ledger, configurable admin rules, atomic per-user/idempotent XP award RPC and verified answer/session-completion award hooks exist. No XP rules are seeded. | Implement timezone-aware streak transitions, leaderboard/privacy rules, anti-abuse tests and pilot balancing. |
| 23 | Entitlements/subscriptions | **Partial** — plan and entitlement catalogues, learner billing summary, owner-scoped entitlement reads, reusable entitlement guard and admin plan APIs exist. No plans or entitlements are seeded. | Subscription lifecycle management, trials, cancellation, expiry jobs, plan UX and end-to-end tests. |
| 24 | Payments/webhooks | **Partial** — Paystack/Flutterwave initialization adapters, raw-body signature verification, provider-side transaction verification, idempotent webhook processing and entitlement/credit activation exist. Disabled until credentials, callback URL and plans are configured. | Recurring provider lifecycle, cancellations/refunds/reversals, reconciliation, fraud controls and provider sandbox E2E. |
| 25 | Notifications/background jobs | **Partial** — durable queue with atomic claim/finalize RPCs, retries/dead-letter, in-app inbox, preferences, admin templates, Brevo email/Termii SMS adapters and scheduled worker exist. External channels wait for credentials. | Push provider, reminder schedules, template catalogue, delivery monitoring and operational alerting. |
| 26 | Admin/question operations | **Partial** — role-protected content review and audit writes exist. | Least-privilege support tools, import/report workflows, admin dashboard and complete audit coverage. |
| 27 | Analytics/reporting | **Partial** — learner progress endpoints and deterministic learning analytics adapter exist in working branch. | Canonical metric definitions, dashboards, retention/funnel reporting and reconciliation. |
| 28 | Parent/school | **Partial schema** — parent/student relationships, school organizations and memberships are provisioned with service-role-only writes and scoped read policies. | Invitation/consent workflows, role management, organization isolation tests and parent/school reporting APIs. |
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
- Durable AI usage/credit ledger, admin-configurable task pricing and atomic per-user credit reservation/refund; enforcement remains off until configured.
- Approved knowledge-document ingestion, human approval and full-text RAG retrieval.
- Additive plan/entitlement/payment schema, Paystack/Flutterwave checkout and verified webhook lifecycle; no plans or provider secrets are configured.
- Durable notification queue, in-app inbox/preferences/templates, Brevo/Termii adapters and scheduled dispatch worker; external delivery secrets remain absent.
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

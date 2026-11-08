# Sabi Backend Execution Status

## Current verified snapshot — 8 November 2026 (updated after PR #26)

- **Latest merged application code:** `23d94119765b95285c39f9a4881f295774c415ae` (PR #26).
- **Recent merged changes:** [PR #26 — quiet-hours timezone calculation optimization](https://github.com/sabiprep/sabi/pull/26); [PR #25 — backend execution status refresh](https://github.com/sabiprep/sabi/pull/25); [PR #24 — learner notification quiet-hours enforcement](https://github.com/sabiprep/sabi/pull/24); [PR #23 — Lagos timezone consistency for empty streak state](https://github.com/sabiprep/sabi/pull/23); [PR #22 — backend execution status refresh](https://github.com/sabiprep/sabi/pull/22); [PR #21 — daily study streak engine](https://github.com/sabiprep/sabi/pull/21).
- **Latest Backend CI:** PR #26 run `42526755417` passed type-checking, unit tests, web/API build, disposable PostgreSQL migration chain, and all configured database assertion suites.
- **Gamification:** session completion records an idempotent, timezone-aware study streak using `Africa/Lagos` as the current product default. Learner-configurable timezones remain future work.
- **Notifications:** the queue supports in-app/email/SMS delivery adapters, preferences and templates. Quiet-hours preferences now support an enabled flag, local start/end times and IANA timezone; the worker defers queued jobs until the quiet window ends. Push delivery remains unconfigured.
- **Production deployment:** not confirmed. Vercel rejected recent deployment attempts because the project exceeded its free daily deployment quota. A green Backend CI run is not proof that the latest code is live.
- **Production database snapshot (captured 8 November 2026; not re-queried by this PR):** 21 migrations recorded; 0 learner sessions; 0 captured question attempts; 0 verified syllabus versions; 0 verified syllabus objectives; 104 syllabus import rows pending validation; 0 question-to-objective mappings.
- **Question pool snapshot (captured 8 November 2026; not re-queried by this PR):** 3,740 questions: 404 published (all Use of English), 3,333 AI drafts, and 3 needs-review. Biology (997), C.R.S (995), and Chemistry (1,043) had no published questions. All 157 source records were unverified with permitted use unknown; a full four-subject CBT was therefore not ready for learners.
- **Syllabus content:** JAMB syllabus ingestion remains paused by product direction. No syllabus content was approved or published by PRs #21–#26.
- **Learner journey:** not yet verified against a live authenticated learner. Production usage evidence remains absent in the last recorded database snapshot.
- **Deployment restriction:** no production deployment was triggered as part of PRs #21–#24.
The workstream table and implementation notes below are the earlier PR #12 baseline snapshot and have not yet been re-audited against the full current repository. They are retained for history and must not be read as a current audit of main. Re-audit each workstream before marking it complete.

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
| 10 | Syllabus coverage | **Implemented, production evidence pending** — `/coverage` computes exposure against verified syllabus objectives and keeps coverage separate from mastery. | Populate and approve verified syllabus objectives; validate against learner sessions after deployment. |
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
| 22 | Gamification | **Partial** — XP ledger, configurable admin rules, atomic per-user/idempotent XP award RPC, answer/session-completion award hooks, and timezone-aware daily streak recording are merged. | Seed approved XP rules; add leaderboard/privacy rules, anti-abuse coverage and pilot balancing. Streak uses `Africa/Lagos` until learner timezone settings exist. |
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

1. Keep Backend CI green on `main`; PR #21 passed type-check, tests, web/API builds, migration chain and database assertions.
2. Finish Phase 1 verification and resolve or explicitly accept security/configuration gaps.
3. Complete question quality and published-pool sufficiency checks before expanding CBT availability.
4. Validate verified-objective syllabus coverage after syllabus content is approved; define and approve readiness dimensions/formula before implementing a readiness score.
5. Build entitlement/payment, notifications and XP ledgers with migrations and tests before activating those features.
6. Apply any new migrations and configure provider secrets only after separate explicit approval.
7. Deploy only after CI, environment readiness, and user approval; Vercel daily deployment limit was previously reported.

## Important limitation

The working branch is not production. No claim of full-backend completion or live activation should be made until all 30 workstreams pass their acceptance criteria and the launch gate is signed off.

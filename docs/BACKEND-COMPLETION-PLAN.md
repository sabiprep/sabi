# SABI Full Backend Completion Programme

**Audit date:** 10 November 2026  
**Repository:** `sabiprep/sabi`  
**Production Supabase project:** `dnrzixaasphxiswjyglj`  
**Working branch:** `backend/full-system-completion-2026-11-10`

## Objective

Complete the SABI backend as one integrated product: secure database, verified APIs, learner and learning workflows, AI provider simulation/configuration, platform services, synthetic end-to-end testing, and a safe path to import the user's question bank.

This is an evidence-based execution register. A table, route, migration, or test file existing does not by itself mean the feature is complete. Completion requires behavioural tests and integration evidence.

## Safety rules

- Do not run synthetic load tests or destructive cleanup against production.
- Preserve all existing production schema, migrations, records, users, questions, secrets, and configuration.
- Use a separate Supabase development branch/project for integration and synthetic data. Branch creation has a usage cost and requires the user's explicit cost approval.
- Synthetic records must be isolated by a unique run ID and clearly labelled as synthetic. Cleanup must target only records owned by that run.
- Do not fabricate, auto-approve, or publish synthetic questions as real educational content.
- Never place provider API keys in client code, database plaintext, logs, source control, or API responses.
- Mock provider responses must be visibly marked as simulated and must never be mistaken for real provider output.
- Do not configure real payments, outbound messaging, or paid AI providers during simulation.
- Do not apply production DDL or deploy to production without a separate approval and verified backup/restore plan.

## Live baseline observed

- Supabase project is healthy; 27 migrations are recorded at the time of audit.
- Public schema contains the core question bank, JAMB taxonomy, syllabus ingestion, onboarding, learning, signal, AI, billing, notification, gamification, and admin structures.
- Question bank: 3,740 rows (404 published, 3,333 AI drafts, 3 needs-review).
- Question sources: 157; clearance/provenance needs review before redistribution or broad learner exposure.
- JAMB catalogue: 25 subjects, 809 topics, 3,006 subtopics.
- Syllabus versions: 4; syllabus objectives: 0. No objective coverage claims can be validated until approved objective data is ingested.
- Learning sessions, attempts, mastery, recommendations, analytics, and signal activity are currently empty in the production snapshot.
- AI cost ledger, budget limits/reservations, usage events, prompt versions, and quality events are empty in the production snapshot.
- Ten engines are registered. Diagnostic, mastery, spaced repetition, adaptive practice, recommendations, score prediction, study plan, learning analytics, and AI tutor context are active; question-quality engine remains planned.
- No Supabase development branches currently exist.
- GitHub main at audit time: `a92fd4226010d80a7ae4f271891374cb9c3ba19d`.

## Workstream 1 — Database integrity and environment

| Item | Evidence / status | Acceptance test |
|---|---|---|
| Migration history | 27 migrations recorded; repo migration chain must be reconciled against DB | Exact migration parity in disposable PostgreSQL and staging |
| Schema/relations | Broad schema exists; full constraint/index/FK audit still required | No orphaned relationships; required FK indexes; constraints verified |
| RLS/grants | RLS enabled across audited public tables; per-policy/grant review remains | Anonymous, cross-user, cross-tenant, and service-role tests |
| Functions/triggers | Core answer, mastery, budget, notification and gamification RPCs exist | Function privilege and atomicity tests |
| Backup/recovery | Not yet evidenced | Staging backup/export and restore drill with row-count/hash verification |
| Staging | No Supabase dev branch | Create only after user approves the exact recurring cost |

## Workstream 2 — Academic content and question bank

| Item | Evidence / status | Acceptance test |
|---|---|---|
| Subject/topic taxonomy | 25 subjects, 809 topics, 3,006 subtopics | Taxonomy integrity and exam-configuration consistency |
| Official syllabus | Import pipeline and 104 import rows exist; objective table empty | Source hash, parsing report, reviewer approval and published-version tests |
| Objective mapping | Mapping schema exists; no objectives/mappings yet | Approved mappings only; confidence/provenance and coverage tests |
| Question provenance | 157 source records; clearance unresolved | No redistribution until source and permitted-use decision |
| Question quality | Moderation schema/API exists; quality engine planned | Completeness, option/key validation, duplicate checks, history, authorization |
| Real question import | User has a separate backup of ~3,000 questions | Dry-run validation, rejection report, mapping, provenance, no auto-publication |

## Workstream 3 — Learner, learning and platform workflows

| Item | Evidence / status | Acceptance test |
|---|---|---|
| Auth/onboarding/profile | Existing auth and onboarding v3 structures; live learner journey unverified | Registration, verification, profile, consent, logout/revocation, deletion/suspension |
| Diagnostic | API and engine exist | Baseline and retake semantics; persist attempts and initial mastery evidence |
| Smart Practice / Blitz / Custom | Session/selection services exist; end-to-end unverified | Persist selection trace, answers, response times, mastery, recovery and streaks |
| CBT | Session/timer/answer controls exist | Full/quick mock, server deadline, expiry, auto-finalization, post-exam review, no AI during active exam |
| Recommendations / score prediction | Deterministic functions exist | Data sufficiency, confidence, stale-state handling and feedback loop |
| Progress / analytics | Tables and deterministic analytics exist | Reconcile dashboard metrics to source attempts and mastery |
| Gamification | XP/streak service exists | Idempotency, anti-abuse, privacy and timezone tests |
| Billing / entitlements | Schema and provider adapters exist; catalogues empty | Sandbox-only lifecycle, webhook idempotency, refund/cancel/expiry |
| Notifications | Queue, templates, preferences and worker exist | Retry/dead-letter and mock delivery; no real outbound messages |

## Workstream 4 — AI system and operator controls

| Item | Evidence / status | Acceptance test |
|---|---|---|
| Provider gateway | Gemini/OpenAI/Anthropic and OpenAI-compatible adapter exist | Provider contract tests and deterministic mock adapter |
| Provider configuration | Current gateway reads environment configuration; dynamic provider admin configuration is not yet evidenced | Admin configuration metadata, secret references only, redacted readiness |
| Mock mode | Not yet evidenced as a working provider | Fully offline task-specific structured outputs, zero vendor calls, visible simulated flag |
| AI tasks | Tutor/explanation/content draft/study plan routes exist | Schema validation, answer-key immutability, consent and CBT lockout |
| Prompts | Prompt versions table exists; admin prompt lifecycle needs verification | Versioning, preview, activate/rollback, audit |
| Budget and usage | Atomic reservation and cost-ledger structures exist | Daily/monthly global and provider/task/user caps; no unmetered fallback |
| Quality controls | Basic output validator exists; quality event flow needs verification | Reject/escalate malformed or unsafe outputs; generated questions remain drafts |
| RAG | Approved-document retrieval exists | Approved-only retrieval, provenance, citation and retrieval quality tests |
| Cost simulator | Cost forecasting function/API exists | Scenario validation, unknown prices not treated as free, estimates labelled |
| Secrets | Provider credentials must remain server-side | Secret redaction tests across logs, responses and database |

## Workstream 5 — Synthetic simulation and launch verification

- Seed synthetic personas and learner activity only in staging.
- Generate unique `demo_run_id` values and maintain an explicit manifest of every inserted row.
- Simulate onboarding, diagnostics, Smart Practice, Blitz, custom practice, CBT, answer replay, mastery, spaced repetition, recommendations, score prediction, AI tutor, AI content drafting, usage/cost/budget, subscriptions, webhooks, notifications, admin moderation, and analytics.
- Run concurrent and failure scenarios: duplicate submissions, retries, provider timeout, rate limit, expired CBT, budget exhaustion, webhook replay, notification retry, unauthorized access, and cross-user access.
- Assert all outputs against deterministic invariants; synthetic data must never affect real users or question publication.
- Export and retain test reports. Cleanup by run ID only, then verify all demo rows are gone and all pre-existing rows are unchanged.
- Import the user's real question bank only after schema review, dry-run validation, provenance mapping, and human content review.

## Execution order and release gates

1. Finish repository/database inventory and security review.
2. Fix schema, API, and workflow gaps in additive migrations and tested code changes.
3. Implement the complete offline AI mock/configuration path and verify all task workflows.
4. Build staging-only synthetic data seeding and full end-to-end simulation.
5. Run regression/security/recovery checks and prepare the real question-bank import.
6. Keep production untouched until the user explicitly approves a separate production rollout.

## Known external blockers

- Supabase branch creation requires the user to approve its exact usage cost before a branch can be created.
- Provider credentials, email/SMS credentials, and payment credentials are intentionally not configured. Simulation must use mock adapters.
- A previous GitHub signal-worker workflow failed because the required worker URL/secret were not configured. This must be rechecked after staging configuration; secrets must be set through provider secret stores, never source control.
- Production Vercel deployment availability/quota must be checked before any release.


## Verification addendum — 10 November 2026

A second read-only audit of the live database found 145 public-schema foreign keys, all validated, with 65 lacking a valid, non-partial supporting leading-column index. The branch migration now adds 65 indexes covering that complete audit result; the disposable PostgreSQL assertion checks the leading index key attributes in order. This is a proposed additive migration only and has not been applied to production.

The live security snapshot also confirmed 91/91 public tables have RLS enabled, with zero public-schema SECURITY DEFINER functions executable by either anon or authenticated roles. This is a point-in-time baseline, not a substitute for policy-by-policy and cross-tenant integration tests.

The synthetic QA catalogue contains 25 archetypes in the non-exposed `sabi_simulation` schema. CI now asserts its count, data bounds, and lack of anon/authenticated access. Existing SQL integration tests exercise a learner answer-to-mastery/spaced-repetition path; this is not yet a full browser-driven journey across every learner feature.

The AI mock gateway is fully offline and explicitly opt-in. Its mock configuration does not use a placeholder API credential. The AI provider gateway still obtains real provider credentials and model/pricing configuration from server-side environment variables; dynamic secret management and operator-controlled provider configuration are not yet evidenced as complete.

## Release gates still open

- Run and pass the latest branch CI, including all 65 FK indexes and simulation isolation assertions.
- Create/use an isolated Supabase staging environment and complete end-to-end integration plus backup/restore verification. No branch/project was created because the separate environment has a cost and requires the user's approval.
- Ingest and approve official JAMB syllabus objectives with source provenance. The current syllabus versions remain drafts and the objective table was empty in the audited production snapshot.
- Review question-source redistribution rights and provenance before exposing the existing question bank broadly. Do not import the user's separate question backup until the final schema and dry-run report are reviewed.
- Complete provider configuration lifecycle, prompt activation/rollback and output-quality event integration before enabling real AI in production.
- Obtain explicit approval for production migration/deployment after backup and rollback procedures are verified.

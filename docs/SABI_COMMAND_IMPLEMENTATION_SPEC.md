# SABI COMMAND — Implementation Specification

**Status:** Approved for staged implementation  
**Administrative model:** Hybrid (platform super-admin plus delegated operational roles)  
**AI autonomy:** Approval-controlled (observe, recommend, prepare; production execution requires approval)  
**Scope:** All 17 modules, delivered incrementally  
**Repository baseline:** `main` at `895c1b60876af891292ce96dde8f747e4d5bfe8a` at audit time  
**Related work:** PR #34 (parent/school portals) is separate, open and draft.

## 1. Product objective

SABI COMMAND is the secure operational control plane for the SABI learning platform. It must let authorised operators manage academic content, learners, institutions, AI providers and budgets, payments, communications, configuration, integrations and platform operations from the web admin interface. Routine operational configuration must not require code edits. Privileged actions must remain server-authorised, auditable, reversible where practical, and safe by default.

This is an operations console, not a second learner application and not a browser-side database administration client.

## 2. Confirmed governance decisions

### 2.1 Hybrid administration

- Retain a platform-wide **MASTER_ADMIN** authority for global governance, emergency controls and final approvals.
- Support delegated operational roles for support, analytics, content, finance, institution operations and platform operations.
- Define permissions as explicit capabilities, not UI visibility or role-name checks alone.
- A user may hold multiple scoped assignments; each assignment has a scope (platform, institution, or resource) and lifecycle (pending, active, suspended, revoked).
- Never derive authorization from user-editable `user_metadata`.
- Resolve permissions on the server from trusted database records. Fail closed when identity, role, permission, scope or approval cannot be established.
- The frontend may hide unavailable actions for usability, but every API route must independently enforce authorization.

### 2.2 AI autonomy and approval

The AI Operations Agent has four operating levels:
1. **Observe** — read-only inspection and evidence gathering.
2. **Recommend** — diagnosis and proposed remediation.
3. **Prepare** — generate patches, test plans, SQL migration files, PRs or deployment plans in a non-production workflow.
4. **Execute** — only after a recorded human approval for the exact action and target.

Production writes, production SQL, secret changes, provider activation, budget changes, permission changes, migration application, merge, deploy, rollback, payment/refund actions and security setting changes require explicit approval. Approval is scoped to a specific immutable action payload, expires, is single-use, records the approver and actor, and is revalidated at execution. No standing blanket approval.

### 2.3 Configuration integrity

- Do not invent API keys, provider names, models, endpoints, token prices, budgets, plan prices, notification credentials, feature defaults, or production environment values.
- Unknown values remain unset and visibly marked **Not configured**.
- AI remains disabled until an authorised operator supplies credentials, model selection, pricing and budget limits and explicitly activates it.
- Missing prices are unknown, not free. Missing budget limits fail closed.
- Separate provider monetary cost, SABI internal credits, subscription entitlements and customer payments.

## 3. System architecture

The control centre consists of:

- **Admin web application:** module navigation, dashboards, forms, tables, audit timeline, universal search and AI copilot.
- **Admin API:** authenticated, versioned server routes; validation; permission checks; rate limits; no direct privileged browser access.
- **Authorization service:** role assignments, capability grants, scope evaluation and emergency revocation.
- **Configuration registry:** typed settings with schema, environment/scope, owner, validation, version, approval, effective value and rollback history.
- **Approval service:** immutable action proposal, risk classification, reviewer policy, approval/rejection, expiry, replay protection and execution receipt.
- **Audit ledger:** append-only actor, action, target, before/after references, request ID, approval ID, timestamp and outcome; secrets and sensitive payloads are never logged.
- **Agent orchestration:** read-only tools by default, bounded prepared changes, test execution and approved execution adapters.
- **Integration adapters:** Supabase, Vercel, GitHub, payment, messaging and AI providers; credentials remain server-side.
- **Events and jobs:** reliable outbox/queue for notifications, scheduled reports, maintenance and background work.
- **Observability:** health checks, structured logs, traces, metrics and incident records.

## 4. Module requirements and current capability map

Status labels: **Existing** means a verified code or database foundation exists; **Partial** means some underlying capability exists but the COMMAND workflow is incomplete; **Gap** means no complete capability has yet been verified. These labels do not claim production readiness.

| # | Module | Required COMMAND capability | Audit status |
|---|---|---|---|
| 1 | Command Overview | Platform KPIs, engagement, learning, AI cost, revenue, content, institutions, health, alerts and live operational timeline | Partial — current admin overview reports profile/question/source counts and recent audit rows |
| 2 | AI Control Centre | Provider/model registry, secret references, endpoint and health, pricing, capability matrix, task routing, fallback, budgets, usage, quality and prompt versions | Partial — provider-neutral gateway, readiness, privacy controls, budget reservation/settlement, cost ledger/cache/quality tables and cost simulator exist; admin management UI, persistent registry workflows and configured budgets are not complete |
| 3 | AI Operations Agent | Read-only audit, diagnosis, proposed patches, sandbox tests, PR creation, approvals, execution receipts, rollback and specialist agents | Gap — no verified governed agent workflow |
| 4 | Student Intelligence | Searchable learner records, profiles, mastery, sessions, progress, risk indicators and privacy-safe support actions | Partial — profiles, learning sessions, attempts and mastery data exist; integrated admin intelligence workspace not verified |
| 5 | Learning Engine | Rules, mastery thresholds, revision schedules, recommendations, difficulty, score prediction and experiments | Partial — adaptive engine, mastery and learning signals exist; centralised admin configuration and calibration tools not verified |
| 6 | Question Bank HQ | Authoring, lifecycle, source provenance, validation, review, bulk import, AI drafts, versioning and quality metrics | Partial — question bank, source/evidence/review tables and admin content route exist; full lifecycle control and analytics need audit/extension |
| 7 | Syllabus & Exams | Exam types, syllabus versions, objectives, mappings, subject combinations, scoring and exam configuration | Partial — JAMB syllabus taxonomy, ingestion and exam configuration foundations exist; broader exam and version governance incomplete |
| 8 | People & Access | Hybrid RBAC, scoped memberships, MFA posture, sessions, admin history and emergency access controls | Partial — profiles have roles STUDENT, SUPPORT, ANALYST, CONTENT_MANAGER, ADMIN and MASTER_ADMIN; current middleware checks global role only |
| 9 | Schools & Parents | Institution verification, staff/teacher roles, classes, enrolment, parent consent, analytics and exports | Partial — existing production relationship/org/membership models; PR #34 adds consent-based portals, classes and student-approved enrollment but remains draft |
| 10 | Revenue & Payments | Plans, checkout, transactions, provider readiness, webhook reconciliation, refunds and revenue analytics | Partial — billing routes, subscription plans, payment providers, transactions and webhook foundations exist; operations console and reconciliation workflows incomplete |
| 11 | Credits & Entitlements | Separate credit ledger, entitlements, subscription limits, grants, expiry and cost controls | Partial — AI credit balance, entitlement catalogue, subscriptions and AI cost ledger exist; unified operational management and reporting incomplete |
| 12 | Communication Centre | Templates, audience segments, in-app/email/SMS/push channels, campaigns, scheduling, delivery and consent | Partial — notification queue, worker, templates, in-app routes and preferences exist; campaign builder and full channel operations incomplete |
| 13 | Product Configuration | Typed global/scoped settings, feature flags, experiments, maintenance mode and rollback | Gap — configuration exists in environment variables and feature-specific tables; no unified registry verified |
| 14 | Platform Health | API/DB/worker/integration health, incidents, SLOs, alerting and runbooks | Partial — health endpoint, notification worker and provider readiness checks exist; consolidated monitoring/incident console incomplete |
| 15 | Security & Governance | Access reviews, RLS classification, secrets governance, consent, retention, audit, approvals and risk register | Partial — auth hardening, RLS, audit log and AI privacy controls exist; hybrid access governance and central approval workflow incomplete |
| 16 | Reports & Intelligence | Academic, engagement, financial, content, AI, institution and technical reporting; exports and schedules | Gap/Partial — underlying event and domain tables exist; unified reporting and scheduled export workflows not verified |
| 17 | Integrations & Developer Ops | Integration registry, health, webhooks, deployments, CI, PRs, migrations, rollback and API lifecycle | Partial — Supabase, Vercel and GitHub are used by the project; no unified admin operations interface verified |

## 5. Required functional detail

### 5.1 Command Overview
- KPI cards must show data freshness and availability; unavailable data must not be displayed as zero.
- Include platform pulse, unresolved alerts, recent changes, pending approvals and active incidents.
- Drill-downs must respect the operator's scope and permissions.
- Avoid exposing learner PII in aggregate views.

### 5.2 AI Control Centre
- Provider adapter registry supports native providers and OpenAI-compatible endpoints.
- Store secret references, never raw credentials in browser state, logs, audit payloads or database-readable client records.
- Model records include provider, model identifier, capabilities, context/output limits where known, price source/effective date and configured status.
- Task routing supports task-specific primary/fallback order, health, budget and privacy constraints.
- Cost dashboards distinguish estimated, reserved, settled and failed-attempt costs.
- Provider health tests must be explicit operator actions with rate limits.
- Prompt versions require draft, review, approval, activation and rollback history.
- A provider/model with unknown price or incomplete config cannot silently enter production routing.

### 5.3 AI Operations Agent
- Tools are allowlisted and typed; no arbitrary shell, unrestricted SQL or secret retrieval.
- Every investigation has a scope, request ID, evidence list and redaction policy.
- Prepared code changes are isolated to a branch/PR; production remains unchanged.
- Test results and diff are attached to the approval proposal.
- Execute only the exact approved digest; any changed diff invalidates approval.
- Require independent reviewer approval for high-risk actions and prevent the proposer approving their own production action.
- Maintain kill switch, execution timeout, idempotency and rollback/runbook metadata.

### 5.4 Student and academic operations
- Learner search must minimise personal data and enforce support purpose.
- Student profile includes learning history, topic/objective mastery, assessment performance, entitlements and consent state.
- Risk labels must be explainable and must not make high-impact decisions automatically.
- Question and syllabus workflows need provenance, version history, reviewer identity and publication gates.
- AI-generated content remains draft until human review where policy requires it.

### 5.5 Commercial and communication operations
- Payment state is derived from verified provider/webhook records, not frontend claims.
- Reconciliation must be idempotent and preserve raw event references with secrets redacted.
- Refunds, manual credit grants and subscription overrides require permission, reason and audit.
- Notification campaigns require channel readiness, audience preview, consent checks, suppression and delivery reporting.
- No campaign is sent merely by saving a draft.

## 6. Authorization model

Initial capability namespaces (final granular list to be derived from actual routes and data operations):

- `command.overview.read`
- `learners.read`, `learners.support_action`
- `content.read`, `content.create`, `content.review`, `content.publish`
- `syllabus.read`, `syllabus.manage`, `exam_config.manage`
- `ai.read`, `ai.configure`, `ai.activate`, `ai.budget.manage`, `ai.prompt.approve`
- `ai_agent.observe`, `ai_agent.prepare`, `ai_agent.approve`, `ai_agent.execute`
- `billing.read`, `billing.manage`, `billing.refund`
- `credits.read`, `credits.grant`
- `institutions.read`, `institutions.verify`, `institutions.manage`
- `communications.read`, `communications.manage`, `communications.send`
- `configuration.read`, `configuration.propose`, `configuration.approve`, `configuration.rollback`
- `platform.health.read`, `platform.incident.manage`
- `security.audit.read`, `security.access.manage`
- `reports.read`, `reports.export`
- `integrations.read`, `integrations.manage`, `release.prepare`, `release.approve`, `release.execute`

Role templates are configurable but constrained by a non-delegable permission ceiling. MASTER_ADMIN is platform-scoped and protected. Delegated grants cannot grant MASTER_ADMIN, approve their own elevation, or exceed the grantor's authority. Institution-scoped permissions cannot cross institution boundaries.

## 7. Configuration and approval data contracts

Every managed setting should have:
- stable key and schema/type;
- description, owner and category;
- scope (platform/environment/institution/resource);
- current value or explicit unset state;
- validation and secret-reference metadata;
- version, proposer, approver and effective timestamp;
- change reason, audit reference and rollback pointer.

Every approval proposal should have:
- immutable action type, target, environment and payload digest;
- risk tier and impact summary;
- proposer, evidence, tests and rollback plan;
- required reviewer policy and expiry;
- approval/rejection decisions and timestamps;
- single-use execution result and verification evidence.

Do not store secrets or sensitive learner data in proposal payloads.

## 8. Delivery plan — staged pull requests

### PR 1 — Specification and baseline audit (this PR)
- Commit this implementation specification.
- Record the verified existing capabilities, open dependencies and safety boundaries.
- No production or application behaviour changes.

### PR 2 — Admin control-plane foundation
- Introduce typed permission/capability contracts and server-side authorization service compatible with existing roles.
- Introduce scoped role assignments and permission catalog only after schema design is reconciled with existing profiles and any existing audit tables.
- Add admin API foundation, request correlation, audit helpers and negative authorization tests.
- Do not silently migrate existing users or elevate roles.

### PR 3 — COMMAND shell and Command Overview
- Responsive admin shell, navigation, breadcrumbs, universal search foundation, dashboard widgets and data freshness states.
- Permission-aware module visibility; backend remains authoritative.

### PR 4 — AI Control Centre
- Admin provider/model/task-routing configuration, readiness and cost views using existing AI gateway/control-plane tables.
- No secret display; no activation until all required values and budgets are explicitly supplied and approved.

### PR 5 — Student Intelligence and Learning Engine
- Learner directory/profile, mastery and learning analytics, adaptive rules and controlled experiments.

### PR 6 — Question Bank HQ and Syllabus & Exams
- Content lifecycle, review, provenance, syllabus/version/exam configuration and publishing approvals.

### PR 7 — People & Access and Schools & Parents
- Delegated admin operations, access review and institution lifecycle; reconcile/complete PR #34 before relying on it in production.

### PR 8 — Revenue, Credits & Entitlements
- Commercial operations, ledgers, reconciliation, controlled refunds/grants and audit.

### PR 9 — Communication Centre and Product Configuration
- Campaign operations, templates, preferences, typed settings, feature flags and rollback.

### PR 10 — Platform Health, Security & Governance, Reports and Integrations
- Operations dashboards, security review workflows, exports, integration health and release visibility.

### PR 11 — AI Operations Agent
- Observe/recommend/prepare/approve/execute workflow, sandbox tests, PR preparation and constrained execution adapters.

### PR 12 — Hardening and production-readiness
- Browser E2E, load/security tests, access review, disaster recovery, runbooks, migration rehearsal, observability and staged rollout plan.

PRs are independently reviewable. Dependencies are explicit; no PR is merged or deployed automatically by this specification.

## 9. Acceptance criteria

- All module APIs enforce permissions server-side and scope boundaries.
- Unknown permissions and missing role records fail closed.
- All sensitive admin mutations produce immutable audit events.
- Secret values never reach the browser or logs.
- Configuration changes are validated, versioned and reversible.
- Approval is bound to an immutable action digest and cannot be replayed.
- AI provider routing fails closed when disabled, unpriced, unconfigured or over budget.
- Production execution requires fresh explicit approval.
- Payment and credit ledgers are idempotent and reconcile to provider evidence.
- Learner and institution data access is consent- and scope-aware.
- RLS policies reflect intended access; service-role-only tables are documented and remain inaccessible to client roles.
- CI includes unit, integration, migration, RLS, authorization-negative, and end-to-end tests.
- A production release requires separate explicit approval after preview verification.

## 10. Audit findings and known dependencies

1. Existing global roles are `STUDENT`, `SUPPORT`, `ANALYST`, `CONTENT_MANAGER`, `ADMIN`, `MASTER_ADMIN`. The current middleware resolves one profile role and supports allowlists; it is not scoped RBAC.
2. Existing `/api/admin/overview` is narrow and returns counts plus a limited audit tail.
3. AI gateway currently reads provider configuration from environment variables. COMMAND should introduce managed configuration carefully without breaking the fail-closed runtime contract.
4. AI control-plane tables exist, but production has zero active budget-limit rows and AI is disabled. Do not create arbitrary limits.
5. Billing and notification routers include operational/admin endpoints; map every route to a capability before exposing it in COMMAND.
6. PR #34 is a dependency for institution portals but is open/draft; it must pass CI and security review before merge or production migration.
7. Supabase advisor reports 49 RLS-enabled tables without policies (INFO finding). Classify each table by exposure and intended service-role/client access; do not add blanket policies.
8. Supabase advisor reports 46 unindexed foreign keys (performance INFO). Validate query patterns and index impact before adding indexes.
9. Supabase Edge Functions list is empty; the current application uses server routes and background worker foundations. Do not introduce Edge Functions without a demonstrated need.
10. Latest inspected Vercel deployment for PR #34 was READY preview on branch `feat/parent-school-portals`; this is not production deployment evidence.

## 11. Operational safety gates

- All schema changes are migration files reviewed in PR and tested on disposable databases.
- Never apply migrations to production from a feature branch.
- Never merge or deploy without explicit user approval.
- Never change production auth/security settings without explicit approval.
- Never activate AI or populate provider prices/budgets from guesses.
- Never run bulk learner, credit, payment, institution or content mutations without preview, idempotency and approval.
- Keep production rollback instructions and verification evidence with every release.

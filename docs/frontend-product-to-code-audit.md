# SABI Frontend Product-to-Code Audit

**Status:** Initial evidence-based audit — in progress  
**Audit base:** `main` at `45a5e50564904226d49f8256f1957e6a0f84e86b`  
**Audit branch:** `audit/frontend-product-gap`  
**Product source:** `SABI_FULL_MASTER_IMPLEMENTATION_BOOK_v3_FIXED.docx` (211 pages; 11 assembled source documents)  
**Brand source:** Official Sabi identity boards supplied in this conversation  
**Scope:** Product intent, current frontend routes/screens, backend capability evidence, discrepancies, and rebuild order. No application behaviour or production resources changed in this audit commit.

> This document distinguishes verified code presence from live production readiness. The master book's locked product decisions take precedence over existing UI behaviour. OPEN decisions remain open.

## 1. Executive findings

1. The repository is a functioning React 19 + TypeScript + Vite frontend with an Express API, Supabase integration, Capacitor Android support, and an existing set of student/admin screens. A ground-up rewrite is not justified.
2. The current UI has material product drift. The clearest example is Blitz: the implementation presents a level/path progression with fixed question counts, speed-themed levels, unlocks and rewards; the locked product definition requires an immediate, setup-free, one-question-at-a-time rapid-fire feed with no timer, speed indicator, speed bonus, fixed length, or manipulative endless-scroll.
3. Smart Practice also currently presents a predefined road/level progression and subject toggles. The locked product definition is recommendation-led, minimal setup, backend-selected next question, and preserved session state.
4. Onboarding is currently a 10/11-step implementation with a different question model from the locked 15-question onboarding specification. The current local-storage key is versioned for a 10-question flow. This is a direct product mismatch, not merely a visual refresh.
5. The application routes expose multiple product experiences, but several page implementations are consolidated into very large files (notably StudentPages.tsx and PublicPages.tsx). Rebuild should progressively extract feature modules and shared components rather than rewrite routing wholesale.
6. Backend code includes substantial learning, question selection, mastery, recommendations, AI, billing, notifications, gamification, admin and database migration foundations. Their presence does not establish that every frontend screen is connected or that the latest code is deployed.
7. The checked-in backend status document is explicitly a historical snapshot (8 Nov 2026) and says its workstream table is not a current audit of main. Its figures must not be repeated as current production facts without fresh verification.
8. Current main contains later migrations after that status snapshot, including SABI COMMAND RBAC, daily streak, study-plan/learning analytics and AI tutor context engine activation migrations. These migrations and their assertions need to be included in the current CI/migration audit.
9. The latest open PRs #34 and #35 are draft work and must be preserved. PR #34 adds parent/school portals and consent/invitation workflows; PR #35 documents the SABI COMMAND admin control plane. Neither should be merged or overwritten as part of the frontend audit.
10. The next phase should be a product-led screen rebuild in a dedicated branch, followed by systematic API wiring. Existing safe API contracts should be reused; frontend must not invent backend operations or authoritative learning calculations.

## 2. Locked product model

SABI is a JAMB-only preparation platform described as **a data engine wrapped in a CBT platform**. The four learning experiences are distinct:

- **Smart Practice:** SABI determines what the learner needs next.
- **Blitz:** Rapid personalised reinforcement, separate from Custom Practice.
- **CBT Simulator:** Strict JAMB measurement.
- **Custom Practice:** The learner deliberately chooses what to practise.

All modes contribute evidence to one central learning state through raw learning events, a central mastery engine, recommendation engine and AI Coach / next-best-action layer.

### 2.1 Locked Blitz contract

- No setup before starting.
- No topic configuration.
- No fixed session length.
- One question at a time.
- Flow: Question → Answer → Feedback → Learn → XP → Next.
- Student can stop at any time.
- No timer or speed indicator; speed must not affect XP, streaks, difficulty, question selection, mastery or recommendations.
- Immediate micro-explanation and useful feedback.
- XP and streaks are subordinate to correctness, learning, consistency and improvement.
- No manipulative endless-scroll mechanics; student retains control.
- Question reporting and human-readable offline/error states.
- Question selection considers subject combination, mastery, recent mistakes, difficulty, exposure, topic, provenance, quality and recent activity.

**Current code discrepancy:** `src/pages/BlitzPage.tsx` defines two sets of 11 predefined levels, fixed 10/15 question counts, level unlocks, stars, chest/reward mechanics, a speed-themed level, a per-question timer setting, and navigates to `/learning?mode=blitz&...` to start the question flow. This is not the locked Blitz experience. The current implementation should be replaced, not cosmetically restyled.

### 2.2 Locked Smart Practice contract

- Recommendation → Smart Practice → Question selector → Question → Answer → Feedback → Explanation → New evidence → Next question → Session result → Next action.
- Minimal setup; SABI chooses the target and next question.
- Next-question state refreshes from backend evidence.
- No arbitrary fixed session length.
- Student can exit and backend session state must be preserved.

**Current code discrepancy:** `src/pages/SmartPracticePage.tsx` defines predefined branching road levels, fixed subjects/topics/question counts and merged/unmerged subject controls. This presentation contradicts the recommendation-led, minimal-setup model and should be redesigned around the backend recommendation/session contract.

### 2.3 Other locked decisions

- Onboarding has 15 approved questions. It collects self-report/preferences and must not be presented as observed mastery.
- Subject combination is English Language (compulsory/locked) plus exactly three other subjects.
- Diagnostic is an adaptive baseline across the selected four subjects; it is not the 180-question Full Mock.
- Custom Practice is explicit learner configuration; it is not Smart Practice or Blitz.
- CBT Full Mock is 180 questions / 120 minutes; Quick Mock is 40 questions / 30 minutes. Active CBT has a server-authoritative timer, no hints/AI/explanations, review flags, navigation, two-step submission and auto-submit at expiry.
- Mastery estimates, confidence, syllabus coverage, readiness and CBT score are distinct concepts. The frontend must not calculate authoritative values.
- Answer keys and correctness are backend-authoritative. AI/RAG explains; it does not decide correctness, mastery, readiness, XP or payment.
- The exact mastery formula, recommendation ranking, final XP economy, entitlement matrix and several permission rules are OPEN and must not be invented in UI code.

## 3. Frontend inventory and initial screen assessment

| Product area | Current code evidence | Initial assessment / required direction |
|---|---|---|
| Splash / Welcome | `src/pages/PublicPages.tsx`; routes `/`, `/welcome` | Exists; inspect exact copy, visual hierarchy, logo usage, responsive states and routing against approved welcome contract. |
| Authentication | `PublicPages.tsx`; routes for choice, sign-up, sign-in, verify, forgot password | Exists; verify phone+OTP, email+password, Google sign-in, recovery, session expiry and actual Supabase flow. |
| Onboarding | `src/pages/OnboardingPage.tsx`; `src/data/onboardingQuestions` | Major mismatch: current code comments indicate 10 mature questions while locked product requires 15. Rebuild question sequence and persist via approved API. |
| Diagnostic | `src/pages/DiagnosticPage.tsx`; `/diagnostic` | Screen exists; verify adaptive baseline, subject combination, session API, progress, resume and results. |
| Student home | `HomePage` in `StudentPages.tsx`; `/home` | Exists; inspect every metric and CTA for real data and “What should I do now?” purpose. |
| Practice hub | `PracticePage` in `StudentPages.tsx`; `/practice` | Exists; make four modes distinct and clearly explain their purposes. |
| Blitz | `src/pages/BlitzPage.tsx`; `/blitz`, `/practice/blitz` | Major mismatch; replace progression map with locked rapid-fire flow. |
| Smart Practice | `src/pages/SmartPracticePage.tsx`; `/smart`, `/practice/smart` | Major mismatch; remove predefined level-road model and foreground recommendation-led session. |
| Custom Practice | `src/pages/CustomJambSimulatorPage.tsx`; `/practice/custom` | Exists; audit configuration fields, allowed combinations and backend validation. |
| Question experience | `BackendLearningPage.tsx`; `/learning` | Exists; audit mode-specific question/feedback/explanation behaviour and ensure no client-authoritative answer. |
| Explanation | Learning/AI routes and learning UI | Verify explicit learner action, verified answer key, short/detailed and language preferences, AI consent and fallback. |
| Session results | Learning UI in large page module | Verify score, accuracy, duration, correct/incorrect, subject/topic, mistakes and next action from backend. |
| Progress / Mastery | `ProgressPage` in `StudentPages.tsx` | Exists; distinguish mastery/confidence/coverage/CBT results and show insufficient-evidence states. |
| Weak areas / Recommendations | Home/progress/learning components and recommendation APIs | Dedicated product experience needs confirmation; backend supplies reason/priority/action, UI must not invent. |
| CBT simulator | `CbtPage` in `StudentPages.tsx` | Exists; verify strict 180/120 and 40/30 modes, server deadline, navigator, review, two-step submit, expiry and recovery. |
| CBT results | Student pages / learning endpoints | Verify separate comprehensive results and post-exam review. |
| Profile / Settings | `ProfilePage` in `StudentPages.tsx` | Exists; reconcile with all relevant onboarding preferences, account/security, privacy and access settings. |
| Notifications | `NotificationsPage` in `StudentPages.tsx` | Exists; verify inbox/read state and preferences against notification API. |
| Missions / Gamification | `DailyMissionsPage` in `StudentPages.tsx` and gamification API | Exists; do not display client-generated XP or treat XP as mastery. |
| Subscription | `SubscriptionPage` in `StudentPages.tsx` | Exists; entitlement and payment states must come from verified backend records. |
| Subject selection / rates | `SubjectRatesPage` in `StudentPages.tsx` | Exists; confirm purpose and avoid conflict with compulsory English + three other subject rules. |
| AI Tutor | AI backend routes exist; standalone frontend route not established in current route scan | Design dedicated experience only after inspecting API chat/history/context/consent contracts. |
| Admin overview | `AdminDashboardPage.tsx`; `/admin` | Exists; current backend overview is narrow aggregate metrics + audit tail. Never imply unimplemented command-centre capabilities. |
| Admin content review | `AdminContentReviewPage.tsx`; `/admin/content` | Exists; verify source clearance, provenance, taxonomy, review/publish states and API permissions. |
| Admin access | `AdminAccessPage.tsx`; `/admin/access` | Exists; reconcile with newer COMMAND RBAC migration and backend permission middleware. |
| Parent / School / Tutorial Centre | PR #34 draft | Not treated as merged main capability. Preserve draft PR and inspect before any reuse. |
| SABI COMMAND | PR #35 draft plus newer main RBAC migration | Treat spec and implementation separately; admin frontend scope requires actual route/API/permission verification. |

## 4. Frontend architecture findings

### 4.1 Current structure

- `src/App.tsx` centralizes React Router routes and uses lazy imports.
- `src/pages/StudentPages.tsx` is approximately 122 KB and exports multiple distinct pages/shells.
- `src/pages/PublicPages.tsx` is approximately 77 KB and groups public/authentication pages.
- `src/pages/OnboardingPage.tsx` is approximately 33 KB.
- `src/pages/BlitzPage.tsx` is approximately 26 KB.
- `src/pages/SmartPracticePage.tsx` is approximately 24 KB.
- `src/pages/BackendLearningPage.tsx` is approximately 24 KB.
- Reusable UI exists in `src/components`, `src/components/common` and `src/components/mobile`.
- Shared utilities and Supabase client exist under `src/utils` and `src/lib`.
- No `src/features` or `src/services` directory was found in the initial root inventory.

### 4.2 Design system findings

- Existing app theme provider and CSS exist.
- Previously inspected theme/style values include blue `#2563EB`, gold `#F59E0B`, and Plus Jakarta Sans / Inter. These do not match the supplied official identity.
- Official identity to implement: Primary Blue `#0066FF`, Navy `#0A1F66`, Yellow `#FFC700`, White `#FFFFFF`; Poppins typography; flowing S/book symbol; supplied logo variants.
- Do not use a generic template or blanket gradient/card redesign. Establish semantic tokens, typography scale, spacing, surface, border, focus, status, motion and responsive breakpoints. Use yellow as a deliberate accent, not a large background fill.

### 4.3 Recommended target structure

Refactor incrementally, preserving current imports and route behaviour while moving toward:

- `src/app/`: router, providers, application shells, route guards.
- `src/design-system/`: tokens, primitives, typography, icons and brand assets.
- `src/features/auth/`
- `src/features/onboarding/`
- `src/features/home/`
- `src/features/diagnostic/`
- `src/features/practice/{smart,blitz,custom,shared}/`
- `src/features/cbt/`
- `src/features/progress/`
- `src/features/recommendations/`
- `src/features/ai-tutor/`
- `src/features/gamification/`
- `src/features/notifications/`
- `src/features/billing/`
- `src/features/profile/`
- `src/features/admin/`
- `src/features/portals/` only when PR #34 dependency is resolved.
- `src/services/api/`: typed API clients and contracts.
- `src/shared/`: common components, hooks, utilities and types.

This is a target, not a mandate to move every file in one risky commit. Extract by screen and test continuously.

## 5. Backend capability evidence and integration boundaries

### 5.1 Verified code-level foundations on main

- Express API entry: `server.ts`; learning router: `server/learning/routes.ts`.
- Learning engine execution: `server/learning/engineExecution.ts`; selectors and answer replay/timer helpers under `server/learning`.
- AI gateway, task routes, consent, retrieval, usage and control-plane modules under `server/ai`.
- Billing/entitlement routes and provider adapters under `server/billing`.
- Gamification service/routes under `server/gamification`.
- Notification modules under `server/notifications`.
- Admin routes under `server/admin`.
- Supabase migration history includes core learning, adaptive learning, intelligence/signal layer, question bank, backend service foundations, notifications, syllabus ingestion, AI controls, SABI COMMAND RBAC, daily streak, study-plan/analytics and AI tutor context migrations.
- Database assertion tests exist for several of these migration groups.
- `package.json` provides `lint` (TypeScript check), `test` (Vitest), and `build` (Vite + Express bundle); Android Capacitor sync/build scripts are also present.

### 5.2 Important backend rules

- Frontend cannot set correctness, answer key, mastery, readiness, XP balance or payment confirmation.
- Use stable IDs and typed server contracts.
- Backend authorizes every sensitive operation; route visibility is not security.
- AI is optional and must fail closed when disabled/unconfigured; consent and entitlement rules apply.
- Active CBT blocks AI help and explanations.
- Preserve session and answer state; do not silently discard learning evidence.
- Payment confirmation must be verified server-side; do not unlock features based on a UI success state.
- Use real loading, empty, insufficient-evidence, recoverable error, permission-denied and session-expired states.

### 5.3 Data readiness caveat

The current `docs/BACKEND-EXECUTION-STATUS.md` labels its production snapshot as 8 Nov 2026 and explicitly states that the workstream table is an older baseline and has not been re-audited against current main. It reports historical question/syllabus/session counts, but those values are not a fresh production query. Do not use them as current dashboard values or as a definitive statement of present question-pool readiness. Refresh through authorized read-only production inspection before making content availability claims.

### 5.4 Backend mapping still required

For every UI action, record: HTTP method/path, request/response schema, auth requirement, role/ownership check, entitlement check, database/RPC dependency, idempotency/retry semantics, state machine, and error codes. The next audit pass must enumerate all routes from `server.ts` and each router, then map frontend call sites in `src/utils/apiClient.ts` and other services.

## 6. Open pull requests and branch safety

- PR #34 `feat/parent-school-portals` is open/draft and contains parent consent, institution invitation, class and portal work. Its description states it is not production-ready until CI and live integration/security checks pass.
- PR #35 `feat/sabi-command-foundation` is open/draft and contains the SABI COMMAND specification. Its description records admin RBAC/control-plane work and staged delivery.
- Both branches must remain untouched by this audit/rebuild unless their owners' changes are deliberately incorporated after review.
- Audit/rebuild work is isolated to `audit/frontend-product-gap` and subsequent dedicated frontend implementation branches. No merge to main or production deploy without explicit approval.

## 7. Product rebuild sequence

### Batch 0 — finish audit and contracts
1. Complete all route and component inventories.
2. Inspect actual frontend API call sites and backend router contracts.
3. Inspect existing PR #34/#35 dependencies without merging them.
4. Record per-screen content, interaction, data, error and permission requirements.
5. Record unresolved/open product decisions separately.

### Batch 1 — design system and shell
1. Apply official Sabi tokens and Poppins.
2. Normalize app shell, navigation, responsive layouts and route protection.
3. Build reusable buttons, inputs, cards, dialogs, tabs, progress, question options, feedback, empty/error/loading states.
4. Preserve existing theme preference where it remains useful; avoid unnecessary duplicate theme systems.

### Batch 2 — core learner journey
1. Welcome/authentication.
2. Approved 15-question onboarding.
3. Diagnostic baseline.
4. JAMB Prep Home.
5. Subject selection and learning library.

### Batch 3 — practice experiences
1. Shared question interaction primitives.
2. Smart Practice — recommendation-led.
3. Blitz — immediate rapid-fire flow.
4. Custom Practice — deliberate configuration.
5. Explanation and session results.

### Batch 4 — CBT and learning intelligence
1. CBT simulator and strict state machine.
2. CBT results/review.
3. Progress/mastery and evidence confidence.
4. Weak areas/recommendations.

### Batch 5 — retention and commercial
1. AI Tutor (with consent, availability and CBT restrictions).
2. Missions/gamification.
3. Notifications.
4. Subscription/billing.
5. Profile/settings.

### Batch 6 — admin and multi-role
1. Admin overview/content/access only to the extent backend permissions and operations are verified.
2. Parent/school portals after PR #34 is reviewed and its contracts are reconciled.
3. SABI COMMAND as a separately governed admin workstream; do not present specification-only modules as operational.

### Batch 7 — QA and integration
1. Wire each vertical slice to existing backend contracts.
2. Test screen states, permission boundaries, session recovery and mobile layout.
3. Run typecheck, unit, integration, build and browser-level E2E tests.
4. Record missing backend dependencies explicitly.

## 8. Immediate implementation decisions

- Replace the current Blitz level/path interface with the locked rapid-fire feed.
- Replace the current Smart Practice level-road interface with the recommendation-led flow.
- Rebuild onboarding to the approved 15 questions; current 10/11-step flow is not compliant.
- Preserve current working authentication and API client while auditing and improving.
- Do not invent an AI Tutor endpoint or UI behaviour before route contracts are verified.
- Do not fabricate JAMB question availability, syllabus coverage, mastery, readiness, score prediction, XP or payment state.
- Build the visual system against the supplied brand boards, not current off-brand tokens.

## 9. Definition of audit completion

This initial audit is not complete until:
- Every current route is enumerated with owning component and access guard.
- Every student/admin screen is compared against the relevant master-book requirement.
- Every visible CTA is mapped to a working handler and API contract or explicitly marked as unavailable.
- Every backend router endpoint is mapped to the screens that consume it.
- Current migration chain and CI evidence are reviewed, including migrations added after the stale backend status snapshot.
- Open PR dependencies and conflicts are documented.
- The screen-by-screen rebuild specification and ordered implementation backlog are complete.

## 10. Safety and release gates

- No production schema, data, secret, auth/security setting or deployment changes in this workstream.
- No merge of PR #34 or #35.
- No forced pushes, destructive rewrites or overwriting other contributors' branches.
- Feature branches and small reviewable commits only.
- Test changes in disposable/local environments.
- Production release requires separate explicit approval.

---
**Audit note:** This file records the verified initial pass and the remaining audit tasks. It must be updated as route/API inspection, test evidence and per-screen review are completed.
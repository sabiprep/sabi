SABI
FULL MASTER IMPLEMENTATION BOOK
v3 — FIXED CONTINUOUS MASTER
Complete source assembly • 11 source documents • preserved source content
Document Map
PART I — PRODUCT SOURCE OF TRUTH — SABI_Master_Product_Specification_v1.docx
PART II — FRONTEND ARCHITECTURE — SABI_Frontend_Implementation_Specification_v1.docx
PART III — CORE FRONTEND IMPLEMENTATION — SABI_Google_AI_Studio_Frontend_Implementation_Prompt_Book_v2_DETAILED.docx
PART IV — TECHNICAL / BACKEND ARCHITECTURE — SABI_Technical_Implementation_Specification_v1.docx
PART V — CORE BACKEND IMPLEMENTATION — SABI_Google_AI_Studio_Backend_Implementation_Prompt_Book_v2_DETAILED_VERIFIED.docx
PART VI — AI + RAG IMPLEMENTATION — SABI_AI_RAG_Implementation_Specification_v1.docx
PART VII — CORE MASTER IMPLEMENTATION ORCHESTRATION — SABI_Google_AI_Studio_Master_Implementation_Prompt_Book_v1.docx
PART VIII — QA, TESTING & DEPLOYMENT — SABI_QA_Testing_Deployment_Specification_v1.docx
PART IX — ADMIN CONTROL PLANE ARCHITECTURE — SABI_Admin_Control_Plane_Specification_v1.docx
PART X — ADMIN BACKEND IMPLEMENTATION — SABI_Google_AI_Studio_Admin_Backend_Implementation_Prompt_Book_v1_DETAILED.docx
PART XI — ADMIN FRONTEND IMPLEMENTATION — SABI_Google_AI_Studio_Admin_Frontend_Implementation_Prompt_Book_v1_DETAILED.docx

PART I — PRODUCT SOURCE OF TRUTH
Source document: SABI_Master_Product_Specification_v1.docx
SABI — MASTER PRODUCT SPECIFICATION
Locked Product Decisions & Source of Truth
Version 1.0 • September 2026
Purpose: This document is the source of truth for SABI decisions made so far. Locked decisions must not be silently changed. Items marked OPEN are intentionally undecided and must not be treated as requirements.
1. Product Thesis
Locked: SABI = a data engine wrapped in a CBT platform.
Current scope: JAMB-only preparation platform.
The app is the surface; the long-term asset is the Nigeria-specific learning/behaviour dataset.
Decision rule: “Does it improve the student today AND grow the dataset tomorrow? If both → ships. If neither → dropped.”
2. Core Architecture
SABI
 ├── Smart Practice — SABI decides what the student needs
 ├── Blitz — rapid personalized reinforcement
 ├── CBT Simulator — strict JAMB measurement
 └── Custom Practice — student deliberately chooses practice

All modes
   ↓
Raw Event Log
   ↓
Central Mastery Engine
   ↓
Recommendation Engine
   ↓
AI Coach / Next Best Action
One student, one central learning state.
Learning modes contribute evidence to the same state.
Blitz is separate from Custom Practice.
3. Authentication
Phone number + OTP
Email + password
Google sign-in
Supabase Auth intended.
Account identity → Onboarding → Student learning profile → Learning data.
4. Onboarding — 15 Locked Questions
1. Full Name
What is your full name?
2. Subject Combination
Select your 4 JAMB subjects. English Language compulsory and locked; exactly 3 others.
3. Current Class & Prior Attempts
SS2 / SS3 / Out-of-school candidate/resitter; years out of school if applicable; prior JAMB attempts 0/1/2+.
4. Target Course & University
Dream course and goal university.
5. Exam Timeline
1 month or less; 2–3 months; 4–6 months; >6 months; dynamic countdown to upcoming March JAMB exam.
6. Subject Confidence Levels
1–5 rating for each of the 4 subjects.
7. Weakest / Priority Subject
Select from chosen 4.
8. Root Cause of Difficulty
Careless mistakes; run out of time; core methods/formulas; inconsistent study.
9. Specific Trouble Topic
Text input.
10. Study Style
Structured schedule; Flexible slots; I don’t study at all.
11. Daily Study Dedication
1 hour or less; 2–3 hours; 4+ hours.
12. Study Environment
Quiet private space; Busy/noisy environment.
13. Explanation Preference
Brief & concise; Detailed step-by-step.
14. Language Style Preference
Plain Formal English; West African Pidgin English; Mixed Nigerian English.
15. Core Motivation
Long textarea.
Onboarding = profile/self-report/preferences. Diagnostic = observed performance. Self-reported weakness must not be treated as actual mastery.
5. 15-Screen Architecture
Welcome
Sign Up / Login
Onboarding
JAMB Diagnostic
JAMB Prep Home
Subject Selection
Custom Practice Setup
Question Experience
Explanation
Session Results
Progress / Mastery
Weak Areas & Recommendations
CBT Exam Simulator
CBT Results
Profile / Settings
6. Screen Decisions
Welcome
SABI
“Know what you know. Improve what you don't.”
Get Started / I already have an account.
JAMB Diagnostic
Adaptive baseline across selected four subjects.
Not the 180-question Full Mock.
Records correctness and question metadata.
Produces initial mastery estimates, strengths, priority areas and first recommendation.
Do not overclaim diagnostic completeness.
JAMB Prep Home
Dynamic JAMB countdown.
Today’s Recommended Action.
Progress, subject snapshot, focus area, recent activity and streak.
Prominently expose Smart Practice, Blitz, CBT Simulator and Custom Practice.
Custom Practice
English locked; other three from official combination.
Choose one or multiple subjects.
Choose topic/subtopic, origin, question count and session settings.
No Study/Exam/Blitz modes.
Core feeling: “I know exactly what I want to practise.”
Question Experience
Smart = adaptive.
Custom = exact configuration.
Blitz = rapid-fire.
CBT = strict separate state.
Question metadata: ID, subject, topic, subtopic, difficulty, origin year, correct answer, explanation, question type, syllabus reference, usage history.
Explanation
Result, correct answer, why, quick/step-by-step explanation, key idea, common mistake, optional similar question.
RAG explains; it does not track mastery.
AI must not fabricate explanations or mastery.
Session Results
Score, accuracy, duration, correct/incorrect, subject/topic performance, mistakes, Coach summary, next action.
Smart and Custom use this flow; CBT has separate comprehensive results.
Progress / Mastery
Overall/subject/topic mastery estimates, trends, strengths, focus areas, activity and Coach insight.
Mastery estimate is not exam score.
Weaknesses should lead to actions.
Weak Areas & Recommendations
Today’s priority, evidence-based reason, estimated time, focus areas, personalized plan.
Missed days recalculate instead of piling tasks.
Algorithm determines recommendation; AI explains it.
CBT Simulator
Full Mock: 180 questions / 120 minutes.
Quick Mock: 40 questions / 30 minutes.
English locked + three selected subjects.
Strict timer, navigator, review flag, eligible calculator.
No hints, AI Coach or explanations during exam.
Two-step submission; timer expiry auto-submits.
CBT Results
Score/percentage, subject performance, topic performance, attempted/unanswered.
Review mistakes/flagged/unanswered.
Feeds mastery and recommendations.
CBT score remains historical performance, not mastery.
Profile / Settings
JAMB profile, target course/university, learning preferences, motivation.
Account/security, notifications, subscription/access, data/privacy, support and about.
7. Blitz — Locked Definition
Blitz is SABI’s rapid-fire JAMB question feed. It is a separate product experience, not a Custom Practice mode.
No setup before starting.
No topic configuration.
No fixed session length.
One question at a time.
Question → Answer → Feedback → Learn → XP → Next.
Student can stop at any time.
Low friction and engaging, but educational quality comes first.
8. Blitz — Final Flow
Home Entry Card
Minimal Start transition
Question
Answer Feedback
Micro Explanation
Streak Moment
Next Question
Exit: Keep Going / Finish
Results with accuracy, XP, streak, topics and next action
9. Blitz — Rewards
Correct answers earn base XP; incorrect answers may earn small participation XP.
Streak = consecutive correct answers in a run.
Daily streak belongs to the broader SABI learning system.
Personal bests and milestones can reward useful learning behaviour and improvement.
XP is not intelligence, JAMB readiness, mastery or exam score.
Reward hierarchy: Correctness → Learning → Consistency → Improvement.
IMPORTANT LOCK: SPEED IS REMOVED FROM BLITZ. No speed bonus. Speed does not affect XP, streaks, difficulty, question selection, mastery, or recommendations in Blitz.
10. Blitz — Question Selection
SABI asks: “What is the most useful next question for this student right now?”
Inputs: subject combination, mastery, recent mistakes, difficulty, exposure, topic/subtopic, origin, question quality and recent activity.
Hard filters remove invalid, flagged, duplicate, unavailable or excessively repeated questions.
Selection factors: learning need, appropriate difficulty, novelty, reinforcement, subject balance, challenge value and exposure control.
Controlled variation prevents repetitive feeds.
Cold-start uses onboarding + diagnostic + heuristics; observed behaviour increasingly replaces assumptions.
Start rule-based; adopt ML only if it beats the baseline.
11. Blitz — Adaptive Difficulty
Correct sequences can gradually increase challenge.
Repeated errors can trigger easier/related reinforcement.
Use different questions testing the same concept rather than immediate repetition.
Maintain useful subject/topic variety.
Long sessions may surface a gentle break suggestion.
Do not force endless engagement.
12. Blitz — UI/UX
Fast, clean, energetic, minimal, mobile-first.
Question → Answer → Feedback → Next is dominant.
Short transitions; no unnecessary animation.
No timer or speed indicator.
Sound/haptics optional.
Report question available.
Human-readable offline/error states.
Prefetch next question where possible.
13. Blitz — Data & Events
blitz_session
- session_id
- student_id
- start/end
- status
- questions attempted
- correct/incorrect
- XP
- highest streak

question event
- question_id
- subject/topic/subtopic
- difficulty
- origin_year
- position
- selected answer
- correctness
- timestamp

interaction events
- viewed
- selected/submitted
- explanation opened
- reported
- next question
- session exit
Preserve raw events so future algorithms can be recalculated/evaluated.
XP should be auditable through transactions.
Question reports/performance feed question-quality review.
14. Blitz — Mastery & Recommendation Integration
Blitz
 ↓
Raw Events
 ↓
Central Mastery Engine
 ↓
Updated Learning State
 ↓
Recommendation Engine
 ↓
Next Best Action
Blitz has no isolated mastery system.
Recommendations require sufficient evidence.
Improvement is also evidence.
AI Coach explains structured evidence; it does not invent mastery conclusions.
15. Blitz — Quality & Anti-Gaming
Do not reward rapid guessing.
Do not allow XP farming to distort learning.
Do not over-repeat questions.
Broken questions must be removable from active selection.
AI explanations cannot override the authoritative answer key.
If explanation confidence is insufficient, use verified fallback or flag the question.
Use evidence-based, non-shaming language.
Streaks should encourage consistency without guilt.
No manipulative endless-scroll mechanics.
Student retains control to stop.
16. Backend Brain — Proposed Modules
01. Authentication
02. Student Profile
03. JAMB Configuration
04. Question Bank
05. Question Taxonomy
06. Session Engine
07. Event Tracking / Raw Event Log
08. Mastery Engine
09. Recommendation Engine
10. AI Coach
11. RAG / Knowledge Layer
12. Blitz Engine
13. Smart Practice Engine
14. Custom Practice Engine
15. CBT Engine
16. Progress Analytics
17. Gamification
18. Notification Engine
19. Subscription / Entitlements
20. Payment
21. Question Quality / Review
22. Admin
23. School Management
24. Product Analytics
25. Data / ML Infrastructure
17. Backend Principles
One central student learning state.
Raw learning events are preserved.
Mastery is computed separately from raw events.
Recommendation logic is separate from AI language generation.
RAG explains; it does not track mastery.
Question answer keys remain authoritative.
Rules/heuristics first; ML later only if it beats baseline.
Session state must persist robustly.
Entitlements should be centralized.
Product analytics and learning analytics remain conceptually separate.
Recommendations should map to concrete next actions.
Recommendation effectiveness should eventually be measured.
18. Core Data Model
STUDENT
 ├── Account
 ├── Student Profile
 ├── Subjects
 ├── Sessions
 ├── Raw Events
 ├── Mastery State
 ├── Recommendations
 ├── Achievements
 ├── Entitlements
 └── Subscription

QUESTION
 ├── Subject
 ├── Topic
 ├── Subtopic
 ├── Difficulty
 ├── Origin
 ├── Correct Answer
 ├── Explanation
 ├── Quality
 └── Usage

STUDENT ←── LEARNING EVENT ──→ QUESTION
19. Mastery Engine — Direction
Do not equate session accuracy with mastery.
Mastery should consider correctness, difficulty, repeated evidence, recent performance, consistency and concept coverage.
Mastery should include an evidence/confidence dimension.
Existing direction references an SM-2/Elo-style SQL/rules approach with zero LLM calls for mastery.
Exact formula, decay, thresholds, confidence model and calibration are OPEN.
20. Recommendation Engine — Direction
Inputs: learning state, mastery/confidence, recent activity, strengths/weaknesses, available study time, exam timeline and recent sessions.
Outputs: structured recommendation + concrete action.
Possible actions: Strengthen, Maintain, Challenge, Review, Continue, and potentially Rest/Break.
Missed days trigger recalculation rather than backlog accumulation.
Recommendation effectiveness should be measured.
Exact scoring/ranking formula is OPEN.
21. AI Coach & RAG
AI operates downstream of deterministic evidence.
AI receives structured learning evidence plus relevant knowledge.
AI personalizes language/explanation style.
AI does not invent mastery, scores or recommendation logic.
RAG supplies relevant knowledge; it does not track mastery.
Fallbacks are required when knowledge/confidence is insufficient.
22. Daily Learning & Exam Timeline
>6 months: foundation/coverage direction.
4–6 months: coverage/mastery direction.
2–3 months: weak-area strengthening + CBT direction.
≤1 month: targeted revision + simulation direction.
These are product-direction rules, not the final scheduling algorithm.
Daily plan adapts to actual available time.
Missed plans recalculate instead of accumulating.
23. Existing Technical Direction
Supabase / Postgres.
pgvector.
Gemini Flash / Gemini 3.8 Flash referenced in existing work.
Earlier architecture referenced Gemini Flash-Lite with DeepSeek fallback through self-hosted LiteLLM.
Earlier work referenced 5 automation pipelines, with 2 already running for Math.
These references should be verified before implementation; they are recorded here as existing product context, not newly verified requirements.
24. Existing Monetization Direction
Free tier.
Trial month.
One-time unlock around ₦3,000–₦5,000.
AI credits.
School licences.
Exact entitlement matrix is OPEN.
Entitlement checks should be centralized.
25. OPEN — Must Be Designed Before Implementation
Exact Supabase schema, indexes and RLS policies.
Complete JAMB subject/topic/subtopic taxonomy.
Exact mastery formula and confidence calculation.
Recommendation ranking formula.
Question ingestion/review workflow.
AI Coach prompt/system architecture.
RAG corpus/retrieval policy.
Exact automation/background jobs.
Notification timing rules.
Exact subscription/entitlement matrix.
School/admin permissions.
Canonical analytics event naming.
ML training/evaluation architecture.
Offline/cache strategy.
Final XP/badge economy.
26. Source-of-Truth Rules
1. Treat this document as the locked record of SABI decisions made so far.
2. Do not silently replace locked decisions with generic product assumptions.
3. OPEN items must be explicitly designed and approved before becoming locked.
4. If a later decision conflicts with this document, update the document and record the change.
5. Do not infer missing requirements as if they were approved.
6. Keep frontend, backend, database, AI and analytics consistent with this source of truth.
27. Next Long Workstream
1. Data model + Supabase schema
2. JAMB question taxonomy + question bank
3. Canonical raw-event contract
4. Session engine
5. Mastery engine + mathematical rules
6. Recommendation engine
7. Smart Practice logic
8. Blitz logic
9. Custom Practice logic
10. CBT generation/persistence/submission/scoring
11. AI Coach + RAG
12. Automations/background jobs
13. Entitlements/payment
14. Notifications
15. Admin/question quality
16. Security/RLS
17. Analytics/experimentation
18. ML readiness/evaluation
28. Final Product Principle
SABI should make the student's next useful learning action feel obvious while keeping the complexity of measurement, adaptation, recommendation, question selection and data processing behind the interface.

PART II — FRONTEND ARCHITECTURE
Source document: SABI_Frontend_Implementation_Specification_v1.docx
SABI
FRONTEND IMPLEMENTATION SPECIFICATION
Version 1.0 • September 2026
Frontend blueprint for implementing the approved SABI product architecture.
1. Document Purpose
This document translates the approved SABI product and technical architecture into a frontend implementation blueprint. It defines the frontend information architecture, screens, navigation, states, components, interaction rules, and integration boundaries.
The SABI Technical Implementation Specification remains authoritative for backend contracts and technical boundaries. Locked product decisions remain locked. Open decisions remain open and must not be silently invented.
2. Decision Language
Marker
Meaning
🔒 LOCKED
Approved decision; frontend must implement it.
🔵 PROPOSED
Recommended frontend treatment pending approval.
🟡 OPEN
Not finalized; do not hard-code it.
🔴 CHANGED
Later decision replaced an earlier one; record the change.

3. Frontend Principles
One central student learning state is represented consistently across the product.
Frontend displays and collects state; it does not independently calculate mastery, readiness, correctness, recommendations, XP balance, or payment confirmation.
Backend APIs are authoritative for trust-sensitive decisions.
Learning experiences remain distinct: Smart Practice adapts, Blitz is rapid-fire, Custom Practice is student-controlled, and CBT is strict.
AI is presented as a coach/explainer, not as the source of truth for learning state.
Open requirements remain configurable and are never guessed in UI logic.
Major async operations have explicit loading, success, empty, error, and retry states where applicable.
4. Primary Frontend Information Architecture
The approved core architecture contains 15 primary screens:
Welcome
Sign Up / Login
Onboarding
JAMB Diagnostic
JAMB Prep Home
Subject Selection
Custom Practice Setup
Question Experience
Explanation
Session Results
Progress / Mastery
Weak Areas & Recommendations
CBT Exam Simulator
CBT Results
Profile / Settings
Parent and school surfaces consume the same central learning engine and remain separate future surfaces; their final permission model is OPEN.
5. Global Navigation
5.1 Student navigation
Home — central starting point and daily learning state.
Practice — Smart Practice, Blitz, and Custom Practice.
CBT — simulator and exam history.
Progress — mastery, coverage, trends, and readiness.
Profile — account, preferences, settings, and access information.
Exact labels and visual navigation pattern are implementation-level decisions and must not alter the product architecture.
6. Screen Specifications
Welcome
Purpose: Introduce SABI and route to authentication.
Primary actions: Sign Up; Log In.
Sign Up / Login
Purpose: Supports phone + OTP, email + password, and Google sign-in.
Authentication/session state comes from the backend.
Onboarding
Purpose: Collects the approved 15 onboarding questions.
Self-reported profile/preferences, not observed mastery.
JAMB Diagnostic
Purpose: Adaptive baseline across selected subjects; not the 180-question Full Mock.
One question at a time; answers go through session APIs.
JAMB Prep Home
Purpose: Answers: “What should I do now?”
Dynamic JAMB countdown, today’s recommended action, Practice Hub, progress, subject snapshot, focus area, recent activity, streak.
Subject Selection
Purpose: Select applicable JAMB subjects where required.
Backend validates the combination.
Custom Practice Setup
Purpose: Student deliberately configures practice.
Subject, topic/subtopic, origin, count, instant feedback, explanation visibility, randomization, timed session where supported.
Question Experience
Purpose: Shared question interaction surface.
Question/options, answer state, submission, feedback and permitted next action; backend determines correctness.
Explanation
Purpose: Shows explanation after an answer where permitted.
AI/RAG may generate explanation; authoritative answer remains backend-controlled.
Session Results
Purpose: Summarizes completed practice.
Show learning outcomes, focus areas and next action.
Progress / Mastery
Purpose: Shows mastery, confidence, coverage and trends.
Clearly distinguish mastery estimates from exam scores.
Weak Areas & Recommendations
Purpose: Shows evidence-based next actions.
Backend supplies action, target, reason, priority, duration, status and evidence.
CBT Exam Simulator
Purpose: Strict exam environment.
Full Mock 180/120; Quick Mock 40/30; English compulsory + 3 subjects; timer, navigator, review flag, calculator where configured, two-step submission, auto-submit.
CBT Results
Purpose: Shows finalized exam performance.
Separate exam performance from mastery; results feed readiness/recommendations after completion.
Profile / Settings
Purpose: Account and learning preferences.
Relevant onboarding preferences and account controls; backend remains authoritative.
7. Learning Experience Rules
7.1 Smart Practice
Recommendation → Smart Practice → Question Selector → Question → Answer → Feedback → Explanation → New evidence → Mastery/Coverage → Next question → Session result → Next action.
Minimal setup.
SABI selects target and next question.
Next-question state is refreshed from backend evidence.
Stopping/session-length logic is OPEN; never hard-code an arbitrary fixed length.
Student can exit and backend session state must be preserved.
7.2 Blitz
Locked flow: Question → Answer → Feedback → Learn → XP → Next.
No setup.
No fixed session length.
One question at a time.
Stop anytime.
Speed is not displayed or used as a Blitz intelligence/reward signal.
XP is not mastery, readiness, intelligence or JAMB score.
7.3 Custom Practice
Student deliberately chooses what to practice.
Show approved configuration controls.
Do not turn Custom Practice into Smart Practice.
Backend validates configuration and creates the session.
7.4 CBT
Question set is fixed once the exam begins.
Server time is authoritative; frontend displays remaining time.
No pause that stops exam time.
No hints, AI Coach or explanations during an active exam.
Support navigation, review flags and answer changes.
Use two-step submission and reflect automatic submission on expiry.
8. Frontend State Model
Initial / not loaded
Loading
Loaded with data
Loaded but empty / insufficient evidence
Submitting / processing
Success
Recoverable error with retry
Permission / entitlement denied
Session expired or invalid
Offline / reconnecting where applicable
Do not fabricate mastery, readiness or recommendation values when backend evidence is insufficient.
9. API Integration Boundary
Approved operations include:
startSmartPractice()
startBlitz()
startCustomPractice(config)
startDiagnostic()
startCBT(config)
submitAnswer()
getNextQuestion()
completeSession()
requestExplanation()
getRecommendations()
getProgress()
getReadiness()
Clients must not expose updateMastery(), setReadiness(), setCorrectAnswer(), setXPBalance(), or confirmPayment().
10. Frontend Data Rules
Never trust client-provided correctness.
Never calculate authoritative mastery/readiness in UI components.
Never directly modify XP balance or confirm payment.
Never expose privileged service credentials.
Synchronize question/session state with backend.
Use stable identifiers returned by APIs.
11. Question Component Contract
Question text
Options
Selected answer
Submission state
Feedback state
Explanation availability
Mode context
Review flag where applicable
Question position where applicable
The component never determines the authoritative correct answer.
12. Explanation Component Contract
Correct/incorrect result from backend
Authoritative correct answer
Quick explanation
Step-by-step explanation where available
Key idea
Common mistake where available
Optional next learning action
AI-generated text is generated content subject to backend validation.
13. Progress UI
Mastery estimate
Confidence/reliability
Syllabus coverage
Recent performance
Long-term performance
Trend
Readiness
CBT performance
Never display mastery as an official JAMB score.
14. Recommendation UI
Action
Target
Reason
Priority
Estimated duration
Evidence/context
Status
Entry point
Missed recommendations do not automatically become a backlog; backend may recalculate or supersede them.
15. CBT Frontend State Machine
Ready
Active
Navigating
Reviewing
Submitting
Completed
Auto-submitted
Expired / session unavailable
Server remains authoritative for session status and expiry.
16. Authentication and Access
Authenticated routes require a valid session.
Feature access is determined by centralized entitlement checks.
Frontend may hide unavailable features for clarity, but backend access remains authoritative.
Payment confirmation and entitlement mutation are never client-authoritative.
17. AI Coach Frontend Boundary
Consume structured backend AI responses.
Respect explanation and language preferences where supplied.
Show fallback states when AI/RAG is unavailable.
Do not present AI text as authoritative mastery/readiness logic.
Do not offer AI assistance during active CBT.
18. Error Handling
Network failure: preserve local interaction state where safe and retry.
Expired session: show recoverable session state instead of silently creating a new session.
Entitlement failure: explain access requirement without changing learning state.
AI failure: use deterministic/fallback behavior where available.
Invalid session/question state: stop unsafe submission and refresh backend state.
Never silently discard an answer that may constitute learning evidence.
19. Analytics Hooks
Frontend analytics records product interaction; canonical learning evidence remains the backend event contract.
Screen viewed
CTA selected
Practice mode entered
Recommendation opened/started/completed/skipped
Question interaction events where appropriate
Navigation/usability events
20. Accessibility and Responsive Behavior
Question options must be keyboard/touch accessible.
Interactive controls require clear focus/selected/disabled states.
Usable across mobile and desktop layouts.
CBT controls must not obscure timer or question content.
Do not rely on color alone for correctness, selection, review or status.
Exact visual design tokens, typography, color system, animation language and component library remain outside this document unless separately approved.
21. Component Architecture — PROPOSED
AppShell / authenticated shell
Navigation
Auth forms
Onboarding form system
QuestionCard / QuestionOptions
AnswerFeedback
ExplanationPanel
SessionHeader
PracticeSession
RecommendationCard
ProgressCard / MasteryCard
ReadinessCard
CBTNavigator
CBTTimer
ReviewFlag
ResultsSummary
SubjectSnapshot
StreakCard
EntitlementGate
AIExplanationState
Loading / Empty / Error states
22. Route Structure — PROPOSED
/welcome
/auth/*
/onboarding
/diagnostic
/home
/practice
/practice/smart
/practice/blitz
/practice/custom
/session/:id
/progress
/recommendations
/cbt
/cbt/:sessionId
/cbt/:sessionId/results
/profile
Exact route names are implementation-level and may change without changing product architecture.
23. Frontend Security Rules
Never ship privileged service credentials.
Enforce access through backend/RLS boundaries.
Route guards are UX protection, not final security.
Do not trust client ownership, correctness, score, mastery, readiness, XP or payment state.
Render generated content safely.
24. Open Frontend Decisions
Exact visual design system and component library.
Exact mobile navigation structure.
Exact Smart Practice stopping/session-length UI.
Exact entitlement/paywall presentation.
Exact AI credit presentation.
Final parent/school/admin surfaces and permissions.
Exact analytics event naming.
Offline/cache strategy.
Final XP/badge presentation.
Exact notification presentation/timing.
25. Frontend Implementation Order
Application shell and environment configuration
Authentication and protected routing
Design system/shared components
Onboarding
JAMB configuration and profile state
Diagnostic
Question experience
Session state handling
Smart Practice
Blitz
Custom Practice
Progress/mastery/recommendations
CBT
AI Coach/explanation surfaces
Gamification
Entitlements/payments/AI credits
Error/loading/empty/access states
Analytics hooks
Parent/school surfaces
End-to-end QA and accessibility
26. Frontend Testing Requirements
Authentication and route protection
Onboarding validation
Question rendering and answer submission
Session resume/state
Smart Practice adaptive flow
Blitz no-speed/no-fixed-length behavior
Custom Practice configuration
CBT timer/navigator/review/submission/expiry
Permission/entitlement UI
AI explanation/fallback
RLS/API authorization integration
Responsive/accessibility
End-to-end signup → onboarding → diagnostic → practice → CBT → readiness
27. Source-of-Truth Rules
Treat the Master Product Specification and Technical Implementation Specification as authoritative.
Implement locked contracts before proposing improvements.
Never turn an OPEN item into an assumed requirement.
Keep trust-sensitive logic server-side.
Do not duplicate mastery, readiness, recommendation, selection or payment logic in frontend components.
Versioned API contracts take precedence over UI assumptions.
Flag ambiguity rather than silently inventing behavior.
Approved changes must be recorded in the decision record and reflected across affected frontend/backend surfaces.
28. Frontend Completion Definition
The frontend is implementation-ready when every approved screen has a defined route, component/state contract, API dependency, loading/error/empty behavior, authorization boundary and test coverage, while remaining OPEN decisions are explicitly configurable or marked for later implementation.
29. Final Principle
SABI’s frontend should make the student’s next useful learning action feel obvious while keeping measurement, adaptation, recommendation, question selection and data processing behind the interface.

PART III — CORE FRONTEND IMPLEMENTATION
Source document: SABI_Google_AI_Studio_Frontend_Implementation_Prompt_Book_v2_DETAILED.docx
SABI
GOOGLE AI STUDIO FRONTEND IMPLEMENTATION PROMPT BOOK
VERSION 2.0 — DETAILED SCREEN-BY-SCREEN BUILD EDITION
Purpose: Give Google AI Studio enough implementation detail to build the SABI frontend without guessing what screens connect to, what happens after each action, what data is required, or where the user goes next.
This edition deliberately expands the previous prompt book. It is intended to be used as an execution manual, not merely as a feature checklist.
TABLE OF CONTENTS
1. How to use this book
2. Non-negotiable SABI frontend constitution
3. Complete application map
4. Global navigation and routing rules
5. Global UI state model
6. Authentication and session rules
7. Exact 15-question onboarding specification
8. Screen-by-screen implementation prompts
9. Shared learning-session architecture
10. Smart Practice flow
11. Blitz flow
12. Custom Practice flow
13. CBT flow
14. Progress, recommendations and readiness flow
15. AI Coach / RAG frontend flow
16. Entitlements, payments and AI credits
17. Parent/School future architecture
18. Analytics and instrumentation
19. Accessibility, responsive behavior and performance
20. Security requirements
21. Comprehensive test matrix
22. Final Google AI Studio completion audit
1. HOW TO USE THIS BOOK
Run the prompts sequentially. Each prompt is deliberately written so Google AI Studio can inspect the current project, preserve existing work, and implement the next layer without silently redesigning SABI.
Paste Prompt 0 first. It establishes the permanent constitution.
Then execute Prompts 1–20 in order.
After each prompt, require Google AI Studio to report: files changed, routes added/changed, components added, APIs consumed, tests run, unresolved OPEN decisions, and anything it could not implement.
Do not allow the coding agent to invent missing backend behavior. If an API does not exist, it must identify the contract gap rather than create a fake permanent backend.
Temporary mock data is permitted only for isolated UI work and must be clearly marked and replaceable.
Do not skip screens because a later screen appears more interesting. The flow is designed to make dependencies explicit.
Whenever a prompt says 'backend authoritative', the frontend must consume the returned state rather than recomputing it.
2. DECISION LANGUAGE
Marker
Meaning
Implementation behavior
🔒 LOCKED
Approved decision
Implement exactly; do not reopen.
🔵 PROPOSED
Recommended treatment
May be implemented as a replaceable UI treatment; do not treat as product truth.
🟡 OPEN
Not finalized
Do not hard-code; isolate behind configuration or interface.
🔴 CHANGED
Later decision replaced earlier one
Use the later decision.

3. NON-NEGOTIABLE FRONTEND CONSTITUTION
One central student learning state must be represented consistently throughout the application.
The frontend is a presentation and interaction layer. It is not the learning engine.
Correctness comes from the backend answer key.
Mastery comes from the backend mastery engine.
Readiness comes from the backend readiness engine.
Recommendations come from the backend recommendation engine.
Question selection comes from the backend selection engine.
XP balance comes from the backend.
Payment confirmation and entitlements come from the backend.
The frontend must never expose privileged service credentials.
Never calculate an authoritative JAMB score, mastery score, readiness score, recommendation priority, XP balance or payment confirmation in a component.
AI explanations are downstream of structured evidence and approved knowledge. AI is not allowed to silently become the source of truth.
Active CBT must never expose AI Coach, hints or explanations.
Blitz must never show speed as an intelligence/reward signal.
Mastery must never be labelled as an official JAMB score.
Open decisions must never be silently converted into fixed UI behavior.
4. COMPLETE APPLICATION MAP
From
Action / Condition
Next screen
Welcome
Tap Sign Up
Sign Up / Login
Welcome
Tap Log In
Sign Up / Login
Auth
Successful authentication + onboarding incomplete
Onboarding
Auth
Successful authentication + onboarding complete + diagnostic not completed
Diagnostic
Auth
Successful authentication + core setup complete
Home
Onboarding
Finish and save
Diagnostic
Diagnostic
Complete
Home
Home
Tap Smart Practice
Smart Practice
Home
Tap Blitz
Blitz
Home
Tap Custom Practice
Custom Practice Setup
Home
Tap CBT
CBT Setup
Home
Tap Progress
Progress
Home
Tap Recommendations/Focus Area
Recommendations / target
Home
Tap Profile
Profile
Practice
Choose Smart
Smart Practice
Practice
Choose Blitz
Blitz
Practice
Choose Custom
Custom Practice Setup
Question
Submit answer in practice
Feedback / Explanation / Next
Practice session
Complete
Session Results
Session Results
Tap next action
Target experience
CBT Setup
Start exam
Active CBT
Active CBT
Submit exam
CBT Results
Progress
Open recommendation
Recommendation target
Profile
Logout
Welcome
Expired session
Recover
Auth or relevant resume state
Entitlement denied
View access
Subscription / access surface

5. EXACT 15-QUESTION ONBOARDING SPECIFICATION
This section is intentionally explicit. Google AI Studio must NOT be told merely to 'build the 15 onboarding questions'. It must use the exact field structure below.
#
Question / Field
Input
Required behavior
1
Full Name
Text
Required. Store as profile identity/display name.
2
Subject Combination
Subject selector
English Language is fixed/locked. Student selects exactly 3 additional subjects from the approved pool. Backend validates the final combination.
3
Current Class & Prior Attempts
Structured selection
Current class/status: SS2, SS3, or out-of-school. If out-of-school, collect years out. Collect prior JAMB attempts: 0, 1, 2+.
4
Target Course & University
Two text/search fields
Collect intended course and intended university.
5
Exam Timeline
Single select
≤1 month; 2–3 months; 4–6 months; >6 months. UI may show a dynamic countdown to the upcoming March JAMB only when supplied by the product/backend date source.
6
Subject Confidence Levels
Rating 1–5 per subject
For each of the student's 4 subjects, collect confidence from 1–5. This is self-report, not observed mastery.
7
Weakest / Priority Subject
Subject selector
Ask which subject the student believes needs the most help.
8
Root Cause
Single select
Careless mistakes/time pressure; run out of time; struggle with methods/formulas; inconsistency.
9
Specific Trouble Topic
Free text
Ask for a specific topic the student struggles with.
10
Study Style
Single select
Structured; flexible; don't study.
11
Daily Study Dedication
Single select
≤1h; 2–3h; 4+h.
12
Study Environment
Single select
Quiet/private; busy/noisy.
13
Explanation Preference
Single select
Brief; detailed.
14
Language Style
Single select
Plain Formal English; West African Pidgin; Mixed Nigerian English.
15
Core Motivation
Long text
Ask the student why passing JAMB / achieving the goal matters to them. Store as motivation context; do not treat it as mastery evidence.

5.1 ONBOARDING QUESTION WORDING
Question 1: What is your full name?
Question 2: Which subjects are you taking for JAMB?
Question 3: What is your current class/status, and have you written JAMB before?
Question 4: What course do you want to study, and which university do you want to attend?
Question 5: When are you planning to write JAMB?
Question 6: How confident are you in each of your JAMB subjects?
Question 7: Which subject do you need the most help with?
Question 8: What usually makes JAMB preparation difficult for you?
Question 9: Is there a particular topic you struggle with?
Question 10: How do you prefer to study?
Question 11: How much time can you dedicate to JAMB preparation each day?
Question 12: Where do you usually study?
Question 13: How would you like SABI to explain things to you?
Question 14: Which language style would you prefer SABI to use?
Question 15: Why is achieving your JAMB goal important to you?
5.2 ONBOARDING FLOW
Authenticated student enters /onboarding.
Show a welcome/intro state explaining that the questions help personalize SABI.
Show Question 1.
After a valid answer, enable Continue.
Continue advances to Question 2.
Subject Combination requires English plus exactly three additional subjects before Continue is enabled.
Questions 3–15 follow the same controlled progression.
Allow Back to revisit prior answers without losing them.
Save draft progress safely so a refresh/session interruption does not force the student to restart.
At Question 15, show a final review/confirmation state before final submission if supported by the implementation.
Submit the complete onboarding payload to the backend.
On successful save, route to Diagnostic.
Do not route directly to Home unless the backend says the diagnostic is already complete.
On failure, preserve entered data and show a recoverable retry state.
After successful completion, onboarding should not repeatedly appear unless backend state explicitly says it is incomplete.
6. PROMPT 0 — MASTER FRONTEND BUILD INSTRUCTION
You are the senior frontend engineer responsible for implementing the SABI JAMB Prep Platform in the existing Google AI Studio project.

FIRST ACTION:
Inspect the existing project before changing anything. Identify framework, routing, styling system, component library, state management, API client, authentication integration, environment configuration, existing screens, existing tests, and existing backend contracts.

SOURCE OF TRUTH:
1. SABI Master Product Specification.
2. SABI Technical Implementation Specification.
3. SABI Frontend Implementation Specification.
4. This prompt book for execution detail.

DO NOT:
- invent product behavior;
- invent backend endpoints;
- calculate trust-sensitive learning state in the client;
- expose secrets;
- turn OPEN decisions into LOCKED decisions;
- replace correct existing work unnecessarily.

CORE RULE:
The frontend asks the backend what the student should see and do next. The frontend does not become the learning engine.

REQUIRED PRIMARY ROUTES:
Welcome, Auth, Onboarding, Diagnostic, Home, Practice, Smart Practice, Blitz, Custom Practice, Session, Progress, Recommendations, CBT, CBT Results, Profile.

REQUIRED STUDENT NAVIGATION:
Home, Practice, CBT, Progress, Profile.

REQUIRED GLOBAL STATES:
initial, loading, loaded, empty/insufficient evidence, submitting, success, recoverable error, permission/entitlement denied, session expired/invalid, offline/reconnecting where applicable.

After implementation, report:
- architecture discovered;
- files changed;
- routes;
- components;
- API contracts used;
- tests run;
- unresolved OPEN decisions;
- blockers.
STOP if a missing backend contract prevents safe implementation; do not fabricate production behavior.
6.1 PROMPT 0 ACCEPTANCE
Existing project inspected before modification.
Core route architecture exists.
Shared API boundary exists.
Auth/session state has a defined source.
No privileged secrets in client.
No duplicated mastery/readiness/recommendation logic.
Build passes.
7. PROMPT 1 — APPLICATION SHELL, ROUTING AND SHARED UI
Build the SABI application shell.

ROUTES:
- /welcome
- /auth/*
- /onboarding
- /diagnostic
- /home
- /practice
- /practice/smart
- /practice/blitz
- /practice/custom
- /session/:id
- /progress
- /recommendations
- /cbt
- /cbt/:sessionId
- /cbt/:sessionId/results
- /profile

NAVIGATION:
Desktop may use a persistent navigation pattern.
Mobile may use an approved bottom navigation or compact navigation pattern.
Do not claim the exact visual navigation pattern is locked.

GLOBAL SHELL:
- app logo/brand area
- page title/context
- navigation
- content container
- responsive layout
- notification/error surface where approved
- session-aware user controls

BUILD REUSABLE COMPONENTS:
AppShell, Navigation, PageHeader, Button, Input, Select, RadioGroup, Checkbox/Toggle, Card, Modal/Sheet, Toast/Alert, LoadingSkeleton, EmptyState, ErrorState, RetryButton, ProgressIndicator, SectionHeader, BottomActionBar.

ROUTING RULES:
- Unauthenticated -> auth.
- Authenticated but onboarding incomplete -> onboarding.
- Onboarding complete but diagnostic incomplete -> diagnostic.
- Core setup complete -> home.
- Expired session -> recover auth/session.
- Unauthorized feature -> entitlement/access state.

DO NOT calculate these conditions from local guesses. Use backend/auth state.
7.1 SCREEN TRANSITION RULES
Current
Condition
Destination
Notes
Welcome
Sign Up
Auth
Start account flow
Welcome
Log In
Auth
Existing account
Auth
Auth success + incomplete onboarding
Onboarding
Backend profile state
Auth
Auth success + onboarding complete + diagnostic incomplete
Diagnostic
Backend learning state
Auth
Auth success + setup complete
Home
Normal returning user
Any authenticated screen
Logout
Welcome
Clear local session state
Any protected route
Session expired
Recovery/Auth
Do not silently restart session
Any feature
Entitlement denied
Access surface
Backend remains authoritative

8. PROMPT 2 — AUTHENTICATION
Implement authentication UI for:
1. Phone + OTP
2. Email + password
3. Google sign-in

WELCOME:
Primary CTA: Sign Up
Secondary CTA: Log In

AUTH:
Allow the user to choose an approved method.
Phone flow:
- enter phone
- request OTP
- show verification state
- enter OTP
- verify
- handle wrong/expired OTP
- allow safe retry
Email flow:
- email
- password
- validation
- submit
Google:
- launch provider flow
- handle cancellation/failure

AFTER AUTH:
Do not decide destination from UI assumptions.
Request current account/profile/setup state and route:
onboarding -> diagnostic -> home according to backend state.

ERRORS:
Never erase entered values unnecessarily.
Never show raw backend secrets/errors.
Provide actionable retry messaging.

SECURITY:
No service-role credentials.
No client authority over account roles, entitlements or payment state.
9. PROMPT 3 — EXACT ONBOARDING SCREEN
Implement the SABI onboarding screen exactly from the specification below.

THE 15 FIELDS ARE NOT PLACEHOLDERS. IMPLEMENT THEM.

1. Full Name — required text.
2. Subject Combination — English Language locked/compulsory + exactly 3 additional subjects.
3. Current Class & Prior Attempts — SS2 / SS3 / out-of-school; if out-of-school collect years out; collect JAMB attempts 0 / 1 / 2+.
4. Target Course & University — course + university.
5. Exam Timeline — <=1 month / 2-3 months / 4-6 months / >6 months.
6. Subject Confidence — rating 1-5 for each of the 4 subjects.
7. Weakest/Priority Subject.
8. Root Cause — careless mistakes/time pressure / run out of time / struggle methods/formulas / inconsistency.
9. Specific Trouble Topic — free text.
10. Study Style — structured / flexible / don't study.
11. Daily Study Dedication — <=1h / 2-3h / 4+h.
12. Study Environment — quiet/private / busy/noisy.
13. Explanation Preference — brief / detailed.
14. Language Style — Plain Formal English / West African Pidgin / Mixed Nigerian English.
15. Core Motivation — long text.

SCREEN BEHAVIOR:
- Show progress such as 1 of 15, 2 of 15, etc.
- Back returns to the previous question.
- Continue validates the current question.
- Do not advance when required information is missing.
- Preserve prior answers.
- Support resume after refresh/session restoration where safe.
- At completion, submit the entire payload.
- On success, route to /diagnostic.
- On failure, stay on onboarding and preserve the data.
- Confidence is self-reported; do not write it as observed mastery.
- Motivation is context; do not convert it to learning evidence.

SUBJECT RULE:
English Language is displayed as selected and locked.
Student must select exactly three other subjects.
The backend remains authoritative for validity.
9.1 ONBOARDING UI STATES
Question loading/config loading
Normal entry
Validation error
Saving
Saved draft
Session expired
Network failure
Final submission
Successful completion
Submission failure with retry
9.2 ONBOARDING TRANSITIONS
Action
Destination
Back on Q2–Q15
Previous question
Continue on valid Q1–Q14
Next question
Back on Q1
Return to previous entry point or auth/welcome according to navigation history
Submit valid Q15
Diagnostic
Submit invalid Q15
Remain on Q15 and show validation
Save failure
Remain on current question; preserve local form state
Session expiry
Auth/session recovery

10. PROMPT 4 — DIAGNOSTIC
Build the JAMB Diagnostic screen.

PURPOSE:
Establish an observed learning baseline across the student's selected subjects.

IMPORTANT:
This is NOT the 180-question Full Mock.
Do not display it as a full exam.
Do not hard-code a fixed number of questions.
The backend decides the adaptive sequence and stopping.

FLOW:
1. Enter /diagnostic.
2. Call startDiagnostic().
3. Receive session ID and first question.
4. Display one question.
5. Student selects answer.
6. Submit through submitAnswer().
7. Receive backend result/state.
8. Request next question through getNextQuestion() if session continues.
9. Repeat until backend says complete.
10. Call/observe completeSession().
11. Route to Home.

The frontend must not choose the next diagnostic question.

DISPLAY:
- subject context
- question
- options
- submission state
- appropriate progress indication only if backend provides meaningful progress
- exit/recovery control

DO NOT display:
- fake mastery values
- fake diagnostic percentage calculated client-side
- official JAMB score
- AI assistance during the diagnostic unless the backend explicitly defines a permitted post-answer explanation flow.

ON COMPLETION:
Show a concise transition/loading state while backend creates the student's initial learning state, then route to Home.
11. PROMPT 5 — HOME / JAMB PREP DASHBOARD
Build /home around the question:
'What should I do now?'

ORDER OF ATTENTION:
1. Today's Recommended Action
2. Practice Hub
3. Today's Progress
4. Subject Snapshot
5. Focus Area
6. Recent Activity
7. Streak
8. Dynamic JAMB Countdown

PRACTICE HUB:
Prominent entry points:
- Smart Practice
- Blitz
- CBT
- Custom Practice

CARD RULE:
Each card must render backend data.
If evidence is insufficient, show an honest empty/insufficient-evidence state.

CLICK FLOWS:
Recommended Action -> recommendation target.
Smart Practice -> /practice/smart.
Blitz -> /practice/blitz.
CBT -> /cbt.
Custom -> /practice/custom.
Progress -> /progress.
Focus Area -> /recommendations or target practice.
Recent Activity -> relevant session/result.
Profile -> /profile.

DO NOT:
- invent recommendation text;
- invent mastery;
- invent readiness;
- calculate streak locally;
- display mastery as a JAMB score.
12. PROMPT 6 — PRACTICE HUB AND SUBJECT SELECTION
Build /practice as the central learning-experience chooser.

The student should clearly understand:
SMART PRACTICE = SABI decides what I need next.
BLITZ = rapid personalized questions; no setup; no speed mechanics.
CUSTOM PRACTICE = I choose what I want to practice.
CBT = strict exam simulation.

Do not merge the experiences.

SUBJECT SELECTION:
Where subject selection is required:
- English is compulsory/locked.
- Exactly three other subjects are selected.
- Backend validates combination.

If a selected configuration is invalid:
- show the backend validation message;
- keep the student's choices;
- do not invent a replacement combination.

Navigation:
Practice -> Smart / Blitz / Custom.
CBT has its own top-level route.
13. PROMPT 7 — SHARED QUESTION EXPERIENCE
Implement the shared question interaction component.

PROPS/DATA:
- question ID
- question text
- options
- selected answer
- submission state
- backend feedback
- explanation availability
- mode context
- review flag where applicable
- question position where applicable
- session ID

STATES:
1. Unanswered
2. Answer selected
3. Submitting
4. Backend result received
5. Explanation available
6. Moving to next question
7. Error/retry

RULE:
The component never determines the correct answer.

PRACTICE:
After submission, show permitted feedback and explanation.

CBT:
Do not show explanation/AI.
Allow answer change before final exam submission.

BLITZ:
Keep interaction rapid; do not add speed indicators.

ACCESSIBILITY:
Keyboard/touch accessible.
Visible selected/focus/disabled states.
No color-only correctness indication.
14. PROMPT 8 — SMART PRACTICE
Implement Smart Practice.

ENTRY:
Home/Practice -> Smart Practice.
Minimal setup.
Do not ask the student to choose topic/difficulty unless backend/product explicitly requires a control.

START:
Call startSmartPractice().
Backend returns session context and first question.

LOOP:
Question -> answer -> submitAnswer() -> backend feedback -> optional explanation -> getNextQuestion() -> next question.

The frontend must NOT:
- select the next question;
- calculate mastery;
- calculate difficulty;
- calculate stopping;
- create a fixed question count;
- modify recommendation priority.

EXIT:
Student may leave.
Preserve session ID/state.
On return, offer resume if backend says session resumable.

COMPLETE:
Backend marks session completed.
Route to Session Results.

OPEN:
Exact stopping/session length is not finalized. Build UI so backend can signal continue/complete without hard-coded length.
15. PROMPT 9 — EXPLANATION / AI COACH
Implement the explanation experience.

TRIGGER:
Only after an answer where explanation is permitted.

DISPLAY:
- result: correct/incorrect from backend
- authoritative correct answer
- quick explanation if supplied
- step-by-step explanation if supplied
- key idea if supplied
- common mistake if supplied
- optional next learning action

AI FLOW:
Frontend calls requestExplanation().
Backend retrieves approved knowledge and generates/returns the structured explanation.
Frontend renders it safely.

AI DOES NOT:
- decide correctness;
- change answer key;
- set mastery;
- set readiness;
- choose recommendation;
- select next question.

CBT:
AI Coach is OFF during active CBT.
Do not render an AI button in the active exam.

FAILURE:
If AI/RAG is unavailable:
- show deterministic explanation if available;
- otherwise show a recoverable explanation-unavailable state;
- do not invent an explanation locally.
16. PROMPT 10 — SESSION RESULTS
Build Session Results.

INPUT:
Completed session response from backend.

SHOW:
- session type
- questions attempted where returned
- learning outcome
- focus areas
- next action
- relevant recommendation
- XP/streak changes only if backend returns them

DO NOT:
Calculate a new score locally.
Do not convert practice performance into official JAMB score.
Do not infer mastery from percentage.

BUTTON FLOWS:
Primary Next Action -> target experience.
Review/continue -> approved session review if backend supports it.
Home -> /home.
Progress -> /progress.

After completion, refresh relevant Home/Progress data rather than relying on stale client state.
17. PROMPT 11 — BLITZ
Implement Blitz as a separate rapid-fire experience.

LOCKED:
- no setup
- no fixed session length
- one question at a time
- stop anytime
- speed is not displayed
- speed is not used for reward
- speed is not used for mastery
- speed is not used for question selection
- speed is not used for recommendations

FLOW:
Practice -> Blitz -> startBlitz() -> question -> answer -> submitAnswer() -> feedback/learn -> next -> repeat.

The frontend must never:
- show 'faster' badges;
- show response time;
- show speed ranking;
- add countdown timers for speed;
- award extra XP for speed;
- display speed as intelligence.

STOP:
Stop button ends/exits the feed according to backend session semantics.
Do not assume a fixed number of questions.
18. PROMPT 12 — CUSTOM PRACTICE
Implement Custom Practice.

CONFIGURATION:
- Subject
- Topic/subtopic
- Origin
- Number of questions
- Instant feedback
- Show explanation
- Randomize
- Timed session where supported

FLOW:
1. /practice/custom loads approved taxonomy/options.
2. Student configures session.
3. Frontend validates basic form completeness.
4. Backend validates authoritative configuration.
5. startCustomPractice(config).
6. Route to /session/:id.
7. Shared Question Experience handles questions.
8. Session completion -> Session Results.

Do not convert this into adaptive Smart Practice.
Student chooses what to practice.
Backend still controls correctness and session validity.
19. PROMPT 13 — PROGRESS / MASTERY / COVERAGE
Build Progress.

SECTIONS:
1. Overall learning state
2. Subject snapshot
3. Mastery estimates
4. Confidence/reliability
5. Syllabus coverage
6. Recent performance
7. Long-term performance
8. Trends
9. Readiness
10. CBT performance

LABELING:
Use 'mastery estimate' or approved human-friendly terminology.
Never call mastery an official JAMB score.

INSUFFICIENT EVIDENCE:
Do not show 0% merely because data is missing.
Show 'Not enough evidence yet' where appropriate.

CLICK FLOWS:
Subject -> subject progress.
Focus area -> recommendations.
Recommendation -> target.
CBT performance -> CBT history/results where supported.

All values are backend-supplied.
20. PROMPT 14 — WEAK AREAS & RECOMMENDATIONS
Build /recommendations.

Each recommendation may contain:
- action
- target
- reason
- priority
- estimated duration
- evidence/context
- status
- entry point

DISPLAY RULE:
The frontend presents the recommendation. It does not decide whether the recommendation is good, urgent or high priority.

CLICK:
Open recommendation -> detail/target.
Start -> launch the appropriate learning experience.
Complete/skip/open -> send approved lifecycle event.

MISSED:
Do not create a backlog locally.
The backend may recalculate or supersede recommendations.

If there are no recommendations because evidence is insufficient:
Explain that SABI needs more learning evidence rather than fabricating weak areas.
21. PROMPT 15 — CBT SETUP
Build the CBT setup flow.

OPTIONS:
Full Mock — 180 questions • 120 minutes.
Quick Mock — 40 questions • 30 minutes.

SUBJECTS:
English Language is compulsory.
Three additional subjects are required.
Backend validates the combination.

BEFORE START:
Show:
- exam type
- subjects
- question count
- duration
- important rules
- confirmation action

After start:
Question set is fixed.
Do not allow configuration changes inside the active exam.

START:
startCBT(config) -> /cbt/:sessionId.

Do not call AI/explanation endpoints in the active exam.
22. PROMPT 16 — ACTIVE CBT EXAM
Build the strict CBT environment.

STATE MACHINE:
Ready -> Active -> Navigating -> Reviewing -> Submitting -> Completed
                                      -> Auto-submitted
                                      -> Expired/session unavailable

SERVER TIME:
Server is authoritative.
Frontend displays remaining time based on synchronized server/session information.
Do not trust device clock as the source of truth.

CONTROLS:
- question navigator
- previous/next where permitted
- answer selection
- answer change
- review flag
- configured calculator where backend allows
- final submission

PROHIBITED:
- pause that stops exam time
- AI
- hints
- explanations
- Smart Practice recommendations
- Blitz speed mechanics

EXPIRY:
When server indicates expiry, stop accepting unsafe new submissions, preserve known answers, reflect auto-submit state, then route to CBT Results when backend confirms completion.

REFRESH/NETWORK:
Do not silently create a new exam.
Recover the existing session from server state.
23. PROMPT 17 — CBT RESULTS
Build CBT Results.

SHOW:
- finalized exam performance
- subject-level performance where returned
- exam history/review options where permitted
- next learning action
- readiness update only after backend has recalculated it

SEPARATION:
Exam performance is not mastery.
Do not replace mastery with CBT percentage.
Do not call the CBT percentage 'mastery'.

NAVIGATION:
Results -> Progress
Results -> Recommendations
Results -> Home
Results -> CBT history if available.
24. PROMPT 18 — PROFILE / SETTINGS
Build Profile/Settings.

AREAS:
- account identity
- selected subjects
- relevant onboarding preferences
- explanation preference
- language style
- study preferences
- session/account controls
- entitlement/access information where supported
- logout

EDITING:
Save through backend profile APIs.
Do not change mastery by editing self-reported confidence.
If a preference affects AI language or explanation style, persist it as preference context.

LOGOUT:
Clear authenticated local session state safely and route to Welcome.

Do not expose service credentials or internal IDs.
25. PROMPT 19 — ENTITLEMENTS, SUBSCRIPTIONS & AI CREDITS
Build access presentation.

RULE:
Backend is authoritative for entitlements.

Frontend may:
- hide unavailable features for clarity;
- show locked feature state;
- show current plan/access;
- show AI credit balance if supplied;
- route to approved payment/access flow.

Frontend may NOT:
- mark payment as successful;
- increase credits;
- unlock a feature permanently;
- modify entitlement state directly.

PAYMENT FLOW:
1. Student selects an access option.
2. Frontend starts approved payment flow.
3. Payment provider/backend confirms.
4. Frontend refreshes entitlement state.
5. UI changes only after authoritative confirmation.

If payment returns to the app before backend confirmation:
show 'Verifying payment' rather than 'Payment successful'.

Exact plan matrix/paywall presentation remains OPEN.
26. PROMPT 20 — GAMIFICATION
Build gamification presentation from backend state.

POSSIBLE SURFACES:
- XP
- streak
- achievements/badges
- session completion feedback

RULES:
XP is not mastery.
XP is not readiness.
XP is not intelligence.
XP is not JAMB score.

Never calculate XP balance locally.
Never let gamification override a recommendation or learning state.

Keep gamification visually secondary to the learning action.
27. PROMPT 21 — PARENT/SCHOOL FUTURE-READY FOUNDATION
Prepare bounded frontend architecture for future Parent and School dashboards.

DO NOT invent final permission rules.
DO NOT expose student data to a parent/school route merely because the frontend can fetch it.

Future architecture:
SABI
  -> Student Dashboard
  -> Parent Dashboard
  -> School Dashboard
All consume the same learning engine.

Parent future concepts may include:
- study activity
- sessions
- subjects
- syllabus coverage
- mastery trends
- strong/focus areas
- CBT performance
- readiness
- consistency
- recommendations
- meaningful alerts
- milestones

But these are not permission approvals.
Keep future modules behind feature boundaries until backend contracts and permissions are finalized.
28. PROMPT 22 — AI/RAG FRONTEND INTEGRATION
Implement the frontend boundary for SABI AI Coach.

INPUTS FROM BACKEND MAY INCLUDE:
- question context
- authoritative result
- student learning evidence
- recommendation context
- explanation preference
- language style
- retrieved knowledge/context
- AI response
- fallback status
- model/retrieval metadata where intentionally exposed

FRONTEND ROLE:
Render structured AI responses.
Do not reinterpret them into mastery/readiness.
Do not allow generated text to mutate authoritative state.

RAG:
The frontend does not perform RAG reasoning.
The backend AI service handles retrieval and grounding.

FAILURE:
AI unavailable -> deterministic fallback if available.
Retrieval insufficient -> explain unavailable/limited explanation.
Unsafe/invalid response -> do not render unvalidated content if backend marks it invalid.

CBT:
AI endpoint is unavailable from active CBT UI.
29. PROMPT 23 — ANALYTICS HOOKS
Implement frontend analytics hooks without replacing canonical learning events.

PRODUCT INTERACTION EVENTS MAY INCLUDE:
- screen_viewed
- CTA_selected
- practice_mode_entered
- recommendation_opened
- recommendation_started
- recommendation_completed
- recommendation_skipped
- navigation/usability interactions

QUESTION LEARNING EVENTS:
The backend remains canonical for learning evidence.
Frontend may emit UI interaction telemetry but must not create a second authoritative learning history.

Analytics event names remain OPEN until finalized.
Centralize event names so they can be changed without editing every component.
30. PROMPT 24 — ACCESSIBILITY, RESPONSIVE & PERFORMANCE
Audit every implemented screen.

RESPONSIVE:
- mobile-first
- tablet
- desktop
- no horizontal overflow
- important actions remain reachable
- CBT timer remains visible
- question text is readable
- options remain tappable

ACCESSIBILITY:
- keyboard navigation
- visible focus
- semantic labels
- touch target size
- screen-reader labels where appropriate
- status not communicated by color alone
- selected/disabled states distinguishable without color

PERFORMANCE:
- avoid unnecessary re-fetching
- preserve session state safely
- lazy-load noncritical surfaces where appropriate
- avoid huge question payloads when backend supports incremental retrieval
- do not block the entire app because AI explanation is loading

Run performance checks on Home, Question Experience and CBT.
31. PROMPT 25 — FRONTEND SECURITY HARDENING
Perform a security review.

CHECK:
- no Supabase service-role key
- no provider secret
- no privileged credentials in source
- route guards
- backend authorization assumed/enforced
- safe rendering of generated AI text
- no client ownership trust
- no client payment trust
- no client mastery/readiness trust
- no client correctness trust
- no sensitive student data unnecessarily exposed in URL
- no unsafe persistence of session credentials
- safe error messages

IMPORTANT:
Frontend security is not a substitute for RLS/backend authorization.
If a vulnerability requires backend changes, document it rather than pretending the frontend solved it.
32. SHARED SESSION ARCHITECTURE — DETAILED
All learning sessions should use a shared frontend session controller so the four learning modes do not each invent their own state machine.
State
Meaning
Allowed actions
initial
No session loaded
Start/load
starting
Backend session creation in progress
Cancel safely
active
Question available
Select/submit/next
submitting
Answer being sent
Prevent unsafe duplicate submission
feedback
Backend result available
Explanation/next where allowed
loading_next
Next question requested
Wait/retry
paused/exited
User left; session may be resumable
Resume/end
completed
Backend session complete
Results
error
Recoverable failure
Retry/reload state
expired
Session invalid/expired
Recover/restart only when backend permits

32.1 COMMON SESSION RULE
The frontend should never assume that a local state transition is final when the backend can contradict it. After important transitions, reconcile with the server response.
33. SMART PRACTICE — FULL USER JOURNEY
Student opens Home.
Home displays Today's Recommended Action.
Student taps the recommended Smart Practice CTA.
Route opens Smart Practice.
Frontend loads any required profile/session context.
Student sees minimal setup rather than a large configuration form.
Student taps Start.
Frontend calls startSmartPractice().
Backend returns session ID and first question.
Frontend navigates to /session/:id or equivalent Smart Practice route.
Question is displayed.
Student selects an answer.
Submit becomes active.
Frontend calls submitAnswer().
Submit button enters processing state.
Backend returns authoritative result.
Frontend shows permitted feedback.
If explanation is requested/automatically allowed, requestExplanation().
Student taps Next.
Frontend requests getNextQuestion().
Backend decides the next question.
Frontend renders it.
Loop continues until backend signals completion.
Frontend completes/reconciles the session.
Route goes to Session Results.
Results display backend learning outcomes and next action.
Student can go to Home, Progress, Recommendation target or another approved action.
34. BLITZ — FULL USER JOURNEY
Student opens Practice.
Student selects Blitz.
Frontend starts Blitz with no configuration screen.
Backend returns first personalized question.
Student answers.
Backend returns result.
Frontend shows concise learning feedback.
Frontend requests next question.
Repeat.
Student can stop at any time.
Stopping must not be interpreted as failure.
Completion/exit state is synchronized with backend.
Do not display response speed.
Do not create speed rewards.
35. CUSTOM PRACTICE — FULL USER JOURNEY
Student opens Practice.
Student selects Custom Practice.
Frontend loads approved subject/taxonomy/origin options.
Student chooses subject.
Student chooses topic/subtopic where available.
Student chooses origin.
Student chooses number of questions.
Student chooses instant feedback.
Student chooses explanation visibility.
Student chooses randomization.
Student chooses timed session if supported.
Frontend performs basic completeness validation.
Frontend sends configuration to backend.
Backend validates configuration.
On success, backend creates session.
Frontend routes to question session.
Shared Question Experience handles interaction.
Session completes.
Frontend routes to Session Results.
36. CBT — FULL USER JOURNEY
Student opens CBT.
Frontend displays CBT setup.
Student chooses Full Mock or Quick Mock.
Frontend displays 180/120 or 40/30.
English is fixed plus three additional subjects.
Backend validates configuration.
Student sees exam rules.
Student confirms Start.
Backend creates fixed exam session.
Frontend enters Active CBT.
Server time controls timer.
Student answers questions.
Student navigates with navigator.
Student may flag for review.
Student may change answers before final submission.
No AI, hints or explanations appear.
Timer approaches zero.
If student submits manually, show two-step confirmation.
If time expires, backend auto-submits.
Frontend shows submission state.
Backend finalizes exam.
Frontend routes to CBT Results.
Results feed Progress/Readiness/Recommendations after backend processing.
37. GLOBAL ERROR / RECOVERY MATRIX
Problem
Frontend behavior
Never do
Network failure during question
Preserve safe local interaction; retry/reconcile
Silently lose answer
Session expired
Show recovery state
Create a new session without server confirmation
Invalid question state
Stop unsafe submission; refresh backend state
Guess correct state
AI unavailable
Fallback explanation or unavailable state
Invent AI explanation
Entitlement denied
Explain access requirement
Unlock locally
Payment pending
Show verification state
Show success before confirmation
CBT expiry
Reflect server expiry/auto-submit
Use device clock as final authority
Insufficient mastery evidence
Show insufficient evidence
Show fake 0% or inferred weakness
No recommendations
Explain evidence may be insufficient
Generate arbitrary recommendations

38. COMPREHENSIVE TEST MATRIX
Area
Tests
Welcome/Auth
Sign up, login, OTP, Google, logout, session restore, expired session
Onboarding
All 15 questions, validation, back, resume, subject rule, save failure, final submission
Diagnostic
Start, answer, next question, adaptive backend response, completion, resume
Home
Data loading, empty evidence, recommendation CTA, navigation, stale refresh
Practice
Smart/Blitz/Custom separation, routing, entitlement
Question
Selection, submission, duplicate prevention, backend correctness, accessibility
Explanation
Allowed context, AI loading, fallback, safe rendering, CBT prohibition
Smart
Backend next question, exit/resume, no fixed client length
Blitz
No setup, no speed UI, stop anytime, next question
Custom
All configuration fields, validation, backend rejection
Progress
Mastery estimate labels, coverage, trends, readiness, empty state
Recommendations
Display evidence, lifecycle events, superseded state
CBT
180/120, 40/30, timer, navigator, review, answer changes, auto-submit, two-step submit
CBT Security
No AI/hints/explanations, server time, session recovery
Profile
Preferences, logout, account state
Entitlements
Locked state, payment pending, backend confirmation
Gamification
XP/streak display, no client calculation
Responsive
Mobile/tablet/desktop
Accessibility
Keyboard, focus, semantics, color independence
Security
No secrets, route guards, safe generated content
E2E
Signup -> onboarding -> diagnostic -> home -> practice -> progress -> CBT -> results

39. FINAL GOOGLE AI STUDIO COMPLETION AUDIT
Before declaring SABI frontend complete, inspect the entire project and answer every item.

1. Can a new user go from Welcome -> Auth -> Onboarding -> Diagnostic -> Home?
2. Are all 15 onboarding questions actually implemented?
3. Does onboarding collect English + exactly three additional subjects?
4. Are confidence values stored as self-report rather than mastery?
5. Does Diagnostic use backend adaptive selection?
6. Does Home clearly present the next useful action?
7. Are Smart Practice, Blitz and Custom Practice visibly and behaviorally distinct?
8. Does Smart Practice avoid fixed client-side session length?
9. Does Blitz contain zero speed-based mechanics?
10. Does Custom Practice allow deliberate configuration?
11. Does the shared Question Experience avoid determining correctness?
12. Does Explanation use backend-authoritative answers?
13. Is AI unavailable during active CBT?
14. Is mastery clearly labelled as an estimate?
15. Are recommendations backend supplied?
16. Is CBT 180/120 for Full Mock?
17. Is CBT 40/30 for Quick Mock?
18. Is English compulsory plus three additional subjects?
19. Is CBT server-time authoritative?
20. Does CBT auto-submit on expiry?
21. Does CBT have two-step final submission?
22. Are payment/entitlement decisions backend-authoritative?
23. Are AI credits backend-authoritative?
24. Are XP values backend-authoritative?
25. Are all loading/empty/error/retry/session-expired states handled?
26. Are responsive layouts verified?
27. Are accessibility requirements verified?
28. Are analytics hooks centralized?
29. Are no privileged credentials shipped?
30. Are all OPEN decisions documented rather than silently invented?

If any answer is NO:
- identify the exact screen/component;
- identify the missing behavior;
- implement it if the source-of-truth documents already define it;
- otherwise mark the item OPEN and stop short of inventing product behavior.

Only declare frontend implementation-ready after the audit passes.
40. FINAL FRONTEND DEFINITION OF DONE
All approved primary screens exist.
Every screen has a route and explicit entry/exit behavior.
Every important button has a defined destination or backend action.
Every important asynchronous operation has loading/success/error behavior.
The exact 15 onboarding fields are implemented.
All four learning experiences remain distinct.
Question correctness remains backend-authoritative.
Mastery/readiness/recommendations remain backend-authoritative.
AI remains an explanation/coaching layer.
Active CBT is isolated from AI and practice mechanics.
Blitz has no speed-based intelligence/reward mechanics.
Payment and entitlement state remains backend-authoritative.
Responsive and accessibility requirements pass.
End-to-end user journey passes.
All unresolved decisions are explicitly marked OPEN.
Google AI Studio has not silently invented product behavior.
END OF SABI GOOGLE AI STUDIO FRONTEND IMPLEMENTATION PROMPT BOOK v2 — DETAILED SCREEN-BY-SCREEN BUILD EDITION

PART IV — TECHNICAL / BACKEND ARCHITECTURE
Source document: SABI_Technical_Implementation_Specification_v1.docx
SABI
TECHNICAL IMPLEMENTATION SPECIFICATION
Version 1.0 • September 2026
Technical blueprint for implementing SABI with Supabase/Postgres, application services, learning intelligence and AI.
1. Document Purpose
This document translates the approved SABI product architecture into a technical implementation blueprint for implementation in Google AI Studio and the connected Supabase/Postgres environment. It is a technical companion to the SABI Master Product Specification.
Locked product decisions remain authoritative. Technical parameters that have not been approved remain explicitly OPEN or PROPOSED. The document is designed to prevent the implementation environment from inventing major product or learning-system decisions.
2. Decision Language
Marker
Meaning
🔒 LOCKED
Approved decision; do not silently change.
🔵 PROPOSED
Recommended technical design pending approval where material.
🟡 OPEN
Not finalized; do not hard-code as an approved requirement.
🔴 CHANGED
Later decision replaced an earlier one; record the change.

3. System Architecture
SABI
 ├── Identity / Authentication
 ├── JAMB Configuration + Taxonomy
 ├── Question Bank + Quality
 ├── Sessions + Raw Learning Events
 ├── Mastery + Coverage
 ├── Question Selection
 ├── Recommendations
 ├── JAMB Readiness
 ├── Smart Practice / Blitz / Custom / CBT
 ├── AI Coach + RAG
 ├── Gamification
 ├── Entitlements + Payments
 ├── Notifications
 ├── Admin / Parent / School
 └── Product + Learning Analytics
             ↓
      Supabase / Postgres / pgvector
4. Core Engineering Principles
One student, one central learning state across all learning modes.
Raw events are append-only evidence; calculated state is derived separately.
Backend authoritative answer keys determine correctness.
Mastery, readiness, recommendations and question selection are deterministic in V1.
AI is downstream of deterministic evidence and explains/teaches rather than inventing state.
RAG supplies grounded knowledge; it does not calculate mastery.
Calculated states identify the algorithm version that produced them.
Historical learning evidence survives question retirement or content changes.
Recommendations map to concrete actions and are not created solely to increase engagement.
Rules/heuristics are the baseline; ML ships only if it beats the baseline.
5. Service Boundaries
Service
Responsibility
Identity
Authentication, account identity and status.
Student Profile
Onboarding profile, preferences and history.
JAMB Configuration
Subjects, combinations and exam configurations.
Taxonomy
Syllabus versions, areas, topics, subtopics, objectives and concepts.
Question Service
Questions, versions, options, provenance and status.
Session Service
Create, resume and complete learning sessions.
Event Service
Canonical immutable learning/product events.
Mastery Service
Mastery, confidence, evidence and coverage.
Selection Service
Candidate filtering and next-question ranking.
Recommendation Service
Next-best learning action and lifecycle.
Readiness Service
JAMB readiness state, bottleneck and history.
AI Service
Explanations, coaching, retrieval and model usage.
Commercial Service
Products, plans, entitlements and credits.
Payment Service
Provider transactions and confirmation.
Analytics Service
Learning/product analytics.
Admin Service
Content review, quality, audit and operations.

6. Database Contract
The following is the implementation baseline. Exact indexes, enum definitions and RLS expressions are finalized in the Foundation migration pass.
6.1 Identity
Table
Core fields
users
id, email, phone, auth_provider, status, created_at, updated_at, last_login_at
student_profiles
id, user_id, full_name, class_level, prior_jamb_attempts, years_out_of_school, target_course, target_university, exam_timeline, study_style, daily_study_dedication, study_environment, explanation_preference, language_preference, core_motivation, created_at, updated_at
student_profile_history
id, student_id, field_name, old_value, new_value, source, changed_at

6.2 JAMB and Taxonomy
Table
Core fields
subjects
id, code, name, is_active, display_order, created_at, updated_at
student_subjects
id, student_id, subject_id, is_primary_combination, is_locked, active_from, active_to, created_at
exam_configs
id, exam_type, name, version, status, duration_seconds, question_count, calculator_enabled, created_at, updated_at
exam_config_subjects
id, exam_config_id, subject_id, is_compulsory, question_count, display_order
taxonomy_versions
id, name, exam_type, version, effective_from, effective_to, status, source_reference, created_at
syllabus_areas
id, taxonomy_version_id, subject_id, name, original_wording, description, display_order, status
topics
id, syllabus_area_id, subject_id, name, original_wording, description, display_order, syllabus_reference, status
subtopics
id, topic_id, name, original_wording, description, display_order, syllabus_reference, status
learning_objectives
id, subtopic_id, name, original_wording, description, display_order, status
concepts
id, learning_objective_id, name, description, learning_objective_text, difficulty_band, status

The complete JAMB taxonomy must be derived from authoritative JAMB syllabus material. Original syllabus wording and provenance should be retained alongside normalized SABI terminology. The exact subject-by-subject taxonomy is OPEN until content review.
6.3 Questions and Quality
Table
Core fields
questions
id, subject_id, syllabus_area_id, topic_id, subtopic_id, learning_objective_id, primary_concept_id, question_type, difficulty, origin_year, origin_source, correct_answer, explanation, status, quality_status, created_at, updated_at
question_options
id, question_id, option_key, option_text, display_order
question_versions
id, question_id, version_number, question_text, options_snapshot, correct_answer, explanation, created_at, created_by
question_reports
id, question_id, student_id, session_id, report_type, description, status, created_at, resolved_at, resolved_by, resolution_note

Production questions require traceable taxonomy mapping or an explicit pending-review state.
Author difficulty and observed difficulty remain separate concepts.
Question versions preserve historical answer/explanation context.
Retired questions are not deleted when historical evidence depends on them.
AI explanations cannot override the authoritative answer key.
6.4 Learning and Events
Table
Core fields
learning_sessions
id, student_id, mode, status, started_at, ended_at, configuration, result_summary, algorithm_version, created_at, updated_at
session_questions
id, session_id, question_id, question_version_id, position, shown_at, answered_at, selected_answer, final_answer, is_correct, visited, review_flag, created_at, updated_at
learning_events
id, student_id, session_id, event_type, event_version, occurred_at, question_id, question_version_id, subject_id, syllabus_area_id, topic_id, subtopic_id, learning_objective_id, concept_id, mode, payload, created_at

Event types must distinguish learning evidence, learning interaction and product/operational events. A view, explanation open or skip is not direct mastery evidence. Answer submission, recovery performance and CBT answers are learning evidence.
6.5 Mastery, Selection, Recommendations and Readiness
Table
Core fields
mastery_states
id, student_id, entity_type, entity_id, mastery_score, confidence_score, evidence_count, unique_questions_count, unique_sessions_count, recent_accuracy, long_term_accuracy, trend, coverage_status, last_evidence_at, last_correct_at, last_incorrect_at, algorithm_version, created_at, updated_at
mastery_history
id, student_id, entity_type, entity_id, previous_mastery, new_mastery, previous_confidence, new_confidence, trigger_event_id, algorithm_version, calculated_at
recommendations
id, student_id, type, subject_id, syllabus_area_id, topic_id, subtopic_id, learning_objective_id, concept_id, reason, priority, estimated_duration, action_type, action_config, status, created_at, expires_at, updated_at
recommendation_events
id, recommendation_id, student_id, event_type, occurred_at, metadata
question_selection_logs
id, student_id, session_id, candidate_count, selected_question_id, selection_strategy, selection_reason, score, ranking_position, algorithm_version, created_at
readiness_snapshots
id, student_id, overall_state, mastery_component, coverage_component, cbt_component, confidence_component, primary_bottleneck, exam_timeline, algorithm_version, created_at

Mastery entity levels: CONCEPT, LEARNING_OBJECTIVE, SUBTOPIC, TOPIC, SYLLABUS_AREA and SUBJECT. Exact mastery formula and thresholds are OPEN pending calibration.
6.6 Gamification, AI and Knowledge
Table
Core fields
student_xp
id, student_id, total_xp, updated_at
xp_events
id, student_id, session_id, event_type, amount, source_event_id, created_at
student_streaks
id, student_id, streak_type, current_value, best_value, last_activity_date, updated_at
achievements
id, code, name, description, criteria, xp_reward, status, created_at
student_achievements
id, student_id, achievement_id, earned_at
ai_interactions
id, student_id, session_id, request_type, question_id, question_version_id, prompt_version, model, model_version, retrieval_context, response, status, latency_ms, token_usage, created_at
knowledge_documents
id, title, source, source_type, source_version, status, created_at, updated_at
knowledge_chunks
id, document_id, chunk_index, content, subject_id, topic_id, subtopic_id, learning_objective_id, concept_id, created_at
knowledge_embeddings
id, chunk_id, embedding, embedding_model, embedding_version, created_at

6.7 Commerce and Audit
Table
Core fields
products
id, name, product_type, status, metadata, created_at, updated_at
plans
id, product_id, name, billing_model, price, currency, duration, status, metadata
entitlements
id, student_id, feature, source, status, starts_at, expires_at, limits, created_at, updated_at
ai_credit_accounts
id, student_id, balance, updated_at
ai_credit_transactions
id, student_id, amount, transaction_type, reference, created_at
payment_transactions
id, student_id, provider, provider_transaction_id, product_id, plan_id, amount, currency, status, created_at, confirmed_at, metadata
audit_logs
id, actor_user_id, actor_role, action, resource_type, resource_id, before_snapshot, after_snapshot, created_at

7. Critical Constraints
users.id unique/primary key.
student_profiles.user_id unique.
student_subjects(student_id, subject_id) unique.
question_options(question_id, option_key) unique.
question_versions(question_id, version_number) unique.
mastery_states(student_id, entity_type, entity_id) unique.
payment_transactions(provider, provider_transaction_id) unique.
Historical evidence must survive question retirement.
8. Learning Event Contract
Event
Mastery evidence?
Use
question_viewed
No
Exposure/analytics
answer_selected
No direct
Interaction state
answer_submitted
Yes
Learning evidence
answer_changed
No direct
CBT behaviour signal
explanation_opened
No direct
Learning interaction
explanation_completed
No direct
Learning interaction
question_skipped
No direct
Selection/analytics context
recovery_answer_submitted
Yes
Recovery evidence
cbt_answer_submitted
Yes
Learning + exam-performance evidence
recommendation lifecycle events
No direct
Recommendation effectiveness
session_completed
No direct
Session state/analytics

Correctness is calculated by the backend from the authoritative question version. The frontend must never be trusted to declare correctness.
9. Mastery Engine
Definition: SABI's current estimate of a student's ability to correctly handle questions testing a specific syllabus learning objective under the conditions represented by available evidence.
Mastery and confidence are separate.
Evidence considers correctness, difficulty, recency, repetition, diversity, consistency, recovery performance and session diversity.
Repeated identical questions are weaker evidence than varied questions testing the same concept.
One correct answer must not cause a huge jump; one wrong answer must not destroy established mastery.
Difficulty affects evidence strength rather than acting as a simple harsh multiplier.
Recency matters; revalidation is preferred to aggressive decay.
Mastery is continuous internally and displayed in human-friendly bands externally.
V1 is deterministic/rules-based and algorithm-versioned.
AI does not directly determine mastery.
🔵 PROPOSED: bounded Bayesian/Elo-inspired update with evidence weighting, difficulty, diversity, recency, confidence and coverage. Exact formula, prior and thresholds remain OPEN.
10. Syllabus Coverage
Coverage is separate from mastery. A student may have high mastery with insufficient evidence across the syllabus, or broad exposure with weak mastery.
🔵 PROPOSED coverage states: UNSEEN → EXPOSED → INITIAL → SUFFICIENT → ESTABLISHED. Exact thresholds remain OPEN.
11. Question Selection Engine
Goal: given everything SABI knows, select the most useful next question for the current context.
Hard filters remove inactive/retired, flagged, broken, duplicate, unavailable, wrong-combination and over-exposed questions.
Selection factors: learning need, difficulty fit, syllabus value, recovery value, novelty, reinforcement, balance and overexposure control.
Low mastery + low confidence favors validation/reinforcement.
Low mastery + high confidence indicates an established weakness and can trigger remediation.
Repeated errors can reduce difficulty or trigger prerequisite/recovery questions.
Recovery should prefer a different question testing the same concept.
Cold start uses onboarding + diagnostic + heuristics; observed evidence increasingly replaces assumptions.
Selection is auditable through question_selection_logs.
🔵 PROPOSED conceptual score: Learning Need + Difficulty Fit + Syllabus Value + Recovery Value + Novelty + Reinforcement + Balance − Overexposure. Exact weights remain OPEN.
Smart Practice and Blitz share selection infrastructure but may use different weights. Blitz has a LOCKED rule: speed is not used for XP, streaks, difficulty, selection, mastery or recommendations.
12. Recommendation Engine
Inputs: learning state, mastery/confidence, recent activity, strengths/weaknesses, available study time, exam timeline and recent sessions.
Core actions: Strengthen, Learn, Review, Maintain, Challenge and Simulate.
Every recommendation has an action, target, reason, priority, estimated duration, evidence and expiry.
Missed recommendations recalculate rather than accumulating backlog.
Recommendations expire or are superseded.
Recommendation events measure effectiveness.
AI explains a structured recommendation; it does not invent it.
Recommendations should not exist solely to increase engagement.
🔵 PROPOSED priority concept: Learning Need × Evidence Confidence × Syllabus Importance × Urgency × Expected Benefit. Exact formula remains OPEN.
13. JAMB Readiness Engine
Purpose: pair student mastery with the JAMB syllabus to determine a readiness state. Readiness is not an admission decision or a guaranteed JAMB score prediction.
Core dimensions: mastery, syllabus coverage, CBT performance, confidence/evidence reliability and exam timeline.
🔵 PROPOSED states: INSUFFICIENT EVIDENCE → BUILDING → DEVELOPING → ON TRACK → STRONG. Exact thresholds remain OPEN.
Use gates plus scoring rather than a naive weighted average.
High mastery with low coverage should remain coverage-building rather than fully ready.
Identify a bottleneck: coverage, mastery, consistency, CBT performance, confidence/evidence or a specific subject/area.
Support subject-level and syllabus-area readiness.
Store readiness history.
14. Session Engine
Mode
Behavior
DIAGNOSTIC
Adaptive baseline across selected subjects; not the 180-question full mock.
SMART_PRACTICE
Adaptive SABI-selected practice; stopping logic based on learning value/session target.
BLITZ
Rapid personalized feed; no setup, no fixed length, one question at a time, stop anytime.
CUSTOM_PRACTICE
Student-controlled subject/topic/subtopic/origin/count/session settings.
CBT
Strict exam state with timer, navigator, review and submission rules.

🔵 Smart Practice stopping/session-length logic remains to be finalized during the experience implementation pass rather than inventing a fixed length.
15. CBT Engine
Full Mock: 180 questions / 120 minutes.
Quick Mock: 40 questions / 30 minutes.
English compulsory/locked plus three selected subjects.
Strict timer and navigator.
Review flag supported.
Eligible calculator where configured.
No hints, AI Coach or explanations during the exam.
Two-step submission.
Timer expiry auto-submits.
CBT score remains historical performance, not mastery.
CBT results feed evidence and recommendations after completion.
Exact subject distribution/configuration must remain driven by approved exam configuration and verified authoritative JAMB material.
16. Learning Experiences
16.1 Smart Practice
Recommendation → Smart Practice → Question Selector
→ Question → Answer → Feedback → Explanation
→ New evidence → Mastery/Coverage → Next question
→ Session result → Next action
16.2 Blitz
LOCKED flow: Question → Answer → Feedback → Learn → XP → Next. No setup, no fixed length, no speed indicator or speed-based reward/intelligence.
16.3 Custom Practice
Student deliberately chooses what to practice. Configuration includes subject, topic/subtopic, origin, question count and session settings such as instant feedback, explanation visibility, randomization and timed session where supported.
17. AI Coach + RAG
Structured student evidence + recommendation + question context
                         ↓
                      AI Service
                         ↓
                Retrieval / Knowledge
                         ↓
               Grounded explanation


AI receives structured evidence rather than inferring learning state from prose.
RAG retrieves verified relevant knowledge.
AI personalizes explanation language/style.
AI does not invent mastery, readiness, score or recommendation logic.
AI cannot override the authoritative answer key.
Fallback is required when retrieval or explanation confidence is insufficient.
Store prompt/model/retrieval/usage metadata for each interaction.
🟡 OPEN: final AI Coach prompt architecture, retrieval policy, model routing, confidence/fallback policy and prompt versions.
18. Security and RLS
Data
Student direct write?
Profile fields
Yes, validated and historized
Subject selection
Yes, backend validated
Answer interaction
Yes through approved session APIs
Question reports
Yes
Mastery
No
Readiness
No
Recommendations
No
Question correctness
No
Answer key
No
XP balance
No
Entitlement status
No
Payment confirmation
No

RLS must enforce ownership and role boundaries. Privileged service credentials remain server-side.
19. API Contract
Operation
Purpose
startSmartPractice()
Create Smart Practice session.
startBlitz()
Create Blitz session.
startCustomPractice(config)
Validate config and create session.
startDiagnostic()
Create diagnostic session.
startCBT(config)
Create CBT session.
submitAnswer()
Validate, score, record evidence and update state.
getNextQuestion()
Run selection engine.
completeSession()
Finalize session/results.
requestExplanation()
Generate grounded explanation.
getRecommendations()
Return current recommendations.
getProgress()
Return mastery/coverage/trends.
getReadiness()
Return readiness and bottleneck.

Clients must not expose direct operations such as updateMastery(), setReadiness(), setCorrectAnswer(), setXPBalance() or confirmPayment().
20. Answer Submission Flow
Authenticate user.
Validate session ownership and active state.
Validate question belongs to session.
Load authoritative question version.
Compare submitted answer with answer key.
Persist interaction.
Append learning event.
Update mastery/confidence.
Update coverage.
Recalculate/invalidate affected recommendations as required.
Return next permitted question/action or result.
21. Background Jobs
Recommendation expiry/recalculation.
Entitlement expiry.
Progress/readiness snapshots.
Analytics aggregation.
AI usage/credit reconciliation.
Question-quality processing.
Notifications.
Mastery backfills after approved algorithm changes.
Data validation/integrity checks.
Exact cadence and notification timing remain OPEN.
22. Algorithm Registry
Algorithm
Purpose
MASTERY_V1
Mastery/confidence
SELECTION_V1
Next-question selection
RECOMMENDATION_V1
Next-action ranking
READINESS_V1
JAMB readiness

23. Gamification
Correct answers earn base XP.
Incorrect answers may earn small participation XP.
Session streak = consecutive correct answers.
Daily streak belongs to broader learning system.
Milestones/badges may reward useful learning behavior and improvement.
XP is not intelligence, mastery, readiness or exam score.
XP is auditable through xp_events.
Blitz speed is explicitly excluded.
🟡 OPEN: exact XP values, badge catalogue, anti-farming thresholds and final economy.
24. Commercial / Entitlements
Direction includes Free, trial month, one-time unlock around ₦3,000–₦5,000, AI credits and school licences.
Entitlement checks are centralized.
Payment confirmation is trusted-service state.
AI credits use auditable transactions.
🟡 OPEN: exact plan matrix, limits, durations, feature gates and payment-provider implementation.
25. Parent and School Layers
Parent and school surfaces consume the same central learning engine rather than maintaining separate mastery systems.
Parent home should answer: Is my child on track?
Parent visibility focuses on activity, syllabus coverage, mastery trends, CBT performance, readiness, consistency and meaningful alerts.
Parent should not require every answer, private AI interactions or constant surveillance.
Parent-child linking uses controlled linking/approval rather than password sharing.
School architecture uses role/cohort permissions over the same evidence model.
🟡 OPEN: final parent, school and admin permission model.
26. Analytics and ML
Product analytics and learning analytics remain conceptually separate.
Learning events are the canonical evidence layer.
Recommendation effectiveness should be measured.
Question quality/performance feeds content review.
ML datasets are generated from versioned events and approved features.
Cold start uses deterministic heuristics.
ML ships only after beating the baseline under defined evaluation criteria.
🟡 OPEN: canonical event naming, warehouse strategy, feature definitions, training/evaluation architecture and model-serving boundary.
27. Testing Strategy
Unit tests for deterministic domain logic.
Integration tests for service/database behavior.
RLS ownership and privilege tests.
Session state-transition tests.
Question-selection invariant tests.
Mastery calibration using simulated student trajectories.
Recommendation consistency tests.
CBT timer/submission/expiry tests.
AI grounding/fallback tests.
Payment/entitlement idempotency tests.
End-to-end signup → onboarding → diagnostic → practice → CBT → readiness tests.
28. Implementation Order
Supabase/environment foundation.
Authentication.
Database migrations and constraints.
RLS/trusted-service boundaries.
JAMB configuration and taxonomy.
Question bank and quality pipeline.
Session engine + canonical event contract.
Mastery + coverage.
Question selection.
Recommendations.
Readiness.
Smart Practice.
Blitz.
Custom Practice.
CBT.
AI Coach + RAG.
Gamification.
Entitlements/payments/AI credits.
Notifications/background jobs.
Admin/question quality.
Analytics.
Parent/school.
Security hardening + production QA.
Frontend integration.
Calibration/pilot.
Deployment/launch.
29. Google AI Studio Implementation Rules
Treat the Master Product Specification and this document as the architecture source of truth.
Implement approved contracts before proposing improvements.
Never turn an OPEN item into an assumed requirement.
Keep trust-sensitive business logic server-side.
Version algorithms and prompts.
Create migrations before relying on schema changes.
Add tests with each major module.
Do not duplicate mastery/recommendation logic in frontend components.
Never expose privileged service credentials to the client.
Preserve raw events when algorithms change.
When a requirement is ambiguous, flag the ambiguity rather than silently inventing behavior.
30. Production Readiness Checklist
Locked product decisions represented in code.
All OPEN items resolved or explicitly configurable.
Reproducible database migrations.
RLS verified for student/parent/school/admin scenarios.
Question answer keys verified.
Taxonomy mappings reviewed.
Mastery calibrated.
Selection/recommendations audited.
CBT timer/submission tested.
AI grounding/fallback tested.
Payments/webhooks/idempotency tested.
Analytics events validated.
Backups/monitoring/logging configured.
End-to-end frontend/backend tests passing.
31. Remaining Open Technical Decisions
Exact indexes and final RLS expressions.
Complete authoritative JAMB taxonomy.
Mastery formula/confidence calculation.
Coverage thresholds.
Recommendation ranking formula.
Question ingestion/review workflow.
AI Coach prompt/system architecture.
RAG corpus/retrieval policy.
Background-job schedules.
Notification timing.
Exact entitlement matrix.
Parent/school/admin permissions.
Canonical analytics event naming.
ML training/evaluation architecture.
Offline/cache strategy.
Final XP/badge economy.
Smart Practice stopping/session-length logic.
32. Relationship to the Other SABI Documents
MASTER PRODUCT SPECIFICATION
        ↓
Product + UX + locked decisions
        ↓
TECHNICAL IMPLEMENTATION SPECIFICATION
        ↓
Database + services + events + algorithms + security
        ↓
GOOGLE AI STUDIO MASTER BUILD SPECIFICATION
        ↓
Implementation instructions and coding workflow
Any conflict must be resolved by updating the decision record before implementation.
33. Final Engineering Principle
SABI should make the student's next useful learning action feel obvious while keeping the complexity of measurement, adaptation, recommendation, question selection and data processing behind the interface.

PART V — CORE BACKEND IMPLEMENTATION
Source document: SABI_Google_AI_Studio_Backend_Implementation_Prompt_Book_v2_DETAILED_VERIFIED.docx
SABI
GOOGLE AI STUDIO BACKEND IMPLEMENTATION PROMPT BOOK
VERSION 2.0 — DEEP IMPLEMENTATION + VERIFICATION EDITION
Backend is the system of record for SABI's learning intelligence, security, question correctness, sessions, mastery, recommendations, readiness, AI orchestration, commerce and auditability.
This book converts the approved Technical Implementation Specification into execution prompts with implementation gates and proof-of-function tests.
CONTENTS
1. Purpose and source hierarchy
2. Backend constitution
3. Architecture and service boundaries
4. Database contract and invariants
5. Security / RLS / trusted-service model
6. Verification-first implementation method
7. Prompt 0 — backend master instruction
8. Prompt 1 — environment and Supabase foundation
9. Prompt 2 — migrations, constraints and indexes
10. Prompt 3 — authentication and identity
11. Prompt 4 — onboarding/profile
12. Prompt 5 — JAMB configuration and taxonomy
13. Prompt 6 — question bank and provenance
14. Prompt 7 — question quality/review pipeline
15. Prompt 8 — sessions and canonical events
16. Prompt 9 — correctness and answer-key authority
17. Prompt 10 — mastery and confidence
18. Prompt 11 — syllabus coverage
19. Prompt 12 — question selection
20. Prompt 13 — recommendations
21. Prompt 14 — readiness
22. Prompt 15 — diagnostic
23. Prompt 16 — Smart Practice
24. Prompt 17 — Blitz
25. Prompt 18 — Custom Practice
26. Prompt 19 — CBT
27. Prompt 20 — AI Coach
28. Prompt 21 — RAG/knowledge
29. Prompt 22 — AI credits and model routing
30. Prompt 23 — gamification
31. Prompt 24 — entitlements and commerce
32. Prompt 25 — payments/webhooks/idempotency
33. Prompt 26 — notifications/background jobs
34. Prompt 27 — admin/question operations
35. Prompt 28 — analytics and event pipeline
36. Prompt 29 — parent/school architecture
37. Prompt 30 — observability/audit/recovery
38. Prompt 31 — security hardening
39. Prompt 32 — test harness and simulated students
40. Prompt 33 — integration/E2E
41. Prompt 34 — calibration and pilot
42. Prompt 35 — production readiness and deployment
43. Verification evidence standard
44. Final backend audit
1. SOURCE-OF-TRUTH HIERARCHY
This book is derived from the approved SABI Technical Implementation Specification and the existing SABI product decisions. It does not replace them.
SABI Master Product Specification — product truth.
SABI Technical Implementation Specification — backend architecture and contract truth.
SABI AI + RAG Implementation Specification — AI/RAG boundary truth.
SABI QA, Testing & Deployment Specification — quality/deployment truth.
This Prompt Book — execution instructions and verification workflow.
Any conflict must be recorded rather than silently resolved.
2. DECISION LANGUAGE
Marker
Meaning
Backend behavior
🔒 LOCKED
Approved
Implement exactly.
🔵 PROPOSED
Recommended technical treatment
Use only when implementation needs a concrete mechanism; keep replaceable.
🟡 OPEN
Not finalized
Do not silently hard-code as product truth.
🔴 CHANGED
Later decision replaced earlier one
Use latest decision.

3. BACKEND CONSTITUTION — NON-NEGOTIABLE
One student has one central learning state across all learning modes.
Raw learning events are append-only evidence. Calculated state is derived separately.
Backend answer keys determine correctness.
Frontend correctness claims are never trusted.
Mastery, readiness, recommendations and question selection are deterministic/rules-based in V1.
AI is downstream of deterministic evidence. AI explains/teaches; it does not invent learning state.
RAG supplies grounded knowledge; it does not calculate mastery.
Every calculated state records the algorithm version that produced it.
Historical evidence must survive question retirement/content changes.
Recommendations must map to concrete learning actions, not engagement alone.
Rules/heuristics are the baseline; ML ships only if it demonstrably beats the baseline under an approved evaluation protocol.
All critical mutations must be authorization-checked server-side.
Idempotency must protect payment/webhook and other retry-prone external operations.
Every major module must ship with automated tests and a verification report.
Never declare a subsystem functional merely because it compiles.
4. SERVICE BOUNDARIES
Service
Responsibility
Identity
Authentication, account identity/status
Student Profile
Onboarding profile, preferences, profile history
JAMB Configuration
Subjects, combinations, exam configurations
Taxonomy
Syllabus versions, areas, topics, subtopics, objectives, concepts
Question
Questions, versions, options, provenance/status
Session
Create/resume/complete learning sessions
Event
Canonical immutable learning/product events
Mastery
Mastery, confidence, evidence, coverage
Selection
Candidate filtering and next-question ranking
Recommendation
Next-best learning action and lifecycle
Readiness
JAMB readiness state, bottleneck and history
AI
Explanations, coaching, retrieval, model usage
Commercial
Products, plans, entitlements, credits
Payment
Provider transactions and confirmation
Analytics
Product/learning analytics
Admin
Content review, quality, audit, operations

5. COMPLETE DATABASE CONTRACT
The following baseline is taken from the technical specification. Exact indexes, enum definitions and final RLS expressions are finalized during the foundation migration pass. Do not silently invent missing product semantics.
Table
Core fields
users
id, email, phone, auth_provider, status, created_at, updated_at, last_login_at
student_profiles
id, user_id, full_name, class_level, prior_jamb_attempts, years_out_of_school, target_course, target_university, exam_timeline, study_style, daily_study_dedication, study_environment, explanation_preference, language_preference, core_motivation, created_at, updated_at
student_profile_history
id, student_id, field_name, old_value, new_value, source, changed_at
subjects
id, code, name, is_active, display_order, created_at, updated_at
student_subjects
id, student_id, subject_id, is_primary_combination, is_locked, active_from, active_to, created_at
exam_configs
id, exam_type, name, version, status, duration_seconds, question_count, calculator_enabled, created_at, updated_at
exam_config_subjects
id, exam_config_id, subject_id, is_compulsory, question_count, display_order
taxonomy_versions
id, name, exam_type, version, effective_from, effective_to, status, source_reference, created_at
syllabus_areas
id, taxonomy_version_id, subject_id, name, original_wording, description, display_order, status
topics
id, syllabus_area_id, subject_id, name, original_wording, description, display_order, syllabus_reference, status
subtopics
id, topic_id, name, original_wording, description, display_order, syllabus_reference, status
learning_objectives
id, subtopic_id, name, original_wording, description, display_order, status
concepts
id, learning_objective_id, name, description, learning_objective_text, difficulty_band, status
questions
id, subject_id, syllabus_area_id, topic_id, subtopic_id, learning_objective_id, primary_concept_id, question_type, difficulty, origin_year, origin_source, correct_answer, explanation, status, quality_status, created_at, updated_at
question_options
id, question_id, option_key, option_text, display_order
question_versions
id, question_id, version_number, question_text, options_snapshot, correct_answer, explanation, created_at, created_by
question_reports
id, question_id, student_id, session_id, report_type, description, status, created_at, resolved_at, resolved_by, resolution_note
learning_sessions
id, student_id, mode, status, started_at, ended_at, configuration, result_summary, algorithm_version, created_at, updated_at
session_questions
id, session_id, question_id, question_version_id, position, shown_at, answered_at, selected_answer, final_answer, is_correct, visited, review_flag, created_at, updated_at
learning_events
id, student_id, session_id, event_type, event_version, occurred_at, question_id, question_version_id, subject_id, syllabus_area_id, topic_id, subtopic_id, learning_objective_id, concept_id, mode, payload, created_at
mastery_states
id, student_id, entity_type, entity_id, mastery_score, confidence_score, evidence_count, unique_questions_count, unique_sessions_count, recent_accuracy, long_term_accuracy, trend, coverage_status, last_evidence_at, last_correct_at, last_incorrect_at, algorithm_version, created_at, updated_at
mastery_history
id, student_id, entity_type, entity_id, previous_mastery, new_mastery, previous_confidence, new_confidence, trigger_event_id, algorithm_version, calculated_at
recommendations
id, student_id, type, subject_id, syllabus_area_id, topic_id, subtopic_id, learning_objective_id, concept_id, reason, priority, estimated_duration, action_type, action_config, status, created_at, expires_at, updated_at
recommendation_events
id, recommendation_id, student_id, event_type, occurred_at, metadata
question_selection_logs
id, student_id, session_id, candidate_count, selected_question_id, selection_strategy, selection_reason, score, ranking_position, algorithm_version, created_at
readiness_snapshots
id, student_id, overall_state, mastery_component, coverage_component, cbt_component, confidence_component, primary_bottleneck, exam_timeline, algorithm_version, created_at
student_xp
id, student_id, total_xp, updated_at
xp_events
id, student_id, session_id, event_type, amount, source_event_id, created_at
student_streaks
id, student_id, streak_type, current_value, best_value, last_activity_date, updated_at
achievements
id, code, name, description, criteria, xp_reward, status, created_at
student_achievements
id, student_id, achievement_id, earned_at
ai_interactions
id, student_id, session_id, request_type, question_id, question_version_id, prompt_version, model, model_version, retrieval_context, response, status, latency_ms, token_usage, created_at
knowledge_documents
id, title, source, source_type, source_version, status, created_at, updated_at
knowledge_chunks
id, document_id, chunk_index, content, subject_id, topic_id, subtopic_id, learning_objective_id, concept_id, created_at
knowledge_embeddings
id, chunk_id, embedding, embedding_model, embedding_version, created_at
products
id, name, product_type, status, metadata, created_at, updated_at
plans
id, product_id, name, billing_model, price, currency, duration, status, metadata
entitlements
id, student_id, feature, source, status, starts_at, expires_at, limits, created_at, updated_at
ai_credit_accounts
id, student_id, balance, updated_at
ai_credit_transactions
id, student_id, amount, transaction_type, reference, created_at
payment_transactions
id, student_id, provider, provider_transaction_id, product_id, plan_id, amount, currency, status, created_at, confirmed_at, metadata
audit_logs
id, actor_user_id, actor_role, action, resource_type, resource_id, before_snapshot, after_snapshot, created_at

5.1 CRITICAL CONSTRAINTS
users.id unique/primary key.
student_profiles.user_id unique.
student_subjects(student_id, subject_id) unique.
question_options(question_id, option_key) unique.
question_versions(question_id, version_number) unique.
mastery_states(student_id, entity_type, entity_id) unique.
payment_transactions(provider, provider_transaction_id) unique.
Historical evidence must survive question retirement.
PROMPT 0 — Backend Master Build Instruction
PURPOSE: Establish verification-first execution for the entire backend.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Backend Master Build Instruction subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- Backend is authoritative for correctness, learning state, recommendations, question selection, readiness, entitlements and payment confirmation.
- Raw events are immutable evidence; calculated state is derived.
- V1 intelligence is deterministic/rules-based.
- AI cannot directly set mastery/readiness/recommendation/selection/correctness.
- Algorithms and prompts are versioned.
- Historical evidence survives content retirement.

IMPLEMENTATION:
Create/confirm a modular backend architecture around Supabase/Postgres and the approved service boundaries.

For every subsystem:
- implement;
- write automated tests;
- run migrations;
- run unit/integration/security tests;
- verify expected DB rows/state transitions;
- test failure paths;
- produce machine-readable or structured verification output where practical.

Create a repeatable verification command or test suite that can be run after any prompt.

Do not treat compilation as functional verification.

CONTRACTS / BOUNDARIES:
Supabase/Postgres; server-side service layer; approved table contracts; versioned algorithms; RLS/trusted service boundaries.

VERIFICATION:
Repository inspection; baseline test suite; migration dry run; test database reset/replay; service smoke tests.

MANDATORY COMPLETION GATE:
['A repeatable test/verification harness exists.', 'Baseline build passes.', 'Baseline tests pass or existing failures are documented.', 'No privileged secrets are exposed.', 'Every subsequent prompt has a place to add tests.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
A repeatable test/verification harness exists.
Baseline build passes.
Baseline tests pass or existing failures are documented.
No privileged secrets are exposed.
Every subsequent prompt has a place to add tests.
OPEN items
🟡 Exact CI provider and final test-reporting format.
PROMPT 1 — Supabase / Environment Foundation
PURPOSE: Make environments reproducible and safe.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Supabase / Environment Foundation subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- Production and development credentials must be separated.
- Privileged credentials remain server-side.
- Migrations are reproducible.

IMPLEMENTATION:
Implement environment configuration, Supabase client separation, server/trusted-service client, migration tooling, seed tooling, test database strategy, environment validation and secret checks.

Create explicit configuration validation that fails fast when required variables are absent.

Ensure test/seed commands cannot accidentally point at production.

Add migration status checking and schema drift detection where practical.

CONTRACTS / BOUNDARIES:
Environment variables; Supabase URL/anon key for client-safe usage; privileged server credential only in trusted server context.

VERIFICATION:
Config validation; wrong-environment protection; migration apply/reset; schema smoke test; secret scanning.

MANDATORY COMPLETION GATE:
['Fresh environment can be initialized from migrations.', 'Test environment is isolated.', 'Missing configuration fails clearly.', 'Privileged key never reaches client bundle.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
Fresh environment can be initialized from migrations.
Test environment is isolated.
Missing configuration fails clearly.
Privileged key never reaches client bundle.
OPEN items
🟡 Exact hosting/CI provider.
PROMPT 2 — Database Migrations, Constraints, Indexes & Data Integrity
PURPOSE: Create the durable database foundation.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Database Migrations, Constraints, Indexes & Data Integrity subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- Implement all approved baseline tables and critical constraints.
- Use migrations, not manual production edits.
- Do not silently invent business enums.

IMPLEMENTATION:
Implement the baseline schema from the technical specification.

For every table:
- primary key;
- foreign keys where relationship is authoritative;
- timestamps;
- appropriate nullability;
- unique constraints;
- check constraints only where semantics are locked;
- indexes required by access patterns;
- safe migration ordering.

Implement critical uniqueness constraints exactly.

Add integrity tests for orphan prevention, duplicate prevention, invalid references, version uniqueness and historical evidence retention.

Do not delete historical question/session evidence when content becomes retired.

CONTRACTS / BOUNDARIES:
Tables listed in the database contract; critical constraints; foreign-key relationships; algorithm_version fields.

VERIFICATION:
Migration from empty DB; migration from populated fixture; rollback strategy if supported; duplicate insert tests; FK tests; retirement/history test; index query smoke tests.

MANDATORY COMPLETION GATE:
['Fresh DB migration passes.', 'Replayed migrations are safe/idempotent according to migration tooling.', 'Critical constraints are enforced by DB.', 'Historical records survive content retirement.', 'No application-only uniqueness where DB uniqueness is required.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
Fresh DB migration passes.
Replayed migrations are safe/idempotent according to migration tooling.
Critical constraints are enforced by DB.
Historical records survive content retirement.
No application-only uniqueness where DB uniqueness is required.
OPEN items
🟡 Exact final index set; exact enum values where not yet locked.
PROMPT 3 — Authentication & Identity
PURPOSE: Implement trusted identity mapping.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Authentication & Identity subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- Supabase Auth is intended.
- Account identity is distinct from learning profile.
- Authenticated identity determines student ownership.

IMPLEMENTATION:
Implement user/account synchronization and trusted identity lookup.

Support approved auth providers without duplicating password/OTP logic unnecessarily.

On authenticated request:
- derive user identity from trusted auth context;
- load user record;
- resolve student profile when applicable;
- reject mismatched or missing ownership safely.

Update last_login_at through trusted backend flow.

Prevent users from supplying another student's ID to read/write data.

CONTRACTS / BOUNDARIES:
users; student_profiles; auth context; ownership checks.

VERIFICATION:
Cross-user read/write tests; unauthenticated tests; deleted/disabled account tests; identity/profile mismatch tests; session refresh.

MANDATORY COMPLETION GATE:
['Student A cannot read/write Student B data.', 'Identity is derived from auth context, not request body.', 'Auth state is synchronized safely.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
Student A cannot read/write Student B data.
Identity is derived from auth context, not request body.
Auth state is synchronized safely.
PROMPT 4 — Onboarding Profile & Profile History
PURPOSE: Persist the approved 15 onboarding fields and profile history.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Onboarding Profile & Profile History subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- The 15 onboarding fields are self-reported context, not observed mastery.
- English is compulsory plus exactly three additional JAMB subjects.
- Profile history is preserved.

IMPLEMENTATION:
Implement profile persistence for:
1 full_name
2 subject combination
3 class/status + years out of school where applicable
4 target course/university
5 exam timeline
6 confidence 1-5 per selected subject
7 weakest/priority subject
8 root cause
9 specific trouble topic
10 study style
11 daily study dedication
12 study environment
13 explanation preference
14 language style
15 core motivation

Validate required fields and subject count server-side.

Persist profile changes in student_profile_history.

Do not create mastery evidence from onboarding confidence.

Ensure onboarding completion state can be determined safely.

CONTRACTS / BOUNDARIES:
student_profiles; student_subjects; student_profile_history; backend validation.

VERIFICATION:
Exact 15-field validation; subject combination rejection; profile history diff; ownership tests; duplicate subject tests; partial-save/resume tests.

MANDATORY COMPLETION GATE:
['All 15 fields persist correctly.', 'Invalid combinations are rejected server-side.', 'Profile history records changes.', 'No onboarding field directly writes mastery evidence.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
All 15 fields persist correctly.
Invalid combinations are rejected server-side.
Profile history records changes.
No onboarding field directly writes mastery evidence.
PROMPT 5 — JAMB Configuration & Taxonomy
PURPOSE: Create the authoritative content hierarchy used by all learning engines.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the JAMB Configuration & Taxonomy subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- Taxonomy must derive from authoritative JAMB syllabus material.
- Original wording and provenance are retained.
- SABI normalized terminology may coexist with source wording.
- Taxonomy is versioned.

IMPLEMENTATION:
Implement subjects, exam configurations, exam-config subjects, taxonomy versions, syllabus areas, topics, subtopics, learning objectives and concepts.

Create explicit taxonomy versioning and effective dates.

Every content item used in production must reference the correct active taxonomy version or an explicit pending-review state.

Do not invent the complete subject-by-subject taxonomy. Build the ingestion/import mechanism so authoritative reviewed data can populate it.

Ensure parent-child relationships are valid.

CONTRACTS / BOUNDARIES:
subjects; exam_configs; exam_config_subjects; taxonomy_versions; syllabus_areas; topics; subtopics; learning_objectives; concepts.

VERIFICATION:
Hierarchy integrity tests; version activation tests; effective-date tests; subject mapping tests; orphan tests; duplicate-name/source-reference tests.

MANDATORY COMPLETION GATE:
['Taxonomy can be loaded from reviewed source data.', 'Only approved active taxonomy can feed production selection.', 'Version changes do not destroy historical references.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
Taxonomy can be loaded from reviewed source data.
Only approved active taxonomy can feed production selection.
Version changes do not destroy historical references.
OPEN items
🟡 Complete authoritative subject-by-subject taxonomy content.
🟡 Exact CBT subject distribution.
PROMPT 6 — Question Bank, Versions & Provenance
PURPOSE: Make questions a trustworthy production asset.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Question Bank, Versions & Provenance subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- Production questions require traceable taxonomy mapping or explicit pending-review state.
- Question versions preserve historical answer/explanation context.
- Retired questions are not deleted when historical evidence depends on them.
- Author difficulty and observed difficulty are separate.

IMPLEMENTATION:
Implement question CRUD/service boundaries, options, versions, provenance, status and quality status.

A production-eligible question must have:
- valid subject;
- valid taxonomy mapping or approved pending state rules;
- authoritative answer;
- valid options;
- provenance/origin metadata;
- quality status suitable for the requested use.

When a question changes:
- create a new version;
- preserve prior version;
- preserve historical session_questions references.

Never mutate an old version in a way that changes historical answer interpretation.

CONTRACTS / BOUNDARIES:
questions; question_options; question_versions; question_reports.

VERIFICATION:
Version immutability tests; duplicate option key tests; missing answer tests; invalid taxonomy tests; retirement tests; historical session version test.

MANDATORY COMPLETION GATE:
['Historical session can still resolve the exact question version used.', 'Current question can be retired without deleting evidence.', 'Answer key is server-owned.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
Historical session can still resolve the exact question version used.
Current question can be retired without deleting evidence.
Answer key is server-owned.
PROMPT 7 — Question Quality & Review Pipeline
PURPOSE: Prevent unreviewed/broken content from silently entering production.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Question Quality & Review Pipeline subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- Question quality is a first-class backend concern.
- Reports are auditable.
- Production eligibility is status-controlled.

IMPLEMENTATION:
Implement content-review states and question reports.

Support:
- submitted/drafted;
- taxonomy review;
- answer verification;
- explanation review;
- difficulty review;
- approved;
- rejected;
- retired;
or the equivalent approved workflow without silently inventing product states.

Add validation jobs/checks for:
- missing options;
- duplicate options;
- ambiguous answer;
- invalid taxonomy;
- malformed explanation;
- duplicate/near-duplicate question where detection is available;
- provenance gaps.

Ensure only approved content enters production selection unless an explicit diagnostic/preview state permits otherwise.

CONTRACTS / BOUNDARIES:
questions.quality_status; question_reports; admin/trusted service boundaries.

VERIFICATION:
Bad-content rejection tests; approval transition tests; unauthorized approval tests; report lifecycle tests; selection excludes unapproved content.

MANDATORY COMPLETION GATE:
['Unapproved questions cannot appear in production learning sessions.', 'Every review transition is auditable.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
Unapproved questions cannot appear in production learning sessions.
Every review transition is auditable.
PROMPT 8 — Session Engine & Canonical Learning Events
PURPOSE: Create the immutable evidence layer and session state machine.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Session Engine & Canonical Learning Events subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- Events are append-only evidence.
- Session state is backend-authoritative.
- Views/explanation opens/skips are not direct mastery evidence.
- Answer submissions are evidence.

IMPLEMENTATION:
Implement learning_sessions, session_questions and learning_events.

Supported event semantics:
question_viewed = no mastery
answer_selected = no direct mastery
answer_submitted = learning evidence
answer_changed = CBT behavior signal, no direct mastery by itself
explanation_opened = no direct mastery
explanation_completed = no direct mastery
question_skipped = no direct mastery
recovery_answer_submitted = recovery evidence
cbt_answer_submitted = learning + exam-performance evidence
recommendation lifecycle = effectiveness/product event
session_completed = session state/analytics, not direct mastery

Make event records immutable after creation except explicitly approved operational metadata.

Ensure session_questions captures the question version shown.

CONTRACTS / BOUNDARIES:
learning_sessions; session_questions; learning_events; event_version; question_version_id.

VERIFICATION:
Event immutability; duplicate event handling; session state transition tests; question-version consistency; event ownership tests; replay fixture tests.

MANDATORY COMPLETION GATE:
['Events can be replayed to reconstruct evidence.', 'A session references exact question versions.', 'Client cannot forge student ownership.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
Events can be replayed to reconstruct evidence.
A session references exact question versions.
Client cannot forge student ownership.
PROMPT 9 — Authoritative Correctness Engine
PURPOSE: Make answer grading deterministic and server-authoritative.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Authoritative Correctness Engine subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- Correctness is calculated from authoritative question version.
- Frontend is never trusted to declare correctness.

IMPLEMENTATION:
Implement one authoritative grading path.

Input:
- session;
- question version;
- submitted answer.

Resolve the exact question version attached to session_questions.
Compare submitted answer with authoritative correct_answer.
Persist final_answer and is_correct through trusted backend logic.
Emit appropriate learning evidence event.
Prevent grading against a newer question version than the one shown.

Handle invalid option keys, duplicate submissions, changed answers and recovery answers according to mode semantics.

CONTRACTS / BOUNDARIES:
question_versions.correct_answer; session_questions.question_version_id; answer_submitted/cbt_answer_submitted/recovery events.

VERIFICATION:
Correct/incorrect tests; tampered answer-key request; wrong version test; invalid option test; duplicate submission test; CBT answer-change test.

MANDATORY COMPLETION GATE:
['No client-supplied correctness is accepted.', 'Historical question version determines grading.', 'Tests prove tampering cannot alter correctness.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
No client-supplied correctness is accepted.
Historical question version determines grading.
Tests prove tampering cannot alter correctness.
PROMPT 10 — Mastery & Confidence Engine
PURPOSE: Build the deterministic V1 mastery state engine with calibration hooks.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Mastery & Confidence Engine subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- Mastery and confidence are separate.
- Evidence includes correctness, difficulty, recency, repetition, diversity, consistency, recovery and session diversity.
- Repeated identical questions are weaker evidence.
- One correct answer cannot cause a huge jump.
- One wrong answer cannot destroy established mastery.
- Difficulty affects evidence strength.
- Recency matters; prefer revalidation over aggressive decay.
- V1 is deterministic and versioned.
- AI does not determine mastery.

IMPLEMENTATION:
Implement mastery_states and mastery_history.

Support mastery at:
CONCEPT
LEARNING_OBJECTIVE
SUBTOPIC
TOPIC
SYLLABUS_AREA
SUBJECT

Create a versioned deterministic update interface so the exact formula can be calibrated without rewriting event storage.

Use evidence features defined by the specification.

Implement parent-level aggregation consistently from lower-level evidence or an explicitly versioned aggregation method.

Every state update writes history with trigger_event_id and algorithm_version.

Do not let onboarding confidence become mastery.

Do not let explanation text change mastery directly.

CONTRACTS / BOUNDARIES:
mastery_states; mastery_history; MASTERY_V1 registry entry; learning_events.

VERIFICATION:
Simulated trajectories; single-correct jump bound; single-wrong resilience; repeated-identical weighting; varied-question evidence; recency; recovery; session diversity; confidence independence; deterministic replay.

MANDATORY COMPLETION GATE:
['Same evidence produces same result under same algorithm version.', 'History records every state change.', 'Algorithm version is stored.', 'Calibration fixtures expose unreasonable trajectories rather than hiding them.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
Same evidence produces same result under same algorithm version.
History records every state change.
Algorithm version is stored.
Calibration fixtures expose unreasonable trajectories rather than hiding them.
OPEN items
🟡 Exact mastery formula, priors and thresholds remain OPEN until calibration.
PROMPT 11 — Syllabus Coverage Engine
PURPOSE: Track exposure/coverage independently from mastery.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Syllabus Coverage Engine subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- Coverage is separate from mastery.
- Coverage is based on syllabus evidence, not just mastery score.

IMPLEMENTATION:
Implement coverage state tracking across the syllabus hierarchy.

Use a versioned coverage model capable of states such as:
UNSEEN -> EXPOSED -> INITIAL -> SUFFICIENT -> ESTABLISHED
only when approved/calibrated.

Coverage should account for meaningful evidence and question diversity, not merely one page view.

Preserve coverage history when taxonomy versions change.

CONTRACTS / BOUNDARIES:
mastery_states.coverage_status; taxonomy hierarchy; learning events.

VERIFICATION:
Cold-start coverage; one exposure; repeated same question; varied questions; cross-session evidence; taxonomy version change.

MANDATORY COMPLETION GATE:
['Coverage does not falsely equal mastery.', 'Coverage history remains interpretable after content changes.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
Coverage does not falsely equal mastery.
Coverage history remains interpretable after content changes.
OPEN items
🟡 Exact coverage thresholds are OPEN.
PROMPT 12 — Question Selection Engine
PURPOSE: Select the next most useful question deterministically and audibly.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Question Selection Engine subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- Goal is next most useful question.
- Hard filters exclude inactive/retired/flagged/broken/duplicate/unavailable/wrong-combination/overexposed content.
- Cold start uses deterministic onboarding/diagnostic/heuristics.
- Selection is auditable.
- Blitz speed is excluded.

IMPLEMENTATION:
Implement candidate generation, hard filtering, scoring/ranking and selection logging.

Candidate factors:
- learning need
- difficulty fit
- syllabus value
- recovery value
- novelty
- reinforcement
- balance
- overexposure penalty

Support different mode-specific weights where approved:
Smart Practice
Blitz
Diagnostic
Custom (student constraints dominate)
CBT fixed set

Implement recovery selection for repeated errors using a different question testing the same concept where possible.

Store question_selection_logs with candidate_count, selected question, reason, score, ranking and algorithm_version.

CONTRACTS / BOUNDARIES:
question_selection_logs; mastery/coverage; question metadata; session history.

VERIFICATION:
Hard-filter tests; deterministic ranking; recovery after error; low-mastery/high-confidence remediation; high-mastery/low-coverage behavior; overexposure; no duplicate; Blitz no speed feature; cold start.

MANDATORY COMPLETION GATE:
['Every production selection is explainable from logged factors.', 'Same state/version gives deterministic result.', 'No invalid/unapproved question is selected.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
Every production selection is explainable from logged factors.
Same state/version gives deterministic result.
No invalid/unapproved question is selected.
OPEN items
🟡 Exact weights and final formula remain OPEN pending calibration.
PROMPT 13 — Recommendation Engine
PURPOSE: Produce concrete next-best learning actions.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Recommendation Engine subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- Recommendations use learning state, recent activity, exam timeline and evidence.
- Every recommendation has action, target, reason, priority, duration, evidence and expiry.
- Missed recommendations recalculate rather than becoming a backlog.
- AI explains but does not invent recommendations.

IMPLEMENTATION:
Implement recommendation generation, ranking, lifecycle and effectiveness events.

Actions:
Strengthen
Learn
Review
Maintain
Challenge
Simulate

Recommendation should target a subject/area/topic/objective/concept where appropriate.

Store evidence/context sufficient to audit why it was produced.

Implement expiry/supersession and recalculation.

Use versioned RECOMMENDATION_V1.

CONTRACTS / BOUNDARIES:
recommendations; recommendation_events; mastery; coverage; profile; readiness inputs.

VERIFICATION:
Consistency tests; no backlog accumulation; expiry; supersession; evidence mapping; cold-start recommendation; no recommendation with insufficient evidence unless explicitly supported.

MANDATORY COMPLETION GATE:
['Every recommendation has a concrete action and target.', 'Lifecycle is auditable.', 'Same state/version yields deterministic recommendation output.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
Every recommendation has a concrete action and target.
Lifecycle is auditable.
Same state/version yields deterministic recommendation output.
OPEN items
🟡 Exact priority formula/weights remain OPEN.
PROMPT 14 — JAMB Readiness Engine
PURPOSE: Pair mastery with syllabus coverage, CBT performance, confidence/evidence reliability and timeline.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the JAMB Readiness Engine subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- Readiness is not admission prediction.
- Readiness is not guaranteed JAMB score prediction.
- Use gates plus scoring, not naive averaging.
- High mastery with low coverage remains coverage-building.
- Store history.
- Identify primary bottleneck.

IMPLEMENTATION:
Implement readiness snapshots and versioned READINESS_V1.

Inputs:
- mastery
- syllabus coverage
- CBT performance
- confidence/evidence reliability
- exam timeline

Outputs:
- overall state
- component values
- primary bottleneck
- subject/area readiness where supported
- algorithm_version

Do not infer admission outcome.

CONTRACTS / BOUNDARIES:
readiness_snapshots; mastery; coverage; CBT results; profile timeline.

VERIFICATION:
Insufficient evidence; high mastery/low coverage; low mastery/high coverage; strong CBT/weak learning evidence; timeline urgency; subject bottleneck; deterministic replay.

MANDATORY COMPLETION GATE:
['Readiness never becomes an admission prediction.', 'Snapshot history is preserved.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
Readiness never becomes an admission prediction.
Snapshot history is preserved.
OPEN items
🟡 Exact states/thresholds remain OPEN pending calibration.
PROMPT 15 — Diagnostic Session Engine
PURPOSE: Implement adaptive baseline sessions.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Diagnostic Session Engine subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- Diagnostic is adaptive.
- Not the 180-question Full Mock.
- Observed performance becomes evidence.

IMPLEMENTATION:
Create diagnostic sessions using selection infrastructure with diagnostic-specific strategy.

Ensure:
- selected subjects are valid;
- questions span relevant areas;
- difficulty is mixed;
- no arbitrary frontend-defined fixed length;
- each answer is graded through authoritative correctness;
- evidence updates after answer submissions;
- completion produces baseline state/recommendations.

Diagnostic should not contaminate historical CBT performance metrics.

CONTRACTS / BOUNDARIES:
Session engine; selection; correctness; mastery; coverage.

VERIFICATION:
Cold start; mixed subjects; answer sequence; adaptive difficulty; completion; interrupted session; resume; evidence update.

MANDATORY COMPLETION GATE:
['Diagnostic produces observed evidence and baseline state.', 'It is not stored as a CBT exam.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
Diagnostic produces observed evidence and baseline state.
It is not stored as a CBT exam.
PROMPT 16 — Smart Practice Engine
PURPOSE: Implement adaptive learning sessions driven by evidence.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Smart Practice Engine subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- Minimal setup.
- Backend selects target and next question.
- Stopping/session-length logic is OPEN.
- Session state preserved.

IMPLEMENTATION:
Implement Smart Practice orchestration:
recommendation context -> selector -> question -> answer -> evidence -> mastery/coverage -> next selection -> result.

Refresh evidence after meaningful submissions.
Avoid fixed question count in code.
Allow configurable stopping policy interface.

Store algorithm versions for selection/mastery/recommendation interactions.

CONTRACTS / BOUNDARIES:
Recommendation; selection; session; event; mastery; coverage.

VERIFICATION:
Sequence adaptation after correct/wrong; recovery; exit/resume; no candidate available; session completion; deterministic replay.

MANDATORY COMPLETION GATE:
['Smart Practice adapts from backend evidence and can be audited.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
Smart Practice adapts from backend evidence and can be audited.
PROMPT 17 — Blitz Engine
PURPOSE: Implement rapid personalized practice without speed mechanics.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Blitz Engine subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- No setup.
- No fixed session length.
- One question at a time.
- Stop anytime.
- Speed is not a signal.

IMPLEMENTATION:
Implement Blitz using the shared session/event/selection infrastructure but with Blitz-specific selection configuration.

Explicitly exclude response time from:
- selection;
- XP;
- mastery;
- recommendation;
- difficulty;
- streak/reward logic.

Allow stop/end at any time.
No timer required for speed.

CONTRACTS / BOUNDARIES:
Blitz session mode; selection strategy; event contract; gamification exclusions.

VERIFICATION:
Search code/tests for response-time dependencies; property tests proving speed is not an input; stop session; next question; repeat.

MANDATORY COMPLETION GATE:
['Blitz has zero speed-based intelligence/reward logic.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
Blitz has zero speed-based intelligence/reward logic.
PROMPT 18 — Custom Practice Engine
PURPOSE: Implement student-controlled practice while preserving backend authority.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Custom Practice Engine subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- Student controls approved configuration.
- Backend validates configuration.
- Custom remains distinct from Smart.

IMPLEMENTATION:
Validate:
subject
topic/subtopic
origin
question count
instant feedback
explanation visibility
randomization
timed session where supported.

Backend creates a session with immutable configuration snapshot.

Question selection must honor hard student filters before ranking.

CONTRACTS / BOUNDARIES:
learning_sessions.configuration; taxonomy; question filters; entitlement checks.

VERIFICATION:
Invalid config; unauthorized origin; unavailable topic; count limits; randomization; timed mode; configuration immutability.

MANDATORY COMPLETION GATE:
['Session uses the exact approved configuration snapshot.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
Session uses the exact approved configuration snapshot.
PROMPT 19 — CBT Exam Engine
PURPOSE: Implement strict JAMB simulation server-side.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the CBT Exam Engine subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- Full Mock 180/120.
- Quick Mock 40/30.
- English compulsory + 3 subjects.
- Fixed question set once started.
- Server timer authoritative.
- No AI/hints/explanations.
- Review flag.
- Eligible calculator where configured.
- Two-step submission.
- Expiry auto-submit.
- CBT score is historical performance, not mastery.

IMPLEMENTATION:
Implement CBT configuration validation, fixed question-set generation, timer state, navigator state, review flags, answer changes, two-step submission and expiry.

When CBT starts:
- validate subject combination;
- resolve approved exam config;
- select and freeze question set;
- snapshot question versions;
- create session;
- establish server start/end times.

Never allow question selection to change after exam begins.

On answer:
- persist answer;
- support answer change;
- emit CBT evidence according to event contract.

On expiry:
- backend determines expiry;
- auto-submit/finalize;
- produce result.

Do not call AI during active CBT.

CONTRACTS / BOUNDARIES:
exam_configs; exam_config_subjects; sessions; session_questions; CBT events; server timestamps.

VERIFICATION:
180/120 invariant; 40/30 invariant; subject config; timer manipulation; refresh; reconnect; answer change; review; duplicate submission; two-step submission; expiry race; concurrent submission; fixed question set.

MANDATORY COMPLETION GATE:
['CBT remains correct under refresh, slow network, duplicate requests and timer races.', 'Exam cannot be changed after start.', 'Results are finalized exactly once.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
CBT remains correct under refresh, slow network, duplicate requests and timer races.
Exam cannot be changed after start.
Results are finalized exactly once.
PROMPT 20 — AI Coach Service
PURPOSE: Provide grounded explanations and coaching without allowing AI to become the learning engine.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the AI Coach Service subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- AI receives structured evidence.
- AI explains/teaches.
- AI does not determine mastery/readiness/coverage/recommendation/selection/correctness.
- AI cannot override answer key.
- Fallback required.

IMPLEMENTATION:
Implement an AI service boundary with structured request/response contracts.

Request may include:
- question context;
- authoritative answer/result;
- relevant student evidence;
- recommendation context;
- explanation/language preference;
- retrieved knowledge.

Response should be structured and auditable.

Store:
student/session
request type
question/version
prompt version
model/version
retrieval context
response
status
latency
token usage

Validate AI output before returning it to the client.

If AI fails, return deterministic fallback or an explicit unavailable state.

CONTRACTS / BOUNDARIES:
ai_interactions; model routing abstraction; prompt version; approved evidence contract.

VERIFICATION:
Prompt-injection resistance; answer-key authority; no mastery mutation; malformed AI response; timeout; provider error; fallback; audit record; active CBT rejection.

MANDATORY COMPLETION GATE:
['AI failure cannot break core learning engines.', 'AI cannot mutate authoritative learning state.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
AI failure cannot break core learning engines.
AI cannot mutate authoritative learning state.
PROMPT 21 — Knowledge Base & RAG
PURPOSE: Build grounded retrieval over approved knowledge.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Knowledge Base & RAG subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- RAG supplies grounded knowledge.
- Approved corpus only.
- Taxonomy-aware retrieval.
- RAG does not calculate mastery.

IMPLEMENTATION:
Implement knowledge_documents, knowledge_chunks and knowledge_embeddings.

Ingestion:
- source registration
- version
- status
- chunking
- taxonomy metadata
- embedding
- indexing

Retrieval:
Subject -> syllabus area -> topic -> subtopic -> objective -> concept
plus semantic similarity where appropriate.

Return provenance/context sufficient for audit.

Do not allow unapproved or retired knowledge into production retrieval without explicit policy.

CONTRACTS / BOUNDARIES:
knowledge tables; pgvector; embedding model/version; source status.

VERIFICATION:
Index creation; retrieval relevance fixtures; taxonomy filtering; retired document exclusion; empty retrieval; embedding mismatch; provenance preservation.

MANDATORY COMPLETION GATE:
['Retrieval returns grounded approved context or explicit insufficient-context state.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
Retrieval returns grounded approved context or explicit insufficient-context state.
PROMPT 22 — AI Credits & Model Routing
PURPOSE: Control AI usage and cost through auditable server-side accounting.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the AI Credits & Model Routing subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- AI credits are auditable.
- Entitlements are centralized.
- Frontend cannot increase balance.

IMPLEMENTATION:
Implement ai_credit_accounts and ai_credit_transactions.

For each billable AI operation:
- check entitlement;
- check balance/limit;
- reserve/deduct atomically as appropriate;
- execute;
- reconcile/refund only through trusted idempotent path when required.

Implement model routing abstraction so model changes do not change the product API.

Store model/version and usage metadata.

CONTRACTS / BOUNDARIES:
ai_credit_accounts; ai_credit_transactions; entitlements; ai_interactions.

VERIFICATION:
Concurrent requests; insufficient balance; duplicate request; provider failure; reconciliation; negative-balance prevention; audit trail.

MANDATORY COMPLETION GATE:
['No double charging.', 'No negative balance.', 'Failed operations follow explicit reconciliation behavior.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
No double charging.
No negative balance.
Failed operations follow explicit reconciliation behavior.
OPEN items
🟡 Exact credit pricing/limits/model routing remain OPEN.
PROMPT 23 — Gamification & Streaks
PURPOSE: Implement auditable motivation features without contaminating learning intelligence.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Gamification & Streaks subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- XP is not mastery/readiness/intelligence/score.
- Correct answers earn base XP.
- Incorrect answers may earn small participation XP.
- Session streak = consecutive correct answers.
- Daily streak belongs to broader learning system.
- Blitz speed excluded.

IMPLEMENTATION:
Implement student_xp, xp_events, student_streaks, achievements and student_achievements.

All XP changes originate from trusted backend events.
Use source_event_id for auditability/idempotency.
Prevent farming via duplicate event processing.

Do not allow XP to affect mastery directly.

CONTRACTS / BOUNDARIES:
xp tables; canonical events; achievement criteria.

VERIFICATION:
Duplicate event; replay; negative XP; Blitz speed injection; streak reset; timezone/date boundary; achievement idempotency.

MANDATORY COMPLETION GATE:
['XP ledger reconciles with total.', 'Same source event cannot award twice.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
XP ledger reconciles with total.
Same source event cannot award twice.
PROMPT 24 — Entitlements & Commercial Service
PURPOSE: Centralize feature access.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Entitlements & Commercial Service subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- Direction includes Free, trial month, one-time unlock around ₦3,000–₦5,000, AI credits and school licences.
- Exact matrix remains OPEN.
- Entitlement checks are centralized.

IMPLEMENTATION:
Implement products, plans and entitlements.

Create one server-side entitlement evaluation function used by all protected features.

Support:
- active/inactive;
- starts_at/expires_at;
- limits;
- source;
- product/plan context.

Do not hard-code a final commercial matrix unless explicitly approved.
Make plan configuration data-driven.

CONTRACTS / BOUNDARIES:
products; plans; entitlements; centralized access service.

VERIFICATION:
Expired entitlement; overlapping entitlements; trial; feature limit; unauthorized feature; concurrent entitlement updates.

MANDATORY COMPLETION GATE:
['Every protected feature resolves access through the same service.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
Every protected feature resolves access through the same service.
PROMPT 25 — Payments, Webhooks & Idempotency
PURPOSE: Make commercial confirmation trustworthy.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Payments, Webhooks & Idempotency subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- Payment confirmation is trusted-service state.
- Provider transaction ID is unique with provider.
- Client cannot confirm payment.

IMPLEMENTATION:
Implement payment transaction lifecycle.

External provider webhook/request:
- authenticate/verify provider signature where supported;
- normalize event;
- locate provider transaction;
- enforce idempotency;
- update payment state;
- create/update entitlement;
- record audit trail.

Client return URL is informational, not proof of payment.

Handle retries, out-of-order webhooks, duplicate webhooks, delayed confirmation, failed payments and refunds according to supported provider semantics.

CONTRACTS / BOUNDARIES:
payment_transactions; provider; provider_transaction_id; products/plans; entitlements; audit_logs.

VERIFICATION:
Duplicate webhook; replay; forged webhook; delayed webhook; out-of-order event; concurrent webhook; payment success once; failed payment; refund if provider supports it.

MANDATORY COMPLETION GATE:
['One provider transaction cannot create duplicate entitlement.', 'Client cannot mark payment successful.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
One provider transaction cannot create duplicate entitlement.
Client cannot mark payment successful.
PROMPT 26 — Notifications & Background Jobs
PURPOSE: Provide reliable asynchronous maintenance without hidden learning logic.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Notifications & Background Jobs subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- Background cadence is OPEN.
- Notification timing is OPEN.
- Data validation/integrity jobs are required.

IMPLEMENTATION:
Create a job framework for approved asynchronous tasks.

Candidate jobs:
- data integrity checks;
- stale session cleanup where safe;
- recommendation expiry/recalculation;
- readiness refresh where approved;
- AI credit reconciliation;
- notification delivery;
- analytics aggregation.

Every job must be:
- idempotent;
- observable;
- retryable;
- bounded;
- auditable.

Do not create a background job that silently changes mastery logic outside the versioned mastery service.

CONTRACTS / BOUNDARIES:
Job registry; audit/logging; service contracts.

VERIFICATION:
Retry; duplicate execution; partial failure; poison job; timeout; concurrency lock; idempotency.

MANDATORY COMPLETION GATE:
['Jobs can fail and recover without corrupting state.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
Jobs can fail and recover without corrupting state.
PROMPT 27 — Admin & Question Operations
PURPOSE: Create trusted operational controls.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Admin & Question Operations subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- Admin operations are permissioned and auditable.
- Question review is controlled.
- Historical evidence is protected.

IMPLEMENTATION:
Implement admin service boundaries for:
- question review;
- question report resolution;
- taxonomy/content activation;
- question retirement;
- audit lookup;
- operational health.

Require explicit roles/permissions.
Every destructive or trust-sensitive action writes audit_logs.

Do not expose unrestricted DB operations through an admin endpoint.

CONTRACTS / BOUNDARIES:
question_reports; audit_logs; content statuses; role/permission service.

VERIFICATION:
Unauthorized admin access; student access; review transition; retirement; audit completeness; immutable historical evidence.

MANDATORY COMPLETION GATE:
['Admin actions are auditable and least-privilege.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
Admin actions are auditable and least-privilege.
PROMPT 28 — Analytics & Canonical Event Pipeline
PURPOSE: Separate product analytics from canonical learning evidence.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Analytics & Canonical Event Pipeline subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- Learning events are canonical evidence.
- Product analytics and learning analytics are conceptually separate.
- Recommendation effectiveness is measured.
- ML datasets come from versioned events/features.

IMPLEMENTATION:
Implement analytics ingestion/processing boundaries.

Canonical learning events must remain immutable and versioned.
Product interaction events may be separate.

Provide derived views/aggregations only where approved.
Ensure analytics failures cannot block learning evidence writes.

CONTRACTS / BOUNDARIES:
learning_events; recommendation_events; product analytics boundary.

VERIFICATION:
Event schema validation; replay; duplicate handling; analytics outage; learning event durability; recommendation effectiveness aggregation.

MANDATORY COMPLETION GATE:
['Learning continues if analytics processing is temporarily unavailable.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
Learning continues if analytics processing is temporarily unavailable.
PROMPT 29 — Parent & School Backend Foundations
PURPOSE: Prepare future multi-role access over the same learning engine.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Parent & School Backend Foundations subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- Parent/school surfaces use same central learning engine.
- Parent should not see every answer/private AI interaction by default.
- Parent-child linking uses controlled linking/approval.
- Final permissions are OPEN.

IMPLEMENTATION:
Build only extensible foundations for:
- parent-child relationship;
- school/cohort relationship;
- role-aware access;
- aggregated learning views.

Do not invent final permissions.
Use explicit relationship tables/authorization services when implementation is approved.

Never create a second mastery system for parents/schools.

CONTRACTS / BOUNDARIES:
Central learning state; role/relationship authorization boundary.

VERIFICATION:
Cross-student isolation; parent link approval; school cohort isolation; revoked relationship; least privilege.

MANDATORY COMPLETION GATE:
['No role can bypass ownership/relationship checks.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
No role can bypass ownership/relationship checks.
OPEN items
🟡 Final parent/school/admin permission matrix.
PROMPT 30 — Observability, Audit, Recovery & Data Integrity
PURPOSE: Make invisible backend behavior inspectable.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Observability, Audit, Recovery & Data Integrity subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- Auditability is required for trust-sensitive operations.
- Backups/monitoring/logging are part of production readiness.

IMPLEMENTATION:
Implement:
- structured application logs;
- correlation/request IDs;
- error classification;
- audit logs;
- health checks;
- data-integrity checks;
- migration status;
- critical metric hooks;
- backup/restore procedures where environment supports them.

Audit:
- auth-sensitive changes;
- content approval/retirement;
- mastery recalculation;
- recommendation generation if material;
- payment/entitlement changes;
- admin actions;
- AI interaction metadata.

Never log secrets or unnecessary sensitive content.

CONTRACTS / BOUNDARIES:
logs; audit_logs; health endpoints; backup/restore tooling.

VERIFICATION:
Failure injection; missing DB; timeout; unauthorized operation; audit completeness; restore test; secret leakage scan.

MANDATORY COMPLETION GATE:
['A backend-only failure can be diagnosed without inspecting the frontend.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
A backend-only failure can be diagnosed without inspecting the frontend.
PROMPT 31 — Security Hardening & RLS
PURPOSE: Prove tenant isolation and trust boundaries.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Security Hardening & RLS subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- RLS/ownership must be verified.
- Privileged service access is isolated.
- Client cannot bypass server rules.

IMPLEMENTATION:
Implement and verify RLS and trusted-service boundaries for student-owned data.

Test identities:
- unauthenticated;
- student A;
- student B;
- parent linked/unlinked where supported;
- school user/cohort where supported;
- admin;
- trusted server role.

For every sensitive table, verify:
- read ownership;
- insert ownership;
- update ownership;
- delete restrictions;
- role-specific access;
- service-only mutations.

Use both database-level tests and service-level authorization tests.

CONTRACTS / BOUNDARIES:
RLS policies; auth.uid ownership; trusted server boundary; role claims/relationships where approved.

VERIFICATION:
Cross-user matrix; privilege escalation; forged student_id; forged actor; direct DB access through client role; service-role boundary; revoked relationship.

MANDATORY COMPLETION GATE:
['Student A cannot access Student B.', 'Unauthorized roles cannot mutate protected state.', 'Privileged operations are server-only.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
Student A cannot access Student B.
Unauthorized roles cannot mutate protected state.
Privileged operations are server-only.
PROMPT 32 — Backend Test Harness & Simulated Student Population
PURPOSE: Prove learning intelligence behavior without relying only on manual testing.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Backend Test Harness & Simulated Student Population subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- Deterministic engines must have unit/integration tests.
- Mastery requires simulated trajectory calibration.
- Selection/recommendations require invariant tests.
- CBT requires timer/submission tests.

IMPLEMENTATION:
Build a reusable simulated-student test harness.

Create trajectories such as:
A: consistently correct
B: consistently incorrect
C: improving
D: declining
E: strong but inconsistent
F: low mastery but high self-reported confidence
G: high mastery but low syllabus coverage
H: repeated same-question exposure
I: varied questions on same concept
J: recovery after an error
K: no activity / stale evidence

For each trajectory, assert qualitative invariants:
- mastery responds in expected direction;
- confidence is distinct;
- coverage differs from mastery;
- repeated identical questions provide weaker evidence;
- recovery is visible;
- one event cannot cause absurd state jumps.

Do not hard-code exact threshold values if they remain OPEN; test invariant behavior instead.

CONTRACTS / BOUNDARIES:
Test fixtures; event replay; algorithm registry; deterministic outputs.

VERIFICATION:
Trajectory tests; property-based tests where practical; replay determinism; algorithm-version comparison.

MANDATORY COMPLETION GATE:
['The engine can be tested without manually using the UI.', 'Unreasonable trajectories fail tests rather than being hidden.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
The engine can be tested without manually using the UI.
Unreasonable trajectories fail tests rather than being hidden.
PROMPT 33 — Backend End-to-End Integration
PURPOSE: Prove the complete backend learning lifecycle.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Backend End-to-End Integration subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- End-to-end signup/onboarding/diagnostic/practice/CBT/readiness path must pass.

IMPLEMENTATION:
Create an automated E2E scenario:

1 create test account
2 authenticate
3 save onboarding
4 assign/validate subjects
5 start diagnostic
6 answer questions
7 verify learning events
8 verify mastery/coverage updates
9 verify recommendation
10 start Smart Practice
11 submit answer
12 verify next-question selection
13 request explanation
14 complete session
15 verify results
16 start Blitz
17 verify no speed signal
18 start Custom Practice
19 complete session
20 start CBT
21 answer/change/flag
22 finalize or expire
23 verify CBT result
24 verify readiness snapshot
25 verify progress state
26 verify XP/streak if enabled
27 verify audit/event records

Use isolated test data and clean up safely.

CONTRACTS / BOUNDARIES:
All major backend services and DB contracts.

VERIFICATION:
E2E happy path; partial failure; retry; session resume; CBT expiry; entitlement denial.

MANDATORY COMPLETION GATE:
['A fresh test environment can execute the lifecycle successfully.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
A fresh test environment can execute the lifecycle successfully.
PROMPT 34 — Calibration & Pilot
PURPOSE: Validate deterministic intelligence before real students depend on it.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Calibration & Pilot subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- Rules/heuristics are baseline.
- ML only ships if it beats baseline.
- Mastery/readiness/selection/recommendation must be calibrated.

IMPLEMENTATION:
Build a calibration workflow that can compare expected qualitative trajectories and available historical/synthetic evidence.

Evaluate:
- mastery stability;
- recovery behavior;
- question difficulty fit;
- selection diversity;
- recommendation usefulness proxies;
- coverage behavior;
- readiness bottlenecks.

Version all calibration results with algorithm versions.

Do not silently tune production values. Record changes as decision/configuration changes.

CONTRACTS / BOUNDARIES:
Algorithm registry; test fixtures; simulated students; selection logs; recommendation events.

VERIFICATION:
Regression against prior algorithm; extreme cases; cold start; long session; sparse evidence; noisy evidence.

MANDATORY COMPLETION GATE:
['Calibration report exists.', 'Changes are versioned and reproducible.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
Calibration report exists.
Changes are versioned and reproducible.
OPEN items
🟡 Exact production thresholds/weights until approved.
PROMPT 35 — Production Readiness, Deployment & Launch Gate
PURPOSE: Prove the backend is safe to expose to real students.
COPY-PASTE INTO GOOGLE AI STUDIO
You are implementing the Production Readiness, Deployment & Launch Gate subsystem of SABI.

BEFORE CODING:
1. Inspect the current repository and existing migrations/services/tests.
2. Identify what is already implemented.
3. Do not recreate correct work.
4. Compare current implementation with the SABI Technical Implementation Specification and this prompt.
5. List gaps before modifying code.

LOCKED REQUIREMENTS:
- Production readiness includes migrations, RLS, answer keys, taxonomy, mastery calibration, selection/recommendations, CBT, AI grounding/fallback, payments, analytics, backups, monitoring and E2E tests.

IMPLEMENTATION:
Run a final release gate.

CHECK:
- migrations reproducible;
- schema constraints verified;
- RLS matrix passes;
- question answer keys verified;
- taxonomy mappings reviewed;
- mastery calibrated;
- selection audited;
- recommendations audited;
- readiness audited;
- CBT timer/submission/expiry tested;
- AI grounding/fallback tested;
- payments/webhooks/idempotency tested;
- analytics validated;
- backups/restore verified;
- logs/monitoring configured;
- E2E tests pass;
- no privileged credentials exposed;
- no unresolved critical security findings.

Generate a release evidence report containing pass/fail per item.
Do not mark launch-ready if any critical gate fails.

CONTRACTS / BOUNDARIES:
All backend services, DB, tests, operational tooling.

VERIFICATION:
Full release suite; security suite; migration replay; restore test; E2E; failure injection; smoke test.

MANDATORY COMPLETION GATE:
['Release report exists.', 'All critical gates PASS.', 'Known noncritical limitations are explicitly listed.', 'Deployment can be reproduced.']

DO NOT DECLARE COMPLETE UNTIL THE VERIFICATION GATE PASSES.
If a test fails, fix the implementation or clearly identify an unresolved source-of-truth gap. Do not suppress, skip, weaken or delete a failing test merely to obtain a green build.

SECURITY:
- Never expose privileged credentials.
- Enforce authorization server-side.
- Do not trust client-provided correctness, ownership, score, mastery, readiness, XP or payment state.
- Validate all externally supplied identifiers and configuration.
- Preserve auditability.

OUTPUT AFTER EXECUTION:
- implementation summary
- migrations added
- services/functions added
- API contracts
- tests added/run
- test results
- security checks
- unresolved OPEN decisions
- known limitations
- exact next prompt to execute.
Verification gate
Release report exists.
All critical gates PASS.
Known noncritical limitations are explicitly listed.
Deployment can be reproduced.
6. CANONICAL LEARNING EVENT CONTRACT
Event
Mastery evidence?
Backend meaning
question_viewed
No
Exposure/analytics
answer_selected
No direct
Interaction state
answer_submitted
Yes
Learning evidence
answer_changed
No direct
CBT behavior signal
explanation_opened
No direct
Learning interaction
explanation_completed
No direct
Learning interaction
question_skipped
No direct
Selection/analytics context
recovery_answer_submitted
Yes
Recovery evidence
cbt_answer_submitted
Yes
Learning + exam-performance evidence
recommendation lifecycle
No direct
Recommendation effectiveness
session_completed
No direct
Session state/analytics

Correctness is calculated by the backend from the authoritative question version. The frontend is never trusted to declare correctness.
7. ALGORITHM REGISTRY
Algorithm
Purpose
Status
MASTERY_V1
Mastery/confidence
Locked versioned baseline; exact formula open until calibration
SELECTION_V1
Next-question selection
Locked versioned baseline; exact weights open
RECOMMENDATION_V1
Next-action ranking
Locked versioned baseline; exact priority formula open
READINESS_V1
JAMB readiness
Locked versioned baseline; exact thresholds open

8. MASTER BACKEND VERIFICATION MATRIX
Subsystem
Must prove
Identity
Cross-user isolation and trusted identity
Profile
All onboarding data persists and validates
Taxonomy
Hierarchy integrity/versioning
Questions
Answer-key authority/version integrity
Sessions
Correct state transitions and resume
Events
Append-only evidence and replay
Mastery
Deterministic, stable, auditable updates
Coverage
Separate from mastery
Selection
Valid candidates only + auditable ranking
Recommendations
Concrete actions + evidence + lifecycle
Readiness
Gates/bottleneck + history
Diagnostic
Observed baseline, not CBT
Smart Practice
Adaptive evidence loop
Blitz
No speed intelligence/reward
Custom
Student constraints honored
CBT
Fixed set + server timer + exactly-once finalization
AI
Grounded, bounded, auditable, isolated
RAG
Approved corpus + provenance
AI Credits
Atomic, auditable usage
Gamification
Idempotent ledger
Commerce
Central entitlements
Payments
Verified webhooks + idempotency
Jobs
Retryable/idempotent
Admin
Least privilege + audit
Analytics
Learning evidence survives analytics failure
Parent/School
No cross-student leakage
Security
RLS and service boundary proven
Recovery
Backup/restore proven
Deployment
Reproducible and gated

9. WHAT 'IMPLEMENTED' MEANS FOR SABI BACKEND
A backend feature is NOT considered implemented because a table exists, an endpoint returns HTTP 200, or a function compiles.
The database contract exists.
The service logic exists.
Authorization exists.
Invalid input is rejected.
Concurrency/retry behavior is considered.
State transitions are tested.
Happy path is tested.
Failure path is tested.
Historical/audit behavior is tested where applicable.
Security boundaries are tested.
At least one integration test proves the real database/service path.
Critical learning logic has deterministic fixtures.
The verification output is recorded.
10. BACKEND AGENT REPORT FORMAT
After every prompt, require Google AI Studio to return exactly this type of report:
IMPLEMENTATION REPORT
Prompt:
Subsystem:
Status: PASS / PARTIAL / BLOCKED

Files changed:
Migrations:
Functions/services:
API endpoints/contracts:
Database changes:
Security/RLS changes:

Tests added:
Tests run:
Tests passed:
Tests failed:

Verification evidence:
- ...
- ...

OPEN decisions encountered:
- ...

Known risks:
- ...

Next prompt:
- ...

DO NOT CLAIM PASS IF ANY REQUIRED VERIFICATION GATE FAILED.
11. FINAL BACKEND AUDIT — COPY-PASTE INTO GOOGLE AI STUDIO
Perform a complete backend audit of SABI now.

Do not change code first.

STEP 1 — INVENTORY
Inspect:
- database migrations
- tables
- indexes
- constraints
- RLS policies
- auth integration
- service functions
- API routes
- session engine
- event engine
- mastery engine
- coverage engine
- selection engine
- recommendation engine
- readiness engine
- Diagnostic
- Smart Practice
- Blitz
- Custom Practice
- CBT
- AI Coach
- RAG
- AI credits
- XP/streaks
- entitlements
- payments/webhooks
- jobs
- admin
- analytics
- parent/school foundations
- logging
- audit logs
- backups/recovery
- tests

STEP 2 — SOURCE-OF-TRUTH COMPARISON
Compare implementation against:
- SABI Master Product Specification
- SABI Technical Implementation Specification
- SABI AI + RAG Implementation Specification
- SABI QA, Testing & Deployment Specification
- Backend Prompt Book

For every requirement mark:
PASS
PARTIAL
MISSING
CONFLICT
OPEN

STEP 3 — SECURITY
Prove:
- unauthenticated cannot access protected data
- Student A cannot access Student B
- client cannot set correctness
- client cannot set mastery
- client cannot set readiness
- client cannot set recommendation priority
- client cannot alter XP balance
- client cannot confirm payment
- client cannot bypass entitlement
- client cannot call privileged service operations
- AI cannot mutate learning state

STEP 4 — LEARNING INTELLIGENCE
Run simulated trajectories:
consistent correct
consistent wrong
improving
declining
inconsistent
high confidence/low observed mastery
high mastery/low coverage
repeated identical question
varied same-concept questions
recovery after error
cold start

Check deterministic replay.

STEP 5 — CBT
Prove:
Full Mock = 180 / 120
Quick Mock = 40 / 30
English + 3
fixed question set
server-authoritative timer
review flag
answer changes
two-step submit
auto-submit
exactly-once finalization
no AI during active exam

STEP 6 — COMMERCE
Prove:
duplicate webhook safety
provider transaction uniqueness
payment cannot be client-confirmed
entitlement created only after trusted confirmation
AI credit cannot go negative
duplicate AI request cannot double-charge

STEP 7 — AI/RAG
Prove:
approved knowledge retrieval
provenance
answer-key authority
fallback
timeout handling
malformed response handling
prompt/model version logging
no AI access during CBT

STEP 8 — FAILURE INJECTION
Simulate:
database timeout
network failure
provider timeout
duplicate request
duplicate webhook
concurrent answer submission
session expiry
CBT expiry race
AI timeout
RAG empty result
payment pending
entitlement expired

STEP 9 — MIGRATION/RECOVERY
Create a fresh DB from migrations.
Load approved fixtures.
Run the full test suite.
Verify backup/restore where supported.

STEP 10 — FINAL VERDICT
Do not give an overall 'looks good' statement.

Produce a table:
Requirement | Status | Evidence | Test | Risk | Required action

Then:
CRITICAL BLOCKERS
NONCRITICAL GAPS
OPEN DECISIONS
RECOMMENDED NEXT IMPLEMENTATION PROMPT

Only state BACKEND READY if all critical gates pass.
12. FINAL BACKEND DEFINITION OF DONE
All approved schema exists through reproducible migrations.
Critical constraints are enforced by the database.
RLS and trusted-service boundaries are proven by tests.
Authentication/ownership is proven.
All 15 onboarding fields have backend persistence/validation.
JAMB taxonomy is versioned and provenance-aware.
Question versions preserve historical answer context.
Only production-eligible questions enter production sessions.
Canonical learning events are immutable and replayable.
Correctness is server-authoritative.
Mastery is deterministic, versioned and calibrated.
Coverage is separate from mastery.
Selection is deterministic, auditable and mode-aware.
Recommendations are concrete, evidence-backed and lifecycle-managed.
Readiness is gated, versioned and not an admission prediction.
Diagnostic is adaptive and distinct from CBT.
Smart Practice is adaptive and evidence-driven.
Blitz contains no speed intelligence/reward logic.
Custom Practice respects student constraints.
CBT is strict, server-timed, fixed-set and exactly-once finalized.
AI cannot override authoritative learning state.
RAG uses approved knowledge with provenance.
AI failures cannot break learning engines.
AI credits are atomic and auditable.
XP/streaks are auditable and idempotent.
Entitlements are centralized.
Payments/webhooks are verified and idempotent.
Background jobs are retryable and idempotent.
Admin operations are least-privilege and audited.
Analytics failure cannot destroy canonical learning evidence.
Parent/school access cannot bypass ownership.
Observability can diagnose backend failures without the frontend.
Backup/restore has been tested.
Full E2E lifecycle passes.
Simulated-student calibration passes.
Production release gate passes.
FINAL PRINCIPLE: If SABI cannot prove that a backend decision is correct, authorized, reproducible and testable, it is not finished.
END OF SABI GOOGLE AI STUDIO BACKEND IMPLEMENTATION PROMPT BOOK v2 — DEEP IMPLEMENTATION + VERIFICATION EDITION

PART VI — AI + RAG IMPLEMENTATION
Source document: SABI_AI_RAG_Implementation_Specification_v1.docx
SABI
AI + RAG IMPLEMENTATION SPECIFICATION
Version 1.0 • September 2026
Defining exactly what AI and RAG do inside the SABI learning system.
1. Purpose
This document defines the implementation boundary for SABI AI Coach and Retrieval-Augmented Generation (RAG). It is derived from the approved SABI product architecture and Technical Implementation Specification. Its primary purpose is to prevent the AI layer from silently becoming a second learning engine.
Core rule: RAG supplies grounded knowledge and context. AI Coach explains, teaches, clarifies and coaches. Deterministic SABI services decide correctness, mastery, coverage, readiness, recommendations and question selection.
2. The Most Important Distinction
RAG is not the brain that decides what the student knows. RAG is the knowledge-retrieval layer that gives the AI Coach the right verified material to use when communicating with the student.
Therefore:
RAG answers: What verified knowledge is relevant here?
AI Coach answers: How should this verified knowledge be explained to this student?
Mastery Engine answers: What does the student's evidence indicate about mastery?
Readiness Engine answers: How does mastery/coverage/CBT evidence map to JAMB readiness?
Recommendation Engine answers: What should the student do next?
Selection Engine answers: Which exact question should the student see next?
This separation is LOCKED.
3. What RAG Actually Does in SABI
3.1 Primary function
RAG retrieves the most relevant, approved educational knowledge for a specific student interaction and supplies that knowledge to the AI Coach as grounded context.
3.2 RAG inputs
Current question and question version
Authoritative correct answer
Student answer where relevant
Subject
Syllabus area
Topic
Subtopic
Learning objective
Concept
Student explanation preference
Student language preference
Current recommendation or learning action where relevant
Approved knowledge corpus
3.3 RAG outputs
Relevant knowledge chunks
Source/provenance metadata
Taxonomy alignment
Source/version information
Retrieval relevance information
Grounding context for the AI Coach
4. What RAG Does NOT Decide
RAG does not decide the correct answer.
RAG does not calculate mastery.
RAG does not calculate confidence.
RAG does not determine syllabus coverage.
RAG does not determine JAMB readiness.
RAG does not create the next-best recommendation.
RAG does not select the next question.
RAG does not set question difficulty.
RAG does not award XP.
RAG does not determine a JAMB score.
RAG does not determine entitlement or payment status.
The AI model also cannot override these authoritative systems.
5. Where RAG Sits in the Architecture
The approved architecture is:
Student interaction → deterministic SABI state/action → AI Service → retrieval/knowledge → grounded explanation → student.
For question explanation:
Question + authoritative answer + student answer + taxonomy context → RAG → relevant verified knowledge → AI Coach → explanation.
For a recommendation:
Recommendation Engine creates the structured recommendation first. AI Coach may explain the recommendation using relevant knowledge. RAG does not create the recommendation.
6. RAG in Each SABI Experience
6.1 Smart Practice
RAG is primarily an explanation/teaching support layer. Smart Practice itself is controlled by Recommendation, Selection, Session and Mastery services.
Flow: Smart Practice target → question → answer → deterministic evidence update → explanation request → RAG retrieves relevant knowledge → AI Coach explains → next question.
6.2 Blitz
RAG supports short, grounded micro-explanations. It should not turn every Blitz question into a long tutoring session.
If repeated evidence shows a learning problem, the deterministic Recommendation Engine may create a deeper practice recommendation. RAG does not make that decision.
6.3 Custom Practice
RAG explains questions and concepts selected by the student. It does not override the student's configuration.
6.4 CBT
During an active CBT, AI Coach and RAG assistance are disabled. After completion, RAG may support explanations of results and concepts.
6.5 Diagnostic
RAG may explain diagnostic questions after permitted submission, but diagnostic scoring and baseline estimation remain deterministic.
6.6 Progress / Readiness
RAG can explain an already-calculated progress/readiness state in student-friendly language. It must not calculate or alter the state.
7. Knowledge Corpus
The RAG corpus should contain approved educational knowledge rather than arbitrary internet content.
Authoritative JAMB syllabus material and mapped syllabus context
Approved SABI learning content
Reviewed concept explanations
Worked examples
Formula/concept references where applicable
Common misconceptions
Reviewed question explanations
Prerequisite/concept learning material
Every production knowledge source should retain provenance and version information.
8. Knowledge Data Model
The technical baseline already defines:
knowledge_documents
knowledge_chunks
knowledge_embeddings
Knowledge documents store source identity/version/status. Chunks store content and taxonomy alignment. Embeddings store vector representation, embedding model and embedding version.
The RAG implementation must preserve the source/version chain so an explanation can be traced back to the material used to ground it.
9. Taxonomy-Aware Retrieval
RAG should not rely on semantic similarity alone.
Retrieval should use SABI's taxonomy to narrow and rank relevant knowledge:
Subject → Syllabus Area → Topic → Subtopic → Learning Objective → Concept.
Prefer exact concept matches.
Then prefer learning-objective matches.
Then subtopic/topic matches.
Respect subject and active syllabus-version boundaries.
Prefer approved/high-authority sources.
Use semantic similarity as a retrieval signal, not the only filter.
10. Retrieval Pipeline
Receive structured AI request.
Build retrieval context from the current SABI state.
Apply hard metadata constraints.
Run vector/semantic retrieval.
Rank retrieved chunks using taxonomy and source relevance.
Apply grounding sufficiency checks.
Pass selected evidence to the AI prompt.
Generate structured AI response.
Validate response against authoritative context.
Store interaction and retrieval metadata.
11. The AI Coach
The AI Coach is the natural-language layer above deterministic SABI state and retrieved knowledge.
It can:
Explain a correct or incorrect answer.
Teach a concept.
Break down a calculation.
Clarify a misconception.
Explain why an answer is correct.
Explain a structured recommendation.
Adapt explanation depth.
Adapt language style.
Provide post-CBT learning explanations.
It cannot:
Change mastery.
Change readiness.
Change coverage.
Change answer keys.
Change recommendations.
Change question selection.
Declare a new syllabus requirement.
Override backend scoring.
12. Authoritative Answer-Key Protection
The question version is the source of truth for correctness. The AI receives the authoritative answer and is instructed to explain it.
If AI output conflicts with the authoritative answer, the AI output is invalid and must not be presented as the official answer.
This is especially important for mathematical or multi-step explanations.
13. Grounding and Hallucination Control
The AI should answer from retrieved evidence whenever the task depends on SABI knowledge.
If retrieval is insufficient, the system should not manufacture authoritative educational claims.
Sufficient retrieval → generate grounded response.
Insufficient retrieval → retrieve again with a controlled fallback strategy where appropriate.
Still insufficient → return a safe uncertainty/fallback response.
Never silently substitute model memory for missing authoritative material when the task requires verified SABI knowledge.
14. AI Request Types
🔵 PROPOSED request types for implementation:
QUESTION_EXPLANATION
CONCEPT_EXPLANATION
STEP_BY_STEP_SOLUTION
COMMON_MISTAKE_EXPLANATION
RECOMMENDATION_EXPLANATION
PROGRESS_EXPLANATION
CBT_RESULT_EXPLANATION
STUDY_COACHING
The exact production request catalogue remains configurable until approved.
15. Prompt Architecture
Do not use one giant prompt. Use layered prompts.
System instructions — permanent SABI AI behavior and boundaries.
Task instructions — the specific operation.
Structured SABI context — question, answer, taxonomy, recommendation and relevant student preferences.
Retrieved knowledge — grounded source material.
Output schema — required structured response.
Prompt versions must be stored with AI interactions.
16. Student Personalization
The AI may personalize communication using approved profile preferences such as explanation preference and language style.
Brief vs detailed
Plain Formal English
West African Pidgin
Mixed Nigerian English
Personalization changes presentation, not the underlying academic truth.
17. AI Response Schema
🔵 PROPOSED structured response fields:
result
correct_answer
why
quick_explanation
step_by_step
key_idea
common_mistake
grounding_status
Not every field must be populated for every request. The final schema should be approved before production hard-coding.
18. AI Validation
Validate response schema.
Validate that the response does not contradict the authoritative answer.
Validate grounding status.
Reject malformed output.
Record model/prompt/retrieval metadata.
Use controlled retry/fallback behavior.
Never let a failed AI response corrupt learning state.
19. Model Routing
The AI layer should be provider/model agnostic.
Application services call an SABI AI Service. The AI Service chooses the configured model and fallback path.
This allows Gemini or another approved model to change without changing mastery, recommendations, sessions or frontend contracts.
Exact launch model, fallback model, routing rules and thresholds remain OPEN.
20. AI Credits and Entitlements
AI credit enforcement belongs to the Commercial/Entitlement boundary, not the model prompt.
Flow:
AI request → entitlement/credit check → permitted → AI Service → usage recorded → credit transaction reconciled.
The frontend must not decide whether an AI request is billable or whether a student has credits.
21. Caching
Repeated explanations may be cached where the content is deterministic enough to reuse safely.
A cache key should account for at least question version, explanation type and meaningful presentation preferences.
Exact cache policy remains OPEN.
22. AI Interaction Audit
The technical baseline defines ai_interactions with prompt/model/retrieval/usage metadata.
student_id
session_id
request_type
question_id
question_version_id
prompt_version
model
model_version
retrieval_context
response
status
latency_ms
token_usage
created_at
This supports debugging, cost analysis, quality evaluation and future model comparison.
23. RAG Quality Metrics
The RAG system should be evaluated separately from the AI language model.
Retrieval relevance
Taxonomy alignment
Source authority
Grounding sufficiency
Unsupported-claim rate
Answer consistency
Explanation usefulness
Fallback rate
Latency
Cost
24. Critical Anti-Drift Rule
The AI/RAG layer must never gradually become a hidden decision engine.
For example, the following is NOT allowed:
AI says student is weak → frontend treats it as weakness → recommendation changes → mastery changes.
Correct architecture:
Evidence → Mastery Engine → Recommendation Engine → structured state → AI Coach explains that state.
The AI is downstream of authoritative learning state.
25. Full SABI AI/RAG Flow
QUESTION EXPLANATION:
Student answer → authoritative scoring → learning event → mastery/coverage update → explanation request → retrieval → grounded context → AI Coach → validation → explanation.
RECOMMENDATION EXPLANATION:
Learning state → Recommendation Engine → structured recommendation → relevant RAG knowledge → AI Coach → explanation.
CBT:
Active CBT → AI/RAG OFF. Completed CBT → results/readiness → optional AI explanation.
DEEP TEACHING:
Observed weakness → Recommendation Engine → Smart Practice → question evidence → RAG + AI explanation.
26. Failure Architecture
Core SABI must continue functioning if AI fails.
RAG unavailable → deterministic question/result functions continue.
AI model unavailable → fallback configured or graceful explanation failure.
AI validation fails → reject/retry/fallback.
Retrieval insufficient → do not hallucinate.
AI credits unavailable → enforce entitlement boundary without corrupting learning state.
27. 🔒 Locked AI/RAG Decisions
RAG explains; RAG does not track mastery.
RAG provides concept knowledge, formulas, syllabus context and verified educational material.
AI Coach explains, teaches, clarifies, coaches and adapts communication.
AI does not determine correctness, mastery, readiness, syllabus coverage, question selection, recommendations or answer keys.
Authoritative answer keys override AI.
AI is disabled during active CBT.
AI failure must not break the core learning engines.
AI interactions are auditable/versioned.
RAG is grounded in approved knowledge rather than being treated as an unrestricted answer source.
28. 🟡 Open AI/RAG Decisions
Final knowledge corpus and source ingestion process.
Exact chunking strategy.
Embedding model.
Retrieval ranking formula and thresholds.
Exact prompt/system architecture.
Model routing and launch model.
Fallback model and fallback rules.
AI confidence/grounding policy.
Final response schemas.
Cache policy.
AI-credit consumption rules.
AI quality thresholds.
Final request-type catalogue.
29. Implementation Order
Define knowledge-source registry and provenance.
Create knowledge document/chunk/embedding migrations.
Implement taxonomy-aware ingestion.
Implement embeddings and retrieval.
Implement retrieval evaluation.
Implement SABI AI Service boundary.
Implement prompt version registry.
Implement question-explanation flow.
Implement recommendation/progress explanation flow.
Implement post-CBT explanation flow.
Implement AI validation/fallback.
Implement AI interaction logging.
Implement AI credit/entitlement checks.
Run grounding and hallucination tests.
Calibrate retrieval and model quality before production.
30. Final Principle
SABI's intelligence is not one model. It is a layered system.
Evidence → deterministic learning state → deterministic action → RAG knowledge → AI explanation.
RAG makes the AI knowledgeable and grounded. It does not make the AI the authority over the student's learning state.

PART VII — CORE MASTER IMPLEMENTATION ORCHESTRATION
Source document: SABI_Google_AI_Studio_Master_Implementation_Prompt_Book_v1.docx
SABI
GOOGLE AI STUDIO MASTER IMPLEMENTATION PROMPT BOOK
Version 1.0 • September 2026
Sequential copy-paste prompts for building SABI in Google AI Studio with Supabase/Postgres
Purpose of this document
This is the implementation execution document for SABI. It converts the approved SABI product, technical, frontend, AI/RAG, and QA architecture into a controlled sequence of Google AI Studio prompts. The prompts are intended to be used one at a time. The user should not need to translate the architecture into technical tasks manually.
The implementation environment is Google AI Studio. The implementation model is expected to inspect the existing codebase, preserve working code, implement only the requested phase, run relevant tests, report what changed, report blockers, and stop at the stated completion boundary.
Document hierarchy
Document
Role
Status
SABI Master Product Specification v1
Product, UX, locked product decisions
DONE / SOURCE OF TRUTH
SABI Technical Implementation Specification v1
Backend architecture, database, services, events, algorithms, security
DONE / SOURCE OF TRUTH
SABI Frontend Implementation Specification v1
15 screens, routes, UI states, frontend contracts
DONE / SOURCE OF TRUTH
SABI AI + RAG Implementation Specification v1
AI Coach, retrieval, grounding, model boundary
DONE / SOURCE OF TRUTH
SABI QA, Testing & Deployment Specification v1
Testing, release gates, pilot, deployment
DONE / SOURCE OF TRUTH
This document
Execution prompts for Google AI Studio
NEW / IMPLEMENTATION DRIVER

How to use this book
Start with Prompt 0 once at the beginning of the project. Treat it as the permanent build constitution.
Then execute Prompts 1–18 in order unless a prompt reports a blocker that requires resolving an OPEN decision.
Paste only one implementation prompt at a time into Google AI Studio.
After Google AI Studio responds, review its report and tests. If there is an error, bring the response/error here before moving forward.
Never ask Google AI Studio to 'build all of SABI' in one shot.
Do not let the implementation model silently turn PROPOSED or OPEN architecture into LOCKED product behavior.
When a prompt says STOP, stop. The next prompt is intentionally separate.
Decision language
🔒 LOCKED — already approved. Do not silently change.
🔵 PROPOSED — recommended implementation approach. If material, validate before hard-coding.
🟡 OPEN — not finalized. Do not invent a product decision.
🔴 CHANGED — a later decision replaced an earlier one; preserve the newer decision and record the change.
Current implementation sequence
0 — Master Build Instruction / permanent project context
1 — Project Foundation & Supabase Environment
2 — Database Migrations, Constraints & RLS
3 — Authentication, Onboarding & Student Profile
4 — JAMB Configuration, Taxonomy & Content Foundation
5 — Question Bank, Versions & Quality Pipeline
6 — Session Engine & Canonical Learning Events
7 — Mastery & Syllabus Coverage
8 — Question Selection Engine
9 — Recommendation Engine
10 — JAMB Readiness Engine
11 — Smart Practice
12 — Blitz
13 — Custom Practice
14 — CBT Exam Simulator
15 — AI Coach + RAG
16 — Gamification, Entitlements, Payments & Credits
17 — Admin, Analytics, Notifications, Parent/School
18 — QA, Security Hardening, Calibration, Pilot & Launch
PROMPT 0 — SABI MASTER BUILD INSTRUCTION
Use this first. It establishes the permanent rules for the Google AI Studio implementation.
You are the primary implementation engineer for SABI.

SABI is a JAMB-only adaptive CBT preparation platform being built primarily in Google AI Studio with Supabase/Postgres. The product thesis is: SABI is a data engine wrapped in a CBT platform.

SOURCE OF TRUTH
Treat these documents as authoritative and use them together:
1. SABI Master Product Specification v1
2. SABI Technical Implementation Specification v1
3. SABI Frontend Implementation Specification v1
4. SABI AI + RAG Implementation Specification v1
5. SABI QA, Testing & Deployment Specification v1
6. This prompt book, for implementation sequencing only.

HARD RULES
- 🔒 LOCKED decisions must not be silently changed.
- 🟡 OPEN decisions must not be invented.
- 🔵 PROPOSED technical choices may be implemented only when they do not create a material product decision; otherwise flag them.
- Preserve existing working code.
- Inspect the current repository before changing it.
- Do not duplicate business logic across frontend and backend.
- Trust the backend for correctness, mastery, readiness, recommendations and entitlements.
- Raw learning events are append-only evidence.
- Calculated learning state is derived and versioned.
- AI is downstream of deterministic learning state.
- RAG grounds explanations; RAG does not calculate mastery or decide recommendations.
- AI cannot override an authoritative answer key.
- AI is unavailable during an active CBT exam.
- Never expose privileged service credentials in client code.
- Use migrations for schema changes.
- Add tests with each major module.
- Preserve historical learning evidence when content is retired or algorithms change.
- Algorithm and prompt versions must be auditable.
- Never replace a deterministic system with an LLM merely because an LLM is available.
- ML is allowed only if it beats the deterministic baseline under defined evaluation criteria.

IMPLEMENTATION BEHAVIOUR
For every task:
1. Inspect the current codebase.
2. Identify what already exists.
3. Reuse existing compatible code.
4. Implement only the requested phase.
5. Run relevant tests/type checks/build checks.
6. Report files changed, migrations created, tests run, results, blockers and unresolved OPEN items.
7. Do not move to the next phase automatically.

WHEN SOMETHING IS UNCLEAR
Do not guess. Label it:
OPEN DECISION — [issue]
Then explain the minimum decision required.

ARCHITECTURAL BOUNDARY
SABI has one central learning state per student across Smart Practice, Blitz, Custom Practice and CBT. Different experiences may use different selection weights or UI behaviour, but they must feed the same evidence/mastery/readiness system.

PRODUCT EXPERIENCES
- Smart Practice: SABI chooses what the student needs.
- Blitz: rapid personalized one-question-at-a-time feed; no setup; no fixed length; stop anytime; speed is NOT used for XP, streaks, difficulty, selection, mastery or recommendations.
- Custom Practice: student chooses subject/topic/subtopic/origin/count/settings.
- CBT: strict JAMB simulation.
- Diagnostic: adaptive baseline; not a 180-question full mock.

CBT LOCKS
Full Mock = 180 questions / 120 minutes.
Quick Mock = 40 questions / 30 minutes.
English compulsory/locked plus three selected subjects.
Strict timer, navigator, review flag, eligible calculator where configured, no hints/AI/explanations during exam, two-step submission, timer expiry auto-submit.

Do not ask me to restate these rules in later prompts. Maintain them throughout the project.
PROMPT 1 — PROJECT FOUNDATION & SUPABASE ENVIRONMENT
Establish the project safely before feature implementation.
Work on Phase 1 only: Project Foundation & Supabase Environment.

First inspect the repository and current Google AI Studio project structure.

Implement:
- clear application/module boundaries aligned to the SABI technical specification;
- environment configuration for local/development/production;
- Supabase client configuration;
- secure environment-variable handling;
- typed database/client configuration where appropriate;
- baseline error handling and logging structure;
- migration directory and migration execution convention;
- test runner and baseline test command;
- health/readiness checks where appropriate;
- a safe README/developer runbook describing how the project starts, tests and connects to Supabase.

Do NOT implement business-domain tables yet unless required purely for infrastructure.

Security:
- never hard-code secrets;
- never expose service-role credentials to the browser;
- client code may use only intended public credentials;
- server/trusted-service code owns privileged operations.

Acceptance:
- project builds;
- tests can run;
- Supabase connection is configured without secrets in source;
- migration workflow is reproducible;
- existing functionality is not broken.

STOP after reporting the foundation state.
PROMPT 2 — DATABASE MIGRATIONS, CONSTRAINTS & RLS
Build the core persistence layer from the approved technical schema.
Implement Phase 2: Database Migrations, Constraints & RLS.

Use the SABI Technical Implementation Specification as the schema source of truth.

Create reproducible migrations for the approved baseline entities, including:
users
student_profiles
student_profile_history
subjects
student_subjects
exam_configs
exam_config_subjects
taxonomy_versions
syllabus_areas
topics
subtopics
learning_objectives
concepts
questions
question_options
question_versions
question_reports
learning_sessions
session_questions
learning_events
mastery_states
mastery_history
recommendations
recommendation_events
question_selection_logs
readiness_snapshots
student_xp
xp_events
student_streaks
achievements
student_achievements
ai_interactions
knowledge_documents
knowledge_chunks
knowledge_embeddings
products
plans
entitlements
ai_credit_accounts
ai_credit_transactions
payment_transactions
audit_logs

Implement the documented uniqueness/relationship constraints.

Implement RLS so students cannot access another student's private learning state. Keep privileged calculations in trusted/server boundaries.

Do not invent final parent/school/admin permission details where the specification marks them OPEN. Create safe placeholders or defer those policies.

Create database tests for:
- ownership;
- cross-student access denial;
- unique constraints;
- historical evidence preservation;
- payment idempotency constraint.

STOP if a material schema decision is missing rather than inventing it.
PROMPT 3 — AUTHENTICATION, ONBOARDING & STUDENT PROFILE
Implement Phase 3: Identity, Authentication, Onboarding and Student Profile.

Authentication:
- phone + OTP;
- email + password;
- Google sign-in;
- use Supabase Auth.

Implement the 15-question onboarding contract:
1 Full Name
2 Subject Combination — English compulsory/locked + exactly 3 selected subjects
3 Current Class & Prior Attempts
4 Target Course & University
5 Exam Timeline
6 Subject Confidence 1–5
7 Weakest/Priority Subject
8 Root Cause
9 Specific Trouble Topic
10 Study Style
11 Daily Study Dedication
12 Study Environment
13 Explanation Preference
14 Language Style
15 Core Motivation

Treat onboarding as self-reported profile/preferences, NOT observed mastery.

Create profile history when profile fields change where required.

Implement validation:
- exactly four active JAMB subjects;
- English locked/compulsory;
- no duplicate subject;
- valid enum values;
- appropriate required fields.

Do not calculate mastery from onboarding answers.

Acceptance:
- signup/login flows work;
- protected routes require authentication;
- onboarding persists correctly;
- student profile is created once;
- profile updates are auditable;
- invalid subject combinations are rejected.

STOP after testing.
PROMPT 4 — JAMB CONFIGURATION, TAXONOMY & CONTENT FOUNDATION
Implement Phase 4: JAMB Configuration, Exam Configuration and Taxonomy foundation.

Build:
- active JAMB subject configuration;
- exam configuration records;
- English compulsory rule;
- three additional selected subjects;
- taxonomy versioning;
- syllabus area/topic/subtopic/learning objective/concept hierarchy.

The taxonomy hierarchy is:
Subject → Syllabus Area → Topic → Subtopic → Learning Objective → Concept.

The complete taxonomy must be derived from authoritative JAMB syllabus material. Preserve source wording/provenance alongside normalized SABI terminology.

Do NOT fabricate a complete syllabus taxonomy from general knowledge.

If authoritative source material is not yet available in the project, create the ingestion/import structure and clearly report:
OPEN CONTENT INPUT — authoritative JAMB syllabus required.

Acceptance:
- taxonomy versioning exists;
- subject relationships are valid;
- content can be retired/versioned without deleting historical learning evidence;
- exam configurations are data-driven rather than hard-coded.

STOP if source taxonomy is unavailable.
PROMPT 5 — QUESTION BANK, VERSIONS & QUALITY PIPELINE
Implement Phase 5: Question Bank, Question Versions and Quality Controls.

Build question management around:
- questions;
- question_options;
- question_versions;
- question_reports;
- provenance;
- status;
- difficulty;
- taxonomy mappings.

Backend must own the authoritative answer key.

Question versioning must preserve historical evidence even if the question is later edited or retired.

Implement quality states and hard filters needed by selection:
- inactive/retired;
- flagged;
- broken;
- duplicate;
- unavailable;
- wrong subject/combination;
- overexposed.

Create ingestion/validation structures, but do not invent a source corpus or copyrighted question bank.

Validation should detect:
- missing answer key;
- duplicate option keys;
- invalid correct option;
- missing taxonomy mapping;
- malformed question;
- missing provenance;
- invalid difficulty/status.

Create tests for answer-key authority and version integrity.

STOP after the quality pipeline is testable.
PROMPT 6 — SESSION ENGINE & CANONICAL LEARNING EVENTS
Implement Phase 6: Sessions and the canonical learning-event layer.

Implement session lifecycle for:
DIAGNOSTIC
SMART_PRACTICE
BLITZ
CUSTOM_PRACTICE
CBT

Sessions must support creation, resume, question ordering/state, completion and safe failure recovery.

Implement canonical events:
question_viewed
answer_selected
answer_submitted
answer_changed
explanation_opened
explanation_completed
question_skipped
recovery_answer_submitted
cbt_answer_submitted
recommendation lifecycle events
session_completed

Event rules:
- answer_submitted is learning evidence;
- recovery_answer_submitted is recovery evidence;
- cbt_answer_submitted is learning + exam-performance evidence;
- question_viewed/answer_selected/explanation events do not directly update mastery;
- session_completed does not directly update mastery.

Correctness MUST be calculated server-side from the authoritative question version.

Events are append-only. Do not overwrite raw evidence.

Acceptance:
- session state transitions are deterministic;
- duplicate submissions are safely handled;
- events are immutable;
- backend correctness cannot be spoofed by the client.

STOP after integration tests.
PROMPT 7 — MASTERY & SYLLABUS COVERAGE
Implement Phase 7: Mastery and Coverage.

Mastery definition:
SABI's current estimate of a student's ability to correctly handle questions testing a specific syllabus learning objective under the conditions represented by available evidence.

Implement a deterministic V1 engine. Do NOT use an LLM.

Evidence should account for:
- correctness;
- difficulty;
- recency;
- repetition;
- question diversity;
- consistency;
- recovery performance;
- session diversity.

Rules:
- repeated identical questions are weaker evidence than varied questions testing the same concept;
- one correct answer must not cause a huge jump;
- one wrong answer must not destroy established mastery;
- difficulty affects evidence strength;
- recency matters;
- mastery and confidence are separate;
- algorithm version must be stored.

Coverage is separate from mastery. Proposed coverage states:
UNSEEN → EXPOSED → INITIAL → SUFFICIENT → ESTABLISHED.

If exact formula/thresholds remain OPEN, do not silently turn a proposed formula into a permanent product decision. Implement the engine behind a versioned configuration/algorithm boundary and clearly mark the chosen V1 calibration parameters.

Create tests using simulated student trajectories:
- cold start;
- repeated correct;
- repeated incorrect;
- recovery;
- mixed difficulty;
- varied questions;
- recency.

STOP after calibration tests.
PROMPT 8 — QUESTION SELECTION ENGINE
Implement Phase 8: Next-Question Selection.

Goal:
Given everything SABI currently knows, select the most useful next question for the current learning context.

Hard filters:
- inactive/retired;
- flagged;
- broken;
- duplicate;
- unavailable;
- wrong combination;
- overexposed.

Selection factors:
- learning need;
- difficulty fit;
- syllabus value;
- recovery value;
- novelty;
- reinforcement;
- balance;
- overexposure control.

Behaviour:
- low mastery + low confidence → validation/reinforcement;
- low mastery + high confidence → remediation;
- repeated errors → reduce difficulty or trigger prerequisite/recovery;
- recovery → prefer a different question testing the same concept;
- cold start → onboarding + diagnostic + deterministic heuristics;
- observed evidence increasingly replaces assumptions.

Conceptual score:
Learning Need + Difficulty Fit + Syllabus Value + Recovery Value + Novelty + Reinforcement + Balance − Overexposure.

Exact weights must be configurable/versioned rather than scattered through the code.

Smart Practice and Blitz may use different weights, but they share the same selection infrastructure.

LOCKED BLITZ RULE:
Response speed is NOT used for XP, streaks, difficulty, selection, mastery or recommendations.

Every selection decision must be auditable in question_selection_logs.

Create deterministic tests and edge-case tests.

STOP after selection is reproducible and explainable.
PROMPT 9 — RECOMMENDATION ENGINE
Implement Phase 9: Recommendation Engine.

Recommendations must be generated from deterministic evidence, not an LLM.

Inputs:
- learning state;
- mastery/confidence;
- recent activity;
- strengths/weaknesses;
- available study time;
- exam timeline;
- recent sessions.

Core actions:
Strengthen
Learn
Review
Maintain
Challenge
Simulate

Every recommendation contains:
- action;
- target;
- reason;
- priority;
- estimated duration;
- evidence;
- expiry.

Missed recommendations recalculate instead of accumulating as a backlog.

Recommendations expire or are superseded.

Measure recommendation effectiveness through lifecycle events.

Conceptual priority:
Learning Need × Evidence Confidence × Syllabus Importance × Urgency × Expected Benefit.

Keep the formula versioned/configurable until finalized.

AI may explain a structured recommendation later, but AI must not invent or rank recommendations.

Create tests for:
- weak area;
- strong area;
- urgent exam timeline;
- limited study time;
- stale recommendation;
- recommendation completion;
- recommendation failure.

STOP after deterministic tests pass.
PROMPT 10 — JAMB READINESS ENGINE
Implement Phase 10: JAMB Readiness.

Readiness is a learning-system state, not an admission decision and not a guaranteed JAMB score prediction.

Dimensions:
- mastery;
- syllabus coverage;
- CBT performance;
- confidence/evidence reliability;
- exam timeline.

Use gates plus scoring rather than a naive average.

Proposed states:
INSUFFICIENT EVIDENCE
BUILDING
DEVELOPING
ON TRACK
STRONG

Exact thresholds must remain versioned/configurable.

A student with high mastery but insufficient syllabus coverage must remain coverage-building.

Identify a bottleneck:
- coverage;
- mastery;
- consistency;
- CBT performance;
- confidence/evidence;
- specific subject/area.

Support subject-level and syllabus-area readiness.

Store readiness history.

Create tests for:
- insufficient evidence;
- high mastery/low coverage;
- broad coverage/low mastery;
- good practice/weak CBT;
- strong CBT/weak subject;
- changing exam timeline.

STOP after tests.
PROMPT 11 — SMART PRACTICE
Implement Phase 11: Smart Practice.

Smart Practice is SABI-selected adaptive learning.

Requirements:
- use the central mastery/coverage/selection/recommendation state;
- select the next useful question;
- provide a clear reason internally for selection;
- record canonical events;
- update learning evidence after answers;
- support explanation after submission;
- support recovery when repeated errors indicate a need;
- session stopping logic must be based on learning value/session target, not an invented fixed session length.

Do not let the frontend calculate mastery or recommendation logic.

Smart Practice must work from cold start after onboarding/diagnostic and then increasingly use observed evidence.

Do not hard-code arbitrary session length if the final stopping policy remains OPEN. Implement a configurable stopping boundary.

Test:
- cold start;
- known weak area;
- established mastery;
- repeated error;
- recovery;
- session completion;
- recommendation handoff.

STOP after the core adaptive loop is working.
PROMPT 12 — BLITZ
Implement Phase 12: Blitz.

Blitz is a separate rapid personalized experience.

LOCKED:
- no setup;
- no fixed session length;
- one question at a time;
- stop anytime;
- personalized question feed;
- speed is explicitly NOT an intelligence/reward signal.

Do NOT implement:
- speed bonus;
- speed XP;
- speed streak;
- speed-based difficulty;
- speed-based question selection;
- speed-based mastery;
- speed-based recommendations.

Response time may exist as ordinary product/session telemetry if useful, but it must not become a hidden learning or reward signal.

Blitz may use different selection weights from Smart Practice while sharing the same selection infrastructure.

Test:
- personalized feed;
- no setup flow;
- stop anytime;
- cross-session continuity;
- repeated-question controls;
- explicit absence of speed influence.

STOP after tests.
PROMPT 13 — CUSTOM PRACTICE
Implement Phase 13: Custom Practice.

Configuration:
- subject;
- topic/subtopic;
- origin;
- number of questions;
- instant feedback;
- show explanation;
- randomize;
- timed session.

Example:
Mathematics → Surds → 2018–2024 → 20 questions.

Custom Practice is student-controlled and is NOT Blitz.

It must still use:
- authoritative answer keys;
- canonical learning events;
- central learning state;
- question-quality filters;
- versioned mastery updates after qualifying evidence.

Validate configuration before session creation.

Do not allow a student to bypass subject-combination rules where the product requires them.

Test:
- valid configuration;
- invalid configuration;
- topic filtering;
- origin filtering;
- count;
- timed/untimed;
- instant feedback;
- explanation settings;
- event recording.

STOP after integration tests.
PROMPT 14 — CBT EXAM SIMULATOR
Implement Phase 14: Strict JAMB CBT Simulator.

LOCKED:
Full Mock = 180 questions / 120 minutes.
Quick Mock = 40 questions / 30 minutes.
English compulsory/locked + three selected subjects.
Strict timer.
Navigator.
Review flag.
Eligible calculator where configured.
No hints.
No AI Coach.
No explanations during active exam.
Two-step submission.
Timer expiry auto-submit.

CBT score is historical exam performance, NOT mastery.

CBT results feed learning evidence and recommendations after completion.

Implement secure exam state:
- server-backed session;
- authoritative question set;
- timer integrity;
- answer state;
- review state;
- submission state;
- auto-submit;
- idempotent finalization.

Do not trust client-reported correctness or final score.

Subject distribution must be driven by approved exam configuration rather than arbitrary frontend constants.

Create tests for:
- timer;
- expiry;
- manual submission;
- double submission;
- navigator;
- review flags;
- answer changes;
- calculator configuration;
- AI disabled during active CBT;
- result generation;
- evidence handoff after completion.

STOP after CBT integration tests pass.
PROMPT 15 — AI COACH + RAG
Implement Phase 15: AI Coach + RAG.

Use the SABI AI + RAG Implementation Specification as the authority.

Architecture:
Structured student evidence + recommendation + question context
→ AI Service
→ retrieval/knowledge layer
→ grounded explanation/teaching response.

AI responsibilities:
- explain;
- teach;
- clarify;
- coach;
- personalize language and depth.

AI must NOT:
- calculate mastery;
- calculate coverage;
- calculate readiness;
- invent recommendations;
- select the next question;
- determine correctness;
- override answer keys;
- operate during an active CBT exam.

RAG corpus should support:
- authoritative JAMB syllabus;
- approved SABI content;
- reviewed explanations;
- worked examples;
- misconceptions;
- reviewed question explanations;
- prerequisites.

Retrieval must be taxonomy-aware:
Subject → Syllabus Area → Topic → Subtopic → Learning Objective → Concept.

Store AI interaction metadata including prompt version, model/version, retrieval context, response status and usage where supported.

Implement fallback behaviour when retrieval or generation is unavailable. AI failure must not break core learning flows.

AI credits must be enforced through the centralized entitlement/credit boundary.

Do not hard-code a model provider into domain logic. Keep model routing abstract.

Test:
- grounded explanation;
- missing retrieval context;
- AI failure;
- answer-key conflict;
- credit exhaustion;
- active CBT prohibition;
- audit record.

STOP after grounding/fallback tests.
PROMPT 16 — GAMIFICATION, ENTITLEMENTS, PAYMENTS & AI CREDITS
Implement Phase 16: Gamification, Commercial Entitlements, Payments and AI Credits.

Gamification:
- correct answers earn base XP;
- incorrect answers may earn small participation XP;
- session streak = consecutive correct answers;
- daily streak belongs to broader learning system;
- milestones/badges may reward useful learning behaviour and improvement;
- XP is not intelligence, mastery, readiness or exam score;
- Blitz speed is excluded.

Exact XP values, badge catalogue and anti-farming thresholds are OPEN. Keep them configurable/versioned.

Commercial direction:
- Free;
- trial month;
- one-time unlock around ₦3,000–₦5,000;
- AI credits;
- school licences.

Do not invent the final entitlement matrix. Build centralized entitlement checks and configurable plan structures.

Payment requirements:
- provider transaction identity;
- idempotent confirmation;
- trusted-service confirmation;
- audit trail;
- no client-side payment confirmation as authority.

If a payment provider is not yet approved, build the provider abstraction and test adapter rather than silently choosing a permanent provider.

AI credits:
- auditable credit account;
- credit transactions;
- safe decrement/idempotency;
- no negative balance;
- entitlement-aware access.

STOP when the infrastructure is complete and OPEN commercial choices are clearly reported.
PROMPT 17 — ADMIN, ANALYTICS, NOTIFICATIONS, PARENT & SCHOOL
Implement Phase 17: Operational and secondary surfaces.

ADMIN / CONTENT QUALITY
Build safe operational foundations for:
- question review;
- reports;
- taxonomy/content review;
- audit logs;
- quality status;
- version management.

ANALYTICS
Keep product analytics and learning analytics conceptually separate.
Learning events remain the canonical evidence layer.
Recommendation effectiveness and question quality should be measurable.

Canonical analytics event naming remains configurable until finalized.

NOTIFICATIONS / BACKGROUND JOBS
Create a safe job framework for:
- recalculation;
- data validation;
- stale recommendation handling;
- notification delivery;
- maintenance tasks.

Exact schedules and notification timing are OPEN; do not invent permanent cadences.

PARENT
Parent uses the same central learning engine.
Future visibility should focus on:
- activity;
- sessions;
- subjects;
- syllabus coverage;
- mastery trends;
- strong/focus areas;
- CBT performance;
- readiness;
- consistency;
- recommendations;
- meaningful alerts;
- milestones.

Parent should NOT receive:
- every answer;
- private AI interactions;
- constant surveillance.

Parent-child linking must not require password sharing.

SCHOOL
School architecture uses role/cohort permissions over the same evidence model.

Final parent/school/admin permissions are OPEN. Implement clean service boundaries and safe placeholders rather than guessing.

ML
Prepare event/feature boundaries but do not introduce ML into production decision paths. ML ships only after beating the deterministic baseline.

STOP after the operational foundations are tested.
PROMPT 18 — QA, SECURITY HARDENING, CALIBRATION, PILOT & LAUNCH
Implement Phase 18: Final QA, Security Hardening, Calibration, Pilot and Launch readiness.

Use the SABI QA, Testing & Deployment Specification as the authority.

Run:
UNIT TESTS
- mastery;
- coverage;
- selection;
- recommendations;
- readiness;
- gamification;
- entitlement logic.

INTEGRATION TESTS
- Supabase/database;
- RLS;
- authentication;
- sessions/events;
- CBT;
- AI/RAG;
- payments/entitlements.

END-TO-END TESTS
- signup;
- onboarding;
- diagnostic;
- Smart Practice;
- Blitz;
- Custom Practice;
- CBT;
- results;
- progress;
- readiness.

SECURITY
- RLS ownership;
- privilege escalation;
- service-role exposure;
- secret handling;
- API authorization;
- cross-student data access;
- payment webhook integrity;
- idempotency.

CALIBRATION
- simulated student trajectories;
- mastery stability;
- question-selection behaviour;
- recommendation consistency;
- readiness transitions;
- question quality.

PERFORMANCE
- database query performance;
- concurrent sessions;
- CBT reliability;
- AI latency/failure isolation;
- safe retries.

PRODUCTION GATES
Do not declare launch-ready until:
- migrations are reproducible;
- locked decisions are represented correctly;
- OPEN decisions are resolved or explicitly configurable;
- answer keys are verified;
- taxonomy mappings are reviewed;
- mastery is calibrated;
- selection/recommendations are auditable;
- CBT timer/submission/expiry are tested;
- AI grounding/fallback are tested;
- payments/webhooks are tested;
- analytics events are validated;
- backups/monitoring/logging are configured;
- frontend/backend end-to-end tests pass.

PILOT
Prepare a controlled pilot environment before broad launch. Record issues and fixes without destroying historical evidence.

FINAL OUTPUT
Produce a launch-readiness report containing:
1. implemented modules;
2. tested modules;
3. unresolved OPEN decisions;
4. known risks;
5. failed tests, if any;
6. production configuration requirements;
7. migration status;
8. security status;
9. pilot status;
10. explicit launch blockers.

Do not call the product production-ready merely because the build succeeds.

STOP after the launch-readiness report.
WHAT IS ALREADY DONE VS WHAT THIS BOOK COMPLETES
Completed source-of-truth documents
Master Product Specification — product architecture, UX, core experiences, onboarding and locked decisions.
Technical Implementation Specification — database, services, event contract, mastery, selection, recommendations, readiness, CBT, security and implementation order.
Frontend Implementation Specification — 15 screens, routes, components, states and frontend/backend boundaries.
AI + RAG Implementation Specification — AI Coach, RAG, grounding, retrieval, credits and AI boundaries.
QA, Testing & Deployment Specification — test strategy, release gates, pilot and launch.
The remaining major artifact
This document is that remaining artifact: the executable Google AI Studio prompt sequence. It is not a replacement for the five specifications. It is the implementation layer that sits below them.
What still remains during implementation
Resolve technical OPEN decisions when the corresponding phase reaches them.
Supply/import authoritative JAMB syllabus material and approved question content.
Finalize exact mastery calibration parameters and thresholds.
Finalize exact recommendation ranking parameters.
Finalize Smart Practice stopping/session policy.
Finalize commercial entitlement matrix and payment provider.
Finalize parent/school/admin permission model.
Finalize canonical analytics event naming and ML architecture.
Finalize notification schedules and background-job cadence.
Finalize XP/badge economy.
Run calibration, pilot and production launch gates.
Prompt execution checklist
☐ Prompt 0 loaded and accepted by Google AI Studio
☐ Prompt 1 foundation complete
☐ Prompt 2 database/RLS complete
☐ Prompt 3 authentication/onboarding complete
☐ Prompt 4 JAMB taxonomy foundation complete
☐ Prompt 5 question bank/quality complete
☐ Prompt 6 sessions/events complete
☐ Prompt 7 mastery/coverage complete
☐ Prompt 8 question selection complete
☐ Prompt 9 recommendations complete
☐ Prompt 10 readiness complete
☐ Prompt 11 Smart Practice complete
☐ Prompt 12 Blitz complete
☐ Prompt 13 Custom Practice complete
☐ Prompt 14 CBT complete
☐ Prompt 15 AI/RAG complete
☐ Prompt 16 gamification/commercial complete
☐ Prompt 17 admin/analytics/parent/school foundations complete
☐ Prompt 18 QA/pilot/launch gate complete
Final operating model
The implementation process is deliberately sequential: paste the current prompt into Google AI Studio, let the implementation environment execute that bounded phase, inspect its report, resolve blockers, and then proceed to the next prompt. The SABI specifications remain the source of truth; this prompt book is the execution path.

PART VIII — QA, TESTING & DEPLOYMENT
Source document: SABI_QA_Testing_Deployment_Specification_v1.docx
SABI
QA, TESTING & DEPLOYMENT SPECIFICATION
Version 1.0 • September 2026
Quality, calibration, security verification and production launch blueprint.
1. Document Purpose
This document defines how SABI is verified before production launch. It covers deterministic domain logic, database behavior, RLS, learning engines, CBT, AI/RAG, payments and entitlements, analytics, frontend/backend integration, calibration, monitoring and deployment.
It is the final quality gate after the Product, Technical, Frontend and AI/RAG specifications. Tests must verify approved behavior without turning OPEN decisions into hidden requirements.
2. Quality Principles
Test the system as a learning platform, not only as a collection of screens.
Trust-sensitive logic is verified at the backend/database boundary.
Raw learning events remain preserved and reproducible.
Deterministic learning algorithms must be reproducible for the same inputs and algorithm version.
AI is tested for grounding and boundary compliance, not treated as an authoritative learning-state calculator.
Payment and entitlement operations must be idempotent.
Security tests must prove users cannot read or mutate data outside their authorized scope.
Production deployment requires passing critical-path tests and resolving launch-blocking defects.
3. Test Levels
3.1 Unit tests
Pure domain calculations.
Mastery update logic.
Coverage state transitions.
Question-selection scoring and filters.
Recommendation ranking/lifecycle.
Readiness gates and bottleneck logic.
Session state transitions.
Entitlement checks.
XP transaction logic.
Input validation.
3.2 Integration tests
Service-to-database behavior.
Authentication and profile creation.
Session creation/resume/completion.
Learning event persistence.
Mastery updates after answer submission.
Recommendation invalidation/recalculation.
CBT timer and submission behavior.
AI retrieval and interaction logging.
Payment confirmation and entitlement creation.
3.3 End-to-end tests
Test the real student journey through the integrated product.
Sign up/login.
Complete onboarding.
Complete diagnostic.
Reach JAMB Prep Home.
Start Smart Practice.
Answer questions and receive feedback.
View explanation.
Observe progress/mastery update.
Receive recommendation.
Use Blitz.
Use Custom Practice.
Start and complete Quick Mock.
Start and complete Full Mock.
View CBT results.
View readiness.
Use AI explanation.
Exercise entitlement/payment paths.
4. Database and Migration Tests
Every migration applies successfully to a clean environment.
Every migration can be applied in the intended order.
Foreign-key relationships reject invalid references.
Unique constraints reject duplicate business identities.
Historical question evidence survives question retirement.
Question versions remain reproducible.
Event records are append-only according to the approved contract.
Algorithm-version fields are populated where required.
Seed/reference data is valid and internally consistent.
Rollback/recovery procedure is tested where supported.
Critical baseline constraints include unique student profile per user, unique student-subject pairing, unique question option keys, unique question versions, unique mastery entity state, and unique provider transaction identifiers.
5. Authentication and Authorization Tests
Phone + OTP flow.
Email + password flow.
Google sign-in flow.
Expired/invalid sessions.
Access to protected routes without authentication.
Ownership checks for student data.
Role boundary checks.
Privileged service credentials are never exposed to the client.
6. RLS and Security Tests
RLS is not considered verified because a route guard exists. The database boundary must be tested directly.
Student can read only authorized student-owned data.
Student cannot modify mastery.
Student cannot modify readiness.
Student cannot modify recommendations.
Student cannot modify question correctness.
Student cannot modify answer keys.
Student cannot modify XP balance.
Student cannot modify entitlement status.
Student cannot confirm payment.
Unauthorized users cannot access another student's sessions/events.
Parent access follows the approved relationship and permission model.
School access follows approved cohort/role permissions.
Admin/privileged operations are restricted.
Parent, school and admin permission details remain OPEN until explicitly finalized; tests must not invent those permissions.
7. Learning Event Tests
Canonical event behavior must be verified.
question_viewed is stored but is not direct mastery evidence.
answer_selected is stored but is not direct mastery evidence.
answer_submitted is learning evidence.
answer_changed is an exam-behavior signal rather than direct mastery evidence.
explanation_opened is not direct mastery evidence.
explanation_completed is not direct mastery evidence.
question_skipped is not direct mastery evidence.
recovery_answer_submitted is learning evidence.
cbt_answer_submitted is learning and exam-performance evidence.
recommendation lifecycle events measure recommendation effectiveness.
session_completed is session/analytics state, not direct mastery evidence.
8. Answer Submission Tests
Every answer submission should follow the approved sequence:
Authenticate user.
Validate session ownership and active state.
Validate question belongs to session.
Load authoritative question version.
Compare answer against authoritative answer key.
Persist interaction.
Append learning event.
Update mastery/confidence.
Update coverage.
Recalculate/invalidate affected recommendations where required.
Return the next permitted action/question/result.
Test that the frontend cannot submit a fabricated correctness value.
9. Mastery Calibration
Mastery is a high-risk learning-system component and requires calibration before production.
Use simulated student trajectories.
Test repeated correct answers.
Test repeated incorrect answers.
Test alternating correct/incorrect performance.
Test easy/medium/hard evidence.
Test repeated identical questions versus varied questions.
Test recovery performance.
Test clustered versus spaced evidence.
Test low-confidence cold-start states.
Test established mastery resilience.
Test algorithm-version reproducibility.
The exact mastery formula, prior, confidence calculation and thresholds remain OPEN until approved. QA must therefore validate the approved implementation once those values are finalized rather than inventing them.
10. Coverage Tests
Coverage must remain separate from mastery.
Unseen content remains UNSEEN until evidence/exposure rules say otherwise.
Exposure can increase coverage without implying mastery.
High mastery with insufficient syllabus evidence does not become fully covered automatically.
Coverage state transitions are deterministic and versioned.
Historical coverage remains reconstructable.
11. Question Selection Tests
Inactive/retired questions are filtered.
Flagged/broken questions are filtered.
Wrong subject-combination questions are filtered.
Over-exposed questions are controlled.
Selection respects taxonomy compatibility.
Recovery prefers different questions testing the same concept where available.
Selection remains auditable through question_selection_logs.
Cold-start behavior works without extensive observed evidence.
Smart Practice and Blitz can use different scoring weights.
Blitz never uses speed as selection input.
Exact selection weights remain OPEN until approved.
12. Recommendation Tests
Recommendations always map to concrete actions.
Recommendation types are valid: Strengthen, Learn, Review, Maintain, Challenge, Simulate.
Recommendations contain target, reason, priority, duration and evidence.
Expired recommendations no longer behave as active recommendations.
Superseded recommendations are handled correctly.
Missed recommendations do not create uncontrolled backlog.
Recommendation lifecycle events are recorded.
AI explanations cannot create recommendations independently.
13. Readiness Tests
Readiness uses mastery, coverage, CBT performance, confidence/evidence reliability and exam timeline.
High mastery with low coverage is not treated as fully ready.
Subject-level and syllabus-area states can be represented.
Primary bottleneck is returned when evidence supports one.
Readiness history is stored.
Readiness never claims admission eligibility.
Readiness never guarantees a JAMB score.
Exact readiness thresholds are tested only after they are approved.
14. Smart Practice Tests
Recommendation can open the appropriate practice target.
SABI can select the initial question.
Next question can respond to newly generated evidence.
Recovery behavior works.
Student can stop safely.
Session state persists.
Stopping logic does not depend on an invented fixed question count.
Session results are consistent with stored events.
AI failure does not break practice.
15. Blitz Tests
No setup is required.
One question is delivered at a time.
Student can stop at any point.
No fixed session length is assumed.
Correct answers generate approved XP behavior.
Session streak is separate from daily streak.
Anti-farming controls work once approved.
Speed is not used for XP, streaks, difficulty, selection, mastery or recommendations.
Blitz evidence can update mastery and recommendations.
Repeated questions are controlled.
16. Custom Practice Tests
Student configuration is validated server-side.
Subject/topic/subtopic/origin/count settings are respected.
Instant feedback setting is respected.
Explanation visibility setting is respected.
Randomization setting is respected.
Timed-session setting behaves correctly where supported.
Custom Practice does not silently become Smart Practice.
17. CBT Tests
Full Mock = 180 questions / 120 minutes.
Quick Mock = 40 questions / 30 minutes.
English is compulsory plus three selected subjects.
Question set becomes fixed after exam creation/start according to the approved configuration.
Server-authoritative timer works.
Timer persists through refresh/reconnection.
No normal pause stops exam time.
Navigator states are correct.
Review flags persist.
Answers can be changed before final submission.
No hints, AI Coach or explanations during active CBT.
Two-step manual submission works.
Timer expiry auto-submits.
Submission is idempotent.
Final result uses the authoritative question version.
Historical result remains reproducible after question changes.
18. AI/RAG Tests
18.1 Retrieval
Relevant knowledge is retrieved for the correct subject/topic/concept.
Inactive or unapproved knowledge is excluded.
Source/version provenance is preserved.
Taxonomy-aware retrieval works.
Insufficient retrieval is detected.
18.2 AI boundary
AI does not calculate mastery.
AI does not calculate readiness.
AI does not create recommendations.
AI does not select questions.
AI does not override answer keys.
AI does not assist during active CBT.
18.3 Grounding
Explanations are grounded in retrieved knowledge where required.
Unsupported claims trigger fallback/controlled behavior.
Malformed AI output is rejected or safely handled.
Prompt and model versions are logged.
AI failure does not corrupt learning state.
19. Gamification Tests
XP events are auditable.
XP balance cannot be directly changed by the student.
Correct-answer XP follows approved values.
Participation XP, if enabled, follows approved values.
Session streak counts consecutive correct answers.
Daily streak follows the broader learning system.
XP never appears as mastery/readiness/JAMB score.
Blitz speed is never used for rewards.
Exact XP values, badge catalogue and anti-farming thresholds remain OPEN.
20. Payments and Entitlement Tests
Successful payment creates the correct commercial record.
Payment confirmation is trusted-service state.
Duplicate provider callbacks do not create duplicate entitlements.
Transaction identifiers are unique.
Expired entitlements stop protected access correctly.
One-time unlock behavior follows approved plan rules.
Trial behavior follows approved rules.
AI credit transactions are auditable.
Frontend cannot confirm payment.
Frontend cannot directly grant entitlements.
Exact plan matrix, limits, durations and payment provider remain OPEN.
21. AI Credit Tests
Insufficient credits block protected AI actions.
Successful AI usage produces the correct transaction record.
Failed AI calls do not incorrectly consume credits unless the approved policy explicitly says otherwise.
Repeated requests do not duplicate usage accounting.
Balance cannot be manipulated from the client.
22. Performance and Reliability
Measure API latency for core student flows.
Measure question retrieval/selection latency.
Measure answer-submission latency.
Measure CBT state retrieval under load.
Measure RAG retrieval and AI response latency.
Test concurrent student sessions.
Test reconnect/resume behavior.
Test background-job execution under load.
Monitor database connection and query performance.
Identify slow queries and add approved indexes rather than guessing indexes.
Exact production performance targets remain OPEN until approved.
23. Data Integrity and Recovery
Backups are configured before production.
Database restore procedure is tested.
Raw events remain preserved.
Question versions remain recoverable.
Historical results remain reproducible.
Algorithm changes do not silently rewrite raw evidence.
Approved mastery backfills are versioned and auditable.
Payment records remain auditable.
24. Analytics Validation
Canonical learning events are emitted correctly.
Product analytics and learning analytics remain conceptually separate.
Recommendation effectiveness events are complete.
Question quality/performance signals are captured.
Analytics aggregation does not mutate canonical learning evidence.
Event versions are tracked.
Canonical event naming and warehouse/feature architecture remain OPEN.
25. Observability
Production should expose enough information to detect failures without exposing unnecessary student data.
Application error logs.
Database errors.
API latency.
Background-job failures.
Payment webhook failures.
AI model/retrieval failures.
RLS/security anomalies.
Session completion failures.
Question-quality reports.
Critical business metrics.
26. Production Monitoring
Monitor at minimum:
Authentication failures.
Practice session creation failures.
Answer submission failures.
CBT submission/expiry failures.
Recommendation job failures.
Mastery calculation failures.
AI failure/fallback rate.
Payment confirmation failures.
Entitlement mismatches.
Database health.
Error rates and latency.
27. Environment Strategy
🔵 PROPOSED environment separation:
Local/development — active implementation and unit/integration development.
Staging — production-like integration and release validation.
Production — live student environment.
Production credentials and privileged service credentials must never be used casually in development.
28. Release Gates
A release should not proceed when a critical security, data-integrity, payment, CBT, or learning-state defect remains unresolved.
Migration checks pass.
Authentication checks pass.
RLS/security tests pass.
Core learning flow passes.
Mastery calibration passes for the approved algorithm.
Question selection invariants pass.
Recommendation consistency passes.
CBT timer/submission/expiry tests pass.
AI grounding/fallback tests pass.
Payment/entitlement idempotency tests pass.
End-to-end critical path passes.
Backups/monitoring/logging are configured.
29. Pilot / Calibration Phase
Before broad launch, SABI should run a controlled pilot.
Use representative student interaction patterns.
Observe question quality and taxonomy mapping.
Review mastery trajectories.
Review recommendation usefulness.
Review readiness behavior.
Review CBT behavior.
Review AI grounding and explanations.
Collect product usability feedback.
Record defects and decision changes.
Do not use pilot observations to silently alter locked architecture; update the decision record when a product decision genuinely changes.
30. Launch Sequence
Freeze approved schema and migrations.
Run clean-environment migration test.
Seed verified reference data.
Verify JAMB taxonomy/content mappings.
Run automated test suite.
Run security/RLS suite.
Run learning-engine calibration suite.
Run AI/RAG grounding suite.
Run payment/entitlement suite.
Run end-to-end staging suite.
Verify backups and restore.
Verify monitoring and alerts.
Deploy production backend.
Verify production smoke tests.
Deploy frontend.
Run production smoke tests.
Open controlled access.
Monitor launch health.
Expand access after launch criteria are met.
31. Production Smoke Test
Immediately after deployment, verify:
User can authenticate.
New student can complete onboarding.
Diagnostic can start and submit.
Smart Practice can start and submit an answer.
Mastery evidence is recorded.
Recommendation can be retrieved.
Blitz can start and stop.
Custom Practice can start.
Quick Mock can start and complete.
CBT timer behaves correctly.
AI explanation can be requested where entitled.
Entitlement state is correctly enforced.
Analytics/event pipeline is functioning.
32. Incident Handling
When a production incident occurs:
Identify affected service.
Protect student data and trust-sensitive state.
Stop or isolate unsafe operations if required.
Record incident evidence.
Restore service or roll back the affected release where appropriate.
Verify data integrity.
Run targeted regression tests.
Document root cause and corrective action.
Update the decision/implementation record if the incident reveals a genuine requirement change.
33. Definition of Done
A SABI feature is DONE only when:
Approved product behavior is implemented.
Backend contract is implemented.
Frontend behavior is implemented.
Relevant deterministic logic is tested.
RLS/authorization is tested where applicable.
Analytics/events are validated.
Error/loading/empty states are handled.
AI behavior is grounded and bounded where applicable.
Regression tests pass.
Documentation reflects the implementation.
OPEN decisions remain explicitly OPEN or have been formally approved.
34. Final Launch Checklist
Product specification aligned.
Technical specification aligned.
Frontend specification aligned.
AI/RAG specification aligned.
Database migrations reproducible.
RLS verified.
JAMB taxonomy verified.
Question bank quality verified.
Mastery calibrated.
Selection audited.
Recommendations audited.
Readiness validated.
Smart Practice tested.
Blitz tested.
Custom Practice tested.
CBT tested.
AI/RAG grounded.
Payments/webhooks/idempotent.
Entitlements verified.
Analytics validated.
Backups/monitoring/logging active.
End-to-end tests passing.
35. Final Principle
SABI is ready to launch when the system can reliably turn student interactions into trustworthy evidence, turn evidence into controlled learning-state updates, turn those states into useful actions, and deliver those actions through a secure and observable product.
Quality is not simply that the screens work. Quality means the learning system remains correct, explainable, auditable, secure and reproducible.

PART IX — ADMIN CONTROL PLANE ARCHITECTURE
Source document: SABI_Admin_Control_Plane_Specification_v1.docx
SABI
ADMIN CONTROL PLANE SPECIFICATION
Version 1.0 • September 2026
Master Admin operations, control, observability and AI operations architecture
DOCUMENT STATUS
Item
Status
Purpose
New specification extending the existing SABI backend and frontend architecture
Relationship to existing architecture
Extension; not a replacement
Primary administrator
MASTER_ADMIN
Admin surface
Dedicated Admin Portal / Control Center
Admin AI
LOCKED as a first-class Admin Portal capability
AI provider architecture
LOCKED provider/model abstraction; SABI must not depend on Gemini
Source hierarchy
Existing SABI source-of-truth documents remain authoritative unless this document records a later decision

1. PURPOSE
This document defines the SABI Admin Control Plane: the secure operational system through which the Master Admin can operate, inspect, configure and troubleshoot SABI without routinely accessing the database or application source code.
The Admin Control Plane extends the existing SABI Admin Service, Analytics Service, Commercial Service, Payment Service, AI Service, background-job framework, audit/logging foundations and security boundaries. It must reuse existing contracts where possible and add only the capabilities required by this specification.
2. SOURCE-OF-TRUTH RELATIONSHIP
The existing SABI Master Product Specification, Technical Implementation Specification, Frontend Implementation Specification, AI + RAG Implementation Specification, QA/Testing/Deployment Specification and backend implementation prompt book remain the existing source-of-truth materials. This document adds the Admin Control Plane requirements that were not sufficiently detailed there.
Where a later decision in this document conflicts with an earlier OPEN decision, this document records the newer decision. It must not silently override an existing LOCKED product decision.
Decision language
Marker
Meaning
🔒 LOCKED
Approved requirement in this Admin Control Plane specification. Do not silently change.
🔵 PROPOSED
Recommended implementation approach; may be adjusted if it does not create a material product/security decision.
🟡 OPEN
Not finalized. Do not invent a permanent behavior.
🔴 CHANGED
A later decision has replaced an earlier decision; implementation must preserve the newer decision.

3. CORE ADMIN PRINCIPLE
The Admin Portal is the operational control plane for SABI. The Master Admin should be able to perform normal operational work through the portal rather than directly editing database records or source code.
The portal must not become an unrestricted database editor. Every sensitive operation must pass through an authorized backend service/tool, validation, audit logging and—where appropriate—explicit confirmation.
4. HIGH-LEVEL ARCHITECTURE
SABI
│
├── Student Application
│
├── Admin Control Center
│   ├── Admin Dashboard
│   ├── Student Operations
│   ├── Payments & Entitlements
│   ├── Question & Content Operations
│   ├── Analytics
│   ├── CBT Operations
│   ├── AI & RAG Operations
│   ├── System Health
│   ├── Background Jobs
│   ├── Audit Logs
│   ├── Admin Users & Permissions
│   └── Settings
│
└── Shared SABI Backend
    ├── Identity
    ├── Learning Engine
    ├── Question Service
    ├── Session/Event Services
    ├── Mastery/Coverage/Selection/Recommendation/Readiness
    ├── AI Service
    ├── Commercial/Payment Services
    ├── Analytics
    ├── Notifications/Jobs
    └── Audit/Observability


5. ADMIN IDENTITY AND ROLES
🔒 LOCKED: The user's primary administrative role is MASTER_ADMIN.
The authorization model must be role-based and extensible. MASTER_ADMIN is the highest application-level administrative role.
Role
Status
Purpose
MASTER_ADMIN
🔒 LOCKED
Full operational administration subject to security controls and audit requirements.
ADMIN
🔵 PROPOSED
General administrative operations with explicitly assigned permissions.
CONTENT_MANAGER
🔵 PROPOSED
Question/content operations without unrestricted commercial/system access.
SUPPORT
🔵 PROPOSED
Student/account support operations with limited sensitive-data access.
ANALYST
🔵 PROPOSED
Read-only analytics and reporting.
SCHOOL_ADMIN
Existing future surface
School-scoped operations; not equivalent to platform admin.
PARENT
Existing future surface
Parent-scoped visibility.
STUDENT
Existing
Student application user.

Exact non-MASTER_ADMIN role permissions remain OPEN until the permission matrix is finalized. The implementation must not assume that all admin roles have MASTER_ADMIN privileges.
6. ADMIN SECURITY MODEL
Admin routes are protected by backend authorization; frontend route guards are not the final security boundary.
Privileged service credentials never reach the browser.
Administrative actions operate through trusted backend services/tools.
Cross-student access is authorized server-side.
Sensitive actions require explicit confirmation and/or recent re-authentication according to risk level.
Destructive operations require stronger confirmation than routine read operations.
Every privileged mutation creates an audit record.
Audit records must not be deletable through normal Admin Portal operations.
Administrative access itself must be observable.
RLS and API/service authorization must be tested for privilege escalation and cross-user access.
7. ADMIN CONTROL CENTER INFORMATION ARCHITECTURE
Dashboard
Students
Payments
Entitlements
Questions & Content
Learning Analytics
Product Analytics
CBT Operations
AI & RAG
AI Operations Assistant
System Health
Background Jobs
Notifications
Reports
Audit Logs
Admin Users & Permissions
System Settings
8. MASTER ADMIN DASHBOARD
The dashboard is the operational overview rather than a student-facing learning screen.
Total students
Active students
New registrations
Premium/paid students
Revenue and payment status
Active learning sessions
CBT activity
AI usage/credits
Failed payments/webhooks
Failed background jobs
Application errors
Question reports
System health
Items requiring administrator attention
The dashboard must link each alert/metric to the underlying operational view rather than showing disconnected decorative analytics.
9. STUDENT OPERATIONS
MASTER_ADMIN should be able to search and inspect a student through the Admin Portal without database access.
Search by supported account identifiers and profile fields.
View account/profile information allowed by the admin permission model.
View subject combination.
View onboarding profile.
View sessions and learning activity.
View mastery and confidence trends as calculated by the learning engine.
View syllabus coverage.
View recommendations and recommendation lifecycle.
View CBT history and results.
View readiness history.
View streaks and gamification state.
View subscription/payment/entitlement status.
View AI-credit usage and relevant AI interaction metadata subject to privacy rules.
Suspend/reactivate account where permitted.
Create administrative notes where supported.
View the student's relevant audit history.
Administrative overrides must not directly rewrite derived mastery/readiness/history. Exceptional corrections must use explicit versioned administrative operations with audit evidence.
10. PAYMENTS AND ENTITLEMENTS
The existing centralized Commercial and Payment services remain authoritative for payment and access state.
Normal flow:
Student payment → provider → trusted verification/webhook → payment transaction → entitlement service → access.
Admin fallback:
Master Admin → select student → select product/entitlement → choose authorized administrative action → reason → confirmation → entitlement service → audit log.
Required administrative capabilities:
View payment transactions and verification state.
Search payments by supported identifiers.
Investigate payment/entitlement mismatches.
View entitlement history.
Grant complimentary access.
Grant time-limited access.
Revoke an administrative entitlement where permitted.
View who granted/revoked access and why.
Never treat a frontend claim of payment as authoritative.
Do not silently modify immutable provider transaction identity.
🔒 LOCKED: Manual entitlement overrides are operational controls, not replacements for payment verification.
11. QUESTION AND CONTENT OPERATIONS
The existing question review/version/provenance architecture is extended into a complete administrative content console.
Search/filter questions.
Create/import questions through approved workflows.
Edit draft/question metadata.
Manage options and authoritative answer keys through controlled workflows.
Assign subject/taxonomy mappings.
Manage provenance.
Review reported questions.
View question performance.
Version questions.
Publish/retire/archive according to content status rules.
View quality/review status.
Inspect related explanations/knowledge content.
Bulk operations only where safe, validated and auditable.
Published historical evidence must survive question retirement or content changes.
12. ANALYTICS COMMAND CENTER
Learning analytics and product analytics remain conceptually separate, consistent with the existing architecture.
Learning analytics may include:
Question performance
Topic/subtopic performance
Mastery distributions
Coverage
Recommendation effectiveness
Recovery performance
CBT performance
Learning activity
Student trajectories
Product analytics may include:
Registration
Activation
Feature usage
Retention
Conversion
Entitlement usage
Payment activity
AI usage
Session/product funnels
Canonical analytics event naming remains an implementation decision until finalized. The portal must consume the canonical analytics layer rather than inventing a separate event system.
13. CBT OPERATIONS
Inspect active/recent CBT sessions subject to privacy and security permissions.
View exam configuration and session state.
Investigate failed session creation/finalization.
Inspect timer/submission errors through operational diagnostics.
View exam-result generation failures.
Do not provide a normal admin action that changes a student's historical CBT score without a versioned, audited correction workflow.
Do not weaken active-CBT security rules merely to simplify administration.
14. SYSTEM HEALTH AND OBSERVABILITY
The Admin Portal must expose operational health without exposing raw infrastructure credentials.
Health domains:
Authentication
Database
Learning services
Question service
CBT
Payments
Entitlements
AI service
RAG/retrieval
Background jobs
Notifications
Storage where applicable
The portal should surface failures, error frequency, recent incidents, job failures and affected operational areas. Exact observability vendor/stack remains OPEN unless already fixed elsewhere.
15. BACKGROUND JOBS AND OPERATIONS
View job status.
View recent failures.
Inspect safe error summaries.
Retry eligible jobs.
Prevent unsafe duplicate execution through idempotency.
View job history.
Trigger approved maintenance jobs.
Require confirmation for high-impact jobs.
Job scheduling remains configurable until exact production cadences are finalized.
16. ADMIN AI OPERATIONS ASSISTANT
🔒 LOCKED: The Admin Portal includes a first-class AI Operations Assistant.
The Admin AI is distinct from the Student AI Coach. Student AI explains and teaches. Admin AI operates within the administrative control plane.
Core operating modes:
Mode
Capability
Observe
Read authorized operational state and analytics.
Diagnose
Correlate logs, errors, service state and relevant records to explain an issue.
Propose
Prepare a recommended administrative or technical remediation.
Execute
Perform an authorized action through an explicit tool after required approval.
Verify
Check whether the requested action produced the expected outcome.

Example request: “Why are students unable to start CBT?” The Admin AI may inspect relevant errors, configuration, session creation state, job failures and affected records, then present evidence, diagnosis, proposed remediation and required approval.
17. ADMIN AI TOOL REGISTRY
The Admin AI must never receive arbitrary unrestricted database access.
Each tool must have:
Tool name
Description
Allowed role(s)
Risk level
Input schema
Validation rules
Required confirmation level
Execution service
Audit requirements
Expected result schema
Verification procedure
Rollback strategy where applicable
Enabled/disabled status
Initial tool families:
Student lookup/inspection
Student account operations
Payment investigation
Entitlement grant/revoke
Question inspection/review operations
Analytics queries
CBT diagnostics
Background-job inspection/retry
System health diagnostics
AI/RAG diagnostics
Notification operations
Report generation
18. ADMIN AI ACTION SAFETY
Risk
Example
Expected control
LOW
Read student status
Permission + audit/read record
LOW
View failed jobs
Permission + audit/read record
MEDIUM
Retry eligible job
Permission + validation + audit; confirmation where configured
MEDIUM
Grant 30-day complimentary access
Permission + reason + confirmation + audit
HIGH
Bulk entitlement change
Strong confirmation + scope preview + audit + verification
HIGH
Bulk content mutation
Strong confirmation + preview + audit + rollback/versioning where possible
CRITICAL
Security/RLS/schema/destructive operations
Human-only or restricted maintenance workflow; Admin AI may diagnose/propose but must not freely execute

Exact risk catalogue is 🔵 PROPOSED and must be finalized during implementation/security review.
19. AI PROVIDER AND MODEL ABSTRACTION
🔒 LOCKED: SABI must not be locked to Gemini.
The AI Service must expose a provider/model abstraction. Domain services must request an AI capability rather than directly calling a named provider.
Conceptual structure:

Admin AI / Student AI
        ↓
AI Service
        ↓
Provider / Model Router
        ├── Gemini
        ├── OpenRouter
        ├── OpenAI
        ├── Anthropic
        ├── DeepSeek
        └── Future providers


Providers and models are configuration/infrastructure concerns. The exact initial provider/model set is 🟡 OPEN.
Provider routing must support versioning, fallback, usage metadata, error isolation and auditability.
20. AI AND RAG ADMINISTRATION
View AI interaction health and usage.
View model/provider metadata.
View AI failure/fallback events.
View retrieval failures.
Manage approved knowledge documents through controlled workflows.
View indexing/chunking/embedding status.
Inspect retrieval metadata where authorized.
Manage AI prompt/configuration versions through versioned deployment workflows.
View AI-credit usage.
Keep student AI and Admin AI permission boundaries separate.
The existing RAG rule remains: RAG supplies grounded knowledge; it does not calculate mastery, readiness, coverage, recommendations or question selection.
21. AUDIT LOGGING
Every sensitive administrative mutation must produce an immutable audit record.
Minimum conceptual fields:
Actor/admin identity
Role
Action
Target entity/type
Target identifier where appropriate
Before state or safe summary where appropriate
After state or safe summary where appropriate
Reason
Confirmation/approval metadata
Timestamp
Result
Correlation/request identifier
Audit data must avoid storing secrets and must respect privacy/data-minimization requirements.
22. ADMIN APPROVAL AND CONFIRMATION
Not every AI action should execute immediately.
The Admin Portal should support:
Preview before execution
Explicit confirmation
Risk warnings
Scope summary
Reason capture
Recent re-authentication for sensitive operations
Post-action verification
Failure reporting
A confirmation must authorize the specific operation presented to the administrator; it must not become a generic “AI can do anything” approval.
23. ERROR INVESTIGATION FLOW
User request
    ↓
Admin AI interprets request
    ↓
Identify affected SABI area
    ↓
Collect authorized evidence
    ↓
Correlate errors/logs/state
    ↓
Diagnosis with evidence
    ↓
Proposed fix
    ↓
Risk/permission evaluation
    ↓
Admin confirmation if required
    ↓
Execute through backend tool
    ↓
Verify result
    ↓
Write audit record
    ↓
Report outcome to Master Admin


24. ADMIN PORTAL UX PRINCIPLES
Non-developer friendly.
Plain operational language.
Clear status indicators.
Search-first workflows.
Useful filters and saved views where appropriate.
Safe defaults.
No hidden destructive actions.
Preview before high-impact mutation.
Clear success/failure states.
Explain why an action is unavailable.
Surface the next useful action when an error occurs.
Avoid forcing the Master Admin into database terminology unless necessary.
25. ADMIN API / SERVICE BOUNDARY
The Admin frontend must call explicit admin backend services. It must not perform privileged direct database mutations from the browser.
Admin Portal
   ↓
Authenticated Admin Request
   ↓
Admin Authorization
   ↓
Admin Service / Approved Tool
   ↓
Domain Service
   ↓
Database / External Provider
   ↓
Audit Event
   ↓
Verified Response


26. REQUIRED TESTING
MASTER_ADMIN authorization tests.
Non-admin denial tests.
Cross-student access denial tests.
Privilege escalation tests.
Entitlement grant/revoke tests.
Payment/entitlement mismatch investigation tests.
Question mutation/version/audit tests.
Analytics correctness tests.
Background-job retry/idempotency tests.
System health/error correlation tests.
Admin AI tool permission tests.
Admin AI confirmation tests.
Admin AI audit tests.
Admin AI failure/fallback tests.
Provider-routing/fallback tests.
Critical-action refusal tests.
Post-action verification tests.
Full Admin Portal end-to-end tests.
27. ADMIN AI VERIFICATION SCENARIOS
Scenario
Expected result
Ask for student payment status
AI retrieves authorized payment/entitlement evidence and explains status.
Ask why a student cannot access Premium
AI traces account → payment → entitlement → access path and identifies evidence-supported issue.
Grant complimentary access
AI prepares exact entitlement action; requires configured confirmation; executes via entitlement service; verifies; audits.
Ask why CBT is failing
AI investigates relevant operational evidence and produces diagnosis/proposed remediation.
Ask AI to delete audit logs
AI refuses or routes to a restricted human-only workflow.
Provider unavailable
AI uses configured fallback or reports controlled failure; core SABI remains operational.
AI gives uncertain diagnosis
AI states uncertainty and requests/collects more evidence rather than inventing a fix.

28. DATA AND PRIVACY BOUNDARIES
Admin access must be scoped by role.
AI receives only the minimum authorized context needed for a task.
Sensitive credentials, provider secrets and service-role keys never enter the client or model context.
Audit logs must not become a mechanism for exposing secrets.
Student private AI interactions must not automatically become visible to every admin role.
The exact privacy/retention policy is 🟡 OPEN and must be finalized before production.
29. IMPLEMENTATION EXTENSION TO EXISTING BACKEND
The existing backend prompt sequence remains the foundation. The Admin Control Plane should be implemented as an extension to the existing Admin, Analytics, Commercial, Payment, AI, Jobs, Audit and Security capabilities.
The implementation model must inspect existing code before adding anything and must reuse existing contracts. If a required capability already exists, it should be exposed through the Admin Control Plane rather than duplicated.
Required extension sequence:
Admin identity, roles and permissions.
Admin service/control API foundation.
Student operations.
Payment and entitlement operations.
Question/content operations.
Analytics command center services.
CBT operations and diagnostics.
System health and background-job operations.
AI provider/model administration.
Admin AI service and tool registry.
Approval, confirmation, audit and verification layer.
Admin integration/security tests.
30. ADMIN FRONTEND IMPLEMENTATION SEQUENCE
Admin application shell and secure routing.
Dashboard.
Students.
Student detail console.
Payments.
Entitlements.
Questions/content.
Learning analytics.
Product analytics.
CBT operations.
AI & RAG.
AI Operations Assistant.
System Health.
Jobs/notifications.
Audit logs.
Admin users/permissions.
Settings.
Responsive/accessibility/error-state QA.
31. IMPLEMENTATION RULES FOR GOOGLE AI STUDIO
Inspect the current repository before changing code.
Preserve existing working SABI services.
Do not duplicate business logic in the Admin frontend.
Do not give the browser service-role credentials.
Do not give Admin AI unrestricted database access.
Use explicit tools/services for administrative mutations.
Keep Student AI and Admin AI permission boundaries separate.
Do not hard-code Gemini or another provider into domain logic.
Use migrations for schema changes.
Version prompts, algorithms, provider configuration and administrative policy changes where appropriate.
Add tests with every major Admin capability.
Do not silently resolve OPEN decisions.
Do not declare an Admin capability complete until its verification gate passes.
32. OPEN DECISIONS
Exact non-MASTER_ADMIN role permission matrix.
Exact admin authentication/MFA mechanism and re-authentication policy.
Exact risk-level catalogue and confirmation thresholds.
Exact initial AI provider/model roster.
Exact model-routing rules and fallback hierarchy.
Exact AI cost/usage controls for Admin AI.
Exact privacy/retention policy for admin-visible student data and AI interaction metadata.
Exact observability vendor/stack.
Exact administrative bulk-operation limits.
Exact rollback mechanisms per administrative tool.
Exact admin analytics event naming where not already finalized.
Exact admin notification/alerting policy.
33. DEFINITION OF DONE
The Admin Control Plane is not complete merely because the Admin Portal renders.
MASTER_ADMIN can authenticate securely.
Admin authorization is enforced server-side.
All required administrative operations have explicit service/tool boundaries.
Student, payment, entitlement, question, analytics and operational views are functional.
Manual entitlement override is tested and audited.
AI provider abstraction is functional.
Admin AI can observe authorized SABI state.
Admin AI can diagnose supported issues.
Admin AI can propose remediation.
Approved actions can execute through controlled tools.
Critical actions are protected.
Every privileged mutation is auditable.
AI actions are verified after execution.
RLS/API privilege tests pass.
Admin E2E tests pass.
Known OPEN decisions are explicitly resolved or configurable.
No production launch claim is made until the broader SABI launch gates also pass.
34. FINAL ARCHITECTURAL PRINCIPLE
The Admin Portal should make SABI operationally manageable by a non-developer while preserving the security, determinism, auditability and learning-system boundaries of the existing platform. The Admin AI should make the system easier to understand and operate—not turn the platform into an uncontrolled autonomous administrator.

PART X — ADMIN BACKEND IMPLEMENTATION
Source document: SABI_Google_AI_Studio_Admin_Backend_Implementation_Prompt_Book_v1_DETAILED.docx
SABI
GOOGLE AI STUDIO ADMIN BACKEND IMPLEMENTATION PROMPT BOOK
Version 1.0 • September 2026
Detailed implementation prompts for the Admin Control Plane
1. DOCUMENT STATUS AND SOURCE HIERARCHY
Status: IMPLEMENTATION EXTENSION
This prompt book extends the existing SABI backend implementation. It does not replace the existing backend prompt book or source-of-truth specifications.
Source hierarchy:
SABI Master Product Specification v1
SABI Technical Implementation Specification v1
SABI Frontend Implementation Specification v1
SABI AI + RAG Implementation Specification v1
SABI QA, Testing & Deployment Specification v1
SABI Google AI Studio Backend Implementation Prompt Book v2
SABI Admin Control Plane Specification v1
This prompt book, only for implementation sequencing/details introduced here.
Decision language:
🔒 LOCKED = must not be silently changed.
🔵 PROPOSED = implementation recommendation that may be refined without changing product/security intent.
🟡 OPEN = do not invent a permanent decision; surface it for confirmation.
🔴 CHANGED = later decision supersedes an earlier OPEN decision.
2. LOCKED ADMIN CONTROL PLANE DECISIONS
The primary administrative role is MASTER_ADMIN and it is the highest application-level administrative role.
The Admin Portal is a dedicated operational control plane, separate from the student application surface.
The Admin Portal uses the existing shared SABI backend; it does not create a second learning engine.
Privileged browser-side direct database mutation is prohibited.
Every sensitive administrative mutation goes through an authorized backend service/tool and produces an audit record.
Admin AI is distinct from the Student AI Coach.
Admin AI operates through explicit tools/actions; it must never receive unrestricted arbitrary database access.
Admin AI modes are Observe → Diagnose → Propose → Execute → Verify.
Admin AI may diagnose and propose restricted/critical operations but must not freely execute them.
SABI must not be locked to Gemini. AI provider/model abstraction is mandatory.
Provider/model routing must support versioning, fallback, usage metadata, error isolation and auditability.
RAG supplies grounded knowledge/context; it does not calculate mastery, readiness, coverage, recommendations or question selection.
AI/provider failures must not break the core SABI learning engines.
Admin actions require role/permission checks, validation, audit and appropriate confirmation.
Confirmation must authorize the specific operation presented, not create generic unrestricted AI authority.
Sensitive credentials, service-role keys and provider secrets must never enter the browser or model context.
Critical security/RLS/schema/destructive operations are human-only or restricted maintenance workflows.
3. ADMIN BACKEND IMPLEMENTATION ORDER
A0 — Master Build Instruction / repository inspection
A1 — Admin Identity, Roles & Permissions
A2 — Admin Service / Control API Foundation
A3 — Student Operations
A4 — Payments & Entitlement Operations
A5 — Question & Content Operations
A6 — Analytics Command Center
A7 — CBT Operations & Diagnostics
A8 — System Health & Background Jobs
A9 — AI Provider / Model Administration
A10 — Admin AI Operations Assistant
A11 — Admin AI Tool Registry & Action Security
A12 — Approval / Confirmation / Audit / Verification Layer
A13 — Integration & Security Tests
A14 — Admin Backend End-to-End
A15 — Production Readiness / Admin Launch Gate
4. UNIVERSAL EXECUTION RULES
Inspect the current repository before editing anything.
Read existing services, routes, migrations, schemas, tests and configuration relevant to the phase.
Reuse existing contracts and services whenever they already satisfy the requirement.
Do not duplicate an existing service simply to expose it to Admin.
Do not silently change locked SABI product decisions.
Do not turn an OPEN decision into a permanent implementation choice without reporting it.
Keep trust-sensitive logic server-side.
Use migrations for schema changes; never patch production data structures manually.
Version algorithms, prompts, provider configurations and operational policies where they affect behavior.
Preserve historical learning evidence and existing student data.
Do not expose Supabase service-role credentials, provider secrets or privileged tokens to the browser.
Add tests with every meaningful mutation or authorization capability.
Run type checks, unit/integration tests and build checks applicable to the repository.
If a test cannot run because of missing infrastructure, report the exact blocker instead of claiming success.
At the end of each prompt report: files changed, migrations, services/routes changed, tests run, results, unresolved blockers, OPEN decisions discovered, and rollback/recovery notes.
Stop at the phase boundary. Do not implement later phases early unless a minimal dependency is required.
A0 — Admin Master Build Instruction
Purpose: Establish permanent implementation context and force the agent to extend the existing backend rather than rebuilding it.
COPY-PASTE PROMPT
You are implementing the SABI Admin Control Plane as an extension to an existing production-oriented SABI backend.

Before changing code:
1. Inspect the repository structure.
2. Identify the existing authentication/identity implementation.
3. Identify existing Admin Service, Analytics Service, Commercial Service, Payment Service, AI Service, background-job framework, audit/logging and security/RLS implementation.
4. Identify existing database tables, migrations, API routes/actions, tests and shared types relevant to admin operations.
5. Identify what is already implemented from the existing SABI backend prompt book.
6. Build a requirement-to-code map for this Admin Control Plane specification.

Do not rebuild existing functionality. Expose or extend existing domain services where appropriate.

Create an implementation gap report with:
- Already implemented and reusable
- Partially implemented and requiring extension
- Missing
- Conflicting behavior
- Security risks
- OPEN decisions that block implementation

Then establish the admin implementation foundation without implementing later phases.

The Admin Control Plane must remain a dedicated administrative surface using explicit backend services. The browser must never perform privileged direct database mutations.

Preserve these locked decisions:
- MASTER_ADMIN is the highest application-level admin role.
- Admin AI is distinct from Student AI.
- Admin AI uses explicit tools and permissions.
- Provider/model abstraction is mandatory and Gemini is not the only provider.
- Critical security/destructive actions are restricted.
- Every sensitive mutation is auditable.

Do not invent an exact role matrix, retention policy, initial provider roster, or permanent risk catalogue if the specification marks those as OPEN/PROPOSED. Record them for later confirmation.
VERIFICATION GATE
Repository inspected before edits.
Existing admin-related services/contracts identified.
Gap report produced.
No duplicate service created where an existing service is reusable.
Locked decisions preserved.
OPEN decisions explicitly reported.
Do not declare this phase complete until every applicable gate above passes and evidence is reported.
A1 — Admin Identity, Roles & Permissions
Purpose: Create the secure authorization foundation for MASTER_ADMIN and extensible future roles.
COPY-PASTE PROMPT
Implement the Admin Identity, Roles & Permissions extension.

First inspect the existing SABI Auth/Identity implementation and reuse it.

Requirements:
1. Establish the application-level administrative role model.
2. Add/extend MASTER_ADMIN as the highest admin role.
3. Make authorization server-side and deny-by-default.
4. Keep authentication identity separate from authorization role/permission.
5. Support extensible roles without hard-coding every future role into unrelated domain logic.
6. Add permission checks that can be consumed by Admin Service and Admin AI tools.
7. Ensure non-admin students cannot access admin endpoints.
8. Ensure a lower-privileged admin cannot invoke MASTER_ADMIN-only operations.
9. Prevent privilege escalation through client-supplied role fields, query parameters, hidden UI controls or forged requests.
10. Record authorization-relevant admin identity in audit context.

Do not finalize a complete non-MASTER_ADMIN permission matrix if it remains OPEN. Implement the extensible structure and the permissions required by locked capabilities, then report the unresolved matrix.

Use the existing identity provider and database conventions. Do not create a second login system unless the current architecture requires it.
VERIFICATION GATE
MASTER_ADMIN can authenticate and access protected admin routes.
Non-admin identity receives denial.
Client cannot self-assign MASTER_ADMIN.
Lower roles cannot call MASTER_ADMIN-only endpoints.
Cross-user and cross-role authorization tests pass.
Audit context identifies admin actor and role.
Do not declare this phase complete until every applicable gate above passes and evidence is reported.
A2 — Admin Service & Control API Foundation
Purpose: Create the explicit backend boundary through which the Admin Portal will operate.
COPY-PASTE PROMPT
Implement the Admin Service / Control API foundation.

Create or extend a server-side Admin Service that acts as the control-plane boundary.

The Admin Service must:
- authenticate the request,
- authorize the admin role/permission,
- validate input,
- call the correct domain service,
- return a safe response,
- emit audit information for sensitive operations,
- never expose service-role credentials,
- never allow arbitrary SQL or arbitrary table mutation,
- preserve domain invariants.

Expose explicit capability-oriented operations rather than a generic database editor.

Create a consistent response/error contract for:
- unauthorized,
- forbidden,
- invalid input,
- target not found,
- domain conflict,
- provider failure,
- internal failure.

Add correlation/request IDs so an admin can trace an operation across logs and audit records.

Do not implement all admin capabilities in this phase; establish the boundary and a small health/identity proof endpoint only.
VERIFICATION GATE
Admin API rejects unauthenticated and unauthorized calls.
MASTER_ADMIN proof endpoint works.
Service-role keys are not present in client bundles.
Arbitrary SQL/table mutation is impossible through the Admin API.
Correlation ID appears in relevant logs/audit context.
Error contract is consistent and tested.
Do not declare this phase complete until every applicable gate above passes and evidence is reported.
A3 — Student Operations
Purpose: Give Master Admin a safe operational console for student/account investigation without exposing unrestricted records.
COPY-PASTE PROMPT
Extend the Admin Service with student operations.

Required capabilities:
- Search students by supported identifiers/attributes.
- View a student's account/profile summary.
- View subject combination and onboarding state.
- View learning activity summary.
- View mastery/readiness summaries through existing domain services.
- View recent sessions and relevant operational failures.
- View account status.
- View payment/entitlement summary through Commercial/Payment services.
- Link related operational evidence without duplicating domain logic.

Administrative mutation capabilities should be limited to explicitly authorized operations already supported by domain services. Do not create a generic student-record editor.

Protect private data with role-based field exposure and data minimization.

If an operation changes a student account state, require validation and audit logging.

The admin response should be operationally useful and human-readable while preserving authoritative domain values.
VERIFICATION GATE
Student search returns only authorized data.
Student A cannot be accessed through a forged identifier outside authorization rules.
Student detail aggregates authoritative data from existing services.
Sensitive/private fields are not unnecessarily exposed.
Account mutations, if implemented, are audited.
Cross-student access and privilege escalation tests pass.
Do not declare this phase complete until every applicable gate above passes and evidence is reported.
A4 — Payments & Entitlement Operations
Purpose: Allow Master Admin to investigate payment/access mismatches and safely grant or revoke complimentary access.
COPY-PASTE PROMPT
Extend the Admin Service around the existing Payment and Commercial/Entitlement services.

Required operations:
1. Inspect payment status for a student.
2. Inspect transaction/provider reference and normalized payment state.
3. Inspect current entitlement state.
4. Explain payment → entitlement linkage using authoritative evidence.
5. Detect/report mismatches such as paid-but-no-entitlement or entitlement-without-expected-payment evidence.
6. Prepare a complimentary entitlement grant.
7. Execute a manual grant only through the existing entitlement service.
8. Support duration/scope where the existing entitlement model supports it.
9. Require reason capture for manual grants/overrides.
10. Support revoke/expire operations only when permitted by the entitlement model.
11. Make all sensitive mutations auditable and idempotent.

Never directly edit payment truth to solve an entitlement problem.

A manual complimentary grant must be distinguishable from a provider-confirmed purchase.

Do not invent an entitlement matrix. Use the existing model and report missing commercial decisions.
VERIFICATION GATE
Payment status comes from authoritative transaction records.
Entitlement status comes from the entitlement service.
Paid/no-entitlement mismatch can be diagnosed.
Manual complimentary access records actor, reason, scope/duration and timestamp.
Duplicate grant requests are idempotent or safely rejected.
Manual operations do not falsify payment records.
Audit record exists for grant/revoke/override.
Post-action entitlement verification passes.
Do not declare this phase complete until every applicable gate above passes and evidence is reported.
A5 — Question & Content Operations
Purpose: Expose controlled operational management of the JAMB question/content system.
COPY-PASTE PROMPT
Extend the Admin Service for question and content operations.

Support:
- Search/filter questions.
- Inspect question version, subject, taxonomy and provenance.
- Inspect review/quality status.
- Inspect reports/flags.
- Inspect answer key and version history through authoritative backend services.
- Submit a question for review.
- Change only explicitly permitted content/review states.
- Create new question versions where the existing versioning architecture supports it.
- Preserve historical versions and learning evidence.
- Record who made a content mutation and why.

Do not allow browser-side mutation of authoritative answer keys outside the approved version/review workflow.

Do not delete historical question versions merely to hide a defect. Use retirement/versioning mechanisms already defined by SABI.

If bulk operations are added, make them previewable, scoped and auditable; do not silently create a destructive bulk editor.
VERIFICATION GATE
Question search/filter works against authoritative data.
Historical versions remain intact.
Unauthorized answer-key mutation is denied.
Content/review mutations create audit records.
Retired/flagged questions are handled through existing lifecycle rules.
Question operations do not corrupt learning evidence.
Versioning tests pass.
Do not declare this phase complete until every applicable gate above passes and evidence is reported.
A6 — Analytics Command Center Services
Purpose: Provide backend aggregates for operational, learning and product analytics without creating a second analytics truth.
COPY-PASTE PROMPT
Extend the existing Analytics Service for Admin Control Plane consumption.

Provide authoritative aggregates for:
- total registered students,
- active students,
- study activity,
- session volume,
- subject activity,
- syllabus coverage trends,
- mastery distributions where appropriate,
- CBT usage/performance summaries,
- recommendation activity,
- streak/activity summaries,
- paid students,
- entitlement status,
- revenue/payment operational summaries from authoritative payment records,
- conversion/usage metrics supported by canonical events,
- error rates and operational health metrics.

Reuse canonical learning events and existing analytics definitions. Do not invent competing event semantics.

Separate:
- learning analytics,
- product analytics,
- commercial/payment analytics,
- operational/system analytics.

Every metric must identify its source and time window.

Avoid exposing student-identifiable information in aggregate views unless the endpoint explicitly requires it.

Do not finalize metrics whose definitions are still OPEN; mark them as unresolved rather than silently creating a permanent business definition.
VERIFICATION GATE
Analytics values reconcile with canonical events/domain records.
Time-window filters are correct.
Payment metrics do not contradict transaction truth.
No duplicate event pipeline is created.
Aggregate endpoints enforce authorization.
Metric tests cover empty, normal and boundary cases.
Do not declare this phase complete until every applicable gate above passes and evidence is reported.
A7 — CBT Operations & Diagnostics
Purpose: Give admins operational visibility into CBT failures without weakening exam integrity.
COPY-PASTE PROMPT
Extend the Admin Service for CBT operational diagnostics.

Support investigation of:
- failed session creation,
- invalid exam configuration,
- question allocation failures,
- timer/expiry anomalies,
- submission failures,
- duplicate submission attempts,
- missing session questions,
- configuration mismatches,
- relevant background-job failures,
- provider-independent application errors affecting CBT.

Admin diagnostics may inspect and explain operational state but must not allow an admin endpoint to silently alter exam answers or rewrite historical CBT scores.

If a recovery operation is necessary, route it through a dedicated, auditable recovery service with explicit validation.

Active CBT integrity remains a locked concern:
- no AI explanations during active CBT,
- no answer-key override through Admin AI,
- no arbitrary score rewriting,
- timer/submission rules remain authoritative.

Create evidence-rich diagnostic responses suitable for both a human admin and the future Admin AI.
VERIFICATION GATE
CBT failure cases can be diagnosed from authoritative evidence.
Active exam integrity cannot be bypassed through admin endpoints.
Duplicate submission handling is safe.
Configuration mismatch is detectable.
Recovery operations, if any, are auditable and constrained.
CBT diagnostic tests pass.
Do not declare this phase complete until every applicable gate above passes and evidence is reported.
A8 — System Health & Background Jobs
Purpose: Expose operational health, job state and safe retry controls.
COPY-PASTE PROMPT
Extend the existing observability and background-job framework for Admin operations.

Provide:
- service health summary,
- dependency health summary,
- recent error summary,
- failed job list,
- job details,
- retryable/non-retryable classification,
- retry operation for eligible jobs,
- idempotent retry behavior,
- queue/backlog indicators,
- provider failure/fallback visibility,
- correlation IDs.

Do not expose secrets, environment variables, provider credentials or raw sensitive payloads.

A retry operation must go through the job framework, not directly mutate job state in an ad hoc manner.

The Admin API must explain when a job cannot be retried and why.

Support health evidence that Admin AI can later consume.
VERIFICATION GATE
Health endpoints do not leak secrets.
Failed jobs are visible with safe diagnostic context.
Eligible retry succeeds or fails predictably.
Non-retryable jobs are rejected.
Retry is idempotent.
Job state and audit records remain consistent.
Do not declare this phase complete until every applicable gate above passes and evidence is reported.
A9 — AI Provider & Model Administration
Purpose: Expose provider/model configuration through the locked abstraction without binding SABI to a single vendor.
COPY-PASTE PROMPT
Extend the existing AI Service and provider router for Admin operations.

Locked requirement:
SABI must not be locked to Gemini.

Implement/extend a provider/model abstraction in which domain services request an AI capability and the AI Service selects the configured provider/model.

The architecture must be capable of supporting providers such as:
- Gemini
- OpenRouter
- OpenAI
- Anthropic
- DeepSeek
- future/self-hosted providers

Do not assume all listed providers must be enabled at launch. The exact initial roster is OPEN.

Required admin capabilities:
- view enabled providers/models,
- view provider health,
- view routing configuration metadata,
- view fallback configuration,
- inspect recent provider failures,
- inspect usage metadata,
- version routing/configuration changes,
- safely activate/deactivate a configured provider where permitted.

Never expose API keys to the client or model context.

Do not allow a single admin request to arbitrarily execute code through a model provider.

Keep provider-specific SDK code inside infrastructure adapters.
VERIFICATION GATE
Domain code does not directly depend on a named provider.
At least two provider adapters can be represented by the abstraction or mocked in tests.
Fallback behavior is tested.
Provider failure is isolated from core learning services.
API keys are server-side only.
Provider/model configuration changes are versioned/audited.
Do not declare this phase complete until every applicable gate above passes and evidence is reported.
A10 — Admin AI Operations Assistant
Purpose: Create the controlled AI service that can observe, diagnose, propose, execute and verify admin operations.
COPY-PASTE PROMPT
Implement the Admin AI Operations Assistant as a separate capability from the Student AI Coach.

Operating modes:
1. Observe — retrieve authorized operational evidence.
2. Diagnose — correlate evidence and explain the likely issue.
3. Propose — produce a concrete remediation plan.
4. Execute — call an approved tool after required authorization/confirmation.
5. Verify — check whether the expected outcome occurred.

The Admin AI must not receive unrestricted database access.

Its model context should contain only:
- the administrator's authorized request,
- authorized evidence retrieved by tools,
- relevant domain summaries,
- tool schemas,
- policy/risk constraints,
- approved knowledge where relevant.

The AI must not invent:
- payment status,
- entitlement status,
- student mastery,
- CBT scores,
- system state,
- logs,
- successful execution,
- verification results.

If evidence is insufficient, the assistant must say what is missing and request/collect more evidence.

If an operation is disallowed, the assistant must refuse that operation and explain the safe workflow.

Implement structured responses that can represent:
- diagnosis,
- evidence,
- confidence/uncertainty,
- proposed action,
- required confirmation,
- tool call request,
- execution result,
- verification result,
- failure/blocker.

Do not allow the model to bypass the backend authorization layer.
VERIFICATION GATE
Admin AI is technically separate from Student AI Coach.
AI cannot call arbitrary SQL.
AI cannot claim an action succeeded without tool evidence.
Insufficient evidence produces uncertainty rather than invention.
Disallowed critical operations are refused.
Provider routing uses the shared abstraction.
AI failures are isolated and logged.
Do not declare this phase complete until every applicable gate above passes and evidence is reported.
A11 — Admin AI Tool Registry & Action Security
Purpose: Create the explicit allowlisted tool layer that makes Admin AI operationally useful but bounded.
COPY-PASTE PROMPT
Implement the Admin AI Tool Registry.

Each tool must have:
- stable tool name,
- description,
- allowed roles,
- risk level,
- input schema,
- validation rules,
- required confirmation level,
- execution service,
- audit requirements,
- expected result schema,
- verification procedure,
- rollback strategy where applicable,
- enabled/disabled state.

Initial tool families:
- student lookup/inspection,
- student account operations,
- payment investigation,
- entitlement grant/revoke,
- question inspection/review,
- analytics query,
- CBT diagnostics,
- background-job inspection/retry,
- system health diagnostics,
- AI/RAG diagnostics,
- notification operations,
- report generation.

Implement the registry as backend configuration/code with strong schema validation. Do not allow the model to invent new tools at runtime.

Tool execution must re-check authorization at execution time. Do not rely on the model's earlier decision.

Use risk levels at minimum as a framework for LOW, MEDIUM, HIGH and CRITICAL, but treat the exact permanent catalogue as PROPOSED until security review.

Critical operations such as security/RLS/schema/destructive operations must not be executable by Admin AI through ordinary tools.
VERIFICATION GATE
Unknown tool calls are rejected.
Malformed tool arguments are rejected.
Role restrictions are enforced server-side.
Execution-time authorization is rechecked.
Tool results conform to schemas.
Critical tools are unavailable to ordinary Admin AI execution.
Tool registry changes are auditable.
Do not declare this phase complete until every applicable gate above passes and evidence is reported.
A12 — Approval, Confirmation, Audit & Verification Layer
Purpose: Make sensitive Admin and Admin AI actions safe, explicit and verifiable.
COPY-PASTE PROMPT
Implement the approval/confirmation/verification layer.

For applicable actions support:
- preview before execution,
- exact operation scope,
- risk warning,
- reason capture,
- explicit confirmation,
- recent re-authentication for sensitive operations,
- execution,
- post-action verification,
- failure reporting,
- immutable audit record.

A confirmation must authorize exactly the operation presented to the admin. It must not create a generic permission for future unrelated actions.

Audit records should include:
- actor/admin identity,
- role,
- action,
- target type/id where appropriate,
- safe before-state summary where appropriate,
- safe after-state summary where appropriate,
- reason,
- confirmation metadata,
- timestamp,
- correlation/request ID,
- result.

Never store provider secrets, service-role keys or unnecessary sensitive payloads in audit logs.

For every mutating Admin AI action, require verification against authoritative state.

If verification fails, report the action as not verified even if the underlying tool returned success.

Support rollback where the domain operation genuinely supports safe rollback; do not invent fake rollback semantics.
VERIFICATION GATE
Preview matches the actual operation.
Confirmation cannot be reused for another operation.
Sensitive actions require configured confirmation.
Audit record is created for every sensitive mutation.
Post-action verification uses authoritative state.
Verification failure is surfaced as failure/uncertain, not success.
Secrets are absent from audit records.
Do not declare this phase complete until every applicable gate above passes and evidence is reported.
A13 — Admin Integration & Security Test Harness
Purpose: Prove the Admin backend is secure across identity, domain operations, AI tools and provider boundaries.
COPY-PASTE PROMPT
Build the Admin Control Plane integration/security test suite.

Required test groups:
1. MASTER_ADMIN authorization.
2. Non-admin denial.
3. Lower-role denial of restricted operations.
4. Privilege escalation attempts.
5. Cross-student access denial.
6. Payment/entitlement mismatch investigation.
7. Manual entitlement grant/revoke.
8. Idempotency of entitlement operations.
9. Question version/audit integrity.
10. Analytics reconciliation.
11. CBT diagnostic integrity.
12. Job retry/idempotency.
13. System health/error correlation.
14. Admin AI tool permission checks.
15. Unknown-tool rejection.
16. Malformed-input rejection.
17. Confirmation requirements.
18. Audit creation.
19. Post-action verification.
20. Provider fallback.
21. Provider failure isolation.
22. Critical-action refusal.
23. Secret-leak prevention.
24. Service-role key absence from client output.
25. Admin AI uncertainty behavior.

Include negative tests deliberately designed to simulate:
- forged role claims,
- modified student IDs,
- unauthorized tool names,
- altered confirmation payloads,
- repeated mutation requests,
- provider timeouts,
- tool execution failure,
- verification mismatch.

Do not mark the Admin backend secure merely because happy-path tests pass.
VERIFICATION GATE
All mandatory test groups execute.
Negative authorization tests pass.
Critical-action refusal is proven.
Provider failure/fallback is proven.
Audit/verification tests pass.
No privileged secret appears in client/test artifacts.
Do not declare this phase complete until every applicable gate above passes and evidence is reported.
A14 — Admin Backend End-to-End
Purpose: Prove a realistic Master Admin workflow from authentication through diagnosis, mutation and verification.
COPY-PASTE PROMPT
Run a complete end-to-end Admin backend scenario.

Scenario 1:
- Master Admin signs in.
- Searches for a student.
- Views student/account summary.
- Inspects payment.
- Inspects entitlement.
- Identifies a supported payment/entitlement issue.
- Uses Admin AI to diagnose it.
- AI proposes a complimentary entitlement action.
- Admin sees exact scope/reason.
- Required confirmation occurs.
- Entitlement service executes.
- Verification confirms entitlement state.
- Audit record is written.
- Admin AI reports the verified outcome.

Scenario 2:
- Admin asks why CBT is failing.
- Admin AI collects authorized operational evidence.
- AI correlates errors/configuration/session state.
- AI provides evidence-backed diagnosis.
- If remediation is safe and authorized, it proposes it.
- If confirmation is required, it requests it.
- If the issue is critical/restricted, it stops at proposal/human workflow.
- Verification is performed after any allowed remediation.

Scenario 3:
- Admin asks the AI to delete audit logs.
- Tool registry/policy denies the request.
- AI explains that the operation is restricted.

Scenario 4:
- Configured AI provider becomes unavailable.
- Router attempts configured fallback or controlled failure.
- Core SABI services remain operational.

Capture all correlation IDs and produce an E2E evidence report.
VERIFICATION GATE
Scenario 1 completes with verified entitlement state.
Scenario 1 audit trail is complete.
Scenario 2 diagnosis is evidence-backed.
Scenario 3 critical operation is refused.
Scenario 4 provider failure does not break core services.
All state transitions reconcile with authoritative records.
Do not declare this phase complete until every applicable gate above passes and evidence is reported.
A15 — Production Readiness & Admin Launch Gate
Purpose: Determine whether the Admin backend is genuinely ready for frontend integration and controlled production use.
COPY-PASTE PROMPT
Perform the final Admin Backend Production Readiness Gate.

Review:
- Admin Control Plane specification requirements.
- Existing SABI source-of-truth documents.
- Every A0–A14 verification report.
- Database migrations.
- Authorization/RLS.
- API routes/actions.
- Domain service boundaries.
- Admin AI tool registry.
- Provider/model abstraction.
- Approval/confirmation.
- Audit logging.
- Verification.
- Observability.
- Job operations.
- Test coverage and failures.
- Secret handling.
- Data/privacy boundaries.
- Rollback/recovery procedures.

Create a final matrix:
Requirement | Status | Evidence | Test | Risk | Remaining Action

Allowed statuses:
- IMPLEMENTED & VERIFIED
- IMPLEMENTED WITH KNOWN LIMITATION
- BLOCKED
- OPEN DECISION
- NOT IMPLEMENTED

Do not call an item complete because code exists. It is complete only when the relevant behavior is implemented and the verification evidence passes.

Explicitly identify anything that must be completed before Admin Frontend integration.

Do not silently downgrade failed security tests or unresolved authorization issues.
VERIFICATION GATE
All prior phase evidence is reviewed.
Every requirement has a status.
No critical security issue is hidden.
Open decisions are explicitly listed.
Admin frontend dependencies are clearly identified.
Final launch recommendation is based on evidence, not code presence.
Do not declare this phase complete until every applicable gate above passes and evidence is reported.
5. MASTER ADMIN VERIFICATION MATRIX
Use this matrix after implementation. It is the minimum evidence set for the backend extension.
Area
Requirement
Evidence / Pass Condition
Identity
MASTER_ADMIN authorization
Authenticated Master Admin reaches protected admin capability; non-admin denied.
Authorization
Privilege escalation
Forged role/client claims cannot elevate privileges.
Student Ops
Cross-student isolation
Unauthorized student records cannot be retrieved.
Payments
Payment truth
Payment state comes from authoritative transactions.
Entitlements
Complimentary grant
Grant requires authorization/reason/confirmation as configured and is verified.
Questions
Version integrity
Historical question versions and learning evidence remain intact.
Analytics
Metric reconciliation
Admin aggregates reconcile to canonical events/domain records.
CBT
Exam integrity
Admin tooling cannot rewrite active answers or bypass CBT rules.
Jobs
Retry safety
Eligible retry is idempotent and auditable.
AI Providers
Abstraction
Domain logic is provider-neutral.
Admin AI
Tool boundary
AI cannot execute arbitrary SQL/code.
Admin AI
Evidence discipline
AI cannot invent state or successful execution.
Tools
Execution auth
Every tool re-checks permissions at execution.
Approval
Specific confirmation
Confirmation cannot be replayed for another action.
Audit
Immutable trail
Sensitive mutations generate safe audit records.
Verification
Post-action
Mutation is not reported successful until authoritative verification passes.
Critical Actions
Refusal
Security/RLS/schema/destructive operations are restricted.
Secrets
Isolation
Secrets/service-role keys never enter browser/model/audit context.
Fallback
Provider failure
Configured fallback/controlled failure works without breaking core SABI.
E2E
Full lifecycle
Representative admin workflows pass end-to-end.

6. DEFINITION OF 'IMPLEMENTED'
The requested backend behavior exists in the correct service boundary.
Authorization is enforced server-side.
Input validation exists.
Domain invariants are preserved.
Required migrations are applied through the migration system.
Audit requirements are implemented for sensitive mutations.
Required confirmation/approval is enforced where applicable.
Post-action verification exists where applicable.
Automated tests cover success and failure paths.
Type check/build/test commands pass, or blockers are explicitly documented.
No locked decision was silently changed.
No OPEN decision was silently converted into permanent product behavior.
Evidence is reported with files, routes/services, migrations and test results.
7. OPEN / PROPOSED DECISIONS TO RESOLVE DURING IMPLEMENTATION
Exact non-MASTER_ADMIN permission matrix — OPEN.
Exact initial AI provider/model roster — OPEN.
Exact permanent Admin AI risk catalogue — PROPOSED; finalize during security review.
Exact privacy/retention policy for admin visibility and AI operational context — OPEN.
Exact entitlement matrix/override rules where not already defined — OPEN.
Exact analytics metric definitions where not already canonical — OPEN.
Exact admin re-authentication threshold/mechanism — OPEN/implementation-dependent.
Exact notification/report scheduling policies — OPEN if not already specified.
Exact Admin AI confidence threshold/fallback wording — OPEN.
Exact UI navigation and frontend presentation — belongs to Admin Frontend sequence, not this backend book.
8. FINAL ARCHITECTURAL RULE
The Admin Control Plane is not a database dashboard. It is a controlled operational layer over SABI's existing domain services. The Master Admin should be able to operate SABI without touching the database, while the system must remain unable to turn an AI prompt or browser request into unrestricted privileged access.
Admin AI is an operator assistant, not an unrestricted system owner. It observes authorized evidence, diagnoses, proposes, executes only through approved tools and controls, and verifies the result.

PART XI — ADMIN FRONTEND IMPLEMENTATION
Source document: SABI_Google_AI_Studio_Admin_Frontend_Implementation_Prompt_Book_v1_DETAILED.docx
SABI
GOOGLE AI STUDIO ADMIN FRONTEND IMPLEMENTATION PROMPT BOOK
Version 1.0 • September 2026
Dedicated Admin Portal / Control Center
1. PURPOSE AND RELATIONSHIP TO THE BACKEND
This prompt book implements the dedicated SABI Admin Portal as a separate frontend surface over the existing shared SABI backend and the Admin Backend Control Plane.
This is an extension, not a replacement for the Student Application.
The Admin Portal must not contain a second learning engine.
The Admin Portal must call explicit backend Admin services; it must not directly perform privileged database mutations.
The backend remains authoritative for identity, permissions, payments, entitlements, learning state, CBT state, AI tools and audit.
The frontend presents operational state and requests authorized actions; it does not decide whether an action is allowed.
2. LOCKED FRONTEND PRINCIPLES
MASTER_ADMIN is the primary/highest administrative role.
Admin Portal is a dedicated operational control center, not a subsection of the student dashboard.
Admin UX must be easy for a non-developer to operate.
Search-first workflows, clear status indicators and plain operational language.
No hidden destructive actions.
High-impact mutations show scope and preview before confirmation.
Admin AI is distinct from Student AI Coach.
Admin AI follows Observe → Diagnose → Propose → Execute → Verify.
Admin AI actions are rendered as explicit tool/action cards; the chat interface is not a generic unrestricted command console.
Provider/model choice is abstracted; frontend must never assume Gemini.
Secrets, service-role keys and provider credentials never reach the frontend.
Admin actions must show success only after backend confirmation/verification.
The frontend must preserve backend audit/correlation identifiers where useful for support.
3. ADMIN INFORMATION ARCHITECTURE
Dashboard
Students
Payments
Entitlements
Questions & Content
Learning Analytics
Product Analytics
CBT Operations
AI & RAG
AI Operations Assistant
System Health
Background Jobs
Notifications
Reports
Audit Logs
Admin Users & Permissions
System Settings
4. FRONTEND IMPLEMENTATION ORDER
F0 — Master Frontend Build Instruction / repository inspection
F1 — Admin App Shell & Secure Routing
F2 — Dashboard
F3 — Students
F4 — Student Detail Console
F5 — Payments
F6 — Entitlements
F7 — Questions & Content
F8 — Learning Analytics
F9 — Product Analytics
F10 — CBT Operations
F11 — AI & RAG
F12 — Admin AI Operations Assistant
F13 — System Health
F14 — Jobs, Notifications & Reports
F15 — Audit Logs
F16 — Admin Users, Permissions & Settings
F17 — Global UX/Security/Accessibility QA
F18 — Admin Frontend E2E & Production Gate
5. UNIVERSAL GOOGLE AI STUDIO FRONTEND RULES
Inspect the existing SABI frontend before changing code.
Reuse existing design system, components, routing patterns, auth utilities and API client where compatible.
Do not duplicate student components unnecessarily.
Do not create fake backend data in production paths.
Do not place privileged logic in the browser.
Do not expose service-role credentials or provider API keys.
Do not trust client-side role state; backend authorization is authoritative.
Handle loading, empty, error, permission-denied and stale-data states explicitly.
For destructive/high-impact actions, show target, scope, reason and confirmation before execution.
After a mutation, refresh/revalidate from authoritative backend state.
Use correlation/request IDs in support/debug surfaces when provided.
Keep responsive behavior usable on desktop and tablet; mobile should remain functional for urgent operations.
Use accessible labels, keyboard navigation, focus states and semantic controls.
Do not silently change locked product behavior.
Report files changed, routes added, API contracts used, tests, build status and blockers after each phase.
F0 — Admin Frontend Master Build Instruction
Purpose: Establish the dedicated Admin Portal foundation without disturbing the working student frontend.
COPY-PASTE PROMPT
Inspect the current SABI frontend repository before editing.

Identify:
- framework and routing system,
- authentication/session utilities,
- API client,
- shared UI/design system,
- existing layouts,
- error/loading patterns,
- state-management approach,
- existing student routes,
- existing admin routes/components if any.

Then create an Admin Frontend gap report:
Already exists / reusable / partial / missing / conflicting.

Implement only the foundation required for a separate Admin Portal.

The Admin Portal must have a distinct route/layout boundary and must use the existing authenticated SABI backend.

Do not build a second authentication system unless the repository requires it.

Do not use client-side role state as the security boundary. The frontend may hide unavailable navigation, but every backend operation must still be authorized server-side.

Preserve the existing student application.
VERIFICATION GATE
Repository inspected first.
Student application remains functional.
Admin route/layout boundary exists.
Existing auth/API/design components are reused where appropriate.
No privileged credentials are introduced.
Do not declare this phase complete until every applicable gate passes and evidence is reported.
F1 — Admin App Shell & Secure Routing
Purpose: Create the persistent control-center shell and protected navigation.
COPY-PASTE PROMPT
Implement the Admin Portal shell.

Required structure:
- secure admin layout,
- sidebar/navigation,
- top bar,
- current administrator identity,
- role/status indicator,
- global search entry point,
- notification/status area,
- content area,
- consistent loading/error boundary.

Routes should map to the Admin Control Plane information architecture.

Suggested route family:
 /admin
 /admin/students
 /admin/students/:studentId
 /admin/payments
 /admin/entitlements
 /admin/questions
 /admin/analytics/learning
 /admin/analytics/product
 /admin/cbt
 /admin/ai
 /admin/ai/assistant
 /admin/system
 /admin/jobs
 /admin/notifications
 /admin/reports
 /admin/audit
 /admin/admin-users
 /admin/settings

Do not expose routes as a security mechanism. Unauthorized backend responses must produce a clear access-denied state.

Make the shell usable without forcing the Master Admin to understand database terminology.
VERIFICATION GATE
Admin route protection works.
Non-admin receives an access-denied experience.
Navigation matches backend capability boundaries.
Deep links work.
Student routes remain unaffected.
Loading/error states are present.
Do not declare this phase complete until every applicable gate passes and evidence is reported.
F2 — Admin Dashboard
Purpose: Create the operational home page showing what needs attention first.
COPY-PASTE PROMPT
Implement the Admin Dashboard.

Prioritize actionable operational information:
- student count/activity,
- paid students,
- entitlement issues,
- recent payment failures,
- CBT operational issues,
- question/content issues,
- AI/provider health,
- failed background jobs,
- system health,
- recent important admin actions.

Use cards/tables/alerts only where they improve decision speed.

Every metric should show its time window where applicable.

Do not invent analytics. Consume backend Admin/Analytics endpoints.

Create an 'Attention Required' area for actionable problems.

For each problem provide:
- what happened,
- affected scope,
- severity/status,
- evidence link,
- suggested next action.

Do not create a dashboard that is merely decorative.
VERIFICATION GATE
Dashboard loads real backend data.
Metrics identify time windows.
Errors are actionable.
Empty states are useful.
No fabricated metrics.
Permission boundaries are respected.
Do not declare this phase complete until every applicable gate passes and evidence is reported.
F3 — Students
Purpose: Provide search-first student management.
COPY-PASTE PROMPT
Implement the Students console.

Required:
- search,
- filters,
- pagination,
- student status,
- subject combination,
- activity summary,
- payment/entitlement summary,
- last activity,
- quick link to student detail.

Keep the list efficient and avoid loading every student's complete learning state.

Support clear states:
Loading / No results / Error / Restricted / Results.

Do not expose private information beyond backend response policy.

Provide safe operational actions only when the backend says the administrator is authorized.
VERIFICATION GATE
Search/filter/pagination work.
Student list uses backend data.
Restricted fields remain hidden.
Unauthorized actions are unavailable.
Performance is reasonable for large lists.
Do not declare this phase complete until every applicable gate passes and evidence is reported.
F4 — Student Detail Console
Purpose: Give Master Admin one operational view of a student's SABI state.
COPY-PASTE PROMPT
Implement the Student Detail Console.

Sections:
- account/profile,
- onboarding,
- subjects,
- learning activity,
- mastery/readiness summary,
- recent sessions,
- CBT history,
- recommendations/activity summary,
- payment status,
- entitlement status,
- relevant operational issues,
- recent administrative actions.

Use tabs or sections so the page does not become overwhelming.

Provide direct links to:
- payment investigation,
- entitlement operation,
- relevant CBT diagnostic,
- relevant audit entry.

Do not display private AI conversations by default unless backend permission explicitly allows it.

Never allow the frontend to directly edit mastery/readiness values.
VERIFICATION GATE
Authoritative data displayed.
Sensitive sections obey permissions.
No direct mastery editing.
Related operations link correctly.
Cross-student navigation cannot bypass backend authorization.
Do not declare this phase complete until every applicable gate passes and evidence is reported.
F5 — Payments
Purpose: Create a payment operations console for investigation and reconciliation.
COPY-PASTE PROMPT
Implement Payments.

Required:
- payment search,
- provider/transaction reference,
- payment status,
- date/time,
- amount/currency where supplied,
- student/account association,
- entitlement linkage,
- failure state,
- mismatch indicator,
- transaction detail.

Include an investigation view:
Payment evidence → entitlement evidence → mismatch diagnosis → next action.

Do not provide a UI that edits payment truth.

If a provider webhook is delayed or failed, show the operational status supplied by backend rather than guessing.

Use safe redaction for sensitive payment information.
VERIFICATION GATE
Payment records are backend-authoritative.
No direct payment mutation.
Mismatch states are understandable.
Sensitive data is redacted according to backend contract.
Provider failures are represented accurately.
Do not declare this phase complete until every applicable gate passes and evidence is reported.
F6 — Entitlements
Purpose: Allow safe access management including complimentary access and overrides.
COPY-PASTE PROMPT
Implement the Entitlements console.

Show:
- current plan/access,
- source of entitlement,
- status,
- start/end date,
- relevant payment linkage,
- manual override/complimentary status,
- history.

For a manual grant:
1. Select exact scope.
2. Select duration if supported.
3. Enter reason.
4. Preview exact effect.
5. Confirm through backend-required confirmation.
6. Execute.
7. Refresh authoritative entitlement state.
8. Show verification result and audit reference.

Make manual/complimentary access visibly different from paid entitlement.

Do not let the frontend call a generic database update.

For revoke/expire, follow the same controlled flow.
VERIFICATION GATE
Manual grant requires reason.
Preview matches requested scope.
Backend confirmation is enforced.
Post-action state is refreshed.
Audit reference is visible where appropriate.
Paid and complimentary access are distinguishable.
Do not declare this phase complete until every applicable gate passes and evidence is reported.
F7 — Questions & Content
Purpose: Create controlled question-bank and content operations.
COPY-PASTE PROMPT
Implement Questions & Content.

Required:
- question search/filter,
- subject/taxonomy filters,
- review status,
- provenance,
- question version,
- flags/reports,
- answer-key visibility according to admin permission,
- version history,
- review workflow,
- safe retirement/version actions.

Use version-aware UI.

When editing:
- show current version,
- show proposed change,
- explain whether a new version will be created,
- require reason where backend requires it,
- show impact before save.

Never make historical versions disappear simply because a newer version exists.

Do not create a generic spreadsheet-like unrestricted database editor.
VERIFICATION GATE
Version history is visible.
Historical versions preserved.
Mutations use backend workflows.
Unauthorized answer-key changes are blocked.
Audit state is visible.
Do not declare this phase complete until every applicable gate passes and evidence is reported.
F8 — Learning Analytics
Purpose: Provide operational visibility into how students are learning.
COPY-PASTE PROMPT
Implement Learning Analytics using backend canonical metrics.

Include, where supplied:
- active learning,
- sessions,
- subject activity,
- syllabus coverage,
- mastery distributions,
- recommendation activity,
- study consistency,
- CBT learning-performance summaries.

Support filters:
- time window,
- subject,
- relevant cohort dimensions supplied by backend.

Clearly distinguish:
- observed activity,
- mastery estimates,
- syllabus coverage,
- readiness.

Do not present mastery as a guaranteed JAMB score.

Provide drill-down only where the backend permits it.
VERIFICATION GATE
Metrics reconcile with backend.
Mastery is labeled as an estimate.
Coverage is distinct from mastery.
Filters work correctly.
No unsupported predictions are displayed.
Do not declare this phase complete until every applicable gate passes and evidence is reported.
F9 — Product Analytics
Purpose: Show how SABI itself is being used without confusing product metrics with learning outcomes.
COPY-PASTE PROMPT
Implement Product Analytics.

Use canonical product events and backend analytics.

Possible sections:
- activation/onboarding completion,
- diagnostic completion,
- Smart Practice usage,
- Blitz usage,
- Custom Practice usage,
- CBT usage,
- retention/activity,
- feature adoption,
- conversion/payment,
- AI-credit usage.

Every metric must identify its time period and definition where ambiguity exists.

Do not silently create new event semantics in the frontend.

Do not interpret engagement alone as learning success.
VERIFICATION GATE
Canonical event definitions are used.
Time windows are correct.
Learning outcomes and engagement are separated.
No duplicate analytics events are created accidentally.
Do not declare this phase complete until every applicable gate passes and evidence is reported.
F10 — CBT Operations
Purpose: Give admins a safe operational view of CBT sessions and failures.
COPY-PASTE PROMPT
Implement CBT Operations.

Provide:
- session search,
- status,
- student,
- exam configuration,
- start/end times,
- submission status,
- timer/expiry status,
- error state,
- diagnostic details,
- relevant question allocation information,
- safe recovery action where backend exposes one.

Do not expose controls that rewrite student answers or scores.

For a failure, show:
What happened → Evidence → Possible cause → Allowed next action.

If a recovery action exists, use the backend confirmation/verification flow.
VERIFICATION GATE
CBT sessions are searchable.
Diagnostic evidence is visible.
No score/answer tampering controls.
Recovery follows backend authorization.
Expired/submitted states are accurately displayed.
Do not declare this phase complete until every applicable gate passes and evidence is reported.
F11 — AI & RAG Operations
Purpose: Provide visibility into AI and knowledge-system health.
COPY-PASTE PROMPT
Implement AI & RAG Operations.

Show:
- provider/model metadata,
- provider health,
- routing/fallback status,
- AI usage,
- AI failure events,
- retrieval failures,
- knowledge document status,
- indexing/chunking/embedding status,
- prompt/configuration version status,
- AI-credit usage where authorized.

The UI must treat provider/model configuration as abstract infrastructure.

Do not hard-code Gemini as the only provider.

For knowledge operations, use controlled backend workflows and show version/status information.

Do not allow the frontend to bypass AI Service policy.
VERIFICATION GATE
Provider-neutral UI.
Secrets never displayed.
AI failures are traceable.
RAG status comes from backend.
Prompt/config changes are versioned where supported.
Do not declare this phase complete until every applicable gate passes and evidence is reported.
F12 — Admin AI Operations Assistant
Purpose: Create the main operator interface for diagnosing and safely acting on SABI issues.
COPY-PASTE PROMPT
Implement the Admin AI Operations Assistant.

The interface should support:
- natural-language admin request,
- conversation/history for the current operational investigation,
- evidence cards,
- diagnosis,
- uncertainty,
- proposed action,
- tool/action preview,
- risk level,
- required confirmation,
- execution state,
- verification state,
- final result.

Represent the workflow visibly:
Observe → Diagnose → Propose → Execute → Verify.

Example:
Admin: “Why can't this student access Premium AI?”
The interface should show the evidence path:
Account → Payment → Entitlement → Access decision → Relevant errors.

For a manual grant:
AI proposal → exact student/scope/duration/reason → confirmation → execution → verification.

For prohibited requests such as deleting audit logs:
show a clear restricted-action state and safe alternative.

Do not let the frontend itself decide that an AI action is safe. The backend tool registry is authoritative.

Do not display model-generated claims as facts unless supported by backend evidence/tool results.
VERIFICATION GATE
Admin AI is visually distinct from Student AI.
Tool actions require backend authorization.
Confirmation is explicit and scoped.
Execution state is visible.
Verification state is visible.
Uncertainty is clearly communicated.
Restricted actions are handled safely.
Do not declare this phase complete until every applicable gate passes and evidence is reported.
F13 — System Health
Purpose: Create an operational health center for rapid diagnosis.
COPY-PASTE PROMPT
Implement System Health.

Show:
- overall health,
- individual service/dependency health,
- recent critical errors,
- error trends where supplied,
- provider health,
- database/queue status where supplied,
- current incidents,
- correlation IDs,
- recommended next action.

Use severity and status consistently.

Each error should support a drill-down into safe diagnostic context.

If Admin AI is available, provide a contextual action such as “Investigate with Admin AI” that sends only authorized diagnostic context through the backend.
VERIFICATION GATE
Health status is backend-derived.
Secrets are never exposed.
Errors link to useful evidence.
Admin AI context is authorized/minimized.
Health states update correctly.
Do not declare this phase complete until every applicable gate passes and evidence is reported.
F14 — Jobs, Notifications & Reports
Purpose: Give the Master Admin operational controls for background work and reporting.
COPY-PASTE PROMPT
Implement:
1. Background Jobs
- job list,
- status,
- retryability,
- attempt count,
- timestamps,
- error summary,
- safe retry action.

2. Notifications
- notification status,
- failed delivery,
- relevant retry action where supported.

3. Reports
- report types exposed by backend,
- filters,
- generation state,
- download/view action,
- failure state.

Do not create direct job-state mutation controls.

Retry only through the backend job service and show the resulting verification state.
VERIFICATION GATE
Job retries use backend tools.
Retryability is respected.
Notification failures are clear.
Report generation states are accurate.
No privileged direct mutation is added.
Do not declare this phase complete until every applicable gate passes and evidence is reported.
F15 — Audit Logs
Purpose: Make administrative actions traceable and reviewable.
COPY-PASTE PROMPT
Implement Audit Logs.

Support:
- action,
- actor,
- role,
- target,
- timestamp,
- reason,
- result,
- correlation/request ID,
- confirmation metadata where supplied.

Provide filters for actor, action, target type, result and time.

Show safe before/after summaries when backend supplies them.

Never display secrets.

Do not provide a delete-audit-log control through normal Admin UI.

If an action is restricted to a human maintenance workflow, represent that restriction clearly.
VERIFICATION GATE
Audit records are backend-authoritative.
Secrets are redacted.
Filters work.
Sensitive actions can be traced.
No normal delete control exists.
Do not declare this phase complete until every applicable gate passes and evidence is reported.
F16 — Admin Users, Permissions & Settings
Purpose: Provide controlled management of administrators without creating privilege-escalation paths.
COPY-PASTE PROMPT
Implement Admin Users, Permissions & Settings.

Admin Users:
- list administrators,
- role/status,
- permissions summary,
- account state,
- supported role changes,
- audit history.

Settings:
- operational settings exposed by backend,
- AI/provider configuration metadata,
- notification settings,
- system preferences where authorized.

MASTER_ADMIN must remain protected as the highest role.

Do not allow a client-side role selector to grant authority. All role changes must pass through backend authorization and audit.

Do not invent the complete future permission matrix if it remains OPEN; render only capabilities supported by backend.
VERIFICATION GATE
Role changes are backend-authorized.
Privilege escalation is prevented.
MASTER_ADMIN protection is enforced.
Settings use explicit backend contracts.
Changes are audited.
Do not declare this phase complete until every applicable gate passes and evidence is reported.
F17 — Global UX, Security & Accessibility QA
Purpose: Make the Admin Portal reliable for real operational use.
COPY-PASTE PROMPT
Perform a full frontend quality pass.

Check:
- desktop responsiveness,
- tablet usability,
- keyboard navigation,
- focus management,
- semantic labels,
- color/contrast through the existing design system,
- loading states,
- empty states,
- error states,
- permission-denied states,
- stale data,
- retry behavior,
- destructive confirmation,
- double-submit prevention,
- navigation consistency,
- session expiry,
- unauthorized backend response handling,
- sensitive-data rendering,
- secret exposure,
- client bundle inspection.

Test high-impact flows:
- entitlement grant,
- entitlement revoke,
- content mutation,
- job retry,
- Admin AI execution,
- restricted operation refusal.

Do not treat visual polish as a substitute for authorization testing.
VERIFICATION GATE
No critical accessibility blockers.
No client-side secret exposure.
Double-submit is prevented.
Permission/error states are usable.
High-impact actions are confirmable and safe.
Do not declare this phase complete until every applicable gate passes and evidence is reported.
F18 — Admin Frontend E2E & Production Gate
Purpose: Prove the entire Admin Portal works against the real Admin backend contract.
COPY-PASTE PROMPT
Run the final Admin Frontend E2E gate.

Scenario 1:
MASTER_ADMIN signs in → Dashboard → Students → Student Detail → Payments → Entitlements → complimentary grant → confirmation → verified result → audit.

Scenario 2:
Dashboard identifies CBT issue → CBT Operations → diagnostic → Admin AI investigation → evidence → proposed remediation → permitted/restricted outcome.

Scenario 3:
Questions → inspect version → controlled content action → confirmation → updated version → audit.

Scenario 4:
System Health → provider failure → AI/RAG status → Admin AI diagnosis.

Scenario 5:
Admin AI attempts a restricted audit-log deletion → UI/backend refuse → safe explanation.

Scenario 6:
Non-admin attempts /admin and protected operations → denied.

Then run:
- type check,
- lint if configured,
- unit tests,
- integration tests,
- E2E tests,
- production build.

Create a final matrix:
Feature | Route | Backend contract | Test | Result | Known limitation | Risk

Do not call the Admin Portal production-ready if a critical authorization, data-leak, secret-exposure, or high-impact mutation test fails.
VERIFICATION GATE
All critical E2E scenarios pass.
Non-admin denial passes.
High-impact actions are verified.
Restricted Admin AI action is refused.
Production build passes.
Remaining limitations are documented.
Do not declare this phase complete until every applicable gate passes and evidence is reported.
6. ADMIN FRONTEND VERIFICATION MATRIX
Area
Requirement
Pass condition
Access
Admin authentication
MASTER_ADMIN can enter; unauthorized users cannot.
Routing
Protected routes
Deep links remain protected by backend authorization.
Students
Student operations
Search/detail use authoritative backend data.
Payments
Payment investigation
Payment truth is never edited from UI.
Entitlements
Manual access
Preview → confirmation → execution → verification → audit.
Content
Question management
Versioning/history preserved.
Learning Analytics
Learning metrics
Mastery/coverage are clearly distinguished.
Product Analytics
Usage metrics
Canonical events are used.
CBT
Operational integrity
No answer/score tampering controls.
AI/RAG
Provider-neutral
UI does not assume Gemini.
Admin AI
Operator workflow
Observe → Diagnose → Propose → Execute → Verify visible.
Tools
Action safety
Frontend cannot bypass backend tool registry.
System
Health
Safe diagnostics, no secrets.
Jobs
Retry
Only backend-authorized retry.
Audit
Traceability
Sensitive admin actions traceable.
Permissions
Admin management
No client-side privilege escalation.
Security
Secrets
No service-role/provider secrets in browser.
UX
Failure states
Loading/empty/error/denied states are useful.
E2E
Lifecycle
Representative Master Admin workflows pass.

7. DEFINITION OF FRONTEND IMPLEMENTED
The route exists and is connected to the intended Admin backend contract.
The UI handles loading, success, empty, error and permission-denied states.
Backend authorization remains authoritative.
No privileged database mutation is performed directly from the browser.
High-impact operations show exact scope and required confirmation.
Mutations refresh/revalidate authoritative state.
Audit/correlation information is surfaced where appropriate.
Automated tests cover both successful and denied paths.
Production build/type checks pass or blockers are explicitly reported.
No locked SABI decision was silently changed.
No OPEN backend decision was silently invented in the frontend.
8. FINAL ADMIN UX PRINCIPLE
The Master Admin should experience SABI as an operational control center, not as a database interface. The portal should answer three questions quickly: What is happening? What needs attention? What safe action can I take next?
The Admin AI interface should make complex investigation easier without making the system less controlled. The AI proposes and operates through explicit backend capabilities; the portal makes scope, risk, confirmation and verification visible.

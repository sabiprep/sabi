# SABI — Product Direction and Implementation Plan

**Status:** Planning document  
**Product reference:** [`sabi-main-doc.md`](./sabi-main-doc.md)  
**Implementation status:** No code changes have been made as part of this planning document.

## 1. Purpose of this document

This document records the proposed product structure and implementation sequence for SABI before development resumes. The master specification remains the source of truth for approved product and technical requirements. Proposed routes, menus, and sequencing details below are planning recommendations; they do not silently change the specification or decide items it marks as open.

## 2. What SABI is intended to do

SABI is a JAMB preparation platform built around a central learning record. It should not be just a set of practice screens: student activity should produce trustworthy learning evidence, which informs mastery and coverage, which in turn informs useful next actions and coaching.

**Learning activity → recorded evidence → mastery and coverage → recommended next action → explanation or coaching**

The four learning experiences have distinct roles:

- **Smart Practice:** SABI selects useful questions based on the student’s learning state.
- **Blitz:** a low-friction, one-question-at-a-time experience, separate from Custom Practice. Speed must not affect rewards or learning decisions.
- **Custom Practice:** the student deliberately chooses what to practise.
- **CBT Simulator:** a strict JAMB-style exam, separate from practice and coaching.

All four experiences contribute to **one central learning state per student**. AI can explain and coach, but it must not decide correctness, mastery, readiness, or recommendations. Those decisions belong to trusted, deterministic learning services.

The first delivery goal is a web app that works end-to-end with real accounts and persisted learning data—not simply a more polished demo. Capacitor and Android packaging should follow once that web foundation is dependable.

## 3. Proposed screen and route structure

The master document defines 15 canonical student screen families. A practical implementation may use more individual routes to keep authentication and learning flows clear. The following route map is a proposal to review before implementation; it is not a change to the approved screen requirements.

### Public and authentication

- `/` — brief branded splash/loading screen, then route based on onboarding/auth state
- `/welcome`
- `/auth/sign-up`
- `/auth/sign-in`
- `/auth/verify`
- `/auth/forgot-password`

### First-time setup

- `/onboarding/:step` — 15 distinct guided steps
- `/diagnostic`

Onboarding should be a guided flow with 15 distinct steps, validation, and resumable progress rather than one long form. New users should proceed through onboarding and the diagnostic before reaching the main app; returning users should resume from the appropriate point.

The splash is a short transition, not a destination or an indefinite loading screen. Use the approved `logo.svg` if supplied; the repository currently has `public/icon.svg`, so confirm whether that is the intended logo or provide the correct asset.

### Main app

- `/home`
- `/subjects`
- `/progress`
- `/recommendations`
- `/profile`

### Learning experiences

- `/practice`
- `/practice/smart`
- `/practice/blitz`
- `/practice/custom`

### Sessions and exams

- `/session/:id/question/:number`
- `/session/:id/explanation`
- `/session/:id/results`
- `/cbt/:examId`
- `/cbt/:examId/results`

Routes should use shared layouts and reusable components while keeping each destination and flow distinct. The exact route names and whether some related screens share a URL remain implementation decisions to confirm.

## 4. Main navigation and three-line menu

The specification calls for student navigation covering **Home, Practice, CBT, Progress, and Profile**. These should remain the primary destinations, adapted for mobile and desktop layouts.

The three-line menu should contain secondary destinations rather than duplicating the primary navigation. Proposed contents:

- Mistake notebook / review queue
- Study resources, such as formula reference and syllabus
- Help and support
- About SABI
- Settings and account/privacy shortcuts
- Sign out

A calculator should appear contextually in practice or an eligible CBT exam, not as a primary destination. Novel, oral-English, leaderboard, and other supplementary features should be reviewed against the product specification before deciding whether to retain, defer, or remove them.

Notifications should have a clear bell entry in the app header and a dedicated notifications screen or panel, rather than being buried in the three-line menu. Define empty, unread, read, and action states; do not show fabricated notifications.

Student navigation must not expose admin tools. Admin, parent, and school surfaces are separate concerns; permission details that the master document leaves open must remain undecided until approved.

## 5. Visual design and technology

### Color and brand

The approved palette direction is **deep blue and rich yellow as the brand colors**, with white used sparingly as a surface in light mode. Both light and dark themes are required. The following is a recommended starting palette; the color direction is agreed, while these exact hex values remain proposed for visual review.

| Token | Light theme | Dark theme | Use |
|---|---|---|---|
| Brand blue | `#1E3A8A` | `#93C5FD` | Primary actions, links, selected navigation, focus |
| Deep blue | `#0B1F4B` | `#07152F` | Brand foundation, app chrome, strong headings |
| Brand yellow | `#D4A900` | `#F2C94C` | Highlights, progress accents, small emphasis areas |
| Yellow foreground | `#0B1F4B` | `#0B1F4B` | Text and icons on yellow surfaces |
| Page background | `#F1F5F9` | `#08111F` | Main app canvas |
| Surface | `#FFFFFF` | `#101D30` | Cards, menus, dialogs, and inputs |
| Primary text | `#0F172A` | `#F8FAFC` | Main text and headings |
| Secondary text | `#475569` | `#CBD5E1` | Supporting text and labels |
| Border | `#CBD5E1` | `#26364D` | Dividers and card/input borders |

Let deep blue carry most of the interface, including primary controls and navigation. Use rich yellow selectively for highlights and important emphasis. Keep white mostly for light-mode cards and reading surfaces rather than treating it as a third loud brand color. Do not use yellow for small text on white; yellow does not provide sufficient text contrast. When yellow is used as a fill, use the deep-blue foreground token.

### Theme behavior

- Offer **Light**, **Dark**, and **System** preferences.
- On first visit, follow the device preference. Once a student chooses a theme, persist that preference locally.
- Apply the theme consistently across routes, forms, dialogs, menus, and learning states.
- Distinguish selected, correct, incorrect, flagged, and disabled states with labels, icons, shapes, or text—not color alone.
- Check text, controls, focus rings, and status indicators for accessible contrast in both themes.

### Visual language and layout

- **Personality:** focused, trustworthy, encouraging, and energetic; a serious learning tool rather than a game-first product.
- **Typography:** continue the existing Inter body text and Plus Jakarta Sans headings as the initial choice; review font loading and hierarchy during the design pass.
- **Layout:** mobile-first and responsive. Use clear hierarchy, readable question text, comfortable touch targets, and predictable page widths. Desktop can use a sidebar; mobile can use compact primary navigation and a separate secondary menu.
- **Components:** define shared tokens and reusable buttons, fields, cards, progress displays, question options, feedback panels, dialogs, navigation, and empty/error/loading states before styling each feature separately.
- **Density and decoration:** favor whitespace, restrained borders, and simple surfaces. Use motion only to clarify transitions; honor reduced-motion preferences. Keep gamification visually secondary to learning.

This follows the master document’s direction for a fast, clean, energetic, minimal, mobile-first experience, with responsive layouts, visible interaction states, and no color-only status communication. The master document leaves exact visual tokens to be separately approved.

### Technology direction

The existing React, TypeScript, Tailwind, and Vite foundation is suitable for the web app. Organize the application around explicit routes, page components, shared layouts, reusable UI components, and clear boundaries between the frontend and backend services.

The current app includes a mobile-style interface and sample profile data in [`src/ProductionApp.tsx`](./src/ProductionApp.tsx). Those demo values must not be presented as real student results.

### PWA and Capacitor

PWA is **out of scope for now**, as requested. Remove or disable PWA install and service-worker behavior during the web-foundation work.

Capacitor is a later step, not a substitute for a working web product. Add it after routes, authentication, APIs, and persistence are stable. Then test Android navigation, app lifecycle, connectivity failures, and storage behavior.

## 6. Recommended implementation sequence

Follow the master document’s phased implementation approach. Do not build every feature in one pass; complete and verify each foundation before relying on it in later features.

### Frontend-first sequence

1. **Agree on the screen map and visual rules.** Confirm routes, primary navigation, three-line menu, notification entry, which current extras stay, and the proposed deep-blue/rich-yellow tokens.
2. **Create the frontend foundation.** Add real routes and separate page/layout components, responsive navigation, theme tokens, Light/Dark/System selection, shared interaction components, and baseline type-check/build validation. Remove PWA behavior.
3. **Build the branded splash and public auth UI.** Show the logo briefly, then provide distinct sign-up/sign-in and related auth screens. These are UI only at this stage—no real account creation or Supabase connection yet.
4. **Build the onboarding UI.** Implement all 15 specification questions as a validated, accessible, resumable step-by-step experience. Keep temporary progress clearly identified as prototype/local state; do not treat it as a secure account or production student record.
5. **Add the diagnostic flow UI.** Follow the master specification: adaptive baseline across selected subjects, explicitly distinct from the 180-question Full Mock. Do not display a real mastery claim until the backend learning services exist.
6. **Design the authenticated app shell before building its dashboard.** Confirm Home, Practice, CBT, Progress, and Profile destinations, responsive behavior, menu contents, and notification behavior. Then implement the main pages individually.
7. **Build the student main pages and supporting screens.** Implement Home, Practice mode entry, CBT entry/history, Progress, Recommendations, Profile/Settings, the secondary-menu destinations, and Notifications as separate page/screen components with loading, empty, and error states.
8. **Review the end-to-end frontend flow.** Validate splash → auth UI → onboarding → diagnostic → main app routes, navigation, theme consistency, mobile/desktop layouts, accessibility, and that prototype data is not misrepresented.

### Backend and product integration after the frontend pass

9. **Build persistence and security foundations.** Implement the specified Supabase setup, database migrations, relationships, row-level security, and trusted server-side boundaries.
10. **Connect real authentication and persisted onboarding.** Wire the existing auth pages and onboarding to approved sign-in methods and secured profile storage.
11. **Build the JAMB content foundation and shared learning record.** Establish subject combinations, taxonomy, question quality/versioning, sessions, and canonical learning events.
12. **Implement the learning engines.** Build and test mastery, coverage, question selection, recommendations, and readiness as deterministic services.
13. **Connect Smart Practice, Blitz, Custom Practice, CBT, and AI.** Keep the experiences distinct and use the shared learning state. Respect the no-speed Blitz rule and CBT requirements; ground AI in approved content.
14. **Complete secondary capabilities and release QA.** Add commercial and admin capabilities only in their specified phases after open decisions are resolved. Test the full student journey and production gates.
15. **Package for Android with Capacitor.** Begin after the web app, authentication, APIs, and persistence are stable; then validate native Android behavior.

### What we start with

The first step is **not** to rebuild every screen or add Capacitor. First confirm the page map, primary and secondary navigation, notification behavior, and proposed color-token values. Then begin a frontend-first foundation: route/layout structure and theme system, followed by logo splash, auth UI, onboarding UI, diagnostic UI, and the main app shell/pages.

This changes the **order of visible frontend work**, not the need for backend foundations. Real authentication, persistence, student data, and learning claims must not be treated as production-ready until the required Supabase schema, authorization, and services are implemented and tested. The master document’s backend phases still apply before live student use.

## 7. Features to defer, remove, or correct

- **Defer PWA install and service-worker functionality** for this stage.
- **Correct Blitz** to remove speed-based rewards and learning decisions; the current speed-focused approach conflicts with the locked product direction.
- **Replace demo learning claims with real evidence.** Static scores, mastery, predictions, streaks, and sample profiles must not be presented as a student’s actual results.
- **Review supplementary tools individually.** Their presence in the current code does not make them required product features, but locked requirements should not be removed without approval.
- **Defer payments and admin surfaces** until the relevant business rules, permissions, and other open decisions have been resolved.

## 8. Decisions and inputs needed before implementation

Before development resumes, confirm or provide:

1. Confirm whether the proposed deep-blue/rich-yellow token values are acceptable.
2. Confirm whether `public/icon.svg` is the intended splash/logo asset or provide the planned `logo.svg`.
3. Which existing supplementary tools to keep, defer, or remove.
4. Confirm the proposed screen/route structure, main navigation, three-line menu, and notification behavior.
5. Later, provide Supabase project access and confirm authentication methods before real auth integration.
6. Approved sources and usage rights for JAMB questions and study content.
7. Decisions on open commercial, parent/school, and admin permissions before those features are implemented.

The agreed frontend-first scope is to design/build the auth UI now and defer live authentication integration. Where the master specification marks a decision **OPEN**, implementation should not invent a permanent product rule. Record the open decision and either defer the feature or make it configurable in an approved way.

## 9. Product potential and conditions for success

SABI has the potential to become a useful JAMB-specific learning platform because it connects practice to a shared learning record and evidence-based next actions. That potential depends on getting the fundamentals right:

- Secure student accounts and data
- Reliable, appropriately sourced question content
- Accurate recording of learning activity
- Transparent, tested mastery and readiness indicators
- Useful recommendations based on evidence
- AI that stays grounded and does not replace trusted learning logic

Payments, school access, advanced AI, and offline/mobile capabilities can expand the product later. They should not conceal gaps in these foundations.

## 10. Where we will resume

No application implementation changes were made as part of this planning work. When development resumes, review this plan against [`sabi-main-doc.md`](./sabi-main-doc.md), confirm the route/menu proposal and color tokens, and clarify the logo asset. Then implement the frontend foundation and UI flow first, with auth pages but no live auth integration. Continue into the master document’s backend phases before real student data is used; add Capacitor only after the web foundation is stable.

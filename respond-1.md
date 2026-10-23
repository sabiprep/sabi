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

- `/welcome`
- `/auth/sign-up`
- `/auth/sign-in`
- `/auth/verify`
- `/auth/forgot-password`

### First-time setup

- `/onboarding/1` through `/onboarding/15`
- `/diagnostic`

Onboarding should be a guided flow with 15 distinct steps, validation, and saved progress rather than one long form. New users should proceed through onboarding and the diagnostic before reaching the main app; returning users should resume from the appropriate point.

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

- Notifications
- Mistake notebook / review queue
- Study resources, such as formula reference and syllabus
- Help and support
- About SABI
- Account and privacy shortcuts
- Sign out

A calculator should appear contextually in practice or an eligible CBT exam, not as a primary destination. Novel, oral-English, leaderboard, and other supplementary features should be reviewed against the product specification before deciding whether to retain, defer, or remove them.

Student navigation must not expose admin tools. Admin, parent, and school surfaces are separate concerns; permission details that the master document leaves open must remain undecided until approved.

## 5. Visual design and technology

### Color and brand

The approved SABI color palette has not yet been provided. No final colors should be selected until the product owner supplies them. Once available, define shared design tokens for:

- Primary, secondary, and accent colors
- Page backgrounds and surfaces
- Primary and secondary text
- Borders and focus states
- Error, warning, and success states

Check contrast and readability across mobile and desktop rather than choosing colors on appearance alone. Logo and typography references can be incorporated into the same design-system pass.

### Technology direction

The existing React, TypeScript, Tailwind, and Vite foundation is suitable for the web app. Organize the application around explicit routes, page components, shared layouts, reusable UI components, and clear boundaries between the frontend and backend services.

The current app includes a mobile-style interface and sample profile data in [`src/ProductionApp.tsx`](./src/ProductionApp.tsx). Those demo values must not be presented as real student results.

### PWA and Capacitor

PWA is **out of scope for now**, as requested. Remove or disable PWA install and service-worker behavior during the web-foundation work.

Capacitor is a later step, not a substitute for a working web product. Add it after routes, authentication, APIs, and persistence are stable. Then test Android navigation, app lifecycle, connectivity failures, and storage behavior.

## 6. Recommended implementation sequence

Follow the master document’s phased implementation approach. Do not build every feature in one pass; complete and verify each foundation before relying on it in later features.

1. **Agree on product scope and screen map.** Confirm student journeys, routes, the three-line menu, and the disposition of existing supplementary features.
2. **Agree on the visual system.** Obtain the approved colors, logo, and typography direction; define shared tokens and page layouts.
3. **Establish the web foundation.** Set up routing, page structure, environment handling, error/loading states, and a baseline test command. Remove PWA behavior from the planned product.
4. **Build persistence and security foundations.** Implement the specified Supabase setup, database migrations, relationships, row-level security, and trusted server-side boundaries.
5. **Implement authentication and onboarding.** Add the approved sign-in methods, the 15-step onboarding flow, profile persistence, and correct first-time/returning-user routing.
6. **Build the JAMB content foundation.** Establish subject combinations, taxonomy, question-bank quality controls, and content versioning before using questions to make learning claims.
7. **Build the shared learning record.** Implement sessions and canonical learning events so activity can be recorded and used across devices and experiences.
8. **Implement the learning engines.** Build and test mastery, coverage, question selection, recommendations, and readiness as deterministic services.
9. **Connect the student experiences.** Implement Smart Practice, Blitz, Custom Practice, and CBT as distinct flows using the shared learning state. Respect the no-speed Blitz rule and the CBT requirements.
10. **Complete AI and secondary capabilities.** Connect AI to grounded content and real chat behavior. Implement commercial, notification, and admin capabilities only in their specified phases and after relevant open decisions are resolved.
11. **Complete release-level QA.** Test the full student journey, security boundaries, persistence, CBT behavior, error handling, and question quality. A successful build alone does not establish launch readiness.
12. **Package for Android with Capacitor.** Begin after the web foundation is stable; validate native behavior on Android devices.

## 7. Features to defer, remove, or correct

- **Defer PWA install and service-worker functionality** for this stage.
- **Correct Blitz** to remove speed-based rewards and learning decisions; the current speed-focused approach conflicts with the locked product direction.
- **Replace demo learning claims with real evidence.** Static scores, mastery, predictions, streaks, and sample profiles must not be presented as a student’s actual results.
- **Review supplementary tools individually.** Their presence in the current code does not make them required product features, but locked requirements should not be removed without approval.
- **Defer payments and admin surfaces** until the relevant business rules, permissions, and other open decisions have been resolved.

## 8. Decisions and inputs needed before implementation

Before development resumes, confirm or provide:

1. The approved color palette, logo, and typography direction.
2. Which existing supplementary tools to keep, defer, or remove.
3. The proposed screen/route structure and three-line menu contents.
4. Supabase project access and the authentication methods to enable.
5. Approved sources and usage rights for JAMB questions and study content.
6. Decisions on open commercial, parent/school, and admin permissions before those features are implemented.

Where the master specification marks a decision **OPEN**, implementation should not invent a permanent product rule. Record the open decision and either defer the feature or make it configurable in an approved way.

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

No implementation changes were made as part of this planning work. When development resumes, begin by reviewing this plan against [`sabi-main-doc.md`](./sabi-main-doc.md), confirming the screen/menu proposal and feature scope, and collecting the approved color palette. Then start the project-foundation phase and proceed through the specification in order.

# SABI — Frontend Direction, Page Map, and Current Status

**Purpose:** Record the agreed frontend-first direction, proposed student navigation, what is currently implemented, and what remains before SABI can be treated as a functional product.

**Product source of truth:** [sabi-main-doc.md](./sabi-main-doc.md)  
**Earlier planning document:** [respond-1.md](./respond-1.md)

> The master specification remains authoritative. This document describes the current frontend preview and implementation proposals; it does not change requirements in the master specification.

## 1. Product aim

SABI is a JAMB preparation platform intended to help a student prepare through four distinct learning experiences:

- **Smart Practice:** select useful questions based on the student's learning state.
- **Blitz:** reinforce learning with a quick, one-question-at-a-time flow. Speed must not determine learning outcomes or rewards.
- **Custom Practice:** let the student choose what to practise.
- **CBT Simulator:** provide a strict JAMB-style exam experience.

The long-term product is more than a collection of screens. Learning activity should create reliable evidence, feed one central student learning state, and support trustworthy mastery, coverage, and recommendations. AI can explain and coach, but it must not decide correctness or mastery.

The immediate work is a web frontend prototype. Real authentication, saved student records, question services, scoring, recommendations, and AI coaching require backend implementation and are not provided by the current preview.

## 2. Main navigation and three-line menu

### Primary navigation

The five main destinations follow the student navigation in the master specification:

1. **Home** — student landing page and next-step links.
2. **Practice** — entry point to Smart Practice, Blitz, and Custom Practice.
3. **CBT** — mock-exam options and, when implemented, exam history.
4. **Progress** — learning evidence and progress views.
5. **Profile** — profile and appearance/account settings.

The Home dashboard is the main directory: its cards link to Practice, CBT, Progress, and Profile. Practice-specific modes are listed inside the Practice page. The desktop sidebar has been removed to avoid duplicating these destinations; narrow layouts retain a compact bottom navigation bar. A separate three-line menu is available for secondary destinations.

### Three-line menu: secondary destinations

The current proposed menu contains:

- **Mistake notebook** — questions marked for review.
- **Study resources** — syllabus and reference materials.
- **Help & support**
- **About SABI**
- **Settings & privacy**
- **Exit preview** — clearly identified as a preview-only exit, not a real account sign-out.

The menu is not a duplicate of the five primary destinations. Notifications have their own bell entry and `/notifications` page. Admin tools are not included in the student menu. A calculator belongs in an appropriate practice or eligible CBT context rather than as a main destination.

These secondary destinations currently have route entries, but several are informational placeholders. Their real content and behavior still need to be built. The menu contents remain open for owner approval.

## 3. Proposed student screen map

Each destination should be its own page or screen component even when shared layouts and components are reused.

| Screen family | Proposed routes | Current preview status |
|---|---|---|
| Splash and welcome | `/`, `/welcome` | Implemented as frontend preview |
| Authentication UI | `/auth/sign-up`, `/auth/sign-in`, `/auth/verify`, `/auth/forgot-password` | UI routes work; no account or OTP service is connected |
| Guided onboarding | `/onboarding/:step` | Fifteen-step prototype with validation and browser-local draft |
| Diagnostic | `/diagnostic` | Question-flow preview using bundled sample questions; not a real mastery assessment |
| Main destinations | `/home`, `/practice`, `/cbt`, `/progress`, `/profile` | Separate routes and page components; data-dependent capabilities are previews/placeholders |
| Subject and recommendation views | `/subjects`, `/recommendations` | Route placeholders; real content/data remains to be implemented |
| Practice modes | `/practice/smart`, `/practice/blitz`, `/practice/custom` | Route placeholders; no real question selection/session engine |
| CBT session and results | `/cbt/:examId`, `/cbt/:examId/results` | Route placeholders; no functioning exam engine or scoring |
| Practice sessions | `/session/:sessionId/question/:number`, `/session/:sessionId/explanation`, `/session/:sessionId/results` | Route placeholders; no persisted session or result service |
| Notifications | `/notifications` | Dedicated preview page; no notification service or real notifications |
| Secondary destinations | `/menu/:section` | Shared placeholder route; each destination still needs its own content/behavior |

This is a proposed route map that makes the product's destinations explicit. Routes alone do not mean the underlying feature is complete.

## 4. Visual system

The agreed brand direction is **deep blue and rich yellow**, with white used sparingly and primarily as a light-theme surface. Light and dark themes are included. Current CSS uses proposed starting values:

- Deep blue: `#0B1F4B`
- Blue: `#1E3A8A`
- Rich yellow: `#D4A900` / `#F2C94C`

The artwork treatment is approved: use the supplied SABI illustration as subdued, blue-toned decorative art on authentication and onboarding—not as a busy image behind form fields. `sabi.svg` wraps an embedded JPEG rather than being pure vector artwork; the app uses it with CSS grayscale/blend treatment and keeps the original files unchanged. The exact color hex values remain proposed pending final visual confirmation. Yellow should be used selectively; small yellow text on white is not sufficiently legible. Use deep blue for text/icons on yellow fills, and check contrast and focus states in both themes.

### Frontend framework decision

Keep **React + TypeScript + Tailwind + Vite** as the foundation. Ionic React is not required for Capacitor and would add a framework migration and component conventions without solving the current visual-design issue. Build the responsive SABI design system on the existing stack, then add Capacitor after the web app and backend are stable. Reassess Ionic only if a specific native UI requirement justifies it.

The preview includes Light, Dark, and System theme options. Theme choice is stored in the current browser only; it is not synchronized to an account.

## 5. Agreed implementation order: steps 1–8

1. **Confirm screen map and visual rules.** Agree on routes, primary navigation, secondary menu, notification behavior, supplementary features, and exact palette values.
2. **Set the frontend foundation.** Use the existing React, TypeScript, Tailwind, and Vite stack with explicit routes, page components, shared layouts, responsive navigation, and theme tokens. Keep PWA out of scope.
3. **Build the splash and authentication screens.** Create the logo splash and distinct sign-up, sign-in, verification, and reset-password screens. These are UI-only until authentication is integrated.
4. **Build guided onboarding.** Implement all 15 questions with validation, subject rules, and resumable draft behavior. Browser-local preview data is not a production student record.
5. **Build the diagnostic flow.** Keep it distinct from CBT. Do not claim real mastery or readiness without the required learning services and trusted data.
6. **Establish the authenticated app shell.** Build the five primary destinations, desktop/mobile navigation, secondary menu, and notification entry.
7. **Complete the individual pages.** Implement Home, Practice modes, CBT, Progress, Profile, Notifications, and each approved secondary destination with suitable loading, empty, and error states.
8. **Verify the frontend journey.** Check auth UI → onboarding → diagnostic → app navigation, themes, layout, accessibility, and ensure preview content cannot be mistaken for real student results.

Steps 2–6 have an initial preview implementation. Step 7 is only partly complete because multiple pages and flows remain placeholders. Step 8 has had focused interactive checks, but broader responsive, accessibility, and product-flow review is still needed.

## 6. Current build and whether it is functional

### What currently works

- The Vite/React project starts with npm and serves the preview on `http://localhost:3000`.
- The app has explicit routes and separate page components for the public screens, onboarding, diagnostic, and major student destinations.
- The splash/welcome/auth screens, onboarding steps, diagnostic question flow, app navigation, secondary menu, notifications page, and theme controls can be opened and interacted with.
- Onboarding checks required fields and subject selection rules and saves a draft in browser `localStorage`.
- Home dashboard cards link to the four main destinations, with the desktop sidebar removed and mobile bottom navigation retained.
- PWA plugin/configuration has been removed from the active build.

### What is not yet functional as a production product

- Authentication is a visual preview only. No account, password, OTP, Google sign-in, or secure session is created.
- Onboarding is not securely saved to a user profile; browser-local storage is only preview behavior.
- Diagnostic questions are sample content. The flow does not establish actual mastery, readiness, or a trustworthy score.
- Smart Practice, Blitz, Custom Practice, CBT sessions, scoring, explanations, progress, and recommendations do not yet have their required complete data/services.
- Notifications, mistake review, resources, and several secondary pages do not have production data or completed feature behavior.
- There is no production database, authorization/RLS policy, content-management workflow, or persisted shared learning state wired into this frontend.
- Capacitor/Android packaging has not been started and should remain deferred until the web product and backend foundation are stable.

**Verdict:** the current build is functional as a navigable, interactive frontend preview. It is **not yet a fully functional student learning web app** and is not ready for live student accounts or learning claims.

## 7. Run and validate the preview

From the repository root:

```bash
npm run dev
```

Open `http://localhost:3000`. The current development server is already responding at that address. If it has stopped, rerun the command above.

Validation completed for this frontend pass:

- `npm run lint` — passed (`tsc --noEmit`).
- `npm run build` — passed.
- Interactive browser check — auth phone-preview route, Home, menu, Notifications, and theme selection were opened successfully with no browser page errors during that check.

There is not yet a comprehensive automated end-to-end test suite. Mobile layout should still be checked on an actual narrow viewport/device.

## 8. Work that follows the frontend pass

Once the frontend routes and screen behavior are approved:

1. Establish the backend and data model in line with the master specification, including migrations and access controls.
2. Connect real authentication and securely persist onboarding.
3. Build the approved JAMB question/content foundation and canonical learning-event record.
4. Implement deterministic mastery, coverage, question selection, recommendations, and readiness services.
5. Connect Smart Practice, Blitz, Custom Practice, CBT, and grounded AI coaching to the same learning state while preserving their distinct rules.
6. Complete secondary features, accessibility/security QA, operational readiness, and release checks.
7. Add Capacitor and validate Android behavior only after the web app, authentication, APIs, and persistence are stable.

Do not represent local preview data as real student data. Do not use AI as the authority for correctness or mastery. Do not add PWA back into the current scope.

## 9. Decisions to confirm before the next design pass

1. Approve or adjust the exact blue/yellow hex values.
2. Approve the current logo/icon treatment.
3. Approve the proposed five primary destinations and secondary menu items.
4. Confirm which supplementary features should stay, be deferred, or be removed.
5. Review the individual page designs before connecting backend services.

The current preview is a practical starting point for that review, not a claim that the full SABI product is finished.

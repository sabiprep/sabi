# SABI — Transparent Vector Wallpaper Update

**Purpose:** Record the latest UI update using the approved transparent SABI vector.

**Product reference:** [sabi-main-doc.md](./sabi-main-doc.md)  
**Previous planning/status document:** [respond2.md](./respond2.md)

> This is a new response document. The previous `respond2.md` is retained as-is and is not replaced by this file.

## 1. Design direction

The approved SABI vector is used both as a full illustration on desktop authentication and as a subtle repeating wallpaper across the app.

The blue, yellow, and white palette applies to interface elements—such as cards, buttons, headers, and interaction states—not to the wallpaper. The wallpaper should feel like the light repeating illustrations in messaging apps: visible as a quiet texture, but not strong enough to compete with page content.

## 2. What changed

- Added the transparent vector as a Vite public asset at [public/sabi-transparent.svg](./public/sabi-transparent.svg). The original [sabi-transparent.svg](./sabi-transparent.svg) remains unchanged.
- Added a repeated, small-scale wallpaper to the splash, welcome, authentication, onboarding, diagnostic, and student-app surfaces.
- Set low wallpaper opacity for light and dark themes, while leaving the established interface colors unchanged.
- Kept the complete SABI illustration in its own desktop authentication panel.
- Removed the promotional description from the authentication illustration panel so it no longer competes with the artwork.
- On mobile, hid the full illustration panel and kept the authentication form in a clear, solid card over the faint wallpaper.
- Kept onboarding question content on its existing clear surface so the wallpaper does not impair reading or form completion.
- Updated [src/app/app.css](./src/app/app.css), [src/pages/PublicPages.tsx](./src/pages/PublicPages.tsx), and [src/pages/OnboardingPage.tsx](./src/pages/OnboardingPage.tsx) as needed for this implementation.

## 3. Current behavior

### Desktop authentication

The full SABI vector appears in a dedicated dark panel beside the auth form. The right-side form remains on a separate, solid surface. The illustration is decorative and has no impact on form behavior.

### Mobile authentication

The full illustration panel is hidden to preserve space and keep the form focused. The brand header and auth card remain visible over the faint page wallpaper.

### Onboarding and main app

The transparent illustration repeats at a small scale behind the page surfaces. Onboarding questions, dashboard cards, and controls remain visually separated from the background.

### Theme behavior

Wallpaper opacity changes between light and dark theme tokens. The wallpaper is static and does not animate. The interface palette and theme surfaces continue to control the main visual hierarchy.

## 4. Validation

- `npm run lint` — passed.
- `npm run build` — passed; the SVG is included in the production output.
- `git diff --check` — passed.
- Browser checks covered auth, onboarding, diagnostic, welcome, Home, Practice, CBT, Progress, Profile, and Notifications. The vector loaded and no browser page errors were reported.
- The preview server was stopped after verification. Run `npm run dev` from the repository root to start it again.

## 5. Scope and remaining work

This update is a visual UI change only. It does not connect authentication, onboarding, questions, progress, or other features to production backend services. It does not change the previously agreed page map, student navigation, menu contents, or decision to defer Capacitor until the web and backend foundations are stable.

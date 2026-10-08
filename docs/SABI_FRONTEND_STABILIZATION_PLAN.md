# SABI Frontend Stabilization Plan

## Source of truth
The supplied SABI mobile reference is the visual and interaction source of truth.

## Product direction
- Mobile-first.
- Light and dark themes share the same information architecture.
- Desktop is an adaptation of the mobile product, not a separate dashboard concept.
- Prioritize clarity, hierarchy, touch targets, and working navigation.
- Do not add speculative product features while the core flows are being stabilized.

## Build order
1. App shell: responsive layout, header, bottom navigation, desktop adaptation.
2. Home: greeting, Your Next Move, Learning Space, Progress, Recent Activity, Recommendations.
3. Practice: Smart Practice, Quick Practice and session entry.
4. Question flow: answer, check, feedback, next, result.
5. Blitz: setup -> active session -> completion.
6. CBT: setup -> active CBT -> result.
7. AI Tutor.
8. Profile / Settings / Appearance.
9. Theme verification across every screen.

## Verification gate for each slice
- TypeScript/Vite build must pass.
- Every visible navigation control must have a real destination or intentional no-op.
- Back controls must return to a meaningful previous screen.
- Mobile layout must not horizontally overflow.
- Desktop layout must remain coherent at large widths.
- Light and dark themes must both retain readable contrast.
- Bottom navigation must not cover scrollable content.
- Primary CTAs must advance the intended flow.

## Final gate
Do not merge until Vercel reports a successful build for the final commit.

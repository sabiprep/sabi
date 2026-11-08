# Production migration history reconciliation

On 2026-11-08, the Supabase production project `dnrzixaasphxiswjyglj` was missing the backend service foundations and notification worker migrations even though both SQL files existed in the repository.

The two migrations were applied to production in dependency order. Supabase's MCP `apply_migration` operation assigns its own server-side timestamp; it does not accept the repository migration version. Production therefore recorded:

- `20261108171326_backend_service_foundations`
- `20261108171333_notification_worker`

The repository migration files and CI execution order are aligned to those exact applied versions. The original orphan filenames were removed so local migration history and production history use the same version identifiers.

Both migrations are additive. The backend foundation creates subscription, payment, AI usage/credit, notification, gamification, knowledge and school-support tables with RLS and service-role boundaries. The notification worker adds in-app notifications and service-only queue claim/finalize functions.

No learner rows, question-bank rows, subscription plans, AI prices, XP rules, or notification templates were seeded or modified by this reconciliation.

Verification:
- Confirmed both migrations appear in production migration history.
- Confirmed the expected new tables were absent before application.
- CI assertion files remain in place and run after the migrations in timestamp order.

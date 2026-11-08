# Supabase migration history and production deployment guard

## Reconciled production baseline

The production project's migration ledger was inspected read-only on 2026-11-08. The exact SQL for all 12 applied migrations was recovered from `supabase_migrations.schema_migrations.statements` in the live database. The repository now contains canonical timestamped files with the exact remote versions and names:

| Version | Migration |
| --- | --- |
| 20261105140638 | create_question_bank |
| 20261106185031 | profile_privilege_hardening |
| 20261106185050 | phase1_foundation |
| 20261106185843 | profile_public_acl_hardening |
| 20261107091631 | phase1_3_catalog_acl_hardening |
| 20261107091641 | phase1_4_syllabus_taxonomy_foundation |
| 20261107094659 | phase1_5_profiles_select_rls_initplan |
| 20261107202019 | core_learning_attempts_and_mastery |
| 20261107202140 | learning_data_read_policies |
| 20261107202321 | support_full_utme_cbt_sessions |
| 20261108080305 | phase2_adaptive_learning |
| 20261108080415 | phase2_atomic_mastery_upsert |

The old noncanonical migration filenames were removed from `supabase/migrations` so the Supabase CLI will not mistake them for additional pending versions. The Phase 0 security reference script is preserved at `supabase/reference/phase0_security.sql`; it is not a migration in the remote ledger.

## New migrations awaiting production

The following files are new, additive migrations and were not present in the production ledger at the time of inspection:

- `20261108150000_phase1_5_intelligence_data_layer.sql`
- `20261108160000_phase1_6_universal_signal_layer.sql`

Phase 1.5 adds normalized learner profiles, subject selections, goals/preferences, consent history, syllabus objectives, question provenance/review history, learning telemetry, mastery history, engine registry/run traces, recommendation feedback and score-prediction history.

Phase 1.6 adds canonical signal definitions and versions, signal observations/current/history, engine contracts and subscriptions, engine input snapshots, transactional outbox, and atomic onboarding/check-in projection RPCs.

Associated idempotent seeds are separate:

- `supabase/seeds/phase1_5_engine_registry.sql`
- `supabase/seeds/legacy_question_provenance_backfill.sql`
- `supabase/seeds/2026_jamb_subject_catalogue.sql`
- `supabase/seeds/simulation_personas.sql`
- `supabase/seeds/phase1_6_signal_registry.sql`

The simulation persona seed uses a private `sabi_simulation` schema and synthetic archetypes only. It does not create auth users or mix synthetic activity into production learner metrics.

## Verification and production guard

Backend CI uses disposable PostgreSQL and runs the recovered production migrations in ledger order, followed by Phase 1.5 and Phase 1.6 migrations, seeds and assertions. CI does not change the live Supabase project.

Before production migration execution:

1. Merge the migration-history reconciliation only after CI passes.
2. Run `supabase migration list` against the linked project and confirm the 12 historical versions match exactly, with only Phase 1.5 and Phase 1.6 pending.
3. Confirm the live schema preconditions and seed impact; do not publish AI-draft questions.
4. Apply only the two new migrations and their seeds, then run post-migration assertions and Supabase advisors.
5. Preserve the existing production ledger. Never insert synthetic history rows or replay historical SQL against production.

No paid Supabase branch is required or should be created for this workflow.

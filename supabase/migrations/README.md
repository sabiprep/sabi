# Supabase migration history and production status

## Production migration ledger

The exact SQL for the original 12 production migrations was recovered from `supabase_migrations.schema_migrations.statements` in the live Supabase project. Their canonical timestamped files are now in this directory:

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

The Phase 0 security reference is preserved at `supabase/reference/phase0_security.sql`; it is not a migration in the remote ledger. Old noncanonical migration filenames were removed so the Supabase CLI does not interpret them as extra pending migrations.

## Phase 1.5 and Phase 1.6 applied

Both additive migrations have been applied successfully to production:

| Version | Migration |
| --- | --- |
| 20261108111318 | phase1_5_intelligence_data_layer |
| 20261108111356 | phase1_6_universal_signal_layer |

Phase 1.5 adds normalized academic profiles, subject selections, goals and preferences, consent history, syllabus objectives, question provenance and review history, learning telemetry, mastery history, engine registry/run traces, recommendations and score-prediction snapshots, and versioned onboarding records.

Phase 1.6 adds canonical signal definitions and schema versions, signal sources, observations/current/history, engine subscriptions and contracts, exact engine input snapshots, and a transactional processing outbox. It also adds atomic onboarding and progress-check-in projection RPCs.

The legacy onboarding backfill only creates user-owned records for profile IDs that still exist in `auth.users`. A legacy profile without a matching auth account was deliberately skipped; its original `profiles` row and JSON answers were left untouched.

## Production seeds applied

- Engine registry: 10 engine records.
- Legacy question provenance: 157 source records; original source labels remain unverified and no question was auto-published.
- 2026 JAMB catalogue: 25 subjects.
- Signal registry: 13 signal definitions and 9 versioned engine contracts.

The optional `simulation_personas.sql` seed was not applied to production. It remains a QA-only synthetic dataset.

## Verification

Backend CI on the migration-history reconciliation passed against disposable PostgreSQL, including the recovered historical migrations, Phase 1.5 and Phase 1.6 migrations, seeds, and assertions. The orphan-profile regression is also covered in CI.

Production migration ledger now contains all 14 versions above. The migration-history reconciliation is complete; no synthetic history rows were inserted and no paid Supabase branch was created.

## Remaining operational work

1. Configure matching `SIGNAL_WORKER_SECRET` values in Vercel Production and GitHub Actions, plus the `SABI_SIGNAL_WORKER_URL` GitHub secret. The worker workflow currently skips safely when these are absent.
2. Deploy the latest merged application code to Vercel and verify the live API against the new schema. The Vercel deployment API currently enforces a daily deployment limit, so this deployment is pending quota reset.
3. Run authenticated end-to-end checks for onboarding projection, answer telemetry, signal processing, engine runs, recommendations, score prediction, account deletion and retry/dead-letter handling.
4. Review the Supabase advisor findings: service-only tables intentionally use RLS with no client policies (deny by default); leaked-password protection and foreign-key index recommendations remain follow-up hardening.

Never replay historical SQL or fabricate migration-history rows. Apply future schema changes as new timestamped migrations and verify them in disposable CI first.

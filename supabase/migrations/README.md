# Supabase migration directory — deployment guard

## Do not run `supabase db push` against production yet

The live Sabi project's remote migration ledger was inspected on **2026-11-08**. It currently contains:

| Version | Remote name |
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

The repository does **not** currently contain a one-to-one local migration file for every remote ledger entry. Several repository files use different timestamps/names from the remote ledger, and the source for remote `create_question_bank`, Phase 1.3, Phase 1.4 and the Phase 1.5 profile policy migration is not represented by a matching local migration file. The numbered Phase 0 scripts are retained as reviewed SQL source scripts and are not a reconciled CLI migration history.

The live schema effects of Phase 0, Phase 1, Phase 1.3, Phase 1.4 and Phase 2 were inspected separately. Do not infer that a local file is pending merely because its name differs from the remote ledger.

## Required reconciliation before production migration deployment

1. Preserve the remote migration ledger exactly as found; do not insert synthetic history rows or delete remote rows.
2. Recover the exact source SQL for each remote migration whose matching local file is missing.
3. Compare the live schema, functions, grants and RLS policies with those source files. Record any manually applied SQL separately.
4. Agree a baseline strategy with the project owner. Do not replay historical SQL to make the local migration list look aligned.
5. Ensure every new migration is timestamp-prefixed and is genuinely new relative to the remote ledger.
6. Verify the reconciled migration list against a dedicated active staging project before any production push.

## Phase 1.5 status

`20261108150000_phase1_5_intelligence_data_layer.sql` is a new additive migration staged in the Phase 1.5 pull request. It has **not** been applied to production. Its seed scripts are separate and idempotent:

- `supabase/seeds/phase1_5_engine_registry.sql`
- `supabase/seeds/legacy_question_provenance_backfill.sql`
- `supabase/seeds/2026_jamb_subject_catalogue.sql`
- `supabase/seeds/simulation_personas.sql`

The simulation persona seed creates a private `sabi_simulation` schema and synthetic archetypes only. It does not create auth users or pollute production learner metrics.

## Disposable CI execution

The backend CI workflow applies source SQL directly to an ephemeral PostgreSQL service and runs assertions. This validates the SQL and app build, but it does not reconcile or update the production migration ledger and is not a production deployment workflow.

# Supabase migration directory — deployment guard

## Important: do not run `supabase db push` from this checkout yet

The files named `0001_...` through `0004_...` are retained as reviewed SQL source scripts for the historical/manual rollout. They are **not** a reconciled Supabase CLI migration sequence. Do not use `supabase db push`, `supabase migration up`, or automated migration deployment against production until the baseline and filename/version mapping below have been resolved.

The live project's authoritative `supabase_migrations.schema_migrations` ledger was inspected on 2026-11-06 and contains:

| Version | Remote name |
| --- | --- |
| 20261105140638 | create_question_bank |
| 20261106185031 | profile_privilege_hardening |
| 20261106185050 | phase1_foundation |
| 20261106185843 | profile_public_acl_hardening |

The repository's Phase 0 SQL effects were already present in production before this work, but no matching Phase 0 entry exists in the remote ledger. The repository also does not contain a local `create_question_bank` migration file. Therefore local numbered scripts cannot safely be interpreted as pending CLI migrations.

## Required reconciliation before enabling CLI migrations

1. Preserve the remote migration ledger exactly as found; do not insert synthetic history rows or delete remote rows.
2. Compare the live Phase 0 schema/function/policy effects with the SQL source in `0001_phase0_security.sql` and document which parts were applied manually.
3. Recover or reconstruct the exact source for remote `create_question_bank` from version control/deployment records; do not infer it from the current table.
4. Agree a migration baseline strategy with the project owner. If Phase 0 is accepted as an existing baseline, record that decision in version control without replaying its SQL.
5. Convert future migrations to timestamp-prefixed filenames that exactly match the remote ledger version/name pairs. Only genuinely new migrations should be pushed.
6. Verify `supabase migration list` locally against a linked staging project first. Do not use production as the test target.

## Current source-script execution order

The disposable PostgreSQL CI fixture applies the SQL scripts in this order:

1. `0002_phase1_foundation.sql`
2. `0003_profile_privilege_hardening.sql`
3. `0004_profile_public_acl_hardening.sql`

`0001_phase0_security.sql` is not applied by the Phase 1 CI workflow because the disposable fixture represents the already-existing Phase 0 schema. The Phase 0 SQL is retained for audit/rebuild reference only.

The production project has already received the profile privilege, Phase 1 foundation, and public ACL hardening SQL through the remote migration records above. Do not reapply those scripts as new production migrations.


## Phase 2 forward migration (branch / CI only)

The Phase 2 implementation adds
`20261107100000_phase2_question_bank_lifecycle.sql`. It is a new
timestamped migration and is exercised only against the disposable
PostgreSQL CI fixture in the Phase 2 branch.

It is **not applied to the production Sabi project**.

The Phase 2 migration now includes server-only RPCs for:
- version-bound source provenance verification with auditable evidence history;
- atomic clean-batch import into draft/pending-review records only;
- student answer evaluation after submission, while the eligible-question retrieval response omits answer keys and explanations.

These RPCs are tested in disposable PostgreSQL. The student answer-evaluation assertion uses a transaction that is rolled back, so it does not leave a question eligible or alter the fixture's durable baseline.
 Production rollout
requires explicit project-owner approval after CI and migration review.
The migration is additive: it snapshots existing question rows as
version 1, preserves source labels as unverified provenance, and places
all existing records in `pending_review`. It does not rewrite question
content or promote legacy `published` rows to approved.

The Phase 2 CI workflow applies the Phase 1 source scripts through
`0007_profiles_select_rls_initplan.sql`, then applies the timestamped
Phase 2 migration and verifies both migration idempotency and question
bank lifecycle invariants.

Do not use `supabase db push` against production until the migration
baseline reconciliation above has been completed and the project owner
has explicitly approved rollout.

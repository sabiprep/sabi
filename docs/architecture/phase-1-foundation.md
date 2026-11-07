# Phase 1 foundation — implementation and verification record

**Snapshot:** 7 November 2026  
**Target repository:** `sabiprep/Sabi`  
**Production Supabase project:** `dnrzixaasphxiswjyglj` (`sabi`)  
**Status:** implementation in review; production migrations not applied by this work

## 1. Runtime architecture

- `server.ts` is the single Express entry point used by local development and the Vercel serverless handler.
- Server configuration is centralized in `server/config.ts`.
- The privileged Supabase client is centralized in `server/lib/supabaseAdmin.ts`; it refuses to boot outside tests without a server-side service-role credential.
- Authentication derives identity from a Supabase-verified bearer token. Role authorization resolves the role from `profiles` and fails closed to `STUDENT`.
- Request validation, rate limiting, and error handling are shared middleware.
- Vite builds the client; esbuild bundles the API for the Vercel/server runtime.

The API entry point remains a large module. It is authoritative and functional, but route extraction into domain modules is a maintainability task to complete without creating a second server entry point.

## 2. Live database inventory

Read-only inspection of the production project found:

| Area | Live state |
|---|---:|
| Profiles | 2 rows |
| Question bank | 3,740 rows |
| JAMB subjects | 23 rows |
| JAMB topics | 0 rows |
| Exam configurations | 2 rows |
| Exam-configuration subject mappings | 46 rows |
| Course combinations | 0 rows |
| Learning events | Table not present |

The question bank currently contains four subject labels: Biology (997 questions), Chemistry (1,043), C.R.S (995), and Use of English (705). It contains 807 distinct legacy topic labels. Those labels are useful source material, but they are not proof of an official JAMB syllabus taxonomy.

The Phase 1.4 migration adds version metadata, topic/subtopic hierarchy, source labels, verification states, and stable foreign-key references from question-bank rows. Imported legacy labels are explicitly marked `draft` and `legacy_question_bank`; no syllabus version is falsely marked verified.

## 3. Database security findings

RLS is enabled on profiles and the academic catalogue. The live policies express owner-scoped profile access and read-only catalogue intent. However, the live ACL inventory showed broad direct grants to both `anon` and `authenticated` on catalogue and audit tables, including `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `TRIGGER`, and `REFERENCES`. RLS does not protect against `TRUNCATE`.

The live default privileges for both `postgres` and `supabase_admin` also grant broad table and sequence privileges to client roles. The new Phase 1.3 migration:
- removes client ACLs from catalogue and audit tables;
- restores only `SELECT` on the six public academic catalogue tables;
- keeps audit records server-only;
- revokes future table/sequence defaults from client roles while preserving `service_role`;
- scopes the profile update policy to authenticated users;
- optimizes auth function evaluation in RLS policies; and
- adds the two missing foreign-key indexes reported by Supabase performance advisors.

The question bank remains server-only with RLS enabled and no client policy. Privileged server access is retained.

## 4. Authentication and profile controls

Existing server code verifies Supabase bearer tokens, derives user IDs from the verified token, checks roles server-side, validates request bodies, and prevents ordinary profile updates from changing protected role fields. Existing tests cover unauthenticated access to protected routes, fabricated identity fields, invalid tokens, registration validation, and account-linking conflicts.

The profile policies are owner-scoped. A complete Phase 1 exit still requires CI evidence for cross-student isolation at the API/data layer, including both reads and writes, rather than relying only on inspection of route filters and SQL policy text.

## 5. JAMB configuration

The live catalogue has stable subject slugs, aliases, active flags, and 23 subjects. The two live exam configurations are:
- Full UTME Mock: 180 questions, 120 minutes, four subjects, English compulsory.
- Quick UTME Mock: 40 questions, 30 minutes, four subjects, English compulsory.

Allowed subject mappings are centralized in `exam_configuration_subjects`. Course/institution combinations have provenance and verification states but are not yet populated. The new syllabus-version and topic hierarchy is additive; authoritative syllabus documents and effective years still need review and import before any draft topic is promoted to verified.

## 6. Migration and deployment discipline

The production migration ledger currently contains four entries:
- `20261105140638 / create_question_bank`
- `20261106185031 / profile_privilege_hardening`
- `20261106185050 / phase1_foundation`
- `20261106185843 / profile_public_acl_hardening`

The repository's disposable CI fixture uses numbered SQL filenames. Before production execution, reconcile the timestamp ledger with the checked-in migration contents and verify that no existing migration is replayed. A migration file in Git does not prove it has been applied to the live project.

No production migration is applied by this Phase 1 completion branch. The new SQL is intended for review and disposable PostgreSQL CI first. Production application requires explicit approval and post-apply verification.

## 7. Remaining decisions and exit gates

These items remain open and must not be silently decided by implementation:

1. **Email verification policy:** `SABI_INSTANT_VERIFY` currently defaults to enabled unless explicitly set to `false`. Decide whether production registration must require email confirmation.
2. **Role and permission matrix:** confirm the intended capabilities for `SUPPORT`, `ANALYST`, `CONTENT_MANAGER`, `ADMIN`, and `MASTER_ADMIN`.
3. **Onboarding contract:** confirm required academic fields and allowed registered-subject combinations.
4. **Official syllabus source:** select authoritative JAMB syllabus documents/versions and review imported draft topic labels before promotion.
5. **Production database ACL remediation:** approve and apply the reviewed least-privilege migration only after migration-ledger reconciliation.
6. **Cross-student tests:** add/confirm tests proving one authenticated student cannot read or mutate another student's profile or learning records.

Phase 1 is complete only when the numbered migrations pass the disposable PostgreSQL workflow, application type-check/tests/build pass, cross-student isolation is evidenced, live migration/schema drift is reconciled, and the remaining decisions are resolved or explicitly accepted.

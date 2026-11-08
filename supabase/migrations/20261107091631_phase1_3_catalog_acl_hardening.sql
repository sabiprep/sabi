-- SABI Phase 1.3: close inherited client grants on academic catalogues and audit data.
-- RLS filters rows; it does not neutralize TRUNCATE or excessive table ACLs.
BEGIN;

REVOKE ALL PRIVILEGES ON TABLE
  public.jamb_subjects,
  public.jamb_topics,
  public.exam_configurations,
  public.exam_configuration_subjects,
  public.course_subject_combinations,
  public.course_subject_combination_subjects,
  public.audit_logs,
  public.question_bank
FROM PUBLIC, anon, authenticated;

-- Remove existing sequence grants as well as future default grants.
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- Academic catalogues are intentionally public-read only. RLS still filters
-- inactive, unverified, or non-public rows.
GRANT SELECT ON TABLE
  public.jamb_subjects,
  public.jamb_topics,
  public.exam_configurations,
  public.exam_configuration_subjects,
  public.course_subject_combinations,
  public.course_subject_combination_subjects
TO anon, authenticated;

-- Audit records remain server-only. The existing admin policy is retained as
-- defense in depth for privileged database sessions; client roles get no ACL.

-- Prevent future tables/sequences created by either migration owner from
-- inheriting broad client privileges. Preserve service_role and owner access.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;

-- Keep owner checks role-scoped and avoid per-row auth.uid() evaluation.
DROP POLICY IF EXISTS "Candidates can update their own profile" ON public.profiles;
CREATE POLICY "Candidates can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('ADMIN', 'MASTER_ADMIN')
  ));

-- Cover both FK lookup directions identified by the live performance advisor.
CREATE INDEX IF NOT EXISTS exam_configuration_subjects_subject_slug_idx
  ON public.exam_configuration_subjects(subject_slug);
CREATE INDEX IF NOT EXISTS exam_configurations_compulsory_subject_slug_idx
  ON public.exam_configurations(compulsory_subject_slug);

COMMIT;

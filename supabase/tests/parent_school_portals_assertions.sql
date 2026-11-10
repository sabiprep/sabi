\set ON_ERROR_STOP on

DO $$
DECLARE
  v_parent uuid := '10000000-0000-4000-8000-000000000002';
  v_student uuid := '10000000-0000-4000-8000-000000000001';
  v_parent_token text := repeat('a', 64);
  v_school_token text := repeat('b', 64);
  v_parent_result uuid;
  v_school uuid;
  v_class uuid;
  v_school_result uuid;
  v_rejected boolean := false;
BEGIN
  INSERT INTO auth.users (id,email) VALUES
    (v_student,'portal-student@example.test'),
    (v_parent,'portal-parent@example.test')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.parent_student_relationships (
    parent_user_id,student_user_id,relationship_type,status,
    invitation_token_hash,expires_at
  ) VALUES (
    v_parent,v_student,'parent_guardian','pending',v_parent_token,now() + interval '1 hour'
  );

  v_parent_result := public.redeem_parent_link_invite(v_parent_token,v_student);
  IF v_parent_result <> v_parent OR NOT EXISTS (
    SELECT 1 FROM public.parent_student_relationships
    WHERE parent_user_id = v_parent AND student_user_id = v_student
      AND status = 'active' AND consent_granted_at IS NOT NULL
      AND invitation_token_hash IS NULL
  ) THEN
    RAISE EXCEPTION 'Student consent did not activate the existing parent relationship';
  END IF;

  BEGIN
    PERFORM public.redeem_parent_link_invite(v_parent_token,v_student);
  EXCEPTION WHEN OTHERS THEN
    v_rejected := true;
  END;
  IF NOT v_rejected THEN
    RAISE EXCEPTION 'A redeemed parent invitation was accepted twice';
  END IF;

  INSERT INTO public.school_organizations (name,slug,status,metadata)
  VALUES ('Portal Test School','portal-test-school','active','{"institution_type":"school"}'::jsonb)
  RETURNING id INTO v_school;

  INSERT INTO public.school_memberships (organization_id,user_id,role,status)
  VALUES (v_school,v_parent,'owner','active');

  INSERT INTO public.school_classes (organization_id,name,programme,created_by)
  VALUES (v_school,'JAMB 2027','jamb',v_parent)
  RETURNING id INTO v_class;

  INSERT INTO public.school_enrollment_invites (
    organization_id,class_id,token_hash,expires_at,created_by
  ) VALUES (
    v_school,v_class,v_school_token,now() + interval '1 hour',v_parent
  );

  v_school_result := public.redeem_institution_enrollment_invite(v_school_token,v_student);
  IF v_school_result <> v_school OR NOT EXISTS (
    SELECT 1 FROM public.school_memberships
    WHERE organization_id = v_school AND user_id = v_student
      AND role = 'student' AND status = 'active'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.school_class_enrollments
    WHERE organization_id = v_school AND class_id = v_class
      AND student_user_id = v_student AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Student-approved school enrolment was not created';
  END IF;

  v_rejected := false;
  BEGIN
    PERFORM public.redeem_institution_enrollment_invite(v_school_token,v_student);
  EXCEPTION WHEN OTHERS THEN
    v_rejected := true;
  END;
  IF NOT v_rejected THEN
    RAISE EXCEPTION 'A school invitation was accepted twice';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'parent_student_relationships'
      AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Parent relationship table must have RLS enabled';
  END IF;
  IF has_table_privilege('anon','public.parent_student_relationships','SELECT')
     OR has_table_privilege('authenticated','public.parent_student_relationships','SELECT') THEN
    RAISE EXCEPTION 'Parent relationship records must remain server-only';
  END IF;
END
$$;

SELECT 'parent/school portal migration assertions passed' AS result;

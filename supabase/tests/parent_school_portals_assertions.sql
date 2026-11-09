\set ON_ERROR_STOP on

DO $$
DECLARE
  v_student uuid := '10000000-0000-4000-8000-000000000001';
  v_parent uuid := '10000000-0000-4000-8000-000000000002';
  v_token text := repeat('a', 64);
  v_linked uuid;
  v_rejected boolean := false;
BEGIN
  INSERT INTO auth.users (id,email) VALUES
    (v_student,'portal-student@example.test'),
    (v_parent,'portal-parent@example.test')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.parent_link_invites (student_user_id,token_hash,expires_at)
  VALUES (v_student,v_token,now() + interval '1 hour');

  v_linked := public.redeem_parent_link_invite(v_token,v_parent,'guardian');
  IF v_linked <> v_student THEN
    RAISE EXCEPTION 'Parent invite returned the wrong student';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.parent_student_links
    WHERE parent_user_id = v_parent
      AND student_user_id = v_student
      AND relationship = 'guardian'
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Parent relationship was not created';
  END IF;

  BEGIN
    PERFORM public.redeem_parent_link_invite(v_token,v_parent,'guardian');
  EXCEPTION WHEN OTHERS THEN
    v_rejected := true;
  END;
  IF NOT v_rejected THEN
    RAISE EXCEPTION 'A redeemed invitation was accepted a second time';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'parent_student_links'
      AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Parent relationship table must have RLS enabled';
  END IF;

  IF has_table_privilege('anon','public.parent_student_links','SELECT')
     OR has_table_privilege('authenticated','public.parent_student_links','SELECT') THEN
    RAISE EXCEPTION 'Parent relationship table must not be directly readable by client roles';
  END IF;
END
$$;

SELECT 'parent/school portal migration assertions passed' AS result;

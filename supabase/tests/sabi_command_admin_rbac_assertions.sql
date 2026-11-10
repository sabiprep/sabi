-- SABI COMMAND delegated administration schema assertions.
-- Run against a disposable database after applying the migration.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='admin_permission_catalogue') THEN
    RAISE EXCEPTION 'admin_permission_catalogue missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='admin_role_permission_grants') THEN
    RAISE EXCEPTION 'admin_role_permission_grants missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='admin_user_role_assignments') THEN
    RAISE EXCEPTION 'admin_user_role_assignments missing';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.admin_user_role_assignments'::regclass) THEN
    RAISE EXCEPTION 'admin_user_role_assignments must have RLS enabled';
  END IF;
  IF has_table_privilege('authenticated','public.admin_user_role_assignments','SELECT') THEN
    RAISE EXCEPTION 'authenticated must not read delegated admin assignments directly';
  END IF;
  IF EXISTS (SELECT 1 FROM public.admin_user_role_assignments WHERE role_key='MASTER_ADMIN') THEN
    RAISE EXCEPTION 'MASTER_ADMIN must never be granted through delegated assignments';
  END IF;
END $$;

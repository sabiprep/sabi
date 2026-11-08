do $$
begin
  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'in_app_notifications' and c.relrowsecurity
  ) then
    raise exception 'In-app notification table is missing or RLS is disabled';
  end if;

  if has_table_privilege('authenticated', 'public.in_app_notifications', 'INSERT') then
    raise exception 'Authenticated users must not create their own in-app notification records';
  end if;

  if not has_column_privilege('authenticated', 'public.in_app_notifications', 'read_at', 'UPDATE') then
    raise exception 'Authenticated users must be able to mark their own notifications as read';
  end if;

  if has_function_privilege('anon', 'public.claim_notification_jobs(integer,text[])', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.claim_notification_jobs(integer,text[])', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.claim_notification_jobs(integer,text[])', 'EXECUTE') then
    raise exception 'Notification claim function permissions are not service-role-only';
  end if;

  if has_function_privilege('anon', 'public.finalize_notification_job(uuid,boolean,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.finalize_notification_job(uuid,boolean,text)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.finalize_notification_job(uuid,boolean,text)', 'EXECUTE') then
    raise exception 'Notification finalize function permissions are not service-role-only';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'in_app_notifications'
      and policyname = 'in_app_notifications_owner_read'
  ) then
    raise exception 'In-app notification owner-read policy is missing';
  end if;
end $$;

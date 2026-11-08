do $$
declare
  table_name text;
  required_tables text[] := array[
    'entitlement_catalogue','subscription_plans','student_subscriptions','student_entitlements',
    'payment_transactions','payment_webhook_events','ai_usage_events','ai_credit_ledger',
    'ai_prompt_versions','notification_preferences','notification_templates','notification_queue',
    'notification_delivery_logs','student_xp_ledger','student_streak_state','knowledge_documents',
    'knowledge_chunks','parent_student_relationships','school_organizations','school_memberships'
  ];
begin
  foreach table_name in array required_tables loop
    if not exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = table_name and c.relkind = 'r' and c.relrowsecurity
    ) then
      raise exception 'Missing table or RLS: %', table_name;
    end if;
  end loop;

  if has_table_privilege('anon', 'public.payment_webhook_events', 'SELECT')
     or has_table_privilege('authenticated', 'public.payment_webhook_events', 'SELECT')
     or has_table_privilege('authenticated', 'public.notification_queue', 'SELECT')
     or has_table_privilege('authenticated', 'public.ai_prompt_versions', 'SELECT')
     or has_table_privilege('authenticated', 'public.knowledge_chunks', 'SELECT')
     or has_table_privilege('authenticated', 'public.parent_student_relationships', 'SELECT') then
    raise exception 'A service-only table is exposed to client roles';
  end if;

  if not has_table_privilege('authenticated', 'public.student_entitlements', 'SELECT')
     or not has_table_privilege('authenticated', 'public.student_subscriptions', 'SELECT')
     or not has_table_privilege('authenticated', 'public.ai_usage_events', 'SELECT')
     or not has_table_privilege('authenticated', 'public.student_xp_ledger', 'SELECT') then
    raise exception 'Expected owner-read privileges are missing';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'student_entitlements'
      and policyname = 'student_entitlements_owner_read'
  ) then
    raise exception 'Student entitlement owner policy is missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'knowledge_chunks'
      and column_name = 'search_vector' and is_generated = 'ALWAYS'
  ) then
    raise exception 'Knowledge chunk full-text search column is missing';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'idx_knowledge_chunks_search_vector'
  ) then
    raise exception 'Knowledge chunk full-text index is missing';
  end if;

  if (select count(*) from public.subscription_plans) <> 0 then
    raise exception 'Subscription plans must remain unconfigured until pricing is approved';
  end if;
end $$;

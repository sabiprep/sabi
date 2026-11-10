-- AI engine control-plane assertions and budget reservation smoke test.
begin;
do $$
declare
  t text;
  v_result record;
  v_reservation uuid;
  v_settled boolean;
  required_tables text[] := array[
    'ai_budget_limits','ai_budget_reservations','ai_cost_ledger',
    'ai_response_cache','ai_quality_events','ai_control_audit'
  ];
begin
  foreach t in array required_tables loop
    if to_regclass('public.'||t) is null then raise exception 'AI control table missing: %',t; end if;
    if not (select relrowsecurity from pg_class where oid=to_regclass('public.'||t)) then
      raise exception 'RLS must be enabled on %',t;
    end if;
    if has_table_privilege('anon','public.'||t,'SELECT')
      or has_table_privilege('authenticated','public.'||t,'SELECT')
      or has_table_privilege('authenticated','public.'||t,'INSERT') then
      raise exception 'Client roles must not directly access %',t;
    end if;
  end loop;

  if not has_function_privilege('service_role','public.reserve_ai_budget(uuid,uuid,text,text,numeric)','EXECUTE') then
    raise exception 'service_role cannot reserve AI budget';
  end if;
  if has_function_privilege('authenticated','public.reserve_ai_budget(uuid,uuid,text,text,numeric)','EXECUTE') then
    raise exception 'authenticated must not reserve AI budget directly';
  end if;
  if not has_function_privilege('service_role','public.settle_ai_budget(uuid,numeric,boolean)','EXECUTE') then
    raise exception 'service_role cannot settle AI budget';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name in ('ai_budget_limits','ai_budget_reservations','ai_cost_ledger','ai_response_cache')
      and column_name in ('api_key','secret','secret_value','credential_value')
  ) then
    raise exception 'Plaintext provider secrets must not be stored in AI control tables';
  end if;

  select * into v_result
  from public.reserve_ai_budget(gen_random_uuid(),null,'tutor_chat','mock',0);
  if v_result.allowed or v_result.reason <> 'global_budget_not_configured' then
    raise exception 'AI budget must fail closed when global caps are missing';
  end if;

  insert into public.ai_budget_limits(scope_type,scope_id,period,limit_usd)
  values ('global','*','daily',0),('global','*','monthly',0);
  select * into v_result
  from public.reserve_ai_budget(gen_random_uuid(),null,'tutor_chat','mock',0);
  if not v_result.allowed or v_result.reservation_id is null then
    raise exception 'Zero-cost mock provider should reserve successfully under explicit zero budgets';
  end if;
  v_reservation := v_result.reservation_id;
  v_settled := public.settle_ai_budget(v_reservation,0,false);
  if not v_settled then raise exception 'AI budget settlement failed'; end if;
end $$;
rollback;

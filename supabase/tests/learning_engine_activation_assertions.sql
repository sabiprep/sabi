begin;

do $$
begin
  if (select count(*) from public.engine_registry
      where engine_key in ('study-plan-engine','learning-analytics-engine')
        and lifecycle_status='active' and current_version='phase-1.6') <> 2 then
    raise exception 'Study plan and learning analytics engines must be active at phase-1.6';
  end if;

  if (select count(*) from public.engine_contract_versions
      where engine_key in ('study-plan-engine','learning-analytics-engine')
        and contract_version=1 and contract_status='active') <> 2 then
    raise exception 'Both activated engines require active v1 contracts';
  end if;

  if (select count(distinct engine_key) from public.signal_engine_subscriptions
      where engine_key in ('study-plan-engine','learning-analytics-engine')
        and is_enabled) <> 2 then
    raise exception 'Both activated engines require enabled signal subscriptions';
  end if;
end;
$$;

rollback;

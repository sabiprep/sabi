begin;

-- Activate only adapters that have complete server-side implementations,
-- active versioned contracts and enabled signal subscriptions.
update public.engine_registry
set lifecycle_status = 'active',
    current_version = 'phase-1.6',
    updated_at = now()
where engine_key in ('study-plan-engine', 'learning-analytics-engine')
  and lifecycle_status = 'planned';

do $$
begin
  if exists (
    select 1
    from public.engine_registry e
    where e.engine_key in ('study-plan-engine', 'learning-analytics-engine')
      and (e.lifecycle_status <> 'active' or e.current_version is null)
  ) then
    raise exception 'Study plan and learning analytics engines were not activated';
  end if;

  if exists (
    select 1
    from public.engine_registry e
    where e.engine_key in ('study-plan-engine', 'learning-analytics-engine')
      and not exists (
        select 1 from public.engine_contract_versions c
        where c.engine_key = e.engine_key
          and c.contract_version = 1
          and c.contract_status = 'active'
      )
  ) then
    raise exception 'An active v1 engine contract is required before activation';
  end if;

  if exists (
    select 1
    from public.engine_registry e
    where e.engine_key in ('study-plan-engine', 'learning-analytics-engine')
      and not exists (
        select 1 from public.signal_engine_subscriptions s
        where s.engine_key = e.engine_key and s.is_enabled
      )
  ) then
    raise exception 'Enabled signal subscriptions are required before activation';
  end if;
end;
$$;

commit;

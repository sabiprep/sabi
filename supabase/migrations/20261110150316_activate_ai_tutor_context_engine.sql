begin;

-- This worker adapter prepares versioned learner context only. Actual AI
-- tutoring generation remains on the consented, budget-controlled AI gateway.
update public.engine_registry
set lifecycle_status = 'active',
    current_version = 'phase-1.6-context',
    updated_at = now()
where engine_key = 'ai-tutor-engine'
  and lifecycle_status = 'planned';

do $$
begin
  if not exists (
    select 1 from public.engine_registry
    where engine_key = 'ai-tutor-engine'
      and lifecycle_status = 'active'
      and current_version = 'phase-1.6-context'
  ) then
    raise exception 'AI tutor context adapter was not activated';
  end if;

  if not exists (
    select 1 from public.engine_contract_versions
    where engine_key = 'ai-tutor-engine'
      and contract_version = 1
      and contract_status = 'active'
  ) then
    raise exception 'AI tutor context adapter requires an active v1 contract';
  end if;

  if not exists (
    select 1 from public.signal_engine_subscriptions
    where engine_key = 'ai-tutor-engine' and is_enabled
  ) then
    raise exception 'AI tutor context adapter requires enabled signal subscriptions';
  end if;
end;
$$;

commit;

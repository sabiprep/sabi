-- SABI AI Engine 2.0 controls: durable spend ledger, atomic reservations, cache and policy.
-- AI remains disabled until operators configure limits and explicitly enable providers.

create table if not exists public.ai_budget_limits (
  id uuid primary key default gen_random_uuid(),
  scope_type text not null check (scope_type in ('global','provider','tenant','user','task')),
  scope_id text not null default '*',
  period text not null check (period in ('daily','monthly')),
  limit_usd numeric(14,6) not null check (limit_usd >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(scope_type, scope_id, period)
);
alter table public.ai_budget_limits enable row level security;
revoke all on public.ai_budget_limits from anon, authenticated;
grant select, insert, update, delete on public.ai_budget_limits to service_role;

create table if not exists public.ai_budget_reservations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  user_id uuid,
  task text not null,
  provider text not null,
  reserved_usd numeric(14,8) not null check (reserved_usd >= 0),
  settled_usd numeric(14,8),
  status text not null default 'reserved' check (status in ('reserved','settled','released')),
  expires_at timestamptz not null default (now() + interval '3 minutes'),
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  unique(request_id, provider)
);
create index if not exists ai_budget_reservations_active_idx
  on public.ai_budget_reservations(status, expires_at);
alter table public.ai_budget_reservations enable row level security;
revoke all on public.ai_budget_reservations from anon, authenticated;
grant select, insert, update, delete on public.ai_budget_reservations to service_role;

create table if not exists public.ai_cost_ledger (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  attempt integer not null default 1,
  user_id uuid,
  task text not null,
  provider text not null,
  model text not null,
  input_tokens integer,
  output_tokens integer,
  input_price_per_million numeric(14,8),
  output_price_per_million numeric(14,8),
  estimated_cost_usd numeric(14,8),
  provider_reported_cost_usd numeric(14,8),
  final_cost_usd numeric(14,8),
  outcome text not null check (outcome in ('success','provider_failed','quality_rejected','budget_blocked','cache_hit')),
  duration_ms integer,
  cache_status text not null default 'miss' check (cache_status in ('hit','miss','bypass')),
  quality_status text,
  prompt_version text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(request_id, attempt)
);
create index if not exists ai_cost_ledger_created_idx on public.ai_cost_ledger(created_at desc);
create index if not exists ai_cost_ledger_user_idx on public.ai_cost_ledger(user_id, created_at desc);
create index if not exists ai_cost_ledger_provider_idx on public.ai_cost_ledger(provider, created_at desc);
alter table public.ai_cost_ledger enable row level security;
revoke all on public.ai_cost_ledger from anon, authenticated;
grant select, insert on public.ai_cost_ledger to service_role;

create table if not exists public.ai_response_cache (
  cache_key text primary key,
  task text not null,
  prompt_version text not null,
  syllabus_version text,
  response_text text not null,
  provider text not null,
  model text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_hit_at timestamptz,
  hit_count bigint not null default 0
);
create index if not exists ai_response_cache_expiry_idx on public.ai_response_cache(expires_at);
alter table public.ai_response_cache enable row level security;
revoke all on public.ai_response_cache from anon, authenticated;
grant select, insert, update, delete on public.ai_response_cache to service_role;

create table if not exists public.ai_quality_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  task text not null,
  provider text not null,
  model text not null,
  validation_status text not null check (validation_status in ('passed','failed','escalated','human_review')),
  validation_codes text[] not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.ai_quality_events enable row level security;
revoke all on public.ai_quality_events from anon, authenticated;
grant select, insert on public.ai_quality_events to service_role;

create table if not exists public.ai_control_audit (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  action text not null,
  resource_type text not null,
  resource_id text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);
alter table public.ai_control_audit enable row level security;
revoke all on public.ai_control_audit from anon, authenticated;
grant select, insert on public.ai_control_audit to service_role;

-- Atomic multi-scope budget reservation. A single transaction-scoped lock
-- serializes every reservation so global limits cannot race across providers/users.
create or replace function public.reserve_ai_budget(
  p_request_id uuid,
  p_user_id uuid,
  p_task text,
  p_provider text,
  p_estimated_usd numeric
) returns table(allowed boolean, reason text, reservation_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_limit record;
  v_spent numeric;
  v_reserved numeric;
  v_period_start timestamptz;
  v_reservation_id uuid;
begin
  if p_estimated_usd is null or p_estimated_usd < 0 then
    return query select false, 'invalid_estimate'::text, null::uuid; return;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('sabi-ai-budget-reservations-v1', 0));

  -- Tenant limits are declared in the schema but cannot be safely evaluated
  -- until tenant identity is passed into this RPC. Fail closed rather than
  -- silently ignoring an active tenant-level limit.
  if exists (select 1 from ai_budget_limits where is_active and scope_type = 'tenant') then
    return query select false, 'tenant_scope_not_supported'::text, null::uuid; return;
  end if;

  for v_limit in
    select * from ai_budget_limits
    where is_active and (
      scope_type = 'global'
      or (scope_type = 'provider' and scope_id = p_provider)
      or (scope_type = 'task' and scope_id = p_task)
      or (scope_type = 'user' and scope_id = coalesce(p_user_id::text,''))
    )
    order by case scope_type when 'global' then 1 when 'provider' then 2 when 'task' then 3 else 4 end
  loop
    v_period_start := case v_limit.period
      when 'daily' then date_trunc('day', now())
      else date_trunc('month', now())
    end;
    select coalesce(sum(coalesce(final_cost_usd, estimated_cost_usd, 0)),0)
      into v_spent from ai_cost_ledger
      where created_at >= v_period_start
        and (v_limit.scope_type <> 'provider' or provider = v_limit.scope_id)
        and (v_limit.scope_type <> 'task' or task = v_limit.scope_id)
        and (v_limit.scope_type <> 'user' or user_id::text = v_limit.scope_id);
    select coalesce(sum(reserved_usd),0) into v_reserved
      from ai_budget_reservations
      where status = 'reserved' and expires_at > now()
        and (v_limit.scope_type <> 'provider' or provider = v_limit.scope_id)
        and (v_limit.scope_type <> 'task' or task = v_limit.scope_id)
        and (v_limit.scope_type <> 'user' or user_id::text = v_limit.scope_id);
    if v_spent + v_reserved + p_estimated_usd > v_limit.limit_usd then
      return query select false, ('budget_exceeded_' || v_limit.scope_type)::text, null::uuid; return;
    end if;
  end loop;

  insert into ai_budget_reservations(request_id,user_id,task,provider,reserved_usd)
  values(p_request_id,p_user_id,p_task,p_provider,p_estimated_usd)
  on conflict(request_id,provider) do update
    set reserved_usd = excluded.reserved_usd, status='reserved',
        expires_at=now()+interval '3 minutes'
  returning id into v_reservation_id;
  return query select true, 'reserved'::text, v_reservation_id;
end;
$$;

create or replace function public.settle_ai_budget(
  p_reservation_id uuid,
  p_actual_usd numeric,
  p_release boolean default false
) returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  update ai_budget_reservations
    set settled_usd = case when p_release then 0 else greatest(coalesce(p_actual_usd,0),0) end,
        status = case when p_release then 'released' else 'settled' end,
        settled_at = now()
    where id = p_reservation_id and status = 'reserved';
  return found;
end;
$$;

revoke all on function public.reserve_ai_budget(uuid,uuid,text,text,numeric) from public, anon, authenticated;
revoke all on function public.settle_ai_budget(uuid,numeric,boolean) from public, anon, authenticated;
grant execute on function public.reserve_ai_budget(uuid,uuid,text,text,numeric) to service_role;
grant execute on function public.settle_ai_budget(uuid,numeric,boolean) to service_role;

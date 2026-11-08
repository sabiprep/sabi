-- Additive backend service foundations. No existing learner rows are modified.
-- Provider credentials, plan prices, entitlements and delivery templates are configured separately.

create table if not exists public.entitlement_catalogue (
  entitlement_key text primary key,
  description text not null,
  value_schema jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  plan_key text not null unique,
  display_name text not null,
  description text,
  price_amount numeric(12,2) not null default 0 check (price_amount >= 0),
  currency char(3) not null default 'NGN',
  billing_interval text not null check (billing_interval in ('monthly','quarterly','yearly','one_time')),
  features jsonb not null default '{}'::jsonb,
  limits jsonb not null default '{}'::jsonb,
  ai_credit_allowance integer not null default 0 check (ai_credit_allowance >= 0),
  is_active boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id) on delete restrict,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  status text not null default 'pending' check (status in ('pending','active','past_due','cancelled','expired','refunded')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement_key text not null references public.entitlement_catalogue(entitlement_key) on delete restrict,
  source_type text not null check (source_type in ('subscription','payment','trial','admin_grant','promotion')),
  source_id uuid,
  status text not null default 'active' check (status in ('active','expired','revoked','pending')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  entitlement_value jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entitlement_key, source_type, source_id),
  check (expires_at is null or expires_at > starts_at)
);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  plan_id uuid references public.subscription_plans(id) on delete set null,
  subscription_id uuid references public.student_subscriptions(id) on delete set null,
  provider text not null,
  reference text not null unique,
  provider_reference text,
  idempotency_key text,
  amount numeric(12,2) not null check (amount >= 0),
  currency char(3) not null default 'NGN',
  status text not null default 'pending' check (status in ('pending','successful','failed','refunded','reversed','expired')),
  checkout_url text,
  verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  signature_valid boolean not null default false,
  processing_status text not null default 'received' check (processing_status in ('received','processing','processed','failed','ignored')),
  payload jsonb not null default '{}'::jsonb,
  failure_reason text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, provider_event_id)
);

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id text not null unique,
  task text not null check (task in ('explanation','tutor_chat','content_draft','study_plan')),
  provider text not null,
  model text not null,
  prompt_version text,
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  credit_cost integer not null default 0 check (credit_cost >= 0),
  estimated_cost numeric(14,6) check (estimated_cost is null or estimated_cost >= 0),
  currency char(3),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  outcome text not null check (outcome in ('success','provider_failed','blocked','cancelled')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_type text not null check (entry_type in ('grant','debit','refund','adjustment','expiry')),
  credits_delta integer not null check (credits_delta <> 0),
  reason text not null,
  reference_type text,
  reference_id text,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table if not exists public.ai_task_pricing (
  task text primary key check (task in ('explanation','tutor_chat','content_draft','study_plan')),
  credit_cost integer not null default 0 check (credit_cost >= 0),
  is_active boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  task text not null check (task in ('explanation','tutor_chat','content_draft','study_plan')),
  version integer not null check (version > 0),
  system_instruction text not null,
  prompt_template text not null,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task, version)
);

create table if not exists public.notification_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('email','push','in_app','sms')),
  notification_key text not null,
  enabled boolean not null default true,
  quiet_hours jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, channel, notification_key)
);

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  channel text not null check (channel in ('email','push','in_app','sms')),
  locale text not null default 'en',
  version integer not null default 1 check (version > 0),
  subject_template text,
  body_template text not null,
  variables_schema jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_key, channel, locale, version)
);

create table if not exists public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  channel text not null check (channel in ('email','push','in_app','sms')),
  template_key text,
  recipient text,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','dead_letter','cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts > 0),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid not null references public.notification_queue(id) on delete cascade,
  provider text not null,
  provider_message_id text,
  delivery_status text not null check (delivery_status in ('accepted','delivered','bounced','rejected','failed','unknown')),
  error_code text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table if not exists public.student_xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,
  xp_delta integer not null check (xp_delta <> 0),
  reason text not null,
  reference_type text,
  reference_id text,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table if not exists public.gamification_rules (
  event_key text primary key,
  description text not null,
  xp_delta integer not null check (xp_delta > 0),
  max_awards_per_day integer not null default 1 check (max_awards_per_day >= 0),
  is_active boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.student_streak_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'UTC',
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_activity_date date,
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text,
  topic text,
  source_type text not null,
  source_reference text,
  source_url text,
  content_hash text not null,
  status text not null default 'draft' check (status in ('draft','approved','archived')),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_hash)
);

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null,
  search_vector tsvector generated always as (to_tsvector('english', content)) stored,
  embedding jsonb,
  embedding_model text,
  token_count integer check (token_count is null or token_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create table if not exists public.parent_student_relationships (
  id uuid primary key default gen_random_uuid(),
  parent_user_id uuid not null references auth.users(id) on delete cascade,
  student_user_id uuid not null references auth.users(id) on delete cascade,
  relationship_type text not null default 'parent_guardian',
  status text not null default 'pending' check (status in ('pending','active','revoked','expired')),
  invitation_token_hash text,
  consent_granted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_user_id <> student_user_id),
  unique (parent_user_id, student_user_id)
);

create table if not exists public.school_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'pending' check (status in ('pending','active','suspended','closed')),
  contact_email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','teacher','student')),
  status text not null default 'invited' check (status in ('invited','active','suspended','left')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists idx_student_subscriptions_user_status on public.student_subscriptions(user_id, status);
create index if not exists idx_student_subscriptions_period_end on public.student_subscriptions(current_period_end);
create unique index if not exists idx_student_subscriptions_one_active_plan on public.student_subscriptions(user_id, plan_id) where status = 'active';
create index if not exists idx_student_entitlements_user_status_expiry on public.student_entitlements(user_id, status, expires_at);
create index if not exists idx_payment_transactions_user_created on public.payment_transactions(user_id, created_at desc);
create index if not exists idx_payment_transactions_status_created on public.payment_transactions(status, created_at);
create index if not exists idx_payment_webhook_events_status_received on public.payment_webhook_events(processing_status, received_at);
create index if not exists idx_ai_usage_events_user_created on public.ai_usage_events(user_id, created_at desc);
create index if not exists idx_ai_usage_events_task_created on public.ai_usage_events(task, created_at desc);
create index if not exists idx_ai_credit_ledger_user_created on public.ai_credit_ledger(user_id, created_at desc);
create unique index if not exists idx_ai_prompt_versions_one_active on public.ai_prompt_versions(task) where status = 'active';
create unique index if not exists idx_notification_templates_one_active on public.notification_templates(template_key, channel, locale) where status = 'active';
create index if not exists idx_notification_queue_pending on public.notification_queue(status, available_at) where status in ('pending','failed');
create index if not exists idx_notification_queue_user_created on public.notification_queue(user_id, created_at desc);
create index if not exists idx_student_xp_ledger_user_created on public.student_xp_ledger(user_id, created_at desc);
create index if not exists idx_student_xp_ledger_daily_awards on public.student_xp_ledger(user_id, event_key, created_at desc);
create index if not exists idx_knowledge_documents_status_subject on public.knowledge_documents(status, subject);
create index if not exists idx_knowledge_chunks_search_vector on public.knowledge_chunks using gin(search_vector);
create index if not exists idx_parent_student_parent on public.parent_student_relationships(parent_user_id, status);
create index if not exists idx_parent_student_student on public.parent_student_relationships(student_user_id, status);
create index if not exists idx_school_memberships_user_status on public.school_memberships(user_id, status);

create or replace function public.reserve_ai_credits(
  p_user_id uuid,
  p_task text,
  p_request_id text
)
returns table(allowed boolean, credit_cost integer, reason text)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  task_cost integer;
  current_balance bigint;
  debit_key text;
begin
  if p_user_id is null or coalesce(length(trim(p_request_id)), 0) < 8 then
    return query select false, 0, 'invalid_request';
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text)::bigint);

  select pricing.credit_cost into task_cost
  from public.ai_task_pricing pricing
  where pricing.task = p_task and pricing.is_active = true;

  if not found then
    return query select false, 0, 'pricing_not_configured';
    return;
  end if;

  debit_key := 'ai-request:' || p_request_id;
  if exists (
    select 1 from public.ai_credit_ledger ledger
    where ledger.user_id = p_user_id and ledger.idempotency_key = debit_key
  ) then
    return query select true, task_cost, 'already_reserved';
    return;
  end if;

  select coalesce(sum(ledger.credits_delta), 0) into current_balance
  from public.ai_credit_ledger ledger
  where ledger.user_id = p_user_id;

  if current_balance < task_cost then
    return query select false, task_cost, 'insufficient_credits';
    return;
  end if;

  if task_cost > 0 then
    insert into public.ai_credit_ledger (
      user_id, entry_type, credits_delta, reason, reference_type,
      reference_id, idempotency_key, metadata
    ) values (
      p_user_id, 'debit', -task_cost, 'ai_task_usage', 'ai_usage_events',
      p_request_id, debit_key, jsonb_build_object('task', p_task, 'credit_cost', task_cost)
    );
  end if;

  return query select true, task_cost, 'reserved';
end;
$function$;

create or replace function public.refund_ai_credits(
  p_user_id uuid,
  p_request_id text,
  p_reason text default 'ai_provider_failed'
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  debit_amount integer;
begin
  select abs(ledger.credits_delta) into debit_amount
  from public.ai_credit_ledger ledger
  where ledger.user_id = p_user_id
    and ledger.idempotency_key = 'ai-request:' || p_request_id
    and ledger.entry_type = 'debit'
  limit 1;

  if not found or debit_amount <= 0 then
    return false;
  end if;

  insert into public.ai_credit_ledger (
    user_id, entry_type, credits_delta, reason, reference_type,
    reference_id, idempotency_key, metadata
  ) values (
    p_user_id, 'refund', debit_amount, left(coalesce(p_reason, 'ai_provider_failed'), 120),
    'ai_usage_events', p_request_id, 'ai-request-refund:' || p_request_id,
    jsonb_build_object('request_id', p_request_id)
  ) on conflict (user_id, idempotency_key) do nothing;

  return true;
end;
$function$;

revoke all on function public.reserve_ai_credits(uuid, text, text) from public, anon, authenticated;
revoke all on function public.refund_ai_credits(uuid, text, text) from public, anon, authenticated;
grant execute on function public.reserve_ai_credits(uuid, text, text) to service_role;
grant execute on function public.refund_ai_credits(uuid, text, text) to service_role;

create or replace function public.award_student_xp(
  p_user_id uuid,
  p_event_key text,
  p_reference_type text,
  p_reference_id text,
  p_idempotency_key text
)
returns table(awarded boolean, xp_delta integer, reason text)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  rule_row public.gamification_rules%rowtype;
  awards_today integer;
begin
  if p_user_id is null or coalesce(length(trim(p_idempotency_key)), 0) < 8 then
    return query select false, 0, 'invalid_request';
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text)::bigint);

  if exists (
    select 1 from public.student_xp_ledger ledger
    where ledger.user_id = p_user_id and ledger.idempotency_key = p_idempotency_key
  ) then
    return query select false, 0, 'duplicate_event';
    return;
  end if;

  select * into rule_row
  from public.gamification_rules
  where event_key = p_event_key and is_active = true;

  if not found then
    return query select false, 0, 'rule_not_configured';
    return;
  end if;

  if rule_row.max_awards_per_day > 0 then
    select count(*)::integer into awards_today
    from public.student_xp_ledger ledger
    where ledger.user_id = p_user_id
      and ledger.event_key = p_event_key
      and ledger.created_at >= date_trunc('day', now());
    if awards_today >= rule_row.max_awards_per_day then
      return query select false, 0, 'daily_limit_reached';
      return;
    end if;
  end if;

  insert into public.student_xp_ledger (
    user_id, event_key, xp_delta, reason, reference_type, reference_id, idempotency_key
  ) values (
    p_user_id, p_event_key, rule_row.xp_delta, rule_row.description,
    p_reference_type, p_reference_id, p_idempotency_key
  );

  return query select true, rule_row.xp_delta, 'awarded';
end;
$function$;

revoke all on function public.award_student_xp(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.award_student_xp(uuid, text, text, text, text) to service_role;

-- Every new table is RLS-protected. Sensitive queues, webhook payloads, prompt
-- versions, knowledge content and delivery logs are service-role-only.
alter table public.entitlement_catalogue enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.student_subscriptions enable row level security;
alter table public.student_entitlements enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.ai_usage_events enable row level security;
alter table public.ai_credit_ledger enable row level security;
alter table public.ai_prompt_versions enable row level security;
alter table public.ai_task_pricing enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_templates enable row level security;
alter table public.notification_queue enable row level security;
alter table public.notification_delivery_logs enable row level security;
alter table public.student_xp_ledger enable row level security;
alter table public.gamification_rules enable row level security;
alter table public.student_streak_state enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.parent_student_relationships enable row level security;
alter table public.school_organizations enable row level security;
alter table public.school_memberships enable row level security;

revoke all on public.entitlement_catalogue, public.subscription_plans, public.student_subscriptions,
  public.student_entitlements, public.payment_transactions, public.payment_webhook_events,
  public.ai_usage_events, public.ai_credit_ledger, public.ai_prompt_versions, public.ai_task_pricing,
  public.notification_preferences, public.notification_templates, public.notification_queue,
  public.notification_delivery_logs, public.student_xp_ledger, public.gamification_rules, public.student_streak_state,
  public.knowledge_documents, public.knowledge_chunks, public.parent_student_relationships,
  public.school_organizations, public.school_memberships from anon, authenticated;

grant all on public.entitlement_catalogue, public.subscription_plans, public.student_subscriptions,
  public.student_entitlements, public.payment_transactions, public.payment_webhook_events,
  public.ai_usage_events, public.ai_credit_ledger, public.ai_prompt_versions, public.ai_task_pricing,
  public.notification_preferences, public.notification_templates, public.notification_queue,
  public.notification_delivery_logs, public.student_xp_ledger, public.gamification_rules, public.student_streak_state,
  public.knowledge_documents, public.knowledge_chunks, public.parent_student_relationships,
  public.school_organizations, public.school_memberships to service_role;

grant select on public.entitlement_catalogue, public.subscription_plans,
  public.student_subscriptions, public.student_entitlements, public.payment_transactions,
  public.ai_usage_events, public.ai_credit_ledger, public.student_xp_ledger,
  public.student_streak_state, public.school_memberships
  to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant select on public.school_organizations to authenticated;

drop policy if exists entitlement_catalogue_active_read on public.entitlement_catalogue;
drop policy if exists subscription_plans_active_read on public.subscription_plans;
drop policy if exists student_subscriptions_owner_read on public.student_subscriptions;
drop policy if exists student_entitlements_owner_read on public.student_entitlements;
drop policy if exists payment_transactions_owner_read on public.payment_transactions;
drop policy if exists ai_usage_events_owner_read on public.ai_usage_events;
drop policy if exists ai_credit_ledger_owner_read on public.ai_credit_ledger;
drop policy if exists student_xp_ledger_owner_read on public.student_xp_ledger;
drop policy if exists student_streak_state_owner_read on public.student_streak_state;
drop policy if exists notification_preferences_owner_read on public.notification_preferences;
drop policy if exists notification_preferences_owner_insert on public.notification_preferences;
drop policy if exists notification_preferences_owner_update on public.notification_preferences;
drop policy if exists school_memberships_owner_read on public.school_memberships;
drop policy if exists school_organizations_member_read on public.school_organizations;

create policy entitlement_catalogue_active_read on public.entitlement_catalogue
  for select to authenticated using (is_active);
create policy subscription_plans_active_read on public.subscription_plans
  for select to authenticated using (is_active);
create policy student_subscriptions_owner_read on public.student_subscriptions
  for select to authenticated using (user_id = auth.uid());
create policy student_entitlements_owner_read on public.student_entitlements
  for select to authenticated using (user_id = auth.uid());
create policy payment_transactions_owner_read on public.payment_transactions
  for select to authenticated using (user_id = auth.uid());
create policy ai_usage_events_owner_read on public.ai_usage_events
  for select to authenticated using (user_id = auth.uid());
create policy ai_credit_ledger_owner_read on public.ai_credit_ledger
  for select to authenticated using (user_id = auth.uid());
create policy student_xp_ledger_owner_read on public.student_xp_ledger
  for select to authenticated using (user_id = auth.uid());
create policy student_streak_state_owner_read on public.student_streak_state
  for select to authenticated using (user_id = auth.uid());
create policy notification_preferences_owner_read on public.notification_preferences
  for select to authenticated using (user_id = auth.uid());
create policy notification_preferences_owner_insert on public.notification_preferences
  for insert to authenticated with check (user_id = auth.uid());
create policy notification_preferences_owner_update on public.notification_preferences
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy school_memberships_owner_read on public.school_memberships
  for select to authenticated using (user_id = auth.uid());
create policy school_organizations_member_read on public.school_organizations
  for select to authenticated using (
    exists (
      select 1 from public.school_memberships membership
      where membership.organization_id = school_organizations.id
        and membership.user_id = auth.uid()
        and membership.status = 'active'
    )
  );

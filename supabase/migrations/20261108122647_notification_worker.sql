create table if not exists public.in_app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  queue_id uuid not null unique references public.notification_queue(id) on delete cascade,
  notification_key text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_in_app_notifications_user_created
  on public.in_app_notifications(user_id, created_at desc);
create index if not exists idx_in_app_notifications_unread
  on public.in_app_notifications(user_id, created_at desc) where read_at is null;

alter table public.in_app_notifications enable row level security;
revoke all on public.in_app_notifications from anon, authenticated;
grant all on public.in_app_notifications to service_role;
grant select, update on public.in_app_notifications to authenticated;

drop policy if exists in_app_notifications_owner_read on public.in_app_notifications;
drop policy if exists in_app_notifications_owner_update on public.in_app_notifications;
create policy in_app_notifications_owner_read on public.in_app_notifications
  for select to authenticated using (user_id = auth.uid());
create policy in_app_notifications_owner_update on public.in_app_notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.claim_notification_jobs(p_limit integer default 25)
returns setof public.notification_queue
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.notification_queue
  set status = case when attempts >= max_attempts then 'dead_letter' else 'failed' end,
      locked_at = null,
      available_at = now(),
      last_error = 'worker_lease_expired',
      updated_at = now()
  where status = 'processing'
    and locked_at < now() - interval '10 minutes';

  return query
  with candidates as (
    select id
    from public.notification_queue
    where status in ('pending', 'failed')
      and available_at <= now()
      and attempts < max_attempts
    order by available_at asc, created_at asc
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 25), 100))
  )
  update public.notification_queue queue
  set status = 'processing',
      locked_at = now(),
      attempts = queue.attempts + 1,
      updated_at = now()
  from candidates
  where queue.id = candidates.id
  returning queue.*;
end;
$$;

create or replace function public.finalize_notification_job(
  p_job_id uuid,
  p_success boolean,
  p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_count integer;
begin
  update public.notification_queue
  set status = case
        when p_success then 'sent'
        when attempts >= max_attempts then 'dead_letter'
        else 'failed'
      end,
      sent_at = case when p_success then now() else sent_at end,
      locked_at = null,
      last_error = case when p_success then null else left(coalesce(p_error, 'delivery_failed'), 500) end,
      available_at = case
        when p_success then available_at
        else now() + make_interval(secs => least(3600, (power(2, least(attempts, 10)) * 30)::integer))
      end,
      updated_at = now()
  where id = p_job_id and status = 'processing';

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

revoke all on function public.claim_notification_jobs(integer) from public, anon, authenticated;
revoke all on function public.finalize_notification_job(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.claim_notification_jobs(integer) to service_role;
grant execute on function public.finalize_notification_job(uuid, boolean, text) to service_role;

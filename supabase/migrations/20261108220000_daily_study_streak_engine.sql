-- Atomic, idempotent daily learning streak projection.
-- The caller supplies an IANA timezone; invalid values safely fall back to UTC.
create or replace function public.record_student_study_activity(
  p_user_id uuid,
  p_timezone text default 'UTC'
)
returns table(
  current_streak integer,
  longest_streak integer,
  last_activity_date date,
  timezone text,
  activity_recorded boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_timezone text := coalesce(nullif(trim(p_timezone), ''), 'UTC');
  v_activity_date date;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  if not exists (select 1 from pg_timezone_names where name = v_timezone) then
    v_timezone := 'UTC';
  end if;

  v_activity_date := (now() at time zone v_timezone)::date;

  insert into public.student_streak_state as streak (
    user_id, timezone, current_streak, longest_streak, last_activity_date, updated_at
  )
  values (p_user_id, v_timezone, 1, 1, v_activity_date, now())
  on conflict (user_id) do update
  set
    timezone = excluded.timezone,
    current_streak = case
      when streak.last_activity_date = excluded.last_activity_date then streak.current_streak
      when streak.last_activity_date = excluded.last_activity_date - 1 then streak.current_streak + 1
      when streak.last_activity_date < excluded.last_activity_date then 1
      else streak.current_streak
    end,
    longest_streak = greatest(
      streak.longest_streak,
      case
        when streak.last_activity_date = excluded.last_activity_date then streak.current_streak
        when streak.last_activity_date = excluded.last_activity_date - 1 then streak.current_streak + 1
        when streak.last_activity_date < excluded.last_activity_date then 1
        else streak.current_streak
      end
    ),
    last_activity_date = greatest(streak.last_activity_date, excluded.last_activity_date),
    updated_at = now()
  returning streak.current_streak, streak.longest_streak, streak.last_activity_date,
            streak.timezone
  into current_streak, longest_streak, last_activity_date, timezone;

  activity_recorded := true;
  return next;
end;
$function$;

revoke all on function public.record_student_study_activity(uuid, text) from public, anon, authenticated;
grant execute on function public.record_student_study_activity(uuid, text) to service_role;

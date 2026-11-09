begin;

create table if not exists public.institution_enrollment_invites (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.educational_institutions(id) on delete cascade,
  class_id uuid references public.institution_classes(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists institution_enrollment_invites_institution_idx
  on public.institution_enrollment_invites(institution_id, created_at desc);

alter table public.institution_enrollment_invites enable row level security;
revoke all on public.institution_enrollment_invites from anon, authenticated;
grant all on public.institution_enrollment_invites to service_role;

create or replace function public.redeem_institution_enrollment_invite(
  p_token_hash text,
  p_student_user_id uuid
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_invite public.institution_enrollment_invites%rowtype;
begin
  select * into v_invite
  from public.institution_enrollment_invites
  where token_hash = p_token_hash
  for update;

  if not found
     or v_invite.redeemed_at is not null
     or v_invite.expires_at <= now() then
    raise exception 'invalid_or_expired_enrollment_invite' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.educational_institutions
    where id = v_invite.institution_id and status <> 'active'
  ) or not exists (
    select 1 from public.educational_institutions
    where id = v_invite.institution_id
  ) then
    raise exception 'institution_not_active' using errcode = '22023';
  end if;

  if v_invite.class_id is not null and not exists (
    select 1 from public.institution_classes
    where id = v_invite.class_id and institution_id = v_invite.institution_id
  ) then
    raise exception 'class_not_in_institution' using errcode = '22023';
  end if;

  insert into public.institution_enrollments (
    institution_id, class_id, student_user_id, status
  ) values (
    v_invite.institution_id, v_invite.class_id, p_student_user_id, 'active'
  )
  on conflict (institution_id, student_user_id)
  do update set class_id = excluded.class_id, status = 'active';

  update public.institution_enrollment_invites
  set redeemed_by = p_student_user_id, redeemed_at = now()
  where id = v_invite.id;

  return v_invite.institution_id;
end;
$$;

revoke all on function public.redeem_institution_enrollment_invite(text, uuid) from public, anon, authenticated;
grant execute on function public.redeem_institution_enrollment_invite(text, uuid) to service_role;

commit;

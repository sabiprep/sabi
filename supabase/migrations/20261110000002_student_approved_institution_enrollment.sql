begin;

create or replace function public.redeem_institution_enrollment_invite(
  p_token_hash text,
  p_student_user_id uuid
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_invite public.school_enrollment_invites%rowtype;
  v_existing_role text;
begin
  select * into v_invite
  from public.school_enrollment_invites
  where token_hash = p_token_hash
  for update;

  if not found or v_invite.redeemed_at is not null or v_invite.expires_at <= now() then
    raise exception 'invalid_or_expired_enrollment_invite' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.school_organizations
    where id = v_invite.organization_id and status = 'active'
  ) then
    raise exception 'school_not_active' using errcode = '22023';
  end if;

  if v_invite.class_id is not null and not exists (
    select 1 from public.school_classes
    where id = v_invite.class_id and organization_id = v_invite.organization_id
  ) then
    raise exception 'class_not_in_school' using errcode = '22023';
  end if;

  select role into v_existing_role from public.school_memberships
  where organization_id = v_invite.organization_id and user_id = p_student_user_id
  for update;

  if v_existing_role is not null and v_existing_role <> 'student' then
    raise exception 'account_already_has_staff_role' using errcode = '23505';
  end if;

  insert into public.school_memberships (organization_id,user_id,role,status,invited_by)
  values (v_invite.organization_id,p_student_user_id,'student','active',v_invite.created_by)
  on conflict (organization_id,user_id)
  do update set status = 'active', updated_at = now()
  where public.school_memberships.role = 'student';

  if v_invite.class_id is not null then
    insert into public.school_class_enrollments (
      organization_id,class_id,student_user_id,status
    ) values (
      v_invite.organization_id,v_invite.class_id,p_student_user_id,'active'
    )
    on conflict (class_id,student_user_id)
    do update set status = 'active';
  end if;

  update public.school_enrollment_invites
  set redeemed_by = p_student_user_id, redeemed_at = now()
  where id = v_invite.id;

  return v_invite.organization_id;
end;
$$;

revoke all on function public.redeem_institution_enrollment_invite(text, uuid) from public,anon,authenticated;
grant execute on function public.redeem_institution_enrollment_invite(text, uuid) to service_role;

commit;

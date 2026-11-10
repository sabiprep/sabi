begin;

-- The student, not the parent, redeems this invitation and grants access.
create or replace function public.redeem_parent_link_invite(
  p_token_hash text,
  p_student_user_id uuid
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_relationship public.parent_student_relationships%rowtype;
begin
  select * into v_relationship
  from public.parent_student_relationships
  where invitation_token_hash = p_token_hash
    and student_user_id = p_student_user_id
    and status = 'pending'
  for update;

  if not found or v_relationship.expires_at is null or v_relationship.expires_at <= now() then
    raise exception 'invalid_or_expired_parent_invite' using errcode = 'P0002';
  end if;

  update public.parent_student_relationships
  set status = 'active',
      consent_granted_at = now(),
      invitation_token_hash = null,
      expires_at = null,
      updated_at = now()
  where id = v_relationship.id;

  return v_relationship.parent_user_id;
end;
$$;

revoke all on function public.redeem_parent_link_invite(text, uuid) from public,anon,authenticated;
grant execute on function public.redeem_parent_link_invite(text, uuid) to service_role;

commit;

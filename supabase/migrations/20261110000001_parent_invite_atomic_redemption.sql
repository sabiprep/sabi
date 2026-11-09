begin;

-- Atomically consume a parent invitation and create the relationship.
-- The row lock prevents two simultaneous redemptions of the same code.
create or replace function public.redeem_parent_link_invite(
  p_token_hash text,
  p_parent_user_id uuid,
  p_relationship text default 'parent'
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_invite public.parent_link_invites%rowtype;
begin
  if p_relationship not in ('parent','guardian','sponsor') then
    raise exception 'invalid_relationship' using errcode = '22023';
  end if;

  select * into v_invite
  from public.parent_link_invites
  where token_hash = p_token_hash
  for update;

  if not found
     or v_invite.redeemed_at is not null
     or v_invite.expires_at <= now() then
    raise exception 'invalid_or_expired_invite' using errcode = 'P0002';
  end if;

  if v_invite.student_user_id = p_parent_user_id then
    raise exception 'self_link_not_allowed' using errcode = '22023';
  end if;

  insert into public.parent_student_links (
    parent_user_id, student_user_id, relationship, status, consented_at
  ) values (
    p_parent_user_id, v_invite.student_user_id, p_relationship, 'active', now()
  )
  on conflict (parent_user_id, student_user_id)
  do update set relationship = excluded.relationship,
                status = 'active',
                consented_at = now();

  update public.parent_link_invites
  set redeemed_by = p_parent_user_id, redeemed_at = now()
  where id = v_invite.id;

  return v_invite.student_user_id;
end;
$$;

revoke all on function public.redeem_parent_link_invite(text, uuid, text) from public, anon, authenticated;
grant execute on function public.redeem_parent_link_invite(text, uuid, text) to service_role;

commit;

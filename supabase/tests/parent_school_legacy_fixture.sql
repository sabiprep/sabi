-- Test-only representation of the existing live parent/school tables.
create table public.school_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'pending' check (status in ('pending','active','suspended','closed')),
  contact_email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.school_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','teacher','student')),
  status text not null default 'invited' check (status in ('invited','active','suspended','left')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,user_id)
);

create table public.parent_student_relationships (
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
  unique(parent_user_id,student_user_id),
  check(parent_user_id <> student_user_id)
);

alter table public.school_organizations enable row level security;
alter table public.school_memberships enable row level security;
alter table public.parent_student_relationships enable row level security;
create policy school_memberships_owner_read on public.school_memberships
  for select to authenticated using (user_id = auth.uid());
create policy school_organizations_member_read on public.school_organizations
  for select to authenticated using (exists (
    select 1 from public.school_memberships membership
    where membership.organization_id = school_organizations.id
      and membership.user_id = auth.uid() and membership.status = 'active'
  ));
grant usage on schema public to anon,authenticated;
grant select on public.school_memberships,public.school_organizations to authenticated;
grant all on public.school_memberships,public.school_organizations,public.parent_student_relationships to service_role;

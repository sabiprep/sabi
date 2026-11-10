begin;

-- Reuse SABI's existing parent_student_relationships, school_organizations
-- and school_memberships records. Do not create a parallel relationship model.
alter table public.parent_student_relationships
  add column if not exists invitation_token_hash text,
  add column if not exists expires_at timestamptz;
create unique index if not exists parent_student_relationships_invite_uidx
  on public.parent_student_relationships(invitation_token_hash)
  where invitation_token_hash is not null;
alter table public.parent_student_relationships enable row level security;
revoke all on public.parent_student_relationships from anon, authenticated;
grant all on public.parent_student_relationships to service_role;

create table if not exists public.school_classes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  programme text not null default 'general'
    check (programme in ('general','jamb','utme','waec','neco','other')),
  academic_year text,
  subject_list text[] not null default '{}',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(organization_id,name,academic_year)
);
create index if not exists school_classes_org_idx
  on public.school_classes(organization_id,created_at desc);

create table if not exists public.school_class_enrollments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  class_id uuid not null references public.school_classes(id) on delete cascade,
  student_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','completed','withdrawn')),
  enrolled_at timestamptz not null default now(),
  unique(class_id,student_user_id)
);
create index if not exists school_class_enrollments_student_idx
  on public.school_class_enrollments(student_user_id,status);
create index if not exists school_class_enrollments_org_idx
  on public.school_class_enrollments(organization_id,class_id,status);

create table if not exists public.school_enrollment_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  class_id uuid references public.school_classes(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists school_enrollment_invites_org_idx
  on public.school_enrollment_invites(organization_id,created_at desc);

alter table public.school_classes enable row level security;
alter table public.school_class_enrollments enable row level security;
alter table public.school_enrollment_invites enable row level security;
revoke all on public.school_classes,public.school_class_enrollments,public.school_enrollment_invites
  from anon,authenticated;
grant all on public.school_classes,public.school_class_enrollments,public.school_enrollment_invites
  to service_role;

commit;

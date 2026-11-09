begin;

create table if not exists public.parent_link_invites (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists parent_link_invites_student_idx on public.parent_link_invites(student_user_id, created_at desc);

create table if not exists public.parent_student_links (
  id uuid primary key default gen_random_uuid(),
  parent_user_id uuid not null references auth.users(id) on delete cascade,
  student_user_id uuid not null references auth.users(id) on delete cascade,
  relationship text not null default 'parent' check (relationship in ('parent','guardian','sponsor')),
  status text not null default 'active' check (status in ('active','revoked')),
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(parent_user_id, student_user_id),
  check(parent_user_id <> student_user_id)
);
create index if not exists parent_student_links_parent_idx on public.parent_student_links(parent_user_id, status);
create index if not exists parent_student_links_student_idx on public.parent_student_links(student_user_id, status);

create table if not exists public.educational_institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  institution_type text not null check (institution_type in ('school','tutorial_centre')),
  country text not null default 'Nigeria',
  state text,
  city text,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists educational_institutions_owner_idx on public.educational_institutions(owner_user_id);

create table if not exists public.institution_memberships (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.educational_institutions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null check (member_role in ('owner','admin','teacher','viewer')),
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now(),
  unique(institution_id,user_id)
);
create index if not exists institution_memberships_user_idx on public.institution_memberships(user_id,status);

create table if not exists public.institution_classes (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.educational_institutions(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  programme text not null default 'general' check (programme in ('general','jamb','utme','waec','neco','other')),
  academic_year text,
  subject_list text[] not null default '{}',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique(institution_id,name,academic_year)
);
create index if not exists institution_classes_institution_idx on public.institution_classes(institution_id);

create table if not exists public.institution_enrollments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.educational_institutions(id) on delete cascade,
  class_id uuid references public.institution_classes(id) on delete set null,
  student_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','completed','withdrawn')),
  enrolled_at timestamptz not null default now(),
  unique(institution_id,student_user_id)
);
create index if not exists institution_enrollments_student_idx on public.institution_enrollments(student_user_id,status);
create index if not exists institution_enrollments_class_idx on public.institution_enrollments(class_id,status);

-- The API uses the service-role client after explicit membership checks.
-- No direct client access is granted to these relationship and child-activity tables.
alter table public.parent_link_invites enable row level security;
alter table public.parent_student_links enable row level security;
alter table public.educational_institutions enable row level security;
alter table public.institution_memberships enable row level security;
alter table public.institution_classes enable row level security;
alter table public.institution_enrollments enable row level security;

revoke all on public.parent_link_invites, public.parent_student_links,
  public.educational_institutions, public.institution_memberships,
  public.institution_classes, public.institution_enrollments
from anon, authenticated;
grant all on public.parent_link_invites, public.parent_student_links,
  public.educational_institutions, public.institution_memberships,
  public.institution_classes, public.institution_enrollments
to service_role;

commit;

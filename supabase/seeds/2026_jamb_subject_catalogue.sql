-- Phase 1.5 seed: 2026 UTME subject catalogue additions and cycle availability.
-- Source: JAMB 2026 Training Manual for Officials.
-- This does not certify syllabus topics/objectives or modify generic CBT allow-lists.
insert into public.jamb_subjects (slug, display_name, category, aliases, is_active)
values
  ('computer-studies', 'Computer Studies', 'Science', array['Computer Studies','Computer Science'], true),
  ('physical-and-health-education', 'Physical and Health Education', 'General', array['PHE','Physical Education'], true)
on conflict (slug) do update set
  display_name = excluded.display_name,
  category = excluded.category,
  aliases = array(select distinct unnest(jamb_subjects.aliases || excluded.aliases)),
  is_active = true,
  updated_at = now();

update public.jamb_subjects set aliases = array(select distinct unnest(aliases || array['Agriculture']))
where slug = 'agricultural-science';
update public.jamb_subjects set aliases = array(select distinct unnest(aliases || array['Art']))
where slug = 'fine-art';
update public.jamb_subjects set aliases = array(select distinct unnest(aliases || array['Principles of Account']))
where slug = 'financial-accounting';
update public.jamb_subjects set aliases = array(select distinct unnest(aliases || array['Islamic Studies']))
where slug = 'islamic-religious-studies';

insert into public.jamb_subject_availability (exam_year, subject_slug, availability_status, source_url, verified_at, notes)
select 2026, s.slug, 'listed_in_manual',
  'https://www.jamb.gov.ng/PDFs/2026/2026%20TRAINING%20MANUAL%20%20final.pdf',
  now(), 'Listed in the 2026 JAMB Training Manual; this record verifies subject listing only, not syllabus content.'
from public.jamb_subjects s
where s.slug in (
  'agricultural-science','arabic','fine-art','biology','chemistry',
  'christian-religious-studies','commerce','economics','french','geography',
  'government','hausa','history','home-economics','igbo','islamic-religious-studies',
  'literature-in-english','mathematics','music','physics','financial-accounting',
  'use-of-english','yoruba','computer-studies','physical-and-health-education'
)
on conflict (exam_year, subject_slug) do update set
  availability_status = excluded.availability_status,
  source_url = excluded.source_url,
  verified_at = excluded.verified_at,
  notes = excluded.notes;

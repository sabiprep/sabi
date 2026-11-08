-- Backfill provenance for legacy questions without claiming ownership or redistribution rights.
-- Source labels are preserved verbatim in question_bank.source; records remain unverified.
insert into public.question_sources (
  source_key, source_name, source_type, permitted_use, verification_status, notes
)
select distinct
  'legacy-source-' || md5(trim(q.source)),
  left(trim(q.source), 250),
  'other',
  'unknown',
  'unverified',
  'Legacy imported source label. Exact original publication, rights and permitted reuse require independent verification.'
from public.question_bank q
where nullif(trim(q.source), '') is not null
on conflict (source_key) do nothing;

update public.question_bank q
set source_id = s.id
from public.question_sources s
where q.source_id is null
  and nullif(trim(q.source), '') is not null
  and s.source_key = 'legacy-source-' || md5(trim(q.source));

-- Stable exact-content fingerprint for duplicate detection. It is not a semantic
-- similarity score and does not automatically merge or delete any question.
update public.question_bank q
set content_fingerprint = md5(concat_ws(
  chr(31),
  lower(regexp_replace(trim(coalesce(q.question, '')), '\s+', ' ', 'g')),
  lower(regexp_replace(trim(coalesce(q.option_a, '')), '\s+', ' ', 'g')),
  lower(regexp_replace(trim(coalesce(q.option_b, '')), '\s+', ' ', 'g')),
  lower(regexp_replace(trim(coalesce(q.option_c, '')), '\s+', ' ', 'g')),
  lower(regexp_replace(trim(coalesce(q.option_d, '')), '\s+', ' ', 'g'))
))
where q.content_fingerprint is null;

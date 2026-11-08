begin;

do $$
declare
  tbl text;
  required_tables text[] := array[
    'jamb_syllabus_general_objectives',
    'jamb_syllabus_content_items',
    'jamb_syllabus_import_batches',
    'jamb_syllabus_import_rows',
    'question_objective_mappings'
  ];
begin
  foreach tbl in array required_tables loop
    if to_regclass('public.' || tbl) is null then
      raise exception 'Required official syllabus ingestion table missing: %', tbl;
    end if;
    if not (select c.relrowsecurity from pg_class c where c.oid=to_regclass('public.' || tbl)) then
      raise exception 'RLS is not enabled on %', tbl;
    end if;
    if has_table_privilege('anon','public.'||tbl,'SELECT')
      or has_table_privilege('anon','public.'||tbl,'INSERT')
      or has_table_privilege('authenticated','public.'||tbl,'SELECT')
      or has_table_privilege('authenticated','public.'||tbl,'INSERT') then
      raise exception 'Client role unexpectedly has direct access to %', tbl;
    end if;
    if not has_table_privilege('service_role','public.'||tbl,'INSERT') then
      raise exception 'service_role cannot insert into %', tbl;
    end if;
  end loop;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='jamb_syllabus_versions'
      and column_name='source_document_sha256'
  ) then
    raise exception 'Syllabus source document hash field is missing';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and indexname='question_objective_mappings_question_status_idx'
  ) then
    raise exception 'Question/objective review lookup index is missing';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and indexname='jamb_syllabus_objectives_version_code_uidx'
  ) then
    raise exception 'Version-scoped objective-code uniqueness index is missing';
  end if;

  if exists (
    select 1 from public.jamb_syllabus_versions
    where verification_status='verified'
      and (source_url is null or source_document_sha256 is null or source_retrieved_at is null)
  ) then
    raise exception 'A verified syllabus version is missing source provenance';
  end if;

  if exists (
    select 1 from public.question_objective_mappings
    where review_status='approved' and confidence < 0
  ) then
    raise exception 'Invalid approved question/objective mapping confidence';
  end if;
end $$;

rollback;
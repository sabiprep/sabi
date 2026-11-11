-- Assertions for supabase/tests/full_platform_test_seed.sql.
-- This file must run only after the synthetic seed in disposable CI PostgreSQL.
do $$
declare
  n bigint;
begin
  select count(*) into n from public.jamb_subjects;
  if n < 25 then raise exception 'Expected all 25 JAMB subjects, found %',n; end if;

  select count(*) into n from public.jamb_syllabus_versions where version_label='SABI_TEST_FIXTURE_2026';
  if n <> 25 then raise exception 'Expected 25 synthetic syllabus releases, found %',n; end if;

  select count(*) into n from public.jamb_topics where source_label='SABI_TEST_FIXTURE';
  if n <> 100 then raise exception 'Expected 100 synthetic topics, found %',n; end if;

  select count(*) into n from public.jamb_subtopics where source_label='SABI_TEST_FIXTURE';
  if n <> 200 then raise exception 'Expected 200 synthetic subtopics, found %',n; end if;

  select count(*) into n from public.jamb_syllabus_objectives where source_label='SABI_TEST_FIXTURE';
  if n <> 200 then raise exception 'Expected 200 synthetic objectives, found %',n; end if;

  select count(*) into n from public.jamb_syllabus_content_items where source_label='SABI_TEST_FIXTURE';
  if n <> 100 then raise exception 'Expected 100 synthetic syllabus content items, found %',n; end if;

  select count(*) into n from public.question_bank where source='SABI_TEST_FIXTURE';
  if n <> 500 then raise exception 'Expected 500 synthetic questions, found %',n; end if;

  select count(*) into n from public.question_objective_mappings m
  join public.question_bank q on q.id=m.question_id where q.source='SABI_TEST_FIXTURE';
  if n <> 500 then raise exception 'Expected 500 synthetic objective mappings, found %',n; end if;

  select count(*) into n from public.question_variant_groups where concept_key like 'sabi-test-concept-%';
  if n <> 100 then raise exception 'Expected 100 synthetic variant groups, found %',n; end if;

  select count(*) into n from public.question_variant_members m
  join public.question_variant_groups g on g.id=m.group_id
  where g.concept_key like 'sabi-test-concept-%';
  if n <> 300 then raise exception 'Expected 300 synthetic variant members, found %',n; end if;

  select count(*) into n from public.gamification_rules where event_key in
    ('question_correct','session_completed','daily_study','streak_milestone','diagnostic_completed');
  if n <> 5 then raise exception 'Gamification reference data incomplete'; end if;

  select count(*) into n from public.entitlement_catalogue where entitlement_key like '%.%';
  if n < 5 then raise exception 'Entitlement catalogue fixture incomplete'; end if;

  select count(*) into n from public.subscription_plans where plan_key in ('qa-free','qa-premium');
  if n <> 2 then raise exception 'Subscription plan fixture incomplete'; end if;

  select count(*) into n from public.ai_task_pricing where is_active;
  if n < 4 then raise exception 'AI task pricing fixture incomplete'; end if;

  select count(*) into n from public.ai_prompt_versions where version=1 and status='draft';
  if n < 4 then raise exception 'AI prompt fixture incomplete'; end if;

  select count(*) into n from public.notification_templates where template_key in
    ('learning_session_completed','review_due','streak_milestone','weekly_progress');
  if n <> 4 then raise exception 'Notification template fixture incomplete'; end if;

  select count(*) into n from public.knowledge_documents where metadata->>'fixture'='true';
  if n <> 2 then raise exception 'Synthetic knowledge documents incomplete'; end if;

  select count(*) into n from public.knowledge_chunks c
  join public.knowledge_documents d on d.id=c.document_id
  where d.metadata->>'fixture'='true';
  if n <> 2 then raise exception 'Synthetic knowledge chunks incomplete'; end if;

  if exists (
    select 1 from public.jamb_syllabus_versions
    where version_label='SABI_TEST_FIXTURE_2026'
      and (verification_status <> 'draft' or source_url <> 'urn:sabi:test-fixture')
  ) then raise exception 'Synthetic syllabus records must remain draft and visibly test-only'; end if;

  if exists (
    select 1 from public.question_bank
    where source='SABI_TEST_FIXTURE'
      and (notes not like 'DISPOSABLE CI ONLY.%' or status <> 'published')
  ) then raise exception 'Synthetic question labelling or test selection status is incorrect'; end if;
end
$$;

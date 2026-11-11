-- SABI full-platform synthetic data pack.
-- CI/DISPOSABLE DATABASE ONLY. Never apply to production or a live learner database.
-- All syllabus records are explicitly marked as synthetic draft fixtures, not JAMB content.
begin;

-- 25 subject catalogue entries are created by the normal CI seed. Add one clearly
-- labelled test syllabus release per subject so taxonomy, coverage and selection
-- paths can be exercised across the complete catalogue.
insert into public.jamb_syllabus_versions
  (subject_slug,version_label,syllabus_year,source_url,verification_status,notes,source_metadata)
select s.slug,'SABI_TEST_FIXTURE_2026',2026,'urn:sabi:test-fixture','draft',
  'Synthetic QA-only curriculum. Not official JAMB syllabus content.',
  jsonb_build_object('fixture',true,'purpose','full_platform_ci','not_official',true)
from public.jamb_subjects s
on conflict (subject_slug,version_label) do nothing;

-- Four representative topics per subject, two subtopics and two learning
-- objectives per topic. This provides broad coverage without inventing official
-- JAMB topic claims or changing any verified production content.
insert into public.jamb_topics
  (subject_slug,slug,name,syllabus_year,sort_order,is_active,syllabus_version_id,
   verification_status,source_label,section_code,section_title,content_notes)
select s.slug,
  'sabi-test-topic-'||n,
  'SABI TEST TOPIC '||n||' — '||s.display_name,
  2026,n,true,v.id,'draft','SABI_TEST_FIXTURE',
  'QA','Synthetic QA Curriculum',
  'Synthetic test-only topic for integration testing; not JAMB syllabus wording.'
from public.jamb_subjects s
join public.jamb_syllabus_versions v
  on v.subject_slug=s.slug and v.version_label='SABI_TEST_FIXTURE_2026'
cross join generate_series(1,4) n
on conflict do nothing;

create temporary table _sabi_test_topics on commit drop as
select t.id,t.subject_slug,t.slug,t.name,t.syllabus_version_id,t.sort_order
from public.jamb_topics t
where t.source_label='SABI_TEST_FIXTURE'
  and t.slug like 'sabi-test-topic-%';

insert into public.jamb_subtopics
  (topic_id,slug,name,verification_status,source_label,sort_order,is_active)
select t.id,'sabi-test-subtopic-'||n,
  'SABI TEST SUBTOPIC '||n||' — '||t.name,
  'draft','SABI_TEST_FIXTURE',n,true
from _sabi_test_topics t cross join generate_series(1,2) n
on conflict do nothing;

insert into public.jamb_syllabus_general_objectives
  (syllabus_version_id,objective_code,objective_text,sort_order,verification_status)
select v.id,'QA-GO-'||s.slug,
  'Synthetic QA objective: verify that the '||s.display_name||
  ' syllabus release can be retrieved, versioned and filtered.',
  1,'draft'
from public.jamb_subjects s
join public.jamb_syllabus_versions v
  on v.subject_slug=s.slug and v.version_label='SABI_TEST_FIXTURE_2026'
on conflict do nothing;

insert into public.jamb_syllabus_objectives
  (syllabus_version_id,topic_id,subtopic_id,objective_code,objective_text,
   verification_status,source_url,source_label,sort_order,objective_group)
select t.syllabus_version_id,t.id,st.id,
  'QA-'||t.subject_slug||'-'||t.sort_order||'-'||st.sort_order,
  'Synthetic QA objective: demonstrate that SABI can map a question to '||
  st.name||' and record mastery without treating this as official JAMB content.',
  'draft','urn:sabi:test-fixture','SABI_TEST_FIXTURE',st.sort_order,'QA'
from _sabi_test_topics t
join public.jamb_subtopics st on st.topic_id=t.id
on conflict do nothing;

insert into public.jamb_syllabus_content_items
  (topic_id,syllabus_version_id,item_type,item_text,sort_order,
   verification_status,source_label)
select t.id,t.syllabus_version_id,'content',
  'Synthetic test content for '||t.name||
  '. Used only to validate syllabus rendering and topic navigation.',
  1,'draft','SABI_TEST_FIXTURE'
from _sabi_test_topics t
where not exists (
  select 1 from public.jamb_syllabus_content_items c
  where c.topic_id=t.id and c.source_label='SABI_TEST_FIXTURE'
);

-- 20 selectable synthetic questions per subject (5 per topic, 500 total).
-- Explicit TEST FIXTURE labels prevent confusion with historical JAMB questions.
insert into public.question_bank
  (id,exam_type,subject,topic,subtopic,question,option_a,option_b,option_c,option_d,
   answer,explanation,explanation_short,difficulty,concepts,source,status,
   confidence_score,verified_by,topic_id,subtopic_id,review_status,notes)
select
  'SABI-TEST-'||t.subject_slug||'-'||t.sort_order||'-'||q.n,
  'UTME',s.display_name,t.name,st.name,
  'SABI TEST FIXTURE — '||s.display_name||' / '||t.name||
    '. Synthetic item '||q.n||': choose option A to validate question delivery, scoring and analytics.',
  'Synthetic correct response','Synthetic distractor one',
  'Synthetic distractor two','Synthetic distractor three',
  'A','Synthetic fixture answer key. Not an academic/JAMB answer.',
  'Test fixture: option A is the expected response.',
  case when q.n%3=0 then 'hard' when q.n%3=1 then 'easy' else 'medium' end,
  array['sabi-test-fixture',t.subject_slug,t.slug],
  'SABI_TEST_FIXTURE','published',1.0,'SABI_TEST_FIXTURE',
  t.id,st.id,'approved',
  'DISPOSABLE CI ONLY. Synthetic item; never use in production or public practice.'
from _sabi_test_topics t
join public.jamb_subjects s on s.slug=t.subject_slug
join public.jamb_subtopics st on st.topic_id=t.id and st.sort_order=1
cross join generate_series(1,5) q(n)
on conflict (id) do nothing;

-- Test-only objective links and adaptive variant families.
insert into public.question_objective_mappings
  (question_id,objective_id,mapping_method,confidence,review_status,evidence)
select q.id,o.id,'rule_based',1.0,'approved',
  jsonb_build_object('fixture',true,'mapping_reason','same synthetic topic')
from public.question_bank q
join _sabi_test_topics t on t.id=q.topic_id
join public.jamb_syllabus_objectives o on o.topic_id=t.id
where q.source='SABI_TEST_FIXTURE'
  and o.source_label='SABI_TEST_FIXTURE'
  and o.sort_order=1
on conflict (question_id,objective_id) do nothing;

insert into public.question_variant_groups
  (subject_slug,topic_id,concept_key,group_kind)
select t.subject_slug,t.id,'sabi-test-concept-'||t.slug,'same_concept'
from _sabi_test_topics t
where not exists (
  select 1 from public.question_variant_groups g
  where g.topic_id=t.id and g.concept_key='sabi-test-concept-'||t.slug
);

insert into public.question_variant_members
  (group_id,question_id,difficulty_level,variant_role,is_active)
select g.id,q.id,
  case row_number() over(partition by g.id order by q.id)
    when 1 then 'foundation' when 2 then 'standard' else 'challenge' end,
  case row_number() over(partition by g.id order by q.id)
    when 1 then 'original' when 2 then 'parallel' else 'extension' end,
  true
from public.question_variant_groups g
join public.question_bank q on q.topic_id=g.topic_id and q.source='SABI_TEST_FIXTURE'
where g.concept_key like 'sabi-test-concept-%'
  and not exists (select 1 from public.question_variant_members m where m.group_id=g.id and m.question_id=q.id)
  and q.id in (
    select q2.id from public.question_bank q2
    where q2.topic_id=g.topic_id and q2.source='SABI_TEST_FIXTURE'
    order by q2.id limit 3
  );

-- Reference/configuration data required by the learning experience.
insert into public.gamification_rules(event_key,description,xp_delta,max_awards_per_day,is_active)
values
 ('question_correct','Synthetic QA: correct answer',5,100,true),
 ('session_completed','Synthetic QA: completed session',20,10,true),
 ('daily_study','Synthetic QA: daily study activity',10,1,true),
 ('streak_milestone','Synthetic QA: streak milestone',25,1,true),
 ('diagnostic_completed','Synthetic QA: diagnostic completed',30,1,true)
on conflict (event_key) do nothing;

insert into public.entitlement_catalogue(entitlement_key,description,value_schema,is_active)
values
 ('practice.daily_limit','Daily practice question allowance','{"type":"integer","minimum":0}'::jsonb,true),
 ('cbt.access','Access to CBT simulator','{"type":"boolean"}'::jsonb,true),
 ('ai.tutor','Access to AI tutor','{"type":"boolean"}'::jsonb,true),
 ('analytics.advanced','Advanced learning analytics','{"type":"boolean"}'::jsonb,true),
 ('offline.access','Offline learning access','{"type":"boolean"}'::jsonb,true)
on conflict (entitlement_key) do nothing;

insert into public.subscription_plans
  (plan_key,display_name,description,price_amount,currency,billing_interval,
   features,limits,ai_credit_allowance,is_active,display_order)
values
 ('qa-free','QA Free','Synthetic CI-only free plan',0,'NGN','monthly',
  '{"practice":true,"cbt":true,"analytics":false}'::jsonb,
  '{"daily_questions":100,"ai_requests":0}'::jsonb,0,true,1),
 ('qa-premium','QA Premium','Synthetic CI-only premium plan',0,'NGN','monthly',
  '{"practice":true,"cbt":true,"analytics":true,"tutor":true}'::jsonb,
  '{"daily_questions":1000,"ai_requests":100}'::jsonb,100,true,2)
on conflict (plan_key) do nothing;

insert into public.ai_task_pricing(task,credit_cost,is_active)
values ('explanation',0,true),('tutor_chat',0,true),('content_draft',0,true),('study_plan',0,true)
on conflict (task) do nothing;

insert into public.ai_prompt_versions(task,version,system_instruction,prompt_template,status)
values
 ('explanation',1,'Synthetic CI prompt. Never used for production learner responses.','Explain this synthetic test question: {{question}}','draft'),
 ('tutor_chat',1,'Synthetic CI prompt. Never used for production learner responses.','Respond to this synthetic learner message: {{message}}','draft'),
 ('content_draft',1,'Synthetic CI prompt. Human review required.','Draft synthetic QA learning content for {{topic}}','draft'),
 ('study_plan',1,'Synthetic CI prompt. Never used for production learner responses.','Create a synthetic QA study plan for {{goal}}','draft')
on conflict (task,version) do nothing;

insert into public.notification_templates
  (template_key,channel,locale,version,subject_template,body_template,variables_schema,status)
values
 ('learning_session_completed','in_app','en',1,null,'Your synthetic QA session is complete.','{"type":"object"}'::jsonb,'active'),
 ('review_due','in_app','en',1,null,'A synthetic QA topic is ready for review.','{"type":"object"}'::jsonb,'active'),
 ('streak_milestone','in_app','en',1,null,'Your synthetic QA study streak advanced.','{"type":"object"}'::jsonb,'active'),
 ('weekly_progress','email','en',1,'Your SABI QA progress','This is a synthetic CI-only progress message.','{"type":"object"}'::jsonb,'draft')
on conflict (template_key,channel,locale,version) do nothing;

-- A small, explicitly synthetic knowledge corpus exercises retrieval and chunking.
insert into public.knowledge_documents
  (title,subject,topic,source_type,source_reference,source_url,content_hash,status,metadata)
values
 ('SABI QA knowledge fixture — study skills','General','Study skills','test_fixture',
  'sabi-test:study-skills',null,md5('sabi-test-study-skills-v1'),'draft',
  '{"fixture":true,"not_official":true}'::jsonb),
 ('SABI QA knowledge fixture — CBT guidance','General','CBT practice','test_fixture',
  'sabi-test:cbt-guidance',null,md5('sabi-test-cbt-guidance-v1'),'draft',
  '{"fixture":true,"not_official":true}'::jsonb)
on conflict (content_hash) do nothing;

insert into public.knowledge_chunks(document_id,chunk_index,content,token_count,metadata)
select d.id,0,
  case when d.title like '%study skills%' then
    'Synthetic QA guidance: practise consistently, review mistakes and revisit weak topics.'
  else
    'Synthetic QA guidance: read each question carefully, manage the timer and review flagged items.'
  end,
  20,'{"fixture":true}'::jsonb
from public.knowledge_documents d
where d.content_hash in (md5('sabi-test-study-skills-v1'),md5('sabi-test-cbt-guidance-v1'))
on conflict (document_id,chunk_index) do nothing;

commit;

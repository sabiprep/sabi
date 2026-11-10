-- SABI onboarding v3: preserve v1/v2 records and publish the agreed 15-question profile.
begin;
insert into public.student_onboarding_question_versions (question_set_id, version_label, status, published_at)
select id, 'v3', 'published', now()
from public.student_onboarding_question_sets
where set_key = 'candidate-onboarding'
on conflict (question_set_id, version_label) do update set status = 'published', published_at = coalesce(public.student_onboarding_question_versions.published_at, excluded.published_at);

insert into public.student_onboarding_questions
  (question_version_id, question_key, prompt, answer_type, processing_purpose, sensitivity_level, is_required, sort_order, validation_rules)
select v3.id, q.question_key, q.prompt, q.answer_type, q.processing_purpose, q.sensitivity_level, q.is_required, q.sort_order, q.validation_rules
from public.student_onboarding_question_versions v2
join public.student_onboarding_question_sets s on s.id = v2.question_set_id
join public.student_onboarding_question_versions v3 on v3.question_set_id = s.id and v3.version_label = 'v3'
join public.student_onboarding_questions q on q.question_version_id = v2.id
where s.set_key = 'candidate-onboarding' and v2.version_label = 'v2'
on conflict (question_version_id, question_key) do nothing;

insert into public.student_onboarding_questions
  (question_version_id, question_key, prompt, answer_type, processing_purpose, sensitivity_level, is_required, sort_order, validation_rules)
select v.id, q.question_key, q.prompt, q.answer_type, q.processing_purpose, q.sensitivity_level, q.is_required, q.sort_order, '{}'::jsonb
from public.student_onboarding_question_versions v
join public.student_onboarding_question_sets s on s.id = v.question_set_id
cross join (values
 ('fullName','What is your full name?','short_text','account_and_exam_setup','standard',true,1),
 ('academicStatus','What is your current academic status and previous JAMB experience?','structured','account_and_exam_setup','standard',true,3),
 ('troubleTopic','Is there a particular topic you struggle with?','long_text','personalized_learning','standard',true,9),
 ('studyStyle','Which study approach sounds most like you?','short_text','personalized_learning','standard',true,10),
 ('studyEnvironment','Where do you usually study?','short_text','personalized_learning','standard',true,12),
 ('languagePreference','Which language style do you prefer?','short_text','personalized_learning','standard',true,14)
) as q(question_key,prompt,answer_type,processing_purpose,sensitivity_level,is_required,sort_order)
where s.set_key='candidate-onboarding' and v.version_label='v3'
on conflict (question_version_id, question_key) do update
set prompt=excluded.prompt, answer_type=excluded.answer_type, processing_purpose=excluded.processing_purpose,
    sensitivity_level=excluded.sensitivity_level, is_required=excluded.is_required, sort_order=excluded.sort_order;

update public.student_onboarding_questions q set sort_order = case q.question_key
 when 'fullName' then 1 when 'chosenSubjects' then 2 when 'academicStatus' then 3
 when 'targetCourse' then 4 when 'targetUniversity' then 4 when 'monthsUntilExam' then 5
 when 'subjectConfidence' then 6 when 'prioritySubject' then 7 when 'struggleType' then 8
 when 'troubleTopic' then 9 when 'studyStyle' then 10 when 'dailyStudyHours' then 11
 when 'studyEnvironment' then 12 when 'explanationPreference' then 13 when 'languagePreference' then 14
 when 'motivation' then 15 else q.sort_order end
from public.student_onboarding_question_versions v
where q.question_version_id=v.id and v.version_label='v3';
commit;

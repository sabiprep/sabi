-- Idempotent starter catalogue for the universal signal layer.
insert into public.signal_definitions
  (signal_key,display_name,description,domain,value_type,unit,sensitivity_level,default_purpose,lifecycle_status,current_schema_version)
values
 ('student.motivation','Learner motivation','Voluntary learner-stated reasons and goals for exam preparation','student','string',null,'personal','personalized_learning','active',1),
 ('student.confidence','Learner confidence','Voluntary self-reported confidence level on a 1-5 scale','student','number','1-5','personal','personalized_learning','active',1),
 ('student.study_consistency','Study consistency','Derived consistency score from completed study activity','student','number','0-1','standard','personalized_learning','active',1),
 ('student.daily_study_minutes','Daily study time','Derived active study minutes per local calendar day','student','integer','minutes','standard','personalized_learning','active',1),
 ('learning.answer_accuracy','Answer accuracy','Rolling proportion of submitted answers answered correctly','learning','number','0-1','standard','personalized_learning','active',1),
 ('learning.answer_time_ms','Answer time','Elapsed time from question presentation to answer submission','learning','integer','milliseconds','standard','personalized_learning','active',1),
 ('learning.topic_avoidance','Topic avoidance','Derived propensity to defer or skip a topic when presented','learning','number','0-1','personal','personalized_learning','active',1),
 ('learning.revisit_rate','Question revisit rate','Proportion of presented questions revisited during a session','learning','number','0-1','standard','personalized_learning','active',1),
 ('learning.hint_dependency','Hint dependency','Proportion of attempted questions requiring a hint','learning','number','0-1','standard','personalized_learning','active',1),
 ('learning.explanation_engagement','Explanation engagement','Proportion of incorrect or uncertain answers followed by explanation review','learning','number','0-1','standard','personalized_learning','active',1),
 ('learning.mastery_score','Topic mastery','Current mastery estimate for a learner and syllabus topic','learning','number','0-100','standard','personalized_learning','active',1),
 ('exam.predicted_score','Predicted UTME score','Model-estimated UTME score; not an official result or guarantee','exam','integer','0-400','personal','personalized_learning','active',1)
on conflict (signal_key) do update set
 display_name=excluded.display_name, description=excluded.description,
 domain=excluded.domain, value_type=excluded.value_type, unit=excluded.unit,
 sensitivity_level=excluded.sensitivity_level, default_purpose=excluded.default_purpose,
 lifecycle_status=excluded.lifecycle_status;

insert into public.signal_schema_versions(signal_key,schema_version,json_schema,compatibility_mode,version_status,changelog)
select d.signal_key,1,
  case d.value_type
    when 'string' then jsonb_build_object('$schema','https://json-schema.org/draft/2020-12/schema','type','string','maxLength',2000)
    when 'integer' then jsonb_build_object('$schema','https://json-schema.org/draft/2020-12/schema','type','integer','minimum',0)
    when 'number' then jsonb_build_object('$schema','https://json-schema.org/draft/2020-12/schema','type','number')
    else jsonb_build_object('$schema','https://json-schema.org/draft/2020-12/schema','type',d.value_type)
  end,
  'backward','active','Initial stable signal contract'
from public.signal_definitions d
where d.signal_key in (
 'student.motivation','student.confidence','student.study_consistency','student.daily_study_minutes',
 'learning.answer_accuracy','learning.answer_time_ms','learning.topic_avoidance','learning.revisit_rate',
 'learning.hint_dependency','learning.explanation_engagement','learning.mastery_score','exam.predicted_score'
)
on conflict (signal_key,schema_version) do nothing;

insert into public.signal_source_registry(source_key,display_name,source_type,trust_level,allowed_purposes)
values
 ('onboarding-v2','Candidate onboarding v2','onboarding','standard',array['account_and_exam_setup','personalized_learning']),
 ('learning-event-stream','Learning event stream','learning_event','standard',array['personalized_learning']),
 ('progress-checkin','Voluntary progress check-in','progress_checkin','standard',array['personalized_learning']),
 ('engine-derived','Engine-derived signal','derived','standard',array['personalized_learning']),
 ('system-assessment','Sabi assessment service','assessment','verified',array['account_and_exam_setup','personalized_learning'])
on conflict (source_key) do update set
 display_name=excluded.display_name, source_type=excluded.source_type,
 trust_level=excluded.trust_level, allowed_purposes=excluded.allowed_purposes;

-- Contracts are independent from engine implementation versions. A contract may
-- evolve without silently changing the algorithm version recorded in engine_registry.
insert into public.engine_contract_versions(engine_key,contract_version,contract,compatibility_mode,contract_status,changelog)
values
 ('mastery-engine',1,'{"inputs":[{"signal":"learning.answer_accuracy","requirement":"required"},{"signal":"learning.answer_time_ms","requirement":"optional"}],"outputs":[{"signal":"learning.mastery_score"}],"missing_data":"skip_optional_and_preserve_existing_mastery"}','backward','active','Initial mastery engine signal contract'),
 ('spaced-repetition-engine',1,'{"inputs":[{"signal":"learning.mastery_score","requirement":"required"},{"signal":"learning.answer_accuracy","requirement":"required"},{"signal":"learning.answer_time_ms","requirement":"optional"}],"outputs":[],"missing_data":"do_not_schedule_without_required_mastery_and_accuracy"}','backward','active','Initial spaced repetition signal contract'),
 ('adaptive-practice-engine',1,'{"inputs":[{"signal":"learning.mastery_score","requirement":"required"},{"signal":"learning.answer_accuracy","requirement":"required"},{"signal":"learning.topic_avoidance","requirement":"optional"},{"signal":"learning.hint_dependency","requirement":"optional"}],"outputs":[],"missing_data":"fallback_to_existing_phase2_selection"}','backward','active','Initial adaptive practice signal contract'),
 ('recommendation-engine',1,'{"inputs":[{"signal":"learning.mastery_score","requirement":"required"},{"signal":"student.confidence","requirement":"optional"},{"signal":"student.study_consistency","requirement":"optional"},{"signal":"student.motivation","requirement":"optional"},{"signal":"learning.topic_avoidance","requirement":"optional"}],"outputs":[],"missing_data":"rank_using_available_signals_only"}','backward','active','Initial recommendation signal contract'),
 ('score-prediction-engine',1,'{"inputs":[{"signal":"learning.answer_accuracy","requirement":"required"},{"signal":"learning.mastery_score","requirement":"required"},{"signal":"student.study_consistency","requirement":"optional"}],"outputs":[{"signal":"exam.predicted_score"}],"missing_data":"return_insufficient_evidence_instead_of_fabricating_prediction"}','backward','active','Initial score prediction signal contract'),
 ('diagnostic-engine',1,'{"inputs":[{"signal":"learning.answer_accuracy","requirement":"required"},{"signal":"student.confidence","requirement":"optional"}],"outputs":[],"missing_data":"request_baseline_assessment_if_accuracy_missing"}','backward','active','Initial diagnostic signal contract'),
 ('ai-tutor-engine',1,'{"inputs":[{"signal":"student.motivation","requirement":"optional"},{"signal":"student.confidence","requirement":"optional"},{"signal":"learning.topic_avoidance","requirement":"optional"},{"signal":"learning.mastery_score","requirement":"optional"}],"outputs":[],"missing_data":"continue_tutor_without_optional_context"}','backward','active','Initial AI tutor signal contract'),
 ('study-plan-engine',1,'{"inputs":[{"signal":"student.daily_study_minutes","requirement":"optional"},{"signal":"student.study_consistency","requirement":"optional"},{"signal":"student.confidence","requirement":"optional"},{"signal":"learning.mastery_score","requirement":"optional"}],"outputs":[],"missing_data":"use_student_declared_study_goal_defaults"}','backward','active','Initial study plan signal contract'),
 ('learning-analytics-engine',1,'{"inputs":[{"signal":"student.study_consistency","requirement":"optional"},{"signal":"student.daily_study_minutes","requirement":"optional"},{"signal":"learning.revisit_rate","requirement":"optional"},{"signal":"learning.hint_dependency","requirement":"optional"},{"signal":"learning.explanation_engagement","requirement":"optional"}],"outputs":[],"missing_data":"report_coverage_and_exclude_missing_values"}','backward','active','Initial learning analytics signal contract')
on conflict (engine_key,contract_version) do nothing;

insert into public.signal_engine_subscriptions
 (engine_key,engine_contract_version,signal_key,input_requirement,trigger_mode)
select x.engine_key,1,x.signal_key,x.input_requirement,'on_change'
from (values
 ('mastery-engine','learning.answer_accuracy','required'),
 ('mastery-engine','learning.answer_time_ms','optional'),
 ('spaced-repetition-engine','learning.mastery_score','required'),
 ('spaced-repetition-engine','learning.answer_accuracy','required'),
 ('spaced-repetition-engine','learning.answer_time_ms','optional'),
 ('adaptive-practice-engine','learning.mastery_score','required'),
 ('adaptive-practice-engine','learning.answer_accuracy','required'),
 ('adaptive-practice-engine','learning.topic_avoidance','optional'),
 ('adaptive-practice-engine','learning.hint_dependency','optional'),
 ('recommendation-engine','learning.mastery_score','required'),
 ('recommendation-engine','student.confidence','optional'),
 ('recommendation-engine','student.study_consistency','optional'),
 ('recommendation-engine','student.motivation','optional'),
 ('recommendation-engine','learning.topic_avoidance','optional'),
 ('score-prediction-engine','learning.answer_accuracy','required'),
 ('score-prediction-engine','learning.mastery_score','required'),
 ('score-prediction-engine','student.study_consistency','optional'),
 ('diagnostic-engine','learning.answer_accuracy','required'),
 ('diagnostic-engine','student.confidence','optional'),
 ('ai-tutor-engine','student.motivation','optional'),
 ('ai-tutor-engine','student.confidence','optional'),
 ('ai-tutor-engine','learning.topic_avoidance','optional'),
 ('ai-tutor-engine','learning.mastery_score','optional'),
 ('study-plan-engine','student.daily_study_minutes','optional'),
 ('study-plan-engine','student.study_consistency','optional'),
 ('study-plan-engine','student.confidence','optional'),
 ('study-plan-engine','learning.mastery_score','optional'),
 ('learning-analytics-engine','student.study_consistency','optional'),
 ('learning-analytics-engine','student.daily_study_minutes','optional'),
 ('learning-analytics-engine','learning.revisit_rate','optional'),
 ('learning-analytics-engine','learning.hint_dependency','optional'),
 ('learning-analytics-engine','learning.explanation_engagement','optional')
) as x(engine_key,signal_key,input_requirement)
on conflict (engine_key,engine_contract_version,signal_key,trigger_mode) do update
set input_requirement=excluded.input_requirement,is_enabled=true;

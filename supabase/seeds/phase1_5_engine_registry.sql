-- Seed known engine contracts. Planned engines are registered but not claimed to be implemented.
insert into public.engine_registry (engine_key, display_name, purpose, lifecycle_status, current_version)
values
  ('diagnostic-engine','Diagnostic Engine','Baseline assessment and gap identification','active','phase-1'),
  ('mastery-engine','Mastery Engine','Learner topic mastery estimation and historical snapshots','active','phase-2'),
  ('spaced-repetition-engine','Spaced Repetition Engine','Review interval scheduling from learner performance','active','phase-2'),
  ('adaptive-practice-engine','Adaptive Practice Engine','Select practice questions using mastery, recency and difficulty signals','active','phase-2'),
  ('recommendation-engine','Recommendation Engine','Prioritise next learning actions and topic reviews','active','phase-2'),
  ('score-prediction-engine','Score Prediction Engine','Estimate a practice score range from observed performance','active','phase-2'),
  ('question-quality-engine','Question Quality Engine','Track provenance, review state and academic quality checks','planned','phase-1.5'),
  ('ai-tutor-engine','AI Tutor Engine','Tutor interaction orchestration and feedback capture','planned',null),
  ('study-plan-engine','Study Plan Engine','Longitudinal study plan generation and adjustment','planned',null),
  ('learning-analytics-engine','Learning Analytics Engine','Aggregate learning behaviour and engagement signals','planned',null)
on conflict (engine_key) do update set
  display_name = excluded.display_name,
  purpose = excluded.purpose,
  lifecycle_status = excluded.lifecycle_status,
  current_version = excluded.current_version,
  updated_at = now();

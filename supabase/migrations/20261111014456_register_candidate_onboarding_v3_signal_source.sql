-- Register the v3 onboarding signal source used by the candidate onboarding API.
-- The signal observation FK requires every source_key to exist in this registry.
insert into public.signal_source_registry
  (source_key, display_name, source_type, trust_level, allowed_purposes, is_active, source_metadata)
values
  ('onboarding-v3', 'Candidate onboarding v3', 'onboarding', 'standard',
   array['account_and_exam_setup','personalized_learning'], true,
   '{"introduced_by":"candidate_onboarding_v3"}'::jsonb)
on conflict (source_key) do update set
  display_name = excluded.display_name,
  source_type = excluded.source_type,
  trust_level = excluded.trust_level,
  allowed_purposes = excluded.allowed_purposes,
  is_active = true,
  source_metadata = public.signal_source_registry.source_metadata || excluded.source_metadata;

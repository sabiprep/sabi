-- Add supporting indexes for every foreign key identified in the production integrity audit.
-- Additive only: no table, row, constraint, or existing index is removed.
begin;

create index if not exists idx_fk_admin_role_perm_grants_permission on public.admin_role_permission_grants(permission_key);
create index if not exists idx_fk_admin_user_roles_granted_by on public.admin_user_role_assignments(granted_by);
create index if not exists idx_fk_ai_prompt_versions_approved_by on public.ai_prompt_versions(approved_by);
create index if not exists idx_fk_ai_prompt_versions_created_by on public.ai_prompt_versions(created_by);
create index if not exists idx_fk_engine_run_signal_inputs_signal on public.engine_run_signal_inputs(signal_key);
create index if not exists idx_fk_engine_run_signal_inputs_signal_version on public.engine_run_signal_inputs(signal_key, schema_version);
create index if not exists idx_fk_engine_run_signal_inputs_observation on public.engine_run_signal_inputs(signal_observation_id);
create index if not exists idx_fk_engine_runs_session on public.engine_runs(session_id);
create index if not exists idx_fk_jamb_subject_availability_subject on public.jamb_subject_availability(subject_slug);
create index if not exists idx_fk_jamb_syllabus_content_version on public.jamb_syllabus_content_items(syllabus_version_id);
create index if not exists idx_fk_jamb_syllabus_import_created_by on public.jamb_syllabus_import_batches(created_by);
create index if not exists idx_fk_jamb_syllabus_import_reviewed_by on public.jamb_syllabus_import_batches(reviewed_by);
create index if not exists idx_fk_jamb_syllabus_import_version on public.jamb_syllabus_import_batches(version_id);
create index if not exists idx_fk_jamb_syllabus_objectives_subtopic on public.jamb_syllabus_objectives(subtopic_id);
create index if not exists idx_fk_jamb_syllabus_versions_approved_by on public.jamb_syllabus_versions(approved_by);
create index if not exists idx_fk_knowledge_documents_approved_by on public.knowledge_documents(approved_by);
create index if not exists idx_fk_learning_events_session_item on public.learning_events(session_item_id);
create index if not exists idx_fk_notification_delivery_queue on public.notification_delivery_logs(queue_id);
create index if not exists idx_fk_payment_transactions_plan on public.payment_transactions(plan_id);
create index if not exists idx_fk_payment_transactions_subscription on public.payment_transactions(subscription_id);
create index if not exists idx_fk_question_objective_reviewer on public.question_objective_mappings(reviewer_user_id);
create index if not exists idx_fk_question_review_history_reviewer on public.question_review_history(reviewer_user_id);
create index if not exists idx_fk_recommendation_feedback_recommendation on public.recommendation_feedback(recommendation_id);
create index if not exists idx_fk_recommendations_engine_run on public.recommendations(engine_run_id);
create index if not exists idx_fk_school_memberships_invited_by on public.school_memberships(invited_by);
create index if not exists idx_fk_signal_definitions_purpose on public.signal_definitions(default_purpose);
create index if not exists idx_fk_signal_engine_subscriptions_signal on public.signal_engine_subscriptions(signal_key);
create index if not exists idx_fk_signal_outbox_engine on public.signal_processing_outbox(engine_key);
create index if not exists idx_fk_signal_outbox_observation on public.signal_processing_outbox(observation_id);
create index if not exists idx_fk_signal_outbox_signal on public.signal_processing_outbox(signal_key);
create index if not exists idx_fk_signal_outbox_user on public.signal_processing_outbox(user_id);
create index if not exists idx_fk_student_consent_history_user on public.student_consent_history(user_id);
create index if not exists idx_fk_student_entitlements_key on public.student_entitlements(entitlement_key);
create index if not exists idx_fk_onboarding_questions_purpose on public.student_onboarding_questions(processing_purpose);
create index if not exists idx_fk_onboarding_responses_question on public.student_onboarding_responses(question_id);
create index if not exists idx_fk_onboarding_submissions_version on public.student_onboarding_submissions(question_version_id);
create index if not exists idx_fk_signal_current_purpose on public.student_signal_current(purpose_key);
create index if not exists idx_fk_signal_current_signal_version on public.student_signal_current(signal_key, schema_version);
create index if not exists idx_fk_signal_current_observation on public.student_signal_current(source_observation_id);
create index if not exists idx_fk_signal_history_purpose on public.student_signal_history(purpose_key);
create index if not exists idx_fk_signal_history_signal on public.student_signal_history(signal_key);
create index if not exists idx_fk_signal_history_signal_version on public.student_signal_history(signal_key, schema_version);
create index if not exists idx_fk_signal_history_observation on public.student_signal_history(source_observation_id);
create index if not exists idx_fk_signal_observations_purpose on public.student_signal_observations(purpose_key);
create index if not exists idx_fk_signal_observations_signal_version on public.student_signal_observations(signal_key, schema_version);
create index if not exists idx_fk_signal_observations_source on public.student_signal_observations(source_key);
create index if not exists idx_fk_student_subject_selections_subject on public.student_subject_selections(subject_slug);
create index if not exists idx_fk_student_subscriptions_plan on public.student_subscriptions(plan_id);


-- Additional foreign keys found by the second, constraint-wide production audit.
create index if not exists idx_fk_adaptive_decisions_selected_question on public.adaptive_decisions(selected_question_id);
create index if not exists idx_fk_adaptive_decisions_session on public.adaptive_decisions(session_id);
create index if not exists idx_fk_adaptive_decisions_trigger_attempt on public.adaptive_decisions(trigger_attempt_id);
create index if not exists idx_fk_adaptive_decisions_variant_group on public.adaptive_decisions(variant_group_id);
create index if not exists idx_fk_jamb_syllabus_objectives_version on public.jamb_syllabus_objectives(syllabus_version_id);
create index if not exists idx_fk_question_attempts_session on public.question_attempts(session_id);
create index if not exists idx_fk_question_attempts_session_item on public.question_attempts(session_item_id);
create index if not exists idx_fk_question_attempts_variant_group on public.question_attempts(variant_group_id);
create index if not exists idx_fk_question_generation_jobs_created_by on public.question_generation_jobs(created_by);
create index if not exists idx_fk_question_generation_jobs_objective on public.question_generation_jobs(objective_id);
create index if not exists idx_fk_question_generation_jobs_source on public.question_generation_jobs(source_id);
create index if not exists idx_fk_question_generation_jobs_subject on public.question_generation_jobs(subject_slug);
create index if not exists idx_fk_question_variant_groups_created_by on public.question_variant_groups(created_by);
create index if not exists idx_fk_question_variant_groups_objective on public.question_variant_groups(objective_id);
create index if not exists idx_fk_question_variant_groups_subtopic on public.question_variant_groups(subtopic_id);
create index if not exists idx_fk_question_variant_groups_topic on public.question_variant_groups(topic_id);
create index if not exists idx_fk_signal_observations_source_event on public.student_signal_observations(source_event_id);

commit;

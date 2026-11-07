-- Phase 2 question-bank lifecycle assertions (disposable PostgreSQL only).
DO $$
DECLARE
  source_count BIGINT;
  version_count BIGINT;
  provenance_count BIGINT;
  pending_count BIGINT;
  approved_count BIGINT;
  payload_mismatches BIGINT;
  rls_missing BIGINT;
  eligible_count BIGINT;
BEGIN
  SELECT count(*) INTO source_count FROM public.question_bank;
  SELECT count(*) INTO version_count FROM public.question_bank_versions WHERE version_number = 1;
  SELECT count(*) INTO provenance_count FROM public.question_provenance;
  SELECT count(*) INTO pending_count FROM public.question_bank WHERE review_state = 'pending_review';
  SELECT count(*) INTO approved_count FROM public.question_bank WHERE review_state = 'approved';
  SELECT count(*) INTO payload_mismatches
  FROM public.question_bank q
  JOIN public.question_bank_versions v
    ON v.question_id = q.id AND v.version_number = 1
  WHERE v.payload->>'status' IS DISTINCT FROM q.status
     OR v.content_hash IS DISTINCT FROM md5(v.payload::text);

  SELECT count(*) INTO eligible_count FROM public.get_eligible_question_bank(NULL, 100, 0);

  SELECT count(*) INTO rls_missing
  FROM (VALUES
    ('question_bank_versions'),
    ('question_provenance'),
    ('question_review_events'),
    ('question_flags'),
    ('question_import_batches'),
    ('question_import_rows')
  ) AS expected(table_name)
  JOIN pg_class c ON c.oid = format('public.%I', expected.table_name)::regclass
  WHERE NOT c.relrowsecurity;

  IF version_count <> source_count THEN
    RAISE EXCEPTION 'Expected one baseline version per question: source %, versions %', source_count, version_count;
  END IF;
  IF provenance_count <> source_count THEN
    RAISE EXCEPTION 'Expected one provenance record per legacy question: source %, provenance %', source_count, provenance_count;
  END IF;
  IF pending_count <> source_count OR approved_count <> 0 THEN
    RAISE EXCEPTION 'Legacy questions must remain pending review: pending %, approved %, source %',
      pending_count, approved_count, source_count;
  END IF;
  IF payload_mismatches <> 0 THEN
    RAISE EXCEPTION 'Baseline snapshots do not match legacy records: % mismatches', payload_mismatches;
  END IF;
  IF eligible_count <> 0 THEN
    RAISE EXCEPTION 'Unreviewed legacy questions must not be served: eligible %', eligible_count;
  END IF;
  IF has_function_privilege('anon', 'public.review_question_bank_item(text,text,uuid,text,text,jsonb)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.review_question_bank_item(text,text,uuid,text,text,jsonb)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.create_question_bank_version(text,jsonb,text,uuid,text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.create_question_bank_version(text,jsonb,text,uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Client roles must not execute question review RPC';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.review_question_bank_item(text,text,uuid,text,text,jsonb)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.create_question_bank_version(text,jsonb,text,uuid,text)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.get_eligible_question_bank(text,integer,integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role must retain server-only question RPC execution';
  END IF;
  IF has_table_privilege('service_role', 'public.question_bank_versions', 'UPDATE')
     OR has_table_privilege('service_role', 'public.question_bank_versions', 'DELETE')
     OR has_table_privilege('service_role', 'public.question_review_events', 'UPDATE')
     OR has_table_privilege('service_role', 'public.question_review_events', 'DELETE') THEN
    RAISE EXCEPTION 'Question versions and review events must be append-only for service_role';
  END IF;
  IF rls_missing <> 0 THEN
    RAISE EXCEPTION 'RLS is missing from % Phase 2 tables', rls_missing;
  END IF;

  IF has_table_privilege('anon', 'public.question_bank', 'SELECT')
     OR has_table_privilege('authenticated', 'public.question_bank', 'SELECT') THEN
    RAISE EXCEPTION 'Question bank must remain inaccessible to client roles';
  END IF;
  IF has_table_privilege('anon', 'public.question_bank_versions', 'SELECT')
     OR has_table_privilege('authenticated', 'public.question_bank_versions', 'SELECT') THEN
    RAISE EXCEPTION 'Question versions must remain inaccessible to client roles';
  END IF;
  IF has_table_privilege('service_role', 'public.question_bank', 'TRUNCATE') THEN
    RAISE EXCEPTION 'service_role must not have TRUNCATE on the question bank';
  END IF;
  IF NOT has_table_privilege('service_role', 'public.question_bank', 'SELECT')
     OR NOT has_table_privilege('service_role', 'public.question_bank_versions', 'SELECT') THEN
    RAISE EXCEPTION 'service_role must retain question-bank read access';
  END IF;
END
$$;


-- Corrections must create a new snapshot and force the current record back
-- through review without mutating its previous version.
DO $
DECLARE
  reviewer UUID := '00000000-0000-4000-8000-000000000001';
  target_topic_id UUID;
  target_subtopic_id UUID;
  result JSONB;
  old_question TEXT;
BEGIN
  INSERT INTO auth.users(id, email)
  VALUES (reviewer, 'phase2-review-test@example.com')
  ON CONFLICT (id) DO NOTHING;

  SELECT id INTO target_topic_id
  FROM public.jamb_topics
  WHERE subject_slug = 'biology' AND name = 'Adaptation'
  LIMIT 1;
  SELECT id INTO target_subtopic_id
  FROM public.jamb_subtopics
  WHERE topic_id = target_topic_id AND name = 'Adaptations in animals'
  LIMIT 1;

  SELECT question INTO old_question FROM public.question_bank WHERE id = 'BIO-001';
  result := public.create_question_bank_version(
    'BIO-001',
    jsonb_build_object(
      'subjectSlug', 'biology',
      'topicId', target_topic_id,
      'subtopicId', target_subtopic_id,
      'year', 2020,
      'question', 'Which characteristic protects a camel from blowing sand?',
      'options', jsonb_build_object('A','Long eyelashes','B','Webbed feet','C','Thin fur','D','Gills'),
      'answer', 'A',
      'explanation', 'Long eyelashes help prevent blowing sand from entering the camel eyes.',
      'explanationShort', 'Long eyelashes protect the eyes.',
      'difficulty', 'easy',
      'concepts', jsonb_build_array('adaptation')
    ),
    'CI correction version test',
    reviewer,
    'CONTENT_MANAGER'
  );

  IF result->>'version_number' <> '2' THEN
    RAISE EXCEPTION 'Expected question version 2, got %', result;
  END IF;
  IF (SELECT current_version FROM public.question_bank WHERE id = 'BIO-001') <> 2
     OR (SELECT review_state FROM public.question_bank WHERE id = 'BIO-001') <> 'pending_review'
     OR (SELECT status FROM public.question_bank WHERE id = 'BIO-001') <> 'ai-draft' THEN
    RAISE EXCEPTION 'Question correction did not reset the current record to pending review';
  END IF;
  IF (SELECT payload->>'question' FROM public.question_bank_versions
      WHERE question_id = 'BIO-001' AND version_number = 1) IS DISTINCT FROM old_question THEN
    RAISE EXCEPTION 'Previous question version was modified by correction';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.question_bank_versions
    WHERE question_id = 'BIO-001' AND version_number = 2
  ) OR NOT EXISTS (
    SELECT 1 FROM public.question_review_events
    WHERE question_id = 'BIO-001' AND version_number = 2 AND decision = 'submitted'
  ) THEN
    RAISE EXCEPTION 'New version snapshot or submission review event is missing';
  END IF;
END
$;

-- Even an authenticated reviewer cannot approve a legacy question while its
-- provenance remains unverified. The failed call must leave review state intact.
DO $$
DECLARE
  reviewer UUID := '00000000-0000-4000-8000-000000000001';
BEGIN
  INSERT INTO auth.users(id, email)
  VALUES (reviewer, 'phase2-review-test@example.com')
  ON CONFLICT (id) DO NOTHING;

  BEGIN
    PERFORM public.review_question_bank_item(
      'BIO-001', 'approved', reviewer, 'CONTENT_MANAGER', 'CI approval guard test',
      '{"content_reviewed": true, "answer_key_verified": true}'::JSONB
    );
    RAISE EXCEPTION 'Expected approval to fail for unverified provenance';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  IF (SELECT review_state FROM public.question_bank WHERE id = 'BIO-001') <> 'pending_review' THEN
    RAISE EXCEPTION 'Rejected approval attempt changed the question review state';
  END IF;
END
$$;

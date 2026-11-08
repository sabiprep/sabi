export type MasteryRow = {
  subject: string;
  topic: string;
  attempted_count: number;
  correct_count: number;
  mastery_score: number;
  next_review_at: string | null;
  interval_days?: number | null;
  last_result?: string | null;
};

export type ScoreSubjectInput = {
  subject: string;
  attempted: number;
  correct: number;
};

export function buildScorePrediction(subjects: ScoreSubjectInput[]) {
  const breakdown = subjects.map((subject) => {
    const estimatedAccuracy = subject.attempted
      ? (subject.correct + 5) / (subject.attempted + 10)
      : null;
    return {
      subject: subject.subject,
      attempted: subject.attempted,
      correct: subject.correct,
      accuracy: subject.attempted ? Math.round((subject.correct / subject.attempted) * 100) : null,
      projectedScore: estimatedAccuracy === null ? null : Math.round(estimatedAccuracy * 100),
      ready: subject.attempted >= 10,
    };
  });
  const enoughData = breakdown.length === 4 && breakdown.every((item) => item.ready);
  const minSample = Math.min(...breakdown.map((item) => item.attempted));
  const predictedScore = enoughData
    ? Math.max(0, Math.min(400, breakdown.reduce((sum, item) => sum + (item.projectedScore || 0), 0)))
    : null;
  const margin = enoughData ? Math.max(5, Math.min(25, Math.round(40 / Math.sqrt(minSample)))) : null;
  return {
    status: enoughData ? 'ready' as const : 'insufficient_data' as const,
    predictedScore,
    lowerBound: predictedScore === null ? null : Math.max(0, predictedScore - margin!),
    upperBound: predictedScore === null ? null : Math.min(400, predictedScore + margin!),
    confidence: enoughData ? minSample >= 50 ? 'high' as const : minSample >= 25 ? 'medium' as const : 'low' as const : 'insufficient' as const,
    totalAttempts: breakdown.reduce((sum, item) => sum + item.attempted, 0),
    subjects: breakdown,
  };
}

export function buildTopicRecommendations(rows: MasteryRow[], now = Date.now()) {
  const due = rows
    .filter((row) => row.next_review_at && new Date(row.next_review_at).getTime() <= now)
    .sort((a, b) => new Date(a.next_review_at!).getTime() - new Date(b.next_review_at!).getTime());
  const focus = rows
    .filter((row) => row.attempted_count >= 2 && row.mastery_score < 75)
    .sort((a, b) => Number(a.mastery_score) - Number(b.mastery_score))
    .slice(0, 5);
  const selected = new Map<string, { row: MasteryRow; reason: string }>();
  for (const row of due.slice(0, 10)) {
    selected.set(`${row.subject.toLowerCase()}::${row.topic.toLowerCase()}`, { row, reason: 'spaced_review_due' });
  }
  for (const row of focus) {
    const key = `${row.subject.toLowerCase()}::${row.topic.toLowerCase()}`;
    if (!selected.has(key)) selected.set(key, { row, reason: 'low_mastery_focus' });
  }
  return [...selected.values()].slice(0, 10).map(({ row, reason }, index) => ({
    recommendation_type: 'topic_review' as const,
    target_type: 'topic' as const,
    target_id: `${row.subject}::${row.topic}`,
    rank_position: index + 1,
    relevance_score: Number(Math.max(0, Math.min(1, 1 - row.mastery_score / 100)).toFixed(4)),
    rationale: {
      reason,
      mastery_score: row.mastery_score,
      attempted_count: row.attempted_count,
      next_review_at: row.next_review_at,
      interval_days: row.interval_days ?? null,
      last_result: row.last_result ?? null,
    },
  }));
}


export function buildStudyPlan(rows: MasteryRow[], now = Date.now(), days = 7) {
  const due = rows
    .filter((row) => row.next_review_at && new Date(row.next_review_at).getTime() <= now)
    .sort((a, b) => new Date(a.next_review_at!).getTime() - new Date(b.next_review_at!).getTime());
  const weak = rows
    .filter((row) => row.attempted_count >= 2 && row.mastery_score < 75)
    .sort((a, b) => Number(a.mastery_score) - Number(b.mastery_score));
  const ordered = [...new Map([...due, ...weak].map((row) => [
    `${row.subject.toLowerCase()}::${row.topic.toLowerCase()}`, row,
  ])).values()];
  if (!rows.length) {
    return {
      status: 'diagnostic_required' as const,
      summary: 'Complete a diagnostic session before a personalized study plan can be built.',
      days: [],
      evidence_topics: 0,
    };
  }
  const planDays = Array.from({ length: Math.max(1, Math.min(14, days)) }, (_, index) => {
    const first = ordered[index % Math.max(ordered.length, 1)];
    const second = ordered[(index + 1) % Math.max(ordered.length, 1)];
    const actions = first ? [{
      subject: first.subject, topic: first.topic,
      action: due.some((row) => row.subject === first.subject && row.topic === first.topic) ? 'spaced_review' : 'targeted_practice',
      reason: Number(first.mastery_score) < 50 ? 'low_mastery_priority' : 'reinforcement',
    }] : [];
    if (second && second !== first && (index % 2 === 0)) actions.push({
      subject: second.subject, topic: second.topic, action: 'targeted_practice', reason: 'secondary_focus',
    });
    return { day: index + 1, actions };
  });
  return {
    status: 'ready' as const,
    summary: ordered.length
      ? `A ${planDays.length}-day plan prioritizing ${due.length} due reviews and ${weak.length} weak topics.`
      : 'No overdue or low-mastery topics are currently identified. Continue balanced practice.',
    days: planDays,
    evidence_topics: rows.length,
    due_review_topics: due.length,
    weak_topics: weak.length,
  };
}

export function buildLearningAnalytics(attempts: Array<{
  is_correct: boolean | null;
  elapsed_ms?: number | null;
  question_bank?: { subject?: string | null; topic?: string | null } | null;
}>) {
  const bySubject = new Map<string, { attempted: number; correct: number; elapsed: number; timed: number }>();
  const byTopic = new Map<string, { subject: string; topic: string; attempted: number; correct: number }>();
  for (const attempt of attempts) {
    if (typeof attempt.is_correct !== 'boolean') continue;
    const subject = String(attempt.question_bank?.subject || 'Unmapped');
    const topic = String(attempt.question_bank?.topic || 'Unmapped');
    const subjectRow = bySubject.get(subject) || { attempted: 0, correct: 0, elapsed: 0, timed: 0 };
    subjectRow.attempted += 1;
    if (attempt.is_correct) subjectRow.correct += 1;
    if (typeof attempt.elapsed_ms === 'number' && attempt.elapsed_ms >= 0) {
      subjectRow.elapsed += attempt.elapsed_ms;
      subjectRow.timed += 1;
    }
    bySubject.set(subject, subjectRow);
    const key = `${subject}::${topic}`;
    const topicRow = byTopic.get(key) || { subject, topic, attempted: 0, correct: 0 };
    topicRow.attempted += 1;
    if (attempt.is_correct) topicRow.correct += 1;
    byTopic.set(key, topicRow);
  }
  const subjects = [...bySubject.entries()].map(([subject, row]) => ({
    subject, attempted: row.attempted, correct: row.correct,
    accuracy: Math.round((row.correct / row.attempted) * 100),
    average_elapsed_ms: row.timed ? Math.round(row.elapsed / row.timed) : null,
  }));
  const topics = [...byTopic.values()].map((row) => ({
    ...row, accuracy: Math.round((row.correct / row.attempted) * 100),
  })).sort((a, b) => a.accuracy - b.accuracy);
  const total = subjects.reduce((sum, row) => sum + row.attempted, 0);
  const correct = subjects.reduce((sum, row) => sum + row.correct, 0);
  return {
    status: total ? 'ready' as const : 'insufficient_data' as const,
    total_attempts: total,
    correct_attempts: correct,
    accuracy: total ? Math.round((correct / total) * 100) : null,
    subjects,
    weakest_topics: topics.slice(0, 10),
  };
}

type EngineRequest = {
  id: string;
  user_id: string;
  engine_key: string;
  payload: Record<string, any>;
  idempotency_key: string;
  attempt_count: number;
};

/**
 * Execute the registered Phase 2 engines against versioned signal inputs.
 * The existing Phase 2 answer RPC remains the source of truth for mastery
 * and spaced-repetition calculations; this adapter snapshots those outputs.
 */
export async function executeEngineRequest(db: any, item: EngineRequest) {
  const { data: existing, error: existingError } = await db
    .from('engine_runs')
    .select('id, run_status, output_snapshot')
    .eq('engine_key', item.engine_key)
    .eq('idempotency_key', item.idempotency_key)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing?.run_status === 'completed') {
    return { runId: existing.id, alreadyCompleted: true, output: existing.output_snapshot || {} };
  }

  const { data: registry, error: registryError } = await db
    .from('engine_registry')
    .select('engine_key, current_version, lifecycle_status')
    .eq('engine_key', item.engine_key)
    .maybeSingle();
  if (registryError) throw registryError;
  if (!registry || registry.lifecycle_status !== 'active') {
    throw new Error('engine_not_active');
  }

  const contractVersion = Number(item.payload.engine_contract_version || 1);
  const { data: contract, error: contractError } = await db
    .from('engine_contract_versions')
    .select('contract')
    .eq('engine_key', item.engine_key)
    .eq('contract_version', contractVersion)
    .eq('contract_status', 'active')
    .maybeSingle();
  if (contractError) throw contractError;
  if (!contract) throw new Error('engine_contract_unavailable');

  const { data: subscriptions, error: subscriptionsError } = await db
    .from('signal_engine_subscriptions')
    .select('signal_key, input_requirement')
    .eq('engine_key', item.engine_key)
    .eq('engine_contract_version', contractVersion)
    .eq('is_enabled', true);
  if (subscriptionsError) throw subscriptionsError;

  const signalKeys = [...new Set((subscriptions || []).map((row: any) => row.signal_key))];
  const { data: currentSignals, error: signalsError } = signalKeys.length
    ? await db.from('student_signal_current')
        .select('signal_key, schema_version, value, confidence, purpose_key, source_observation_id, observed_at')
        .eq('user_id', item.user_id)
        .in('signal_key', signalKeys)
    : { data: [], error: null };
  if (signalsError) throw signalsError;
  const signalByKey = new Map((currentSignals || []).map((row: any) => [row.signal_key, row]));
  const inputSnapshot: Record<string, any> = {};
  const inputRows = (subscriptions || []).map((subscription: any) => {
    const signal = signalByKey.get(subscription.signal_key) as any;
    inputSnapshot[subscription.signal_key] = signal ? {
      schema_version: signal.schema_version,
      value: signal.value,
      confidence: signal.confidence,
      observed_at: signal.observed_at,
    } : null;
    return {
      signal_key: subscription.signal_key,
      schema_version: signal?.schema_version || 1,
      signal_observation_id: signal?.source_observation_id || null,
      input_requirement: subscription.input_requirement,
      was_present: Boolean(signal),
      value_snapshot: signal ? signal.value : null,
      missing_reason: signal ? null : 'no_current_signal',
    };
  });

  let runId = existing?.id as string | undefined;
  if (!runId) {
    const { data: created, error: createError } = await db
      .from('engine_runs')
      .insert({
        engine_key: item.engine_key,
        engine_version: registry.current_version || `contract-${contractVersion}`,
        user_id: item.user_id,
        idempotency_key: item.idempotency_key,
        run_status: 'running',
        input_snapshot: { contract_version: contractVersion, signals: inputSnapshot },
      })
      .select('id')
      .single();
    if (createError) throw createError;
    runId = created.id;
  } else {
    const { error: resetError } = await db.from('engine_runs')
      .update({ run_status: 'running', error_code: null, input_snapshot: { contract_version: contractVersion, signals: inputSnapshot } })
      .eq('id', runId);
    if (resetError) throw resetError;
    const { error: clearInputsError } = await db.from('engine_run_signal_inputs').delete().eq('engine_run_id', runId);
    if (clearInputsError) throw clearInputsError;
  }

  if (inputRows.length) {
    const { error: inputError } = await db.from('engine_run_signal_inputs').insert(
      inputRows.map((row: any) => ({ ...row, engine_run_id: runId }))
    );
    if (inputError) throw inputError;
  }

  const { data: masteryRows, error: masteryError } = await db
    .from('student_topic_mastery')
    .select('subject, topic, attempted_count, correct_count, mastery_score, next_review_at, interval_days, last_result')
    .eq('user_id', item.user_id)
    .order('mastery_score', { ascending: true });
  if (masteryError) throw masteryError;
  const mastery = (masteryRows || []) as MasteryRow[];
  const now = Date.now();
  let output: Record<string, any>;

  switch (item.engine_key) {
    case 'mastery-engine':
      output = {
        status: 'completed',
        topic_count: mastery.length,
        weakest_topics: mastery.slice(0, 10),
        execution_source: 'phase2_atomic_answer_rpc',
      };
      break;
    case 'spaced-repetition-engine': {
      const due = mastery.filter((row) => row.next_review_at && new Date(row.next_review_at).getTime() <= now);
      output = {
        status: 'completed',
        due_review_count: due.length,
        due_reviews: due.slice(0, 20),
        execution_source: 'phase2_atomic_answer_rpc',
      };
      break;
    }
    case 'adaptive-practice-engine':
      output = {
        status: 'completed',
        selection_mode: 'smart_practice',
        topic_priorities: mastery.slice(0, 10).map((row) => ({
          subject: row.subject, topic: row.topic, mastery_score: row.mastery_score,
          next_review_at: row.next_review_at, last_result: row.last_result,
        })),
        execution_source: 'phase2_smart_practice_selector',
      };
      break;
    case 'recommendation-engine': {
      const recommendations = buildTopicRecommendations(mastery, now);
      if (recommendations.length) {
        const { data: existingRecommendations, error: existingRecommendationsError } = await db
          .from('recommendations').select('id').eq('engine_run_id', runId).limit(1);
        if (existingRecommendationsError) throw existingRecommendationsError;
        if (!existingRecommendations?.length) {
          const { error: recommendationError } = await db.from('recommendations').insert(
            recommendations.map((row) => ({ ...row, user_id: item.user_id, engine_run_id: runId }))
          );
          if (recommendationError) throw recommendationError;
        }
      }
      output = { status: 'completed', recommendation_count: recommendations.length, recommendations };
      break;
    }
    case 'score-prediction-engine': {
      const [profileResult, catalogueResult, attemptsResult] = await Promise.all([
        db.from('profiles').select('registered_subjects').eq('id', item.user_id).maybeSingle(),
        db.from('jamb_subjects').select('slug, display_name, aliases').eq('is_active', true),
        db.from('learning_session_items').select('is_correct, question_bank(subject)')
          .eq('user_id', item.user_id).not('answered_at', 'is', null)
          .order('answered_at', { ascending: false }).limit(5000),
      ]);
      if (profileResult.error || catalogueResult.error || attemptsResult.error) {
        throw profileResult.error || catalogueResult.error || attemptsResult.error;
      }
      const registered = profileResult.data?.registered_subjects || [];
      const catalogue = catalogueResult.data || [];
      const subjects = registered.map((raw: string) => {
        const normalized = String(raw).trim().toLowerCase();
        const match = catalogue.find((entry: any) =>
          String(entry.display_name).toLowerCase() === normalized ||
          (entry.aliases || []).some((alias: string) => String(alias).toLowerCase() === normalized)
        );
        return match ? {
          slug: match.slug, name: match.display_name,
          bankName: match.slug === 'use-of-english' ? 'Use of English' : match.display_name,
        } : null;
      });
      if (subjects.length !== 4 || subjects.some((subject: any) => !subject) ||
          new Set(subjects.map((subject: any) => subject.slug)).size !== 4) {
        output = { status: 'insufficient_data', reason: 'valid_four_subject_combination_required' };
        break;
      }
      const attempts = attemptsResult.data || [];
      const prediction = buildScorePrediction(subjects.map((subject: any) => {
        const relevant = attempts.filter((attempt: any) =>
          String(attempt.question_bank?.subject || '').toLowerCase() === subject.bankName.toLowerCase()
        );
        return {
          subject: subject.name,
          attempted: relevant.length,
          correct: relevant.filter((attempt: any) => attempt.is_correct).length,
        };
      }));
      if (prediction.status === 'ready' && prediction.predictedScore !== null) {
        const { data: existingSnapshot, error: existingSnapshotError } = await db
          .from('score_prediction_snapshots')
          .select('id')
          .eq('user_id', item.user_id)
          .eq('prediction_factors->>engine_run_id', runId)
          .maybeSingle();
        if (existingSnapshotError) throw existingSnapshotError;
        if (!existingSnapshot) {
          const { error: snapshotError } = await db.from('score_prediction_snapshots').insert({
            user_id: item.user_id,
            predicted_score: prediction.predictedScore,
            lower_bound: prediction.lowerBound,
            upper_bound: prediction.upperBound,
            confidence_level: prediction.confidence,
            model_version: 'phase2-smoothed-subject-accuracy-v1',
            answered_question_count: prediction.totalAttempts,
            subject_breakdown: Object.fromEntries(prediction.subjects.map((row) => [row.subject, row])),
            prediction_factors: { engine_run_id: runId, prior_correct: 5, prior_attempts: 10, minimum_attempts_per_subject: 10 },
          });
          if (snapshotError) throw snapshotError;
        }

        const { error: signalError } = await db.from('student_signal_observations').upsert({
          user_id: item.user_id,
          signal_key: 'exam.predicted_score',
          schema_version: 1,
          source_key: 'engine-derived',
          value: prediction.predictedScore,
          confidence: prediction.confidence === 'high' ? 0.9 : prediction.confidence === 'medium' ? 0.7 : 0.5,
          purpose_key: 'personalized_learning',
          provenance: { engine_run_id: runId, model_version: 'phase2-smoothed-subject-accuracy-v1' },
          observed_at: new Date().toISOString(),
          idempotency_key: `engine-run:${runId}:predicted-score`,
        }, { onConflict: 'user_id,idempotency_key', ignoreDuplicates: true });
        if (signalError) throw signalError;
      }
      output = { ...prediction, status: prediction.status };
      break;
    }
    case 'diagnostic-engine':
      output = {
        status: 'completed',
        baseline_topic_count: mastery.length,
        weakest_topics: mastery.slice(0, 10),
        message: mastery.length ? 'Baseline gaps derived from verified topic mastery.' : 'A diagnostic session is needed to establish a baseline.',
      };
      break;
    case 'study-plan-engine':
      output = buildStudyPlan(mastery, now, Number(item.payload.plan_days || 7));
      break;
    case 'learning-analytics-engine': {
      const { data: attempts, error: attemptsError } = await db
        .from('learning_session_items')
        .select('is_correct, elapsed_ms, question_bank(subject, topic)')
        .eq('user_id', item.user_id)
        .not('answered_at', 'is', null)
        .order('answered_at', { ascending: false })
        .limit(5000);
      if (attemptsError) throw attemptsError;
      output = buildLearningAnalytics(attempts || []);
      break;
    }
    case 'ai-tutor-engine':
      output = {
        status: 'context_ready',
        context_source: 'versioned_signal_registry',
        signals: inputSnapshot,
        next_step: 'Use the server-side AI gateway for an explicit student tutoring request.',
      };
      break;
    default:
      throw new Error('engine_adapter_not_implemented');
  }

  const { error: finishError } = await db.from('engine_runs').update({
    run_status: 'completed',
    output_snapshot: output,
    decision_summary: `${item.engine_key} completed`,
    completed_at: new Date().toISOString(),
    error_code: null,
  }).eq('id', runId);
  if (finishError) throw finishError;
  return { runId, alreadyCompleted: false, output };
}

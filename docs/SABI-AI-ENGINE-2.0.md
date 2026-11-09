# SABI AI Engine 2.0 — Cost-First, Provider-Agnostic Architecture

**Status:** Architecture and implementation contract  
**Scope:** Server-side AI orchestration for SABI's learner tutoring, explanations, study planning and content workflows.

## 1. Non-negotiable principles

1. Route each task to the lowest *measured successful-task cost* provider that satisfies its quality, latency, privacy and availability constraints.
2. No provider is a platform dependency. SABI's prompts, educational rules, retrieval, validation, policy and learner experience remain provider-independent.
3. Free/community inference is an eligible capacity tier, never a guaranteed production capacity commitment.
4. A provider is eligible only when enabled, configured, permitted for the data classification, within budget/quota, and capable of the requested task.
5. Escalate only on explicit quality/validation failure, timeout, rate limit or provider outage. Do not silently downgrade educational correctness.
6. All spend, tokens, outcomes, retries, cache hits and routing decisions are auditable without logging secrets or unnecessary student content.

## 2. Logical architecture

```text
Learner/Admin API
      |
Authentication + consent + role + rate limit
      |
SABI AI Task Gateway
      |
Task policy + privacy classification + prompt version
      |
Context builder (approved RAG, mastery, session context)
      |
Cost/quality/latency/availability router
      |
Provider registry + universal adapters
  |       |       |       |        |
Gemini  OpenAI  Anthropic OpenRouter Custom OpenAI-compatible
  |       |       |       |        |
Normalized response + usage + provider metadata
      |
Task-specific validators / deterministic tools
      |
Safe response / escalation / graceful fallback
      |
Usage ledger + cost ledger + metrics + admin simulator
```

The student application calls SABI endpoints only. It never receives provider credentials or calls a model vendor directly.

## 3. Provider registry contract

Each provider profile should define:
- Stable internal ID and adapter type: native Gemini, native OpenAI, native Anthropic, or OpenAI-compatible.
- Server-side secret reference (environment-variable name or managed secret reference), never the secret value in database/client payloads.
- Base URL, model ID, supported tasks, enabled state and permitted data classifications.
- Input/output price per million tokens, currency, price effective date and optional cached-input/batch prices.
- Per-provider timeout, concurrency/rate limits, maximum output and retry policy.
- Quality/latency observations and circuit-breaker state.

OpenAI-compatible endpoints make OpenRouter, Groq, Cerebras, DeepSeek-compatible gateways, LiteLLM, vLLM and Ollama-style gateways pluggable where their endpoint and model support the required chat-completions contract. Native adapters remain available where API semantics differ.

## 4. Routing policy

Eligibility is evaluated before ranking:
1. Task support and model capability.
2. Consent and data-handling policy.
3. Provider/model enabled and credentials healthy.
4. Student, school, global and provider budget remaining.
5. Rate/concurrency availability and circuit breaker.
6. Required output format/tool support.

Among eligible candidates, estimate request cost from prompt tokens and output-token budget, then rank by estimated cost adjusted by measured successful-task rate, latency and quality. A free endpoint with frequent failures can therefore lose to a low-cost paid endpoint.

Suggested policy:
- Definitions, summaries and routine tutor turns: lowest-cost validated model.
- MCQ/content generation: economical generator plus deterministic schema, answer-key and duplicate checks.
- Mathematics: low-cost model plus deterministic calculator/symbolic verification where available.
- Difficult Physics or ambiguous explanations: escalate to a stronger reasoning model, then flag unresolved ambiguity for human review.
- Essay assessment: rubric-constrained model, calibration checks and human appeal path.
- Student mastery, scores, CBT timing, credits and payment state: deterministic database/application logic only; AI may explain but never authoritatively mutate these values.

## 5. Cost accounting

For each successful or failed attempt, store:
- provider ID, model ID, task, prompt version, request ID, attempt number;
- input/output/cached tokens when supplied by provider;
- provider-reported cost when available and SABI-estimated cost otherwise;
- price snapshot/version used for estimate, currency, duration, outcome and fallback reason;
- cache status and validation result.

`estimated_cost = (input_tokens × input_price + output_tokens × output_price) / 1,000,000`

The estimate must include every attempt, not just the final response. Track both cost/request and cost/successful validated task. Do not represent unknown token usage or unknown price as zero.

## 6. Budget and control hierarchy

Apply hard ceilings in this order:
- global monthly AI budget;
- provider daily/monthly spend and request limits;
- school/tenant allowance;
- per-student allowance and abuse controls;
- task-level spend ceiling and maximum output tokens.

When a hard limit is reached, stop paid routing and return a clear unavailable/queued response or a deterministic non-AI alternative. Never bypass budget controls through fallback. Budget changes, provider activation, model changes and price edits require admin authorization and audit logging.

## 7. Privacy and security

- Classify payloads: public educational content, pseudonymous learner context, sensitive account/consent data.
- Send the minimum context required. Remove names, email, phone, SABI ID and other direct identifiers before external inference unless a separately approved lawful basis and provider agreement explicitly permit it.
- Provider profiles declare data-retention/training terms and allowed classifications. Unknown terms mean no learner data.
- Secrets stay server-side; never return them from readiness/admin endpoints.
- Treat retrieved documents, questions and model output as untrusted data. Validate output against task schemas and safety rules.
- Keep AI disabled until a provider has been configured, tested and explicitly enabled.

## 8. Caching and batch work

- Cache only reusable, non-personal outputs or outputs whose key includes all relevant authorization and context dimensions.
- Use semantic cache retrieval only after similarity, freshness, syllabus-version and correctness checks. Never reuse one learner's private context for another learner.
- Batch only non-urgent jobs such as approved content drafting/evaluation; do not batch live tutoring or time-sensitive exam workflows.
- Record cache hit/miss and cache invalidation reason. Cache does not replace answer-key or content validation.

## 9. Admin Cost Simulator and operations

The admin console should provide:
- Provider/model registry, capabilities, status, price snapshots and allowed data classes.
- Task routing policies, budget caps, fallback chains and circuit-breaker state.
- Forecasts for 1k, 10k and monthly projected requests by task mix.
- Low/base/high scenarios, free-tier capacity assumptions, retry rate and fallback share.
- Actual spend, cost per 1k requests, cost per successful validated task, provider error rate and latency percentiles.
- Dry-run routing simulation before activation; all changes audited.

Forecasts must be labelled estimates and must not assume free-tier capacity is guaranteed.

## 10. Delivery phases and acceptance gates

### Phase A — Provider foundation
- Provider registry and normalized adapter contract.
- Native adapters retained; OpenAI-compatible custom endpoint support.
- Secret references and readiness diagnostics.
- Contract tests with mocked providers.

### Phase B — Cost-aware routing
- Price snapshots and per-task routing policies.
- Estimated cost before dispatch and actual cost after response.
- Retry/fallback accounting and provider circuit breakers.
- Cost ceiling enforcement.

### Phase C — Quality and privacy
- Task-specific validators and escalation rules.
- Pseudonymization and provider data-policy enforcement.
- Cross-student cache isolation tests.
- Red-team tests for prompt injection in retrieved material.

### Phase D — Admin operations
- Provider registry and routing controls.
- Cost simulator and actual spend dashboard.
- Budget alerts, audit logs and rollback.

### Production acceptance
- No credentials in browser bundles or API responses.
- A custom OpenAI-compatible provider can be added without changing learner UI or educational logic.
- A provider outage falls back only to an eligible provider within the same privacy and budget policy.
- Cost estimates include retries and clearly mark unknowns.
- Hard budget limits cannot be bypassed by fallback or concurrent requests.
- Every generated educational artifact passes task validation or is withheld/escalated.
- AI-off mode and provider outage leave core CBT, scoring and deterministic learning flows operational.
- Authenticated integration, privacy isolation, load, failure and restore tests pass before general release.

## 11. Initial operating defaults

- Keep `SABI_AI_ENABLED=false` until secrets, pricing and provider data policies are configured and verified.
- Do not activate credit charging or alter existing student credit policy as part of provider integration.
- Do not make free-tier providers mandatory or promise their availability.
- Start with conservative output-token caps and per-task budgets.
- Use a paid economical provider as a capacity fallback only after explicit budget approval.
- Keep model/provider configuration separate from task prompts, educational policy and student-facing interfaces.

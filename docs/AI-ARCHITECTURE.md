# Sabi AI architecture and operating policy

## Product invariant

AI is an optional teaching layer. The platform's core learning system must remain fully useful when AI is disabled, unconfigured, rate-limited, or unavailable.

The verified question-bank answer key and deterministic scoring engine are authoritative. An AI response is never accepted as an answer key, score, mastery update, or exam result.

## Where AI is used

- On-demand explanations after a learner has submitted an answer in practice.
- Sabi AI Coach conversations through the same provider gateway.
- Optional study-plan narration and concept teaching.
- Internal question drafting; generated drafts are persisted as unpublished records and require an authorized human content reviewer before publication.

## Where AI is not used

- Registration, authentication, onboarding, subject selection, and JAMB configuration.
- Question retrieval, question selection, answer comparison, scoring, CBT timing, and exam submission.
- Mastery calculations, spaced repetition, syllabus coverage, recommendations, readiness calculations, and score prediction.
- Entitlements, payment confirmation, notifications, and analytics aggregation.

These systems use deterministic application logic and trusted database state.

## Explanation policy

1. A learner submits an answer.
2. The server verifies it against the published question's stored answer key.
3. The database records the answer and computes correctness and mastery.
4. The learner may tap **Explain this answer**.
5. The explanation endpoint verifies ownership of the session and that the question was answered.
6. A timed CBT cannot request an explanation while its session is in progress. A completed CBT can request explanations in post-exam review.
7. The prompt receives the verified answer key and learner-selected option. The model is explicitly prohibited from changing the answer key or scoring.
8. If no provider is configured or all providers fail, the endpoint returns the approved database explanation (if present) and an explicit AI-unavailable state. It never fabricates a mock AI answer.

## Provider gateway

All new model calls must go through `server/ai/gateway.ts`. The gateway supports Gemini, OpenAI Chat Completions, and Anthropic Messages through a provider-neutral interface.

- Provider order is configurable with `SABI_AI_PROVIDER_ORDER`.
- Task-specific routing can be set with `SABI_AI_EXPLANATION_PROVIDER_ORDER`, etc.
- Provider credentials and model IDs remain server-side.
- AI is disabled unless `SABI_AI_ENABLED=true`.
- A provider is considered configured only when both its API key and model ID are present.
- Each provider call has a timeout. A failed provider is skipped and the next configured provider is tried.
- Provider errors and credentials are never returned to the client.
- No mock response is treated as real AI output.

## Configuration to fill later

| Variable | Purpose |
| --- | --- |
| `SABI_AI_ENABLED` | Explicitly enable AI after provider setup |
| `SABI_AI_PROVIDER_ORDER` | Primary/fallback provider order |
| `GEMINI_API_KEY` | Gemini credential |
| `SABI_GEMINI_MODEL` | Gemini model ID |
| `OPENAI_API_KEY` | OpenAI credential |
| `SABI_OPENAI_MODEL` | OpenAI model ID |
| `ANTHROPIC_API_KEY` | Anthropic credential |
| `SABI_ANTHROPIC_MODEL` | Anthropic model ID |

Task-specific model variables can override the general model ID, e.g. `SABI_GEMINI_EXPLANATION_MODEL`.

## Completion requirements

The provider gateway, session-bound explanation endpoint, AI Coach endpoint, and question-drafting integration are implemented in this change. The practice UI and post-exam review UI now expose on-demand explanations. Before production activation, the remaining integration work includes:
- add durable AI usage/credit accounting, consent enforcement, prompt versioning, and admin configuration visibility;
- add end-to-end tests for active CBT denial, completed CBT review, ownership isolation, missing provider, provider fallback, and verified answer-key preservation.

The CBT timer now stores a server-issued deadline in the session metadata and the answer endpoint enforces it; the client countdown is display-only. Expired CBTs are finalized on the next server request.\n\nDo not enable AI in production until the provider configuration, usage controls, consent experience, and end-to-end checks are complete.

# Official JAMB syllabus ingestion — v1

## Source of truth

Use the JAMB Integrated Brochure and Syllabus System (IBASS), specifically its **E-syllabus** area:

- Portal: https://ibass.jamb.gov.ng/
- Official JAMB website entry point: https://www.jamb.gov.ng/
- The syllabus is separate from the IBASS brochure. The syllabus defines subject topics, content/notes, general objectives, topic objectives and recommended texts. The brochure defines course/institution eligibility and subject combinations.

The official IBASS PDFs currently located for the four subjects represented in the Sabi question bank are:

| Sabi subject slug | IBASS source PDF |
|---|---|
| use-of-english | https://ibass.jamb.gov.ng/assets/uploads/Use-of-English.pdf |
| chemistry | https://ibass.jamb.gov.ng/assets/uploads/Chemistry.pdf |
| biology | https://ibass.jamb.gov.ng/assets/uploads/Biology.pdf |
| christian-religious-studies | https://ibass.jamb.gov.ng/assets/uploads/Christian-Religious-Studies.pdf |

These are official source URLs, not proof of a particular examination-year edition. The source's live publication/version label and the exact PDF bytes must be captured at import time. Never infer that an older PDF is the 2027 syllabus. Recheck IBASS before each examination cycle.

## Data model

- `jamb_syllabus_versions`: subject-specific, versioned source release and provenance.
- `jamb_syllabus_general_objectives`: subject-wide learning objectives.
- `jamb_topics`: section, topic, ordering and verbatim JAMB content/notes.
- `jamb_syllabus_content_items`: structured topic content, notes, examples and recommended texts.
- `jamb_subtopics`: optional finer Sabi taxonomy; only create when the source supports it.
- `jamb_syllabus_objectives`: exact objective statements attached to topics.
- `jamb_syllabus_import_batches` and `jamb_syllabus_import_rows`: auditable staging area; preserve source page, exact text and parser payload.
- `question_objective_mappings`: question/objective links with method, confidence, evidence and human review decision.

## Import rules

1. Download the PDF bytes from the official IBASS URL in a trusted server-side or controlled admin process. Calculate SHA-256 from the exact bytes. Save retrieval time, source URL, source label and parser version.
2. Extract text while retaining page numbers and reading order. Tables in these PDFs may have topic/content on the left and objectives on the right; verify that row alignment survives extraction. Use page images/OCR when the text layer is incomplete.
3. Preserve the official wording verbatim. Do not rewrite, summarize, normalize spelling, or let an LLM invent missing rows. Sabi explanations belong in separate learning-content fields.
4. Stage all extracted rows before publication. Required record types: general objective, section, topic, content item, objective and recommended text. Keep raw source text and parsed JSON.
5. Validate subject, parent references, ordering, required fields, duplicate keys, source pages and objective/topic alignment. Report uncertain or malformed rows for human review.
6. A parser's successful run is not verification. A human reviewer must compare the staged output against the official PDF, especially topic/objective columns and mathematical notation.
7. Publish an immutable syllabus version. Never overwrite an existing version. A changed PDF becomes a new version with a new SHA-256.
8. Mark a version/topic/objective verified only after source provenance and human review. Legacy question-bank labels remain draft and are never promoted by matching names alone.
9. Map questions to objectives with a confidence score and evidence. Rule-based/semantic/AI suggestions remain pending. Only human-approved mappings may feed objective mastery, coverage analytics, recommendation ranking or adaptive selection.
10. If a syllabus is revised, retain historical versions and their mappings. Select the applicable version by exam cycle; do not mutate a learner's historical evidence.

## Publication gates

- A verified syllabus version must have an official source URL, exact source SHA-256 and retrieval timestamp.
- A topic must belong to a version and be verified before it is student-facing.
- An objective must be verified before it can contribute to objective-level mastery.
- An approved question/objective mapping must be supported by review evidence.
- Missing or ambiguous content stays in the staging/review queue. No fallback to guessed syllabus content.

## Existing production state at implementation

At the time this foundation was added, production contained 25 subject catalogue entries, 809 legacy topic labels and 3,006 legacy subtopic labels; it contained zero syllabus versions and zero syllabus objectives. The 809/3,006 records were not verified JAMB syllabus data. The four subjects above account for the 3,740-question bank coverage; this is the recommended pilot, not a limit on future syllabus coverage.

## Supabase access and security

The new staging, source-detail and question/objective mapping tables are RLS-enabled and service-role-only. Do not grant direct `anon` or `authenticated` table access. Use trusted server routes with the service-role client and role-check the admin/reviewer before accepting imports or review decisions. Keep the service-role key out of the browser and Android bundle.

Supabase no longer automatically exposes newly created public-schema tables through the Data API by default (enforced on existing projects from 2026-10-30). These tables are intentionally privileged backend tables and do not need client exposure.

## Verification

Run `supabase/tests/official_jamb_syllabus_ingestion_assertions.sql` after applying the migration. Also run the repository backend CI migration chain and assertion suites. Do not enable Android compilation as part of this work.

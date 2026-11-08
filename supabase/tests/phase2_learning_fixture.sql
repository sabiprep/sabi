-- Minimal question-bank row used by Phase 1.4 taxonomy backfill and Phase 1.5 provenance tests.
-- The canonical historical migrations create the full production table and taxonomy tables.
INSERT INTO public.question_bank (id, subject, topic, subtopic, question, option_a, option_b, option_c, option_d, answer, source, status)
VALUES ('phase15-provenance-fixture','Biology','Provenance fixture','Cell structure','Which cell structure contains DNA?','Nucleus','Ribosome','Cell wall','Vacuole','A','CI fixture source','ai-draft')
ON CONFLICT (id) DO NOTHING;

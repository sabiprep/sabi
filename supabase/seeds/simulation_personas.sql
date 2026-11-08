-- Isolated synthetic learner personas for engine simulation and QA.
-- These are archetypes, not auth users; they never enter public student metrics.
create schema if not exists sabi_simulation;
revoke all on schema sabi_simulation from public, anon, authenticated;
grant usage on schema sabi_simulation to service_role;

create table if not exists sabi_simulation.personas (
  persona_key text primary key,
  persona_label text not null,
  profile_summary text not null,
  exam_year integer not null default 2026,
  target_score integer not null check (target_score between 0 and 400),
  baseline_score integer not null check (baseline_score between 0 and 400),
  learning_consistency numeric(4,3) not null check (learning_consistency between 0 and 1),
  response_speed numeric(4,3) not null check (response_speed between 0 and 1),
  answer_revision_rate numeric(4,3) not null check (answer_revision_rate between 0 and 1),
  hint_usage_rate numeric(4,3) not null check (hint_usage_rate between 0 and 1),
  preferred_session_minutes smallint not null check (preferred_session_minutes between 5 and 180),
  subject_mix jsonb not null check (jsonb_typeof(subject_mix) = 'array'),
  subject_strengths jsonb not null check (jsonb_typeof(subject_strengths) = 'object'),
  subject_weaknesses jsonb not null check (jsonb_typeof(subject_weaknesses) = 'object'),
  behaviour_profile jsonb not null default '{}'::jsonb check (jsonb_typeof(behaviour_profile) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table sabi_simulation.personas enable row level security;
revoke all on sabi_simulation.personas from public, anon, authenticated;
grant all on sabi_simulation.personas to service_role;

insert into sabi_simulation.personas
(persona_key,persona_label,profile_summary,target_score,baseline_score,learning_consistency,response_speed,answer_revision_rate,hint_usage_rate,preferred_session_minutes,subject_mix,subject_strengths,subject_weaknesses,behaviour_profile)
values
('steady-builder','The Steady Builder','Consistent learner with gradual improvement and balanced habits',320,245,0.920,0.650,0.080,0.300,35,'["use-of-english","mathematics","physics","chemistry"]','{"use-of-english":0.62,"mathematics":0.58,"physics":0.55,"chemistry":0.60}','{"mathematics":0.42,"physics":0.40}','{"study_days_per_week":6,"guessing_tendency":"low","idle_tendency":"low"}'),
('bright-but-inconsistent','Bright but Inconsistent','High ability with irregular study and variable performance',340,275,0.380,0.820,0.180,0.120,18,'["use-of-english","biology","chemistry","physics"]','{"biology":0.82,"chemistry":0.78,"physics":0.74}','{"use-of-english":0.48}','{"study_days_per_week":2,"guessing_tendency":"medium","idle_tendency":"medium"}'),
('slow-careful-reader','The Careful Reader','Accurate but slow; benefits from timing practice',300,230,0.780,0.280,0.040,0.480,45,'["use-of-english","literature-in-english","government","christian-religious-studies"]','{"literature-in-english":0.78,"government":0.70,"christian-religious-studies":0.74}','{"use-of-english":0.46}','{"study_days_per_week":5,"guessing_tendency":"low","idle_tendency":"low"}'),
('fast-guesser','The Fast Guesser','Answers quickly with high error rate and low review discipline',280,205,0.520,0.960,0.340,0.050,12,'["use-of-english","mathematics","economics","government"]','{"government":0.60,"economics":0.55}','{"mathematics":0.35,"use-of-english":0.42}','{"study_days_per_week":3,"guessing_tendency":"high","idle_tendency":"low"}'),
('anxious-reviser','The Anxious Reviser','Frequently changes answers, especially under timed pressure',310,235,0.700,0.510,0.680,0.620,25,'["use-of-english","biology","chemistry","mathematics"]','{"biology":0.70,"chemistry":0.63}','{"mathematics":0.40,"use-of-english":0.47}','{"study_days_per_week":5,"guessing_tendency":"medium","idle_tendency":"medium"}'),
('visual-pattern-learner','Visual Pattern Learner','Learns well from diagrams, worked examples and repeated patterns',325,250,0.840,0.620,0.120,0.550,30,'["use-of-english","mathematics","physics","chemistry"]','{"mathematics":0.74,"physics":0.72}','{"use-of-english":0.50}','{"study_days_per_week":5,"guessing_tendency":"low","idle_tendency":"low"}'),
('language-strong','Language Specialist','Strong verbal skills; quantitative subjects need deliberate support',315,260,0.760,0.700,0.100,0.420,28,'["use-of-english","literature-in-english","government","economics"]','{"use-of-english":0.86,"literature-in-english":0.82}','{"economics":0.44}','{"study_days_per_week":5,"guessing_tendency":"low","idle_tendency":"low"}'),
('quant-strong','Quantitative Thinker','Strong mathematics and physics with weaker reading comprehension',330,270,0.810,0.730,0.150,0.180,32,'["use-of-english","mathematics","physics","chemistry"]','{"mathematics":0.88,"physics":0.82,"chemistry":0.76}','{"use-of-english":0.45}','{"study_days_per_week":6,"guessing_tendency":"low","idle_tendency":"low"}'),
('last-minute-crammer','Last-minute Crammer','Intense bursts near exams with weak long-term retention',290,220,0.260,0.770,0.220,0.100,55,'["use-of-english","biology","chemistry","agricultural-science"]','{"biology":0.66,"agricultural-science":0.62}','{"chemistry":0.39}','{"study_days_per_week":1,"guessing_tendency":"high","idle_tendency":"high"}'),
('persistent-struggler','Persistent Beginner','Low baseline but high willingness to practise and use hints',270,145,0.900,0.360,0.060,0.880,40,'["use-of-english","mathematics","biology","chemistry"]','{"biology":0.48}','{"mathematics":0.22,"chemistry":0.28,"use-of-english":0.34}','{"study_days_per_week":6,"guessing_tendency":"low","idle_tendency":"low"}'),
('high-achiever','High Achiever','Strong baseline, fast learning and targeted revision needs',380,340,0.940,0.860,0.120,0.080,40,'["use-of-english","mathematics","physics","chemistry"]','{"use-of-english":0.88,"mathematics":0.91,"physics":0.89,"chemistry":0.86}','{"chemistry":0.72}','{"study_days_per_week":7,"guessing_tendency":"low","idle_tendency":"low"}'),
('commerce-learner','Commerce-Focused Learner','Strong commercial subjects with moderate quantitative confidence',305,235,0.720,0.590,0.180,0.420,25,'["use-of-english","commerce","economics","financial-accounting"]','{"commerce":0.78,"economics":0.72,"financial-accounting":0.68}','{"use-of-english":0.48,"mathematics":0.42}','{"study_days_per_week":4,"guessing_tendency":"medium","idle_tendency":"medium"}'),
('arts-learner','Arts and Humanities Learner','Strong humanities recall; needs exam-speed and comprehension work',315,250,0.800,0.680,0.140,0.350,30,'["use-of-english","literature-in-english","history","government"]','{"history":0.82,"literature-in-english":0.78,"government":0.74}','{"use-of-english":0.49}','{"study_days_per_week":5,"guessing_tendency":"low","idle_tendency":"low"}'),
('science-memoriser','Science Memoriser','Good factual recall but weak conceptual transfer',300,240,0.680,0.720,0.250,0.220,22,'["use-of-english","biology","chemistry","physics"]','{"biology":0.76,"chemistry":0.67}','{"physics":0.40}','{"study_days_per_week":4,"guessing_tendency":"medium","idle_tendency":"low"}'),
('topic-avoider','Topic Avoider','Skips difficult topics and repeats comfortable question types',285,215,0.610,0.690,0.100,0.150,20,'["use-of-english","mathematics","economics","government"]','{"government":0.72,"economics":0.64}','{"mathematics":0.31}','{"study_days_per_week":4,"guessing_tendency":"medium","skip_rate":"high"}'),
('exam-anxious','Exam Anxious','Performance drops under countdown and timed CBT conditions',300,250,0.750,0.480,0.520,0.700,20,'["use-of-english","biology","chemistry","mathematics"]','{"biology":0.72,"chemistry":0.68}','{"mathematics":0.46}','{"study_days_per_week":5,"guessing_tendency":"medium","timer_sensitivity":"high"}'),
('weekend-learner','Weekend Learner','Limited weekly availability with longer weekend sessions',295,225,0.460,0.600,0.120,0.450,75,'["use-of-english","mathematics","physics","chemistry"]','{"physics":0.62,"mathematics":0.58}','{"chemistry":0.40}','{"study_days_per_week":2,"guessing_tendency":"low","idle_tendency":"medium"}'),
('mobile-microlearner','Mobile Microlearner','Learns in short sessions with frequent interruptions',285,205,0.700,0.540,0.160,0.600,8,'["use-of-english","biology","agricultural-science","chemistry"]','{"biology":0.62,"agricultural-science":0.58}','{"chemistry":0.38}','{"study_days_per_week":6,"guessing_tendency":"medium","interruption_rate":"high"}'),
('repeat-candidate','Repeat UTME Candidate','Prior exam experience; focused on score improvement and weak topics',350,285,0.860,0.740,0.180,0.250,35,'["use-of-english","mathematics","physics","chemistry"]','{"mathematics":0.78,"physics":0.74,"chemistry":0.71}','{"use-of-english":0.55}','{"study_days_per_week":6,"guessing_tendency":"low","previous_attempts":2}'),
('rural-low-bandwidth','Low-bandwidth Learner','Irregular connectivity; needs resumable offline-friendly sessions',280,190,0.640,0.450,0.080,0.720,18,'["use-of-english","biology","chemistry","agricultural-science"]','{"agricultural-science":0.66,"biology":0.60}','{"chemistry":0.35,"use-of-english":0.39}','{"study_days_per_week":4,"guessing_tendency":"low","connectivity":"intermittent"}'),
('crs-specialist','Religious Studies Specialist','Strong CRS recall and interpretation; weaker science fundamentals',300,245,0.770,0.650,0.140,0.400,25,'["use-of-english","christian-religious-studies","government","literature-in-english"]','{"christian-religious-studies":0.86,"government":0.70}','{"use-of-english":0.47}','{"study_days_per_week":5,"guessing_tendency":"low","idle_tendency":"low"}'),
('language-multilingual','Multilingual Learner','Strong local-language and humanities aptitude; English vocabulary needs work',290,215,0.730,0.500,0.120,0.660,25,'["use-of-english","hausa","history","government"]','{"hausa":0.84,"history":0.70}','{"use-of-english":0.42}','{"study_days_per_week":5,"guessing_tendency":"low","language_support":"high"}'),
('slow-starter','Late Starter','Short preparation window; needs diagnostic prioritisation and realistic plans',275,175,0.580,0.430,0.220,0.750,30,'["use-of-english","mathematics","biology","economics"]','{"biology":0.58,"economics":0.54}','{"mathematics":0.30,"use-of-english":0.36}','{"study_days_per_week":4,"guessing_tendency":"medium","preparation_window":"short"}'),
('balanced-midrange','Balanced Midrange','Moderate skills across subjects with predictable steady progress',310,245,0.820,0.620,0.140,0.380,30,'["use-of-english","mathematics","biology","chemistry"]','{"biology":0.65,"chemistry":0.62,"mathematics":0.58}','{"use-of-english":0.48}','{"study_days_per_week":5,"guessing_tendency":"low","idle_tendency":"low"}'),
('overconfident-learner','Overconfident Learner','High self-rating but poor calibration; benefits from diagnostics and explanations',320,230,0.650,0.880,0.420,0.080,16,'["use-of-english","mathematics","physics","economics"]','{"economics":0.68,"mathematics":0.58}','{"physics":0.36,"use-of-english":0.44}','{"study_days_per_week":4,"guessing_tendency":"high","confidence_calibration":"poor"}')
on conflict (persona_key) do update set
  persona_label = excluded.persona_label,
  profile_summary = excluded.profile_summary,
  target_score = excluded.target_score,
  baseline_score = excluded.baseline_score,
  learning_consistency = excluded.learning_consistency,
  response_speed = excluded.response_speed,
  answer_revision_rate = excluded.answer_revision_rate,
  hint_usage_rate = excluded.hint_usage_rate,
  preferred_session_minutes = excluded.preferred_session_minutes,
  subject_mix = excluded.subject_mix,
  subject_strengths = excluded.subject_strengths,
  subject_weaknesses = excluded.subject_weaknesses,
  behaviour_profile = excluded.behaviour_profile,
  updated_at = now();

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Layers,
  Play,
  Sliders,
  Sparkles,
  Target,
} from 'lucide-react';
import { useTheme } from '../app/ThemeProvider';
import LevelSimulatorWorkspace from '../components/LevelSimulatorWorkspace';
import { SEED_QUESTIONS } from '../data/questions';
import type { Question, SubjectName } from '../types';
import { sound } from '../utils/soundEffects';

const AVAILABLE_SUBJECTS: SubjectName[] = [
  'English Language',
  'Mathematics',
  'Physics',
  'Chemistry',
];

export function CustomJambSimulatorPage() {
  const { isDark } = useTheme();
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL_4');
  const [selectedTopic, setSelectedTopic] = useState<string>('ALL_TOPICS');
  const [difficultyFilter, setDifficultyFilter] = useState<
    'all' | 'easy' | 'medium' | 'hard'
  >('all');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [secondsPerQuestion, setSecondsPerQuestion] = useState<number>(45);
  const [activeSessionQuestions, setActiveSessionQuestions] = useState<
    Question[] | null
  >(null);

  const subjectPool = useMemo(() => {
    if (selectedSubject === 'ALL_4') return SEED_QUESTIONS;
    return SEED_QUESTIONS.filter(q => q.subject === selectedSubject);
  }, [selectedSubject]);

  const availableTopics = useMemo(() => {
    const set = new Set<string>();
    subjectPool.forEach(q => {
      if (q.topic) set.add(q.topic);
    });
    return Array.from(set);
  }, [subjectPool]);

  const startCustomSimulator = () => {
    sound.playTap();
    let pool = [...subjectPool];
    if (selectedTopic !== 'ALL_TOPICS') {
      const topicMatches = pool.filter(q => q.topic === selectedTopic);
      if (topicMatches.length > 0) pool = topicMatches;
    }
    if (difficultyFilter !== 'all') {
      const diffMatches = pool.filter(q => q.difficulty === difficultyFilter);
      if (diffMatches.length > 0) pool = diffMatches;
    }
    if (pool.length === 0) pool = [...SEED_QUESTIONS];

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, questionCount);
    while (picked.length < questionCount && pool.length > 0) {
      const src = pool[picked.length % pool.length];
      picked.push({ ...src, id: `${src.id}-CUST-${picked.length + 1}` });
    }
    setActiveSessionQuestions(picked);
  };

  if (activeSessionQuestions) {
    const subjectLabel =
      selectedSubject === 'ALL_4' ? 'English Language' : selectedSubject;
    return (
      <LevelSimulatorWorkspace
        mode="smart"
        levelId={1}
        levelTitle={`Custom Simulator · ${
          selectedSubject === 'ALL_4' ? 'All 4 Subjects' : selectedSubject
        }`}
        subjectLabel={subjectLabel}
        questions={activeSessionQuestions}
        secondsPerQuestion={secondsPerQuestion}
        isGeneralTest={false}
        onClose={() => setActiveSessionQuestions(null)}
        onProgressUpdated={() => {}}
      />
    );
  }

  return (
    <div className="space-y-7 pb-20 lg:pb-8 max-w-5xl mx-auto">
      <div>
        <Link
          to="/home"
          className="inline-flex items-center gap-2 text-xs font-black text-slate-500 hover:text-blue-600 mb-3"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <Sliders size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 block">
              ON-DEMAND TOPIC & TWIN DRILL
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Custom JAMB Simulator
            </h1>
          </div>
        </div>
      </div>

      <section
        className={`rounded-3xl border-2 p-6 sm:p-8 space-y-6 ${
          isDark
            ? 'bg-[#0B1326] border-slate-800 text-white'
            : 'bg-white border-blue-100 shadow-sm'
        }`}
      >
        {/* 1. Subject Selector */}
        <div className="space-y-2.5">
          <label className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <Layers size={15} />
            <span>1. Select UTME Subject Scope</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedSubject('ALL_4');
                setSelectedTopic('ALL_TOPICS');
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-black border transition cursor-pointer ${
                selectedSubject === 'ALL_4'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-300'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-blue-400'
              }`}
            >
              Merged (All 4 UTME Subjects)
            </button>
            {AVAILABLE_SUBJECTS.map(subj => (
              <button
                key={subj}
                type="button"
                onClick={() => {
                  setSelectedSubject(subj);
                  setSelectedTopic('ALL_TOPICS');
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-black border transition cursor-pointer ${
                  selectedSubject === subj
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-300'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-blue-400'
                }`}
              >
                {subj}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Syllabus Topic Selector */}
        <div className="space-y-2.5">
          <label className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <Target size={15} />
            <span>2. Filter by Syllabus Topic</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedTopic('ALL_TOPICS')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                selectedTopic === 'ALL_TOPICS'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-300'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              All Topics ({subjectPool.length} Qs)
            </button>
            {availableTopics.map(topic => (
              <button
                key={topic}
                type="button"
                onClick={() => setSelectedTopic(topic)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  selectedTopic === topic
                    ? 'bg-blue-600 text-white border-blue-600'
                    : isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-300'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Question Bank Mode & Difficulty (Original + Twin Simple/Medium/Hard) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500">
              3. Twin Difficulty Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'all', label: 'All (Original+Twins)' },
                { id: 'easy', label: 'Simple (Twin 1)' },
                { id: 'medium', label: 'Medium (Twin 2)' },
                { id: 'hard', label: 'Hard (Twin 3)' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDifficultyFilter(opt.id as any)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black border cursor-pointer ${
                    difficultyFilter === opt.id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-300'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500">
              4. Question Count
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[10, 15, 25].map(count => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setQuestionCount(count)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black border cursor-pointer ${
                    questionCount === count
                      ? 'bg-blue-600 text-white border-blue-600'
                      : isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-300'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {count} Qs
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Clock size={13} />
              <span>5. Timer Pacing</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { sec: 30, label: '30s/Q' },
                { sec: 45, label: '45s/Q' },
                { sec: 60, label: '60s/Q' },
              ].map(t => (
                <button
                  key={t.sec}
                  type="button"
                  onClick={() => setSecondsPerQuestion(t.sec)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black border cursor-pointer ${
                    secondsPerQuestion === t.sec
                      ? 'bg-blue-600 text-white border-blue-600'
                      : isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-300'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            Includes Moveable JAMB Scientific Calculator, Keyboard Shortcuts (A/B/C/D), and Step-by-Step KaTeX Explanations.
          </div>
          <button
            type="button"
            onClick={startCustomSimulator}
            className="px-7 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-600/25 cursor-pointer"
          >
            <Play size={16} className="fill-current" />
            <span>
              Launch Custom Simulator ({questionCount}Q · {secondsPerQuestion}s/Q) →
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
export default CustomJambSimulatorPage;
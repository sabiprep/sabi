import React, { useState } from 'react';
import {
  X, Volume2, Mic, CheckCircle2, XCircle, Award, Sparkles,
  HelpCircle, BookOpen, ArrowRight, RotateCcw
} from 'lucide-react';
import { sound } from '../../utils/soundEffects';

interface OralEnglishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddXP?: (xp: number) => void;
}

interface OralQuestion {
  id: string;
  category: 'vowel' | 'consonant' | 'stress' | 'rhyme';
  instruction: string;
  promptWord: string;
  options: { [key: string]: string };
  answer: string;
  explanation: string;
}

const ORAL_QUESTIONS: OralQuestion[] = [
  {
    id: 'oral-1',
    category: 'vowel',
    instruction: 'From the words lettered A to D, choose the word that has the same vowel sound as the one represented by the underlined letter(s):',
    promptWord: 'plAque (/æ/)',
    options: {
      A: 'arch',
      B: 'pack',
      C: 'lake',
      D: 'calm',
    },
    answer: 'B',
    explanation: 'The letter "a" in "plaque" has the short /æ/ vowel sound as in "pack" and "cat".',
  },
  {
    id: 'oral-2',
    category: 'consonant',
    instruction: 'Choose the word that contains the silent letter corresponding to the prompt:',
    promptWord: 'Silent "B"',
    options: {
      A: 'chamber',
      B: 'plumber',
      C: 'timber',
      D: 'slumber',
    },
    answer: 'B',
    explanation: 'In "plumber" (/ˈplʌm.ər/), the letter "b" is completely silent. In chamber, timber, and slumber, the "b" is pronounced.',
  },
  {
    id: 'oral-3',
    category: 'consonant',
    instruction: 'Choose the word that contains the voiced dental fricative /ð/:',
    promptWord: '/ð/ sound (as in "father")',
    options: {
      A: 'thin',
      B: 'thought',
      C: 'clothe',
      D: 'cloth',
    },
    answer: 'C',
    explanation: '"clothe" (/kloʊð/) has the voiced sound /ð/, whereas thin, thought, and cloth (/klɒθ/) have the voiceless /θ/.',
  },
  {
    id: 'oral-4',
    category: 'stress',
    instruction: 'Identify the word with the correct primary stress syllable (stressed syllable in CAPITALS):',
    promptWord: 'photographic',
    options: {
      A: 'PHO-to-gra-phic',
      B: 'pho-TO-gra-phic',
      C: 'pho-to-GRA-phic',
      D: 'pho-to-gra-PHIC',
    },
    answer: 'C',
    explanation: 'Words ending in "-ic" almost always have primary stress on the penultimate (second-to-last) syllable: pho-to-GRA-phic.',
  },
  {
    id: 'oral-5',
    category: 'stress',
    instruction: 'Choose the question to which the given sentence is the appropriate answer:',
    promptWord: 'CHINEDU ate the ripe mango yesterday. (Stress on CHINEDU)',
    options: {
      A: 'Did Chinedu sell the ripe mango yesterday?',
      B: 'Did Emeka eat the ripe mango yesterday?',
      C: 'Did Chinedu eat the unripe mango yesterday?',
      D: 'Did Chinedu eat the ripe mango this morning?',
    },
    answer: 'B',
    explanation: 'Emphatic stress on "CHINEDU" contradicts the person. If asked "Did Emeka eat it?", the response stresses "No, CHINEDU ate it".',
  },
  {
    id: 'oral-6',
    category: 'rhyme',
    instruction: 'Choose the word that rhymes with the given word:',
    promptWord: 'bough',
    options: {
      A: 'tough',
      B: 'cough',
      C: 'cow',
      D: 'dough',
    },
    answer: 'C',
    explanation: '"bough" is pronounced /baʊ/, which rhymes perfectly with "cow" (/kaʊ/). "dough" is /doʊ/, "rough" is /rʌf/.',
  },
];

export default function OralEnglishModal({
  isOpen,
  onClose,
  onAddXP,
}: OralEnglishModalProps) {
  const [activeCategory, setActiveCategory] = useState<'all' | 'vowel' | 'consonant' | 'stress' | 'rhyme'>('all');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [id: string]: string }>({});
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const filteredQuestions = activeCategory === 'all'
    ? ORAL_QUESTIONS
    : ORAL_QUESTIONS.filter((q) => q.category === activeCategory);

  const currentQ = filteredQuestions[currentIdx] || filteredQuestions[0];
  const totalCorrect = filteredQuestions.filter((q) => selectedAnswers[q.id] === q.answer).length;

  const handleSelect = (opt: string) => {
    if (submitted) return;
    sound.playTap();
    setSelectedAnswers((prev) => ({ ...prev, [currentQ.id]: opt }));
  };

  const handleSubmit = () => {
    sound.playCelebration();
    setSubmitted(true);
    if (onAddXP) onAddXP(totalCorrect * 15);
  };

  const handleReset = () => {
    sound.playTap();
    setSelectedAnswers({});
    setSubmitted(false);
    setCurrentIdx(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0E1729] shadow-2xl border border-slate-200 dark:border-slate-800 my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-900 via-slate-900 to-[#0A1128] text-white flex items-center justify-between border-b border-blue-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center">
              <Volume2 size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-display text-sm font-black text-white">
                  Oral English & Phonetics Drill
                </h3>
                <span className="px-1.5 py-0.2 rounded bg-blue-400 text-slate-950 font-black text-[9px]">
                  15-20 UTME Qs
                </span>
              </div>
              <p className="text-[10px] text-blue-200">Vowels · Consonants · Emphatic Stress · Rhymes</p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300"
          >
            <X size={15} />
          </button>
        </div>

        {/* Category Filter Chips */}
        <div className="p-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All Sounds' },
            { id: 'vowel', label: 'Vowel Sounds' },
            { id: 'consonant', label: 'Consonants / Silent' },
            { id: 'stress', label: 'Emphatic Stress' },
            { id: 'rhyme', label: 'Rhymes' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                sound.playTap();
                setActiveCategory(cat.id as any);
                setCurrentIdx(0);
                setSubmitted(false);
              }}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!submitted ? (
            <>
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 pb-2 border-b border-slate-200 dark:border-slate-800">
                <span>
                  Question {currentIdx + 1} of {filteredQuestions.length}
                </span>
                <span className="text-blue-600 capitalize">{currentQ.category} Section</span>
              </div>

              {/* Instruction */}
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                {currentQ.instruction}
              </p>

              {/* Prompt Box */}
              <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
                  Test Word / Symbol
                </span>
                <p className="font-display text-lg font-black text-slate-900 dark:text-white">
                  {currentQ.promptWord}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-2">
                {Object.entries(currentQ.options).map(([letter, text]) => {
                  const isSelected = selectedAnswers[currentQ.id] === letter;
                  return (
                    <button
                      key={letter}
                      onClick={() => handleSelect(letter)}
                      className={`w-full p-3 rounded-xl border text-xs text-left flex items-start gap-2.5 transition active:scale-98 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black shrink-0">
                        {letter}
                      </span>
                      <span className="flex-1 pt-0.5">{text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation */}
              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  disabled={currentIdx === 0}
                  onClick={() => {
                    sound.playTap();
                    setCurrentIdx((i) => i - 1);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-40"
                >
                  Previous
                </button>

                {currentIdx < filteredQuestions.length - 1 ? (
                  <button
                    onClick={() => {
                      sound.playTap();
                      setCurrentIdx((i) => i + 1);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-blue-600 text-white text-xs font-bold"
                  >
                    Next Question
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-xs"
                  >
                    Submit Oral Drill
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 mx-auto flex items-center justify-center">
                <Award size={32} />
              </div>
              <h3 className="font-display text-lg font-black text-slate-900 dark:text-white">
                Oral English Drill Results
              </h3>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500 font-bold">Accuracy</p>
                <p className="font-display text-3xl font-black text-blue-600 mt-0.5">
                  {totalCorrect} / {filteredQuestions.length}
                </p>
                <p className="text-xs text-blue-600 font-bold mt-1">
                  {Math.round((totalCorrect / filteredQuestions.length) * 100)}% Correct
                </p>
              </div>

              {/* Explanations List */}
              <div className="space-y-2.5 text-left max-h-60 overflow-y-auto">
                {filteredQuestions.map((q, idx) => {
                  const userChoice = selectedAnswers[q.id];
                  const isCorrect = userChoice === q.answer;
                  return (
                    <div
                      key={q.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-xs space-y-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          Q{idx + 1}: {q.promptWord}
                        </span>
                        {isCorrect ? (
                          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle size={16} className="text-rose-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Your answer: <span className="font-bold uppercase">{userChoice || 'None'}</span> · Correct: <span className="font-bold text-blue-600 uppercase">{q.answer}</span>
                      </p>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
                        💡 {q.explanation}
                      </p>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleReset}
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-blue-600 text-white font-bold text-xs"
              >
                Retake Oral Drill
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

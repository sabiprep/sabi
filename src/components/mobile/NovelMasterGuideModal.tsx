import React, { useState } from 'react';
import {
  X, BookOpen, Users, HelpCircle, CheckCircle2, XCircle,
  Sparkles, Award, ArrowRight, RotateCcw, ChevronDown, ChevronUp, BookMarked
} from 'lucide-react';
import { sound } from '../../utils/soundEffects';

interface NovelMasterGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddXP?: (xp: number) => void;
}

interface ChapterData {
  chapter: number;
  title: string;
  summary: string;
  keyPoints: string[];
}

interface CharacterData {
  name: string;
  role: string;
  description: string;
}

interface NovelQuestion {
  id: string;
  question: string;
  options: { [key: string]: string };
  answer: string;
  explanation: string;
  chapter: number;
}

const NOVEL_CHAPTERS: ChapterData[] = [
  {
    chapter: 1,
    title: 'The Family Circle & Omar’s Admission',
    summary: 'The novel opens in Ummi’s home. Her firstborn son, Omar, joyfully announces his admission to study Law at Ahmadu Bello University (ABU), Zaria. The younger daughters, Bint, Teemah, and Jamila, engage with their mother. Bint narrates how she outsmarted her primary school French teacher who asked "Au revoir" meaning goodbye.',
    keyPoints: [
      'Omar scores 230 in UTME to secure Law at ABU Zaria.',
      'Bint teaches her sisters the French word "Au revoir".',
      'Ummi prepares Omar for the realities of university life by sharing stories.',
    ],
  },
  {
    chapter: 2,
    title: 'Ummi’s Matriculation & Dr. Dabo',
    summary: 'Ummi recounts her own university days. She went through registration and encountered Dr. Dabo, a notoriously strict lecturer known for high discipline. Dabo was tempted to make advances toward Ummi but immediately apologized and regained his composure, regretting his moment of weakness.',
    keyPoints: [
      'Dr. Dabo had a spotless record for over two decades.',
      'He asked Ummi out but promptly retracted and prayed for forgiveness.',
      'Highlights the university dress code and code of conduct.',
    ],
  },
  {
    chapter: 3,
    title: 'The Quiet One (Talle of Lafayette)',
    summary: 'Ummi tells the story of Talle, known as "the quiet one" in the village of Lafayette. Talle was taciturn and led a secluded life. However, he was deceived into accommodating a kidnapped young boy in his compound by criminals, leading to his arrest by the police.',
    keyPoints: [
      'Talle was praised for being quiet until quietness masked a crime.',
      'He was innocently manipulated into harboring kidnappers’ victim.',
      'Demonstrates that silence is not always innocence.',
    ],
  },
  {
    chapter: 4,
    title: 'Salma’s Campus Arrival & Roommates',
    summary: 'Focuses on Salma, a glamorous, proud, and sophisticated young woman who enters university. She disdains authority during registration, criticizes the lecturers, and ends up in room with three very diverse roommates: Ngozi, Tomi, and Ada.',
    keyPoints: [
      'Salma avoids university hostel regulations and prefers private living.',
      'Her roommates: Ngozi (studious), Tomi (reserved), Ada (easy-going).',
      'They put aside religious and ethnic differences to live in harmony.',
    ],
  },
  {
    chapter: 5,
    title: 'Habib, Labaran & The Benz Episode',
    summary: 'Salma waits at the university gate and is offered a lift in a sleek Mercedes-Benz by two affluent men, Habib (a politician) and Labaran (his friend/driver). Salma gives a false identity and later swaps with Tomi, leading to comic and tense misunderstandings.',
    keyPoints: [
      'Habib gives Salma money and attention.',
      'Salma acts proud and passes Habib’s attention to Tomi.',
      'Tomi receives unexpected gifts, sparking envy.',
    ],
  },
  {
    chapter: 6,
    title: 'Examination Malpractice & Arrest',
    summary: 'Salma becomes complacent, focusing on social life rather than academics. During her final semester exam in Moral Philosophy, she enters unprepared. She convinces Kola to pass her a cheat slip (chit). The invigilator catches her red-handed and signs the EMDC malpractice form.',
    keyPoints: [
      'Salma cheats in Moral Philosophy exam.',
      'Kola passes the answer chit and is also implicated.',
      'Salma is summoned before the Examination Malpractice Disciplinary Committee (EMDC).',
    ],
  },
  {
    chapter: 7,
    title: 'Kabir the Conman & EMDC Bribery',
    summary: 'In desperation to avert expulsion, Salma confides in Habib, who gives her money to bribe the committee. She encounters Kabir, an unscrupulous university clerk who falsely claims to be the committee chairman’s front man. Kabir pockets the money and vanishes.',
    keyPoints: [
      'Kabir swindles Salma out of hundreds of thousands of Naira.',
      'Salma is officially rusticated / expelled from the university.',
      'Shows the futility of attempting corruption to escape consequences.',
    ],
  },
  {
    chapter: 8,
    title: 'The Gambling Den & Kabir’s Downfall',
    summary: 'Kabir takes the stolen extortion money to a seedy local gambling den. A professional gambler named Zaki wins all his money. A brutal fight ensues when Kabir tries to cheat, leading to Kabir’s arrest and public humiliation.',
    keyPoints: [
      'Ill-gotten wealth brings violent consequences.',
      'Kabir loses everything in dice and card gambling.',
      'Habib learns of the swindle but cannot legally intervene.',
    ],
  },
  {
    chapter: 9,
    title: 'Salma’s Redemption & Omar’s Resolve',
    summary: 'Following her expulsion and the death of her father, Salma experiences profound transformation and repentance. She humbles herself, dresses modestly, and seeks forgiveness. Back in the present, Omar receives his mother’s teachings and promises to remain disciplined and morally upright in university.',
    keyPoints: [
      'Salma changes her life after tragedy and moral awakening.',
      'Omar steps into university grounded in family values and truth.',
      'The central moral: Life presents choices; integrity determines your future.',
    ],
  },
];

const NOVEL_CHARACTERS: CharacterData[] = [
  {
    name: 'Ummi',
    role: 'Mother & Narrator',
    description: 'Wise, articulate mother who guides her children with moral tales to prepare them for university life and adulthood.',
  },
  {
    name: 'Salma',
    role: 'Central Protagonist',
    description: 'A beautiful, sophisticated girl who falls into examination malpractice and university vanity before finding redemption.',
  },
  {
    name: 'Omar',
    role: 'Ummi’s Eldest Son',
    description: 'Ambitious young boy admitted to study Law at Ahmadu Bello University with a score of 230.',
  },
  {
    name: 'Bint',
    role: 'Ummi’s Youngest Daughter',
    description: 'Inquisitive 5-year-old pupil who outwitted her French teacher with "Au revoir".',
  },
  {
    name: 'Dr. Dabo',
    role: 'Principled Lecturer',
    description: 'Disciplined academic known for absolute integrity who overcame a brief personal temptation with Ummi.',
  },
  {
    name: 'Habib',
    role: 'Wealthy Politician',
    description: 'Rich politician who offers Salma gifts and later tries to help her bribe the exam committee.',
  },
  {
    name: 'Kabir',
    role: 'Crooked Clerk & Gambler',
    description: 'Unscrupulous character who swindles Salma out of bribery funds and squanders them in a gambling house.',
  },
  {
    name: 'Talle',
    role: 'The Quiet One',
    description: 'A lonely, quiet village man from Lafayette who was unknowingly entangled in a child kidnapping scheme.',
  },
];

const NOVEL_PRACTICE_QUESTIONS: NovelQuestion[] = [
  {
    id: 'novel-1',
    question: 'In "The Life Changer", what course did Omar secure admission to study at Ahmadu Bello University (ABU)?',
    options: {
      A: 'Medicine & Surgery',
      B: 'Law',
      C: 'Accounting',
      D: 'Pharmacy',
    },
    answer: 'B',
    explanation: 'Omar scored 230 in his UTME and was jubilant after securing admission into the Faculty of Law at ABU Zaria.',
    chapter: 1,
  },
  {
    id: 'novel-2',
    question: 'What French greeting did Bint tell her mother her teacher was astonished that she knew?',
    options: {
      A: 'Bonjour',
      B: 'Bonne nuit',
      C: 'Au revoir',
      D: 'Merci beaucoup',
    },
    answer: 'C',
    explanation: 'Bint told her mother she knew "Au revoir" (goodbye) because her elder sister had taught her at home.',
    chapter: 1,
  },
  {
    id: 'novel-3',
    question: 'Why was Talle referred to as "The Quiet One" by the inhabitants of Lafayette?',
    options: {
      A: 'He was dumb and could not speak',
      B: 'He rarely spoke, kept strictly to himself, and rarely left his compound',
      C: 'He was a spiritual monk in seclusion',
      D: 'He only came out at night',
    },
    answer: 'B',
    explanation: 'Talle had an introverted, solitary temperament and barely mingled with villagers, leading them to call him "The Quiet One".',
    chapter: 3,
  },
  {
    id: 'novel-4',
    question: 'Which examination did Salma engage in examination malpractice that resulted in her EMDC trial?',
    options: {
      A: 'Introduction to Economics',
      B: 'Moral Philosophy',
      C: 'General Studies in English',
      D: 'Sociology of Education',
    },
    answer: 'B',
    explanation: 'Ironically, Salma cheated in "Moral Philosophy", receiving a chit from Kola before being caught by the vigilant invigilator.',
    chapter: 6,
  },
  {
    id: 'novel-5',
    question: 'How did Kabir deceive Salma when she was desperate to escape expulsion?',
    options: {
      A: 'He claimed to be the Vice-Chancellor’s relative',
      B: 'He pretended to know the EMDC Committee Chairman and collected bribe money on his behalf',
      C: 'He promised to hack the university results database',
      D: 'He offered to write another exam in her name',
    },
    answer: 'B',
    explanation: 'Kabir took advantage of Salma’s desperation, collected her money under the guise of settling the EMDC chairman, and fled.',
    chapter: 7,
  },
  {
    id: 'novel-6',
    question: 'What incident finally made Dr. Dabo seek immediate forgiveness from the Almighty?',
    options: {
      A: 'He accepted an illegal gift from an applicant',
      B: 'He asked Ummi out during university registration, violating his lifelong personal code of conduct',
      C: 'He failed a student unfairly',
      D: 'He arrived late to his lecture hall',
    },
    answer: 'B',
    explanation: 'Dr. Dabo experienced a fleeting lapse in judgment and asked Ummi out, but immediately regretted it and prayed for forgiveness.',
    chapter: 2,
  },
  {
    id: 'novel-7',
    question: 'What ultimately happened to the money Kabir swindled from Salma?',
    options: {
      A: 'He used it to buy a luxury car',
      B: 'He lost it all in a seedy gambling den to Zaki',
      C: 'He deposited it in an offshore account',
      D: 'He donated it to an orphanage',
    },
    answer: 'B',
    explanation: 'Kabir went straight to a gambling den and lost the entire sum to a seasoned gambler called Zaki.',
    chapter: 8,
  },
];

export default function NovelMasterGuideModal({
  isOpen,
  onClose,
  onAddXP,
}: NovelMasterGuideModalProps) {
  const [activeTab, setActiveTab] = useState<'chapters' | 'characters' | 'quiz'>('chapters');
  const [expandedChapter, setExpandedChapter] = useState<number>(1);

  // Quiz State
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [id: string]: string }>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  if (!isOpen) return null;

  const currentQ = NOVEL_PRACTICE_QUESTIONS[quizIndex];
  const totalCorrect = NOVEL_PRACTICE_QUESTIONS.filter(
    (q) => selectedAnswers[q.id] === q.answer
  ).length;

  const handleSelectOption = (letter: string) => {
    if (quizSubmitted) return;
    sound.playTap();
    setSelectedAnswers((prev) => ({ ...prev, [currentQ.id]: letter }));
  };

  const handleSubmitQuiz = () => {
    sound.playCelebration();
    setQuizSubmitted(true);
    if (onAddXP) {
      onAddXP(totalCorrect * 15);
    }
  };

  const handleResetQuiz = () => {
    sound.playTap();
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setQuizIndex(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0E1729] shadow-2xl border border-slate-200 dark:border-slate-800 my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-900 via-slate-900 to-[#0A1128] text-white flex items-center justify-between border-b border-emerald-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
              <BookOpen size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-display text-sm font-black text-white">
                  The Life Changer
                </h3>
                <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black text-[9px]">
                  10 JAMB Qs
                </span>
              </div>
              <p className="text-[10px] text-emerald-200">Khadija Abubakar Jalli · Official Guide</p>
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

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-1">
          <button
            onClick={() => {
              sound.playTap();
              setActiveTab('chapters');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'chapters'
                ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookMarked size={13} />
            <span>Chapters (1-9)</span>
          </button>

          <button
            onClick={() => {
              sound.playTap();
              setActiveTab('characters');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'characters'
                ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users size={13} />
            <span>Characters</span>
          </button>

          <button
            onClick={() => {
              sound.playTap();
              setActiveTab('quiz');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'quiz'
                ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <HelpCircle size={13} />
            <span>CBT Drill</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* 1. CHAPTERS ACCORDION */}
          {activeTab === 'chapters' && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-900 dark:text-emerald-200">
                <span className="font-bold">Exam Tip:</span> JAMB tests plot chronology, character names, and direct quotes from these chapters. Tap any chapter below to review.
              </div>

              {NOVEL_CHAPTERS.map((ch) => {
                const isOpen = expandedChapter === ch.chapter;
                return (
                  <div
                    key={ch.chapter}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden"
                  >
                    <button
                      onClick={() => {
                        sound.playTap();
                        setExpandedChapter(isOpen ? 0 : ch.chapter);
                      }}
                      className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-black flex items-center justify-center shrink-0">
                          {ch.chapter}
                        </span>
                        <div>
                          <h4 className="text-xs font-black text-slate-900 dark:text-white">
                            Chapter {ch.chapter}: {ch.title}
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            {ch.keyPoints.length} key takeaway points
                          </span>
                        </div>
                      </div>
                      {isOpen ? (
                        <ChevronUp size={16} className="text-slate-400" />
                      ) : (
                        <ChevronDown size={16} className="text-slate-400" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-800 space-y-3 text-xs leading-relaxed">
                        <p className="text-slate-700 dark:text-slate-300 text-[11px]">
                          {ch.summary}
                        </p>
                        <div className="space-y-1.5 pt-1">
                          <p className="font-bold text-[10px] uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
                            Key Examination Highlights:
                          </p>
                          <ul className="space-y-1">
                            {ch.keyPoints.map((point, idx) => (
                              <li key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                                <span className="text-emerald-500 font-bold">•</span>
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. CHARACTERS DIRECTORY */}
          {activeTab === 'characters' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Understand the roles and significance of key characters tested in UTME Use of English.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {NOVEL_CHARACTERS.map((char) => (
                  <div
                    key={char.name}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white">
                        {char.name}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        {char.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      {char.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. CBT DRILL */}
          {activeTab === 'quiz' && (
            <div className="space-y-4">
              {!quizSubmitted ? (
                <>
                  {/* Progress & Chapter Indicator */}
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 pb-2 border-b border-slate-200 dark:border-slate-800">
                    <span>Question {quizIndex + 1} of {NOVEL_PRACTICE_QUESTIONS.length}</span>
                    <span className="text-emerald-600">Chapter {currentQ.chapter} Target</span>
                  </div>

                  {/* Question Stem */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
                    {currentQ.question}
                  </div>

                  {/* 4 Options */}
                  <div className="space-y-2">
                    {Object.entries(currentQ.options).map(([letter, text]) => {
                      const isSelected = selectedAnswers[currentQ.id] === letter;
                      return (
                        <button
                          key={letter}
                          onClick={() => handleSelectOption(letter)}
                          className={`w-full p-3 rounded-xl border text-xs text-left flex items-start gap-2.5 transition active:scale-98 ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 font-bold'
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

                  {/* Navigation Buttons */}
                  <div className="pt-2 flex items-center justify-between gap-2">
                    <button
                      disabled={quizIndex === 0}
                      onClick={() => {
                        sound.playTap();
                        setQuizIndex((i) => i - 1);
                      }}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-40"
                    >
                      Previous
                    </button>

                    {quizIndex < NOVEL_PRACTICE_QUESTIONS.length - 1 ? (
                      <button
                        onClick={() => {
                          sound.playTap();
                          setQuizIndex((i) => i + 1);
                        }}
                        className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold"
                      >
                        Next Question
                      </button>
                    ) : (
                      <button
                        onClick={handleSubmitQuiz}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-xs"
                      >
                        Submit Novel Drill
                      </button>
                    )}
                  </div>
                </>
              ) : (
                /* Drill Results */
                <div className="space-y-4 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 mx-auto flex items-center justify-center">
                    <Award size={32} />
                  </div>
                  <h3 className="font-display text-lg font-black text-slate-900 dark:text-white">
                    Novel Drill Completed!
                  </h3>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-500 font-bold">You scored</p>
                    <p className="font-display text-3xl font-black text-emerald-600 mt-0.5">
                      {totalCorrect} / {NOVEL_PRACTICE_QUESTIONS.length}
                    </p>
                    <p className="text-xs text-emerald-600 font-bold mt-1">
                      {Math.round((totalCorrect / NOVEL_PRACTICE_QUESTIONS.length) * 100)}% Mastery
                    </p>
                  </div>

                  {/* Question Review List */}
                  <div className="space-y-2.5 text-left max-h-60 overflow-y-auto">
                    {NOVEL_PRACTICE_QUESTIONS.map((q, idx) => {
                      const userChoice = selectedAnswers[q.id];
                      const isCorrect = userChoice === q.answer;
                      return (
                        <div
                          key={q.id}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-xs space-y-1"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              Q{idx + 1}: {q.question}
                            </span>
                            {isCorrect ? (
                              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                            ) : (
                              <XCircle size={16} className="text-rose-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Your answer: <span className="font-bold uppercase">{userChoice || 'None'}</span> · Correct: <span className="font-bold text-emerald-600 uppercase">{q.answer}</span>
                          </p>
                          <p className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
                            💡 {q.explanation} (Chapter {q.chapter})
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={handleResetQuiz}
                    className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-bold text-xs"
                  >
                    Retake Novel Drill
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

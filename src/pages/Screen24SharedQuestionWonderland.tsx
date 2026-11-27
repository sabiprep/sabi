import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ExternalLink,
  Loader2,
  Smartphone,
  UserPlus,
  X,
  Zap,
} from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { SabiPurpleBookLogo } from '../components/common/SabiWonderlandShell';
import {
  checkPublicQuestionAnswerOnServer,
  fetchPublicQuestionFromServer,
  getPlayStoreAppUrl,
  resolvePublicQuestionById,
  type PublicAnswerCheckResult,
  type PublicSharedQuestionPayload,
} from '../utils/questionSnapshotStore';
import { sound } from '../utils/soundEffects';

const OPTIONS: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

function getModeLabel(rawMode: string | null): string {
  switch (rawMode) {
    case 'smart':
      return 'Smart Practice';
    case 'custom':
      return 'Custom Practice';
    case 'cbt':
      return 'CBT Challenge';
    default:
      return 'Blitz';
  }
}

/**
 * Screen 24 (`/q/:questionId`): Public Standalone Shared Question Landing View
 * Opened directly in Chrome / WebApp when someone outside SABI taps a shared snapshot link.
 * Queries the live backend (`/api/public/questions/:questionId` -> Supabase `question_bank`)
 * so ANY real JAMB question can be shared and attempted in full view before directing
 * the visitor to SABI Sign-Up (and Play Store when published).
 */
export function Screen24SharedQuestionWonderland() {
  const navigate = useNavigate();
  const { questionId = '' } = useParams<{ questionId: string }>();
  const [searchParams] = useSearchParams();

  const sourceMode = getModeLabel(searchParams.get('mode'));
  const playStoreUrl = useMemo(() => getPlayStoreAppUrl(), []);
  const localMatch = useMemo(() => resolvePublicQuestionById(questionId), [questionId]);

  const [question, setQuestion] = useState<PublicSharedQuestionPayload | null>(() =>
    localMatch
      ? {
          id: localMatch.id,
          subjectCanonical: localMatch.subjectCanonical,
          subjectLabel: localMatch.subjectLabel,
          topicLabel: localMatch.topicLabel,
          year: localMatch.year,
          question: localMatch.question,
          options: localMatch.options,
        }
      : null
  );
  const [loadingQuestion, setLoadingQuestion] = useState<boolean>(() => !localMatch);
  const [checkingAnswer, setCheckingAnswer] = useState(false);
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [verdict, setVerdict] = useState<PublicAnswerCheckResult | null>(null);
  const [usePidgin, setUsePidgin] = useState(false);

  // Load live question from backend (`/api/public/questions/:questionId` -> Supabase question_bank)
  useEffect(() => {
    let active = true;
    setSelectedOption(null);
    setVerdict(null);
    setUsePidgin(false);
    setCheckingAnswer(false);

    if (localMatch) {
      setQuestion({
        id: localMatch.id,
        subjectCanonical: localMatch.subjectCanonical,
        subjectLabel: localMatch.subjectLabel,
        topicLabel: localMatch.topicLabel,
        year: localMatch.year,
        question: localMatch.question,
        options: localMatch.options,
      });
      setLoadingQuestion(false);
    } else {
      setQuestion(null);
      setLoadingQuestion(true);
    }

    void fetchPublicQuestionFromServer(questionId).then((remote) => {
      if (!active) return;
      if (remote) {
        setQuestion(remote);
      }
      setLoadingQuestion(false);
    });

    return () => {
      active = false;
    };
  }, [localMatch, questionId]);

  const isAnswered = selectedOption !== null && verdict !== null;
  const isCorrect = Boolean(verdict?.isCorrect);

  const handleSelectOption = useCallback(
    async (opt: 'A' | 'B' | 'C' | 'D') => {
      if (!question || selectedOption !== null || checkingAnswer) return;
      setSelectedOption(opt);
      setCheckingAnswer(true);

      try {
        const serverVerdict = await checkPublicQuestionAnswerOnServer(question.id, opt);
        if (serverVerdict) {
          setVerdict(serverVerdict);
          try {
            if (serverVerdict.isCorrect) sound.playSuccess();
            else sound.playTap();
          } catch {
            // ignore audio errors
          }
          return;
        }

        // Offline fallback when question was resolved from local starter bank
        if (localMatch) {
          const fallbackCorrect = opt === localMatch.answer;
          setVerdict({
            questionId: localMatch.id,
            selectedOption: opt,
            correctAnswer: localMatch.answer,
            isCorrect: fallbackCorrect,
            explanationShort: localMatch.explanationShort,
            explanationFull: localMatch.explanationFull,
            explanationPidgin: localMatch.explanationPidgin,
          });
          try {
            if (fallbackCorrect) sound.playSuccess();
            else sound.playTap();
          } catch {
            // ignore
          }
          return;
        }

        // Could not grade (network dropped on DB-only question) -> allow retry
        setSelectedOption(null);
      } finally {
        setCheckingAnswer(false);
      }
    },
    [checkingAnswer, localMatch, question, selectedOption]
  );

  // Allow keyboard answering (A–D or 1–4) on desktop Chrome
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!question || selectedOption !== null || checkingAnswer) return;
      const key = e.key.toLowerCase();
      if (key === 'a' || key === '1') void handleSelectOption('A');
      else if (key === 'b' || key === '2') void handleSelectOption('B');
      else if (key === 'c' || key === '3') void handleSelectOption('C');
      else if (key === 'd' || key === '4') void handleSelectOption('D');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [checkingAnswer, handleSelectOption, question, selectedOption]);

  const signUpPath = `/auth/sign-up?ref=shared-q&qid=${encodeURIComponent(
    question?.id || questionId
  )}`;

  if (loadingQuestion) {
    return (
      <div
        className="min-h-[100dvh] w-full bg-[#1E0342] text-white flex flex-col items-center justify-center px-4 py-10"
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          background: 'linear-gradient(180deg, #21044A 0%, #1C033E 55%, #160233 100%)',
        }}
      >
        <div className="bg-[#FFE824] rounded-[18px] px-4 py-2 mb-5 shadow-[0_4px_0_#C7AD00]">
          <SabiPurpleBookLogo size="sm" to="/welcome" />
        </div>
        <div className="inline-flex items-center gap-2.5 text-[15px] font-bold text-[#FFE824]">
          <Loader2 size={20} className="animate-spin" />
          <span>Loading JAMB question...</span>
        </div>
      </div>
    );
  }

  // Graceful fallback for invalid/expired question links
  if (!question) {
    return (
      <div
        className="min-h-[100dvh] w-full bg-[#FFE824] text-[#260559] flex flex-col items-center justify-center px-4 py-10"
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          background: 'linear-gradient(180deg, #FFEC2E 0%, #FFE51E 100%)',
        }}
      >
        <div
          className="w-full max-w-[440px] rounded-[28px] bg-white p-6 sm:p-7 text-center space-y-4"
          style={{ boxShadow: '0 6px 0 #E2C700' }}
        >
          <div className="flex justify-center">
            <SabiPurpleBookLogo size="md" to="/welcome" />
          </div>
          <h1
            className="text-[24px] font-bold text-[#260559] leading-tight"
            style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
          >
            This JAMB question link wasn’t found
          </h1>
          <p className="text-[14px] font-semibold text-[#5A467A] leading-relaxed">
            Jump into SABI to practise thousands of real JAMB UTME questions with instant
            step-by-step explanations and Blitz drills.
          </p>
          <button
            type="button"
            onClick={() => navigate('/auth/sign-up')}
            className="w-full py-3.5 px-5 rounded-[18px] bg-[#6C19E5] hover:brightness-105 text-white font-extrabold text-[15px] inline-flex items-center justify-center gap-2 cursor-pointer"
            style={{
              fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
              boxShadow: '0 4px 0 #46099E',
            }}
          >
            <span>Start Free on SABI</span>
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-[100dvh] w-full overflow-x-hidden bg-[#1E0342] text-white flex flex-col select-none pt-[env(safe-area-inset-top,0px)]"
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background: 'linear-gradient(180deg, #21044A 0%, #1C033E 55%, #160233 100%)',
      }}
    >
      {/* Subtle Dark-Purple Ambient Circles */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div
          className="absolute top-[160px] -right-[70px] w-[260px] h-[260px] sm:w-[340px] sm:h-[340px] rounded-full"
          style={{ background: 'rgba(92, 26, 184, 0.24)' }}
        />
        <div
          className="absolute -left-[68px] bottom-[150px] w-[190px] h-[190px] sm:w-[230px] sm:h-[230px] rounded-full"
          style={{ border: '22px solid rgba(92, 26, 184, 0.22)' }}
        />
      </div>

      {/* Standalone Full-View Question Arena */}
      <main className="relative z-10 flex-1 w-full max-w-[780px] mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-6 flex flex-col">
        {/* Minimal Brand Header — No Dashboard Clutter */}
        <header className="flex items-center justify-between gap-3 mb-5 sm:mb-6">
          <div className="bg-[#FFE824] rounded-[16px] px-3 py-1.5 shadow-[0_3px_0_#C7AD00]">
            <SabiPurpleBookLogo size="sm" to="/welcome" />
          </div>

          <div className="px-3.5 py-1.5 rounded-full bg-[#2C0A5C] border border-white/10 inline-flex items-center gap-1.5 text-[12px] sm:text-[13px] font-extrabold text-[#FFE51E]">
            <Zap size={13} className="fill-[#FFE51E] text-[#FFE51E]" />
            <span>SABI {sourceMode} Challenge</span>
          </div>
        </header>

        {/* Subject & Topic Meta */}
        <div className="flex items-center flex-wrap gap-2.5 mb-3">
          <span className="px-3.5 py-1 rounded-full bg-[#FFE51E] text-[#260559] font-extrabold text-[12.5px] sm:text-[13px] tracking-tight">
            {question.subjectLabel}
          </span>
          <span className="text-[13.5px] sm:text-[14.5px] font-bold text-[#D2C0F2]">
            {question.topicLabel}
            {question.year ? ` · JAMB ${question.year}` : ' · JAMB UTME'}
          </span>
        </div>

        {/* Question Stem */}
        <h1
          className="text-[23px] sm:text-[28px] lg:text-[30px] font-bold text-white leading-[1.26] mb-5 sm:mb-6 whitespace-pre-line"
          style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
        >
          {question.question}
        </h1>

        {/* 4 Tactile Option Cards */}
        <div className="space-y-3">
          {OPTIONS.map((letter) => {
            const text = question.options[letter];
            const isThisCorrect = Boolean(verdict && letter === verdict.correctAnswer);
            const isThisSelected = selectedOption === letter;

            let cardBg = 'bg-white text-[#260559] hover:bg-[#FCF9FF]';
            let cardShadow = '0 4px 0 #B69CE8';
            let badgeClass = 'bg-[#F1E8FF] text-[#6C19E5]';

            if (isAnswered) {
              if (isThisCorrect) {
                cardBg = 'bg-[#10B968] text-white';
                cardShadow = '0 4px 0 #088247';
                badgeClass = 'bg-white text-[#088247]';
              } else if (isThisSelected && !isThisCorrect) {
                cardBg = 'bg-[#E5484D] text-white';
                cardShadow = '0 4px 0 #A82328';
                badgeClass = 'bg-white text-[#A82328]';
              } else {
                cardBg = 'bg-white/45 text-[#260559]/75';
                cardShadow = '0 3px 0 rgba(182, 156, 232, 0.35)';
                badgeClass = 'bg-[#260559]/12 text-[#260559]/70';
              }
            } else if (isThisSelected && checkingAnswer) {
              cardBg = 'bg-[#FFE824] text-[#260559]';
              cardShadow = '0 4px 0 #C5AB00';
              badgeClass = 'bg-[#260559] text-[#FFE824]';
            }

            return (
              <button
                key={letter}
                type="button"
                disabled={isAnswered || checkingAnswer}
                onClick={() => void handleSelectOption(letter)}
                className={`w-full rounded-[19px] px-4 py-4 min-h-[60px] flex items-center justify-between gap-3 text-left transition-all duration-150 ${
                  !isAnswered && !checkingAnswer
                    ? 'active:translate-y-[1.5px] cursor-pointer'
                    : 'cursor-default'
                } ${cardBg}`}
                style={{ boxShadow: cardShadow }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-8 h-8 rounded-[10px] flex items-center justify-center font-extrabold text-[14px] shrink-0 ${badgeClass}`}
                  >
                    {letter}
                  </span>
                  <span className="text-[16px] sm:text-[17.5px] font-extrabold leading-snug">
                    {text}
                  </span>
                </div>

                {checkingAnswer && isThisSelected && (
                  <Loader2 size={20} className="animate-spin text-[#260559] shrink-0" />
                )}
                {isAnswered && isThisCorrect && (
                  <Check size={22} strokeWidth={3} className="text-white shrink-0" />
                )}
                {isAnswered && isThisSelected && !isThisCorrect && (
                  <X size={22} strokeWidth={3} className="text-white shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Before answering helper cue */}
        {!isAnswered && (
          <div className="mt-auto pt-8 text-center">
            <p className="text-[13.5px] font-bold text-[#B9A1DE]">
              {checkingAnswer
                ? 'Checking your answer against the official JAMB syllabus...'
                : 'Tap an option above to see if you got this JAMB question right!'}
            </p>
          </div>
        )}
      </main>

      {/* ================================================================= */}
      {/* POST-ANSWER VERDICT + DIRECT SIGN-UP & PLAY STORE PROMPT SHEET    */}
      {/* ================================================================= */}
      {isAnswered && verdict && (
        <section
          className={`relative z-20 w-full mt-2 rounded-t-[28px] px-4 sm:px-6 pt-5 pb-[max(env(safe-area-inset-bottom,0px),22px)] text-[#1D0547] shadow-[0_-12px_36px_rgba(12,2,28,0.5)] ${
            isCorrect ? 'bg-[#B7F7D4]' : 'bg-[#FFD9DC]'
          }`}
        >
          <div className="w-full max-w-[780px] mx-auto space-y-4">
            {/* Verdict & Explanation */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <h2
                  className="text-[23px] sm:text-[26px] font-bold text-[#1D0547] leading-tight"
                  style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
                >
                  {isCorrect
                    ? 'Correct! You sabi am!'
                    : `Not quite — Option ${verdict.correctAnswer} is right`}
                </h2>
                <button
                  type="button"
                  onClick={() => setUsePidgin((prev) => !prev)}
                  className="px-3 py-1 rounded-full bg-[#260559] text-[#FFE51E] text-[11.5px] font-extrabold shrink-0 cursor-pointer"
                >
                  {usePidgin ? 'Standard English' : 'Naija Pidgin'}
                </button>
              </div>
              <p className="text-[14.5px] sm:text-[15.5px] font-semibold text-[#240B52] leading-relaxed">
                {usePidgin ? verdict.explanationPidgin : verdict.explanationFull}
              </p>
            </div>

            {/* Sign-Up Conversion & Play Store Prompt Card */}
            <div
              className="rounded-[24px] bg-[#2A085E] text-white p-4 sm:p-5 space-y-3.5"
              style={{ boxShadow: '0 6px 0 #170338' }}
            >
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#FFE824]">
                  READY FOR MORE JAMB QUESTIONS?
                </div>
                <h3
                  className="mt-1 text-[20px] sm:text-[22px] font-bold text-white leading-tight"
                  style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
                >
                  Sign up on SABI to unlock Blitz, Smart Practice & CBT Mock
                </h3>
                <p className="mt-1 text-[13px] font-semibold text-[#DCD0F5] leading-snug">
                  Track your real mastery across all 4 JAMB subjects, climb Blue → Gold leagues,
                  and ask SABI Assistant any question.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate(signUpPath)}
                  className="w-full py-3.5 px-4 rounded-[16px] bg-[#FFE824] hover:brightness-105 text-[#260559] font-extrabold text-[15px] inline-flex items-center justify-center gap-2 cursor-pointer active:translate-y-[1px]"
                  style={{
                    fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                    boxShadow: '0 4px 0 #C5AB00',
                  }}
                >
                  <UserPlus size={18} />
                  <span>Sign Up Free (WebApp)</span>
                  <ArrowRight size={16} />
                </button>

                {playStoreUrl ? (
                  <a
                    href={playStoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 px-4 rounded-[16px] bg-[#6C19E5] hover:brightness-110 text-white font-extrabold text-[14.5px] inline-flex items-center justify-center gap-2"
                    style={{ boxShadow: '0 4px 0 #46099E' }}
                  >
                    <Smartphone size={17} />
                    <span>Get SABI on Play Store</span>
                    <ExternalLink size={15} />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/auth/sign-in')}
                    className="w-full py-3.5 px-4 rounded-[16px] bg-white/12 hover:bg-white/18 text-white font-extrabold text-[14px] inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Already have an account? Sign In</span>
                  </button>
                )}
              </div>

              {!playStoreUrl && (
                <div className="flex items-center justify-center gap-1.5 text-[11.5px] font-bold text-[#C8B8E6]">
                  <Smartphone size={13} className="text-[#FFE824]" />
                  <span>Full WebApp live in Chrome · Google Play Android release coming soon</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

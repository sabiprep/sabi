import React, { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  HelpCircle,
  RotateCcw,
  Share2,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SabiAppChrome, SabiMenuTriggerButton } from '../components/common/SabiAppChrome';
import { QuestionSnapshotCard } from '../components/common/QuestionSnapshotCard';
import { QuestionShareSheet } from '../components/common/QuestionShareSheet';
import { getWonderlandDashboardState } from '../utils/wonderlandStudentState';
import {
  loadMistakesVault,
  removeMistakeFromVault,
  type CustomPracticeConfig,
} from '../utils/cbtAndCustomEngine';
import {
  hydrateSavedSnapshotsFromServer,
  loadSavedQuestionSnapshots,
  recordSnapshotAttempt,
  removeQuestionSnapshot,
  type QuestionSnapshotRecord,
} from '../utils/questionSnapshotStore';

/**
 * SCREEN 21 (`/mistakes`): MISTAKES & SAVED SNAPSHOTS VAULT
 * - Review past missed questions with English/Pidgin explanations.
 * - Inspect full-display Saved Question Snapshots from Blitz & Smart Practice
 *   (preserving answered vs unanswered state, interactive solving for unanswered snapshots,
 *   and 1-tap Share Snapshot Sheet).
 */
export function Screen21MistakesVaultWonderland() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const data = useMemo(() => getWonderlandDashboardState(), []);

  const requestedTab = searchParams.get('tab') === 'saved' ? 'saved' : 'mistakes';
  const [activeTab, setActiveTab] = useState<'mistakes' | 'saved'>(requestedTab);
  const [mistakes, setMistakes] = useState(() => loadMistakesVault());
  const [savedSnapshots, setSavedSnapshots] = useState<QuestionSnapshotRecord[]>(() =>
    loadSavedQuestionSnapshots()
  );
  const [expandedId, setExpandedId] = useState<string | null>(() => {
    if (requestedTab === 'saved') {
      const initial = loadSavedQuestionSnapshots();
      return initial[0]?.snapshotId ?? null;
    }
    return null;
  });
  const [pidgin, setPidgin] = useState(false);
  const [shareTarget, setShareTarget] = useState<QuestionSnapshotRecord | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'saved') {
      setActiveTab('saved');
    } else if (tabParam === 'mistakes') {
      setActiveTab('mistakes');
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    void hydrateSavedSnapshotsFromServer().then((res) => {
      if (!active) return;
      setSavedSnapshots(res.snapshots);
      if (requestedTab === 'saved' && res.snapshots[0]) {
        setExpandedId((prev) => prev || res.snapshots[0].snapshotId);
      }
    });
    return () => {
      active = false;
    };
  }, [requestedTab]);

  const handleSelectTab = (tab: 'mistakes' | 'saved') => {
    setActiveTab(tab);
    setSearchParams(tab === 'saved' ? { tab: 'saved' } : {}, { replace: true });
    if (tab === 'saved' && savedSnapshots[0] && !expandedId) {
      setExpandedId(savedSnapshots[0].snapshotId);
    }
  };

  const handleDrillVault = () => {
    const drillConfig: CustomPracticeConfig = {
      subjects: data.subjects.map((s) => s.canonicalName),
      topics: [],
      questionCount: Math.max(5, Math.min(20, mistakes.length + savedSnapshots.length || 10)),
      difficulty: 'mix',
      feedbackTiming: 'instant',
      timerMinutes: null,
      onlyMistakesOrSaved: true,
    };
    navigate('/practice/custom/session', { state: { config: drillConfig } });
  };

  return (
    <SabiAppChrome
      activeTab="progress"
      backdropVariant="progress"
      streakDays={data.streakDays}
      xpBalance={data.xpBalance}
    >
      <main className="w-full max-w-[1200px] mx-auto px-3 sm:px-5 lg:px-8 pt-3.5 sm:pt-5 pb-6">
        <header className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="w-[44px] h-[44px] rounded-[14px] bg-white text-[#260559] flex items-center justify-center shrink-0 cursor-pointer"
              style={{ boxShadow: '0 3px 0 #E2C700' }}
            >
              <ChevronLeft size={22} strokeWidth={2.7} />
            </button>
            <div className="min-w-0">
              <h1
                className="text-[26px] sm:text-[32px] font-bold text-[#260559] leading-tight truncate"
                style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
              >
                Mistakes & Saved Vault
              </h1>
              <p className="text-[13.5px] font-semibold text-[#3C2263]">
                Review full question snapshots and turn past mistakes into JAMB marks.
              </p>
            </div>
          </div>
          <SabiMenuTriggerButton />
        </header>

        {/* Action Strip */}
        <section
          className="rounded-[22px] bg-[#2A085E] p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4"
          style={{ boxShadow: '0 5px 0 #170338' }}
        >
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleSelectTab('mistakes')}
              className={`px-4 py-2 rounded-full text-[13.5px] font-extrabold cursor-pointer ${
                activeTab === 'mistakes'
                  ? 'bg-[#FFE824] text-[#260559]'
                  : 'bg-white/12 text-white hover:bg-white/20'
              }`}
            >
              Missed ({mistakes.length})
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('saved')}
              className={`px-4 py-2 rounded-full text-[13.5px] font-extrabold cursor-pointer inline-flex items-center gap-1.5 ${
                activeTab === 'saved'
                  ? 'bg-[#FFE824] text-[#260559]'
                  : 'bg-white/12 text-white hover:bg-white/20'
              }`}
            >
              <Bookmark size={14} />
              <span>Saved Snapshots ({savedSnapshots.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setPidgin((prev) => !prev)}
              className="px-3.5 py-2 rounded-full bg-white/10 text-[#FFE51E] text-[12px] font-extrabold cursor-pointer"
            >
              {pidgin ? 'Pidgin: ON' : 'Pidgin: OFF'}
            </button>
          </div>

          <button
            type="button"
            onClick={handleDrillVault}
            className="px-5 py-2.5 rounded-[15px] bg-[#6C19E5] hover:brightness-110 text-white font-bold text-[14px] uppercase tracking-wide inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            style={{
              fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
              boxShadow: '0 3.5px 0 #46099E',
            }}
          >
            <RotateCcw size={15} />
            <span>Drill These Questions</span>
          </button>
        </section>

        {/* List Body */}
        {activeTab === 'mistakes' ? (
          mistakes.length === 0 ? (
            <section
              className="bg-white rounded-[24px] p-6 sm:p-8 text-center"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <Zap size={32} className="mx-auto text-[#6C19E5] mb-2" />
              <h2 className="text-[19px] font-extrabold text-[#260559]">
                Your Mistakes Vault is clean!
              </h2>
              <p className="mt-1 text-[14px] font-semibold text-[#5A467A] max-w-[440px] mx-auto">
                Any question you miss during Blitz, Smart Practice, Custom Practice, or CBT Mock is
                saved here automatically for quick revision.
              </p>
              <button
                type="button"
                onClick={() => navigate('/practice')}
                className="mt-4 px-5 py-3 rounded-[16px] bg-[#6C19E5] text-white font-bold text-[14.5px] uppercase cursor-pointer"
                style={{
                  fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                  boxShadow: '0 4px 0 #46099E',
                }}
              >
                Open Practice Hub
              </button>
            </section>
          ) : (
            <div className="space-y-3">
              {mistakes.map((item) => {
                const isOpen = expandedId === item.questionId;
                return (
                  <article
                    key={item.questionId}
                    className="bg-white rounded-[22px] p-4 sm:p-5"
                    style={{ boxShadow: '0 4px 0 #E2C700' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isOpen ? null : item.questionId)}
                        className="flex-1 text-left cursor-pointer"
                      >
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#FFE2E5] text-[#B91C1C] text-[11px] font-extrabold">
                            Missed {item.missedCount}×
                          </span>
                          <span className="text-[12px] font-extrabold text-[#6C19E5]">
                            {item.subjectLabel} · {item.topicLabel}
                          </span>
                        </div>
                        <h3 className="text-[15.5px] font-extrabold text-[#260559] leading-snug">
                          {item.question}
                        </h3>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isOpen ? null : item.questionId)}
                          className="w-9 h-9 rounded-[11px] bg-[#F5F0FF] text-[#260559] flex items-center justify-center cursor-pointer"
                        >
                          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                        <button
                          type="button"
                          aria-label="Remove from mistakes vault"
                          onClick={() => setMistakes(removeMistakeFromVault(item.questionId))}
                          className="w-9 h-9 rounded-[11px] bg-[#FFF1F2] text-[#DC2626] flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="mt-3 pt-3 border-t border-[#F0E9FA] space-y-2 text-[13.5px]">
                        <div className="font-extrabold text-[#059669]">
                          Correct Option {item.answer}: {item.options[item.answer]}
                        </div>
                        <p className="font-semibold text-[#3B2264] leading-relaxed">
                          {pidgin ? item.explanationPidgin : item.explanationFull}
                        </p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )
        ) : savedSnapshots.length === 0 ? (
          <section
            className="bg-white rounded-[24px] p-6 sm:p-8 text-center"
            style={{ boxShadow: '0 4px 0 #E2C700' }}
          >
            <Bookmark size={32} className="mx-auto text-[#6C19E5] mb-2" />
            <h2 className="text-[19px] font-extrabold text-[#260559]">
              No saved question snapshots yet
            </h2>
            <p className="mt-1 text-[14px] font-semibold text-[#5A467A] max-w-[460px] mx-auto">
              Tap <strong>Save</strong> during any Blitz or Smart Practice question to capture a
              full snapshot—either answered (with solution) or unanswered so you can try it later.
            </p>
          </section>
        ) : (
          <div className="space-y-3.5">
            {savedSnapshots.map((snap) => {
              const isOpen = expandedId === snap.snapshotId;
              return (
                <article
                  key={snap.snapshotId}
                  className="bg-white rounded-[22px] p-4 sm:p-5"
                  style={{ boxShadow: '0 4px 0 #E2C700' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : snap.snapshotId)}
                      className="flex-1 min-w-0 text-left cursor-pointer"
                    >
                      <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
                        {snap.wasAnswered ? (
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold inline-flex items-center gap-1 ${
                              snap.isCorrect
                                ? 'bg-[#ECFDF5] text-[#047857]'
                                : 'bg-[#FFF1F2] text-[#BE123C]'
                            }`}
                          >
                            {snap.isCorrect ? (
                              <CheckCircle2 size={12} />
                            ) : (
                              <XCircle size={12} />
                            )}
                            <span>
                              Answered Snapshot ({snap.selectedOption} ·{' '}
                              {snap.isCorrect ? 'Correct' : `Ans: ${snap.answer}`})
                            </span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#FFF8EB] text-[#B45309] text-[11px] font-extrabold inline-flex items-center gap-1">
                            <HelpCircle size={12} />
                            <span>Unanswered Snapshot — Tap to Solve</span>
                          </span>
                        )}

                        <span className="text-[12px] font-extrabold text-[#6C19E5]">
                          {snap.subjectLabel} · {snap.topicLabel}
                        </span>
                      </div>

                      <h3 className="text-[15.5px] font-extrabold text-[#260559] leading-snug">
                        {snap.question}
                      </h3>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        aria-label="Share question snapshot"
                        onClick={() => setShareTarget(snap)}
                        className="w-9 h-9 rounded-[11px] bg-[#EFE6FF] text-[#6C19E5] flex items-center justify-center cursor-pointer"
                      >
                        <Share2 size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label={isOpen ? 'Collapse snapshot' : 'View full snapshot'}
                        onClick={() => setExpandedId(isOpen ? null : snap.snapshotId)}
                        className="w-9 h-9 rounded-[11px] bg-[#F5F0FF] text-[#260559] flex items-center justify-center cursor-pointer"
                      >
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      <button
                        type="button"
                        aria-label="Remove saved snapshot"
                        onClick={() => setSavedSnapshots(removeQuestionSnapshot(snap.snapshotId))}
                        className="w-9 h-9 rounded-[11px] bg-[#FFF1F2] text-[#DC2626] flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-4 pt-3 border-t border-[#F0E9FA]">
                      <QuestionSnapshotCard
                        mode={snap.mode}
                        subjectLabel={snap.subjectLabel}
                        topicLabel={snap.topicLabel}
                        year={snap.year}
                        question={snap.question}
                        options={snap.options}
                        answer={snap.answer}
                        explanationShort={snap.explanationShort}
                        explanationFull={snap.explanationFull}
                        explanationPidgin={snap.explanationPidgin}
                        showAnswerState={snap.wasAnswered}
                        selectedOption={snap.selectedOption}
                        usePidgin={pidgin || snap.explanationStyle === 'pidgin'}
                        onAttemptOption={
                          snap.wasAnswered
                            ? undefined
                            : (option) => {
                                setSavedSnapshots(recordSnapshotAttempt(snap.snapshotId, option));
                              }
                        }
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {shareTarget && (
          <QuestionShareSheet
            open={Boolean(shareTarget)}
            onClose={() => setShareTarget(null)}
            question={{
              id: shareTarget.canonicalQuestionId || shareTarget.questionId,
              subjectCanonical: shareTarget.subjectCanonical,
              subjectLabel: shareTarget.subjectLabel,
              topicLabel: shareTarget.topicLabel,
              question: shareTarget.question,
              options: shareTarget.options,
              answer: shareTarget.answer,
              explanationShort: shareTarget.explanationShort,
              explanationFull: shareTarget.explanationFull,
              explanationPidgin: shareTarget.explanationPidgin,
              year: shareTarget.year,
            }}
            mode={shareTarget.mode}
            wasAnswered={shareTarget.wasAnswered}
            selectedOption={shareTarget.selectedOption}
            usePidgin={pidgin || shareTarget.explanationStyle === 'pidgin'}
          />
        )}
      </main>
    </SabiAppChrome>
  );
}

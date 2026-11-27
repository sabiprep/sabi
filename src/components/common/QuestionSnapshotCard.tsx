import React from 'react';
import { Check, X, Zap } from 'lucide-react';
import type { SnapshotSourceMode } from '../../utils/questionSnapshotStore';

const OPTIONS: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

export interface QuestionSnapshotCardProps {
  mode: SnapshotSourceMode;
  subjectLabel: string;
  topicLabel: string;
  year?: number;
  question: string;
  options: Record<'A' | 'B' | 'C' | 'D', string>;
  answer: 'A' | 'B' | 'C' | 'D';
  explanationShort: string;
  explanationFull: string;
  explanationPidgin: string;
  showAnswerState: boolean;
  selectedOption: 'A' | 'B' | 'C' | 'D' | null;
  usePidgin?: boolean;
  compact?: boolean;
  /** Optional interactive callback so unanswered saved snapshots can be solved inside the Vault */
  onAttemptOption?: (option: 'A' | 'B' | 'C' | 'D') => void;
}

/**
 * Full-display SABI Question Snapshot Card matching the authentic midnight-purple
 * Blitz & Smart Practice interface. Displays either the clean unsolved question
 * OR the complete answered state (selected option, verified correct highlight & explanation).
 */
export function QuestionSnapshotCard({
  mode,
  subjectLabel,
  topicLabel,
  year,
  question,
  options,
  answer,
  explanationShort,
  explanationFull,
  explanationPidgin,
  showAnswerState,
  selectedOption,
  usePidgin = false,
  compact = false,
  onAttemptOption,
}: QuestionSnapshotCardProps) {
  const answeredRight =
    showAnswerState && (selectedOption === null || selectedOption === answer);

  return (
    <div
      className={`rounded-[22px] text-white overflow-hidden border border-white/10 ${
        compact ? 'p-3.5 sm:p-4' : 'p-4 sm:p-5'
      }`}
      style={{
        background: 'linear-gradient(180deg, #240552 0%, #1B033D 60%, #150230 100%)',
        boxShadow: '0 6px 0 #100126',
      }}
    >
      {/* Top Snapshot Header Strip */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-2.5 py-0.5 rounded-full bg-[#FFE51E] text-[#260559] font-extrabold text-[11px] tracking-tight shrink-0">
            {subjectLabel}
          </span>
          <span className="text-[12px] font-bold text-[#D5C3F4] truncate">
            {topicLabel}
            {year ? ` · ${year}` : ''}
          </span>
        </div>

        <span className="px-2.5 py-0.5 rounded-full bg-[#330F69] text-[#FFE51E] font-extrabold text-[10.5px] uppercase tracking-wider inline-flex items-center gap-1 shrink-0">
          <Zap size={10} className="fill-[#FFE51E] text-[#FFE51E]" />
          <span>
            {mode === 'blitz'
              ? 'Blitz'
              : mode === 'custom'
              ? 'Custom Practice'
              : mode === 'cbt'
              ? 'CBT Review'
              : 'Smart Practice'}
          </span>
        </span>
      </div>

      {/* Question Stem */}
      <h3
        className={`font-bold text-white leading-[1.3] whitespace-pre-line mb-3.5 ${
          compact ? 'text-[16px] sm:text-[17.5px]' : 'text-[18px] sm:text-[20px]'
        }`}
        style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
      >
        {question}
      </h3>

      {/* Options A–D */}
      <div className="space-y-2">
        {OPTIONS.map((letter) => {
          const isThisCorrect = letter === answer;
          const isThisSelected = selectedOption === letter;
          const isInteractive = !showAnswerState && Boolean(onAttemptOption);

          let cardBg = 'bg-white text-[#260559]';
          let cardShadow = '0 3px 0 #B69CE8';
          let badgeClass = 'bg-[#F1E8FF] text-[#6C19E5]';

          if (showAnswerState) {
            if (isThisCorrect) {
              cardBg = 'bg-[#10B968] text-white';
              cardShadow = '0 3px 0 #088247';
              badgeClass = 'bg-white text-[#088247]';
            } else if (isThisSelected && !isThisCorrect) {
              cardBg = 'bg-[#E5484D] text-white';
              cardShadow = '0 3px 0 #A82328';
              badgeClass = 'bg-white text-[#A82328]';
            } else {
              cardBg = 'bg-white/45 text-[#260559]/75';
              cardShadow = '0 2px 0 rgba(182, 156, 232, 0.3)';
              badgeClass = 'bg-[#260559]/12 text-[#260559]/70';
            }
          }

          return (
            <button
              key={letter}
              type="button"
              disabled={!isInteractive}
              onClick={() => isInteractive && onAttemptOption?.(letter)}
              className={`w-full rounded-[14px] px-3 py-2.5 flex items-center justify-between gap-2.5 text-left transition-transform ${
                isInteractive ? 'cursor-pointer active:translate-y-[1px] hover:bg-[#FCF9FF]' : 'cursor-default'
              } ${cardBg}`}
              style={{ boxShadow: cardShadow }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-7 h-7 rounded-[9px] flex items-center justify-center font-extrabold text-[12.5px] shrink-0 ${badgeClass}`}
                >
                  {letter}
                </span>
                <span className="text-[13.5px] sm:text-[14.5px] font-extrabold leading-snug">
                  {options[letter]}
                </span>
              </div>

              {showAnswerState && isThisCorrect && (
                <Check size={17} strokeWidth={3} className="text-white shrink-0" />
              )}
              {showAnswerState && isThisSelected && !isThisCorrect && (
                <X size={17} strokeWidth={3} className="text-white shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Snapshot State Banner */}
      {showAnswerState ? (
        <div
          className={`mt-3.5 rounded-[16px] px-3.5 py-3 text-[#1D0547] ${
            answeredRight ? 'bg-[#B7F7D4]' : 'bg-[#FFD9DC]'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[12.5px] font-extrabold">
              {selectedOption === null
                ? `Correct Answer: Option ${answer}`
                : answeredRight
                ? `You picked ${selectedOption} · Correct!`
                : `You picked ${selectedOption} · Correct is ${answer}`}
            </span>
          </div>
          <p className="text-[12.5px] sm:text-[13px] font-semibold leading-snug text-[#240B52]">
            {usePidgin
              ? explanationPidgin
              : compact
              ? explanationShort
              : explanationFull}
          </p>
        </div>
      ) : (
        <div className="mt-3.5 rounded-[14px] bg-[#FFE824] px-3.5 py-2.5 text-[#260559] flex items-center justify-between gap-2">
          <span className="text-[12px] font-extrabold">
            {onAttemptOption
              ? 'Unanswered snapshot — tap an option above to solve!'
              : 'Challenge Snapshot — tap the shared link to answer!'}
          </span>
        </div>
      )}
    </div>
  );
}

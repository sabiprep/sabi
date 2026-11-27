import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Link2,
  MessageCircle,
  Share2,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { PracticeFeedQuestion } from '../../utils/smartPracticeSession';
import {
  buildQuestionShareCopy,
  copyTextReliably,
  normalizeCanonicalQuestionId,
  renderQuestionSnapshotPng,
  saveSnapshotImageToDevice,
  shareSnapshotNativeOrWeb,
  type SnapshotSourceMode,
} from '../../utils/questionSnapshotStore';
import { QuestionSnapshotCard } from './QuestionSnapshotCard';

interface QuestionShareSheetProps {
  open: boolean;
  onClose: () => void;
  question: PracticeFeedQuestion & { year?: number };
  mode: SnapshotSourceMode;
  wasAnswered: boolean;
  selectedOption: 'A' | 'B' | 'C' | 'D' | null;
  usePidgin?: boolean;
}

/**
 * Standard SABI Share Snapshot Sheet
 * Captures the exact display state (answered with solution OR clean unanswered challenge),
 * generates a high-resolution PNG snapshot, and shares/saves reliably on both
 * Android Capacitor APK (native Share/Filesystem) and Desktop/Mobile WebApp.
 */
export function QuestionShareSheet({
  open,
  onClose,
  question,
  mode,
  wasAnswered,
  selectedOption,
  usePidgin = false,
}: QuestionShareSheetProps) {
  const navigate = useNavigate();

  // Default to matching the exact display state at the moment Share was tapped:
  // answered questions include the answer & explanation (with 1-tap toggle to Challenge Mode).
  const [includeAnswerInSnapshot, setIncludeAnswerInSnapshot] = useState(wasAnswered);
  const [copiedLink, setCopiedLink] = useState(false);
  const [busyAction, setBusyAction] = useState<'share' | 'download' | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setIncludeAnswerInSnapshot(wasAnswered);
      setCopiedLink(false);
      setStatusNote(null);
    }
  }, [open, question.id, wasAnswered]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const shareBundle = useMemo(
    () =>
      buildQuestionShareCopy({
        questionId: question.id,
        subjectLabel: question.subjectLabel,
        topicLabel: question.topicLabel,
        questionText: question.question,
        mode,
      }),
    [mode, question.id, question.question, question.subjectLabel, question.topicLabel]
  );

  if (!open) return null;

  const showNotice = (msg: string) => {
    if (!msg) return;
    setStatusNote(msg);
    window.setTimeout(() => {
      setStatusNote((prev) => (prev === msg ? null : prev));
    }, 3400);
  };

  const handleCopyLink = async () => {
    const copied = await copyTextReliably(shareBundle.url);
    if (copied) {
      setCopiedLink(true);
      showNotice('Direct question link copied! Anyone who taps it opens this question directly.');
      window.setTimeout(() => setCopiedLink(false), 2200);
    } else {
      showNotice('Tap and hold the link box above to copy and share on any platform.');
    }
  };

  const handleDownloadSnapshot = async () => {
    setBusyAction('download');
    try {
      const rendered = await renderQuestionSnapshotPng({
        question,
        mode,
        includeAnswer: wasAnswered && includeAnswerInSnapshot,
        selectedOption,
        explanationStyle: usePidgin ? 'pidgin' : 'english',
        shareUrl: shareBundle.url,
      });
      if (!rendered) {
        showNotice('Could not generate PNG snapshot in this browser.');
        return;
      }
      const outcome = await saveSnapshotImageToDevice(rendered);
      showNotice(outcome.message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleNativeShare = async () => {
    setBusyAction('share');
    try {
      const rendered = await renderQuestionSnapshotPng({
        question,
        mode,
        includeAnswer: wasAnswered && includeAnswerInSnapshot,
        selectedOption,
        explanationStyle: usePidgin ? 'pidgin' : 'english',
        shareUrl: shareBundle.url,
      });

      const outcome = await shareSnapshotNativeOrWeb({
        rendered,
        title: `SABI JAMB ${question.subjectLabel}`,
        text: shareBundle.text,
        url: shareBundle.url,
      });

      if (!outcome.cancelled && outcome.message) {
        if (outcome.ok && outcome.message.toLowerCase().includes('copied')) {
          setCopiedLink(true);
          window.setTimeout(() => setCopiedLink(false), 2200);
        }
        showNotice(outcome.message);
      }
    } finally {
      setBusyAction(null);
    }
  };

  const canonicalId = normalizeCanonicalQuestionId(question.id) || question.id;
  const previewRelativePath = `/q/${encodeURIComponent(canonicalId)}?mode=${encodeURIComponent(
    mode
  )}&src=preview`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share SABI Question Snapshot"
      className="fixed inset-0 z-50 bg-[#14022C]/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-2.5 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] max-h-[92dvh] rounded-[28px] bg-[#FFE824] text-[#260559] flex flex-col overflow-hidden shadow-[0_20px_56px_rgba(10,2,24,0.55)]"
        style={{
          background: 'linear-gradient(180deg, #FFEC2E 0%, #FFE51E 100%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-5 pt-4 pb-3 flex items-center justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <h2
              className="text-[20px] sm:text-[22px] font-bold text-[#260559] leading-tight"
              style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
            >
              Share Question Snapshot
            </h2>
            <p className="text-[12px] font-bold text-[#4F3B73]">
              Friends tap the link to answer this exact question in full view
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share sheet"
            className="w-10 h-10 rounded-[13px] bg-white text-[#260559] flex items-center justify-center shrink-0 cursor-pointer"
            style={{ boxShadow: '0 3px 0 #E2C700' }}
          >
            <X size={19} strokeWidth={2.7} />
          </button>
        </div>

        {/* Scrollable Snapshot Preview + Controls */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 pb-4 space-y-3.5">
          {/* Toggle Answer Visibility if already answered */}
          {wasAnswered && (
            <div className="rounded-[16px] bg-white px-3.5 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {includeAnswerInSnapshot ? (
                  <Eye size={16} className="text-[#6C19E5] shrink-0" />
                ) : (
                  <EyeOff size={16} className="text-[#6C19E5] shrink-0" />
                )}
                <span className="text-[12.5px] font-extrabold text-[#260559] truncate">
                  {includeAnswerInSnapshot
                    ? 'Showing your answered display & solution'
                    : 'Challenge mode (hides answer for friends)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIncludeAnswerInSnapshot((prev) => !prev)}
                className="px-3 py-1 rounded-full bg-[#F3EEFD] hover:bg-[#E7DCFA] text-[#6C19E5] text-[11.5px] font-extrabold shrink-0 cursor-pointer"
              >
                {includeAnswerInSnapshot ? 'Hide Answer' : 'Show Answer'}
              </button>
            </div>
          )}

          {/* Full-Display Snapshot Preview */}
          <QuestionSnapshotCard
            mode={mode}
            subjectLabel={question.subjectLabel}
            topicLabel={question.topicLabel}
            year={question.year}
            question={question.question}
            options={question.options}
            answer={question.answer}
            explanationShort={question.explanationShort}
            explanationFull={question.explanationFull}
            explanationPidgin={question.explanationPidgin}
            showAnswerState={wasAnswered && includeAnswerInSnapshot}
            selectedOption={selectedOption}
            usePidgin={usePidgin}
            compact
          />

          {/* Direct Shareable Link Box */}
          <div
            className="rounded-[18px] bg-white p-3 space-y-2"
            style={{ boxShadow: '0 3.5px 0 #E2C700' }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-[#5A467A] inline-flex items-center gap-1">
                <Link2 size={12} className="text-[#6C19E5]" />
                <span>Direct Question Link</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(previewRelativePath);
                }}
                className="text-[11.5px] font-extrabold text-[#6C19E5] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Preview full view</span>
                <ExternalLink size={11} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 rounded-[12px] bg-[#F7F3FF] border border-[#E5D7FA] px-3 py-2 text-[12.5px] font-bold text-[#260559] truncate select-all">
                {shareBundle.url}
              </div>
              <button
                type="button"
                onClick={() => void handleCopyLink()}
                className="px-3.5 py-2 rounded-[12px] bg-[#2A085E] text-[#FFE824] text-[12px] font-extrabold inline-flex items-center gap-1 shrink-0 cursor-pointer"
              >
                {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {statusNote && (
            <div className="rounded-[14px] bg-[#2A085E] text-[#FFE824] px-3.5 py-2.5 text-[12px] font-bold text-center">
              {statusNote}
            </div>
          )}

          {/* Primary Share Actions */}
          <div className="space-y-2.5 pt-0.5">
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => void handleNativeShare()}
              className="w-full py-3.5 px-4 rounded-[18px] bg-[#6C19E5] hover:brightness-105 disabled:opacity-60 text-white font-extrabold text-[15px] inline-flex items-center justify-center gap-2 cursor-pointer active:translate-y-[1px]"
              style={{
                fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                boxShadow: '0 4px 0 #46099E',
              }}
            >
              <Share2 size={18} />
              <span>
                {busyAction === 'share'
                  ? 'Preparing Snapshot...'
                  : 'Share Snapshot & Link'}
              </span>
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => void handleDownloadSnapshot()}
                className="py-3 px-3 rounded-[16px] bg-white hover:bg-[#FFFDF4] text-[#260559] font-extrabold text-[13px] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                style={{ boxShadow: '0 3.5px 0 #E2C700' }}
              >
                <Download size={15} className="text-[#6C19E5]" />
                <span>{busyAction === 'download' ? 'Saving...' : 'Save PNG Image'}</span>
              </button>

              <a
                href={shareBundle.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-3 rounded-[16px] bg-[#059669] hover:brightness-105 text-white font-extrabold text-[13px] inline-flex items-center justify-center gap-1.5"
                style={{ boxShadow: '0 3.5px 0 #047857' }}
              >
                <MessageCircle size={15} />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

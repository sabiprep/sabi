import { SEED_QUESTIONS } from '../data/questions';
import type { Question } from '../types';
import {
  getCuratedStarterQuestions,
  getShortSubjectLabel,
  loadSavedQuestionIds,
  type PracticeFeedQuestion,
} from './smartPracticeSession';

export type SnapshotSourceMode = 'blitz' | 'smart' | 'custom' | 'cbt';

export interface QuestionSnapshotRecord {
  snapshotId: string;
  questionId: string;
  canonicalQuestionId: string;
  mode: SnapshotSourceMode;
  subjectCanonical: string;
  subjectLabel: string;
  topicLabel: string;
  year?: number;
  question: string;
  options: Record<'A' | 'B' | 'C' | 'D', string>;
  answer: 'A' | 'B' | 'C' | 'D';
  explanationShort: string;
  explanationFull: string;
  explanationPidgin: string;
  /** True when the question was already answered at the moment it was saved */
  wasAnswered: boolean;
  selectedOption: 'A' | 'B' | 'C' | 'D' | null;
  isCorrect: boolean | null;
  explanationStyle: 'english' | 'pidgin';
  savedAt: string;
}

export interface SaveSnapshotInput {
  question: PracticeFeedQuestion & { year?: number };
  mode: SnapshotSourceMode;
  wasAnswered: boolean;
  selectedOption: 'A' | 'B' | 'C' | 'D' | null;
  isCorrect: boolean | null;
  explanationStyle?: 'english' | 'pidgin';
}

const SNAPSHOTS_STORAGE_KEY = 'sabi_question_snapshots_v1';
const SAVED_IDS_STORAGE_KEY = 'sabi_saved_question_ids_v1';
const MAX_SNAPSHOTS = 100;

/**
 * Strips synthetic repetition suffixes (e.g. `-loop1`, `-y2`) and sanitizes raw
 * question IDs from URLs so public routes only accept clean alphanumeric IDs.
 */
export function normalizeCanonicalQuestionId(rawId: string): string {
  const trimmed = String(rawId || '').trim();
  if (!trimmed) return '';
  const withoutLoop = trimmed.replace(/-(?:loop|y)\d+$/i, '');
  const safe = withoutLoop.replace(/[^A-Za-z0-9_-]/g, '');
  return safe.slice(0, 80);
}

function normalizeSeedQuestion(q: Question): PracticeFeedQuestion & { year?: number } {
  return {
    id: q.id,
    subjectCanonical: q.subject,
    subjectLabel: getShortSubjectLabel(q.subject),
    topicLabel: q.topic || q.subtopic || 'Core Syllabus',
    question: q.question,
    options: q.options,
    answer: q.answer,
    explanationShort:
      q.explanation_short ||
      `Option ${q.answer} is correct based on the official JAMB ${q.subject} syllabus.`,
    explanationFull:
      q.explanation ||
      q.explanation_short ||
      `Option ${q.answer} is the verified JAMB answer for ${q.topic || q.subject}.`,
    explanationPidgin:
      q.explanation_pidgin ||
      `Na Option ${q.answer} be the correct answer for dis ${q.subject} question.`,
    year: q.year,
  };
}

/**
 * Resolves any public shared question ID against both Curated Blitz/Smart Practice
 * starters and the full JAMB SEED_QUESTIONS bank. Returns null if not found.
 */
export function resolvePublicQuestionById(
  rawId: string
): (PracticeFeedQuestion & { year?: number }) | null {
  const cleanedRaw = String(rawId || '').trim();
  const canonical = normalizeCanonicalQuestionId(cleanedRaw);
  if (!canonical) return null;

  const curated = getCuratedStarterQuestions();
  const curatedMatch = curated.find(
    (q) =>
      q.id.toLowerCase() === cleanedRaw.toLowerCase() ||
      q.id.toLowerCase() === canonical.toLowerCase()
  );
  if (curatedMatch) return { ...curatedMatch };

  const seedMatch = SEED_QUESTIONS.find(
    (q) =>
      q.id.toLowerCase() === cleanedRaw.toLowerCase() ||
      q.id.toLowerCase() === canonical.toLowerCase()
  );
  if (seedMatch) return normalizeSeedQuestion(seedMatch);

  return null;
}

function syncLegacySavedIds(snapshots: QuestionSnapshotRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    const ids = Array.from(new Set(snapshots.map((s) => s.canonicalQuestionId || s.questionId)));
    localStorage.setItem(SAVED_IDS_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

function writeSnapshots(snapshots: QuestionSnapshotRecord[]): QuestionSnapshotRecord[] {
  const trimmed = snapshots.slice(0, MAX_SNAPSHOTS);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(trimmed));
      syncLegacySavedIds(trimmed);
    } catch {
      // ignore storage quota errors
    }
  }
  return trimmed;
}

/**
 * Loads all saved Question Snapshots (newest first).
 * Automatically hydrates any legacy ID-only bookmarks as clean unanswered snapshots.
 */
export function loadSavedQuestionSnapshots(): QuestionSnapshotRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
    const stored: QuestionSnapshotRecord[] = raw ? JSON.parse(raw) : [];
    const validStored = Array.isArray(stored)
      ? stored.filter(
          (item): item is QuestionSnapshotRecord =>
            Boolean(item) &&
            typeof item.questionId === 'string' &&
            typeof item.question === 'string' &&
            Boolean(item.options)
        )
      : [];

    const existingIds = new Set(
      validStored.flatMap((s) => [s.questionId, s.canonicalQuestionId].filter(Boolean))
    );

    const legacyIds = loadSavedQuestionIds();
    const hydratedLegacy: QuestionSnapshotRecord[] = [];
    for (const id of legacyIds) {
      const canonical = normalizeCanonicalQuestionId(id);
      if (!canonical || existingIds.has(id) || existingIds.has(canonical)) continue;
      const resolved = resolvePublicQuestionById(canonical);
      if (!resolved) continue;
      existingIds.add(canonical);
      hydratedLegacy.push({
        snapshotId: `snap-${canonical}`,
        questionId: resolved.id,
        canonicalQuestionId: canonical,
        mode: 'smart',
        subjectCanonical: resolved.subjectCanonical,
        subjectLabel: resolved.subjectLabel,
        topicLabel: resolved.topicLabel,
        year: resolved.year,
        question: resolved.question,
        options: resolved.options,
        answer: resolved.answer,
        explanationShort: resolved.explanationShort,
        explanationFull: resolved.explanationFull,
        explanationPidgin: resolved.explanationPidgin,
        wasAnswered: false,
        selectedOption: null,
        isCorrect: null,
        explanationStyle: 'english',
        savedAt: new Date().toISOString(),
      });
    }

    const merged = [...validStored, ...hydratedLegacy].sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    );
    if (hydratedLegacy.length > 0) {
      writeSnapshots(merged);
    }
    return merged;
  } catch {
    return [];
  }
}

export function isQuestionSnapshotSaved(questionId: string): boolean {
  const canonical = normalizeCanonicalQuestionId(questionId);
  if (!canonical) return false;
  return loadSavedQuestionSnapshots().some(
    (s) => s.canonicalQuestionId === canonical || s.questionId === questionId
  );
}

/**
 * Toggles or upgrades a Question Snapshot:
 * - Not saved yet -> captures a full snapshot of current display state (answered or unanswered).
 * - Already saved unanswered, now answered -> upgrades the snapshot to include the answer & explanation!
 * - Already saved in the same state -> removes the snapshot.
 */
export function toggleQuestionSnapshot(input: SaveSnapshotInput): {
  action: 'saved' | 'updated' | 'removed';
  snapshot: QuestionSnapshotRecord | null;
  all: QuestionSnapshotRecord[];
} {
  const canonical = normalizeCanonicalQuestionId(input.question.id) || input.question.id;
  const current = loadSavedQuestionSnapshots();
  const existingIdx = current.findIndex(
    (s) => s.canonicalQuestionId === canonical || s.questionId === input.question.id
  );

  const buildRecord = (): QuestionSnapshotRecord => ({
    snapshotId: `snap-${canonical}-${Date.now()}`,
    questionId: input.question.id,
    canonicalQuestionId: canonical,
    mode: input.mode,
    subjectCanonical: input.question.subjectCanonical,
    subjectLabel: input.question.subjectLabel,
    topicLabel: input.question.topicLabel,
    year: input.question.year,
    question: input.question.question,
    options: input.question.options,
    answer: input.question.answer,
    explanationShort: input.question.explanationShort,
    explanationFull: input.question.explanationFull,
    explanationPidgin: input.question.explanationPidgin,
    wasAnswered: Boolean(input.wasAnswered && input.selectedOption),
    selectedOption: input.wasAnswered ? input.selectedOption : null,
    isCorrect: input.wasAnswered ? input.isCorrect : null,
    explanationStyle: input.explanationStyle || 'english',
    savedAt: new Date().toISOString(),
  });

  if (existingIdx !== -1) {
    const existing = current[existingIdx];
    // Upgrade unanswered snapshot into answered snapshot when user saves again after answering
    if (!existing.wasAnswered && input.wasAnswered && input.selectedOption) {
      const upgraded = buildRecord();
      const others = current.filter((_, i) => i !== existingIdx);
      const savedList = writeSnapshots([upgraded, ...others]);
      return { action: 'updated', snapshot: upgraded, all: savedList };
    }

    const remaining = current.filter((_, i) => i !== existingIdx);
    const savedList = writeSnapshots(remaining);
    return { action: 'removed', snapshot: null, all: savedList };
  }

  const created = buildRecord();
  const savedList = writeSnapshots([created, ...current]);
  return { action: 'saved', snapshot: created, all: savedList };
}

export function removeQuestionSnapshot(questionIdOrSnapshotId: string): QuestionSnapshotRecord[] {
  const canonical = normalizeCanonicalQuestionId(questionIdOrSnapshotId);
  const remaining = loadSavedQuestionSnapshots().filter(
    (s) =>
      s.snapshotId !== questionIdOrSnapshotId &&
      s.questionId !== questionIdOrSnapshotId &&
      s.canonicalQuestionId !== canonical
  );
  return writeSnapshots(remaining);
}

/**
 * Allows a student opening an unanswered snapshot in the Saved Vault to attempt it
 * and persist the answered display state.
 */
export function recordSnapshotAttempt(
  snapshotId: string,
  selectedOption: 'A' | 'B' | 'C' | 'D'
): QuestionSnapshotRecord[] {
  const current = loadSavedQuestionSnapshots();
  const next = current.map((s) =>
    s.snapshotId === snapshotId
      ? {
          ...s,
          wasAnswered: true,
          selectedOption,
          isCorrect: selectedOption === s.answer,
          savedAt: new Date().toISOString(),
        }
      : s
  );
  return writeSnapshots(next);
}

/**
 * Returns the public base URL used for external share links.
 * Uses VITE_PUBLIC_WEB_URL when configured (critical for Capacitor Android APK where
 * window.location.origin is https://localhost), falling back to window.location.origin on Web.
 */
export function getPublicShareOrigin(): string {
  const envUrl =
    (typeof import.meta !== 'undefined' &&
      (import.meta as any).env?.VITE_PUBLIC_WEB_URL) ||
    '';
  const cleanedEnv = String(envUrl).trim().replace(/\/+$/, '');
  if (cleanedEnv && /^https?:\/\//i.test(cleanedEnv)) {
    return cleanedEnv;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return 'https://sabi.ng';
}

/**
 * Optional Google Play Store URL (set via VITE_PLAY_STORE_URL once Android listing is published).
 * Empty string defaults cleanly to the WebApp Sign-Up flow.
 */
export function getPlayStoreAppUrl(): string {
  const raw =
    (typeof import.meta !== 'undefined' &&
      (import.meta as any).env?.VITE_PLAY_STORE_URL) ||
    '';
  const trimmed = String(raw).trim();
  return /^https:\/\/play\.google\.com\//i.test(trimmed) ? trimmed : '';
}

export function buildQuestionShareUrl(
  questionId: string,
  mode: SnapshotSourceMode = 'blitz',
  originOverride?: string
): string {
  const canonical = normalizeCanonicalQuestionId(questionId) || questionId;
  const origin = (originOverride || getPublicShareOrigin()).replace(/\/+$/, '');
  return `${origin}/q/${encodeURIComponent(canonical)}?mode=${encodeURIComponent(mode)}&src=share`;
}

export function buildQuestionShareCopy(params: {
  questionId: string;
  subjectLabel: string;
  topicLabel: string;
  questionText: string;
  mode: SnapshotSourceMode;
  originOverride?: string;
}): { url: string; text: string; whatsappUrl: string } {
  const url = buildQuestionShareUrl(params.questionId, params.mode, params.originOverride);
  const shortStem =
    params.questionText.length > 120
      ? `${params.questionText.slice(0, 118).trimEnd()}…`
      : params.questionText;
  const text = `SABI JAMB ${params.subjectLabel} (${params.topicLabel}) Challenge:\n"${shortStem}"\n\nTap to answer this question on SABI:\n${url}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  return { url, text, whatsappUrl };
}

// =============================================================================
// CANVAS PNG SNAPSHOT RENDERER (1080x1350 Crisp Branded Social Card)
// =============================================================================

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s+\S*$/, '')}…`;
  }
  return lines;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Generates a high-resolution PNG snapshot of the full SABI question & answer card
 * ready for external sharing (WhatsApp, X, Telegram, Instagram) or direct download.
 */
export async function renderQuestionSnapshotPng(params: {
  question: PracticeFeedQuestion & { year?: number };
  mode: SnapshotSourceMode;
  includeAnswer: boolean;
  selectedOption: 'A' | 'B' | 'C' | 'D' | null;
  explanationStyle?: 'english' | 'pidgin';
  shareUrl: string;
}): Promise<{ dataUrl: string; blob: Blob | null; filename: string } | null> {
  if (typeof document === 'undefined') return null;

  const width = 1080;
  const height = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Background Midnight Purple Gradient (matches Screen 8 Blitz/Smart Practice)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#23054F');
  bgGrad.addColorStop(0.55, '#1B033D');
  bgGrad.addColorStop(1, '#14022E');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Decorative ambient circles
  ctx.fillStyle = 'rgba(113, 26, 227, 0.24)';
  ctx.beginPath();
  ctx.arc(width - 60, 260, 220, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(113, 26, 227, 0.22)';
  ctx.lineWidth = 34;
  ctx.beginPath();
  ctx.arc(40, height - 240, 170, 0, Math.PI * 2);
  ctx.stroke();

  const padX = 68;
  const contentW = width - padX * 2;

  // 2. Top Brand Strip
  drawRoundedRect(ctx, padX, 56, 200, 62, 18);
  ctx.fillStyle = '#FFE824';
  ctx.fill();
  ctx.fillStyle = '#260559';
  ctx.font = '800 32px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('SABI', padX + 26, 98);
  ctx.font = '800 18px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = '#6C19E5';
  ctx.fillText('JAMB', padX + 118, 95);

  const modeLabel = params.mode === 'blitz' ? 'BLITZ SNAPSHOT' : 'SMART PRACTICE';
  drawRoundedRect(ctx, width - padX - 270, 62, 270, 50, 25);
  ctx.fillStyle = '#320D68';
  ctx.fill();
  ctx.fillStyle = '#FFE51E';
  ctx.font = '800 20px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(modeLabel, width - padX - 135, 94);
  ctx.textAlign = 'left';

  // 3. Subject Pill & Topic
  const subjectText = params.question.subjectLabel.toUpperCase();
  ctx.font = '800 22px "Plus Jakarta Sans", system-ui, sans-serif';
  const pillW = Math.min(340, ctx.measureText(subjectText).width + 48);
  drawRoundedRect(ctx, padX, 152, pillW, 48, 24);
  ctx.fillStyle = '#FFE51E';
  ctx.fill();
  ctx.fillStyle = '#260559';
  ctx.fillText(subjectText, padX + 24, 184);

  ctx.fillStyle = '#D5C3F4';
  ctx.font = '700 24px "Plus Jakarta Sans", system-ui, sans-serif';
  const topicMeta = `${params.question.topicLabel}${
    params.question.year ? ` · UTME ${params.question.year}` : ''
  }`;
  ctx.fillText(topicMeta.slice(0, 42), padX + pillW + 20, 184);

  // 4. Question Stem
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 40px "Plus Jakarta Sans", system-ui, sans-serif';
  const questionLines = wrapCanvasText(ctx, params.question.question, contentW, 5);
  let cursorY = 266;
  for (const line of questionLines) {
    ctx.fillText(line, padX, cursorY);
    cursorY += 54;
  }

  // 5. Options A–D
  cursorY = Math.max(cursorY + 22, 460);
  const letters: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  const optionH = 104;
  const optionGap = 20;

  for (const letter of letters) {
    const isCorrectOpt = letter === params.question.answer;
    const isSelectedOpt = params.selectedOption === letter;

    let cardBg = '#FFFFFF';
    let shadowColor = '#A88EE0';
    let textColor = '#260559';
    let badgeBg = '#F1E8FF';
    let badgeText = '#6C19E5';

    if (params.includeAnswer) {
      if (isCorrectOpt) {
        cardBg = '#10B968';
        shadowColor = '#088247';
        textColor = '#FFFFFF';
        badgeBg = '#FFFFFF';
        badgeText = '#088247';
      } else if (isSelectedOpt) {
        cardBg = '#E5484D';
        shadowColor = '#A82328';
        textColor = '#FFFFFF';
        badgeBg = '#FFFFFF';
        badgeText = '#A82328';
      } else {
        cardBg = 'rgba(255,255,255,0.42)';
        shadowColor = 'rgba(168,142,224,0.3)';
        textColor = '#260559';
        badgeBg = 'rgba(38,5,89,0.12)';
        badgeText = '#260559';
      }
    }

    // Shadow layer
    drawRoundedRect(ctx, padX, cursorY + 7, contentW, optionH, 24);
    ctx.fillStyle = shadowColor;
    ctx.fill();

    // Card surface
    drawRoundedRect(ctx, padX, cursorY, contentW, optionH, 24);
    ctx.fillStyle = cardBg;
    ctx.fill();

    // Letter Badge
    drawRoundedRect(ctx, padX + 22, cursorY + 24, 56, 56, 16);
    ctx.fillStyle = badgeBg;
    ctx.fill();
    ctx.fillStyle = badgeText;
    ctx.font = '800 28px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(letter, padX + 50, cursorY + 62);
    ctx.textAlign = 'left';

    // Option text (up to 2 lines)
    ctx.fillStyle = textColor;
    ctx.font = '700 27px "Plus Jakarta Sans", system-ui, sans-serif';
    const optLines = wrapCanvasText(ctx, params.question.options[letter], contentW - 140, 2);
    if (optLines.length === 1) {
      ctx.fillText(optLines[0], padX + 98, cursorY + 62);
    } else {
      ctx.fillText(optLines[0], padX + 98, cursorY + 46);
      ctx.fillText(optLines[1], padX + 98, cursorY + 80);
    }

    cursorY += optionH + optionGap;
  }

  // 6. Bottom Panel: Explanation (if answered) OR Challenge CTA (if unanswered)
  const panelY = Math.max(cursorY + 12, 980);
  const panelH = 220;
  if (params.includeAnswer) {
    const answeredRight =
      params.selectedOption === null || params.selectedOption === params.question.answer;
    drawRoundedRect(ctx, padX, panelY, contentW, panelH, 26);
    ctx.fillStyle = answeredRight ? '#B7F7D4' : '#FFD9DC';
    ctx.fill();

    ctx.fillStyle = '#1D0547';
    ctx.font = '800 28px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(
      `Answer: Option ${params.question.answer}`,
      padX + 28,
      panelY + 48
    );

    const exp =
      params.explanationStyle === 'pidgin'
        ? params.question.explanationPidgin
        : params.question.explanationShort;
    ctx.font = '600 24px "Plus Jakarta Sans", system-ui, sans-serif';
    const expLines = wrapCanvasText(ctx, exp, contentW - 56, 4);
    let expY = panelY + 90;
    for (const l of expLines) {
      ctx.fillText(l, padX + 28, expY);
      expY += 34;
    }
  } else {
    drawRoundedRect(ctx, padX, panelY + 10, contentW, 180, 26);
    ctx.fillStyle = '#FFE824';
    ctx.fill();

    ctx.fillStyle = '#260559';
    ctx.font = '800 32px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('Think you sabi the answer?', padX + 32, panelY + 74);

    ctx.font = '700 24px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = '#4B2882';
    ctx.fillText(
      'Tap the SABI question link to pick A, B, C, or D and check your score!',
      padX + 32,
      panelY + 122
    );
  }

  // 7. Footer URL Strip
  ctx.fillStyle = '#C9B5F5';
  ctx.font = '700 21px "Plus Jakarta Sans", system-ui, sans-serif';
  const cleanDisplayUrl = params.shareUrl.replace(/^https?:\/\//i, '').slice(0, 68);
  ctx.fillText(`Play on SABI → ${cleanDisplayUrl}`, padX, height - 48);

  const dataUrl = canvas.toDataURL('image/png');
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png')
  );
  const canonical = normalizeCanonicalQuestionId(params.question.id) || 'question';
  return {
    dataUrl,
    blob,
    filename: `sabi-${canonical.toLowerCase()}.png`,
  };
}

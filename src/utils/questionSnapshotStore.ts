import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { SEED_QUESTIONS } from '../data/questions';
import type { Question } from '../types';
import { apiFetch, apiPostJson, getAccessToken, isPreviewProxyHost, resolveApiUrl } from './apiClient';
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

export interface RenderedSnapshotImage {
  dataUrl: string;
  base64Data: string;
  blob: Blob | null;
  filename: string;
}

export interface PublicSharedQuestionPayload {
  id: string;
  subjectCanonical: string;
  subjectLabel: string;
  topicLabel: string;
  year?: number;
  question: string;
  options: Record<'A' | 'B' | 'C' | 'D', string>;
}

export interface PublicAnswerCheckResult {
  questionId: string;
  selectedOption: 'A' | 'B' | 'C' | 'D';
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  isCorrect: boolean;
  explanationShort: string;
  explanationFull: string;
  explanationPidgin: string;
}

const SNAPSHOTS_STORAGE_KEY = 'sabi_question_snapshots_v1';
const SAVED_IDS_STORAGE_KEY = 'sabi_saved_question_ids_v1';
const MAX_SNAPSHOTS = 100;
const FALLBACK_PUBLIC_WEB_ORIGIN = 'https://sabi-tan.vercel.app';

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
 * starters and the full JAMB SEED_QUESTIONS bank. Returns null if not found locally.
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

/**
 * Fetches a shared question from the live backend (`/api/public/questions/:id`)
 * which checks Supabase `question_bank` first and falls back to curated/seed banks.
 */
export async function fetchPublicQuestionFromServer(
  rawId: string
): Promise<PublicSharedQuestionPayload | null> {
  const canonical = normalizeCanonicalQuestionId(rawId);
  if (!canonical) return null;

  try {
    const res = await fetch(resolveApiUrl(`/api/public/questions/${encodeURIComponent(canonical)}`), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const q = data?.question;
    if (q && typeof q.id === 'string' && typeof q.question === 'string' && q.options) {
      return q as PublicSharedQuestionPayload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Verifies a visitor's answer on a public shared question via the backend
 * (`/api/public/questions/:id/check`), so answer keys are never leaked before answering.
 */
export async function checkPublicQuestionAnswerOnServer(
  rawId: string,
  selectedOption: 'A' | 'B' | 'C' | 'D'
): Promise<PublicAnswerCheckResult | null> {
  const canonical = normalizeCanonicalQuestionId(rawId);
  if (!canonical) return null;

  try {
    const res = await fetch(
      resolveApiUrl(`/api/public/questions/${encodeURIComponent(canonical)}/check`),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ selectedOption }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data && typeof data.correctAnswer === 'string') {
      return data as PublicAnswerCheckResult;
    }
    return null;
  } catch {
    return null;
  }
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
 * Toggles or upgrades a Question Snapshot locally (instant response) and triggers
 * cross-device Supabase sync whenever the student is authenticated.
 * - Not saved yet -> captures a full snapshot of current display state (answered or unanswered).
 * - Already saved unanswered, now answered -> upgrades the snapshot to include answer & explanation.
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
      void syncUpsertSnapshotToServer(upgraded);
      return { action: 'updated', snapshot: upgraded, all: savedList };
    }

    const remaining = current.filter((_, i) => i !== existingIdx);
    const savedList = writeSnapshots(remaining);
    void syncDeleteSnapshotFromServer(canonical);
    return { action: 'removed', snapshot: null, all: savedList };
  }

  const created = buildRecord();
  const savedList = writeSnapshots([created, ...current]);
  void syncUpsertSnapshotToServer(created);
  return { action: 'saved', snapshot: created, all: savedList };
}

export function removeQuestionSnapshot(questionIdOrSnapshotId: string): QuestionSnapshotRecord[] {
  const current = loadSavedQuestionSnapshots();
  const canonical = normalizeCanonicalQuestionId(questionIdOrSnapshotId);
  const removed = current.find(
    (s) =>
      s.snapshotId === questionIdOrSnapshotId ||
      s.questionId === questionIdOrSnapshotId ||
      s.canonicalQuestionId === canonical
  );
  const remaining = current.filter(
    (s) =>
      s.snapshotId !== questionIdOrSnapshotId &&
      s.questionId !== questionIdOrSnapshotId &&
      s.canonicalQuestionId !== canonical
  );
  if (removed?.canonicalQuestionId) {
    void syncDeleteSnapshotFromServer(removed.canonicalQuestionId);
  }
  return writeSnapshots(remaining);
}

/**
 * Allows a student opening an unanswered snapshot in the Saved Vault to attempt it
 * and persist the answered display state locally and to Supabase.
 */
export function recordSnapshotAttempt(
  snapshotId: string,
  selectedOption: 'A' | 'B' | 'C' | 'D'
): QuestionSnapshotRecord[] {
  const current = loadSavedQuestionSnapshots();
  let targetCanonical: string | null = null;
  const next = current.map((s) => {
    if (s.snapshotId === snapshotId) {
      targetCanonical = s.canonicalQuestionId;
      return {
        ...s,
        wasAnswered: true,
        selectedOption,
        isCorrect: selectedOption === s.answer,
        savedAt: new Date().toISOString(),
      };
    }
    return s;
  });
  if (targetCanonical) {
    void syncAttemptSnapshotToServer(targetCanonical, selectedOption);
  }
  return writeSnapshots(next);
}

// =============================================================================
// CROSS-DEVICE CLOUD SYNC (Supabase via `/api/snapshots`)
// =============================================================================

export async function syncUpsertSnapshotToServer(
  snapshot: QuestionSnapshotRecord
): Promise<boolean> {
  try {
    const token = await getAccessToken();
    if (!token) return false;
    const result = await apiPostJson('/api/snapshots', {
      snapshotId: snapshot.snapshotId,
      questionId: snapshot.questionId,
      canonicalQuestionId: snapshot.canonicalQuestionId,
      mode: snapshot.mode,
      subjectCanonical: snapshot.subjectCanonical,
      subjectLabel: snapshot.subjectLabel,
      topicLabel: snapshot.topicLabel,
      year: snapshot.year,
      question: snapshot.question,
      options: snapshot.options,
      answer: snapshot.answer,
      explanationShort: snapshot.explanationShort,
      explanationFull: snapshot.explanationFull,
      explanationPidgin: snapshot.explanationPidgin,
      wasAnswered: snapshot.wasAnswered,
      selectedOption: snapshot.selectedOption,
      isCorrect: snapshot.isCorrect,
      explanationStyle: snapshot.explanationStyle,
      savedAt: snapshot.savedAt,
    });
    return result.ok;
  } catch {
    return false;
  }
}

export async function syncDeleteSnapshotFromServer(canonicalQuestionId: string): Promise<boolean> {
  const canonical = normalizeCanonicalQuestionId(canonicalQuestionId);
  if (!canonical) return false;
  try {
    const token = await getAccessToken();
    if (!token) return false;
    const res = await apiFetch(`/api/snapshots/${encodeURIComponent(canonical)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function syncAttemptSnapshotToServer(
  canonicalQuestionId: string,
  selectedOption: 'A' | 'B' | 'C' | 'D'
): Promise<boolean> {
  const canonical = normalizeCanonicalQuestionId(canonicalQuestionId);
  if (!canonical) return false;
  try {
    const token = await getAccessToken();
    if (!token) return false;
    const res = await apiFetch(`/api/snapshots/${encodeURIComponent(canonical)}/attempt`, {
      method: 'PATCH',
      body: JSON.stringify({ selectedOption }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Hydrates saved snapshots from Supabase and merges them with local cache
 * (newest savedAt wins per canonicalQuestionId). Safe when signed out or offline.
 */
export async function hydrateSavedSnapshotsFromServer(): Promise<{
  source: 'supabase' | 'local';
  snapshots: QuestionSnapshotRecord[];
}> {
  const local = loadSavedQuestionSnapshots();
  try {
    const token = await getAccessToken();
    if (!token) return { source: 'local', snapshots: local };

    const res = await apiFetch('/api/snapshots', { method: 'GET' });
    if (!res.ok) return { source: 'local', snapshots: local };

    const data = await res.json();
    const remote: QuestionSnapshotRecord[] = Array.isArray(data?.snapshots) ? data.snapshots : [];

    const mergedByCanonical = new Map<string, QuestionSnapshotRecord>();
    for (const snap of local) {
      mergedByCanonical.set(snap.canonicalQuestionId, snap);
    }
    for (const snap of remote) {
      const existing = mergedByCanonical.get(snap.canonicalQuestionId);
      if (!existing) {
        mergedByCanonical.set(snap.canonicalQuestionId, snap);
      } else {
        const remoteTs = new Date(snap.savedAt).getTime() || 0;
        const localTs = new Date(existing.savedAt).getTime() || 0;
        // Prefer answered over unanswered or newer timestamp
        if (
          (snap.wasAnswered && !existing.wasAnswered) ||
          (snap.wasAnswered === existing.wasAnswered && remoteTs >= localTs)
        ) {
          mergedByCanonical.set(snap.canonicalQuestionId, snap);
        }
      }
    }

    const merged = Array.from(mergedByCanonical.values()).sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    );
    const saved = writeSnapshots(merged);
    return { source: 'supabase', snapshots: saved };
  } catch {
    return { source: 'local', snapshots: local };
  }
}

// =============================================================================
// PUBLIC SHARE URL & DEVICE/WEB SHARE UTILITIES
// =============================================================================

function isLocalOrNativeOrigin(origin: string): boolean {
  const lower = (origin || '').trim().toLowerCase();
  if (!lower) return true;
  if (lower.startsWith('capacitor://') || lower.startsWith('file://')) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(lower);
}

/**
 * Returns a real, externally reachable public base URL for share links (`/q/:id`).
 * Never returns `https://localhost` from a Capacitor Android APK build.
 */
export function getPublicShareOrigin(): string {
  const envPublic =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_PUBLIC_WEB_URL) || '';
  const cleanedPublic = String(envPublic).trim().replace(/\/+$/, '');
  if (cleanedPublic && /^https?:\/\//i.test(cleanedPublic) && !isLocalOrNativeOrigin(cleanedPublic)) {
    return cleanedPublic;
  }

  const envApi =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) || '';
  const cleanedApi = String(envApi).trim().replace(/\/+$/, '');
  if (
    cleanedApi &&
    /^https?:\/\//i.test(cleanedApi) &&
    !isLocalOrNativeOrigin(cleanedApi) &&
    !isPreviewProxyHost(cleanedApi)
  ) {
    return cleanedApi;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    const winOrigin = window.location.origin.replace(/\/+$/, '');
    if (!isLocalOrNativeOrigin(winOrigin)) {
      return winOrigin;
    }
  }

  return FALLBACK_PUBLIC_WEB_ORIGIN;
}

/**
 * Optional Google Play Store URL (set via VITE_PLAY_STORE_URL once Android listing is published).
 * Empty string defaults cleanly to the WebApp Sign-Up flow.
 */
export function getPlayStoreAppUrl(): string {
  const raw =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_PLAY_STORE_URL) || '';
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

/**
 * Reliably copies text to the clipboard on Desktop Web, Mobile Web, iframe previews,
 * and Android WebView (falls back to off-screen textarea when Clipboard API is blocked).
 */
export async function copyTextReliably(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to execCommand fallback
  }

  if (typeof document === 'undefined') return false;
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return Boolean(copied);
  } catch {
    return false;
  }
}

export function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const [header, base64] = dataUrl.split(',');
    if (!header || !base64) return null;
    const mimeMatch = /data:([^;]+);/i.exec(header);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

function triggerWebBlobDownload(blob: Blob, filename: string): boolean {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return false;
  try {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.setTimeout(() => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        // ignore
      }
    }, 10000);
    return true;
  } catch {
    return false;
  }
}

/**
 * Saves a rendered PNG Snapshot reliably on BOTH Android APK (via Capacitor Filesystem)
 * and Desktop/Mobile Web (via Blob Object URL download, avoiding blocked data: URLs).
 */
export async function saveSnapshotImageToDevice(
  rendered: RenderedSnapshotImage
): Promise<{ ok: boolean; message: string }> {
  // 1. Native Android / iOS via Capacitor Filesystem
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    try {
      await Filesystem.writeFile({
        path: `SABI-Snapshots/${rendered.filename}`,
        data: rendered.base64Data,
        directory: Directory.Documents,
        recursive: true,
      });
      return {
        ok: true,
        message: `Snapshot saved to Documents/SABI-Snapshots/${rendered.filename}`,
      };
    } catch {
      // Scoped storage fallback: write to Cache and open native Share sheet so user can Save to Photos/Files
      try {
        const cached = await Filesystem.writeFile({
          path: rendered.filename,
          data: rendered.base64Data,
          directory: Directory.Cache,
          recursive: true,
        });
        await Share.share({
          title: 'Save SABI Question Snapshot',
          files: [cached.uri],
          dialogTitle: 'Save or Share SABI Snapshot',
        });
        return {
          ok: true,
          message: 'Snapshot ready in Android share/save menu!',
        };
      } catch {
        return {
          ok: false,
          message: 'Could not save snapshot image on this device. Try Share Snapshot instead.',
        };
      }
    }
  }

  // 2. Desktop & Mobile Web via Blob Object URL
  const blob = rendered.blob || dataUrlToBlob(rendered.dataUrl);
  if (blob && triggerWebBlobDownload(blob, rendered.filename)) {
    return {
      ok: true,
      message: 'Snapshot PNG downloaded — ready to post anywhere!',
    };
  }

  return {
    ok: false,
    message: 'Your browser blocked automatic download. Long-press the snapshot or copy the link.',
  };
}

/**
 * Shares a rendered PNG Snapshot + direct `/q/:id` link natively on Android APK
 * (via Capacitor Filesystem + Capacitor Share) or Web (via Web Share API -> reliable
 * Clipboard + PNG download fallback so desktop users always get both image and link).
 */
export async function shareSnapshotNativeOrWeb(params: {
  rendered: RenderedSnapshotImage | null;
  title: string;
  text: string;
  url: string;
}): Promise<{ ok: boolean; cancelled?: boolean; message: string }> {
  const { rendered, title, text, url } = params;

  // 1. Native Android / iOS Capacitor Share with real PNG attachment
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    try {
      if (rendered?.base64Data) {
        const written = await Filesystem.writeFile({
          path: rendered.filename,
          data: rendered.base64Data,
          directory: Directory.Cache,
          recursive: true,
        });
        await Share.share({
          title,
          text,
          url,
          files: [written.uri],
          dialogTitle: 'Share SABI Question Snapshot',
        });
        return { ok: true, message: 'Shared snapshot image & direct question link!' };
      }

      await Share.share({
        title,
        text,
        url,
        dialogTitle: 'Share SABI Question',
      });
      return { ok: true, message: 'Shared direct question link!' };
    } catch (err: any) {
      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('cancel') || err?.name === 'AbortError') {
        return { ok: false, cancelled: true, message: '' };
      }
      // Fallback to text-only native share if file attachment was rejected by target app
      try {
        await Share.share({ title, text, url, dialogTitle: 'Share SABI Question' });
        return { ok: true, message: 'Shared direct question link!' };
      } catch {
        const copied = await copyTextReliably(text);
        return {
          ok: copied,
          message: copied
            ? 'Direct link & question text copied — paste in WhatsApp or any app!'
            : 'Use the Copy button above to share this question link.',
        };
      }
    }
  }

  // 2. Web Share API (Mobile Chrome/Safari & supported Desktop browsers)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    const blob = rendered?.blob || (rendered ? dataUrlToBlob(rendered.dataUrl) : null);
    if (blob && rendered && typeof File !== 'undefined') {
      try {
        const file = new File([blob], rendered.filename, { type: 'image/png' });
        const navAny = navigator as Navigator & {
          canShare?: (data: ShareData) => boolean;
        };
        if (navAny.canShare && navAny.canShare({ files: [file] })) {
          await navigator.share({
            title,
            text,
            url,
            files: [file],
          });
          return { ok: true, message: 'Shared snapshot image & question link!' };
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return { ok: false, cancelled: true, message: '' };
        }
        // Fall through to link share or desktop fallback
      }
    }

    try {
      await navigator.share({ title, text, url });
      return { ok: true, message: 'Shared direct question link!' };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { ok: false, cancelled: true, message: '' };
      }
      // Fall through to desktop fallback (e.g. iframe blocks navigator.share with NotAllowedError)
    }
  }

  // 3. Desktop Web / Restricted Frame Bulletproof Fallback:
  // Copy the direct link + prompt AND download the PNG snapshot image immediately.
  const copied = await copyTextReliably(text);
  const downloaded = rendered
    ? (await saveSnapshotImageToDevice(rendered)).ok
    : false;

  if (copied && downloaded) {
    return {
      ok: true,
      message: 'Snapshot PNG downloaded & direct share link copied — paste anywhere!',
    };
  }
  if (copied) {
    return {
      ok: true,
      message: 'Direct question link & text copied to clipboard!',
    };
  }
  if (downloaded) {
    return {
      ok: true,
      message: 'Snapshot PNG downloaded! Copy the link above to share with friends.',
    };
  }
  return {
    ok: false,
    message: 'Copy the link above or tap WhatsApp to share this question.',
  };
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
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  const words = normalized.split(' ');
  const lines: string[] = [];
  let current = '';
  let truncated = false;

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) {
        lines.push(current);
        if (lines.length >= maxLines) {
          truncated = true;
          current = '';
          break;
        }
      }
      // Handle unusually long single word (e.g., chemical formula or URL)
      if (ctx.measureText(word).width > maxWidth) {
        let chunk = '';
        for (const ch of word) {
          if (ctx.measureText(chunk + ch + '…').width > maxWidth) break;
          chunk += ch;
        }
        current = chunk || word.slice(0, 12);
      } else {
        current = word;
      }
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  } else if (current) {
    truncated = true;
  }

  if (truncated && lines.length > 0) {
    const lastIdx = lines.length - 1;
    let last = lines[lastIdx];
    while (last.length > 4 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1).trimEnd();
    }
    lines[lastIdx] = `${last}…`;
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

async function waitForWebFontsBriefly(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document) || !document.fonts?.ready) return;
  try {
    await Promise.race([
      document.fonts.ready,
      new Promise<void>((resolve) => window.setTimeout(resolve, 500)),
    ]);
  } catch {
    // ignore
  }
}

function getCanvasModeLabel(mode: SnapshotSourceMode): string {
  switch (mode) {
    case 'blitz':
      return 'BLITZ SNAPSHOT';
    case 'custom':
      return 'CUSTOM PRACTICE';
    case 'cbt':
      return 'CBT REVIEW';
    default:
      return 'SMART PRACTICE';
  }
}

/**
 * Generates a high-resolution PNG snapshot of the full SABI question & answer card
 * ready for external sharing (WhatsApp, X, Telegram, Instagram) or direct device save.
 */
export async function renderQuestionSnapshotPng(params: {
  question: PracticeFeedQuestion & { year?: number };
  mode: SnapshotSourceMode;
  includeAnswer: boolean;
  selectedOption: 'A' | 'B' | 'C' | 'D' | null;
  explanationStyle?: 'english' | 'pidgin';
  shareUrl: string;
}): Promise<RenderedSnapshotImage | null> {
  if (typeof document === 'undefined') return null;

  await waitForWebFontsBriefly();

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

  const modeLabel = getCanvasModeLabel(params.mode);
  drawRoundedRect(ctx, width - padX - 280, 62, 280, 50, 25);
  ctx.fillStyle = '#320D68';
  ctx.fill();
  ctx.fillStyle = '#FFE51E';
  ctx.font = '800 19px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(modeLabel, width - padX - 140, 94);
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
  ctx.font = '700 38px "Plus Jakarta Sans", system-ui, sans-serif';
  const questionLines = wrapCanvasText(ctx, params.question.question, contentW, 5);
  let cursorY = 262;
  for (const line of questionLines) {
    ctx.fillText(line, padX, cursorY);
    cursorY += 50;
  }

  // 5. Options A–D
  cursorY = Math.max(cursorY + 20, 456);
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
    } else if (optLines.length >= 2) {
      ctx.fillText(optLines[0], padX + 98, cursorY + 46);
      ctx.fillText(optLines[1], padX + 98, cursorY + 80);
    }

    cursorY += optionH + optionGap;
  }

  // 6. Bottom Panel: Explanation (if answered) OR Challenge CTA (if unanswered)
  const panelY = Math.max(cursorY + 12, 976);
  const panelH = 224;
  if (params.includeAnswer) {
    const answeredRight =
      params.selectedOption === null || params.selectedOption === params.question.answer;
    drawRoundedRect(ctx, padX, panelY, contentW, panelH, 26);
    ctx.fillStyle = answeredRight ? '#B7F7D4' : '#FFD9DC';
    ctx.fill();

    ctx.fillStyle = '#1D0547';
    ctx.font = '800 28px "Plus Jakarta Sans", system-ui, sans-serif';
    const verdictHeadline =
      params.selectedOption === null
        ? `Verified Answer: Option ${params.question.answer}`
        : answeredRight
        ? `You picked ${params.selectedOption} · Correct!`
        : `You picked ${params.selectedOption} · Correct is Option ${params.question.answer}`;
    ctx.fillText(verdictHeadline, padX + 28, panelY + 48);

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
  const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : '';
  const canvasBlob = await new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), 'image/png');
    } catch {
      resolve(null);
    }
  });
  const blob = canvasBlob || dataUrlToBlob(dataUrl);
  const canonical = normalizeCanonicalQuestionId(params.question.id) || 'question';

  return {
    dataUrl,
    base64Data,
    blob,
    filename: `sabi-${canonical.toLowerCase()}.png`,
  };
}

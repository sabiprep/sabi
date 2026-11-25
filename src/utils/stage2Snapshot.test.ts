import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildQuestionShareCopy,
  buildQuestionShareUrl,
  loadSavedQuestionSnapshots,
  normalizeCanonicalQuestionId,
  recordSnapshotAttempt,
  removeQuestionSnapshot,
  resolvePublicQuestionById,
  toggleQuestionSnapshot,
} from './questionSnapshotStore';
import { SEED_QUESTIONS } from '../data/questions';

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

describe('Stage 2 — Question Save Snapshots & Public Share-Link System', () => {
  beforeEach(() => {
    const storage = createMemoryStorage();
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', {
      localStorage: storage,
      location: { origin: 'https://sabi.example.ng' },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes canonical IDs and resolves both curated and seed JAMB questions publicly', () => {
    expect(normalizeCanonicalQuestionId('SABI-CHM-PT-1-loop2')).toBe('SABI-CHM-PT-1');
    expect(normalizeCanonicalQuestionId('bad<script>id!')).toBe('badscriptid');

    const curated = resolvePublicQuestionById('SABI-CHM-PT-1-loop3');
    expect(curated).not.toBeNull();
    expect(curated?.id).toBe('SABI-CHM-PT-1');
    expect(curated?.answer).toBe('B');

    const firstSeed = SEED_QUESTIONS[0];
    const resolvedSeed = resolvePublicQuestionById(`${firstSeed.id}-y1`);
    expect(resolvedSeed).not.toBeNull();
    expect(resolvedSeed?.id).toBe(firstSeed.id);

    expect(resolvePublicQuestionById('DOES-NOT-EXIST-999')).toBeNull();
  });

  it('captures unanswered snapshot, upgrades to answered snapshot when answered, and toggles off cleanly', () => {
    const question = resolvePublicQuestionById('SABI-CHM-PT-1')!;

    // 1. Save BEFORE answering
    const first = toggleQuestionSnapshot({
      question,
      mode: 'blitz',
      wasAnswered: false,
      selectedOption: null,
      isCorrect: null,
    });
    expect(first.action).toBe('saved');
    expect(first.snapshot?.wasAnswered).toBe(false);
    expect(first.snapshot?.selectedOption).toBeNull();
    expect(loadSavedQuestionSnapshots()).toHaveLength(1);

    // 2. Save again AFTER answering -> upgrades existing snapshot to answered state
    const upgraded = toggleQuestionSnapshot({
      question,
      mode: 'blitz',
      wasAnswered: true,
      selectedOption: 'B',
      isCorrect: true,
      explanationStyle: 'pidgin',
    });
    expect(upgraded.action).toBe('updated');
    expect(upgraded.snapshot?.wasAnswered).toBe(true);
    expect(upgraded.snapshot?.selectedOption).toBe('B');
    expect(upgraded.snapshot?.isCorrect).toBe(true);
    expect(upgraded.snapshot?.explanationStyle).toBe('pidgin');
    expect(loadSavedQuestionSnapshots()).toHaveLength(1);

    // 3. Toggle again in the same answered state -> removes snapshot
    const removed = toggleQuestionSnapshot({
      question,
      mode: 'blitz',
      wasAnswered: true,
      selectedOption: 'B',
      isCorrect: true,
    });
    expect(removed.action).toBe('removed');
    expect(loadSavedQuestionSnapshots()).toHaveLength(0);
  });

  it('lets a student solve an unanswered saved snapshot inside the Vault and remove it cleanly', () => {
    const question = resolvePublicQuestionById('SABI-CHM-PT-1')!;
    const saved = toggleQuestionSnapshot({
      question,
      mode: 'smart',
      wasAnswered: false,
      selectedOption: null,
      isCorrect: null,
    });

    const afterAttempt = recordSnapshotAttempt(saved.snapshot!.snapshotId, 'A');
    expect(afterAttempt[0].wasAnswered).toBe(true);
    expect(afterAttempt[0].selectedOption).toBe('A');
    expect(afterAttempt[0].isCorrect).toBe(false);

    const afterDelete = removeQuestionSnapshot(saved.snapshot!.snapshotId);
    expect(afterDelete).toHaveLength(0);
  });

  it('builds canonical public /q/:id share URLs and WhatsApp links cleanly', () => {
    const url = buildQuestionShareUrl('SABI-CHM-PT-1-loop1', 'blitz', 'https://sabi.ng');
    expect(url).toBe('https://sabi.ng/q/SABI-CHM-PT-1?mode=blitz&src=share');

    const bundle = buildQuestionShareCopy({
      questionId: 'SABI-CHM-PT-1',
      subjectLabel: 'Chemistry',
      topicLabel: 'Periodic table',
      questionText: 'Which of these elements is a noble gas?',
      mode: 'blitz',
      originOverride: 'https://sabi.ng',
    });
    expect(bundle.url).toBe('https://sabi.ng/q/SABI-CHM-PT-1?mode=blitz&src=share');
    expect(bundle.text).toContain(bundle.url);
    expect(bundle.whatsappUrl).toContain('https://wa.me/?text=');
  });
});

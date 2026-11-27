import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildQuestionShareCopy,
  buildQuestionShareUrl,
  buildSabiAppDeepLink,
  dataUrlToBlob,
  detectVisitorDevice,
  getPublicShareOrigin,
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

describe('Stage 1B & 2 — Question Save Snapshots & Universal Public Share-Link System', () => {
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

  it('builds canonical public /q/:id share URLs with zero question text dump and rejects localhost, capacitor, LAN, and preview hosts', () => {
    const url = buildQuestionShareUrl('SABI-CHM-PT-1-loop1', 'blitz', 'https://sabi.ng');
    expect(url).toBe('https://sabi.ng/q/SABI-CHM-PT-1');

    const bundle = buildQuestionShareCopy({
      questionId: 'SABI-CHM-PT-1',
      subjectLabel: 'Chemistry',
      topicLabel: 'Periodic table',
      questionText: 'Which of these elements is a noble gas?',
      mode: 'blitz',
      originOverride: 'https://sabi.ng',
    });
    expect(bundle.url).toBe('https://sabi.ng/q/SABI-CHM-PT-1');
    // Shared text must be strictly the clean clickable URL (no messy question text mixed in)
    expect(bundle.text).toBe(bundle.url);
    expect(bundle.whatsappUrl).toBe(`https://wa.me/?text=${encodeURIComponent(bundle.url)}`);

    // Simulate Capacitor Android WebView running on https://localhost, 10.0.2.2, or private LAN IP
    for (const badOrigin of [
      'https://localhost',
      'http://localhost:3000',
      'http://10.0.2.2:3000',
      'http://192.168.1.50:3000',
      'capacitor://localhost',
    ]) {
      const androidOrigin = getPublicShareOrigin({
        envPublicOverride: '',
        windowOriginOverride: badOrigin,
      });
      expect(androidOrigin).toBe('https://sabi-tan.vercel.app');
      expect(buildQuestionShareUrl('SABI-CHM-PT-1', 'blitz', badOrigin)).toBe(
        'https://sabi-tan.vercel.app/q/SABI-CHM-PT-1'
      );
    }

    // Simulate private AI Studio preview proxy host (must never be shared externally)
    const previewOrigin = getPublicShareOrigin({
      envPublicOverride: '',
      windowOriginOverride: 'https://ais-pre-abc123.europe-west2.run.app',
    });
    expect(previewOrigin).not.toContain('ais-pre-');
    expect(previewOrigin).toBe('https://sabi-tan.vercel.app');

    // Explicit public web domain override is respected cleanly
    const customOrigin = getPublicShareOrigin({
      envPublicOverride: 'https://app.sabi.ng/',
      windowOriginOverride: 'https://ais-dev-xyz.run.app',
    });
    expect(customOrigin).toBe('https://app.sabi.ng');
  });

  it('detects Android, iOS, and Desktop visitors and generates clean native sabi://q deep links', () => {
    expect(
      detectVisitorDevice(
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36'
      )
    ).toBe('android');
    expect(
      detectVisitorDevice(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
      )
    ).toBe('ios');
    expect(
      detectVisitorDevice(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36'
      )
    ).toBe('desktop');

    expect(buildSabiAppDeepLink('SABI-CHM-PT-1-loop2', 'blitz')).toBe('sabi://q/SABI-CHM-PT-1');
  });

  it('converts PNG data URLs cleanly into binary Blobs for reliable download & share', () => {
    const tinyPngDataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const blob = dataUrlToBlob(tinyPngDataUrl);
    expect(blob).not.toBeNull();
    expect(blob?.type).toBe('image/png');
    expect((blob?.size || 0) > 0).toBe(true);
  });
});

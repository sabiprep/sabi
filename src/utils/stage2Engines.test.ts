import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildSmartPracticeDeck,
  getDailyFailureDrillPlan,
  loadSavedPracticeScope,
  savePracticeScopePref,
} from './smartPracticeSession';
import {
  buildCbtMockDeck,
  getAvailableCbtYearsForSubjects,
  gradeCbtExam,
  recordMistakeInVault,
} from './cbtAndCustomEngine';
import { recordStudyActivity } from './userProgressStore';

const DEFAULT_SUBJECTS = ['English Language', 'Mathematics', 'Physics', 'Chemistry'];

describe('Stage 2 Engines — Scope Setup, Daily Failure Drill & CBT Year/Shuffle', () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    const mockStorage = {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => {
        storage.set(k, v);
      },
      removeItem: (k: string) => {
        storage.delete(k);
      },
      clear: () => storage.clear(),
    };
    vi.stubGlobal('window', {
      dispatchEvent: vi.fn(),
      localStorage: mockStorage,
    });
    vi.stubGlobal('localStorage', mockStorage);
  });

  it('persists single vs merged practice scope preference', () => {
    expect(loadSavedPracticeScope()).toBe('merged');
    savePracticeScopePref('single');
    expect(loadSavedPracticeScope()).toBe('single');
    savePracticeScopePref('merged');
    expect(loadSavedPracticeScope()).toBe('merged');
  });

  it('builds a 100% single-subject deck when scope is single', () => {
    const deck = buildSmartPracticeDeck('Physics', DEFAULT_SUBJECTS, {
      scope: 'single',
      mode: 'standard',
    });
    expect(deck.length).toBeGreaterThanOrEqual(10);
    expect(deck.every(q => q.subjectCanonical === 'Physics')).toBe(true);
  });

  it('builds a multi-subject interleaved deck when scope is merged', () => {
    const deck = buildSmartPracticeDeck('Chemistry', DEFAULT_SUBJECTS, {
      scope: 'merged',
      mode: 'standard',
    });
    expect(deck.length).toBeGreaterThanOrEqual(20);
    const uniqueSubjects = new Set(deck.map(q => q.subjectCanonical));
    expect(uniqueSubjects.size).toBeGreaterThanOrEqual(3);
  });

  it('returns truthful starter drill when student has zero mistakes or attempts', () => {
    const plan = getDailyFailureDrillPlan(DEFAULT_SUBJECTS);
    expect(plan.isFailureDriven).toBe(false);
    expect(plan.missedCount).toBe(0);
    expect(plan.weakTopicsCount).toBe(0);
    expect(plan.evidence.length).toBeGreaterThan(0);
  });

  it('generates a failure-driven daily drill prioritizing real missed questions & weak topics', () => {
    recordMistakeInVault(
      {
        id: 'chem-missed-1',
        subjectCanonical: 'Chemistry',
        subjectLabel: 'Chemistry',
        topicLabel: 'Electrolysis',
        question: 'During electrolysis of brine, what is liberated at the cathode?',
        options: { A: 'Chlorine', B: 'Hydrogen', C: 'Sodium', D: 'Oxygen' },
        answer: 'B',
        explanationShort: 'Hydrogen ions are preferentially discharged at the cathode.',
        explanationFull: 'Hydrogen ions are preferentially discharged at the cathode.',
        explanationPidgin: 'Hydrogen gas go come out for cathode.',
      },
      'A'
    );
    recordStudyActivity({
      subject: 'Chemistry',
      topic: 'Electrolysis',
      isCorrect: false,
      mode: 'smart',
      elapsedSeconds: 20,
    });

    const plan = getDailyFailureDrillPlan(DEFAULT_SUBJECTS);
    expect(plan.isFailureDriven).toBe(true);
    expect(plan.subjectCanonical).toBe('Chemistry');
    expect(plan.topicLabel).toBe('Electrolysis');
    expect(plan.missedCount).toBe(1);

    const drillDeck = buildSmartPracticeDeck(plan.subjectCanonical, DEFAULT_SUBJECTS, {
      mode: 'daily-failure',
    });
    expect(drillDeck[0].id).toBe('chem-missed-1');
  });

  it('lists real past JAMB years with coverage counts for chosen subjects', () => {
    const years = getAvailableCbtYearsForSubjects(DEFAULT_SUBJECTS);
    expect(years.length).toBeGreaterThan(0);
    const hasFullCoverageYear = years.some(y => y.matchedSubjectsCount === 4);
    expect(hasFullCoverageYear).toBe(true);
  });

  it('builds a year-targeted CBT mock deck and records source metadata on graded result', () => {
    const years = getAvailableCbtYearsForSubjects(DEFAULT_SUBJECTS);
    const bestYear = years[0].year;

    const deck = buildCbtMockDeck(DEFAULT_SUBJECTS, 'quick_40', {
      source: 'year',
      year: bestYear,
    });
    expect(deck.length).toBe(40);
    const matchingYearCount = deck.filter(q => q.year === bestYear).length;
    expect(matchingYearCount).toBeGreaterThan(0);

    const graded = gradeCbtExam({
      preset: 'quick_40',
      sourceMode: 'year',
      selectedYear: bestYear,
      deck,
      answers: { 0: deck[0].answer },
      flagged: {},
      durationUsedSeconds: 120,
      timeLimitSeconds: 1800,
    });
    expect(graded.sourceMode).toBe('year');
    expect(graded.selectedYear).toBe(bestYear);
    expect(graded.title).toContain(String(bestYear));
  });

  it('builds a Curriculum Shuffle CBT mock deck cleanly', () => {
    const deck = buildCbtMockDeck(DEFAULT_SUBJECTS, 'quick_40', {
      source: 'shuffle',
    });
    expect(deck.length).toBe(40);
    const graded = gradeCbtExam({
      preset: 'quick_40',
      sourceMode: 'shuffle',
      selectedYear: null,
      deck,
      answers: {},
      flagged: {},
      durationUsedSeconds: 90,
      timeLimitSeconds: 1800,
    });
    expect(graded.sourceMode).toBe('shuffle');
    expect(graded.title).toContain('Curriculum Shuffle');
  });
});

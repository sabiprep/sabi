import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getMultiTierLeagueSnapshot,
  getSubjectRatingsSnapshot,
} from './progressInsightsEngine';
import {
  getRealUserProgress,
  recordStudyActivity,
  saveRealUserProgress,
} from './userProgressStore';
import { recordMistakeInVault } from './cbtAndCustomEngine';

describe('Stage 3 Progress Hub — Multi-Tier Leagues & Real Subject Weakness Insights', () => {
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

  it('starts brand-new users Unranked while exposing browsable Blue, Silver, and Gold tables', () => {
    const league = getMultiTierLeagueSnapshot();
    expect(league.currentTier).toBe('unranked');
    expect(league.isPlaced).toBe(false);
    expect(league.currentRank).toBeNull();
    expect(league.tables.blue.length).toBeGreaterThanOrEqual(5);
    expect(league.tables.silver.length).toBeGreaterThanOrEqual(5);
    expect(league.tables.gold.length).toBeGreaterThanOrEqual(5);
    // Silver and Gold have demotion zones; Blue has promotion zone
    expect(league.tables.blue.some(r => r.zone === 'promote')).toBe(true);
    expect(league.tables.silver.some(r => r.zone === 'promote')).toBe(true);
    expect(league.tables.silver.some(r => r.zone === 'demote')).toBe(true);
    expect(league.tables.gold.some(r => r.zone === 'demote')).toBe(true);
  });

  it('places user into Blue on first activity and tracks promotion to Silver -> Gold and demotion back down', () => {
    recordStudyActivity({
      subject: 'Chemistry',
      topic: 'Periodic table trends',
      isCorrect: true,
      mode: 'smart',
      elapsedSeconds: 30,
    });

    const blueSnap = getMultiTierLeagueSnapshot();
    expect(blueSnap.currentTier).toBe('blue');
    expect(blueSnap.movement).toBe('entered');
    expect(blueSnap.currentRank).not.toBeNull();

    // Boost real XP to promote into Silver
    const cur = getRealUserProgress();
    saveRealUserProgress({ ...cur, totalXp: 600 });
    const silverSnap = getMultiTierLeagueSnapshot();
    expect(silverSnap.currentTier).toBe('silver');
    expect(silverSnap.movement).toBe('promoted');

    // Boost real XP to promote into Gold
    saveRealUserProgress({ ...getRealUserProgress(), totalXp: 1400 });
    const goldSnap = getMultiTierLeagueSnapshot();
    expect(goldSnap.currentTier).toBe('gold');
    expect(goldSnap.movement).toBe('promoted');

    // Simulate drop back down to Silver
    saveRealUserProgress({ ...getRealUserProgress(), totalXp: 700 });
    const demotedSnap = getMultiTierLeagueSnapshot();
    expect(demotedSnap.currentTier).toBe('silver');
    expect(demotedSnap.movement).toBe('demoted');
  });

  it('computes real Subject Performance Ratings and surfaces weak topics & mistakes for tap-to-inspect insights', () => {
    // Chemistry: 1 right on Atomic Structure, 2 wrong on Electrolysis
    recordStudyActivity({
      subject: 'Chemistry',
      topic: 'Atomic Structure',
      isCorrect: true,
      mode: 'smart',
      elapsedSeconds: 20,
    });
    recordStudyActivity({
      subject: 'Chemistry',
      topic: 'Electrolysis',
      isCorrect: false,
      mode: 'smart',
      elapsedSeconds: 25,
    });
    recordStudyActivity({
      subject: 'Chemistry',
      topic: 'Electrolysis',
      isCorrect: false,
      mode: 'smart',
      elapsedSeconds: 25,
    });
    recordMistakeInVault(
      {
        id: 'chem-elec-1',
        subjectCanonical: 'Chemistry',
        subjectLabel: 'Chemistry',
        topicLabel: 'Electrolysis',
        question: 'Which ion is discharged first at the anode in dilute NaCl?',
        options: { A: 'Cl-', B: 'OH-', C: 'Na+', D: 'H+' },
        answer: 'B',
        explanationShort: 'OH- is lower in the electrochemical series.',
        explanationFull: 'OH- is lower in the electrochemical series.',
        explanationPidgin: 'OH- go discharge first.',
      },
      'A'
    );

    const ratings = getSubjectRatingsSnapshot();
    const chem = ratings.subjects.find(s => s.subject.canonicalName === 'Chemistry');
    expect(chem).toBeDefined();
    expect(chem!.subject.percent).toBe(33);
    expect(chem!.readinessLabel).toBe('Needs Urgent Focus');
    expect(chem!.primaryWeakTopic).toBe('Electrolysis');
    expect(chem!.topics[0].topicLabel).toBe('Electrolysis');
    expect(chem!.topics[0].status).toBe('critical');
    expect(chem!.mistakes.length).toBe(1);
    expect(chem!.aiSummary).toContain('Electrolysis');
  });
});

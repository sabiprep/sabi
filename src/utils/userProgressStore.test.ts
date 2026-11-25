import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DAILY_ASSISTANCE_DIAMOND_CAP,
  XP_PER_ASSISTANCE_DIAMOND,
  getEconomySnapshot,
  getRealUserProgress,
  recordSessionDurationBonus,
  recordStudyActivity,
  saveRealUserProgress,
  spendUserDiamonds,
} from './userProgressStore';
import { getWonderlandDashboardState } from './wonderlandStudentState';

describe('Stage 1 Real Mastery, Active-Time XP & Limited Assistance Diamonds', () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal('window', {
      dispatchEvent: vi.fn(),
      localStorage: {
        getItem: (k: string) => storage.get(k) ?? null,
        setItem: (k: string, v: string) => {
          storage.set(k, v);
        },
        removeItem: (k: string) => {
          storage.delete(k);
        },
        clear: () => storage.clear(),
      },
    });
    vi.stubGlobal('localStorage', (globalThis as unknown as { window: { localStorage: Storage } }).window.localStorage);
  });

  it('starts a new student at 0% mastery, 0 XP, 0 streak, 0 diamonds, and unranked league', () => {
    const progress = getRealUserProgress();
    expect(progress.totalXp).toBe(0);
    expect(progress.streakDays).toBe(0);
    expect(progress.diamonds).toBe(0);

    const dashboard = getWonderlandDashboardState();
    expect(dashboard.xpBalance).toBe(0);
    expect(dashboard.streakDays).toBe(0);
    expect(dashboard.leagueTier).toBe('unranked');
    expect(dashboard.leagueRows).toHaveLength(0);
    expect(dashboard.subjects.every(s => s.percent === 0)).toBe(true);
  });

  it('computes real subject & topic mastery and active-time XP from real attempts', () => {
    recordStudyActivity({
      subject: 'Chemistry',
      topic: 'Periodic table trends',
      isCorrect: true,
      mode: 'smart',
      elapsedSeconds: 30,
    });
    recordStudyActivity({
      subject: 'Chemistry',
      topic: 'Periodic table trends',
      isCorrect: false,
      mode: 'smart',
      elapsedSeconds: 30,
    });

    const progress = getRealUserProgress();
    expect(progress.subjectStats['Chemistry']?.solved).toBe(2);
    expect(progress.subjectStats['Chemistry']?.correct).toBe(1);
    expect(progress.subjectStats['Chemistry']?.rating).toBe(50);
    expect(progress.topicStats['Chemistry']?.['Periodic table trends']?.solved).toBe(2);
    expect(progress.topicStats['Chemistry']?.['Periodic table trends']?.correct).toBe(1);
    expect(progress.streakDays).toBe(1);
    expect(progress.totalXp).toBeGreaterThan(0);

    const dashboard = getWonderlandDashboardState();
    const chem = dashboard.subjects.find(s => s.canonicalName === 'Chemistry');
    expect(chem?.percent).toBe(50);
    expect(dashboard.leagueTier).toBe('blue');
  });

  it('awards limited XP Assistance Diamonds up to the strict daily cap while keeping Subscription Diamonds primary', () => {
    // Grant large XP via study sessions; verify cap holds at DAILY_ASSISTANCE_DIAMOND_CAP (3/day)
    for (let i = 0; i < 10; i++) {
      recordSessionDurationBonus({
        mode: 'cbt',
        durationSeconds: 600,
        completionBonusXp: XP_PER_ASSISTANCE_DIAMOND,
      });
    }

    const econ = getEconomySnapshot();
    expect(econ.assistanceDiamonds).toBe(DAILY_ASSISTANCE_DIAMOND_CAP);
    expect(econ.dailyAssistanceDiamondsEarned).toBe(DAILY_ASSISTANCE_DIAMOND_CAP);
    expect(econ.subscriptionDiamonds).toBe(0);

    // Add paid subscription diamonds and verify Assistance Diamonds are spent FIRST
    const cur = getRealUserProgress();
    saveRealUserProgress({ ...cur, mainDiamonds: 50 });

    const spendRes = spendUserDiamonds(4);
    expect(spendRes.success).toBe(true);
    expect(spendRes.usedStreakBonus).toBe(DAILY_ASSISTANCE_DIAMOND_CAP);
    expect(spendRes.usedMainDiamonds).toBe(1);
    expect(spendRes.progress.mainDiamonds).toBe(49);
    expect(spendRes.progress.streakBonusDiamonds).toBe(0);
  });
});

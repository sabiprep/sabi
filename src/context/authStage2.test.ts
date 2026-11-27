import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyProfileToDeviceCache,
  clearUserDeviceCache,
  resolveProtectedRouteTarget,
  sanitizeAuthRedirectPath,
} from './AuthContext';
import { getSabiAuthRedirectUrl } from '../lib/supabase';

function createMockStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
}

describe('Stage 2 — Client Auth Hydration, Route Guards & Device Cache Isolation', () => {
  beforeEach(() => {
    const storage = createMockStorage();
    Object.defineProperty(globalThis, 'window', {
      value: {
        location: { origin: 'https://sabi-tan.vercel.app', hostname: 'sabi-tan.vercel.app' },
      },
      configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true,
    });
  });

  it('sanitizes post-login redirect paths and blocks external or loop targets', () => {
    expect(sanitizeAuthRedirectPath('/practice/session?mode=blitz')).toBe(
      '/practice/session?mode=blitz'
    );
    expect(sanitizeAuthRedirectPath('/assistant')).toBe('/assistant');
    expect(sanitizeAuthRedirectPath('https://evil.example.com/phish')).toBe('/home');
    expect(sanitizeAuthRedirectPath('//evil.example.com')).toBe('/home');
    expect(sanitizeAuthRedirectPath('javascript:alert(1)')).toBe('/home');
    expect(sanitizeAuthRedirectPath('/auth/sign-in')).toBe('/home');
    expect(sanitizeAuthRedirectPath('/welcome')).toBe('/home');
    expect(sanitizeAuthRedirectPath(null)).toBe('/home');
  });

  it('computes protected route decisions cleanly across loading, unauthenticated, and onboarding states', () => {
    expect(
      resolveProtectedRouteTarget({
        status: 'loading',
        onboardingCompleted: false,
        requireOnboarding: true,
        currentPath: '/home',
      })
    ).toBe('loading');

    expect(
      resolveProtectedRouteTarget({
        status: 'unauthenticated',
        onboardingCompleted: false,
        requireOnboarding: true,
        currentPath: '/practice/setup?mode=smart',
      })
    ).toBe('/auth/sign-in?redirect=%2Fpractice%2Fsetup%3Fmode%3Dsmart');

    expect(
      resolveProtectedRouteTarget({
        status: 'authenticated',
        onboardingCompleted: false,
        requireOnboarding: true,
        currentPath: '/home',
      })
    ).toBe('/onboarding/1');

    expect(
      resolveProtectedRouteTarget({
        status: 'authenticated',
        onboardingCompleted: false,
        requireOnboarding: false,
        currentPath: '/onboarding/3',
      })
    ).toBe('allow');

    expect(
      resolveProtectedRouteTarget({
        status: 'authenticated',
        onboardingCompleted: true,
        requireOnboarding: true,
        currentPath: '/assistant',
      })
    ).toBe('allow');
  });

  it('wipes all account-scoped localStorage keys on sign-out and prevents cross-account bleed', () => {
    applyProfileToDeviceCache({
      id: 'user-A',
      email: 'ada@sabi.ng',
      sabi_unique_id: '1234A',
      full_name: 'Adaobi Nwosu',
      phone: '+2348011111111',
      state_of_origin: 'Enugu',
      auth_providers: ['email'],
      onboarding_completed: true,
      registered_subjects: ['English Language', 'Biology', 'Chemistry', 'Physics'],
      onboarding_answers: { targetCourse: 'Medicine', targetUniversity: 'UNN' },
    });
    localStorage.setItem('sabi_question_snapshots_v1', JSON.stringify([{ id: 'snap-A' }]));

    expect(localStorage.getItem('sabi_user_email')).toBe('ada@sabi.ng');
    expect(localStorage.getItem('sabi_unique_id')).toBe('1234A');

    // Switching to User B on the same device must wipe User A's snapshots first
    applyProfileToDeviceCache({
      id: 'user-B',
      email: 'musa@sabi.ng',
      sabi_unique_id: '5678B',
      full_name: 'Musa Ibrahim',
      phone: '+2348022222222',
      state_of_origin: 'Kano',
      auth_providers: ['email'],
      onboarding_completed: false,
    });

    expect(localStorage.getItem('sabi_user_email')).toBe('musa@sabi.ng');
    expect(localStorage.getItem('sabi_question_snapshots_v1')).toBeNull();

    // Explicit sign out clears everything
    clearUserDeviceCache();
    expect(localStorage.getItem('sabi_user_email')).toBeNull();
    expect(localStorage.getItem('sabi_user_signed_in')).toBeNull();
    expect(localStorage.getItem('sabi_unique_id')).toBeNull();
    expect(localStorage.getItem('sabi_active_user_id')).toBeNull();
  });

  it('resolves auth redirect URLs for Capacitor Android APK vs Web deployments', () => {
    expect(getSabiAuthRedirectUrl('/auth/verify', { isNativeOverride: true })).toBe(
      'sabi://auth/callback'
    );
    expect(
      getSabiAuthRedirectUrl('/auth/verify', {
        isNativeOverride: false,
        publicUrlOverride: 'https://sabi-tan.vercel.app/',
      })
    ).toBe('https://sabi-tan.vercel.app/auth/verify');
  });
});

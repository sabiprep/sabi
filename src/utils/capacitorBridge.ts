import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { supabase } from '../lib/supabase';

/**
 * Remote API base URL for the compiled Android APK, which cannot use a relative
 * `/api/*` path (its WebView origin is `https://localhost`).
 *
 * Phase 0 fix: the old fallback was an AI Studio preview proxy
 * (`https://ais-pre-….run.app`) that answers `/api/*` with an HTML redirect to
 * `/__cookie_check.html`. Every APK built without an explicit VITE_API_BASE_URL
 * therefore could not register or sign in. There is no safe default here: the
 * value must be supplied at build time (see .github/workflows/build-android-apk.yml,
 * which now refuses to build an APK without it).
 */
const DEFAULT_NATIVE_API_BASE = (import.meta.env.VITE_API_BASE_URL || '')
  .trim()
  .replace(/\/+$/, '');

let bridgeInitialized = false;

/**
 * Initializes the SABI Capacitor Android Bridge:
 * 1. Applies the `.is-android-view` class on Android devices/WebViews so the top display
 *    sits comfortably below the Android system status bar (battery %, clock, network bar)
 *    while preserving the header background color all the way to the top edge.
 * 2. Rewrites relative `/api/...` fetch requests to the remote backend URL when running inside the native Android APK.
 * 3. Handles `sabi://auth` deep links for Android email confirmation & OAuth callbacks.
 * 4. Wires the Android hardware Back button to navigate React Router history cleanly.
 * 5. Configures the native Android StatusBar (`overlaysWebView: false`) and hides the SplashScreen.
 */
export function initCapacitorAndroidBridge(): void {
  if (typeof window === 'undefined' || bridgeInitialized) return;
  bridgeInitialized = true;

  const isNative = Capacitor.isNativePlatform();
  const isAndroidDevice =
    isNative ||
    Capacitor.getPlatform() === 'android' ||
    (typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent));

  if (isAndroidDevice) {
    document.documentElement.classList.add('is-android-view');
    document.body?.classList.add('is-android-view');
  }

  // 1. Intercept relative `/api/*` calls inside the native Android WebView.
  //    Phase 0 fix: this used to fall back to an HTML answer turned into a fake
  //    503 `{ fallbackToSupabase: true }` (which nothing consumed), so a broken
  //    API base URL looked like an anonymous network error. The real response is
  //    now returned and apiClient.describeApiFailure explains the cause.
  if (isNative && !DEFAULT_NATIVE_API_BASE) {
    console.error(
      '[SABI] This APK was built without VITE_API_BASE_URL, so /api/* cannot be reached from the ' +
        'WebView. Rebuild with VITE_API_BASE_URL set to the deployed API origin ' +
        '(e.g. https://sabi-api-xxxx.europe-west1.run.app).'
    );
  }

  if (isNative && DEFAULT_NATIVE_API_BASE) {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof input === 'string' && input.startsWith('/api/')) {
        const resolvedUrl = `${DEFAULT_NATIVE_API_BASE}${input}`;
        const controller = new AbortController();
        // Mobile networks can be slow; a short abort made real registrations look
        // like failures. Only the network budget is bounded, never correctness.
        const timer = setTimeout(() => controller.abort(), 15000);
        try {
          const resp = await originalFetch(resolvedUrl, {
            ...init,
            signal: init?.signal || controller.signal,
          });
          clearTimeout(timer);
          const contentType = (resp.headers.get('content-type') || '').toLowerCase();
          if (!contentType.includes('application/json')) {
            console.warn(
              `[SABI] ${resolvedUrl} answered "${contentType || 'no content-type'}" instead of ` +
                'JSON. Check that VITE_API_BASE_URL is the host running server.ts.'
            );
          }
          return resp;
        } catch (err) {
          clearTimeout(timer);
          throw err;
        }
      }
      return originalFetch(input, init);
    };
  }

  if (!isNative) return;

  // 2. Hide native splash screen smoothly once DOM is interactive
  SplashScreen.hide().catch(() => {});

  // 3. Configure initial status bar (prevent WebView overlap with battery/network icons)
  StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
  const initialDark =
    localStorage.getItem('sabi-theme') !== 'light' &&
    document.documentElement.classList.contains('dark');
  syncAndroidStatusBar(initialDark);

  // 4. Handle Android Deep Links (sabi://auth for SABI account verification & Google Auth)
  CapApp.addListener('appUrlOpen', async ({ url }) => {
    if (!url) return;
    try {
      const hashIndex = url.indexOf('#');
      const queryIndex = url.indexOf('?');
      const rawParams =
        hashIndex !== -1
          ? url.slice(hashIndex + 1)
          : queryIndex !== -1
          ? url.slice(queryIndex + 1)
          : '';
      const params = new URLSearchParams(rawParams);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken && supabase) {
        const { data } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (data?.user?.email) {
          localStorage.setItem('sabi_user_email', data.user.email.toLowerCase());
          localStorage.setItem('sabi_user_signed_in', 'true');
          window.location.href = '/home';
          return;
        }
      }

      if (url.startsWith('sabi://auth')) {
        window.location.href = '/auth/verify?verified=true';
      }
    } catch {
      // Ignore malformed deep link URLs
    }
  }).catch(() => {});

  // 5. Handle Android Hardware Back Button
  CapApp.addListener('backButton', ({ canGoBack }) => {
    const path = window.location.pathname;
    const isRootScreen =
      path === '/' || path === '/welcome' || path === '/home' || path === '/auth';

    if (!isRootScreen && (canGoBack || window.history.length > 1)) {
      window.history.back();
    } else {
      CapApp.exitApp();
    }
  }).catch(() => {});
}

/**
 * Synchronizes the native Android system status bar with SABI's Normal (Light) or Night (Dark) mode.
 */
export function syncAndroidStatusBar(isDark: boolean): void {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return;
  StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
  StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => {});
  StatusBar.setBackgroundColor({ color: isDark ? '#080D1A' : '#FFFFFF' }).catch(() => {});
}

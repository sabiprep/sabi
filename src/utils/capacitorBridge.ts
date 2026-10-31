import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { supabase } from '../lib/supabase';

/**
 * Default Production Backend Base URL when running inside the compiled Android APK.
 * Can be overridden at build time via VITE_API_BASE_URL in .env.
 */
const DEFAULT_NATIVE_API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  'https://ais-pre-hexoysblc7dzfjy3yyprez-26118416277.europe-west1.run.app'
)
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

  // 1. Intercept relative `/api/*` calls inside the native Android WebView
  if (isNative && DEFAULT_NATIVE_API_BASE) {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof input === 'string' && input.startsWith('/api/')) {
        const resolvedUrl = `${DEFAULT_NATIVE_API_BASE}${input}`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4500);
        try {
          const resp = await originalFetch(resolvedUrl, {
            ...init,
            signal: init?.signal || controller.signal,
          });
          clearTimeout(timer);
          const contentType = (resp.headers.get('content-type') || '').toLowerCase();
          // If the remote preview URL returned an HTML login page instead of JSON API, signal clean fallback
          if (!contentType.includes('application/json')) {
            return new Response(
              JSON.stringify({ fallbackToSupabase: true }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          }
          return resp;
        } catch {
          clearTimeout(timer);
          return new Response(
            JSON.stringify({ fallbackToSupabase: true }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
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

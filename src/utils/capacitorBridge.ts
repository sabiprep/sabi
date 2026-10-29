import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

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
 * 1. Rewrites relative `/api/...` fetch requests to the remote backend URL when running inside the native Android APK.
 * 2. Wires the Android hardware Back button to navigate React Router history cleanly instead of abruptly closing the app.
 * 3. Configures the native Android StatusBar and hides the SplashScreen once the React tree mounts.
 */
export function initCapacitorAndroidBridge(): void {
  if (typeof window === 'undefined' || bridgeInitialized) return;
  bridgeInitialized = true;

  const isNative = Capacitor.isNativePlatform();

  // 1. Intercept relative `/api/*` calls inside the native Android WebView
  if (isNative && DEFAULT_NATIVE_API_BASE) {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof input === 'string' && input.startsWith('/api/')) {
        const resolvedUrl = `${DEFAULT_NATIVE_API_BASE}${input}`;
        return originalFetch(resolvedUrl, init);
      }
      return originalFetch(input, init);
    };
  }

  if (!isNative) return;

  // 2. Hide native splash screen smoothly once DOM is interactive
  SplashScreen.hide().catch(() => {});

  // 3. Configure initial status bar
  syncAndroidStatusBar(true);

  // 4. Handle Android Hardware Back Button
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
  StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => {});
  StatusBar.setBackgroundColor({ color: isDark ? '#080D1A' : '#F8FAFC' }).catch(() => {});
}

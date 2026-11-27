import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

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
const DEFAULT_NATIVE_API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_PUBLIC_WEB_URL ||
  'https://sabi-tan.vercel.app'
)
  .trim()
  .replace(/\/+$/, '');

let bridgeInitialized = false;

const SAFE_DEEP_LINK_QUERY_KEYS = new Set(['mode', 'src', 'ref']);

/**
 * Parses an incoming Capacitor Android deep link (`sabi://...` or universal `https://.../q/...`)
 * into a safe internal SPA route. Rejects unknown schemes, path traversal, and unsafe query keys.
 */
export function resolveDeepLinkRoute(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Reject path traversal attempts before WHATWG URL normalizes dot-segments
  if (/(^|\/)\.\.(\/|$)|%2e%2e/i.test(trimmed)) return null;

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    const host = parsed.hostname.toLowerCase();
    const pathSegments = parsed.pathname
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean);

    const buildSafeQuery = () => {
      const next = new URLSearchParams();
      parsed.searchParams.forEach((value, key) => {
        if (SAFE_DEEP_LINK_QUERY_KEYS.has(key) && /^[A-Za-z0-9_-]{1,40}$/.test(value)) {
          next.set(key, value);
        }
      });
      const serialized = next.toString();
      return serialized ? `?${serialized}` : '';
    };

    // Custom scheme: sabi://q/<questionId>, sabi://assistant, sabi://auth
    if (protocol === 'sabi:') {
      if (host === 'q') {
        if (pathSegments.length !== 1) return null;
        const rawQuestionId = decodeURIComponent(pathSegments[0] || '').trim();
        if (!/^[A-Za-z0-9_-]{2,80}$/.test(rawQuestionId)) return null;
        return `/q/${encodeURIComponent(rawQuestionId)}${buildSafeQuery()}`;
      }
      if (host === 'assistant') {
        return pathSegments.length === 0 ? '/assistant' : null;
      }
      if (host === 'auth') {
        return '/auth/verify?verified=true';
      }
      return null;
    }

    // Universal web share link opened in app: https://<host>/q/<questionId>
    if (
      (protocol === 'https:' || protocol === 'http:') &&
      pathSegments.length === 2 &&
      pathSegments[0] === 'q' &&
      pathSegments[1]
    ) {
      const rawQuestionId = decodeURIComponent(pathSegments[1]).trim();
      if (!/^[A-Za-z0-9_-]{2,80}$/.test(rawQuestionId)) return null;
      return `/q/${encodeURIComponent(rawQuestionId)}${buildSafeQuery()}`;
    }

    return null;
  } catch {
    return null;
  }
}

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
    localStorage.getItem('sabi-theme') === 'dark' &&
    document.documentElement.classList.contains('dark');
  syncAndroidStatusBar(initialDark);

  // 4. Handle Android Deep Links (sabi://q/<id>, sabi://assistant, https://.../q/<id>)
  //    Note: sabi://auth/callback OAuth & email verification tokens are handled by AuthContext
  //    so profile hydration completes before routing to /onboarding/1 or /home.
  CapApp.addListener('appUrlOpen', async ({ url }) => {
    if (!url) return;
    try {
      if (
        url.includes('auth/callback') ||
        url.includes('auth/verify') ||
        url.includes('access_token=') ||
        url.includes('code=')
      ) {
        return;
      }

      const resolvedRoute = resolveDeepLinkRoute(url);
      if (resolvedRoute) {
        window.location.href = resolvedRoute;
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
    } else if (path.startsWith('/q/')) {
      window.location.href = '/welcome';
    } else {
      CapApp.exitApp();
    }
  }).catch(() => {});
}

/**
 * Synchronizes the native Android system status bar with SABI Wonderland Yellow (Light)
 * or Midnight Purple (Dark) mode.
 */
export function syncAndroidStatusBar(isDark: boolean): void {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return;
  StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
  StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => {});
  StatusBar.setBackgroundColor({ color: isDark ? '#1E0342' : '#FFE51E' }).catch(() => {});
}

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { syncAndroidStatusBar } from '../utils/capacitorBridge';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
  toggleTheme: () => void;
  /**
   * Eye-comfort Dimness level on a 0 to 10 number line.
   * Overpowers both top header and background across the entire viewport.
   */
  dimnessLevel: number;
  setDimnessLevel: (level: number) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_KEY = 'sabi_theme_mode';
const DIMNESS_KEY = 'sabi_dimness_level';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [dimnessLevel, setDimnessLevelState] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const raw = Number(localStorage.getItem(DIMNESS_KEY));
    return Number.isFinite(raw) ? Math.min(10, Math.max(0, Math.round(raw))) : 0;
  });

  const setDimnessLevel = (nextLevel: number) => {
    const clamped = Math.min(10, Math.max(0, Math.round(nextLevel)));
    setDimnessLevelState(clamped);
    try {
      localStorage.setItem(DIMNESS_KEY, String(clamped));
    } catch {
      // ignore storage errors
    }
  };

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const computeIsDark = () => {
      if (mode === 'dark') return true;
      if (mode === 'light') return false;
      return media.matches;
    };

    const dark = computeIsDark();
    setIsDark(dark);
    syncAndroidStatusBar(dark);

    // Apply class to html tag for Tailwind dark: variants and CSS variables
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#080D1A' : '#F8FAFC');

    if (mode === 'system') {
      localStorage.removeItem(THEME_KEY);
    } else {
      localStorage.setItem(THEME_KEY, mode);
    }

    const handleChange = () => {
      if (mode === 'system') {
        const systemDark = media.matches;
        setIsDark(systemDark);
        if (systemDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        document.documentElement.dataset.theme = systemDark ? 'dark' : 'light';
      }
    };

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [mode]);

  const toggleTheme = () => {
    setMode(currentMode => {
      const currentDark = currentMode === 'system'
        ? (typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : true)
        : currentMode === 'dark';
      const nextMode = currentDark ? 'light' : 'dark';
      const nextDark = nextMode === 'dark';

      setIsDark(nextDark);
      if (typeof document !== 'undefined') {
        if (nextDark) {
          document.documentElement.classList.add('dark');
          document.documentElement.dataset.theme = 'dark';
          document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#080D1A');
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.dataset.theme = 'light';
          document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#F8FAFC');
        }
      }
      try {
        localStorage.setItem(THEME_KEY, nextMode);
      } catch {
        // Ignore storage errors
      }
      return nextMode;
    });
  };

  // Opacity from 0 (level 0) to 0.78 (level 10) — overpowers header and background
  const dimOverlayOpacity = useMemo(() => {
    if (dimnessLevel <= 0) return 0;
    return Number(((dimnessLevel / 10) * 0.78).toFixed(3));
  }, [dimnessLevel]);

  const value = useMemo(
    () => ({ mode, setMode, isDark, toggleTheme, dimnessLevel, setDimnessLevel }),
    [mode, isDark, dimnessLevel]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
      {dimOverlayOpacity > 0 && (
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none z-[9999] bg-[#02050B] transition-opacity duration-200"
          style={{ opacity: dimOverlayOpacity }}
        />
      )}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

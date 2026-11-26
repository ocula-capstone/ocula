import { useLayoutEffect, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const KEY = 'ocula-theme';
const listeners = new Set<() => void>();
// Kept in memory too, so the switch still works for this visit when storage is blocked.
let chosen: Theme | null = null;

// The saved choice, or else the computer's own light/dark setting. Storage can be blocked
// (private windows), so a failure there just means "nothing saved".
export function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // no storage: fall through
  }
  if (chosen) return chosen;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // not saved, but it still changes for this visit
    chosen = theme;
  }
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

// [current theme, setter]. Every component using it updates together.
export const useTheme = () =>
  [useSyncExternalStore(subscribe, readTheme, () => 'light'), setTheme] as const;

// Call once inside the app shell. The dark class sits on <html> only while the shell is on screen,
// so the login and register pages always stay light.
export function useApplyTheme() {
  const [theme] = useTheme();
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    return () => root.classList.remove('dark');
  }, [theme]);
}

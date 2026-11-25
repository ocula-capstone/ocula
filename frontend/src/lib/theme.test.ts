import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readTheme, setTheme, useApplyTheme, useTheme } from '@/lib/theme';

const systemPrefers = (dark: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: dark && query === '(prefers-color-scheme: dark)',
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.classList.remove('dark');
});

describe('readTheme', () => {
  it('follows the computer setting when nothing is saved', () => {
    systemPrefers(true);
    expect(readTheme()).toBe('dark');
    systemPrefers(false);
    expect(readTheme()).toBe('light');
  });

  it('uses the saved choice over the computer setting', () => {
    systemPrefers(true);
    localStorage.setItem('ocula-theme', 'light');
    expect(readTheme()).toBe('light');
  });

  it('ignores a saved value it does not know', () => {
    systemPrefers(false);
    localStorage.setItem('ocula-theme', 'purple');
    expect(readTheme()).toBe('light');
  });
});

describe('useTheme', () => {
  it('changes, saves and tells every user of the hook', () => {
    systemPrefers(false);
    const a = renderHook(() => useTheme());
    const b = renderHook(() => useTheme());
    expect(a.result.current[0]).toBe('light');
    act(() => setTheme('dark'));
    expect(a.result.current[0]).toBe('dark');
    expect(b.result.current[0]).toBe('dark');
    expect(localStorage.getItem('ocula-theme')).toBe('dark');
  });
});

describe('useApplyTheme', () => {
  it('puts the dark class on the page while in use, and takes it off when done', () => {
    systemPrefers(false);
    localStorage.setItem('ocula-theme', 'dark');
    const { unmount } = renderHook(() => useApplyTheme());
    expect(document.documentElement).toHaveClass('dark');
    act(() => setTheme('light'));
    expect(document.documentElement).not.toHaveClass('dark');
    act(() => setTheme('dark'));
    expect(document.documentElement).toHaveClass('dark');
    unmount();
    expect(document.documentElement).not.toHaveClass('dark');
  });
});

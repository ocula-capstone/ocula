import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// The test browser has no matchMedia. By default every screen-size query matches (a wide screen);
// a test can replace it with vi.stubGlobal('matchMedia', ...) to pretend to be a phone.
window.matchMedia ??= ((query: string) => ({
  matches: true,
  media: query,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
})) as unknown as typeof window.matchMedia;

// Every test starts from a clean DOM and empty browser storage.
afterEach(() => {
  cleanup();
  localStorage.clear();
});

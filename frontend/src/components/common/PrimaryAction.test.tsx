import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrimaryAction } from '@/components/common/PrimaryAction';

// Pretend to be a phone (no min-width query matches) or a wide screen (all of them do).
const screen = (wide: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: wide && !query.includes('prefers-color-scheme'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));

describe('PrimaryAction', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is the same button in the page on a phone as on a wide screen, not a floating one', () => {
    screen(true);
    const wide = render(<PrimaryAction label="Book a visit" />).container.innerHTML;
    screen(false);
    const phone = render(<PrimaryAction label="Book a visit" />).container.innerHTML;
    expect(phone).toBe(wide);
  });
});

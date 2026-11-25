import { expect, it } from 'vitest';

it('runs in jsdom with jest-dom matchers loaded', () => {
  expect(document.body).toBeInTheDocument();
});

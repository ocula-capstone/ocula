// The node types are only for reading the stylesheet in this test; the app itself does not use them.
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/index.css', 'utf8');

// Reads the colour tokens straight from index.css and checks the pairs the screens actually use
// against WCAG: 4.5:1 for text, so darkening or softening a background can never quietly make
// words hard to read.
const block = (start: RegExp) => {
  const from = css.search(start);
  return css.slice(from, css.indexOf('\n}', from));
};
const tokens = (text: string) =>
  Object.fromEntries(
    [...text.matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]),
  );
const light = tokens(block(/@theme inline|@theme/));
const clinical = { ...light, ...tokens(block(/^\.clinical-vision \{/m)) };
const dark = { ...clinical, ...tokens(block(/^\.dark \{/m)) };

const channel = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('text colours stay readable (4.5:1) on the backgrounds they sit on', () => {
  const white = '#ffffff';
  const pairs: [string, string, string][] = [
    // [text, background, where]
    ['ink', 'page', 'body text on the page'],
    ['ink', 'surface', 'body text on a card'],
    ['subtle', 'page', 'grey text on the page and on the filter fields'],
    ['subtle', 'surface', 'grey text on a card'],
    ['placeholder', 'page', 'a search box placeholder'],
    ['brand-text', 'surface', 'blue text on a card'],
    ['brand-text', 'page', 'blue text on the page'],
    ['brand-link', 'surface', 'a link on a card'],
    ['error', 'surface', 'red text on a card'],
  ];
  for (const [fg, bg, where] of pairs) {
    it(`light: ${where}`, () => expect(contrast(light[fg], light[bg])).toBeGreaterThanOrEqual(4.5));
  }
  for (const [fg, bg, where] of pairs) {
    it(`clinical vision: ${where}`, () =>
      expect(contrast(clinical[fg], clinical[bg])).toBeGreaterThanOrEqual(4.5));
  }
  for (const [fg, bg, where] of pairs) {
    it(`dark: ${where}`, () => expect(contrast(dark[fg], dark[bg])).toBeGreaterThanOrEqual(4.5));
  }

  it('white text on the solid buttons: brand blue, its hover, and the sidebar navy', () => {
    for (const bg of ['brand', 'brand-hover', 'navy-900', 'navy-800']) {
      expect(contrast(white, light[bg]), bg).toBeGreaterThanOrEqual(4.5);
      expect(contrast(white, clinical[bg]), `clinical ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

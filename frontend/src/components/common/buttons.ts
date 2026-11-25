// The four button looks used across the signed-in pages. All are at least 44px tall.
const base =
  'inline-flex min-h-11 items-center justify-center rounded-xl text-sm font-semibold outline-none focus-visible:ring-2';

export const primaryButton = `${base} bg-brand px-5 text-white hover:bg-brand-hover focus-visible:ring-brand-link focus-visible:ring-offset-2`;
export const outlineButton = `${base} border border-field-border px-4 text-ink hover:bg-page focus-visible:ring-brand-link`;
// White button on the navy block.
export const lightButton = `${base} bg-white px-5 text-ink hover:bg-page focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900`;
export const textLink =
  'inline-flex min-h-11 items-center rounded text-sm font-semibold text-brand-link underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand-link';

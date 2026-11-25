import { cn } from '@/lib/utils';

// The four button looks used across the signed-in pages. All are at least 44px tall.
const base =
  'inline-flex min-h-11 items-center justify-center rounded-xl text-sm font-semibold outline-none focus-visible:ring-2';

export const primaryButton = `${base} bg-brand px-5 text-white hover:bg-brand-hover focus-visible:ring-brand-link focus-visible:ring-offset-2`;
export const outlineButton = `${base} border border-field-border px-4 text-ink hover:bg-page focus-visible:ring-brand-link`;
// White button on the navy block.
export const lightButton = `${base} bg-white px-5 text-navy-900 hover:bg-page focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900`;
// A square outline button holding one icon (call, book a visit): 44px on phones, 40px on desktop.
export const iconOutlineButton = cn(
  outlineButton,
  'size-11 shrink-0 px-0 text-brand-text lg:size-10',
);
export const textLink =
  'inline-flex min-h-11 items-center rounded text-sm font-semibold text-brand-link underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand-link';

// The look of every filter button: a small label above the value, a chevron at the right, light
// blue while something other than the default is picked.
export const filterTrigger = (active?: boolean) =>
  cn(
    'flex min-h-11 items-center gap-2 rounded-lg px-3 text-left outline-none hover:bg-page focus-visible:ring-2 focus-visible:ring-brand-link lg:min-h-12',
    active && 'bg-brand/10 hover:bg-brand/10',
  );

import { cn } from '@/lib/utils';

// The four button looks used across the signed-in pages. All are at least 44px tall.
const base =
  'inline-flex min-h-11 items-center justify-center rounded-xl text-sm font-semibold outline-none focus-visible:ring-2';

export const primaryButton = `${base} bg-brand px-5 text-white hover:bg-brand-hover focus-visible:ring-brand-link focus-visible:ring-offset-2`;
// The main "create" action of a screen (Book a visit, New patient, ...): the sidebar's navy, so it
// matches the frame around it and is calmer than a bright blue. Brand blue in dark mode, where the
// navy would vanish into the cards.
export const actionButton = `${base} bg-brand px-5 text-white hover:bg-brand-hover focus-visible:ring-brand-link focus-visible:ring-offset-2 dark:bg-brand dark:hover:bg-brand-hover`;
export const outlineButton = `${base} border border-field-border px-4 text-ink hover:bg-page focus-visible:ring-brand-link`;
// White button on the navy block.
export const lightButton = `${base} bg-white px-5 text-navy-900 hover:bg-page focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900`;
// The buttons on a row of a list (Check in, Start exam, Open records):
// small, to sit beside the small status badges, and one size so a column of them lines up. Every
// action is the same width. Two looks only: solid for the step that is waiting on you (Start exam),
// and a soft blue tint for the rest. The "more" menu is a quiet grey square, like the filter fields.
// They look small but are easy to tap: an invisible strip above and below adds to the hit area.
const rowBase =
  'relative inline-flex h-8 items-center justify-center rounded-lg text-[13px] font-semibold outline-none after:absolute after:inset-x-0 after:-inset-y-1.5 focus-visible:ring-2 focus-visible:ring-brand-link';
export const rowAction = `${rowBase} w-28 shrink-0 gap-1.5 bg-brand/10 text-brand-text hover:bg-brand/15`;
export const rowActionSolid = `${rowBase} w-28 shrink-0 gap-1.5 bg-brand text-white hover:bg-brand-hover focus-visible:ring-offset-2`;
// A quiet text button for the lesser choice beside an action (Cancel): no fill until hovered.
export const rowGhost = `${rowBase} px-3 text-subtle hover:bg-page hover:text-ink`;

// A square outline button holding one icon (call, book a visit): 44px on phones, 40px on desktop.
export const iconOutlineButton = cn(
  outlineButton,
  'size-11 shrink-0 px-0 text-brand-text lg:size-10',
);
export const textLink =
  'inline-flex min-h-11 items-center rounded text-sm font-semibold text-brand-link underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand-link';

// The look of every filter button: a small label above the value, a chevron at the right, light
// blue while something other than the default is picked.
// A filter shown as a soft grey field with its name written above it (see FilterField): just the
// value and an arrow inside. Light blue while something is picked.
export const fieldTrigger = (active?: boolean) =>
  cn(
    'flex h-12 w-full items-center justify-between gap-2 rounded-xl px-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-link',
    active ? 'bg-brand/10 hover:bg-brand/15' : 'bg-page hover:bg-line/60',
  );

export const filterTrigger = (active?: boolean) =>
  cn(
    'flex min-h-11 items-center gap-2 rounded-lg px-3 text-left outline-none hover:bg-page focus-visible:ring-2 focus-visible:ring-brand-link lg:min-h-12',
    active && 'bg-brand/10 hover:bg-brand/10',
  );

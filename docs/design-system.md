# OCULA Design System

Source of truth for every screen. Starting point: the register page (kept as is). Extended with the
ui-ux-pro-max search (style: Minimalism & Swiss, healthcare palette) for the screens not built yet.

## Context

Optical clinic management for MRB Clinic (Pasay, Taguig). Trustworthy, calm, clean.

- Patient side (`/me/*`, public pages): mostly phones. One column, 44px+ touch targets, short forms.
- Staff and doctor side (`/staff/*`, `/doctor/*`): dense data (tables, exams, queues), mostly desktop and tablet.

## Colors

Hex values below are the register page's own. New screens use these, never new blues.

| Token | Hex | Use |
|---|---|---|
| `navy-900` | `#0D182E` | Brand panel, staff/doctor sidebar |
| `navy-800` | `#111E41` | Panel decoration circle |
| `navy-700` | `#14234F` | Panel decoration, icon boxes |
| `navy-muted` | `#A5B0C9` | Secondary text on navy (8.1:1) |
| `primary` | `#0E7490` | Solid accent buttons (Start exam, selected states), hover `#155E75`. Teal, from the healthcare palette, so Ocula is not another navy-and-blue app. White text on it is 5.4:1 |
| `action` | `#0D182E` (`navy-900`) | The main "create" button of a screen (Book a visit, New patient): the sidebar's navy. Brand blue in dark mode, where navy would vanish |
| `primary-link` | `#0E7490` | Links and accent text (`brand-text`), focus ring. Lighter `#67D4EA` in dark mode |
| `primary-on-dark` | `#3F74F2` | Accent text on navy |
| `ink` | `#0F1B45` | Headings, labels, input text |
| `muted` | `#566073` | Secondary text (4.5:1 or better on the page and on cards; checked in `src/lib/colorContrast.test.ts`) |
| `placeholder` | `#636B7A` | Placeholder only, never real content (4.5:1 on the page and on cards, the AA minimum). Set once for all inputs in `index.css`; typed text uses `ink` |
| `icon` | `#7B8499` | Field icons |
| `line` | `#DBE3EA` | Card and divider borders (decorative) |
| `field-border` | `#7B8499` | Input borders (3.75:1 on white, passes the 3:1 minimum for UI components) |
| `page` | `#EEF3F6` | App page background: a light cool grey |
| `surface` | `#FDFEFE` | Cards, the top bar and menus |
| `error` | `#DC2626` | Errors (bg `red-50`, text `red-900`) |
| `success` | `green-600` | Valid/match state |
| `teal` | `#0891B2` | Secondary accent: info, charts, staff highlights. Non-text, or large text only |
| `gold` | `#B8860B` | Warning/attention accents. Icons and borders only; text needs a darker shade |

Text on `primary` is white. Text on `teal` or `gold` is never small white text (fails 4.5:1).

## Typography

Inter for everything (loaded in `index.html`; `--font-inter` in `index.css`). Replaced Poppins and Plus Jakarta Sans: Inter is the standard of business software (Linear, Notion, GitHub, Figma), built for dense screens, with tabular numerals for IDs, phones and peso amounts. Desktop root size is 14px, with `text-xs` kept at 12px.

| Role | Size / weight |
|---|---|
| Page title | 32px / 700, line-height 1.2 (mobile 24-28px) |
| Brand headline | 44px / 700 (desktop panel only) |
| Body | 14px / 400 (16px for patient mobile inputs, avoids iOS zoom) |
| Label | 13px / 500 |
| Helper, error | 12px / 400 |
| Eyebrow | 10px, uppercase, tracking 0.22em, on navy only |

Minimum body size on mobile: 14px. Line-height 1.5+ for paragraphs.

## Spacing and radius

4px base. Gap between form fields 24px; label to field 7px.

| Context | Control height | Row/gap |
|---|---|---|
| Patient (mobile-first) | 44px inputs, 48px primary button | 24px between fields |
| Staff/doctor (dense) | 36-40px inputs, 40px table rows | 8-16px gaps |

Radius: fields, buttons, alerts `rounded-xl` (12px). Icon boxes `10px`. Cards `rounded-2xl`.

## Components

- **Field (IconField):** 44px box, `rounded-xl`, `1px` border `#DDE3EC`, white bg, 18px lucide icon at stroke 1.7 on the left, optional trailing action (Show/Hide). Visible label above, never placeholder-only.
- **Primary button:** `#3560E0`, white, 48px, `rounded-xl`, semibold, shadow `0 8px 20px -6px rgba(53,96,224,.5)`. Secondary: white with `#DDE3EC` border, ink text. Destructive: `#DC2626`.
- **Brand panel:** `#0D182E` with two offset circles, logo + wordmark, headline, feature list. Desktop only (1024px+); mobile shows the form with a compact logo.
- **Alert:** `rounded-xl`, border `#DC2626/40`, `red-50` bg, `role="alert"`.
- **Icons:** lucide-react only, no emoji.

## States

| State | Rule |
|---|---|
| Focus | Border `#2F5BE0` + 3px ring `rgba(47,91,224,.15)`. Never remove focus rings; custom buttons get `ring-2 #2F5BE0` |
| Error | Border + 3px ring `#DC2626`; message under the field (12px, `#DC2626`) linked with `aria-describedby`; `aria-invalid`. Form-level errors in an alert at the top |
| Loading | Button: `LoaderCircle` spinner + verb text ("Creating account…"), disabled. Pages and tables: skeleton (`animate-pulse`) that keeps layout, `aria-busy` |
| Empty | Icon, one-line explanation, one action ("No appointments yet. Book a visit"). Never a blank area |
| Success | Inline confirmation text or toast; green only when the value is valid |
| Disabled | 50% opacity, `cursor-not-allowed`, still readable |

## Motion

Subtle only. Hover/focus transitions 150-250ms; no animation on width/height; respect `prefers-reduced-motion`.

## Known conflicts (need a decision)

1. **Fonts:** CLAUDE.md says Fraunces (headings) + Instrument Sans (body). The app now uses Inter (chosen over Poppins, IBM Plex Sans, Figtree and Noto Sans because it is the familiar standard of business apps). Fraunces and Instrument Sans were never adopted.
2. **Navy and blue:** CLAUDE.md navy is `#0C2D5E` and the register panel is `#0D182E`. This doc follows the register page.
3. **Tokens:** the register page hard-codes hex values. Tailwind tokens for them are proposed separately and not applied yet.

## Rules for new screens

- Reuse these tokens; no new hex values in components.
- Patient screens: mobile first, test at 375px; staff screens: test at 1024px and 1440px.
- Contrast 4.5:1 for text, 3:1 for icons and borders; keyboard reachable; touch targets 44px+ on patient side.

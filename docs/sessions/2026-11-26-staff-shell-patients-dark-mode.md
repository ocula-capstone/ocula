---
title: Session notes — staff shell, Patient records, dark mode
date: 2026-11-26
branch: feature/phase-0-shell
status: work done and reviewed, NOT committed
tags: [ocula, frontend, session, patients, dark-mode, design]
---

# Session: staff shell, Patient records v2, dark mode (25–26 Nov 2026)

Related: [[frontend-roadmap]] · [[design-system]]

## What got built

### Patient records screen (staff) — revised design
- **One filter bar**: Branch, Status, Last visit, Clear all, Sort by.
- Nothing is pre-picked: every filter starts as **Select**. "All branches", "Any status" and "Any time" are real options inside each menu.
- **Branch / Status** are multi-select (any-of inside one filter, filters narrow each other). "All"/"Any" replaces the other picks; picking a specific one drops it.
- **Sort by** is multi-select too: sorts apply in the order they were ticked, later ones break ties; "Recently visited" is the silent final tiebreak.
- **Last visit** = a popover calendar under the button:
  - quick choices on the left (Any time, Today, Last 7 days, Last 30 days) are multi-select;
  - calendar picks a **range** (click start, click end; one click = one day);
  - a patient matches if the last visit fits **any** quick choice **or** the range;
  - own month/year panel instead of the browser `<select>` (which opened upward); no footer; Escape / click outside closes.
- Selected menu rows: soft blue tint, blue semibold text, trailing check (no checkbox/radio marks), a 4px gap between rows; counts right-aligned, **zero counts hidden**.
- Footer: Rows per page (opens upward, default 50), "Showing a–b of N", numbered pages with ellipsis.
- Subheading with no patients: "Patients from Pasay and Taguig will appear here" (no "0 patients").
- Branch button now tints blue when a branch is picked (same rule as Status / Last visit).

### Shell
- Staff sidebar ends with a **branch card** (MR · MRB Optical Clinic · Pasay branch); Settings and Sign out live in the account menu only (other roles keep their sidebar).
- Top bar sits in the **same centered column as the page** (max 1600px, gutter 21/28px), so the branch pill / search / account line up with the page title and "New patient".
- Account dropdown redesigned: header card (avatar, name, email, role · branch), Settings, **Dark mode switch**, Sign out (red); roomier padding.
- Greeting ("Good evening, Sam") is the same size as page titles (28px desktop).
- Desktop root font size **14px** (phones stay 16px); `text-xs`/`text-sm` floored at 12/13px so nothing drops below 12px.
- Font changed Poppins → **Inter** (tabular numerals in tables). Fonts decision log: Poppins → IBM Plex Sans (rejected) → Inter.

### Dark mode
- Toggle: switch row in the account dropdown. Persisted in `localStorage` key `ocula-theme`; falls back to the OS `prefers-color-scheme`.
- `src/lib/theme.ts` (store + `useTheme` + `useApplyTheme`). The `dark` class is on `<html>` **only while AppShell is mounted**, so login/register stay light.
- Tokens: `bg-surface` replaces `bg-white`; `text-brand-text` replaces `text-brand`; `.dark` overrides in `src/index.css`; `dark:` variants on StatusBadge, amber "warm" cards, ErrorState, overdue text.
- **Rule for every new screen:** use `bg-surface` / `text-brand-text`, never `bg-white` / `text-brand`; add `dark:` variants for tinted palette colours.

## Decisions and why
| Decision | Why |
|---|---|
| Native `type=date` inputs replaced by a styled `react-day-picker` calendar | User asked for a real calendar with a picker at the bottom |
| Added dependency `react-day-picker` (v10) | Accessible calendar; used unstyled with our own classes (its stylesheet is not imported) |
| Sort starts with "Select" but still orders newest-first | The list needs a steady order; no pick must not mean random |
| Dark class scoped to the shell | Auth pages are not themed yet |
| Interpretation of "Last visit multiple selection" | User chose: several quick choices + calendar picks combined as OR |

## Files worth knowing
- `src/features/patients/pages/PatientRecordsPage.tsx` (layout only now) · `usePatientList.ts` (the logic) · `columns.tsx`
- `src/features/patients/components/LastVisitPicker.tsx`
- `src/components/common/OptionMenu.tsx` (reusable single/multi menu), `UserMenu.tsx`, `GlobalSearch.tsx`, `Avatar.tsx`
- `src/lib/{theme,pagination,branchName}.ts`, `src/features/patients/format.ts`
- Tests: 251 passing across 45 files at the last full run; lint, tsc and build clean.

## Mistakes to avoid next time
- **Never run `prettier --write src`** — it reformats the generated `src/components/ui/*` files. Format only own folders (`src/features`, `src/components/common`, `src/app`, `src/lib`).
- `npx shadcn add …` can hang on a prompt and leave a half-written component. Do not use it for popovers; Base UI primitives are enough.
- After a cleanup that merges class strings, **look at the page**: `iconOutlineButton` first shrank its icons to a dot because `px-4` and `px-0` both stayed; wrap merged Tailwind strings in `cn()` (twMerge).
- Scratch screenshot scripts: always use the exact scratchpad path (hyphen, not a dot, in `joshuapierrea-bueza`).
- Testing Library `getByRole` does not take a regex role; use `querySelectorAll('[role^="menuitem"]')`.

## Test accounts (mocks, password `password123`)
`admin@`, `doctor@` (both branches), `staff@` (Pasay), `staff.taguig@` (Taguig), `patient@` — all `@ocula.test`. They only work with `VITE_USE_MOCKS=true`.

## Open items
1. **Not committed.** Show the diff first, commit in logical chunks; exclude `.obsidian/`, `docs/.obsidian/`, `docs/samples/`.
2. **Code review done (`/code-review high --fix` plus four cleanup reviewers); fixes applied.**
   Fixed: dark-mode switch did nothing when browser storage is blocked; a new search or sort kept the old page number; stale tab title after sign-out; blank email line for phone-only users; "Call list ready" shown with 0 overdue; stale status comments.
   Cleaned: patient page split by job into `usePatientList.ts` (filters, sorts, paging, memoised), `columns.tsx`, and a reusable `common/Pagination.tsx`; one `plural` helper (with thousands commas); one branch-name parser; shared `filterTrigger` button look + `FilterTriggerFace` (OptionMenu and LastVisitPicker); `iconOutlineButton`; `Avatar` solid tone in the account menu; StaffDashboard uses `PageHeader`; calendar date helpers moved to `lib/dates.ts`; dead code removed (`FilterTabs` counts, `PanelGroup`, unreachable `formatDayRange` cases, unused role line/helper); `Intl.Collator` for name sort.
   Account menu: no role line anywhere (button shows just the name; header card shows name + email).
   **Not done, on purpose (next time):**
   - Filter/sort/page state in the URL (so refresh/back/deep links work, e.g. dashboard cards linking to a filtered list); a `useListParams` hook.
   - Derive branch options from `useBranch()` instead of the hard-coded `['Pasay','Taguig']` (the test user has no branches, so tests need a fixture first).
   - A pre-paint script so dark mode does not flash light on load, and listening for OS theme / `storage` events.
   - One shared `selectedRow` class and one `focusRing` constant (the focus ring classes repeat ~30 times); one `warnText` amber constant; `DayRangeCalendar` as its own common component when Appointments/Billing need a date range.
   - Decide one toggle pattern for accessibility (`aria-pressed` vs menu checkbox roles).
3. Remaining staff screens, one per round, on "next": Appointments, Recalls, Billing (flag the revenue-like "Collected today" card), Job orders, Inventory, Auto-refractor, Settings.
4. Button-function rounds 1–6 (plan agreed, waiting for "go round 1"); stay on mocks until the user says an endpoint is ready.
5. Check dark mode on the other screens, the doctor and patient dashboards, and phone widths.
6. Earlier open: real-endpoint switch (A/B/C), admin Users page, offline screen, idle logout, security headers, consent/privacy page, ask Renz about optometrist write access.

## Deadlines
System done **31 Dec 2026** · data gathering **Jan 2027** · defense **24 Feb 2027**.

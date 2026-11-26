---
title: Session notes — staff shell, Patient records, dark mode
date: 2026-11-26
branch: feature/phase-0-shell
status: done, reviewed and committed on feature/phase-0-shell (not pushed, no PR yet)
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
1. **Committed, not pushed.** Commits on `feature/phase-0-shell`: `18e6293` (react-day-picker), `c4ea661` (docs: Inter), `7164271` (the feature work), `dea1c7e` (first version of this note). Next: push the branch and open a PR into `develop` when the user says so. Never merge unasked. `.obsidian/` and `docs/.obsidian/` stay uncommitted on purpose. (`docs/samples/register-polish.html` was a design sketch; deleted by request.)
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

## The designs you supplied (the target for each staff menu screen)
Saved from the chat. Status = what exists in the app now.

| Screen | Image | Status |
|---|---|---|
| Staff dashboard | [[#d01 Staff dashboard|d01]] | Built (2026-11-25), QA'd |
| Patient records | [[#d02 Patient records (first frame)|d02]] / [[#d05 Patient records (second frame)|d05]], then the revision [[#d11 Patient records, revised (filters, sort menu, footer)|d11]] | Built and revised; Last visit became a calendar, filters multi-select |
| Appointments | [[#d08 Appointments|d08]] | **Not built yet** (next) |
| Recalls & follow-up | [[#d03 Recalls and follow-up|d03]] | Not built yet |
| Billing | [[#d06 Billing|d06]] | Not built yet. Flag: the "Collected today ₱18,450" card looks like revenue, and staff must not see revenue |
| Job orders | [[#d09 Job orders|d09]] | Not built yet |
| Inventory | [[#d04 Inventory|d04]] | Not built yet |
| Auto-refractor | [[#d07 Auto-refractor|d07]] | Not built yet |
| Settings | [[#d10 Settings|d10]] | Not built yet (toggles, "Changes save automatically") |
| Account menu | [[#d12 Account menu, as it was when you asked for the change|d12]] (before) | Redesigned: header card, Settings, Dark mode, Sign out |

Build rule from the user: follow each design strictly, keep OUR logo, one screen per round, wait for "next", use the UI/UX skills, and keep our colours and Inter font (the comps' own fonts and colours are structure-only).

### d01 Staff dashboard
![Staff dashboard design](assets/2026-11-26/designs/d01-staff-dashboard.png)
### d02 Patient records (first frame)
![Patient records, first frame](assets/2026-11-26/designs/d02-patient-records-first-frame.png)
### d05 Patient records (second frame)
![Patient records, second frame](assets/2026-11-26/designs/d05-patient-records-second-frame.png)
### d11 Patient records, revised (filters, sort menu, footer)
![Patient records, revised](assets/2026-11-26/designs/d11-patient-records-revised.png)
### d08 Appointments
![Appointments](assets/2026-11-26/designs/d08-appointments.png)
### d03 Recalls and follow-up
![Recalls and follow-up](assets/2026-11-26/designs/d03-recalls-and-follow-up.png)
### d06 Billing
![Billing](assets/2026-11-26/designs/d06-billing.png)
### d09 Job orders
![Job orders](assets/2026-11-26/designs/d09-job-orders.png)
### d04 Inventory
![Inventory](assets/2026-11-26/designs/d04-inventory.png)
### d07 Auto-refractor
![Auto-refractor](assets/2026-11-26/designs/d07-auto-refractor.png)
### d10 Settings
![Settings](assets/2026-11-26/designs/d10-settings.png)
### d12 Account menu, as it was when you asked for the change
![Account menu before](assets/2026-11-26/designs/d12-account-menu-before.png)

> Not saved: the earlier reference images (initial design, phone view, dashboard variants, small sidebar crops) and the two small account-button crops from later in the session. Say if you want them in the vault too.

## How the session went (in order)
1. Revised **Patient records** design: one filter bar, sort menu, rows-per-page footer, numbered pages; staff sidebar branch card.
2. **Account menu** redesigned (header card, email, Settings, Sign out); later padding loosened and the role line removed from both the button and the menu.
3. **Type and layout**: desktop root 14px, `text-xs` floored at 12px, top bar aligned to the page column, content column widened to 1600px.
4. **Font**: Poppins → IBM Plex Sans (rejected) → **Inter**. The slop detector's only finding was 10.5px text, caused by the 14px root (fixed).
5. **Greeting** = page-title size (an over-eager sidebar resize was reverted).
6. **Last visit** went through five shapes: native From/To date inputs → popover calendar → day range → multi-select quick choices + range → own month/year panel, no footer, no dead height. Final: quick choices (multi) + range, any-of.
7. **Filters start empty** ("Select"), "All/Any" are options; checkbox marks replaced by tinted rows with a check; row gaps; zero counts hidden; empty subheading reworded; Branch tint; Sort by multi-select.
8. **Dark mode** in the account menu; padding fixed.
9. **Code review + cleanup** (see Open items 2), then three commits plus this note.

## Screenshots (taken while checking the work; 1440px unless noted)
Patient records, light:
![Patient records](assets/2026-11-26/01-patients-light.png)
![Footer with rows per page open](assets/2026-11-26/02-patients-footer-rows-per-page.png)

Filter menus (selected rows are tinted, with a check):
![Status menu](assets/2026-11-26/03-status-menu-selected-rows.png)
![Branch menu](assets/2026-11-26/04-branch-menu.png)
![Sort by, multi-select](assets/2026-11-26/08-sort-by-multi-select.png)

Last visit calendar:
![Calendar, days](assets/2026-11-26/05-last-visit-calendar-days.png)
![Calendar, month and year panel](assets/2026-11-26/06-last-visit-calendar-month-year-panel.png)
![Calendar with quick choices and a range picked](assets/2026-11-26/07-last-visit-multi-select-range-and-quick-choices.png)
![Calendar month panel on a phone (390px)](assets/2026-11-26/09-calendar-on-phone.png)

Account button and menu:
![Account button](assets/2026-11-26/10-account-button-roomier.png)
![Account menu with the Dark mode switch](assets/2026-11-26/11-account-menu-dark-mode-switch.png)

Dark mode vs light:
![Staff dashboard, light](assets/2026-11-26/12-staff-dashboard-light.png)
![Staff dashboard, dark](assets/2026-11-26/13-staff-dashboard-dark.png)
![Patient records, dark](assets/2026-11-26/14-patients-dark.png)
![Calendar, dark](assets/2026-11-26/15-calendar-dark.png)

> The test rows in these shots (e.g. "Test Person 534") are temporary fake data that was removed from `samples.ts` after each screenshot.

## Deadlines
System done **31 Dec 2026** · data gathering **Jan 2027** · defense **24 Feb 2027**.

---
title: Session notes — Appointments table, Clinical Vision colours, sliding menus, code review
date: 2026-11-27
branch: feature/phase-0-shell
status: done, reviewed and committed on feature/phase-0-shell (not pushed, no PR yet)
tags: [ocula, frontend, session, appointments, colours, design, qa]
---

# Session: Appointments table, colour guide, motion, review (26–27 Nov 2026)

Related: [[frontend-roadmap]] · [[design-system]] · [[2026-11-26-staff-shell-patients-dark-mode]]

Commits: `9cfd00f` feat (everything below) · `818767c` fix (code-review findings). Both on top of `8991bd1`.

## What got built

### Appointments list (staff) — now a table
- Groups, each holding one kind of visit, empty groups left out:
  **Needs attention now** (Waiting only, longest wait first) · **In exam** · **Later today** (Booked) ·
  **Done** (folded, Show / Hide) · **Not attending** (Cancelled + No-show).
- Columns: Time · Patient (initials, name, service, JO note, wait time) · Doctor · Status pill · one 44px action · "⋯" menu.
- Main action by status: Booked → Check in · Waiting → Start exam · In exam / Done → Open records · Cancelled / No-show → Rebook.
- "⋯" menu per status, risky item last in red under a line. Cancel opens a reason dialog (Patient asked / Clinic had to / Other).
- No-show only from 15 minutes after the visit starts. Restore (refused with a plain message if the time was taken), Reopen, Undo toast for every step.
- A patient with 2+ no-shows gets an amber "2 no-shows" label. Cancelled rows show "Cancelled by patient, Nov 25".
- Open slots show inside "Later today" with a Book button, only when one day is on screen and no search/filter is narrowing.
- Footer: "Showing all 10 visits today, plus 2 that did not happen." Empty states: "No visits today" (+ Book a visit) / "No visits on …" / "No visits match".
- Phones: the same rows become small cards.
- Files: `groups.ts` (pure rules), `VisitTable.tsx`, `VisitActions.tsx`, `VisitStatusPill.tsx`, `CancelVisitDialog.tsx`; store gained `cancelVisit(by)`, `undoCheckIn`, `undoStart`, `reopenVisit`, `restoreVisit`.
- Deviations from the pasted spec: **Start exam only changes status** (you called navigation a bug); Cancelled shows by default; "Add to recalls" is toast-only (no recalls store yet).

### Filter card
- Search is a fixed 26rem; Day / Week / Month tabs sit beside it with **Clear all** next to the tabs (only when something is active); result count at the right end; Date / Doctor / Status below.
- Phone keeps the order: search, tabs, Clear all, filters, count.

### Colours — "Clinical Vision" guide
- Set once on `<html class="clinical-vision">` (index.html), so **every page, login and register included**, all four roles.
- Navy `#102B46` fills actions + sidebar + headings · teal `#087E8B` for links/accents (text uses `#077A86`, a hair darker, to pass 4.5:1 on Soft Ice) · Soft Ice `#F3F7FA` page · Pure White cards · Cool Border `#E5EDF3` · Vision Cyan `#39BFC5` as the accent on navy (login headline, sidebar icons).
- Status pill colours deliberately **not** changed (the guide gave swatches without hex codes). Dark mode lifted a few steps (page `#232F4B`) and not re-themed to the guide.
- Journey, so it is not repeated: brighter blue was too bright → darker navy was too dark/generic → teal → "navy blue like the sidebar" → the supplied guide. Initials circles moved off indigo onto the navy tint.
- `colorContrast.test.ts` reads the tokens from `index.css` and checks 4.5:1 text pairs in light, Clinical Vision and dark.

### Motion
- `useSlideTo` hook measures the selected item and slides one highlight to it (300ms, off for reduced motion, no animation on first paint).
- Used by: Day / Week / Month tabs (with thin dividers that fade next to the selection), the staff sidebar, and the patient bottom bar on phones (a line along the top).

## Code review and QA (end of session)
- `/code-review high --fix origin/develop`: 7 findings. **Fixed 4** (commit `818767c`, 5 new tests that fail on the old code):
  1. Open slots vanished on a day with no Booked visits.
  2. Rescheduling to the same time opened a slot the visit still held.
  3. Moving then cancelling left duplicate slots with one id.
  4. New patient form stayed open after picking, so Change showed the form, not search.
- QA: lint, CI formatting check, tsc, build and **394 tests** green; no demo data in the production bundle; browser sweep of **78 pages** (staff, doctor, patient, admin × 1440 / 390 / 320px) found no crashes, JS errors, missing headings or horizontal scroll. The 401s in the console are the designed session restore on reload.
- Not checked: dark mode on every page, the real backend (all on mocks).

## Open items (known, not fixed)
1. **Same-name patients**: My appointments matches by display name, so two "Maria Santos" see each other's visits and share the 2-visit cap. Needs a patient id on the login user.
2. **No branch on appointments**: lists and double-booking checks ignore the branch (Pasay can block Taguig). Needs `branch` on Appointment and slots.
3. **Staff dashboard buttons**: "Check in" / "Start exam" do nothing and the dashboard reads static data, not the appointments store.
4. Under-the-table line reads "Showing all 0 visits on …, plus 1 that did not happen" when a day only has a no-show.
5. Dark mode not re-themed to the Clinical Vision guide; status pill hex codes still to come.
6. Roll-out ideas not requested: Visits column on the patients table, persist the Table / Cards choice.

## Before merging
- Branch must absorb `develop` (it has `.github/workflows/frontend-ci.yml`) so "Frontend checks" runs; the `protect-main-branches` ruleset already requires it.
- Push needs the one-off credential override (keychain token lacks the `workflow` scope): `git -c credential.helper= -c "credential.helper=!gh auth git-credential" push`.
- Merge only when told; PR into `develop`, then `develop` → `main`.

---
title: Backlog, problems, suggestions, features, architecture and functions (whole session)
date: 2026-11-27
branch: develop (docs only, not committed)
status: reference; compiled from the whole 25–27 Nov working session
tags: [ocula, frontend, backlog, architecture, reference]
---

# Backlog and reference — everything from the session

Related: [[2026-11-27-appointments-table-colours-code-review]] · [[2026-11-26-staff-shell-patients-dark-mode]] · [[frontend-roadmap]] · [[design-system]]

State at the end: PR #53 merged into `develop` (merge `ac63024`); Frontend CI green before and after the merge; 394 tests; `main` untouched.

---

## 1. Problems that need fixing

### Bugs and gaps found in code review (known, NOT fixed)
- [ ] **Same-name patients.** `MyAppointmentsPage` matches visits by display name (`v.patient === name`); `upcomingFor` counts the 2-visit cap by name. Two "Maria Santos" see and can cancel each other's visits. Needs a patient-record id on the login user, then match on `patientId`.
- [ ] **No branch on appointments.** `Appointment` and `OpenSlot` have no `branch`; the list says "Booked visits at {branch}" but shows every branch, and `findConflict` ignores branch (a Pasay 10:00 "Any doctor" blocks Taguig). Add `branch` to both, filter and conflict-check by the current branch.
- [ ] **Dashboard buttons do nothing.** Staff dashboard `NextStepButton` ("Check in" / "Start exam") has no `onClick`; the dashboard reads static `todayQueue`, so check-ins on Appointments never update its counts or "Next:" line. Wire to `checkIn` / `startExam` and derive from `useAppointments`.
- [ ] **Odd footer wording.** A day with only a no-show reads "Showing all 0 visits on Tue, Nov 24, plus 1 that did not happen." Reword when nothing happened.

### Stale or inconsistent after the colour work
- [ ] **Docs are wrong.** `docs/design-system.md` and `CLAUDE.md` still list palettes written mid-session (teal `#0E7490`, page `#EEF3F6`, "navy `#0D182E` also the create button"). Live palette is Clinical Vision: navy `#102B46`, teal `#087E8B` (text `#077A86`), Soft Ice `#F3F7FA`, Pure White, Cool Border `#E5EDF3`, Vision Cyan `#39BFC5` on navy.
- [ ] **Two palettes in `index.css`.** The `@theme` base values (older) plus the `.clinical-vision` override on `<html>`. Once every screen is checked, fold the override into `@theme` and delete the class (and its comment).
- [ ] **Status pill colours not matched to the guide.** The guide showed Waiting / In exam / Completed / Cancelled swatches without hex codes; pills are unchanged and "In exam" is still indigo. Need exact hex codes.
- [ ] **Dark mode** is lighter (page `#232F4B`) but not re-themed to the guide and not checked on every page. Dashboard `StatusLabel` / `StatusBadge` "info" still use cyan.
- [ ] **Hard-coded hex on auth pages** (login/register panels) instead of tokens.
- [ ] **Deviations to confirm:** teal text darkened to `#077A86` (guide's `#087E8B` is ~4.46:1 on Soft Ice); selected Day tab is a navy fill (guide shows a pale cyan tint); Vision Cyan used only as the accent on navy.

### Deviations from the pasted Appointments spec
- "Start exam" only changes status; it does not open the chart (you called navigation a bug). One-line change if wanted.
- "Add to recalls" is a toast only (no recalls store yet).
- Cancelled visits show by default in "Not attending" (they used to hide until ticked in Status).
- Phones use wrapped card rows; "Clear all" sits on its own line under the tabs on phones.
- Open slots show only when one day is on screen and no search/Doctor/Status filter is on.

### Environment and process
- [ ] **Mock accounts do not exist on the testing backend.** Mock logins (`staff@ocula.test` etc., password `password123`) only work on local dev. Testing backend has one seeded admin (from backend `.env`: `ADMIN_EMAIL`, `ADMIN_PHONE`, `ADMIN_INITIAL_PASSWORD`, forced password change). Admin screens are placeholders, so staff cannot be created in the UI.
- [ ] **Possible production/testing mix-up.** Supabase header showed `main · PRODUCTION` while testing. Confirm testing and production use separate databases (conflicts with "production = real data").
- [ ] `.env.development.local` has `VITE_API_URL` pointing at the real backend with mocks on: login works through MSW but the setup is confusing. `/auth/me` 401 on reload is by design (triggers refresh).
- [ ] CI warns "Node 20 actions forced to Node 24" (bump `actions/checkout`, `setup-node`).
- [ ] Build warns about a chunk over 500 kB (code-split routes).
- [ ] Root `.obsidian/` folder is untracked: commit or git-ignore (vault settings in `docs/.obsidian/` are tracked).
- [ ] Ruleset "require branches to be up to date" not confirmed on; two PRs passing alone could still clash.
- [ ] Memory notes (`phase-0-progress`, etc.) are out of date.

### Buttons that do nothing yet
Found by scanning every `<button>`, `Button`, `PrimaryAction` and `NextStepButton` for a missing click action, then checking each by hand. They look real but have no handler or destination.

| Where | Button | Needs |
|---|---|---|
| Staff dashboard, Today's queue (`TodayQueue` → `NextStepButton`) | **Check in** / **Start exam** | call `checkIn` / `startExam` from the appointments store, and build the queue from `useAppointments` (also listed in section 1) |
| Patient records (staff) | **New patient** (top right) | a create-patient form (name, phone, birth date, branch); `PatientPicker` already has a small "New patient" capture to reuse |
| Billing (staff) | **New bill** | the Billing round and its backend endpoints |
| Job orders (staff) | **New job order** | the Job orders round and endpoints |
| Job orders board | **Mark picked up** (per row) | move the job to the Picked up stage |
| Inventory (staff, admin, doctor) | **Add item** | an add-item form (backend `products` and stock movements exist on `develop`) |
| Auto-refractor (staff, doctor) | **New scan** | scan upload / entry (OCR phase) |
| Auto-refractor scan rows | **Verify and save** | mark a scan Verified and save it |
| Patient dashboard | **Confirm appointment** | confirm the next visit (set a status or flag); there is no confirm state yet |
| Frame finder (patient) | **Upload a front-facing photo** and **Use the camera instead** | the upload and camera flow (Phase 6 / AI frame recommendations) |

**Partly working (look finished but are not)**
- Appointments "⋯" → **Add to recalls**: shows a toast only; no recalls store.
- Staff dashboard → **Send pickup texts**: a link to the Job orders board; no texting exists (and online booking is SMS-free by decision).
- Appointments **Start exam**: only changes status by design (it does not open the chart).
- Recalls → **Call** (`CallLink`): a plain `tel:` link; no call log or "done" button, although the old design notes mention Text / Done.

**Not buttons, but dead ends**
- `src/App.tsx` is leftover Vite boilerplate (teal "OCULA" heading and an inert "Book appointment" button). Nothing imports it (`main.tsx` uses the router). Delete it.
- Public pages `/`, `/services`, `/frames`, `/branches`, `/doctors` and the admin pages (users, branches, reports, audit log) are `Placeholder` screens with no actions at all.

**False alarms from the scan (these work):** the mobile menu button, the filter and Sort menus, the account menu and the dashboard "+ New" menu are all menu triggers that open something.

---

## 2. Not yet done

### Staff screens (designs supplied; one per round, then stop for "next")
Order: **Recalls → Billing → Job orders → Inventory → Auto-refractor → Settings** (Patients and Appointments done).
- Billing design shows "Collected today ₱18,450" (revenue-like) on a staff screen; you said staff must not see revenue → build as designed but flag.
- Billing and Job orders have no backend endpoints yet; buttons stay inert until their rounds.

### Other areas (from the roadmap, mostly blocked on backend)
Doctor screens · patient portal (records, prescriptions, frame finder, my appointments done) · admin screens (users, branches, reports, audit log, dashboard — placeholders) · public site (Home, Services, Frames, Branches, Doctors — placeholders) · notifications · OCR · EOD report and dashboards · Google sign-in and recovery-code reset · production launch.

### Switch-overs
Move each screen from MSW mocks to the real API only when you say its endpoint is ready (appointments API does not exist yet; store is in memory).

### Deadlines
Done by 31 Dec 2026 · January data gathering · defense 24 Feb 2027.

---

## 3. Suggestions (offered, not decided)
- Visits column on the patients table; persist the Table / Cards choice; apply the new button system to the patient cards.
- Roll Clinical Vision to dark mode, then delete the duplicate palette.
- A real **Walk-ins waiting list** (chosen early on; the "add walk-in" button was later removed, so only the Waiting status exists today).
- Wire the dashboard to the appointments store; split routes to fix the chunk warning.
- Sliding highlight for any remaining tab bars; bottom menu bar for staff on phones.
- Colour variants if teal/navy need tuning: all-navy (quieter) vs. teal fills (fresher); each is one token in `index.css`.
- Online booking stays free of SMS (no cost): protections are account-first booking, instant confirmation and the 2-visit cap.

---

## 4. New features built (25–27 Nov)

**Appointments (staff)** — table in groups: Needs attention now (Waiting only, longest first) · In exam · Later today (Booked) · Done (folded, Show/Hide) · Not attending (Cancelled + No-show). Columns Time · Patient · Doctor · Status pill · 44px action · "⋯". Actions by status: Check in / Start exam / Open records / Rebook. Cancel-reason dialog (Patient asked / Clinic had to / Other). No-show only from 15 min after start. Restore (refused with a plain message if the time was taken), Reopen, Undo toast on every step. "N no-shows" label for repeat no-shows, "Cancelled by patient, Nov 25" notes, open-slot rows with Book, footer line, empty states. Phone card layout.

**Filter card** — fixed 26rem search, Day / Week / Month tabs with dividers and Clear all beside them, count at the right end, Date / Doctor / Status below. Day/Week/Month tabs and a calendar-range Date picker with quick choices.

**Booking** — shared centred modal; time grid showing taken times; patient picker (search saved patients, or "New patient"); doctor and service dropdowns; doctor-aware double-booking prevention; past times blocked for patients; reschedule keeps patient and moves the visit.

**Patient side** — "My appointments" with a cap of 2 upcoming and cancel/reschedule; `/book` redirects to register first (account required, instant confirmation).

**Patient records (staff)** — search card, labelled Branch / Status / Last visit / Sort filters, Table | Cards toggle, cards with total visits, Last-visit popover calendar, new pagination (rows per page, "Showing a–b of N", numbered pages), Clear all also when only sort is set.

**Shared parts** — `Modal`, `CalendarPanel`, `DateRangePicker`, `OptionMenu` (field/bare), `FilterField`, `FilterTabs` (sliding), `Pagination`, `PrimaryAction`, `PageHeader`, `ListRow` + `StatusLabel`, `Avatar`, `UndoToast`, `VisitStatusPill`.

**Colour and motion** — Clinical Vision guide on every page (set on `<html>`, so login and register too); lighter dark mode; `useSlideTo` sliding highlight on the tabs, staff sidebar and patient bottom bar; contrast test (4.5:1) over light / Clinical Vision / dark.

**Safety and tooling** — demo data only in mock mode and tree-shaken from production; frontend CI "Frontend checks" required on PRs into `develop` / `main`; global search removed; date-of-birth field accepts typed slashes; code review fixes (open slots, duplicate slot ids, same-time reschedule, new-patient form reset).

---

## 5. Architecture

- **Repo:** monorepo. `frontend/` React 19, TypeScript (strict, `verbatimModuleSyntax`, `erasableSyntaxOnly`), Vite, Tailwind v4 (tokens in `src/index.css`), shadcn/ui on Base UI (`base-nova`), react-router v7, react-day-picker v10, Vitest + Testing Library, Playwright for browser checks. `backend/` NestJS + Prisma + Supabase Postgres (not edited from frontend work).
- **Structure:** `src/features/<name>/` with `pages/`, `components/`, `api.ts`, `types.ts`, `schemas.ts`; shared UI in `src/components/common` (and generated `src/components/ui`, never hand-edited); hooks in `src/hooks`; helpers in `src/lib`; mocks in `src/mocks`.
- **Roles and routes:** admin `/admin/*`, staff `/staff/*`, optometrist `/doctor/*`, patient `/me/*`; public `/`, `/services`, `/frames`, `/branches`, `/doctors`, `/book`, `/login`, `/register`, `/forgot-password`, `/reset-password`. Guards in `src/app/router.tsx` (`RequireRole`).
- **Auth:** login with email or phone (phone is the unique ID); bearer tokens (access in memory, refresh rotated); `mustChangePassword` only for temporary passwords. Reload calls `/auth/me` → 401 → refresh (by design).
- **API and mocks:** all calls through `src/api/client.ts`; MSW handlers in `src/mocks/handlers` intercept `*/api/*` when `VITE_USE_MOCKS=true` in dev; demo data (`mocks/data/demo.ts`) only when `import.meta.env.DEV` and mocks on.
- **State:** in-memory module stores read with `useSyncExternalStore` (appointments, undo toast, theme) until the API exists; TanStack Query for server data.
- **Theme layers (later wins):** `@theme` tokens → `.clinical-vision` on `<html>` (index.html) → `.dark` (only while `AppShell` is mounted, so auth pages stay light). Components use tokens (`bg-surface`, `text-brand-text`, `bg-brand`, `text-ink`, `border-line`), never raw white/blue.
- **Layout pattern:** phone-first wrapped rows vs md+ grid (`role="table"` on a div grid for the visit table); CSS-var grid columns; `lg:contents` wrappers.
- **Motion:** one measuring hook (`useSlideTo`) places an absolutely positioned highlight over the selected item, sliding 300ms, off for reduced motion, no first-paint animation.
- **Quality gates:** `npm run lint`, `npx prettier --check` on the CI folders (never `prettier --write src`), `tsc -b`, `vite build`, `npm test`; CI "Frontend checks" runs all of them on a temporary merge of the PR.
- **Git flow:** `feature/*` / `fix/*` / `docs/*` → PR into `develop` (testing) → `develop` → `main` (production). Never push to those two directly. Conventional Commits. Push needs the one-off credential override because the keychain token lacks the `workflow` scope: `git -c credential.helper= -c "credential.helper=!gh auth git-credential" push`.
- **Deploys:** Vercel builds frontend and backend; testing frontend uses backend `https://ocula-mu.vercel.app` (`VITE_API_URL` without `/api`).

---

## 6. Functions and modules reference

### `features/appointments/groups.ts` (pure rules)
- `groupVisits(visits, day, today, keepLater?)` → ordered groups (attention, exam, later, done, away); empty groups dropped, `later` kept when open slots exist.
- `canMarkNoShow(visit, now)` → earlier day true; today only from start + 15 min.
- `countNoShows(all, of)`, `countThatHappened`, `countThatDidNot` — counts by patientId, else name.
- `cancelNote(visit)` → "Cancelled by patient, Nov 25" / "by clinic" / "Cancelled, Nov 25".
- `summaryLine(shown, away, when)` and `dayWords(day, today)` — footer text.

### `features/appointments/store.ts` (in-memory, replace with API later)
- `useAppointments()` → `{ visits, slots }`.
- Status steps (each shows an Undo toast): `checkIn`, `startExam`, `markNoShow`, `undoCheckIn`, `undoStart`, `reopenVisit`.
- `cancelVisit(id, by)` — records who and when, frees the time as an open slot. `restoreVisit(id)` — back to Booked, refused with a message if the time is taken.
- `saveBooking(input, rescheduleId?)` — books or moves; frees the old time only if it moved and was still held.
- `findConflict`, `overlapping`, `blocks` — double-booking (30-minute visits; "Any doctor" clashes with everyone).
- `upcomingFor`, `MAX_UPCOMING` (2), `VISIT_MINUTES` (30).

### `features/appointments/days.ts` and `slots.ts`
`rangeFor`, `datePresets`, `daysIn` / `daysInAll`, `weekOf`, `addDays`, `formatDay`, `formatRange`, `to24` / `from24` / `minutesOf`, `waitText`; `slotTimes`, `freeCount`.

### Components
`VisitTable` (grid, group bars, rows, empty state, footer), `VisitActions` (`MainAction`, `MoreMenu`), `VisitStatusPill`, `CancelVisitDialog`, `BookingModal`, `TimeGrid`, `PatientPicker`, `DateRangePicker`, `PatientCards`, `LastVisitPicker`.

### Hooks and libs
- `useSlideTo(ref, selector, deps)` → `{ style, animate, found }`; `useNow`, `useIsDesktop`, `useMediaQuery`, `useTodayLine`.
- `usePatientList` (filters, sort, paging, Clear all), `recordsLink(patient)`.
- `showUndo(message, undo?)`, `currentToast`, `dismissUndo` (`lib/undoToast.ts`).
- `lib/dates.ts`: `manilaToday`, `formatDateInput`, `isBirthDate`, `toIsoDate`, `dayToDate`, `dateToDay`, `formatManila*`.
- `lib/theme.ts`: `useTheme`, `useApplyTheme`, `readTheme`.

### Tests worth knowing
`colorContrast.test.ts` (reads `index.css` tokens, 4.5:1 in three modes), `groups.test.ts`, `store.test.ts`, `AppointmentsPage.test.tsx`, `VisitTable.test.tsx`, `PatientPicker.test.tsx`, `demo.test.ts`.

---

## 7. Test accounts and testing environment
Mock accounts (local dev only, password `password123`): `admin@ocula.test`, `staff@ocula.test` (Pasay), `staff.taguig@ocula.test`, `staff.temp@ocula.test` (must change password), `doctor@ocula.test`, `doctor.temp@ocula.test`, `patient@ocula.test`, `patient.temp@ocula.test`.
Testing site: real backend; Supabase `users` had admin, `test.staff@example.com` (staff), a patient and an optometrist. A staff account can be created by the admin API (`POST /api/users`, returns a temporary password once), by a script run in a normal terminal, or by an SQL insert (`id` and `updated_at` have no DB defaults; link `user_branches`).

## 8. Working rules and lessons
- Mock first until told an endpoint is ready; never merge or push unasked; diff before commit; never edit `backend/`, `src/components/ui/`, `.env`.
- Pre-commit: `git status`, `git check-ignore -v graphify-out`, `ls .git/hooks | grep -v sample`, branch check.
- Never `prettier --write src` (reformats generated UI); use the CI folder list. Multi-line `sed` fails on macOS: use Python or the edit tool. In zsh quote `--include='*.ts'`.
- Keep our fonts and colours when copying reference designs; every UI task goes through ui-ux-pro-max (Figma designs are structure-only); phone layouts are adaptations of desktop designs.
- Obsidian vault = `docs/`; session notes in `docs/sessions/`; images git-ignored.

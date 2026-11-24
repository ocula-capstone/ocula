# OCULA Frontend Roadmap

> **For agentic workers:** this is a roadmap, not a task-by-task plan. Before starting a phase, write
> that phase's own plan (superpowers:writing-plans) in `docs/superpowers/plans/`, then execute it with
> superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** every screen for the four roles working against the real API by **31 December 2026**, so
**January 2027 is data gathering** on the production site with real clinic data (defense
24 February 2027). Production launches about **28 December** (an estimate; earlier if the work is
ahead). The front-desk flow (Patients → Appointments → Billing → Job orders) is built first.

**Architecture:** mock-first vertical slices. Every phase builds its screens against MSW mocks whose
fields copy Renz's Prisma schema (`backend/prisma/schema.prisma`). A screen switches to the real
endpoint only when the user says that endpoint is ready; then Renz's Swagger docs (`/api/docs`) win
over the endpoint names proposed here. Shared screens (Patients, Inventory, EOD) serve several roles;
permissions decide what each role can do, not copies per role.

**Tech stack:** React 19, TypeScript, Vite, Tailwind v4, shadcn/ui (Base UI), React Router,
react-hook-form + zod, MSW. Added in Phase 0: TanStack Query, Vitest + Testing Library.

**Source:** brainstorm and review of 23–24 Nov 2026 (decisions recorded under "Decisions" below),
`CLAUDE.md`, `PRODUCT.md`, `docs/design-system.md`.

## Where things stand (24 Nov 2026)

- **Done (frontend):** login, register, forgot/reset password, change password, logout button, role
  guards for admin/staff/optometrist/patient, remembered-page redirect, `VITE_API_URL` base URL
  (PR #39), mock sessions that survive a reload, design tokens.
- **Not done (frontend):** every other route is a `<Placeholder>` in `src/app/router.tsx`; feature
  folders under `src/features/` are empty; layouts have no sidebar or nav; no TanStack Query; no tests;
  no frontend CI.
- **Backend (develop):** `/api/auth/*` (login, register, refresh, logout, me, change-password,
  forgot-password, reset-password), `/api/users` (list, get, create, update, reset-password),
  `/api/branches` (list, update), `/api/audit-logs`, `/api/settings`, `/api/health`. Not yet:
  patients, appointments, exams, prescriptions, products and inventory, orders and payments, job
  orders, OCR, recalls, notifications, reports, and the identity changes under "Decisions". Renz has
  committed to the domain endpoints by 29 November 2026.
- **Deploys:** frontend testing `ocula-testing.vercel.app`, production `ocula-system.vercel.app`;
  testing backend `ocula-mu.vercel.app` (working as of 24 Nov per the user; CORS for
  `ocula-testing` and `VITE_API_URL` on its Vercel project still to confirm). No production backend or
  production database yet (Phase 15).

## Decisions (from the brainstorm and review)

**Schedule and environments**

- Deadline: **system complete 31 December 2026**, working through the holidays.
- **Production** (`ocula-system`) is where January data gathering happens, with **real clinic data**:
  optometrists, staff and patients use it. It gets its own backend deploy and its own Supabase database,
  with backups. Never run throwaway accounts or test scripts against production.
- **Testing** (`ocula-testing`, `ocula-mu`) holds **fake data only**. IT experts evaluate there
  (ISO/IEC 25010) and may try anything. It can be wiped and reseeded.
- **January freeze:** during data gathering only bug fixes are promoted from `develop` to `main`.
- Every role is evaluated, so no role's screens can be left as placeholders.
- Build order: **demo spine first, on mocks** (option 1). One PR per phase into `develop`, merged only
  when the user says so. A frontend CI check (lint, build, tests) runs on every PR.

**Screens per role**

- **Public:** Home, Services, Frames, Branches, Doctors, Book, FAQs, Login, Privacy Policy.
- **Patient `/me`:** Appointments, Records, Prescriptions, Frame finder, Notifications.
- **Optometrist `/doctor`:** Schedule, Patients, Exams, Inventory, EOD report.
- **Staff `/staff`:** Patients, Appointments, Billing, Job orders, OCR, Recalls and follow-ups,
  Inventory, EOD report, Dashboard.
- **Admin `/admin`:** Users, Branches, Audit log, Reports overview, Inventory (view and edit).
- OCR: **the backend reads the photo**; the frontend uploads and shows an editable result.

**Identity and passwords**

- **Phone number is the unique ID** and is required for every login account (admin, staff,
  optometrist, patient). **Email is optional for patients** and required for admin, staff and
  optometrist.
- **Only the login's phone is unique.** A patient file's phone is a contact number and is not unique. A
  child or elderly patient without their own login is a patient file with no login, with the parent's
  phone stored as the contact number.
- **Birth date is required** at patient registration and on the staff new-patient form (the recovery
  reset needs it).
- Login is **one box, "Email or phone number"**, plus password. The app detects which was typed. A phone
  may be typed `09171234567`, `9171234567` or `+639171234567`, ignoring spaces and dashes, and is sent
  as `+639171234567`.
- **Temporary passwords** (admin creating staff or optometrist accounts, staff creating or resetting a
  patient) are generated by the system, **shown once**, and **handed over in person or by a phone
  call**. No email or SMS is sent.
- A temporary password sets `mustChangePassword`. After login the user is sent to the change-password
  page and cannot use other pages until the password is changed. **Self-registered users are never
  affected.**
- **Staff reset a phone-only patient's password** after verifying the patient by phone call. Staff must
  verify **two non-public details** before a reset, and **every reset is logged** in the audit log.
- Later (Phase 14): a **recovery code** shown once at registration, used with phone and birth date for
  a self-service reset.
- **Google sign-in** (Phase 14): patients only, signs in an **existing** account whose email matches
  Google's verified email, **never creates** an account. The user creates the Google OAuth client
  (authorized origins `localhost:5173`, `ocula-testing.vercel.app`, `ocula-system.vercel.app`) and
  gives the client ID to Renz and the frontend. Until then the button is mocked or left out.

**Privacy, security and quality**

- Patients and staff registering patients tick a **consent checkbox**; a **Privacy Policy page** exists.
  The consent and policy text is **to be supplied by the team and adviser, reviewed by the clinic**.
  Claude does not write legal text; the app shows clearly marked placeholders until it is supplied.
- Admin, staff and optometrist sessions log out after **30 minutes idle** (patients are unaffected).
- Security headers (Content-Security-Policy, X-Frame-Options and similar) in `frontend/vercel.json`.
- A reload that cannot reach the server shows an **offline screen** and keeps the session; it never
  sends the user to the login page.

**Calls made by Claude, open to change:** doctor Inventory is read-only; doctor EOD shows only that
doctor's exams; endpoint names below are proposals to confirm with Renz; `/book` sends guests to
register/login first (every appointment needs a `Patient`, which needs a `User`).

## Global constraints

- Follow `CLAUDE.md`: API calls only through `src/api/client.ts`; features in
  `src/features/<name>/{pages,components,api.ts,types.ts,schemas.ts}`; never hand-edit
  `src/components/ui/` (add with `npx shadcn@latest add <name>`); `import type`; no enums.
- Field names exactly as the schema (camelCase): e.g. `patientNo`, `startsAt`, `odSphere`, `orderNo`.
- Display numbers as the schema comments say: `P-000123`, `OR-000123`, `JO-000123`.
- Money arrives as Prisma `Decimal` (JSON string). Never add money with JS floats; display `₱1,234.00`.
- Phones are Philippine mobiles stored as `+639XXXXXXXXX`. A login's phone is unique; a patient file's
  phone is a contact number and is not. The app accepts `09171234567`, `9171234567` and
  `+639171234567`, ignoring spaces and dashes.
- Birth date is required for patients (registration and the staff new-patient form).
- `mustChangePassword` is true only for temporary passwords issued by staff or admin. It forces the
  change-password page after login until changed. Self-registered users are never affected.
- Privacy and consent text is supplied by the team and adviser and reviewed by the clinic; never
  written by Claude.
- Patient screens work at phone width first (44px targets); staff/doctor screens are dense desktop.
- Never present placeholder content (frame photos, doctor bios, clinic photos) as real.
- Branches: Pasay and Taguig. Staff and optometrists only see branches in their `UserBranch` rows.
- Every phase: `npm run lint`, `npm run build`, tests green, PR into `develop`, never merge without
  the user's go-ahead.

## Review focus

The five failure modes most likely to bite a real user that no single screen's happy path covers.
Each phase plan must add the test named here to the phase that owns it.

1. **Wrong branch:** a Taguig-only staff member must never see or change Pasay data, and switching
   branch must refetch, not show stale rows. Test in Phase 0 (branch context) and Phase 1 (patients
   list filtered by branch).
2. **Money rounding:** ₱0.10 + ₱0.20 must total ₱0.30, and discount + payments must give the exact
   balance. Test the money helper in Phase 0 and the balance in Phase 4.
3. **Releasing unpaid glasses:** a job order with a balance due cannot move to `released`; the UI
   blocks it and shows the balance. Test in Phase 5.
4. **Manila time vs UTC:** a 9:00 AM appointment in Manila shows as 9:00 AM for every user and lands
   on the right day near midnight. Test the date helper in Phase 0 and the queue in Phase 2.
5. **Phone as the ID:** a walk-in with no email registers with a phone, and creating a login with a
   phone already in use shows a clear "phone already registered" error on the phone field, not a
   crash. A patient file with no login may share its contact phone with another file without error.
   Test in Phase 0.5 (register form) and Phase 1 (staff form).

---

## Phases

Sizes: **S** = 1–2 days, **M** = 3–5 days, **L** = 6–10 days of focused work.
"Blocked" = built and usable on mocks, but only *done* once switched to the real endpoint, which
happens when the user says it is ready (Renz expects the domain endpoints by 29 Nov).

Dates count every calendar day, holidays included (decided by the user).

| # | Phase | Size | Blocked by backend | Build dates |
|---|---|---|---|---|
| 0 | Foundation | M | No | 23–27 Nov |
| 0.5 | Login v2 | M | Yes | 28 Nov–1 Dec |
| 1 | Patients | M | Yes | 2–5 Dec |
| 2 | Appointments and schedule | L | Yes | 6–11 Dec |
| 3 | Exams and prescriptions | L | Yes | 12–16 Dec |
| 4 | Billing | L | Yes | 17–21 Dec |
| 5 | Job orders | M | Yes | 22–23 Dec |
| — | **Demo spine complete** | | | **23 Dec** |
| 6 | Patient portal | L | Yes | 24–26 Dec |
| 7 | OCR | M | Yes | 27–28 Dec |
| 8 | Inventory | M | Yes | 26–27 Dec, second pair of hands |
| 9 | Recalls, follow-ups, notifications | M | Yes | 28–29 Dec, second pair of hands |
| 10 | EOD report, dashboards, reports overview | L | Yes | 29–31 Dec |
| 11 | Admin: users, branches, audit log | M | Endpoints exist on develop | 20–22 Dec, second pair of hands |
| 12 | Public site | M | Partly | 23–25 Dec, second pair of hands |
| 13 | Polish, security and remaining switch-overs | M | — | 30–31 Dec, both |
| 14 | Google sign-in and recovery-code reset | M | Yes, plus the Google client ID | Floating 2 days, starts once its prerequisites exist |
| 15 | Production launch | M | Yes (production backend and database) | First promotion about 28 Dec (estimate), last 31 Dec |

**Timeline risk:** the main chain (0, 0.5, 1–5, 6, 7, 10) now ends on 31 December with no slack;
inserting Phase 0.5 moved it back 4 days. The target for every phase is its **thin version**, widened
only when a phase finishes early. The second pair of hands from 20 December is **required, not
optional**: a teammate, or Claude implementing from the phase plan while the user reviews. They take
phases 11, 12, 8 and 9, and everyone shares Phase 13. A slip in phases 2–4 pushes Phase 10 past 31
December; the first things to cut are the doctor EOD and the admin reports overview. Phase 14 ships
only if its prerequisites exist in time: production is frozen in January except for bug fixes, so
otherwise the Google button stays out and password recovery stays staff-reset only.

### Phase 0: Foundation — M — not blocked

- **Screens:** app shell for staff, doctor and admin (navy sidebar from the design system, links per
  role, branch switcher, user menu with the existing `LogoutButton`); patient shell (top bar, bottom
  nav at phone width); shared parts in `src/components/common/`: `DataTable`, `PageHeader`,
  `EmptyState`, `ErrorState`, `TableSkeleton`, `StatusBadge`, `ConfirmDialog`.
- **Plumbing:** `VITE_API_URL` base in `src/api/client.ts` (done in PR #39); TanStack Query provider;
  `BranchProvider` (current branch from `user.branches`, stored per user); helpers
  `src/lib/money.ts` (Decimal strings to centavos, `formatPeso`), `src/lib/dates.ts` (Asia/Manila
  display), `src/lib/format.ts` (`P-000123` etc.); Vitest + Testing Library setup; frontend CI
  workflow `.github/workflows/frontend-ci.yml` (lint, build and tests on PRs into `develop` and `main`
  that touch `frontend/**`, same shape as `backend-ci.yml`).
- **API:** `GET /branches` (exists); `GET /auth/me` must return the user's branches.
- **Mocks:** branches Pasay and Taguig; seed users get branch assignments; move mock data into
  `src/mocks/data/` so later phases share one fake database.
- **Done when:** each role logs in to a shell with working nav; branch switch persists; helper tests
  pass; CI is green on the PR; `VITE_API_URL` is checked against `ocula-mu` once the user says the
  backend is ready.

### Phase 0.5: Login v2 — M — blocked

Only these six changes:

1. **Login by email or phone:** one field "Email or phone number" plus password. A value containing
   `@` is an email; anything else is a phone, normalized to `+639XXXXXXXXX` by `normalizePhone` in
   `src/lib/phone.ts` (accepts `09171234567`, `9171234567`, `+639171234567`, ignoring spaces and
   dashes). An invalid phone shows a field error before anything is sent.
2. **Register changes:** phone required; email optional; sex optional (`male` / `female`); birth date
   required (a past date); full name and password as today.
3. **Forced change for temporary passwords:** when `user.mustChangePassword` is true, login goes to
   the area's change-password page and every other route of that area redirects there until the
   password is changed; `/auth/me` is refetched after the change. The page shows a short notice in
   this mode. Self-registered users never see it.
4. **Consent checkbox** on the register form (required). The same component is reused by the staff
   new-patient form in Phase 1. Its label text lives in `src/features/auth/legal-text.ts` as a marked
   placeholder, "to be supplied by the team and adviser, reviewed by the clinic".
5. **Privacy Policy page** at `/privacy` (public), linked from the consent label and the public footer.
   The body is a marked placeholder with the same wording; no legal text is written here.
6. **Offline screen:** when restoring the session fails because of a network error or a 5xx, show
   "You're offline, reconnecting…" instead of redirecting to `/login`. The refresh token is kept, and
   the app retries on the browser `online` event and every 10 seconds.

- **Not in this phase:** the Google button and the recovery-code screens (Phase 14).
- **API (names to confirm with Renz's Swagger):** login accepts an `identifier` and `password`;
  register accepts `phone`, optional `email`, optional `sex`, required `birthDate`; `/auth/me` returns
  `phone`, `branches` and `mustChangePassword`; the flag is set only when staff or admin issue a
  temporary password; errors `phone_taken` and `email_taken`.
- **Mocks:** seed users get phones (`+639170000001` onwards); login by phone or email; register
  validation; one seed staff user with `mustChangePassword: true`.
- **Docs:** `CLAUDE.md` and `PRODUCT.md` already say "login with email or phone" and "forced change only
  for temporary passwords" (updated with this roadmap).
- **Done when:** each seed user logs in by email and by phone in every accepted phone format; a
  self-registered patient registers with a phone and no email; the temporary-password user is held on
  the change-password page; an offline reload shows the offline screen and keeps the token.

### Phase 1: Patients — M — blocked

- **Screens:** `/staff/patients` (search by name, `P-` number or phone; filter by home branch);
  register patient dialog (contact phone, optional email, optional sex, **required birth date**,
  consent checkbox from Phase 0.5, and a "Give this patient a login" choice: off for a child or
  elderly patient, who then has a patient file only); `/staff/patients/:id` profile (details, edit, **reset password** action,
  tabs for visits, exams, prescriptions, orders, filled in by later phases); `/doctor/patients` and
  `/doctor/patients/:id` reuse the same pages read-only, except for the Exams tab.
- **Reset password:** generates a temporary password shown once, handed over in person or by a phone
  call. The dialog requires staff to confirm they verified **two non-public details** first; the reset
  is written to the audit log.
- **API (propose to Renz):** `GET /patients?search=&branchId=&page=`, `POST /patients` (creates the
  `Patient` file; creates a `User` login with role patient only when the staff member gives the patient
  one, and then the login's phone is unique and required, email optional),
  `GET /patients/:id`, `PATCH /patients/:id`, `POST /patients/:id/reset-password`.
- **Mocks:** about 30 fake patients spread over both branches; `phone_taken` and validation errors.
- **Done when:** staff can find, register and edit a patient, and reset a patient's password, against
  the real API.
- **Thin version:** list with search, register dialog, profile details, reset password; history tabs
  come with later phases.

### Phase 2: Appointments and schedule — L — blocked

- **Screens:** `/staff/appointments` day queue per branch (status chips: pending, confirmed,
  checked_in, completed, cancelled, no_show), week calendar, book/reschedule dialog (patient search,
  optometrist, free slot), check-in and no-show actions, walk-in shortcut; `/doctor/schedule` own day
  and week, start exam from a checked-in appointment.
- **API:** `GET /appointments?branchId=&date=&optometristId=&status=`, `POST /appointments`,
  `PATCH /appointments/:id` (time, optometrist, status), `GET /appointments/slots?branchId=&date=&optometristId=`
  (built from `OptometristSchedule`, 30-minute `slotMinutes`), `GET /optometrists?branchId=`.
- **Mocks:** schedules for two optometrists across both branches; a week of appointments in every
  status; a slot clash error.
- **Done when:** a walk-in can be booked, checked in and handed to a doctor's schedule.
- **Thin version:** day queue, book dialog, check-in and cancel, doctor's day schedule; no week calendar.

### Phase 3: Exams and prescriptions — L — blocked

- **Screens:** `/doctor/exams` (drafts and today's finals); exam form (chief complaint, OD/OS sphere,
  cylinder, axis 0–180, add, VA, PD, diagnosis, recommendation; saves as `draft`, then finalize);
  issue a prescription from a final exam (spectacles or contact lens); add an outside prescription
  from the patient profile (staff); exams and prescriptions tabs on the patient profile.
- **API:** `GET /exams?patientId=&optometristId=&status=`, `POST /exams`, `GET /exams/:id`,
  `PATCH /exams/:id` (draft only), `POST /exams/:id/finalize`, `GET /prescriptions?patientId=`,
  `POST /prescriptions`.
- **Mocks:** exam history for the seeded patients; editing a final exam returns an error.
- **Done when:** a doctor records and finalizes an exam and the prescription appears on the profile.
- **Thin version:** exam form, finalize, spectacle prescription from the exam; outside prescriptions later.

### Phase 4: Billing — L — blocked

- **Screens:** `/staff/billing` today's orders per branch; new order (patient, optional
  prescription, product search by SKU/name/category, quantities, discount, live totals); take
  payment (cash, GCash with reference, card with reference; partial payments allowed); order detail
  with balance; printable receipt (browser print, `OR-` number).
- **API:** `GET /products?search=&category=`, `POST /orders`, `GET /orders?branchId=&date=&patientId=`,
  `GET /orders/:id`, `PATCH /orders/:id` (items, discount, status), `POST /orders/:id/payments`.
- **Mocks:** a product catalog in every `ProductCategory` (frames marked as placeholder images).
- **Done when:** staff bill a patient, take a partial payment, and print a receipt from real data.
- **Thin version:** new order, partial payments (needed by Phase 5's release rule), balance, receipt.

### Phase 5: Job orders — M — blocked

- **Screens:** `/staff/job-orders` board by status (pending, at_lab, ready, released, cancelled);
  create a job order from an order; edit lab and promised date; release only when the balance is zero
  (otherwise show the balance and a link to take payment).
- **API:** `GET /job-orders?branchId=&status=`, `POST /job-orders`, `PATCH /job-orders/:id`; release
  with a balance returns `409 balance_due`.
- **Done when:** the full front-desk flow runs end to end. **This is the demo spine.**
- **Thin version:** status list instead of a board, status changes, release blocked on balance.

### Phase 6: Patient portal — L — blocked

- **Screens:** `/me` home (next appointment, glasses status); `/me/appointments` (upcoming and past,
  book with branch → optometrist → slot, cancel, reschedule); `/me/records` (visits and final exams);
  `/me/prescriptions` (current and history); `/me/frame-finder` (filter frames by shape, material,
  colour, price, with recommended frames; placeholder images).
- **API:** `GET /me/appointments`, `POST /me/appointments` (source `online`), `PATCH /me/appointments/:id`,
  `GET /me/exams`, `GET /me/prescriptions`, `GET /me/job-orders`, `GET /products?category=frame`,
  frame recommendation (name to confirm, for example `GET /products/recommendations?shape=&material=&maxPrice=`).
- **Thin version:** appointments and prescriptions only.

### Phase 7: OCR — M — blocked

- **Screens:** staff and doctor upload a photo of a paper prescription (camera on phones); the result
  opens as a `draft` exam with source `ocr`, every field editable, the photo shown beside it; the
  doctor verifies and finalizes using the Phase 3 form. Add an OCR link in the staff sidebar
  (today the route exists only at `/doctor/ocr`).
- **API:** `POST /ocr/prescriptions` (multipart image) → draft `EyeExam` with `ocrRaw`; then the
  Phase 3 endpoints.
- **Mocks:** a fixed response with one low-confidence field to show the review step.
- **Thin version:** upload and editable result, no confidence highlighting.

### Phase 8: Inventory — M — blocked

- **Screens:** `/staff/inventory` and `/admin/inventory` (stock per branch, low-stock filter, receive
  stock, adjust with reason, edit reorder level, product create/edit); `/doctor/inventory` read-only
  stock lookup.
- **API:** `GET /inventory?branchId=&lowStock=&search=`, `PATCH /inventory/:id`, `POST /stock-movements`,
  `GET /stock-movements?productId=&branchId=`, `POST /products`, `PATCH /products/:id`.
- **Thin version:** stock list, receive and adjust.

### Phase 9: Recalls, follow-ups, notifications — M — blocked

- **Screens:** `/staff/recalls` due and overdue list (mark notified, booked, dismissed; book an
  appointment from a recall); notification bell in every shell plus `/me/notifications`,
  `/staff/notifications`, `/doctor/notifications` (mark read, open the linked page from `data`).
- **API:** `GET /recalls?branchId=&status=&dueBefore=`, `PATCH /recalls/:id`, `POST /recalls`,
  `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`.
- **Thin version:** recall list with status changes; notifications list without the bell count.

### Phase 10: EOD report, dashboards, reports overview — L — blocked

- **Screens:** `/staff/reports` EOD (preview today's totals by payment method, generate and save one
  report per branch per day, past reports, print); `/doctor` EOD of the doctor's own exams;
  `/staff` dashboard (today's queue, sales, job orders ready, low stock, recalls due); `/doctor`
  dashboard (today's patients); `/admin` reports overview across both branches with a date range.
- **API:** `GET /reports/eod/preview?branchId=&date=`, `POST /reports/eod`, `GET /reports/eod?branchId=&from=&to=`,
  `GET /dashboard?branchId=`, `GET /reports/overview?from=&to=`.
- **Thin version:** staff EOD and the staff dashboard.

### Phase 11: Admin — M — endpoints exist on develop

- **Screens:** `/admin/users` (list by role, create staff or optometrist with a phone, an email and
  branch assignments, deactivate, **reset password** with a temporary password shown once);
  `/admin/branches` (edit name, address, phone; add hours if Renz adds the column);
  `/admin/audit-log` (filter by user, entity, date).
- **Audit-log notes:** staff must verify **two non-public details** before any password reset, and
  **every reset is logged**; the audit log lists each reset (who reset whom, and when) and an admin
  can filter for them. A temporary password is never stored in or shown by the log.
- **API:** `GET /users?role=`, `POST /users`, `PATCH /users/:id`, `POST /users/:id/reset-password`,
  `PATCH /branches/:id`, `GET /audit-logs?userId=&entity=&from=&to=` (all present on `develop`;
  Renz's Swagger wins over these names).
- **Thin version:** users list, create and deactivate.

### Phase 12: Public site — M — partly blocked

- **Screens:** Home, Services, Frames (public catalog), Branches (address, phone, map link), Doctors,
  Book (explains the steps, then register/login and continue to `/me/appointments`), FAQs (new route
  `/faqs`), Login link and Privacy Policy link in the public header and footer.
- **API:** `GET /branches`, `GET /optometrists`, `GET /products?category=frame` (all public).
  Services and FAQs are static text the user supplies.
- **Thin version:** Home, Branches, Book, FAQs; content marked as placeholder until supplied.

### Phase 13: Polish, security and remaining switch-overs — M

- Switch any screen still on mocks to the real API, or label it clearly.
- Security headers (Content-Security-Policy, X-Frame-Options and similar) in `frontend/vercel.json`.
- 30-minute idle logout for admin, staff and optometrist sessions (not patients).
- Quality pass for the ISO/IEC 25010 evaluation: performance, security and accessibility (WCAG AA
  contrast, keyboard, focus), PWA install check, phone-width check of every patient screen.

### Phase 14: Google sign-in and recovery-code reset — M — starts once its prerequisites exist

Starts only when Renz's endpoints **and** the Google client ID exist. Until then the Google button is
mocked or left out and password recovery stays staff-reset.

- **Screens:** a "Sign in with Google" button at the bottom of the login page (patients only; signs
  in an existing account whose email matches Google's verified email; never creates an account); a
  **recovery code** screen shown once at registration (copy and print; it cannot be shown again); a
  forgot-password flow for phone-only patients using phone + recovery code + birth date.
- **API (names to confirm):** `POST /auth/google` (Google credential), the recovery code returned once
  by register, `POST /auth/reset-with-recovery` (phone, recovery code, birth date, new password; the
  backend limits attempts and logs every reset). `VITE_GOOGLE_CLIENT_ID` env var on the frontend.
- **Mocks:** a fake Google response and a fake recovery reset, so the screens exist before the backend.
- **Thin version:** Google button and the recovery reset, no extras.

### Phase 15: Production launch — M — blocked on the production backend

- **Setup:** Renz deploys the backend to production with its own Supabase database and backups;
  production env vars (`VITE_API_URL` on the `ocula-system` Vercel project, `CORS_ORIGINS` with
  `https://ocula-system.vercel.app`).
- **Data:** create the real admin account (its initial password is temporary, so the forced change
  applies); enter the real details of the Pasay and Taguig branches; no demo data on production.
- **Smoke test:** log in as each role; register a patient; book, check in, examine, bill and create a
  job order; log out; reload offline. Run once on production before real users.
- **Promotion:** first `develop` → `main` promotion about 28 December (an estimate, earlier if the
  work is ahead), further promotions through 31 December, then the January freeze: only bug fixes.
- **Rules:** never run throwaway accounts or test scripts against production; IT experts evaluate on
  testing with fake data.

---

## Backend dependencies

Everything the frontend needs from Renz, by phase. The user says when an endpoint is ready; Renz's
Swagger (`/api/docs`) wins over the names in this document.

| Phase | The frontend needs | State on develop (24 Nov) |
|---|---|---|
| 0 | `GET /branches`; `GET /auth/me` returning the user's branches | `/branches` exists; branches on `/auth/me` unconfirmed |
| 0.5 | Login by email or phone; register with `phone`, optional `email`, optional `sex`, required `birthDate`; login phone unique (`phone_taken`); `/auth/me` returns `phone` and `mustChangePassword`; flag set only for issued temporary passwords | Needed |
| 1 | Patients (list and search, create with its `User`, get, update); staff reset of a patient's password returning a temporary password | Needed |
| 2 | Appointments (list, create, update time or status), slots, optometrists list | Needed |
| 3 | Exams (list, create, get, update draft, finalize); prescriptions (list, create) | Needed |
| 4 | Products (list and search); orders (create, list, get, update); payments | Needed |
| 5 | Job orders (list, create, update); `balance_due` error on release | Needed |
| 6 | Portal endpoints (`/me/appointments`, `/me/exams`, `/me/prescriptions`, `/me/job-orders`); frame recommendation | Needed |
| 7 | OCR: upload a photo, receive a draft exam | Needed |
| 8 | Inventory, stock movements, product create and update | Needed |
| 9 | Recalls; notifications | Needed |
| 10 | EOD preview, generate and list; dashboard; reports overview | Needed |
| 11 | Users (list, get, create, update, reset-password); branches update; audit logs | Present |
| 12 | Public branches, optometrists and frame products | Branches present |
| 14 | Google sign-in verification; recovery code at registration; reset with recovery code and birth date, with attempt limits | Needed, plus the Google client ID |
| 15 | Production backend, separate production database, backups, CORS origins, production env vars | Needed |

**Other asks for Renz**

1. **Phone required and unique on every login account** (`User`), with email optional for patients: a
   schema change plus a migration for existing users. See item 5 for the patient file's phone.
2. **Agree the endpoint list**, including error codes `balance_due`, `slot_taken`, `phone_taken`,
   `email_taken`.
3. **CORS:** `CORS_ORIGINS` must include `https://ocula-testing.vercel.app` (and later
   `https://ocula-system.vercel.app`), plus `exposedHeaders: ['Retry-After']`.
4. Open schema decisions that affect screens: corporate clients (decision 4), lens stock columns
   (5), OCR source (6), recall risk score (7); branch opening hours are not in the schema.
5. **Uniqueness applies to the login's phone, not the patient file's phone.** `Patient.phone` is a
   contact number and is not unique. A patient file may have no login (a child or elderly patient),
   with the parent's phone as the contact number; today `Patient.userId` is required and unique, so it
   must become optional.

## Open questions for the team

- **Privacy Policy and consent text:** to be supplied by the team and adviser, reviewed by the clinic.
- **Google OAuth client ID:** to be created by the user (authorized origins above).
- **Families sharing one phone (answered):** only the **login account** needs a unique phone. A child
  or elderly patient without their own login is a **patient file with no login**, and the parent's
  phone is stored on the file as a **contact number**. The patient file's phone is **not** unique, so
  a parent and child can both have patient files under one number.
- **Content:** services, FAQs, branch addresses and hours, doctor details.

## Out of scope for the defense

Offline editing, SMS/email sending from the frontend, online payments, branch transfers of stock
(schema marks them TBD), multi-language.

# OCULA Frontend Roadmap

> **For agentic workers:** this is a roadmap, not a task-by-task plan. Before starting a phase, write
> that phase's own plan (superpowers:writing-plans) in `docs/superpowers/plans/`, then execute it with
> superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** every screen for the four roles working against the real API by **31 December 2026**, so
**January 2027 is data gathering** (defense 24 February 2027). The front-desk flow (Patients →
Appointments → Billing → Job orders) is built first.

**Architecture:** mock-first vertical slices. Every phase builds its screens against MSW mocks whose
fields copy Renz's Prisma schema (`backend/prisma/schema.prisma`). A screen switches to the real
endpoint only when the user says that endpoint is ready; then Renz's Swagger docs (`/api/docs`) win
over the endpoint names proposed here. Shared screens (Patients, Inventory, EOD) serve several roles; permissions
decide what each role can do, not copies per role.

**Tech stack:** React 19, TypeScript, Vite, Tailwind v4, shadcn/ui (Base UI), React Router,
react-hook-form + zod, MSW. Added in Phase 0: TanStack Query, Vitest + Testing Library.

**Source:** brainstorm of 23 Nov 2026 (decisions recorded under "Decisions" below), `CLAUDE.md`,
`PRODUCT.md`, `docs/design-system.md`.

## Where things stand (23 Nov 2026)

- **Done (frontend):** login, register, forgot/reset password, change password, logout, role guards
  for admin/staff/optometrist/patient, remembered-page redirect, design tokens.
- **Not done (frontend):** every other route is a `<Placeholder>` in `src/app/router.tsx`; feature
  folders under `src/features/` are empty; layouts have no sidebar or nav; no TanStack Query; no tests.
- **Backend (develop):** only `/api/health` and `/api/auth/*` (login, register, refresh, logout, me,
  change-password, forgot-password, reset-password). The schema has all 21 domain tables, but no
  domain endpoints yet. Renz has committed to **all** domain endpoints by 29 November 2026.
- **Deploys:** frontend testing `ocula-testing.vercel.app`, production `ocula-system.vercel.app`;
  testing backend `ocula-mu.vercel.app` (serving a stale build without the auth routes).

## Decisions (from the brainstorm)

- Deadline: **system complete 31 December 2026**, working through the holidays.
- January data gathering users: **optometrists, staff, patients, and IT experts**. Every role is
  evaluated, so no role's screens can be left as placeholders.
- Demo first: the **front-desk flow**. Build order: **demo spine first, on mocks** (option 1).
- OCR: **the backend reads the photo**; the frontend uploads and shows an editable result.
- Screens per role:
  - **Public:** Home, Services, Frames, Branches, Doctors, Book, FAQs, Login.
  - **Patient `/me`:** Appointments, Records, Prescriptions, Frame finder, Notifications.
  - **Optometrist `/doctor`:** Schedule, Patients, Exams, Inventory, EOD report.
  - **Staff `/staff`:** Patients, Appointments, Billing, Job orders, OCR, Recalls and follow-ups,
    Inventory, EOD report, Dashboard.
  - **Admin `/admin`:** Users, Branches, Audit log, Reports overview, Inventory (view and edit).
- Calls made by Claude, open to change: doctor Inventory is read-only; doctor EOD shows only that
  doctor's exams; endpoint names below are proposals to confirm with Renz; `/book` sends guests to
  register/login first (every appointment needs a `Patient`, which needs a `User`).

## Global constraints

- Follow `CLAUDE.md`: API calls only through `src/api/client.ts`; features in
  `src/features/<name>/{pages,components,api.ts,types.ts,schemas.ts}`; never hand-edit
  `src/components/ui/` (add with `npx shadcn@latest add <name>`); `import type`; no enums.
- Field names exactly as the schema (camelCase): e.g. `patientNo`, `startsAt`, `odSphere`, `orderNo`.
- Display numbers as the schema comments say: `P-000123`, `OR-000123`, `JO-000123`.
- Money arrives as Prisma `Decimal` (JSON string). Never add money with JS floats; display `₱1,234.00`.
- Phones are Philippine mobiles stored as `+639XXXXXXXXX`.
- `mustChangePassword` never forces a redirect.
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
5. **Walk-in with no email:** staff can register a walk-in patient who has no email (needs a backend
   answer, see Backend asks). Test in Phase 1 once the contract is agreed.

---

## Phases

Sizes: **S** = 1–2 days, **M** = 3–5 days, **L** = 6–10 days of focused work.
"Blocked" = built and usable on mocks, but only *done* once switched to the real endpoint, which
happens when the user says it is ready (Renz expects all of them by 29 Nov).

Dates count every calendar day, holidays included (decided by the user).

| # | Phase | Size | Blocked by backend | Build dates |
|---|---|---|---|---|
| 0 | Foundation | M | No (`/branches` and branches on `/auth/me` wanted by 27 Nov) | 23–27 Nov |
| 1 | Patients | M | Yes | 28 Nov–1 Dec |
| 2 | Appointments and schedule | L | Yes | 2–7 Dec |
| 3 | Exams and prescriptions | L | Yes | 8–12 Dec |
| 4 | Billing | L | Yes | 13–17 Dec |
| 5 | Job orders | M | Yes | 18–19 Dec |
| — | **Demo spine complete** | | | **19 Dec** |
| 6 | Patient portal | L | Yes | 20–22 Dec |
| 7 | OCR | M | Yes | 23–24 Dec |
| 8 | Inventory | M | Yes | 25–26 Dec |
| 9 | Recalls, follow-ups, notifications | M | Yes | 27–28 Dec |
| 10 | EOD report, dashboards, reports overview | L | Yes | 29–31 Dec |
| 11 | Admin: users, branches, audit log | M | Yes | 20–31 Dec, second pair of hands |
| 12 | Public site | M | Partly | 20–31 Dec, second pair of hands |
| 13 | Polish and remaining switch-overs to the real API | M | — | 30–31 Dec |

**Timeline risk:** 39 calendar days. Full versions of every phase add up to about 70 days of work;
**thin versions** add up to about 40. So the target for phases 1–12 is the **thin version** below each
phase, widened only when a phase finishes early. Even thin, one person runs about a week over, which
is why phases 11 and 12 (simple, independent of the others once Phase 0 is in) run in parallel from
20 December with a second pair of hands: a teammate, or Claude implementing from the phase plan while
the user reviews.

### Phase 0: Foundation — M — not blocked

- **Screens:** app shell for staff, doctor and admin (navy sidebar from the design system, links per
  role, branch switcher, user menu with the existing `LogoutButton`); patient shell (top bar, bottom
  nav at phone width); shared parts in `src/components/common/`: `DataTable`, `PageHeader`,
  `EmptyState`, `ErrorState`, `TableSkeleton`, `StatusBadge`, `ConfirmDialog`.
- **Plumbing:** `VITE_API_URL` base in `src/api/client.ts` (falls back to relative `/api`); TanStack
  Query provider; `BranchProvider` (current branch from `user.branches`, stored per user); helpers
  `src/lib/money.ts` (Decimal strings to centavos, `formatPeso`), `src/lib/dates.ts` (Asia/Manila
  display), `src/lib/format.ts` (`P-000123` etc.); Vitest + Testing Library setup.
- **API:** `GET /branches`; `GET /auth/me` must return the user's branches.
- **Mocks:** branches Pasay and Taguig; seed users get branch assignments; move mock data into
  `src/mocks/data/` so later phases share one fake database.
- **Done when:** each role logs in to a shell with working nav; branch switch persists; helper tests
  pass; `VITE_API_URL` is wired (checked against `ocula-mu` once the user says the backend is ready).

### Phase 1: Patients — M — blocked

- **Screens:** `/staff/patients` (search by name, `P-` number or phone; filter by home branch);
  register patient dialog; `/staff/patients/:id` profile (details, edit, tabs for visits, exams,
  prescriptions, orders, filled in by later phases); `/doctor/patients` and `/doctor/patients/:id`
  reuse the same pages read-only, except for the Exams tab.
- **API (propose to Renz):** `GET /patients?search=&branchId=&page=`, `POST /patients` (creates the
  `User` with role patient and the `Patient`), `GET /patients/:id`, `PATCH /patients/:id`.
- **Mocks:** about 30 fake patients spread over both branches; `email_taken` and validation errors.
- **Done when:** staff can find, register and edit a patient against the real API.
- **Thin version:** list with search, register dialog, profile details; history tabs come with later phases.

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
  colour, price; placeholder images).
- **API:** `GET /me/appointments`, `POST /me/appointments` (source `online`), `PATCH /me/appointments/:id`,
  `GET /me/exams`, `GET /me/prescriptions`, `GET /me/job-orders`, `GET /products?category=frame`.
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

### Phase 11: Admin — M — blocked

- **Screens:** `/admin/users` (list by role, create staff or optometrist with branch assignments,
  deactivate, reset password); `/admin/branches` (edit name, address, phone; add hours if Renz adds
  the column); `/admin/audit-log` (filter by user, entity, date).
- **API:** `GET /users?role=`, `POST /users`, `PATCH /users/:id`, `POST /users/:id/reset-password`,
  `PATCH /branches/:id`, `GET /audit-logs?userId=&entity=&from=&to=`.
- **Thin version:** users list, create and deactivate.

### Phase 12: Public site — M — partly blocked

- **Screens:** Home, Services, Frames (public catalog), Branches (address, phone, map link), Doctors,
  Book (explains the steps, then register/login and continue to `/me/appointments`), FAQs (new route
  `/faqs`), Login link in the public header.
- **API:** `GET /branches`, `GET /optometrists`, `GET /products?category=frame` (all public).
  Services and FAQs are static text the user supplies.
- **Thin version:** Home, Branches, Book, FAQs; content marked as placeholder until supplied.

### Phase 13: Demo polish and switch-over — M

- Switch any screen still on mocks to the real API, or label it clearly for the demo.
- Demo data seed agreed with Renz; run the demo script end to end on the testing deploy.
- PWA install check, accessibility pass (WCAG AA contrast, keyboard, focus), phone-width check of
  every patient screen.

---

## Backend asks for Renz

1. **Walk-ins with no email:** `User.email` is required and unique, and every `Patient` needs a
   `User`. How does staff register a walk-in with no email? (Blocks Phase 1.)
2. **Register drops phone and birth date:** the frontend sends `phone` and `birthDate`;
   `RegisterDto` only accepts email, password, fullName.
3. **`GET /auth/me` should include branches** (`UserBranch`) for the branch switcher.
4. **Agree the endpoint list above**, including error codes `balance_due`, `slot_taken`.
5. **Testing deploy:** `ocula-mu.vercel.app` serves an old build; its `CORS_ORIGINS` must include
   `https://ocula-testing.vercel.app`.
6. Open schema decisions that affect screens: corporate clients (decision 4), lens stock columns
   (5), OCR source (6), recall risk score (7); branch opening hours are not in the schema.

## Out of scope for the defense

Offline editing, SMS/email sending from the frontend, online payments, branch transfers of stock
(schema marks them TBD), multi-language.

# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: front-desk staff at MRB Clinic's Pasay and Taguig branches, working at the counter on walk-ins, billing, job orders and inventory, often under time pressure. Admin manages accounts and users. Staff handle patients and can also create patient accounts.

Also served: optometrists (record exams and prescriptions during a visit) and patients (book visits, view records and prescriptions, browse frames, mostly on their phones). Four roles only: admin, staff, optometrist, patient.

## Product Purpose

OCULA is a PWA for managing an optical clinic. It runs the clinic's day-to-day operations and gives patients a self-service portal. Success is a front desk that gets through its daily work quickly and accurately, and patients who can handle their own bookings and records without calling.

## Positioning

One system serves both clinic operations (billing, job orders, inventory, recalls, reports) and a patient portal. Prescriptions are captured with OCR, patients get a frame finder, and the product is built around MRB Clinic's two-branch workflow rather than being a generic booking tool.

## Operating Context

- Two branches: Pasay and Taguig.
- Staff work at the front desk; patients mostly use phones.
- Routes by role: `/staff/*`, `/doctor/*`, `/me/*` (patient). Public pages: home, services, frames, branches, doctors, book, login, register, forgot and reset password.

## Capabilities and Constraints

- Frontend: React, TypeScript, Vite, Tailwind v4, shadcn/ui on Base UI. Backend: NestJS, Prisma, Supabase Postgres.
- Auth is email login with bearer tokens, not cookies.
- Features by area: appointments, billing, CRM, dashboard, exams, frames, inventory, job orders, notifications, OCR, patients, reports, users.
- Phone numbers are Philippine mobile numbers, stored as `+639XXXXXXXXX`.
- A "must change password" flag exists in the API contract but must never force a redirect.

## Brand Commitments

The OCULA logo is the eye icon used in the PWA. There is no MRB Clinic brand guide.

## Evidence on Hand

- The OCULA eye icon, in `frontend/public/` (`favicon.svg`, `pwa-192x192.png`, `pwa-512x512.png`).
- Absent, and not to be fabricated: an MRB Clinic brand guide, clinic photos, frame images, and a Privacy Policy. Use clearly marked placeholders for these.

## Product Principles

1. The front desk comes first: speed, scanability and few clicks beat decoration on staff screens.
2. Patients are mostly on phones, so every patient-facing screen works at phone width first.
3. One product, four roles: each role sees only its own routes and its own language.
4. Never present placeholder content as real clinic content.

## Accessibility & Inclusion

No product-wide standard established yet. WCAG AA contrast was requested for the Register screen.

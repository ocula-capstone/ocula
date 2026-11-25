# OCULA backend

NestJS API for the OCULA optical clinic system (MRB Clinic, Pasay and Taguig branches). Renz owns `backend/`. Jp owns `frontend/`, so never edit it from backend work. Renz works on Windows with PowerShell and VS Code. Explain each command or file in 1–2 plain sentences before running or writing it.

## Stack

- Node 24.15+ (`.nvmrc` 24). NestJS 12 as **ES modules** (`"type": "module"`). **Relative imports end in `.js`**, even from `.ts` files.
- Prisma 7.10 with `@prisma/adapter-pg`, generator `prisma-client` (`moduleFormat esm`). Output goes to `src/generated/prisma`, which is gitignored and rebuilt by postinstall. Stay on 7.x; don't move to the 8.0 rc.
- Supabase Postgres (Tokyo, RLS on, no policies). `DATABASE_URL` is the transaction pooler (6543); `DIRECT_URL` is the session pooler (5432). **Local dev and staging share one database.**
- Validation uses class-validator and class-transformer through the global `ValidationPipe`. Swagger is at `/api/docs`.
- Auth: JWT HS256 access token (15 min, payload `{ sub, role, sid }`), rotated refresh tokens, Argon2id (`@node-rs/argon2`).
- Mail: nodemailer with Gmail. It logs the email instead when `MAIL_*` is unset.
- Hosting: Vercel project `ocula`, Root Directory `backend`, region hnd1. Staging is `https://ocula-mu.vercel.app/api`.
- Don't add libraries, SaaS services or telemetry (for example the NestJS Observe setup in `AGENTS.md`) without asking Renz first.

## Commands (in `backend/`)

| Command | What it does |
|---|---|
| `npx prisma generate` | Rebuilds the Prisma client after schema changes |
| `npm test` | Unit tests (`src/**/*.spec.ts`) |
| `npm run test:e2e` | e2e tests (`test/*.e2e-spec.ts`) against the in-memory fake DB |
| `npm run lint` | oxlint |
| `npm run format` | Prettier. Run it if lint or CI complains about formatting |
| `npm run build` | `nest build` |
| `npm run db:migrate` | `prisma migrate dev`, which applies migrations to the **shared** Supabase DB |
| `npm run db:seed` | Seeds branches and the single admin |

Migrations don't run on deploy. Run `npm run db:migrate` locally after merging a schema change. If Prisma asks to **reset** the database or wants a new migration name you didn't expect, **stop and ask Renz**. Never run `prisma migrate reset` or `db push`.

## Conventions

- **Module layout:** `src/<feature>/<feature>.module.ts`, `.controller.ts`, `.service.ts`, `.dto.ts`. Register each new module in `src/app.module.ts`.
- **Auth:**
  - `JwtAuthGuard` is global, so use `@Public()` to open a route.
  - Use `@Roles('admin', 'staff', …)` with `RolesGuard`.
  - Get the current user with `@CurrentUser()` (`src/auth/decorators`).
- **Roles:** admin, staff, optometrist, patient. There is exactly one seeded admin.
- **Branches:**
  - Patients, eye exams and prescriptions are **shared across branches**. Everything else is per branch.
  - Per-branch data goes through `BranchAccessService`, which is global:
    - `branchFilter(user, branchId?)` for lists.
    - `assertAccess(user, branchId)` for writes; it throws 403 `branch_forbidden`.
    - Reading another branch's record returns 404.
    - Admin sees all branches.
- **Patients' own data:** use `/me/...` routes (role patient) that return only their records and **hide staff notes**.
- **Errors:**
  - Always `{ error: { code, message, fields? } }`, with snake_case codes like `slot_taken` or `invalid_status`.
  - `HttpExceptionFilter` maps Prisma P2002→409, P2025→404 and P2003→409.
  - Throw Nest exceptions with `{ code, message }`.
- **Lists:**
  - Return `{ items, total, page, pageSize }`, using `PageQueryDto` and `pageArgs` from `src/common/pagination.ts`.
  - Query with `Promise.all([findMany, count])`, not `$transaction`.
- **Swagger DTO gotchas:**
  - Optional fields with initializers need `type: Number` or `type: Boolean` in `@ApiPropertyOptional`.
  - Boolean query params use `@Transform(toBool)` only. `@Type(() => Boolean)` turns `"false"` into true.
- **Time:**
  - The clinic runs on Manila time (UTC+8). Schedules store wall-clock TIME values.
  - Query `date` params are Manila dates (`YYYY-MM-DD`). Timestamps are full ISO strings with an offset.
  - Use the helpers in `src/common/clinic-time.ts`.
- **Phones:** stored as `+639XXXXXXXXX`. Use `normalizePhone` and `@IsPhMobile()` from `src/common/phone.ts`. Phone is required and unique on every login account. Email is optional for patients.
- **Audit:** log important changes with `AuditService` (`src/audit`), with actions like `patient.update` or `appointment.cancel`. Never log passwords, tokens or request bodies.
- **Decimals:** never return Prisma `Decimal` values. Refraction values and money go out as plain JSON numbers (or `null` when empty) through `decimalToNumber` in `src/common/decimal.ts`, the same way in every module. Refraction ranges and steps live in `src/common/refraction.ts`.

## Tests

- Jest runs in ESM mode (`--experimental-vm-modules`). `moduleNameMapper` strips `.js`, and setupFiles loads `reflect-metadata`. The e2e `testTimeout` is 30000.
- e2e tests use `test/fake-prisma.ts`, an in-memory DB:
  - When a feature uses a new model or a new query operator, **add it to the fake**.
  - Return copies, not stored objects.
  - Use `assignDefined` so undefined DTO fields don't overwrite values.
- `test/test-app.ts` provides two helpers: `createTestApp(db, sentMail)` and `bearer(app, identifier, password)`.
- Each feature gets its own `test/<feature>.e2e-spec.ts` that covers:
  - the happy path,
  - role checks (403),
  - branch guard (404 / 403),
  - validation (400),
  - each error code.
- Before saying a task is done: `npx prisma generate`, `npm test`, `npm run test:e2e`, `npm run lint`, `npm run build` must all pass. Report the test counts.

## Security rules (always)

- Never commit `.env`. Check `git status` before every commit.
- Never ask Renz to paste passwords, tokens or secrets into the chat. Ask for status codes or error messages instead.
- Don't run `npm audit fix --force`. Don't approve install scripts for `@scarf/scarf` or `@parcel/watcher`.
- Never print or log password hashes, tokens or full request bodies.

## Git

Follow the `ocula-git-flow` skill:
- Work on `feature/*`, `fix/*` or `chore/*` branches from `develop`, merged by PR into `develop`. Never push to `develop` or `main` directly.
- Use Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`).
- After merging, Vercel may need **Promote to Production** until the production branch is set to `develop`.

## When finishing a task

End with a short summary Renz can paste to his planning chat:
- branch and PR link,
- files changed,
- test counts,
- migrations (name, and whether they were applied),
- new endpoints and error codes,
- anything left unfinished or changed from the plan.

## Status (update when a module merges)

- **Done:** CI, staging, schema (21 tables), errors and logging, auth, admin users and branches, admin extras (settings, booking toggle, audit log), accounts v2 (phone login, rate limits), patients, schedules, free slots, appointments, branch guard, eye exams (draft → final) and prescriptions.
- **Next, in order (target Thu Dec 10, 2026):**
  1. File uploads (Supabase Storage)
  2. Products, per-branch inventory and stock movements
  3. Orders, partial payments and job orders (glasses released only when fully paid)
  4. Notifications, recalls and daily cron
  5. EOD reports, dashboard numbers, OCR with Gemini (drafts only), frame recommendation
  6. Security pass and API summary

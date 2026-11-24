# Phase 0: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** every role logs in to a real app shell (navigation, branch switcher, user menu), with the
shared plumbing (TanStack Query, API base URL, money/date/number helpers, table and state parts,
shared mock data, tests) that phases 1–13 build on.

**Architecture:** one `AppShell` layout for admin, staff and optometrist driven by a per-role nav
config; a `PatientLayout` with bottom nav for `/me`. Server state goes through TanStack Query; every
branch-scoped query key starts with `['branch', branchId]` so a branch switch refetches. Mocks move
to `src/mocks/data/` (fake database) and `src/mocks/handlers/` (one file per area).

**Tech Stack:** React 19, TypeScript 6, Vite 8, Tailwind v4, shadcn/ui (base-nova), React Router 8,
MSW 3; added here: `@tanstack/react-query`, `vitest`, `@testing-library/react`,
`@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`.

**Spec:** `docs/plans/frontend-roadmap.md` (Phase 0, Global constraints, Review focus).

**Branch:** `feature/phase-0-foundation` from `develop`. Run all commands in `frontend/`.

## Global Constraints

- API calls only through `src/api/client.ts`; `import type` for types; no enums or namespaces.
- Never hand-edit `src/components/ui/`; add components with `npx shadcn@latest add <name>`.
- Colours only from `docs/design-system.md` / `src/index.css` tokens (`navy-900`, `navy-700`,
  `navy-muted`, `ink`, `line`, `page`, `teal`, `gold`, `error`); icons from `lucide-react`.
- Money is a Decimal string from the API; never add money as JS floats; display `₱1,234.00`.
- Times display in `Asia/Manila` regardless of the browser's time zone.
- Display numbers: `P-000123`, `OR-000123`, `JO-000123`.
- Phase 0 does not touch `mustChangePassword`. Phase 0.5 adds the forced change-password page, only for
  temporary passwords issued by staff or admin (see the roadmap).
- Patient screens phone-first with 44px touch targets; staff/doctor/admin screens dense desktop.
- After every task: `npm run lint`, `npm run build`, `npm test` all pass before committing.

## Review Focus

1. **Wrong branch:** a staff member assigned only to Pasay cannot select Taguig, even if
   `localStorage` holds Taguig's id → Task 4 test `pickBranch ignores a stored branch the user lacks`.
2. **Money rounding:** ₱0.10 + ₱0.20 totals exactly ₱0.30 → Task 2 test `sums without float error`.
3. **Manila midnight:** an appointment at 00:30 Manila (16:30 UTC the day before) is filed under the
   Manila date → Task 2 test `manilaDayKey uses the Manila date`.
4. **Previous user's data after logout:** logging out and in as someone else must not show the first
   user's cached rows → Task 3 test `logout clears the query cache`.
5. **No branch assigned:** a staff account with zero branches sees "No branch assigned" instead of a
   crash or an empty table → Task 4 test `pickBranch returns null with no branches` and Task 6 test
   `shows no-branch notice`.

---

### Task 1: Test runner

**Files:**
- Modify: `package.json` (devDependencies, `"test": "vitest run"`, `"test:watch": "vitest"`)
- Modify: `vite.config.ts` (add `/// <reference types="vitest/config" />` and a `test` block)
- Create: `src/test/setup.ts`
- Test: `src/test/smoke.test.ts`

**Interfaces:**
- Produces: `npm test` runs every `src/**/*.test.ts(x)` in jsdom with jest-dom matchers loaded.

- [ ] **Step 1:** `npm i -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom`
  (pick the newest `vitest` whose peer range includes `vite@8`).
- [ ] **Step 2:** add `test: { environment: 'jsdom', setupFiles: ['src/test/setup.ts'] }` to
  `vite.config.ts`; `src/test/setup.ts` imports `@testing-library/jest-dom/vitest` and calls
  `cleanup()` and `localStorage.clear()` in `afterEach`.
- [ ] **Step 3:** write `src/test/smoke.test.ts`: `expect(document.body).toBeInTheDocument()`.
- [ ] **Step 4:** `npm test` → 1 passed. `npm run lint && npm run build` → pass.
- [ ] **Step 5:** commit `chore: add vitest and testing library`.

### Task 2: Money, Manila date and number helpers

**Files:**
- Create: `src/lib/money.ts`, `src/lib/dates.ts`, `src/lib/format.ts`
- Test: `src/lib/money.test.ts`, `src/lib/dates.test.ts`, `src/lib/format.test.ts`

**Interfaces:**
- Produces:
  - `toCentavos(value: string | number): number` — throws `Error('Invalid amount: …')` on non-numeric input
  - `sumCentavos(values: (string | number)[]): number`
  - `formatPeso(value: string | number): string`
  - `MANILA_TZ = 'Asia/Manila'`
  - `formatManilaDate(iso: string): string`, `formatManilaTime(iso: string): string`, `manilaDayKey(iso: string): string`
  - `formatDocNo(prefix: 'P' | 'OR' | 'JO', n: number): string`

- [ ] **Step 1: Write the failing tests**

```ts
// money.test.ts
it('sums without float error', () => expect(sumCentavos(['0.10', '0.20'])).toBe(30));
it('parses negatives and integers', () => {
  expect(toCentavos('-0.05')).toBe(-5);
  expect(toCentavos(12)).toBe(1200);
});
it('rejects non-numbers', () => expect(() => toCentavos('abc')).toThrow('Invalid amount'));
it('formats pesos', () => {
  expect(formatPeso('1234.5')).toBe('₱1,234.50');
  expect(formatPeso(0)).toBe('₱0.00');
});

// dates.test.ts
it('shows Manila time', () => expect(formatManilaTime('2026-11-23T01:00:00Z')).toBe('9:00 AM'));
it('shows Manila date', () => expect(formatManilaDate('2026-11-23T01:00:00Z')).toBe('Nov 23, 2026'));
it('manilaDayKey uses the Manila date', () =>
  expect(manilaDayKey('2026-11-23T16:30:00Z')).toBe('2026-11-24'));

// format.test.ts
it('pads document numbers', () => {
  expect(formatDocNo('P', 123)).toBe('P-000123');
  expect(formatDocNo('JO', 1234567)).toBe('JO-1234567');
});
```

- [ ] **Step 2:** `npm test -- src/lib` → FAIL (modules missing).
- [ ] **Step 3:** implement. `toCentavos` parses the string with a regex
  (`/^-?\d+(\.\d{1,2})?$/`), never `parseFloat * 100`. Dates use `Intl.DateTimeFormat('en-US', { timeZone: MANILA_TZ, … })`;
  replace ` ` (narrow no-break space newer ICU puts before AM/PM) with a normal space.
  `manilaDayKey` uses `en-CA` (`YYYY-MM-DD`). `formatPeso` uses `en-PH` grouping with a `₱` prefix.
- [ ] **Step 4:** `npm test` → all pass; lint and build pass.
- [ ] **Step 5:** commit `feat: money, Manila date and document number helpers`.

### Task 3: TanStack Query and API base URL

**Files:**
- Modify: `src/api/client.ts` (use `apiUrl`)
- Create: `src/app/query-client.ts`
- Modify: `src/main.tsx` (wrap `AuthProvider` in `QueryClientProvider`)
- Modify: `src/features/auth/AuthProvider.tsx` (`logout` calls `queryClient.clear()`)
- Modify: `src/vite-env.d.ts` (or create) — `VITE_API_URL?: string`, `VITE_USE_MOCKS?: string`
- Test: `src/api/client.test.ts`, `src/features/auth/AuthProvider.test.tsx`

**Interfaces:**
- Produces:
  - `apiUrl(path: string): string` — `${VITE_API_URL without trailing slash}/api${path}`, or `/api${path}` when unset
  - `queryClient: QueryClient` — `staleTime: 30_000`; `retry` via `shouldRetry`
  - `shouldRetry(failureCount: number, error: unknown): boolean` — false for `ApiError` with status < 500; otherwise `failureCount < 2`

- [ ] **Step 1: Write the failing tests**

```ts
// client.test.ts
it('uses VITE_API_URL', () => {
  vi.stubEnv('VITE_API_URL', 'https://api.test/');
  expect(apiUrl('/branches')).toBe('https://api.test/api/branches');
});
it('falls back to relative /api', () => {
  vi.stubEnv('VITE_API_URL', '');
  expect(apiUrl('/branches')).toBe('/api/branches');
});
it('does not retry 4xx', () => expect(shouldRetry(0, new ApiError(404, 'x', 'x'))).toBe(false));
it('retries network errors twice', () => {
  expect(shouldRetry(1, new TypeError('fetch'))).toBe(true);
  expect(shouldRetry(2, new TypeError('fetch'))).toBe(false);
});
```

`AuthProvider.test.tsx` — `logout clears the query cache`: render `AuthProvider` inside a
`QueryClientProvider`, `setQueryData(['branch', 'b-pasay', 'patients'], [1])`, call `logout()` from
the context, expect `getQueryData(...)` to be `undefined`. Mock `@/api/auth` with `vi.mock`.

- [ ] **Step 2:** `npm test` → new tests FAIL.
- [ ] **Step 3:** `npm i @tanstack/react-query`; implement. `apiUrl` reads `import.meta.env` at call
  time (so tests can stub it). Provider order in `main.tsx`: `QueryClientProvider > AuthProvider > RouterProvider`.
  `AuthProvider` gets the client with `useQueryClient()`.
- [ ] **Step 4:** all tests, lint, build pass; `npm run dev` with mocks still logs in.
- [ ] **Step 5:** commit `feat: TanStack Query, VITE_API_URL base and cache clear on logout`.

### Task 4: Branches — types, mocks, API and branch context

**Files:**
- Create: `src/types/branch.ts`; Modify: `src/types/auth.ts` (`AuthUser.branches: Branch[]`)
- Create: `src/mocks/data/branches.ts`, `src/mocks/data/users.ts` (move `users` + persistence from `handlers.ts`)
- Create: `src/mocks/handlers/auth.ts` (existing auth handlers moved unchanged), `src/mocks/handlers/branches.ts`
- Modify: `src/mocks/handlers.ts` → `export const handlers = [...authHandlers, ...branchHandlers];`
- Create: `src/api/branches.ts`
- Create: `src/features/branches/branch-context.ts`, `src/features/branches/BranchProvider.tsx`
- Modify: `src/main.tsx` (BranchProvider inside AuthProvider)
- Create: `src/test/render.tsx`
- Test: `src/features/branches/branch-context.test.ts`, `src/features/branches/BranchProvider.test.tsx`

**Interfaces:**
- Consumes: `queryClient` (Task 3), `useAuth()`.
- Produces:
  - `interface Branch { id: string; code: string; name: string; address: string | null; phone: string | null }`
  - `listBranches(): Promise<Branch[]>` → `GET /branches`
  - `pickBranch(available: Branch[], storedId: string | null): Branch | null`
  - `useBranch(): { branches: Branch[]; current: Branch | null; setCurrent(id: string): void }`
  - `branchKey(branchId: string, ...rest: unknown[])` → `['branch', branchId, ...rest]` (query-key convention for later phases)
  - `renderWithProviders(ui: ReactElement, opts?: { user?: AuthUser | null; route?: string }): RenderResult`
- Mock seed (ids fixed so later phases can reference them):
  - Branches: `{ id: 'b-pasay', code: 'PSY', name: 'Pasay' }`, `{ id: 'b-taguig', code: 'TGG', name: 'Taguig' }`, address/phone `null` (no invented addresses).
  - Users: admin → both; `staff@ocula.test` → Pasay; **new** `staff.taguig@ocula.test` (password123) → Taguig;
    doctor → both; patient → none. Login, register and `/auth/me` responses include `branches`.

- [ ] **Step 1: Write the failing tests**

```ts
// branch-context.test.ts
const pasay = { id: 'b-pasay', code: 'PSY', name: 'Pasay', address: null, phone: null };
const taguig = { id: 'b-taguig', code: 'TGG', name: 'Taguig', address: null, phone: null };
it('restores the stored branch', () => expect(pickBranch([pasay, taguig], 'b-taguig')).toBe(taguig));
it('pickBranch ignores a stored branch the user lacks', () =>
  expect(pickBranch([pasay], 'b-taguig')).toBe(pasay));
it('pickBranch returns null with no branches', () => expect(pickBranch([], null)).toBeNull());
```

`BranchProvider.test.tsx`: staff with `[pasay]` → `current` is Pasay and `setCurrent('b-taguig')` leaves
it Pasay; doctor with both → `setCurrent('b-taguig')` switches and is stored under
`ocula.branch.<userId>`; admin → `branches` comes from `listBranches` (mocked).

- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** implement. Admin's list = `useQuery({ queryKey: ['branches'], queryFn: listBranches })`;
  everyone else = `user.branches`. Store per user in `localStorage` wrapped in try/catch.
- [ ] **Step 4:** tests, lint, build pass; log in as each seed user in `npm run dev` and check the
  `/auth/me` response in DevTools includes `branches`.
- [ ] **Step 5:** commit `feat: branches, branch context and shared mock data`.

### Task 5: Shared UI parts

**Files:**
- Add (generated): `npx shadcn@latest add table dropdown-menu badge skeleton select sheet separator`
- Create in `src/components/common/`: `PageHeader.tsx`, `EmptyState.tsx`, `ErrorState.tsx`, `StatusBadge.tsx`, `DataTable.tsx`
- Test: `src/components/common/DataTable.test.tsx`

**Interfaces:**
- Produces:
  - `PageHeader({ title: string; description?: string; actions?: ReactNode })`
  - `EmptyState({ title: string; description?: string; action?: ReactNode })`
  - `ErrorState({ error: unknown; onRetry?: () => void })` — shows `ApiError.message`, else `NETWORK_ERROR`
  - `StatusBadge({ tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger'; children: ReactNode })`
  - `interface Column<T> { key: string; header: string; cell: (row: T) => ReactNode; className?: string }`
  - `DataTable<T>({ columns: Column<T>[]; rows: T[] | undefined; getRowId: (row: T) => string; isLoading: boolean; error: unknown; onRetry?: () => void; emptyTitle: string; emptyDescription?: string })`

- [ ] **Step 1: Write the failing tests** (`DataTable.test.tsx`)
  - `shows a skeleton while loading`: `isLoading` → table has `aria-busy="true"`, no rows.
  - `shows the empty state`: `rows=[]` → `getByText(emptyTitle)`.
  - `shows the error and retries`: `error=new ApiError(500,'x','Server down')` → `getByText('Server down')`;
    clicking "Try again" calls `onRetry` once.
  - `renders rows`: two rows → two body rows with their cell text.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** implement with the generated `table`, `skeleton` and `badge`. Rows are 40px
  (dense staff spec). StatusBadge tones map to tokens: info `teal`, warning `gold` (border/icon only,
  dark text), danger `error`.
- [ ] **Step 4:** tests, lint, build pass.
- [ ] **Step 5:** commit `feat: shared table, header, empty, error and status parts`.

`ConfirmDialog` from the roadmap list is deferred to the first phase that needs it (YAGNI).

### Task 6: App shell for admin, staff and optometrist

**Files:**
- Create: `src/app/nav.ts`, `src/app/layouts/AppShell.tsx`, `src/components/common/BranchSwitcher.tsx`, `src/components/common/UserMenu.tsx`
- Delete: `src/app/layouts/StaffLayout.tsx` (replaced by `AppShell`)
- Modify: `src/app/router.tsx` — use `AppShell`; add placeholders `/staff/ocr`, `/doctor/inventory`,
  `/doctor/reports`, `/admin/branches`, `/admin/inventory`, `/admin/reports`, `/admin/audit-log`;
  remove `/doctor/frames` (dropped in the brainstorm)
- Test: `src/app/layouts/AppShell.test.tsx`

**Interfaces:**
- Consumes: `useAuth()`, `useBranch()` (Task 4), `LogoutButton` behaviour (reuse its logic in `UserMenu`).
- Produces:
  - `type ShellRole = 'admin' | 'staff' | 'optometrist'`
  - `interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean }`
  - `NAV: Record<ShellRole, NavItem[]>`:
    - staff: Dashboard `/staff` (end), Patients, Appointments, Billing, Job orders, OCR, Inventory, Recalls, EOD report `/staff/reports`, Notifications
    - optometrist: Dashboard `/doctor` (end), Schedule, Patients, Exams, OCR, Inventory, EOD report `/doctor/reports`, Notifications
    - admin: Dashboard `/admin` (end), Users, Branches, Inventory, Reports, Audit log
  - `AppShell()` — layout route element; renders `<Outlet />`

- [ ] **Step 1: Write the failing tests** (`AppShell.test.tsx`, using `renderWithProviders`)
  - staff at `/staff/patients`: link "Patients" has `aria-current="page"`; no link "Users".
  - admin at `/admin`: link "Users" present; no link "Billing".
  - `shows no-branch notice`: staff with `branches: []` → `getByText('No branch assigned')`.
  - user menu: opening it shows "Change password" (to `/<area>/change-password`) and "Log out".
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** implement. ≥1024px: fixed 240px `navy-900` sidebar (logo + `OCULA` wordmark,
  `NavLink`s: active `bg-navy-700 text-white`, idle `text-navy-muted`), top bar on `page` with
  `BranchSwitcher` (plain label when one branch, `select` when several) and `UserMenu`
  (`dropdown-menu`). <1024px: top bar with a menu button opening the same nav in a `sheet`.
  The no-branch notice replaces `<Outlet />` for staff/optometrist when `current` is null.
- [ ] **Step 4:** tests, lint, build pass; in `npm run dev` log in as admin, staff, staff.taguig and
  doctor; click every nav item (each shows its placeholder); switch branch as doctor; resize below 1024px.
- [ ] **Step 5:** commit `feat: app shell with role nav, branch switcher and user menu`.

### Task 7: Patient shell

**Files:**
- Modify: `src/app/layouts/PatientLayout.tsx`
- Create: `src/app/patient-nav.ts`
- Test: `src/app/layouts/PatientLayout.test.tsx`

**Interfaces:**
- Produces: `PATIENT_NAV: NavItem[]` — Home `/me` (end), Appointments `/me/appointments`,
  Records `/me/records`, Prescriptions `/me/prescriptions`, Frames `/me/frame-finder`.

- [ ] **Step 1: Write the failing tests**
  - at `/me/records`: five nav links by name; "Records" has `aria-current="page"`.
  - top bar has a "Notifications" link to `/me/notifications` and a "Log out" button.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** implement. Top bar: logo, notifications icon link (label via `aria-label`),
  `LogoutButton`. <1024px: fixed bottom nav, each item ≥44px tall with icon and label, page content
  padded so it is not hidden behind the bar. ≥1024px: the same items as a horizontal nav in the top bar.
- [ ] **Step 4:** tests, lint, build pass; log in as the patient at phone width (375px) in DevTools.
- [ ] **Step 5:** commit `feat: patient shell with bottom navigation`.

### Task 8: Frontend CI

**Files:**
- Create: `.github/workflows/frontend-ci.yml` (repo root, not inside `frontend/`)

**Interfaces:**
- Produces: a required-style check named `Frontend CI` on every PR into `develop` or `main` that touches
  `frontend/**` or the workflow file, and on pushes to those branches.

- [ ] **Step 1:** copy the shape of `.github/workflows/backend-ci.yml`: same triggers with the path
  filter `frontend/**`, a `concurrency` group `frontend-ci-${{ github.ref }}`, `working-directory: frontend`,
  `actions/setup-node@v4` with `cache: npm` and `cache-dependency-path: frontend/package-lock.json`.
  There is no `frontend/.nvmrc` and no `engines` field; use `node-version: 24` to match `backend/.nvmrc`.
- [ ] **Step 2:** steps in order: `npm ci`, `npm run lint`, `npx prettier --check src`, `npm test`,
  `npm run build`.
- [ ] **Step 3:** `npx prettier --check src` currently fails on four generated files
  (`src/components/ui/{button,card,input,label}.tsx`), which must not be hand-edited. Create
  `frontend/.prettierignore` containing `src/components/ui`, rerun the check locally, and fix any
  other file it reports with `npm run format` as its own `chore: format` commit, so CI starts green.
- [ ] **Step 4:** after pushing the branch, open the PR and confirm the `Frontend CI` check runs and passes.
- [ ] **Step 5:** commit `ci: run lint, format check, tests and build on frontend PRs`.

### Task 9: Phase wrap-up

- [ ] **Step 1:** `npm run lint && npm run build && npm test` → all pass.
- [ ] **Step 2:** walk the roadmap's Phase 0 "Done when": each role's shell and nav, branch switch
  persists after reload, helper tests pass, CI is green on the PR, `VITE_API_URL` wired (checked against
  the backend only when the user says it is ready).
- [ ] **Step 3:** push `feature/phase-0-foundation`, `gh pr create --base develop --fill`. Do not merge.

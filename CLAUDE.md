# OCULA

PWA optical clinic management system for MRB Clinic (Pasay and Taguig branches). Monorepo: `frontend/` (React 19, TypeScript, Vite, Tailwind v4, shadcn/ui with Base UI, TanStack Query, React Router, zod + react-hook-form, vite-plugin-pwa) and `backend/` (NestJS, Prisma, Supabase Postgres). 

TanStack Query, React Router, zod, react-hook-form and vite-plugin-pwa are not installed yet; the structure below is the target.

## Commands (run in `frontend/`)

- `npm run dev` - dev server
- `npm run build` - `tsc -b && vite build` (includes type-check)
- `npm run lint` - ESLint (flat config in `eslint.config.js`)
- `npm run format` - Prettier over `src`
- `npm run preview` - serve the production build

No test runner yet.

## Conventions

- Tailwind v4: no `tailwind.config`; theme tokens live in `src/index.css`.
- shadcn/ui uses Base UI (`base-nova` style), not Radix. Generated components go in `src/components/ui/`; `cn` helper in `src/lib/utils.ts`. Icons: `lucide-react`.
- Path alias `@/` -> `src/`, defined in both `vite.config.ts` and `tsconfig.app.json`; keep in sync.
- Strict TS: `verbatimModuleSyntax` (use `import type`), `erasableSyntaxOnly` (no enums/namespaces/parameter properties), `noUnusedLocals/Parameters`.
- Prettier: semicolons, single quotes, trailing commas, width 100.
- Never commit `.env` files.
- API calls go only through `src/api/client.ts`; use MSW mocks in `src/mocks` until the real endpoint exists.
- Auth: login with email; bearer tokens (access token in memory, refresh token rotated), not cookies.

## Structure

- `src/features/<name>/` each with `pages/`, `components/`, `api.ts`, `types.ts`, `schemas.ts`.
- Shared UI: `src/components/ui` and `src/components/common`.

## Roles and routes

Three roles only: staff (also the admin), optometrist, patient. Routes: `/staff/*`, `/doctor/*`, `/me/*` (patient), public `/`, `/services`, `/frames`, `/branches`, `/doctors`, `/book`, `/login`, `/register`, `/forgot-password`, `/reset-password`. Role guards live in `src/app/router.tsx`.

## Design

Navy `#0C2D5E`, teal `#0891B2`, gold `#B8860B`, page `#F0F4F8`. Fonts: Fraunces (headings), Instrument Sans (body).

## Git

Branches `feature/*` and `fix/*` go by PR into `develop`; flow is `develop` -> `staging` -> `main`. Never push to those three directly. Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`).

cat >> CLAUDE.md <<'EOF'

## Working rules (save usage)
- Keep replies short. Explain each file or command in 1-2 plain sentences before writing it.
- Do only the task asked. Open only the files the task names; do not scan the whole repo.
- Never edit `backend/`, `src/components/ui/`, or `.env` files from frontend work.
- Git: follow the ocula-git-flow skill. Check `git branch` before committing.
- Screens: follow the ocula-new-screen skill.
- Run `npm run lint` and `npm run build` after changes.
EOF
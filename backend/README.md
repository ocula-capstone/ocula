# OCULA backend

REST API for OCULA, the clinic management system for MRB Optical Clinic (Pasay and Taguig).
NestJS 12, Prisma, PostgreSQL on Supabase. Deployed on Vercel.

## Requirements

- Node.js 24.15 or newer (see `.nvmrc`)

## Setup

```bash
cd backend
npm install
cp .env.example .env   # Windows PowerShell: copy .env.example .env
```

Fill in `.env`. The app refuses to start and lists what is missing if a required value is empty.

## Commands

| Command | What it does |
| --- | --- |
| `npm run start:dev` | Run with auto-reload on http://localhost:3000 |
| `npm run build` | Compile to `dist/` |
| `npm test` | Unit tests |
| `npm run test:e2e` | End-to-end tests |
| `npm run lint` | oxlint |
| `npm run format` | Prettier |

## API

- Every route is under `/api`. Health check: `GET /api/health`.
- Swagger docs: http://localhost:3000/api/docs (OpenAPI JSON at `/api/docs-json`).
- Validation errors return `422` with
  `{ "error": { "code": "validation_failed", "message": "...", "fields": { "od.sphere": "..." } } }`.
  Nested fields use dotted paths.
- Auth: email login, bearer access token (15 min) and rotated refresh token (7 days). No cookies.

## Git

Branch `feature/*` or `fix/*` (or `chore/*`) from `develop`, open a PR into `develop`.
Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`).

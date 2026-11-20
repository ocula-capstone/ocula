---
name: ocula-new-screen
description: Use when building or changing a screen, form or route in the frontend.
---

# New screen (frontend/ only)

- Screens: `src/features/<feature>/pages/`; feature-only parts in `components/`; shared parts in `src/components/common/`.
- Never hand-edit `src/components/ui/` (shadcn). Add with `npx shadcn@latest add <name>`.
- API calls in `src/api/`, query hooks in `src/hooks/`, types in `src/types/`, fake data in `src/mocks/`. Use `@/` imports.
- Replace the matching `<Placeholder>` in `src/app/router.tsx`; do not add a duplicate route.
- Roles: staff, optometrist, patient. Routes: `/staff/*`, `/doctor/*`, `/me/*`.
- Use the exact field names from the API contract. Errors look like `{ error: { code, message, fields? } }`; switch on `code`.
- Forms: react-hook-form + zod. Cover loading, empty and error states.
- Build against the MSW mocks (`/api/...`). Test users: staff@ocula.test, doctor@ocula.test, patient@ocula.test, password `password123`.
- Touch only the files the task names. Then run `npm run lint` and `npm run build`.

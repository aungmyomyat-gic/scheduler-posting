# Junior workflow

## First walkthrough

1. Follow the root README setup, run both applications, and open the overview.
2. Open Users. Search by a seeded email and inspect its list response in browser developer tools.
3. Create a fictional user. Try an invalid email, then a duplicate email, and observe the field errors.
4. Reload the details page. PostgreSQL keeps the record.
5. Edit the name, cancel a delete, then confirm deletion.
6. Open API reference and check the backend connection.

Trace one request through these files:

```text
frontend/src/app/users/page.tsx
frontend/src/features/users/components/users-list.tsx
frontend/src/features/users/hooks/use-users.ts
frontend/src/features/users/api/users.ts
frontend/src/lib/api-client.ts
backend/src/features/users/users.routes.ts
backend/src/features/users/users.controller.ts
backend/src/features/users/users.service.ts
backend/prisma/schema.prisma
```

## Before coding

Read `AGENTS.md` and `RULES.md`. Take one ticket with an owner, acceptance checklist, approved API/UI contract, and loading/empty/error/success states. Work on `feature/<ticket>-<summary>`. Ask for decisions about missing API, authorization, or database requirements before implementing those parts.

## Add another feature

For a products ticket, for example:

1. Agree the fields, endpoints, status codes, response schemas and UI states.
2. Add `backend/src/contracts/product.ts`. Use the same envelope/error helpers.
3. Add only the routes, controller and service needed under `backend/src/features/products/`.
4. If data changes, ask the backend owner for a named migration and compatibility review. Never delete or rewrite applied migrations.
5. Add frontend API modules, Zod schemas, query keys, hooks and components under `frontend/src/features/products/`.
6. Compose them in `frontend/src/app/products/page.tsx`; use existing `components/ui` primitives.
7. Extend the contract exporter/fixtures and both schema-agreement tests. Update `docs/api-contract.md`.
8. Add unit/component tests and Playwright coverage for a critical journey.
9. Run lint, typecheck, test and build in both applications. Include responsive screenshots and migration/rollout notes in the PR.

Keep helpers concrete. Do not create a generic CRUD engine, global data store, or repository framework before a real need appears.

## Example AI prompt

```text
Read AGENTS.md and RULES.md. Implement ticket FE-012: users list improvement.
Use frontend/src/features/users, existing shadcn primitives, the approved
API contract, TanStack Query, and accessible loading/empty/error states.
Keep backend and frontend independent. Do not add dependencies or change
contracts without approval. Run the configured checks in both projects
and report the exact results and any remaining limitations.
```

## Debugging

- Connection error: start Express and confirm the frontend public API URL.
- CORS error: match FRONTEND_ORIGIN to the browser origin, including its port.
- API 500: use the request reference and backend logs; confirm PostgreSQL is running and migrated.
- Contract test failure: compare frontend/backend Zod schemas with the reviewed docs JSON schema. Do not update snapshots just to make tests green.
- Duplicate email: choose another fictional email; the failed draft remains intact.
- Prisma client missing: run `pnpm --dir backend db:generate`.

## Review checklist

- Ticket, owner, and acceptance criteria are clear.
- API contracts match; database access stays in backend.
- Query keys/invalidation and error states behave correctly.
- Forms retain drafts on errors and show accessible field messages.
- Mobile, desktop, keyboard and confirmation flows are checked.
- Unit/component/browser tests match the changed behavior.
- No secrets, live customer data, unnecessary dependencies or unrelated refactors.
- Required checks pass; reviewer sees screenshots, API changes and migration notes.

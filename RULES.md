# Team Coding Rules — Version 2.0

## Architecture and ownership

1. Maintain two independent pnpm projects under one parent folder. Frontend (`frontend`) calls the Express API (`backend`) over documented contracts; it never directly queries PostgreSQL.
2. Use feature-first modules: `features/<name>/{api,components,hooks,schemas,types}` as needed. Create only folders actually used.
3. `app/` is responsible for URL routing, layouts, page composition and metadata; keep business logic in features.
4. Use shared frontend design tokens and shadcn/ui primitives from `@/components/ui`. Avoid custom duplicate controls.
5. API Zod contracts are owned by `backend/src/contracts`. Frontend schemas conform to the reviewed JSON schemas and fixtures in `docs/`; both projects test the agreement. Server-only schemas or secrets stay server-side.

## React and TypeScript

6. TypeScript strict enabled. Never use implicit `any`; handle `unknown` safely.
7. Use Server Components by default. `'use client'` belongs only at interactive boundaries, never automatically on every page/layout.
8. Components should be small and focused, with meaningful names; use composition rather than large conditional components.
9. Keep application side effects in hooks/services; no network calls inside rendering functions.
10. Avoid premature useMemo/useCallback; optimize measured issues only.
11. Every query has a stable query key, typed result, deliberate stale-time and loading/error/empty handling.
12. Invalidate or update relevant queries after mutations. Do not simultaneously invent separate global stores for the same server data.

## API and state

13. All network requests go through `lib/api-client.ts` and feature API modules. Do not call `fetch` directly from unrelated UI components.
14. Use typed Zod contracts for both request and response where cross-team integration requires it; infer types from Zod and run contract tests to prevent drift between independent projects.
15. Parse errors consistently (401 unauthorized, 403 forbidden, 404 not found, 422 validation errors, 5xx server errors). Avoid displaying raw backend stack traces.
16. Mock APIs must use the same types as real APIs. Mock interfaces must not become an independent contract.
17. Environment values are configured with documented `.env.example`; only explicitly public values may use the `NEXT_PUBLIC_` prefix.

## UI and accessibility

18. Tailwind + shared tokens; no arbitrary per-developer brand palettes.
19. Use accessible labels, keyboard navigation, semantic buttons, and visible focus styles.
20. Handle loading, error, empty, successful and disabled UI states.
21. Responsive minimum: mobile and desktop. No layout-breaking overflow for primary workflows.
22. Forms use React Hook Form + Zod for nontrivial input, and show field errors clearly.

## Tests and commits

23. New validation/utility/business logic gets unit tests; features get component/integration tests; critical journeys get Playwright tests.
24. Check `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` in both projects when configured. Don't merge known failures without explicit lead approval.
25. Use `feature/<ticket-id>-<name>` branches and conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
26. PR template requires ticket link, summary, screenshots (UI), tests, security impact, API changes, migration/rollback notes.
27. Require at least one reviewer; changes to auth, contracts, migrations and shared configuration need senior review.

## Security

28. No tokens, API keys, secrets or PII committed to Git or exposed in logs.
29. Never trust client-only authorization; backend enforces user roles and input validation.
30. Do not disable lint/type errors or tests merely to pass CI.

## Definition of Done

A ticket is done only when acceptance criteria are satisfied, interfaces match approved contracts, tests and checks pass, responsive/accessibility states are covered, and PR is reviewed.

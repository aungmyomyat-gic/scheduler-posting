# Application architecture

`frontend/` and `backend/` are independent pnpm projects. They communicate over HTTP, have separate lockfiles, and have no cross-project production imports. Local pnpm settings files contain native build approvals only, with no sibling workspace packages.

## Frontend boundaries

```text
app -> features -> lib/api-client
features -> components/ui
features -> local Zod schemas matching docs/api-schemas.json
```

`src/app` owns routes, layout, metadata and page composition. Feature components, hooks, schemas and API modules live in `src/features/<feature>/`. Shared shadcn primitives live in `src/components/ui`; do not duplicate these per feature. The official CLI generated these primitives:

```bash
cd frontend
pnpm dlx shadcn@4.23.0 add button
```

Keep the generated primitive style consistent with `components.json` and the global Tailwind design tokens. Supporting UI dependencies such as Radix, `cn`, class-variance-authority and Lucide belong to the UI setup.

The root shell, overview, API examples, and route composition are Server Components. Interactive users data is queried in client components because this example is a directory workflow, without SEO data requirements. A future SEO page should call its feature API module from a Server Component; keep all database access in Express. No Next.js API routes or Server Actions create a second backend.

## Query and form state

`QueryProvider` owns a stable browser QueryClient. All user queries use `userKeys`:

- `userKeys.all`: all user data.
- `userKeys.list({ q, page, pageSize })`: independent cached lists.
- `userKeys.detail(id)`: one user response.

Queries use a one-minute stale time, propagate AbortSignal, and handle loading/error/empty/success states. Search and pagination live in the URL; drafts live in React Hook Form. Mutation success updates/removes the relevant detail cache and invalidates user queries. Failed forms preserve entered values and show field errors. Mutations are never automatically retried.

`lib/api-client.ts` is the only production HTTP implementation. Feature API modules specify request methods and Zod response schemas. The client distinguishes valid backend errors, offline connections, cancellation and invalid response bodies. Cancellation is propagated to TanStack Query.

## Backend boundaries

```text
app.ts -> users.routes -> users.controller -> users.service -> Prisma -> PostgreSQL
```

`app.ts` composes middleware and accepts a typed users service. Tests inject a service double; `server.ts` supplies the real Prisma service. There is no runtime mock switch. `server.ts` owns environment loading, listening and graceful shutdown.

`features/health/` owns the health routes and controller, with its response schema in `contracts/health.ts`. `app.ts` mounts the feature at `/api/v1/health`. This liveness endpoint runs independently of the database, so it needs only a router and controller.

Controllers parse untrusted inputs using `parseInput`, call the service, and respond with `sendSuccess`. Services map Prisma rows to public DTOs, converting Dates to ISO strings. Shared error middleware maps known database/application errors and catches async failures. Input validation errors become 422; output contract failures become 500.

Prisma uses the PostgreSQL driver adapter. Generated code lives in ignored `backend/src/generated/prisma` and is compiled into the backend build. The schema, named migrations and repeatable seed remain in `backend/prisma`.

## Contract ownership

Backend Zod schemas are authoritative. Frontend Zod boundary schemas are explicit copies of the HTTP agreement, without importing backend source. Both test suites compare the reviewed JSON schemas and common fixtures in the parent `docs/` folder. Request refinements and normalizations also have fixture tests. An API change requires review of all three: backend, frontend, and docs.

## Environments and auth

Only `NEXT_PUBLIC_API_BASE_URL` is public frontend configuration. Database credentials remain exclusively in the backend environment. CORS permits one explicit frontend origin, and the server binds to loopback by default. CORS is not authorization; this sample has no login, cookies, roles or protected routes. Add auth only after its transport, credential and authorization policies are approved.

# Foundation — Next.js + Express team template

Two independent projects in one parent folder. Each project has its own package manifest, lockfile, dependencies, and commands. There is no root workspace or Turborepo task graph.

| Area         | Standard                                                       |
| ------------ | -------------------------------------------------------------- |
| Frontend     | Next.js App Router, TypeScript strict, Tailwind CSS, shadcn/ui |
| Architecture | Feature-based modules                                          |
| Server state | TanStack Query                                                 |
| Forms        | React Hook Form + Zod                                          |
| Backend      | Node.js + Express 5, TypeScript strict                         |
| Database     | PostgreSQL + Prisma 7                                          |
| Quality      | ESLint + Prettier                                              |
| Testing      | Vitest, Testing Library, Playwright                            |

## Start locally

Requirements: **Node.js 24 LTS**, **pnpm 11.8.0**, and **PostgreSQL installed and running locally**. `.nvmrc` selects Node 24. Docker is not required. The PostgreSQL credentials in the examples are fictional local development defaults.

Prepare your local database once before using the launcher:

1. Start your local PostgreSQL server.
2. Open `psql` or pgAdmin as your PostgreSQL administrator and create the example role and database (skip this if they already exist):

   ```sql
   CREATE ROLE template WITH LOGIN PASSWORD 'template';
   CREATE DATABASE team_template OWNER template;
   ```

3. From the parent folder, create the backend environment file without overwriting an existing one:

   ```bash
   cp -n backend/.env.example backend/.env
   ```

   Set `DATABASE_URL` in `backend/.env` to your local database's user, password, host, port, and database name. The example matches the SQL above. Use a dedicated development database; the launcher applies migrations and may insert fictional sample users.

Start everything with one command from the parent folder:

```bash
./.setup.sh
```

The launcher preserves existing environment files, creates missing ones from the examples, installs both projects with their lockfiles, generates Prisma, checks your local database connection, and applies pending migrations. It seeds fictional users only when the User table did not exist before setup. Later runs preserve edits and deletions. It does not install or start PostgreSQL or create database roles/databases. Connection failures stop setup before migrations or app startup and print guidance without exposing credentials.

It chooses available frontend/backend ports, starting from the configured frontend origin and backend port. The printed URLs are used for the API client and CORS during that run; environment files are not rewritten. Press **Ctrl+C** to stop both apps. PostgreSQL keeps running and retains its data.

If this checkout already has a running Next.js dev server, stop it with Ctrl+C in its terminal before using the launcher. The script checks the existing dev lock before installing or changing setup files.

```bash
# Optional preferred ports; occupied ports are skipped.
FRONTEND_PORT=3001 BACKEND_PORT=4001 ./.setup.sh

# For an already migrated database: skip its check, migrations, and seed.
./.setup.sh --skip-db
```

Automatic migrations and seeding require a local PostgreSQL database (`localhost`, `127.0.0.1`, or `::1`) using the `public` schema. Custom database names and ports come from `DATABASE_URL`; an exported `DATABASE_URL` takes precedence over `backend/.env`. For an already migrated remote database or a different schema, use `--skip-db`. Run `./.setup.sh --help` for the available options. The launcher supports macOS, Linux, and WSL and adds no shared package/workspace dependency.

For manual setup, run from the parent folder:

```bash
nvm use
# Install pnpm 11.8.0 using your preferred Node package-manager setup if needed.
# Start PostgreSQL and prepare the local database as described above.

cp -n backend/.env.example backend/.env
pnpm --dir backend install --frozen-lockfile
pnpm --dir backend db:generate
pnpm --dir backend db:deploy
pnpm --dir backend db:seed

cp -n frontend/.env.example frontend/.env.local
pnpm --dir frontend install --frozen-lockfile
```

Start the applications in two terminals, from the parent folder:

```bash
# Terminal 1
pnpm --dir backend dev
```

```bash
# Terminal 2
pnpm --dir frontend dev
```

Open **http://localhost:3000**. The API runs at **http://localhost:4000/api/v1**. Change URLs in the respective environment files when needed; `FRONTEND_ORIGIN` must match the browser origin exactly. Restart the applications after changing environment values. For a production frontend build, public environment values are embedded at build time.

If your local PostgreSQL server uses a port other than 5432, set that port in `DATABASE_URL` in `backend/.env` before migrating.

If frontend port 3000 is occupied, start with `pnpm --dir frontend dev --port 3001` and set `FRONTEND_ORIGIN=http://localhost:3001` in the backend environment. Restart Express after this change.

The seed inserts six fictional users with `example.com` emails. It can be run again without deleting existing rows or overwriting edits. Data lives in your local PostgreSQL database and is preserved when the applications stop. Manage the PostgreSQL server with your operating system's service tools.

Each project's `pnpm-workspace.yaml` contains **local dependency build approvals only** (Prisma/native tooling). It has no sibling package globs and does not join the frontend and backend into a workspace. Keep these narrow install policies when adding dependencies.

## Explore the examples

| Page                  | What juniors learn                                        |
| --------------------- | --------------------------------------------------------- |
| `/`                   | Application shell, Server Components, shared UI           |
| `/users`              | List, search, pagination, loading, empty and error states |
| `/users/new`          | Form validation, POST, duplicate-email errors             |
| `/users/[id]`         | Detail query, success feedback, delete confirmation       |
| `/users/[id]/edit`    | Form defaults, PATCH, cache invalidation                  |
| `/examples/responses` | Response envelopes and an on-demand API connection check  |

Users requests always go to Express and PostgreSQL. A disconnected backend displays an error. There is no runtime in-memory fallback. The sample directory intentionally uses client queries for interactive data; layouts and route composition remain Server Components.

## Structure

```text
frontend/                  # Independent Next.js project
  src/app/                 # Routes, layouts, metadata
  src/features/users/      # API modules, hooks, schemas, components
  src/features/system/     # Health check example
  src/components/ui/       # Official shadcn primitives
  src/lib/                 # API client and envelope schemas
backend/                   # Independent Express project
  src/features/users/      # Routes → controller → service
  src/contracts/           # API Zod contracts (source of truth)
  src/middleware/          # Request ID, validation, global errors
  prisma/                  # Schema, named migrations, repeatable seed
  scripts/export-contract.ts
docs/                      # API agreement and junior workflow
```

Backend and frontend do not import each other's code. Their tests compare Zod schemas against the reviewed `docs/api-schemas.json` and validate common fixtures. Keep `docs/` beside both applications when running contract tests; either application can build and run independently.

## Commands and verification

The launcher has its own dependency-free orchestration checks:

```bash
node --test scripts/setup.test.mjs
```

Run from the parent folder:

```bash
pnpm --dir backend lint
pnpm --dir backend typecheck
pnpm --dir backend test
pnpm --dir backend build
pnpm --dir backend format:check

pnpm --dir frontend lint
pnpm --dir frontend typecheck
pnpm --dir frontend test
pnpm --dir frontend build
pnpm --dir frontend format:check
```

Backend `pnpm test` uses a typed service double and a real HTTP server on an ephemeral local port. It does not need PostgreSQL. Frontend tests cover the API client, contract agreement, and component behavior. Generated Prisma code is ignored by Git and regenerated by backend checks/builds.

For the database integration test, create a separate local database once as your PostgreSQL administrator (shown as `postgres`; adjust users and connection URLs for your installation):

```bash
createdb -h localhost -p 5432 -U postgres -W -O template team_template_test
DATABASE_URL=postgresql://template:template@localhost:5432/team_template_test pnpm --dir backend db:deploy
TEST_DATABASE_URL=postgresql://template:template@localhost:5432/team_template_test pnpm --dir backend test:integration
```

This test uses PostgreSQL and a second database connection to verify persistence, search, update, uniqueness and deletion. It removes only its own generated records. It refuses the development database. `TEST_DATABASE_URL` is required; tests fail explicitly if it is missing.

Browser tests require the migrated and seeded development database:

```bash
pnpm --dir frontend exec playwright install chromium
pnpm --dir frontend test:e2e
```

Playwright starts its own frontend on port 3100 and API on port 4100 and never reuses other local applications. Override `E2E_WEB_PORT` and `E2E_API_PORT` if those ports are occupied. Desktop and mobile Chromium journeys cover the overview, API check, create, duplicate validation, reload persistence, edit, search, cancel deletion, and confirmed deletion. Tests clean up their own records. Screenshots and failure traces are in `frontend/test-results/`; the HTML report is in `frontend/playwright-report/`.

To run production builds locally, build each application first, then use its `pnpm start` command. Database migrations must be applied separately before starting the backend.

## API agreement and team guidance

- [API contract](docs/api-contract.md)
- [Frontend and backend architecture](docs/FRONTEND-ARCHITECTURE.md)
- [Junior workflow and adding a feature](docs/JUNIOR-WORKFLOW.md)
- [Team rules](RULES.md) and [agent instructions](AGENTS.md)
- [Verification evidence](docs/verification.md)

The requested stack is configured; supporting packages are limited to the official UI dependencies, PostgreSQL adapter, environment/CORS support, and compiler/lint/test tooling. Versions are pinned and each project includes a lockfile for reproducible installs.

This is a learning template with unauthenticated CRUD endpoints. Authentication, authorization, production deployment, CI and operational controls remain separate work. The backend binds to loopback by default. Do not expose this demo to untrusted clients as an authenticated application.

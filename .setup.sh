#!/usr/bin/env bash
set -euo pipefail

SETUP_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SETUP_DIR"

SKIP_DB=false
case "${1:-}" in
  "") ;;
  --skip-db) SKIP_DB=true ;;
  --help|-h)
    cat <<'HELP'
Usage: ./.setup.sh [--skip-db]

Install dependencies, prepare the local PostgreSQL database, and start both apps.
Existing environment files and database records are preserved. Ctrl+C stops both
apps and leaves PostgreSQL running. Requires Node.js 24, pnpm, and running Docker.

  --skip-db  Use an already prepared database; skip Docker, migrations, and seed.

FRONTEND_PORT and BACKEND_PORT set preferred ports; occupied ports are skipped.
POSTGRES_PORT must match DATABASE_URL when using the local Compose database.
HELP
    exit 0
    ;;
  *) printf 'Unknown option. Use ./.setup.sh --help.\n' >&2; exit 1 ;;
esac
if [[ $# -gt 1 ]]; then
  printf 'Use ./.setup.sh --help for available options.\n' >&2
  exit 1
fi

for tool in node pnpm; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    printf 'Missing %s. Install the prerequisites listed in README.md.\n' "$tool" >&2
    exit 1
  fi
done
if [[ "$(node -p 'process.versions.node.split(".")[0]')" != 24 ]]; then
  printf 'Node.js 24 is required. Run nvm use from this folder.\n' >&2
  exit 1
fi
if [[ "$SKIP_DB" == false ]]; then
  if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
    printf 'Docker Compose is required. Install Docker Desktop or use --skip-db.\n' >&2
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    printf 'Docker is stopped. Start Docker Desktop and run this script again.\n' >&2
    exit 1
  fi
fi

if [[ ! -e backend/.env ]]; then cp -n backend/.env.example backend/.env; fi
if [[ ! -e frontend/.env.local ]]; then cp -n frontend/.env.example frontend/.env.local; fi

# Parse dotenv as data, never as executable shell code. Print only public port numbers.
read -r FRONTEND_PORT BACKEND_PORT < <(SETUP_SKIP_DB="$SKIP_DB" node --input-type=module - <<'NODE'
import { readFileSync } from "node:fs";
import { createServer } from "node:net";
import { parseEnv } from "node:util";

try {
  const backend = { ...parseEnv(readFileSync("backend/.env", "utf8")), ...process.env };
  const database = new URL(backend.DATABASE_URL);
  if (process.env.SETUP_SKIP_DB !== "true") {
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(database.hostname);
    if (!local || !["postgres:", "postgresql:"].includes(database.protocol) ||
        (database.port || "5432") !== (process.env.POSTGRES_PORT || "5432") ||
        database.pathname !== "/team_template" ||
        (database.searchParams.get("schema") || "public") !== "public") {
      throw new Error("Automatic database setup supports the local Compose database only. Use --skip-db for an already prepared database, or check DATABASE_URL and POSTGRES_PORT.");
    }
  }
  const used = new Set();
  async function freePort(value) {
    const preferred = Number(value);
    if (!Number.isInteger(preferred) || preferred < 1024 || preferred > 65535) {
      throw new Error("Preferred application ports must be integers between 1024 and 65535.");
    }
    for (let port = preferred; port <= Math.min(preferred + 100, 65535); port++) {
      if (used.has(port)) continue;
      const available = await new Promise((resolve, reject) => {
        const server = createServer();
        server.once("error", (error) => error.code === "EADDRINUSE" ? resolve(false) : reject(error));
        server.listen(port, "127.0.0.1", () => server.close(() => resolve(true)));
      });
      if (available) { used.add(port); return port; }
    }
    throw new Error("No free local port found. Choose another FRONTEND_PORT or BACKEND_PORT.");
  }
  const origin = new URL(backend.FRONTEND_ORIGIN || "http://localhost:3000");
  const web = await freePort(process.env.FRONTEND_PORT || origin.port || 3000);
  const api = await freePort(process.env.BACKEND_PORT || backend.PORT || 4000);
  console.log(web, api);
} catch (error) {
  // Never include a database URL or dotenv content in a diagnostic.
  const safe = error instanceof Error && /^(Automatic database|Preferred application|No free local)/.test(error.message);
  console.error(safe ? error.message : "Could not read local configuration or check ports. Verify backend/.env and the README prerequisites.");
  process.exitCode = 1;
}
NODE
)

printf '\nInstalling the two independent projects…\n'
pnpm --dir backend install --frozen-lockfile
pnpm --dir frontend install --frozen-lockfile
pnpm --dir backend db:generate

if [[ "$SKIP_DB" == false ]]; then
  printf '\nPreparing local PostgreSQL…\n'
  docker compose up -d --wait postgres
  FIRST_DATABASE_SETUP="$(docker compose exec -T postgres psql -U template -d team_template -tAc "SELECT to_regclass('public.\"User\"') IS NULL;")"
  pnpm --dir backend db:deploy
  # Seed only a new database. Deleted sample records stay deleted on later runs.
  if [[ "$FIRST_DATABASE_SETUP" == t ]]; then pnpm --dir backend db:seed; fi
fi

WEB_ORIGIN="http://localhost:$FRONTEND_PORT"
API_ORIGIN="http://localhost:$BACKEND_PORT"
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  trap - EXIT INT TERM
  printf '\nStopping frontend and backend…\n'
  for pid in "$FRONTEND_PID" "$BACKEND_PID"; do
    if [[ -n "$pid" ]]; then kill -TERM -- "-$pid" 2>/dev/null || true; fi
  done
  # Each app has its own process group, including pnpm, watchers, and child servers.
  for ((attempt = 0; attempt < 50; attempt++)); do
    if ! kill -0 -- "-${FRONTEND_PID:-0}" 2>/dev/null && ! kill -0 -- "-${BACKEND_PID:-0}" 2>/dev/null; then break; fi
    sleep 0.1
  done
  for pid in "$FRONTEND_PID" "$BACKEND_PID"; do
    if [[ -n "$pid" ]]; then
      kill -KILL -- "-$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
  done
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Bash job control creates separate process groups on macOS, Linux, and WSL.
set -m
HOST=127.0.0.1 PORT="$BACKEND_PORT" FRONTEND_ORIGIN="$WEB_ORIGIN" \
  pnpm --dir backend dev </dev/null &
BACKEND_PID=$!
NEXT_PUBLIC_API_BASE_URL="$API_ORIGIN/api/v1" \
  pnpm --dir frontend dev --hostname 127.0.0.1 --port "$FRONTEND_PORT" </dev/null &
FRONTEND_PID=$!
set +m

printf '\nStarting frontend: %s\nStarting API:      %s/api/v1\n' "$WEB_ORIGIN" "$API_ORIGIN"
SETUP_WEB_PORT="$FRONTEND_PORT" SETUP_API_PORT="$BACKEND_PORT" node --input-type=module - <<'NODE'
const deadline = Date.now() + 60_000;
const urls = [
  `http://127.0.0.1:${process.env.SETUP_API_PORT}/api/v1/health`,
  `http://127.0.0.1:${process.env.SETUP_WEB_PORT}`,
];
while (Date.now() < deadline) {
  const ready = await Promise.all(urls.map(async (url) => {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
      await response.body?.cancel();
      return response.ok;
    } catch { return false; }
  }));
  if (ready.every(Boolean)) process.exit(0);
  await new Promise((resolve) => setTimeout(resolve, 500));
}
console.error("The apps did not become ready within 60 seconds. Check the startup logs above.");
process.exitCode = 1;
NODE

printf '\nBoth applications are ready. Open %s\nPress Ctrl+C to stop both apps. PostgreSQL stays running.\n' "$WEB_ORIGIN"
while kill -0 "$BACKEND_PID" 2>/dev/null && kill -0 "$FRONTEND_PID" 2>/dev/null; do sleep 1; done
STATUS=0
if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
  wait "$BACKEND_PID" || STATUS=$?
else
  wait "$FRONTEND_PID" || STATUS=$?
fi
printf 'One application stopped; stopping its peer.\n' >&2
if [[ "$STATUS" == 0 ]]; then STATUS=1; fi
exit "$STATUS"

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
apps and leaves PostgreSQL running. Requires Node.js 24, pnpm, and local PostgreSQL.

  --skip-db  Use an already prepared database; skip its check, migrations, and seed.

FRONTEND_PORT and BACKEND_PORT set preferred ports; occupied ports are skipped.
Start local PostgreSQL and create the database in backend/.env before running.
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
# A Next.js checkout has one dev lock, even when a different port is selected.
node --input-type=module - <<'NODE'
import { readFileSync } from "node:fs";
try {
  const lock = JSON.parse(readFileSync("frontend/.next/dev/lock", "utf8"));
  if (Number.isSafeInteger(lock.pid) && lock.pid > 0) {
    let alive = true;
    try { process.kill(lock.pid, 0); } catch (error) { alive = error.code !== "ESRCH"; }
    if (alive) {
      console.error("A frontend dev server is already running for this checkout. Stop it with Ctrl+C before using .setup.sh.");
      process.exitCode = 1;
    }
  }
} catch (error) {
  if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) {
    console.error("Could not check the frontend dev lock. Check permissions for frontend/.next/dev.");
    process.exitCode = 1;
  }
}
NODE
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
    const localHosts = ["localhost", "127.0.0.1", "[::1]", "::1"];
    const local = localHosts.includes(database.hostname) &&
      database.searchParams.getAll("host").every((host) => localHosts.includes(host));
    if (!local || !["postgres:", "postgresql:"].includes(database.protocol) ||
        !database.pathname || database.pathname === "/" ||
        (database.searchParams.get("schema") || "public") !== "public") {
      throw new Error("Automatic database setup requires a local PostgreSQL database using the public schema. Check DATABASE_URL in backend/.env, or use --skip-db for an already prepared database.");
    }
  }
  const used = new Set();
  async function availableOn(port, host) {
    return new Promise((resolve, reject) => {
      const server = createServer();
      server.once("error", (error) => {
        if (error.code === "EADDRINUSE") resolve(false);
        else if (host === "::1" && ["EAFNOSUPPORT", "EADDRNOTAVAIL"].includes(error.code)) resolve(true);
        else reject(error);
      });
      server.listen(port, host, () => server.close(() => resolve(true)));
    });
  }
  async function freePort(value) {
    const preferred = Number(value);
    if (!Number.isInteger(preferred) || preferred < 1024 || preferred > 65535) {
      throw new Error("Preferred application ports must be integers between 1024 and 65535.");
    }
    for (let port = preferred; port <= Math.min(preferred + 100, 65535); port++) {
      if (used.has(port)) continue;
      const available = await availableOn(port, "127.0.0.1") && await availableOn(port, "::1");
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
  FIRST_DATABASE_SETUP="$(
    cd backend
    node --input-type=module - <<'NODE'
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import pg from "pg";

const env = { ...parseEnv(readFileSync(".env", "utf8")), ...process.env };
const client = new pg.Client({
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  query_timeout: 5000,
});
try {
  await client.connect();
  const result = await client.query(`SELECT to_regclass('public."User"') IS NULL AS "firstSetup"`);
  console.log(result.rows[0].firstSetup ? "t" : "f");
} catch {
  console.error("Could not check local PostgreSQL. Start the server, create the database and user, and verify DATABASE_URL in backend/.env. See README.md for setup steps.");
  process.exitCode = 1;
} finally {
  await client.end();
}
NODE
  )"
  pnpm --dir backend db:deploy
  # Seed only a new database. Deleted sample records stay deleted on later runs.
  if [[ "$FIRST_DATABASE_SETUP" == t ]]; then pnpm --dir backend db:seed; fi
fi

WEB_ORIGIN="http://localhost:$FRONTEND_PORT"
API_ORIGIN="http://localhost:$BACKEND_PORT"
printf '\nStarting frontend: %s\nStarting API:      %s/api/v1\n' "$WEB_ORIGIN" "$API_ORIGIN"
SETUP_WEB_PORT="$FRONTEND_PORT" SETUP_API_PORT="$BACKEND_PORT" exec node --input-type=module - <<'NODE'
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const webPort = process.env.SETUP_WEB_PORT;
const apiPort = process.env.SETUP_API_PORT;
const webOrigin = `http://localhost:${webPort}`;
const apiOrigin = `http://localhost:${apiPort}`;
const apps = [];
const abort = new AbortController();
let stopping = false;

function groupAlive(pid) {
  if (!pid) return false;
  try { process.kill(-pid, 0); return true; }
  catch (error) { return error.code !== "ESRCH"; }
}
function signalGroups(signal) {
  for (const { child } of apps) {
    if (!child.pid || !groupAlive(child.pid)) continue;
    try { process.kill(-child.pid, signal); } catch (error) {
      if (error.code !== "ESRCH") console.error("Could not signal an application process group.");
    }
  }
}
async function stop(code) {
  if (stopping) return;
  stopping = true;
  abort.abort();
  console.log("\nStopping frontend and backend…");
  signalGroups("SIGTERM");
  const deadline = Date.now() + 5000;
  while (apps.some(({ child }) => groupAlive(child.pid)) && Date.now() < deadline) await delay(50);
  signalGroups("SIGKILL");
  await Promise.all(apps.map(({ closed }) => closed));
  process.exit(code);
}
function launch(name, args, overrides) {
  // A separate session gives each app a process group containing its watchers/servers.
  const child = spawn("pnpm", args, {
    detached: true,
    stdio: ["ignore", "inherit", "inherit"],
    env: { ...process.env, ...overrides },
  });
  const closed = new Promise((resolve) => child.once("close", resolve));
  apps.push({ child, closed });
  child.once("error", () => {
    console.error(`Could not start ${name}. Check the pnpm installation.`);
    void stop(1);
  });
  child.once("exit", (code) => {
    if (!stopping) {
      console.error(`${name} stopped; stopping its peer.`);
      void stop(code || 1);
    }
  });
}
process.once("SIGINT", () => void stop(130));
process.once("SIGTERM", () => void stop(143));
launch("Backend", ["--dir", "backend", "dev"], {
  HOST: "127.0.0.1", PORT: apiPort, FRONTEND_ORIGIN: webOrigin,
});
launch("Frontend", ["--dir", "frontend", "dev", "--hostname", "127.0.0.1", "--port", webPort], {
  NEXT_PUBLIC_API_BASE_URL: `${apiOrigin}/api/v1`,
});
const deadline = Date.now() + 60_000;
const urls = [
  `http://127.0.0.1:${apiPort}/api/v1/health`,
  `http://127.0.0.1:${webPort}`,
];
let ready = false;
while (!stopping && Date.now() < deadline) {
  const results = await Promise.all(urls.map(async (url) => {
    try {
      const response = await fetch(url, { signal: AbortSignal.any([abort.signal, AbortSignal.timeout(1500)]) });
      await response.body?.cancel();
      return response.ok;
    } catch { return false; }
  }));
  if (!stopping && results.every(Boolean)) { ready = true; break; }
  await delay(500);
}
if (!stopping) {
  if (ready) {
    console.log(`\nBoth applications are ready. Open ${webOrigin}\nPress Ctrl+C to stop both apps. PostgreSQL stays running.`);
  } else {
    console.error("The apps did not become ready within 60 seconds. Check the startup logs above.");
    await stop(1);
  }
}
NODE

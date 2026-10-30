import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdtemp, mkdir, copyFile, writeFile, readFile, chmod, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const launcher = fileURLToPath(new URL("../.setup.sh", import.meta.url));
const pnpmStub = String.raw`#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.MOCK_LOG, JSON.stringify({ tool: "pnpm", args }) + "\n");
if (args[2] === "install" && process.env.MOCK_FAIL_INSTALL === args[1]) process.exit(2);
if (args[2] === "db:deploy" && process.env.MOCK_FAIL_MIGRATE === "1") process.exit(3);
if (args[2] === "dev") {
  fs.appendFileSync(process.env.MOCK_LOG, JSON.stringify({ kind: "dev", pid: process.pid }) + "\n");
  const child = spawn(process.execPath, [path.join(__dirname, "mock-app.cjs"), args[1], ...args], { stdio: "inherit" });
  process.on("SIGTERM", () => child.kill("SIGTERM"));
  child.on("exit", code => process.exit(code ?? 1));
}
`;
const dockerStub = String.raw`#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.MOCK_LOG, JSON.stringify({ tool: "docker", args }) + "\n");
process.exit(99); // Any Docker dependency must fail these local PostgreSQL tests.
`;
const pgStub = String.raw`
import fs from "node:fs";
export default {
  Client: class {
    constructor(options) { this.options = options; }
    async connect() {
      const url = new URL(this.options.connectionString);
      fs.appendFileSync(process.env.MOCK_LOG, JSON.stringify({
        tool: "postgres", action: "connect", host: url.hostname, port: url.port,
        database: url.pathname.slice(1),
      }) + "\n");
      if (process.env.MOCK_FAIL_DATABASE === "1") throw new Error(this.options.connectionString);
    }
    async query(sql) {
      fs.appendFileSync(process.env.MOCK_LOG, JSON.stringify({ tool: "postgres", action: "query", sql }) + "\n");
      return { rows: [{ firstSetup: process.env.MOCK_TABLE_EXISTS !== "1" }] };
    }
    async end() {
      fs.appendFileSync(process.env.MOCK_LOG, JSON.stringify({ tool: "postgres", action: "end" }) + "\n");
    }
  },
};
`;
const appStub = String.raw`
const fs = require("node:fs");
const http = require("node:http");
const role = process.argv[2];
const flag = process.argv.indexOf("--port");
const port = Number(role === "backend" ? process.env.PORT : process.argv[flag + 1]);
const server = http.createServer((_request, response) => {
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify({ success: true, data: { status: "ok" } }));
});
server.listen(port, "127.0.0.1", () => fs.appendFileSync(process.env.MOCK_LOG, JSON.stringify({
  kind: "app", pid: process.pid, role, port,
  origin: process.env.FRONTEND_ORIGIN,
  apiUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
}) + "\n"));
process.on("SIGTERM", () => server.close(() => process.exit(0)));
if (role === "backend") setInterval(() => {
  if (fs.existsSync(process.env.MOCK_EXIT_FILE)) process.exit(7);
}, 50);
`;

async function listen(server, host = "127.0.0.1") {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, host, resolve);
  });
  return server.address().port;
}

async function waitFor(check, failure, timeout = 15_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(failure());
}

async function fixture(
  t,
  {
    existing = false,
    skipDb = false,
    failInstall = "",
    failDatabase = false,
    failMigrate = false,
    databaseUrl,
    databaseOverride,
    activeFrontend = false,
    ipv6 = false,
  } = {},
) {
  const root = await mkdtemp(path.join(tmpdir(), "foundation-launcher-"));
  const bin = path.join(root, "bin");
  for (const directory of [bin, path.join(root, "frontend"), path.join(root, "backend")]) {
    await mkdir(directory);
  }
  await copyFile(launcher, path.join(root, ".setup.sh"));
  if (activeFrontend) {
    await mkdir(path.join(root, "frontend/.next/dev"), { recursive: true });
    await writeFile(
      path.join(root, "frontend/.next/dev/lock"),
      JSON.stringify({ pid: process.pid }),
    );
  }
  const url =
    databaseUrl ??
    (skipDb
      ? "postgresql://junior:example@db.example.com/prepared"
      : "postgresql://template:template@localhost:5432/team_template?schema=public");
  const backendEnv = `PORT=4000\nFRONTEND_ORIGIN=http://localhost:3000\nDATABASE_URL=${url}\n# Existing custom comment stays intact.\n`;
  const frontendEnv = "NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1\n";
  await writeFile(path.join(root, "backend/.env.example"), backendEnv);
  await writeFile(path.join(root, "frontend/.env.example"), frontendEnv);
  if (existing) {
    await writeFile(path.join(root, "backend/.env"), backendEnv);
    await writeFile(path.join(root, "frontend/.env.local"), frontendEnv);
  }
  for (const [name, contents] of [
    ["pnpm", pnpmStub],
    ["docker", dockerStub],
  ]) {
    await writeFile(path.join(bin, name), contents);
    await chmod(path.join(bin, name), 0o755);
  }
  await writeFile(path.join(bin, "mock-app.cjs"), appStub);
  const pgModule = path.join(root, "backend/node_modules/pg");
  await mkdir(pgModule, { recursive: true });
  await writeFile(
    path.join(pgModule, "package.json"),
    JSON.stringify({ type: "module", exports: "./index.js" }),
  );
  await writeFile(path.join(pgModule, "index.js"), pgStub);
  const occupied = createServer();
  let preferredWebPort;
  try {
    preferredWebPort = await listen(occupied, ipv6 ? "::1" : "127.0.0.1");
  } catch (error) {
    if (!ipv6 || !["EAFNOSUPPORT", "EADDRNOTAVAIL"].includes(error.code)) throw error;
    preferredWebPort = await listen(occupied);
  }
  const backendReservation = createServer();
  const preferredApiPort = await listen(backendReservation);
  await new Promise((resolve) => backendReservation.close(resolve));
  const log = path.join(root, "commands.jsonl");
  const exitFile = path.join(root, "exit-backend");
  await writeFile(log, "");
  const env = { ...process.env };
  for (const name of ["DATABASE_URL", "FRONTEND_ORIGIN", "PORT", "SETUP_SKIP_DB"]) {
    delete env[name];
  }
  Object.assign(env, {
    PATH: `${bin}${path.delimiter}${process.env.PATH}`,
    FRONTEND_PORT: String(preferredWebPort),
    BACKEND_PORT: String(preferredApiPort),
    MOCK_LOG: log,
    MOCK_EXIT_FILE: exitFile,
    MOCK_FAIL_INSTALL: failInstall,
    MOCK_FAIL_DATABASE: failDatabase ? "1" : "0",
    MOCK_FAIL_MIGRATE: failMigrate ? "1" : "0",
    MOCK_TABLE_EXISTS: existing ? "1" : "0",
  });
  if (databaseOverride !== undefined) env.DATABASE_URL = databaseOverride;
  const child = spawn("bash", [path.join(root, ".setup.sh"), ...(skipDb ? ["--skip-db"] : [])], {
    cwd: tmpdir(), // The launcher must resolve its own directory.
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk;
  });
  child.stderr.on("data", (chunk) => {
    output += chunk;
  });
  let result;
  child.on("close", (code, signal) => {
    result = { code, signal };
  });
  const entries = async () =>
    (await readFile(log, "utf8"))
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  const closed = async () => {
    await waitFor(
      () => result,
      () => `Launcher did not exit:\n${output}`,
    );
    return result;
  };
  t.after(async () => {
    if (!result) child.kill("SIGTERM");
    try {
      await closed();
    } finally {
      // These process groups belong only to this disposable test fixture.
      for (const entry of await entries()) {
        if (entry.kind === "dev") {
          try {
            process.kill(-entry.pid, "SIGKILL");
          } catch (error) {
            if (error.code !== "ESRCH") throw error;
          }
        }
      }
      await new Promise((resolve) => occupied.close(resolve));
      await rm(root, { recursive: true, force: true });
    }
  });
  return {
    root,
    child,
    entries,
    closed,
    exitFile,
    preferredWebPort,
    backendEnv,
    frontendEnv,
    output: () => output,
    ready: () =>
      waitFor(
        () => output.includes("Both applications are ready."),
        () => `Launcher not ready:\n${output}`,
      ),
  };
}

test("first run uses a custom local database, skips occupied ports, and Ctrl+C stops both process trees", async (t) => {
  const run = await fixture(t, {
    databaseUrl: "postgresql://junior:example@127.0.0.1:5544/scheduler_dev?schema=public",
  });
  await run.ready();
  const entries = await run.entries();
  const app = (role) => entries.find((entry) => entry.kind === "app" && entry.role === role);
  assert.notEqual(app("frontend").port, run.preferredWebPort);
  assert.equal(app("backend").origin, `http://localhost:${app("frontend").port}`);
  assert.equal(app("frontend").apiUrl, `http://localhost:${app("backend").port}/api/v1`);
  assert.equal(await readFile(path.join(run.root, "backend/.env"), "utf8"), run.backendEnv);
  assert.equal(await readFile(path.join(run.root, "frontend/.env.local"), "utf8"), run.frontendEnv);
  assert.equal(entries.filter((entry) => entry.args?.includes("db:deploy")).length, 1);
  assert.equal(entries.filter((entry) => entry.args?.includes("db:seed")).length, 1);
  assert.deepEqual(
    entries.find((entry) => entry.tool === "postgres" && entry.action === "connect"),
    {
      tool: "postgres",
      action: "connect",
      host: "127.0.0.1",
      port: "5544",
      database: "scheduler_dev",
    },
  );
  assert.equal(
    entries.some((entry) => entry.tool === "docker"),
    false,
  );
  assert.ok(
    entries.findIndex((entry) => entry.tool === "postgres" && entry.action === "query") <
      entries.findIndex((entry) => entry.args?.includes("db:deploy")),
  );
  run.child.kill("SIGINT");
  assert.equal((await run.closed()).code, 130);
  for (const entry of entries.filter((entry) => entry.kind === "app")) {
    assert.throws(() => process.kill(entry.pid, 0), { code: "ESRCH" });
  }
});

test("existing environment files are unchanged and existing tables are not reseeded", async (t) => {
  const run = await fixture(t, { existing: true, ipv6: true });
  await run.ready();
  const frontend = (await run.entries()).find(
    (entry) => entry.kind === "app" && entry.role === "frontend",
  );
  assert.notEqual(frontend.port, run.preferredWebPort);
  assert.equal(await readFile(path.join(run.root, "backend/.env"), "utf8"), run.backendEnv);
  assert.equal(await readFile(path.join(run.root, "frontend/.env.local"), "utf8"), run.frontendEnv);
  assert.equal(
    (await run.entries()).some((entry) => entry.args?.includes("db:seed")),
    false,
  );
  run.child.kill("SIGTERM");
  assert.equal((await run.closed()).code, 143);
});

test("an active frontend dev lock stops setup before files or services change", async (t) => {
  const run = await fixture(t, { activeFrontend: true });
  assert.equal((await run.closed()).code, 1);
  assert.deepEqual(await run.entries(), []);
  await assert.rejects(readFile(path.join(run.root, "backend/.env")), { code: "ENOENT" });
  await assert.rejects(readFile(path.join(run.root, "frontend/.env.local")), { code: "ENOENT" });
});

test("prepared-database mode skips database setup and an app failure stops its peer", async (t) => {
  const run = await fixture(t, { existing: true, skipDb: true });
  await run.ready();
  const entries = await run.entries();
  assert.equal(
    entries.some((entry) => entry.tool === "docker"),
    false,
  );
  assert.equal(
    entries.some((entry) => entry.tool === "postgres"),
    false,
  );
  assert.equal(
    entries.some((entry) => entry.args?.includes("db:deploy")),
    false,
  );
  assert.equal(
    entries.some((entry) => entry.args?.includes("db:seed")),
    false,
  );
  await writeFile(run.exitFile, "exit");
  assert.equal((await run.closed()).code, 7);
  const frontend = entries.find((entry) => entry.kind === "app" && entry.role === "frontend");
  assert.throws(() => process.kill(frontend.pid, 0), { code: "ESRCH" });
});

test("an installation failure prevents database changes and app startup", async (t) => {
  const run = await fixture(t, { failInstall: "frontend" });
  assert.equal((await run.closed()).code, 2);
  const entries = await run.entries();
  assert.equal(
    entries.some((entry) => entry.kind === "app"),
    false,
  );
  assert.equal(
    entries.some((entry) => entry.args?.includes("db:deploy")),
    false,
  );
  assert.equal(
    entries.some((entry) => entry.tool === "postgres"),
    false,
  );
});

test("a database connection failure stops before migrations and never prints credentials", async (t) => {
  const run = await fixture(t, { failDatabase: true });
  assert.equal((await run.closed()).code, 1);
  const entries = await run.entries();
  assert.equal(
    entries.some((entry) => entry.tool === "postgres" && entry.action === "end"),
    true,
  );
  assert.equal(
    entries.some((entry) => entry.args?.includes("db:deploy")),
    false,
  );
  assert.equal(
    entries.some((entry) => entry.args?.includes("db:seed")),
    false,
  );
  assert.equal(
    entries.some((entry) => entry.kind === "app"),
    false,
  );
  assert.match(run.output(), /Start the server, create the database and user/);
  assert.doesNotMatch(run.output(), /postgresql:\/\/|template:template/);
});

test("an exported DATABASE_URL takes precedence without rewriting backend/.env", async (t) => {
  const run = await fixture(t, {
    existing: true,
    databaseOverride: "postgres://junior:example@localhost:5545/override_db?schema=public",
  });
  await run.ready();
  const connection = (await run.entries()).find(
    (entry) => entry.tool === "postgres" && entry.action === "connect",
  );
  assert.equal(connection.port, "5545");
  assert.equal(connection.database, "override_db");
  assert.equal(await readFile(path.join(run.root, "backend/.env"), "utf8"), run.backendEnv);
});

for (const [name, databaseUrl] of [
  ["remote database", "postgresql://junior:private-password@db.example.com/development"],
  [
    "remote host parameter",
    "postgresql://junior:private-password@localhost/development?host=db.example.com",
  ],
  [
    "duplicate remote host parameter",
    "postgresql://junior:private-password@localhost/development?host=localhost&host=db.example.com",
  ],
  ["non-public schema", "postgresql://junior:private-password@localhost/development?schema=custom"],
  ["missing database name", "postgresql://junior:private-password@localhost/"],
  ["invalid database URL", "invalid-private-password"],
]) {
  test(`${name} prevents automatic setup without printing credentials`, async (t) => {
    const run = await fixture(t, { databaseUrl });
    assert.equal((await run.closed()).code, 1);
    assert.deepEqual(await run.entries(), []);
    assert.match(run.output(), /Check DATABASE_URL|Verify backend\/\.env/);
    assert.doesNotMatch(run.output(), /private-password/);
  });
}

test("a migration failure prevents seed and app startup", async (t) => {
  const run = await fixture(t, { failMigrate: true });
  assert.equal((await run.closed()).code, 3);
  const entries = await run.entries();
  assert.equal(
    entries.some((entry) => entry.args?.includes("db:deploy")),
    true,
  );
  assert.equal(
    entries.some((entry) => entry.args?.includes("db:seed")),
    false,
  );
  assert.equal(
    entries.some((entry) => entry.kind === "app"),
    false,
  );
});

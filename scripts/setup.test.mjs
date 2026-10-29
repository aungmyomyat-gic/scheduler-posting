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
if (args[1] === "exec") console.log(process.env.MOCK_TABLE_EXISTS === "1" ? "f" : "t");
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

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
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

async function fixture(t, { existing = false, skipDb = false, failInstall = "" } = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "foundation-launcher-"));
  const bin = path.join(root, "bin");
  for (const directory of [bin, path.join(root, "frontend"), path.join(root, "backend")]) {
    await mkdir(directory);
  }
  await copyFile(launcher, path.join(root, ".setup.sh"));
  const backendEnv = `PORT=4000\nFRONTEND_ORIGIN=http://localhost:3000\nDATABASE_URL=${skipDb ? "postgresql://junior:example@db.example.com/prepared" : "postgresql://template:template@localhost:5432/team_template?schema=public"}\n# Existing custom comment stays intact.\n`;
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
  const occupied = createServer();
  const preferredWebPort = await listen(occupied);
  const backendReservation = createServer();
  const preferredApiPort = await listen(backendReservation);
  await new Promise((resolve) => backendReservation.close(resolve));
  const log = path.join(root, "commands.jsonl");
  const exitFile = path.join(root, "exit-backend");
  await writeFile(log, "");
  const env = { ...process.env };
  for (const name of [
    "DATABASE_URL",
    "FRONTEND_ORIGIN",
    "PORT",
    "POSTGRES_PORT",
    "SETUP_SKIP_DB",
  ]) {
    delete env[name];
  }
  Object.assign(env, {
    PATH: `${bin}${path.delimiter}${process.env.PATH}`,
    FRONTEND_PORT: String(preferredWebPort),
    BACKEND_PORT: String(preferredApiPort),
    MOCK_LOG: log,
    MOCK_EXIT_FILE: exitFile,
    MOCK_FAIL_INSTALL: failInstall,
    MOCK_TABLE_EXISTS: existing ? "1" : "0",
  });
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
    ready: () =>
      waitFor(
        () => output.includes("Both applications are ready."),
        () => `Launcher not ready:\n${output}`,
      ),
  };
}

test("first run bootstraps, skips occupied ports, and Ctrl+C stops both process trees", async (t) => {
  const run = await fixture(t);
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
  run.child.kill("SIGINT");
  assert.equal((await run.closed()).code, 130);
  for (const entry of entries.filter((entry) => entry.kind === "app")) {
    assert.throws(() => process.kill(entry.pid, 0), { code: "ESRCH" });
  }
});

test("existing environment files are unchanged and existing tables are not reseeded", async (t) => {
  const run = await fixture(t, { existing: true });
  await run.ready();
  assert.equal(await readFile(path.join(run.root, "backend/.env"), "utf8"), run.backendEnv);
  assert.equal(await readFile(path.join(run.root, "frontend/.env.local"), "utf8"), run.frontendEnv);
  assert.equal(
    (await run.entries()).some((entry) => entry.args?.includes("db:seed")),
    false,
  );
  run.child.kill("SIGTERM");
  assert.equal((await run.closed()).code, 143);
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
});
